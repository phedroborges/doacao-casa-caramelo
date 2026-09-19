import { NextResponse } from "next/server";
import { verificarPersistencia } from "@/lib/db";
import { supabaseConfigurado } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Usado pelo HEALTHCHECK do container. Responder 503 derruba o serviço no
 * proxy, então a resposta diz o motivo: sem isso, uma variável de ambiente
 * faltando aparece só como "Service is not reachable", sem pista nenhuma.
 *
 * Não revela URL nem chave — apenas se estão presentes.
 */
export async function GET() {
  if (!supabaseConfigurado()) {
    return NextResponse.json(
      {
        status: "error",
        motivo: "variaveis-ausentes",
        detalhe:
          "Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY no serviço.",
        variaveis: {
          NEXT_PUBLIC_SUPABASE_URL: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()),
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: Boolean(
            process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim(),
          ),
        },
      },
      { status: 503 },
    );
  }

  try {
    await verificarPersistencia();
    return NextResponse.json({ status: "ok" });
  } catch {
    return NextResponse.json(
      {
        status: "error",
        motivo: "banco-inacessivel",
        detalhe:
          "As variáveis existem, mas a consulta ao Supabase falhou. Confira se a URL e a chave são do mesmo projeto e se ele não está pausado.",
      },
      { status: 503 },
    );
  }
}
