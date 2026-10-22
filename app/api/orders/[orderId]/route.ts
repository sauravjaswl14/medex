import { NextRequest, NextResponse } from "next/server";
import { respond } from "@/lib/cart/http";
import { orderById } from "@/lib/cart/store";
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await params;
  return respond(req, () => {
    const order = orderById(orderId);
    if (!order)
      return {
        orderId,
        status: "failed",
        message: "Order not found in this mock server",
      };
    return order;
  });
}
