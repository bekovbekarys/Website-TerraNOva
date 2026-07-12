import type { Session } from '../db';

export interface FinishedSession extends Session {
  endedAt: number;
  cashOut: number;
}

export function isFinished(s: Session): s is FinishedSession {
  return s.endedAt !== undefined && s.cashOut !== undefined;
}

export function sessionProfit(s: FinishedSession): number {
  return s.cashOut - s.buyIn;
}

export function sessionHours(s: FinishedSession): number {
  return Math.max(0, s.endedAt - s.startedAt) / 3_600_000;
}

export interface SessionSummary {
  sessions: number;
  totalProfit: number;
  totalHours: number;
  hourly: number | undefined;
  winningSessions: number;
  bestSession: number | undefined;
  worstSession: number | undefined;
}

export function summarizeSessions(all: Session[]): SessionSummary {
  const done = all.filter(isFinished);
  const totalProfit = done.reduce((sum, s) => sum + sessionProfit(s), 0);
  const totalHours = done.reduce((sum, s) => sum + sessionHours(s), 0);
  const profits = done.map(sessionProfit);
  return {
    sessions: done.length,
    totalProfit,
    totalHours,
    hourly: totalHours > 0 ? totalProfit / totalHours : undefined,
    winningSessions: profits.filter((p) => p > 0).length,
    bestSession: profits.length > 0 ? Math.max(...profits) : undefined,
    worstSession: profits.length > 0 ? Math.min(...profits) : undefined,
  };
}

export interface SeriesPoint {
  t: number; // session end time
  cumulative: number;
  profit: number;
  label: string;
}

/** Cumulative profit over time, ordered by session end. */
export function profitSeries(all: Session[]): SeriesPoint[] {
  const done = all.filter(isFinished).sort((a, b) => a.endedAt - b.endedAt);
  let cumulative = 0;
  return done.map((s) => {
    const profit = sessionProfit(s);
    cumulative += profit;
    return {
      t: s.endedAt,
      cumulative,
      profit,
      label: `${s.stakes} ${s.location}`.trim(),
    };
  });
}

export interface GroupRow {
  key: string;
  sessions: number;
  profit: number;
  hours: number;
  hourly: number | undefined;
}

function groupBy(all: Session[], keyFn: (s: FinishedSession) => string): GroupRow[] {
  const done = all.filter(isFinished);
  const map = new Map<string, { sessions: number; profit: number; hours: number }>();
  for (const s of done) {
    const key = keyFn(s);
    const row = map.get(key) ?? { sessions: 0, profit: 0, hours: 0 };
    row.sessions += 1;
    row.profit += sessionProfit(s);
    row.hours += sessionHours(s);
    map.set(key, row);
  }
  return [...map.entries()]
    .map(([key, r]) => ({
      key,
      ...r,
      hourly: r.hours > 0 ? r.profit / r.hours : undefined,
    }))
    .sort((a, b) => b.profit - a.profit);
}

export function byStake(all: Session[]): GroupRow[] {
  return groupBy(all, (s) => (s.stakes.trim().length > 0 ? s.stakes.trim() : 'unspecified'));
}

export function byLocation(all: Session[]): GroupRow[] {
  return groupBy(all, (s) => (s.location.trim().length > 0 ? s.location.trim() : 'unspecified'));
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function byWeekday(all: Session[]): GroupRow[] {
  const rows = groupBy(all, (s) => WEEKDAYS[new Date(s.startedAt).getDay()]!);
  // keep calendar order rather than profit order
  return rows.sort((a, b) => WEEKDAYS.indexOf(a.key) - WEEKDAYS.indexOf(b.key));
}

export const LENGTH_BUCKETS = [
  { key: 'under 2h', min: 0, max: 2 },
  { key: '2–4h', min: 2, max: 4 },
  { key: '4–6h', min: 4, max: 6 },
  { key: '6–8h', min: 6, max: 8 },
  { key: 'over 8h', min: 8, max: Infinity },
] as const;

/** Session length vs. hourly rate — surfaces fatigue effects. */
export function byLength(all: Session[]): GroupRow[] {
  return groupBy(all, (s) => {
    const h = sessionHours(s);
    const bucket = LENGTH_BUCKETS.find((b) => h >= b.min && h < b.max) ?? LENGTH_BUCKETS[4];
    return bucket.key;
  }).sort(
    (a, b) =>
      LENGTH_BUCKETS.findIndex((x) => x.key === a.key) - LENGTH_BUCKETS.findIndex((x) => x.key === b.key),
  );
}
