// A self-contained, layered Earth-science vignette used in the homepage hero.
// Pure SVG so it stays crisp at any size with no image requests.
export function HeroArt({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 480 480"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Illustration of mountains, ocean and a rising nova"
    >
      <defs>
        <linearGradient id="ha-sky" x1="240" y1="20" x2="240" y2="300" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#0b3b68" />
          <stop offset="0.5" stopColor="#0a5aa0" />
          <stop offset="1" stopColor="#2f86c4" />
        </linearGradient>
        <radialGradient id="ha-sun" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse"
          gradientTransform="translate(320 150) scale(140)">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="0.35" stopColor="#bfe6ff" stopOpacity="0.5" />
          <stop offset="1" stopColor="#bfe6ff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ha-far" x1="240" y1="150" x2="240" y2="300" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#e7f3fb" />
          <stop offset="1" stopColor="#bcd9ec" />
        </linearGradient>
        <linearGradient id="ha-mid" x1="240" y1="210" x2="240" y2="330" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#54ad7f" />
          <stop offset="1" stopColor="#1f744c" />
        </linearGradient>
        <linearGradient id="ha-water" x1="240" y1="300" x2="240" y2="400" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#7cc6f0" />
          <stop offset="0.5" stopColor="#0a5aa0" />
          <stop offset="1" stopColor="#0a3f70" />
        </linearGradient>
        <linearGradient id="ha-fore" x1="240" y1="330" x2="240" y2="470" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#1a5c3f" />
          <stop offset="1" stopColor="#0a2218" />
        </linearGradient>
        <clipPath id="ha-clip">
          <circle cx="240" cy="240" r="232" />
        </clipPath>
      </defs>

      <g clipPath="url(#ha-clip)">
        {/* Sky + sun glow */}
        <rect x="0" y="0" width="480" height="480" fill="url(#ha-sky)" />
        <rect x="0" y="0" width="480" height="480" fill="url(#ha-sun)" />

        {/* Soft clouds */}
        <ellipse cx="120" cy="110" rx="70" ry="14" fill="#ffffff" opacity="0.12" />
        <ellipse cx="190" cy="150" rx="95" ry="16" fill="#ffffff" opacity="0.08" />
        <ellipse cx="360" cy="95" rx="60" ry="12" fill="#ffffff" opacity="0.1" />

        {/* Nova — the rising spark */}
        <path
          d="M320 96 C326 138 334 146 376 152 C334 158 326 166 320 208 C314 166 306 158 264 152 C306 146 314 138 320 96 Z"
          fill="#ffffff"
        />
        <circle cx="372" cy="112" r="4" fill="#ffffff" opacity="0.85" />
        <circle cx="286" cy="120" r="3" fill="#ffffff" opacity="0.7" />

        {/* Distant snow range */}
        <path
          d="M-20 250 L70 165 L120 205 L185 140 L250 205 L320 160 L400 210 L500 168 L500 320 L-20 320 Z"
          fill="url(#ha-far)"
        />
        {/* Snow shading on the tallest peak */}
        <path d="M185 140 L160 178 L185 178 Z" fill="#ffffff" />
        <path d="M185 140 L210 178 L185 178 Z" fill="#cfe4f2" />

        {/* Atmospheric mist */}
        <rect x="0" y="250" width="480" height="34" fill="#ffffff" opacity="0.14" />

        {/* Mid green range */}
        <path
          d="M-20 300 L60 235 L130 285 L210 225 L290 290 L360 245 L500 300 L500 360 L-20 360 Z"
          fill="url(#ha-mid)"
        />

        {/* Water */}
        <rect x="0" y="318" width="480" height="100" fill="url(#ha-water)" />
        {/* Sun reflection + ripples */}
        <rect x="300" y="330" width="44" height="70" fill="#dff1ff" opacity="0.35" />
        <rect x="60" y="338" width="120" height="3" fill="#ffffff" opacity="0.25" />
        <rect x="110" y="356" width="200" height="3" fill="#ffffff" opacity="0.18" />
        <rect x="40" y="376" width="150" height="3" fill="#ffffff" opacity="0.14" />

        {/* Foreground headland */}
        <path
          d="M-20 470 L-20 360 C60 350 120 372 180 392 C250 414 330 410 500 372 L500 470 Z"
          fill="url(#ha-fore)"
        />
      </g>

      {/* Rim + highlight */}
      <circle cx="240" cy="240" r="232" fill="none" stroke="#ffffff" strokeOpacity="0.18" strokeWidth="2" />
      <path
        d="M70 110 A232 232 0 0 1 360 40"
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.35"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
