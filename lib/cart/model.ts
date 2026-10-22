import { z } from "zod";
export const quantitySchema = z.object({
  quantity: z.number().int().min(1).max(99),
});
export const durationSchema = z.object({
  wellnessPricingId: z.string().min(1),
});
export const checkoutSchema = z.object({
  groupType: z.string().min(1),
  items: z
    .array(
      z.object({
        id: z.string(),
        quantity: z.number().int().positive(),
        wellnessPricingId: z.string().optional(),
      }),
    )
    .min(1),
  paymentMethod: z.enum(["card", "pay_at_clinic"]),
  idempotencyKey: z.string().min(8),
});
export type Product = {
  id?: string;
  title?: string;
  type?: string;
  price?: number | null;
  currency?: string;
  providerId?: number;
  providerName?: string;
  wellnessPricing?: {
    id: string;
    durationInMinutes: number;
    amount_after_service_charge: number;
  }[];
};
export type Line = {
  id: string;
  productId: string;
  quantity: number;
  wellnessPricingId?: string;
  product: Product;
};
export type Group = {
  type: string;
  itemCount: number;
  unpricedItems: number;
  subtotals: Record<string, number>;
  items: Line[];
};
export type Cart = { groups: Group[]; totalItems: number };
export type Order = {
  orderId: string;
  status: "pending" | "paid" | "failed";
  groupType: string;
  paymentMethod: "card" | "pay_at_clinic";
  idempotencyKey: string;
};
export function unitPrice(line: Line): number | null {
  if (!line.product?.id) return null;
  if (line.product.type === "wellness")
    return (
      line.product.wellnessPricing?.find((x) => x.id === line.wellnessPricingId)
        ?.amount_after_service_charge ?? null
    );
  return typeof line.product.price === "number" &&
    Number.isFinite(line.product.price)
    ? line.product.price
    : null;
}
export function summarize(lines: Line[]): Cart {
  const groups = new Map<string, Line[]>();
  for (const line of lines) {
    const type = line.product?.type ?? "unknown";
    groups.set(type, [...(groups.get(type) ?? []), line]);
  }
  return {
    groups: [...groups].map(([type, items]) => {
      const subtotals: Record<string, number> = {};
      let unpricedItems = 0;
      for (const item of items) {
        const price = unitPrice(item);
        const currency = item.product.currency;
        if (price === null || !currency) {
          unpricedItems += item.quantity;
          continue;
        }
        subtotals[currency] =
          (subtotals[currency] ?? 0) +
          (Math.round(price * 100) * item.quantity) / 100;
      }
      return {
        type,
        items,
        itemCount: items.reduce((n, i) => n + i.quantity, 0),
        unpricedItems,
        subtotals,
      };
    }),
    totalItems: lines.reduce((n, i) => n + i.quantity, 0),
  };
}
export function checkoutEligible(group: Group) {
  return (
    group.items.length > 0 &&
    group.unpricedItems === 0 &&
    group.items.every((i) => i.product.id && unitPrice(i) !== null)
  );
}
