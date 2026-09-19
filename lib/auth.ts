import "server-only";

import { redirect } from "next/navigation";
import { criarClienteSupabaseServidor, supabaseConfigurado } from "./supabase/server";

export function autenticacaoConfigurada(): boolean {
  return supabaseConfigurado();
}

export async function adminAutenticado(): Promise<boolean> {
  if (!supabaseConfigurado()) return false;
  const supabase = await criarClienteSupabaseServidor();
  const { data: autenticacao, error: erroAutenticacao } = await supabase.auth.getClaims();
  const userId = typeof autenticacao?.claims?.sub === "string" ? autenticacao.claims.sub : null;
  if (erroAutenticacao || !userId) return false;

  const { data, error } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  return !error && Boolean(data);
}

export async function exigirAdmin(): Promise<void> {
  if (!(await adminAutenticado())) redirect("/admin/login");
}

export async function autenticarAdmin(email: string, senha: string): Promise<boolean> {
  if (!supabaseConfigurado()) return false;
  const supabase = await criarClienteSupabaseServidor();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password: senha,
  });
  if (error || !data.user) return false;

  const { data: administrador, error: erroAdministrador } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", data.user.id)
    .maybeSingle();
  if (erroAdministrador || !administrador) {
    await supabase.auth.signOut();
    return false;
  }
  return true;
}

export async function encerrarSessaoAdmin(): Promise<void> {
  if (!supabaseConfigurado()) return;
  const supabase = await criarClienteSupabaseServidor();
  await supabase.auth.signOut();
}
