import { NextRequest } from "next/server";
import { reply } from "@/lib/booking/http";
import { listProviders } from "@/lib/booking/store";
export async function GET(req: NextRequest) {
  return reply(req, () => ({ providers: listProviders() }));
}
