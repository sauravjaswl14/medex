import { NextRequest } from "next/server";
import { respond } from "@/lib/cart/http";
import { removeLine, updateLine } from "@/lib/cart/store";
import { quantitySchema, durationSchema } from "@/lib/cart/model";
type C = { params: Promise<{ lineId: string }> };
export async function PATCH(req: NextRequest, { params }: C) {
  const { lineId } = await params;
  return respond(req, async () => {
    const body = await req.json();
    const parsed = ("quantity" in body ? quantitySchema : durationSchema).parse(
      body,
    );
    return { cart: updateLine(lineId, parsed) };
  });
}
export async function DELETE(req: NextRequest, { params }: C) {
  const { lineId } = await params;
  return respond(req, () => removeLine(lineId), 204);
}
