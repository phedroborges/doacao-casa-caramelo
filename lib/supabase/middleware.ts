import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function atualizarSessao(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !chave) return NextResponse.next({ request });

  let resposta = NextResponse.next({ request });
  const supabase = createServerClient(url, chave, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesParaSalvar, cabecalhos) {
        cookiesParaSalvar.forEach(({ name, value }) => request.cookies.set(name, value));
        resposta = NextResponse.next({ request });
        cookiesParaSalvar.forEach(({ name, value, options }) =>
          resposta.cookies.set(name, value, options),
        );
        Object.entries(cabecalhos).forEach(([nome, valor]) =>
          resposta.headers.set(nome, valor),
        );
      },
    },
  });

  await supabase.auth.getClaims();
  return resposta;
}
