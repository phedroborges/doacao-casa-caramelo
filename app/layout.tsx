import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Doações Casa Caramelo",
  description: "Eventos e campanhas de doação da Casa Caramelo.",
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
