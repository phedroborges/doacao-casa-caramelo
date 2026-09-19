/** @type {import('next').NextConfig} */
const nextConfig = {
  // Gera um servidor Node mínimo, ideal para a imagem Docker do Easypanel.
  output: "standalone",
  poweredByHeader: false,
  // Os arquivos de imagem são locais; nada depende de um otimizador remoto.
  images: { unoptimized: true },
  experimental: {
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
