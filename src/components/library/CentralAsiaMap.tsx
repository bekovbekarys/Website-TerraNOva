// A stylised map of Central Asia for the library hero: seas, lakes, the two
// great rivers feeding the Aral Sea, the Tien Shan and Pamir ranges, and a few
// cities. Shapes are drawn from approximate longitude/latitude points, so it is
// geographically faithful in outline without being a survey map. Pure SVG.

const LON0 = 46;
const LAT0 = 54.5;
const SX = 19; // px per degree of longitude
const SY = 26; // px per degree of latitude (stretched, as on a Mercator map at ~45°N)
const W = (84 - LON0) * SX;
const H = (LAT0 - 35.5) * SY;

type Pt = [number, number]; // [lon, lat]

function project([lon, lat]: Pt): [number, number] {
  return [(lon - LON0) * SX, (LAT0 - lat) * SY];
}

// Smooth curve through points (Catmull-Rom converted to cubic Béziers).
function smooth(points: Pt[], closed: boolean): string {
  const p = points.map(project);
  const n = p.length;
  const at = (i: number) => (closed ? p[(i + n) % n] : p[Math.max(0, Math.min(n - 1, i))]);
  let d = `M${p[0][0].toFixed(1)} ${p[0][1].toFixed(1)}`;
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return closed ? d + "Z" : d;
}

const CASPIAN = smooth(
  [
    [49.4, 46.7], [51.4, 47.0], [53.1, 46.6], [53.1, 45.4], [51.4, 44.6], [50.6, 44.3],
    [51.3, 43.1], [52.6, 41.8], [52.9, 40.6], [53.8, 39.6], [53.9, 37.7], [53.0, 36.9],
    [51.0, 36.7], [49.5, 37.4], [48.9, 38.4], [49.4, 40.1], [50.2, 40.5], [49.1, 41.4],
    [47.9, 42.6], [47.4, 43.6], [47.1, 44.7], [47.6, 45.8],
  ],
  true
);

// The Aral Sea's 1960 shoreline, and the remnants that remain today.
const ARAL_1960 = smooth(
  [
    [59.0, 46.6], [60.3, 46.8], [61.6, 46.5], [61.8, 45.6], [61.2, 44.6], [60.4, 43.7],
    [59.4, 43.5], [58.5, 43.9], [58.2, 44.8], [58.5, 45.8],
  ],
  true
);
const ARAL_NORTH = smooth(
  [[60.6, 46.6], [61.3, 46.7], [61.6, 46.4], [61.0, 46.15], [60.5, 46.3]],
  true
);
const ARAL_SOUTH = smooth(
  [[58.5, 45.5], [58.9, 45.6], [59.0, 44.9], [58.85, 44.2], [58.55, 44.4], [58.4, 45.0]],
  true
);

const BALKHASH = smooth(
  [
    [73.5, 46.4], [74.6, 46.75], [75.6, 46.7], [76.6, 46.75], [77.8, 46.9], [79.0, 46.6],
    [79.2, 46.2], [78.2, 46.35], [77.0, 46.35], [76.0, 46.25], [75.0, 46.0], [74.2, 45.8],
    [73.6, 45.9],
  ],
  true
);

const ISSYK_KUL = smooth(
  [[76.2, 42.45], [77.0, 42.75], [78.2, 42.6], [78.4, 42.35], [77.4, 42.2], [76.5, 42.2]],
  true
);

const AMU_DARYA = smooth(
  [
    [73.6, 37.4], [72.3, 37.0], [70.6, 37.2], [68.9, 37.2], [67.6, 37.3], [66.4, 37.9],
    [65.2, 38.7], [63.6, 39.4], [62.3, 40.4], [61.2, 41.4], [60.2, 42.4], [59.5, 43.3], [59.0, 43.9],
  ],
  false
);

const SYR_DARYA = smooth(
  [
    [73.3, 41.1], [71.8, 40.9], [70.6, 40.6], [69.4, 40.8], [68.6, 41.7], [67.8, 42.7],
    [66.6, 43.9], [65.3, 44.6], [63.9, 45.1], [62.5, 45.8], [61.4, 46.1],
  ],
  false
);

const ILI = smooth(
  [[81.2, 43.9], [79.6, 43.85], [78.2, 43.9], [77.2, 44.2], [76.3, 44.8], [75.4, 45.6]],
  false
);

const IRTYSH = smooth(
  [[83.6, 48.9], [82.6, 49.6], [80.2, 50.4], [78.5, 51.6], [77.0, 52.6], [76.0, 53.6], [75.5, 54.4]],
  false
);

// Mountain peaks: [lon, lat, size]
const PEAKS: [number, number, number][] = [
  // Tien Shan, west to east
  [68.9, 42.1, 0.8], [70.0, 42.25, 0.9], [71.3, 42.5, 1.0], [72.6, 42.45, 0.95], [73.8, 42.1, 1.1],
  [75.0, 41.5, 1.0], [76.2, 41.35, 1.15], [77.4, 41.4, 1.25], [78.6, 41.55, 1.35], [79.9, 41.9, 1.45],
  [81.2, 42.5, 1.25], [82.5, 43.0, 1.05], [73.9, 42.55, 0.75], [79.6, 43.0, 0.9], [80.8, 43.4, 0.8],
  // Pamir and Alay
  [71.0, 39.3, 0.9], [72.3, 39.45, 1.0], [73.4, 39.3, 0.95], [71.6, 38.6, 1.2], [72.8, 38.4, 1.35],
  [74.0, 38.3, 1.25], [72.1, 37.6, 1.05], [73.4, 37.6, 1.15], [70.4, 38.5, 0.8],
  // Kopet Dag
  [56.3, 38.5, 0.6], [57.4, 37.75, 0.6], [59.6, 36.9, 0.55],
  // Altai foothills
  [83.0, 49.0, 0.8], [82.0, 49.6, 0.65],
];

const CITIES: { name: string; at: Pt; dx: number; dy: number; anchor?: "start" | "end" | "middle" }[] = [
  { name: "Astana", at: [71.43, 51.13], dx: 9, dy: 4 },
  { name: "Almaty", at: [76.9, 43.25], dx: 0, dy: -12, anchor: "middle" },
  { name: "Bishkek", at: [74.6, 42.87], dx: -9, dy: -6, anchor: "end" },
  { name: "Tashkent", at: [69.24, 41.3], dx: -9, dy: 4, anchor: "end" },
  { name: "Dushanbe", at: [68.78, 38.56], dx: -9, dy: 4, anchor: "end" },
  { name: "Ashgabat", at: [58.38, 37.95], dx: 9, dy: -7 },
];

function xy(pt: Pt) {
  const [x, y] = project(pt);
  return { x, y };
}

export function CentralAsiaMap({ className }: { className?: string }) {
  const aralCenter = xy([60.0, 45.15]);
  return (
    <svg
      className={className}
      viewBox={`-10 -10 ${W + 20} ${H + 20}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Stylised map of Central Asia showing the Caspian and Aral seas, Lake Balkhash, the Amu Darya and Syr Darya rivers, and the Tien Shan and Pamir mountains"
    >
      <defs>
        <radialGradient id="cam-glow" cx="50%" cy="45%" r="60%">
          <stop offset="0" stopColor="#8acca8" stopOpacity="0.22" />
          <stop offset="1" stopColor="#8acca8" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="cam-water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6ac4ff" />
          <stop offset="1" stopColor="#0a7fd0" />
        </linearGradient>
        <linearGradient id="cam-river" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#b3dfff" />
          <stop offset="1" stopColor="#6ac4ff" />
        </linearGradient>
        <linearGradient id="cam-peak" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="0.45" stopColor="#dbf0e3" stopOpacity="0.55" />
          <stop offset="1" stopColor="#8acca8" stopOpacity="0.15" />
        </linearGradient>
        <filter id="cam-soft" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <pattern id="cam-dots" width="14" height="14" patternUnits="userSpaceOnUse">
          <circle cx="1.5" cy="1.5" r="1.1" fill="#ffffff" fillOpacity="0.16" />
        </pattern>
        <clipPath id="cam-frame">
          <rect x="0" y="0" width={W} height={H} rx="28" />
        </clipPath>
      </defs>

      <g clipPath="url(#cam-frame)">
        <rect x="0" y="0" width={W} height={H} fill="url(#cam-dots)" />
        <rect x="0" y="0" width={W} height={H} fill="url(#cam-glow)" />

        {/* Graticule every 5 degrees */}
        <g stroke="#ffffff" strokeOpacity="0.07" strokeWidth="1">
          {[50, 55, 60, 65, 70, 75, 80].map((lon) => {
            const { x } = xy([lon, 0]);
            return <line key={lon} x1={x} y1={0} x2={x} y2={H} />;
          })}
          {[40, 45, 50].map((lat) => {
            const { y } = xy([0, lat]);
            return <line key={lat} x1={0} y1={y} x2={W} y2={y} />;
          })}
        </g>

        {/* Desert and steppe labels */}
        <g fill="#dbf0e3" fillOpacity="0.38" fontSize="13" letterSpacing="5" fontFamily="var(--font-sans)">
          <text {...xy([64.5, 50.2])}>KAZAKH STEPPE</text>
          <text {...xy([59.6, 39.6])}>KARAKUM</text>
          <text {...xy([62.6, 42.6])}>KYZYLKUM</text>
        </g>

        {/* Water glow */}
        <g filter="url(#cam-soft)" opacity="0.6">
          <path d={CASPIAN} fill="#1aa6ff" />
          <path d={BALKHASH} fill="#1aa6ff" />
          <path d={ARAL_NORTH} fill="#1aa6ff" />
        </g>

        {/* Rivers, with a slow flowing dash */}
        <g strokeLinecap="round" fill="none">
          {[AMU_DARYA, SYR_DARYA, ILI, IRTYSH].map((d, i) => (
            <g key={i}>
              <path d={d} stroke="#6ac4ff" strokeOpacity="0.35" strokeWidth="5" />
              <path
                d={d}
                stroke="url(#cam-river)"
                strokeWidth="2"
                strokeDasharray="10 14"
                className="[animation:flow_3.5s_linear_infinite]"
              />
            </g>
          ))}
        </g>

        {/* Seas and lakes */}
        <path d={CASPIAN} fill="url(#cam-water)" stroke="#b3dfff" strokeOpacity="0.6" strokeWidth="1.5" />
        <path d={BALKHASH} fill="url(#cam-water)" stroke="#b3dfff" strokeOpacity="0.6" strokeWidth="1.2" />

        {/* The Aral Sea: where the shoreline was in 1960, and what is left */}
        <path d={ARAL_1960} fill="#dcb887" fillOpacity="0.16" stroke="#fce7c3" strokeOpacity="0.75" strokeWidth="1.5" strokeDasharray="5 5" />
        <circle cx={aralCenter.x} cy={aralCenter.y} r="70" stroke="#fce7c3" strokeOpacity="0.25" className="[animation:ripple_4s_ease-out_infinite] origin-center [transform-box:fill-box]" />
        <path d={ARAL_NORTH} fill="url(#cam-water)" stroke="#b3dfff" strokeWidth="1.2" />
        <path d={ARAL_SOUTH} fill="url(#cam-water)" fillOpacity="0.85" stroke="#b3dfff" strokeWidth="1" />

        {/* Mountains */}
        <g>
          {PEAKS.map(([lon, lat, s], i) => {
            const { x, y } = xy([lon, lat]);
            const w = 22 * s;
            const h = 26 * s;
            return (
              <g key={i}>
                <path d={`M${x - w} ${y + h * 0.35} L${x} ${y - h * 0.65} L${x + w} ${y + h * 0.35}Z`} fill="url(#cam-peak)" />
                <path
                  d={`M${x - w * 0.32} ${y - h * 0.3} L${x} ${y - h * 0.65} L${x + w * 0.32} ${y - h * 0.3} L${x + w * 0.1} ${y - h * 0.38} L${x - w * 0.08} ${y - h * 0.28}Z`}
                  fill="#ffffff"
                />
              </g>
            );
          })}
        </g>

        <path d={ISSYK_KUL} fill="url(#cam-water)" stroke="#b3dfff" strokeOpacity="0.8" strokeWidth="1.2" />

        {/* Water and range labels */}
        <g fontFamily="var(--font-serif)" fontStyle="italic" fontSize="15" fill="#e6f5ff">
          <text {...xy([49.0, 42.9])} transform={`rotate(-62 ${xy([49.0, 42.9]).x} ${xy([49.0, 42.9]).y})`} fillOpacity="0.9">
            Caspian Sea
          </text>
          <text {...xy([61.9, 45.3])} fillOpacity="0.95">Aral Sea</text>
          <text {...xy([73.6, 47.35])} fillOpacity="0.9">Lake Balkhash</text>
          <text {...xy([76.6, 40.55])} fill="#ffffff" fillOpacity="0.85">Tien Shan</text>
          <text {...xy([74.6, 37.7])} fill="#ffffff" fillOpacity="0.85">Pamir</text>
          <text {...xy([63.4, 40.3])} fontSize="12" fillOpacity="0.75" transform={`rotate(-38 ${xy([63.4, 40.3]).x} ${xy([63.4, 40.3]).y})`}>
            Amu Darya
          </text>
          <text {...xy([65.0, 45.05])} fontSize="12" fillOpacity="0.75" transform={`rotate(-24 ${xy([65.0, 45.05]).x} ${xy([65.0, 45.05]).y})`}>
            Syr Darya
          </text>
        </g>

        {/* Cities */}
        <g fontFamily="var(--font-sans)" fontSize="12" fontWeight="600" fill="#ffffff">
          {CITIES.map((c, i) => {
            const { x, y } = xy(c.at);
            return (
              <g key={c.name}>
                <circle
                  cx={x}
                  cy={y}
                  r="9"
                  fill="#54ad7f"
                  fillOpacity="0.35"
                  className="origin-center [transform-box:fill-box] [animation:pulse-dot_2.6s_ease-out_infinite]"
                  style={{ animationDelay: `${i * 0.4}s` }}
                />
                <circle cx={x} cy={y} r="3.6" fill="#ffffff" stroke="#1f744c" strokeWidth="1.5" />
                <text x={x + c.dx} y={y + c.dy} textAnchor={c.anchor ?? "start"} fillOpacity="0.92">
                  {c.name}
                </text>
              </g>
            );
          })}
        </g>

        {/* Legend */}
        <g fontFamily="var(--font-sans)" fontSize="11" fill="#dbf0e3" fillOpacity="0.8">
          <line x1="22" y1={H - 26} x2="44" y2={H - 26} stroke="#fce7c3" strokeWidth="1.5" strokeDasharray="5 5" />
          <text x="52" y={H - 22}>Aral Sea shoreline, 1960</text>
        </g>
      </g>

      <rect x="0.5" y="0.5" width={W - 1} height={H - 1} rx="28" stroke="#ffffff" strokeOpacity="0.14" />
    </svg>
  );
}
