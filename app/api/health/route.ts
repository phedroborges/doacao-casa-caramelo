import { NextResponse } from "next/server";
import { verificarPersistencia } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await verificarPersistencia();
    return NextResponse.json({ status: "ok" });
  } catch {
    return NextResponse.json({ status: "error" }, { status: 503 });
  }
}
