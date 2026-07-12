export function formatMoney(n: number, opts: { sign?: boolean; unit?: 'chips' | 'bb' } = {}): string {
  const { sign = false, unit = 'chips' } = opts;
  const abs = Math.abs(n);
  const body = unit === 'bb'
    ? `${trimNumber(abs)}bb`
    : `$${abs >= 10000 ? Math.round(abs).toLocaleString('en-US') : trimNumber(abs)}`;
  if (n < 0) return `-${body}`;
  if (sign && n > 0) return `+${body}`;
  return body;
}

export function trimNumber(n: number): string {
  const rounded = Math.round(n * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

export function formatPct(pct: number | undefined, digits = 0): string {
  if (pct === undefined) return '—';
  return `${pct.toFixed(digits)}%`;
}

export function formatHours(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m > 0 ? `${h}h ${m.toString().padStart(2, '0')}m` : `${h}h`;
}

export function formatDate(t: number): string {
  return new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateTime(t: number): string {
  return new Date(t).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatClock(t: number): string {
  return new Date(t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}
