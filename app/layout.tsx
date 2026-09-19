import type { Metadata, Viewport } from "next";
import { EVENTO } from "@/lib/config";
import "./globals.css";

export const metadata: Metadata = {
  title: `${EVENTO.nome} — ${EVENTO.subtitulo}`,
  description: EVENTO.chamada,
  icons: { icon: "/marca/logo/casa-caramelo-roxo.png" },
};

export const viewport: Viewport = {
  themeColor: "#9100E5",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        {/* Grafismo das manchas do cachorro caramelo. */}
        <div className="fundo-manchas" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        {children}
      </body>
    </html>
  );
}
