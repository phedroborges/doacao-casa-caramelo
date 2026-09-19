import { redirect } from "next/navigation";
import { adminAutenticado } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Admin() {
  redirect((await adminAutenticado()) ? "/admin/eventos" : "/admin/login");
}
