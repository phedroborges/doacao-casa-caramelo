import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function configuracaoSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const chave = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !chave) {
    throw new Error("Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
  }
  return { url, chave };
}

export async function criarClienteSupabaseServidor() {
  const armazenamento = await cookies();
  const { url, chave } = configuracaoSupabase();

  return createServerClient(url, chave, {
    cookies: {
      getAll() {
        return armazenamento.getAll();
      },
      setAll(cookiesParaSalvar) {
        try {
          cookiesParaSalvar.forEach(({ name, value, options }) =>
            armazenamento.set(name, value, options),
          );
        } catch {
          // Server Components não podem gravar cookies; o middleware renova a sessão.
        }
      },
    },
  });
}

export function supabaseConfigurado(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim(),
  );
}
