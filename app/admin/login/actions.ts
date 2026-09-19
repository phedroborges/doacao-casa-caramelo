"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { autenticarAdmin, autenticacaoConfigurada } from "@/lib/auth";

const JANELA = 15 * 60 * 1000;
const LIMITE = 6;
const tentativas = new Map<string, { quantidade: number; reiniciaEm: number }>();

export async function entrarAction(formulario: FormData) {
  if (!autenticacaoConfigurada()) redirect("/admin/login?erro=configuracao");

  const cabecalhos = await headers();
  const ip =
    cabecalhos.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    cabecalhos.get("x-real-ip") ||
    "local";
  const agora = Date.now();
  const registro = tentativas.get(ip);
  if (registro && registro.reiniciaEm > agora && registro.quantidade >= LIMITE) {
    redirect("/admin/login?erro=limite");
  }
  if (!registro || registro.reiniciaEm <= agora) {
    tentativas.set(ip, { quantidade: 0, reiniciaEm: agora + JANELA });
  }

  const usuario = String(formulario.get("usuario") ?? "").trim();
  const senha = String(formulario.get("senha") ?? "");
  if (!(await autenticarAdmin(usuario, senha))) {
    const atual = tentativas.get(ip)!;
    atual.quantidade += 1;
    redirect("/admin/login?erro=credenciais");
  }

  tentativas.delete(ip);
  redirect("/admin/eventos");
}
