/**
 * Troféu do prêmio surpresa. É ilustração, não dado — por isso fica
 * fora da paleta de séries e usa o amarelo da marca livremente.
 * A interrogação no centro é o suspense: o prêmio ainda não foi revelado.
 */
export function Trofeu({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 140" role="img" aria-label="Troféu do prêmio surpresa">
      <defs>
        <linearGradient id="trofeu-ouro" x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor="#FFE5A4" />
          <stop offset="45%" stopColor="#FECB00" />
          <stop offset="100%" stopColor="#B58200" />
        </linearGradient>
      </defs>

      {/* alças */}
      <path
        d="M26 26H14c0 20 6 30 18 33"
        fill="none"
        stroke="url(#trofeu-ouro)"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <path
        d="M94 26h12c0 20-6 30-18 33"
        fill="none"
        stroke="url(#trofeu-ouro)"
        strokeWidth="7"
        strokeLinecap="round"
      />

      {/* taça */}
      <path
        d="M26 18h68v30c0 19-15 34-34 34S26 67 26 48z"
        fill="url(#trofeu-ouro)"
        stroke="#2C0020"
        strokeWidth="4"
        strokeLinejoin="round"
      />

      {/* haste e base */}
      <rect x="53" y="82" width="14" height="20" fill="url(#trofeu-ouro)" stroke="#2C0020" strokeWidth="4" />
      <rect x="34" y="100" width="52" height="12" rx="4" fill="url(#trofeu-ouro)" stroke="#2C0020" strokeWidth="4" />
      <rect x="24" y="112" width="72" height="16" rx="6" fill="url(#trofeu-ouro)" stroke="#2C0020" strokeWidth="4" />

      {/* o suspense */}
      <text
        x="60"
        y="56"
        textAnchor="middle"
        fontSize="42"
        fontWeight="800"
        fill="#2C0020"
        fontFamily="'Just Sans', system-ui, sans-serif"
      >
        ?
      </text>

      {/* brilhos */}
      <circle cx="12" cy="66" r="3.4" fill="#FF0197" />
      <circle cx="108" cy="72" r="4.4" fill="#FF0197" />
      <circle cx="102" cy="10" r="3" fill="#FFE5A4" />
      <circle cx="18" cy="8" r="3.8" fill="#FFE5A4" />
    </svg>
  );
}
