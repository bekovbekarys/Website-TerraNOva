export function Logo({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="TerraNova"
    >
      <defs>
        <linearGradient
          id="tn-sky"
          x1="10"
          y1="2"
          x2="30"
          y2="32"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#36adea" />
          <stop offset="0.55" stopColor="#0072cc" />
          <stop offset="1" stopColor="#0a3f70" />
        </linearGradient>
        <linearGradient
          id="tn-land"
          x1="20"
          y1="22"
          x2="20"
          y2="40"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#54ad7f" />
          <stop offset="1" stopColor="#1f744c" />
        </linearGradient>
        <clipPath id="tn-globe">
          <circle cx="20" cy="20" r="18.5" />
        </clipPath>
      </defs>

      {/* Globe / sky */}
      <circle cx="20" cy="20" r="18.5" fill="url(#tn-sky)" />

      <g clipPath="url(#tn-globe)">
        {/* Soft halo behind the rising nova */}
        <circle cx="27" cy="12" r="9" fill="#ffffff" opacity="0.14" />

        {/* Distant snow-lit range */}
        <path
          d="M-1 28 L7 19 L13 24 L21 14.5 L29 23 L41 17 L41 41 L-1 41 Z"
          fill="#dff2e6"
          opacity="0.92"
        />
        {/* Snow cap on the tallest peak */}
        <path d="M21 14.5 L17.8 18.6 L24.2 18.6 Z" fill="#ffffff" />

        {/* Foreground range */}
        <path
          d="M-1 34 L7 27 L13 32 L20 25 L27 32 L34 28 L41 33 L41 41 L-1 41 Z"
          fill="url(#tn-land)"
        />
      </g>

      {/* Nova — the "new" spark */}
      <path
        d="M27 5 C27.6 9 28.6 10 32.5 10.6 C28.6 11.2 27.6 12.2 27 16.2 C26.4 12.2 25.4 11.2 21.5 10.6 C25.4 10 26.4 9 27 5 Z"
        fill="#ffffff"
      />
      <circle cx="31.8" cy="6.8" r="0.9" fill="#ffffff" opacity="0.85" />

      {/* Subtle rim light */}
      <circle
        cx="20"
        cy="20"
        r="18.5"
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.2"
        strokeWidth="1"
      />
    </svg>
  );
}
