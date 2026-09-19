import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Liveness: o processo está de pé e atendendo HTTP? Só isso.
 *
 * É este que o HEALTHCHECK do container usa. Não toca no banco de propósito:
 * o Swarm reinicia tarefas marcadas como unhealthy, então amarrar o
 * healthcheck ao Supabase transforma "faltou variável de ambiente" num ciclo
 * de reinício — o container morre antes de conseguir mostrar o erro.
 *
 * Para saber se o banco responde, use /api/health, que é o diagnóstico.
 */
export function GET() {
  return NextResponse.json({ status: "live" });
}
