import { NextRequest } from "next/server";
import { respond } from "@/lib/cart/http";
import { cart } from "@/lib/cart/store";
export async function GET(req: NextRequest) {
  return respond(req, () => ({ cart: cart() }));
}
