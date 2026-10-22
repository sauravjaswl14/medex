import { NextRequest } from "next/server";
import { reply } from "@/lib/booking/http";
import { createBooking, originalBookingId } from "@/lib/booking/store";
import { z } from "zod";
const schema = z.object({
  providerId: z.number().int(),
  specialistId: z.string(),
  date: z.iso.date(),
  startTime: z.string().regex(/^\d\d:\d\d$/),
  numberOfPeople: z.number().int().min(1).max(4),
});
export async function GET(req: NextRequest) {
  return reply(req, () => ({ existingBookingId: originalBookingId() }));
}
export async function POST(req: NextRequest) {
  const raw = await req.json().catch(() => null);
  const parsed = schema.safeParse(raw);
  if (!parsed.success)
    return Response.json(
      { message: "Invalid booking details" },
      { status: 400 },
    );
  return reply(req, () => createBooking(parsed.data), 201);
}
