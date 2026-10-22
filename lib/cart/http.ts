import { NextRequest, NextResponse } from "next/server";
import { ApiError } from "./store";
export async function respond(
  request: NextRequest,
  handler: () => unknown | Promise<unknown>,
  status = 200,
) {
  const url = request.nextUrl;
  const delay = Math.min(
    10000,
    Math.max(
      0,
      Number(
        url.searchParams.get("delay") ??
          request.headers.get("x-mock-delay") ??
          "350",
      ) || 0,
    ),
  );
  await new Promise((r) => setTimeout(r, delay));
  const fail =
    url.searchParams.get("fail") ?? request.headers.get("x-mock-fail");
  if (fail)
    return NextResponse.json(
      { message: `Injected ${fail} failure` },
      { status: Number(fail) || 500 },
    );
  try {
    const result = await handler();
    return status === 204
      ? new NextResponse(null, { status: 204 })
      : NextResponse.json(result, { status });
  } catch (e) {
    return NextResponse.json(
      { message: e instanceof Error ? e.message : "Unexpected error" },
      { status: e instanceof ApiError ? e.status : 500 },
    );
  }
}
