/**
 * The ledger: cumulative profit drawn as a thin ink line over a subtle
 * felt-textured ground with hairline ledger rules. Hand-rolled SVG —
 * no chart library — so it matches the identity exactly.
 */

import { useId } from 'react';
import type { SeriesPoint } from '../lib/stats';
import { formatMoney, formatDate } from '../lib/format';

interface Props {
  series: SeriesPoint[];
  height?: number;
}

export function ProfitGraph({ series, height = 190 }: Props) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const W = 720;
  const H = height;
  const padL = 52;
  const padR = 14;
  const padT = 14;
  const padB = 26;

  // include the 0 starting point before the first session
  const values = [0, ...series.map((p) => p.cumulative)];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const x = (i: number) => padL + (series.length === 0 ? 0 : (i / series.length) * innerW);
  const y = (v: number) => padT + ((max - v) / span) * innerH;

  const points = values.map((v, i) => [x(i), y(v)] as const);
  const path = points
    .map(([px, py], i) => `${i === 0 ? 'M' : 'L'}${px.toFixed(1)},${py.toFixed(1)}`)
    .join(' ');

  const zeroY = y(0);
  const last = series[series.length - 1];
  const lastUp = (last?.cumulative ?? 0) >= 0;

  // ledger rules: 4 evenly spaced horizontal hairlines
  const rules = [0.25, 0.5, 0.75].map((f) => padT + innerH * f);

  return (
    <figure style={{ margin: 0 }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={
        last
            ? `Cumulative profit over ${series.length} sessions, currently ${formatMoney(last.cumulative, { sign: true })}`
            : 'Cumulative profit graph, no finished sessions yet'
        }
        style={{ width: '100%', height: 'auto', display: 'block' }}
      >
        <defs>
          <pattern id={`felt${uid}`} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="7" height="7" fill="var(--felt-950)" />
            <circle cx="1.4" cy="1.4" r="0.55" fill="var(--felt-800)" opacity="0.55" />
            <circle cx="4.9" cy="4.9" r="0.45" fill="var(--felt-700)" opacity="0.3" />
          </pattern>
        </defs>

        <rect x="0" y="0" width={W} height={H} fill={`url(#felt${uid})`} stroke="var(--line)" />

        {rules.map((ry) => (
          <line key={ry} x1={padL} y1={ry} x2={W - padR} y2={ry} stroke="var(--line)" strokeWidth="0.6" />
        ))}

        {/* zero baseline */}
        {min <= 0 && max >= 0 && (
          <>
            <line
              x1={padL}
              y1={zeroY}
              x2={W - padR}
              y2={zeroY}
              stroke="var(--ink-faint)"
              strokeWidth="0.8"
              strokeDasharray="4 4"
            />
            <text x={padL - 6} y={zeroY + 3.5} textAnchor="end" fontSize="10" fill="var(--ink-faint)" fontFamily="var(--font-mono)">
              0
            </text>
          </>
        )}

        {/* min/max labels */}
        {max > 0 && (
          <text x={padL - 6} y={y(max) + 3.5} textAnchor="end" fontSize="10" fill="var(--ink-dim)" fontFamily="var(--font-mono)">
            {formatMoney(max)}
          </text>
        )}
        {min < 0 && (
          <text x={padL - 6} y={y(min) + 3.5} textAnchor="end" fontSize="10" fill="var(--loss-text)" fontFamily="var(--font-mono)">
            {formatMoney(min)}
          </text>
        )}

        {/* the ink line */}
        {series.length > 0 && (
          <path d={path} fill="none" stroke="var(--ink)" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round" />
        )}

        {/* session marks */}
        {series.map((p, i) => (
          <circle
            key={p.t}
            cx={x(i + 1)}
            cy={y(p.cumulative)}
            r={i === series.length - 1 ? 3 : 1.7}
            fill={p.profit >= 0 ? 'var(--win)' : 'var(--loss)'}
            stroke="var(--felt-950)"
            strokeWidth="0.8"
          >
            <title>{`${formatDate(p.t)} ${p.label}: ${formatMoney(p.profit, { sign: true })} (total ${formatMoney(p.cumulative, { sign: true })})`}</title>
          </circle>
        ))}

        {/* x labels: first and last session dates */}
        {series.length > 0 && (
          <>
            <text x={padL} y={H - 8} fontSize="10" fill="var(--ink-faint)" fontFamily="var(--font-mono)">
              {formatDate(series[0]!.t)}
            </text>
            {series.length > 1 && (
              <text x={W - padR} y={H - 8} textAnchor="end" fontSize="10" fill="var(--ink-faint)" fontFamily="var(--font-mono)">
                {formatDate(last!.t)}
              </text>
            )}
          </>
        )}

        {/* running total, stamped like a ledger figure */}
        {last && (
          <text
            x={W - padR - 4}
            y={padT + 12}
            textAnchor="end"
            fontSize="15"
            fontWeight="600"
            fill={lastUp ? 'var(--win)' : 'var(--loss-text)'}
            fontFamily="var(--font-mono)"
          >
            {formatMoney(last.cumulative, { sign: true })}
          </text>
        )}
      </svg>
      <figcaption className="note" style={{ marginTop: 4 }}>
        {series.length === 0
          ? 'Cumulative result will draw here once a session is finished.'
          : `Cumulative result across ${series.length} finished session${series.length === 1 ? '' : 's'}.`}
      </figcaption>
    </figure>
  );
}
