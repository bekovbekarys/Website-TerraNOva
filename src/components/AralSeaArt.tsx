// A self-contained circular vignette of the Aral Sea: shrinking blue water
// ringed by exposed, cracked seabed, used on the support page and homepage
// cause section. Pure SVG so it stays crisp at any size with no image requests.
export function AralSeaArt({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 480 480"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Illustration of the shrinking Aral Sea ringed by dry seabed"
    >
      <defs>
        <linearGradient id="as-sky" x1="240" y1="20" x2="240" y2="240" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fce7c3" />
          <stop offset="1" stopColor="#f3c98b" />
        </linearGradient>
        <radialGradient id="as-sun" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse"
          gradientTransform="translate(150 120) scale(120)">
          <stop offset="0" stopColor="#fffaf0" stopOpacity="0.95" />
          <stop offset="0.5" stopColor="#ffe2a8" stopOpacity="0.4" />
          <stop offset="1" stopColor="#ffe2a8" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="as-sand" x1="240" y1="200" x2="240" y2="470" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#dcb887" />
          <stop offset="1" stopColor="#b98a52" />
        </linearGradient>
        <radialGradient id="as-water" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse"
          gradientTransform="translate(250 320) scale(150 110)">
          <stop offset="0" stopColor="#7cc6f0" />
          <stop offset="0.7" stopColor="#1f7fc0" />
          <stop offset="1" stopColor="#0a4f86" />
        </radialGradient>
        <clipPath id="as-clip">
          <circle cx="240" cy="240" r="232" />
        </clipPath>
      </defs>

      <g clipPath="url(#as-clip)">
        {/* Hazy sky + low sun */}
        <rect x="0" y="0" width="480" height="240" fill="url(#as-sky)" />
        <rect x="0" y="0" width="480" height="240" fill="url(#as-sun)" />
        <circle cx="150" cy="120" r="34" fill="#fff6e2" opacity="0.9" />

        {/* Exposed, dried seabed */}
        <rect x="0" y="200" width="480" height="280" fill="url(#as-sand)" />

        {/* Cracks in the dry bed */}
        <g stroke="#a4753f" strokeOpacity="0.5" strokeWidth="2" fill="none">
          <path d="M40 250 L95 268 L80 300 L140 318" />
          <path d="M95 268 L120 240" />
          <path d="M360 250 L410 270 L395 300 L440 318" />
          <path d="M410 270 L438 248" />
          <path d="M60 360 L130 384 L110 420" />
          <path d="M350 372 L420 396 L405 436" />
          <path d="M130 384 L180 366" />
        </g>

        {/* Old shoreline: a ghost ring showing where water used to reach */}
        <path
          d="M70 250 C150 210 330 210 410 252 C440 300 440 360 400 408 C320 452 160 452 80 408 C40 360 40 300 70 250 Z"
          fill="none"
          stroke="#8a5f31"
          strokeOpacity="0.4"
          strokeWidth="2.5"
          strokeDasharray="9 8"
        />

        {/* The shrunken sea that remains */}
        <path
          d="M150 300 C200 268 320 270 360 308 C384 344 372 392 320 414 C262 436 188 430 150 398 C124 366 124 326 150 300 Z"
          fill="url(#as-water)"
        />
        {/* Surface highlights */}
        <ellipse cx="240" cy="320" rx="70" ry="9" fill="#ffffff" opacity="0.22" />
        <ellipse cx="220" cy="350" rx="95" ry="8" fill="#ffffff" opacity="0.14" />

        {/* A stranded fishing boat on the dry bed */}
        <g transform="translate(120 420) rotate(-7)">
          <path d="M0 0 L78 0 L66 24 L12 24 Z" fill="#7a4f2a" />
          <rect x="36" y="-34" width="3" height="34" fill="#5c3a1e" />
          <path d="M39 -32 L39 -8 L66 -10 Z" fill="#e9ddc9" opacity="0.85" />
        </g>
      </g>

      {/* Rim */}
      <circle cx="240" cy="240" r="232" fill="none" stroke="#ffffff" strokeOpacity="0.18" strokeWidth="2" />
    </svg>
  );
}
