// ── Mascotte Nesso — la chouette ─────────────────────────────────────────────
// Chouette qui veille sur la transmission. Encre + papier + regard ambré,
// étoile ✦ Nesso sertie sur le poitrail. Pensée pour rester lisible du favicon
// (16px) au hero (120px). Anti-Duolingo : jamais verte, posée, géométrique.
//
// ChouetteEclat — pose « éclat » (aile levée, étoile trouvée) : mascotte principale.
// ChouetteTete  — tête seule, regard ambré : avatars de chat, favicon.

// Poitrail + chevrons + étoile, partagés par les deux vues (mêmes coordonnées)
const Ventre = () => (
  <>
    <ellipse cx="100" cy="156" rx="44" ry="48" fill="#F6F4ED" />
    <path d="M 82 168 Q 100 178 118 168" fill="none" stroke="#D8D3C4" strokeWidth="3" strokeLinecap="round" />
    <path d="M 84 184 Q 100 193 116 184" fill="none" stroke="#D8D3C4" strokeWidth="3" strokeLinecap="round" />
    <path d="M 88 197 Q 100 203 112 197" fill="none" stroke="#D8D3C4" strokeWidth="3" strokeLinecap="round" />
    <path d="M 100 136 L 104 145 L 113 148 L 104 151 L 100 160 L 96 151 L 87 148 L 96 145 Z" fill="#1F6B4A" />
  </>
);

export function ChouetteEclat({ size = 96, className, style }) {
  return (
    <svg width={size} height={size * (230 / 200)} viewBox="0 0 200 230" className={className} style={style}
      role="img" aria-label="Nesso — la chouette qui veille sur votre transmission">
      {/* aigrettes */}
      <path d="M 62 52 L 74 24 L 88 48 Z" fill="#1A201C" />
      <path d="M 138 52 L 126 24 L 112 48 Z" fill="#1A201C" />
      {/* corps */}
      <path d="M 100 34 C 152 34 168 78 168 128 C 168 182 138 210 100 210 C 62 210 32 182 32 128 C 32 78 48 34 100 34 Z" fill="#1A201C" />
      {/* aile levée */}
      <path d="M 160 118 C 186 104 196 84 198 64 C 184 74 172 78 162 80 Z" fill="#1A201C" />
      <path d="M 165 112 C 184 101 191 88 193 74" fill="none" stroke="#124A33" strokeWidth="4" strokeLinecap="round" />
      <Ventre />
      {/* yeux réjouis : arcs */}
      <circle cx="74" cy="96" r="26" fill="#F6F4ED" />
      <circle cx="126" cy="96" r="26" fill="#F6F4ED" />
      <path d="M 60 100 Q 74 84 88 100" fill="none" stroke="#1A201C" strokeWidth="7" strokeLinecap="round" />
      <path d="M 112 100 Q 126 84 140 100" fill="none" stroke="#1A201C" strokeWidth="7" strokeLinecap="round" />
      {/* bec */}
      <path d="M 100 106 L 108 118 L 100 130 L 92 118 Z" fill="#D99A2B" />
      {/* serres */}
      <path d="M 82 210 L 82 222 M 92 212 L 92 224 M 108 212 L 108 224 M 118 210 L 118 222" stroke="#1A201C" strokeWidth="5" strokeLinecap="round" />
      {/* l'étoile trouvée */}
      <path d="M 176 34 L 181 45 L 192 50 L 181 55 L 176 66 L 171 55 L 160 50 L 171 45 Z" fill="#D99A2B" />
    </svg>
  );
}

// Tête claire sur disque encre — se substitue directement aux pastilles d'avatar.
export function ChouetteTete({ size = 34, className, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" className={className} style={style}
      role="img" aria-label="Conseiller Nesso">
      <circle cx="100" cy="100" r="100" fill="#1A201C" />
      {/* aigrettes */}
      <path d="M 74 58 L 84 36 L 96 54 Z" fill="#F6F4ED" />
      <path d="M 126 58 L 116 36 L 104 54 Z" fill="#F6F4ED" />
      {/* face claire */}
      <path d="M 100 46 C 142 46 156 82 156 114 C 156 142 140 158 100 158 C 60 158 44 142 44 114 C 44 82 58 46 100 46 Z" fill="#F6F4ED" />
      {/* yeux ambrés grands ouverts — le regard qui voit clair */}
      <circle cx="80" cy="100" r="18" fill="#D99A2B" />
      <circle cx="120" cy="100" r="18" fill="#D99A2B" />
      <circle cx="80" cy="100" r="8" fill="#1A201C" />
      <circle cx="120" cy="100" r="8" fill="#1A201C" />
      <circle cx="83.5" cy="96" r="3" fill="#FDFCF8" />
      <circle cx="123.5" cy="96" r="3" fill="#FDFCF8" />
      {/* bec */}
      <path d="M 100 108 L 107 118 L 100 127 L 93 118 Z" fill="#D99A2B" />
    </svg>
  );
}
