import Link from "next/link";
import { exigirAdmin } from "@/lib/auth";
import { sairAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function LayoutPainel({ children }: { children: React.ReactNode }) {
  await exigirAdmin();
  return (
    <>
      <header className="admin-topo">
        <Link href="/admin/eventos" className="admin-marca">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/marca/logo/casa-caramelo-roxo.png" alt="" />
          <span>
            <strong>Casa Caramelo</strong>
            <small>Gestão de campanhas</small>
          </span>
        </Link>
        <nav>
          <Link href="/admin/eventos">Eventos</Link>
          <Link href="/" target="_blank">Abrir site ↗</Link>
          <form action={sairAction}>
            <button type="submit">Sair</button>
          </form>
        </nav>
      </header>
      <main className="admin-conteudo">{children}</main>
    </>
  );
}
