import { NextRequest } from "next/server";

import { renderAppIcon } from "../_icon";

export const runtime = "edge";

export function GET(req: NextRequest) {
  const purpose =
    req.nextUrl.searchParams.get("purpose") === "maskable" ? "maskable" : "any";
  return renderAppIcon(512, purpose);
}

