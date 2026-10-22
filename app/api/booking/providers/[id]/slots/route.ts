import { NextRequest } from "next/server";
import { reply } from "@/lib/booking/http";
import { availability, calendar } from "@/lib/booking/store";
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { searchParams } = req.nextUrl;
  const specialistId = searchParams.get("specialistId") ?? "";
  return reply(req, () =>
    searchParams.get("calendar") === "1"
      ? {
          days: calendar(
            Number(id),
            specialistId,
            Number(searchParams.get("people") ?? 1),
          ),
        }
      : availability(Number(id), searchParams.get("date") ?? "", specialistId),
  );
}
