import { NextResponse } from "next/server";
import { buildPublicHealthPayload } from "@/lib/production/readiness";

export function GET() {
  return NextResponse.json(buildPublicHealthPayload());
}
