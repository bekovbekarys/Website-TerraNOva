export function Logo({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="20" cy="20" r="19" fill="#1f744c" />
      <path
        d="M6 22c4-1 5 2 9 2s5-3 9-3 6 2 10 1"
        stroke="#8acca8"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M5 15c5 1 7-2 11-1s5 3 9 2 6-3 10-1"
        stroke="#dbf0e3"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M20 4c-4 5-6 10-6 16s2 11 6 16c4-5 6-10 6-16s-2-11-6-16Z"
        stroke="#dbf0e3"
        strokeWidth="1.4"
        fill="none"
        opacity="0.7"
      />
    </svg>
  );
}
