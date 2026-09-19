import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE_ADMIN = "casa_caramelo_admin";
const DURACAO_SESSAO_SEGUNDOS = 60 * 60 * 12;

function configuracao() {
  const producao = process.env.NODE_ENV === "production";
  return {
    usuario: process.env.ADMIN_USERNAME?.trim() || "admin",
    senha: process.env.ADMIN_PASSWORD || (producao ? "" : "admin-local"),
    segredo:
      process.env.AUTH_SECRET ||
      (producao ? "" : "segredo-local-apenas-para-desenvolvimento-casa-caramelo"),
  };
}

export function autenticacaoConfigurada(): boolean {
  const { senha, segredo } = configuracao();
  return senha.length >= 10 && segredo.length >= 32;
}

function assinatura(conteudo: string, segredo: string): string {
  return createHmac("sha256", segredo).update(conteudo).digest("base64url");
}

function iguais(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  return bufferA.length === bufferB.length && timingSafeEqual(bufferA, bufferB);
}

function criarToken(usuario: string): string {
  const { segredo } = configuracao();
  const conteudo = Buffer.from(
    JSON.stringify({ usuario, expiraEm: Date.now() + DURACAO_SESSAO_SEGUNDOS * 1000 }),
  ).toString("base64url");
  return `${conteudo}.${assinatura(conteudo, segredo)}`;
}

function validarToken(token: string | undefined): boolean {
  if (!token || !autenticacaoConfigurada()) return false;
  const [conteudo, assinaturaRecebida] = token.split(".");
  if (!conteudo || !assinaturaRecebida) return false;
  const { segredo, usuario } = configuracao();
  if (!iguais(assinatura(conteudo, segredo), assinaturaRecebida)) return false;
  try {
    const payload = JSON.parse(Buffer.from(conteudo, "base64url").toString("utf8")) as {
      usuario?: string;
      expiraEm?: number;
    };
    return payload.usuario === usuario && Number(payload.expiraEm) > Date.now();
  } catch {
    return false;
  }
}

export async function adminAutenticado(): Promise<boolean> {
  const armazenamento = await cookies();
  return validarToken(armazenamento.get(COOKIE_ADMIN)?.value);
}

export async function exigirAdmin(): Promise<void> {
  if (!(await adminAutenticado())) redirect("/admin/login");
}

export async function autenticarAdmin(usuario: string, senha: string): Promise<boolean> {
  if (!autenticacaoConfigurada()) return false;
  const config = configuracao();
  if (!iguais(usuario, config.usuario) || !iguais(senha, config.senha)) return false;

  const armazenamento = await cookies();
  armazenamento.set(COOKIE_ADMIN, criarToken(config.usuario), {
    httpOnly: true,
    sameSite: "lax",
    secure:
      process.env.NODE_ENV === "production" && process.env.AUTH_COOKIE_SECURE !== "false",
    maxAge: DURACAO_SESSAO_SEGUNDOS,
    path: "/",
  });
  return true;
}

export async function encerrarSessaoAdmin(): Promise<void> {
  const armazenamento = await cookies();
  armazenamento.delete(COOKIE_ADMIN);
}
