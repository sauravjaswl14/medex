import source from "@/data/task2-cart.json";
import { Cart, Line, Order, summarize, unitPrice } from "./model";
type Guest = {
  productId: string;
  quantity: number;
  wellnessPricingId?: string;
};
type Change = {
  productId: string;
  action: "combined" | "added" | "skipped";
  detail: string;
};
const seed = source.serverCart.groups.flatMap((g) => g.items) as Line[];
const state: {
  lines: Line[];
  orders: Map<string, Order>;
  keys: Map<string, string>;
  merged: boolean;
} = {
  lines: structuredClone(seed),
  orders: new Map(),
  keys: new Map(),
  merged: false,
};
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export const cart = (): Cart => summarize(state.lines);
export function updateLine(
  id: string,
  patch: { quantity?: number; wellnessPricingId?: string },
) {
  const line = state.lines.find((x) => x.id === id);
  if (!line) throw new ApiError(409, "This service is no longer in your cart");
  if (patch.quantity !== undefined) {
    if (
      !Number.isInteger(patch.quantity) ||
      patch.quantity < 1 ||
      patch.quantity > 99
    )
      throw new ApiError(409, "Quantity must be between 1 and 99");
    line.quantity = patch.quantity;
  }
  if (patch.wellnessPricingId !== undefined) {
    if (
      line.product.type !== "wellness" ||
      !line.product.wellnessPricing?.some(
        (x) => x.id === patch.wellnessPricingId,
      )
    )
      throw new ApiError(409, "That duration is no longer available");
    line.wellnessPricingId = patch.wellnessPricingId;
  }
  return cart();
}
export function removeLine(id: string) {
  state.lines = state.lines.filter((x) => x.id !== id);
}
export function mergeGuest(items: Guest[]): { cart: Cart; changes: Change[] } {
  const changes: Change[] = [];
  for (const item of items) {
    const product = source.catalog.find((x) => x.id === item.productId);
    if (!product) {
      changes.push({
        productId: item.productId,
        action: "skipped",
        detail: "No longer available",
      });
      continue;
    }
    const existing = state.lines.find(
      (x) =>
        x.productId === item.productId &&
        x.wellnessPricingId === item.wellnessPricingId,
    );
    if (existing) {
      existing.quantity = Math.min(99, existing.quantity + item.quantity);
      changes.push({
        productId: item.productId,
        action: "combined",
        detail: `Combined quantities for ${product.title}`,
      });
      continue;
    }
    const same = state.lines.find((x) => x.productId === item.productId);
    if (
      same &&
      product.type === "wellness" &&
      !same.wellnessPricingId &&
      item.wellnessPricingId
    ) {
      same.wellnessPricingId = item.wellnessPricingId;
      same.quantity = Math.min(99, same.quantity + item.quantity);
      changes.push({
        productId: item.productId,
        action: "combined",
        detail: `Selected guest duration and combined ${product.title}`,
      });
      continue;
    }
    state.lines.push({
      id: crypto.randomUUID(),
      productId: item.productId,
      quantity: item.quantity,
      wellnessPricingId: item.wellnessPricingId,
      product: structuredClone(product),
    });
    changes.push({
      productId: item.productId,
      action: "added",
      detail: `Added ${product.title}`,
    });
  }
  state.merged = true;
  return { cart: cart(), changes };
}
export function checkout(input: {
  groupType: string;
  items: { id: string; quantity: number; wellnessPricingId?: string }[];
  paymentMethod: "card" | "pay_at_clinic";
  idempotencyKey: string;
}): Order {
  const previous = state.keys.get(input.idempotencyKey);
  if (previous) return state.orders.get(previous)!;
  const selected = input.items.map((i) =>
    state.lines.find((x) => x.id === i.id),
  );
  if (
    selected.some(
      (x, i) =>
        !x ||
        x.product.type !== input.groupType ||
        x.quantity !== input.items[i].quantity ||
        x.wellnessPricingId !== input.items[i].wellnessPricingId ||
        unitPrice(x) === null,
    )
  )
    throw new ApiError(
      409,
      "Your cart changed. Review this group before retrying.",
    );
  const order: Order = {
    orderId: crypto.randomUUID(),
    status: "pending",
    groupType: input.groupType,
    paymentMethod: input.paymentMethod,
    idempotencyKey: input.idempotencyKey,
  };
  state.orders.set(order.orderId, order);
  state.keys.set(input.idempotencyKey, order.orderId);
  setTimeout(() => {
    if (order.status === "pending") {
      order.status = "paid";
      state.lines = state.lines.filter(
        (x) => !input.items.some((i) => i.id === x.id),
      );
    }
  }, 1200);
  return order;
}
export function orderById(id: string) {
  return state.orders.get(id);
}
