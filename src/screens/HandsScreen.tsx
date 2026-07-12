/**
 * Hand history: every logged hand, expandable to its full structured
 * breakdown, with a jump into the equity calculator pre-filled from
 * the hand's cards and board.
 */

import { useMemo, useState } from 'react';
import { useStore } from '../store';
import { HandPreview } from '../components/HandPreview';
import { HoleCardsText } from '../components/CardText';
import { formatDateTime, formatMoney } from '../lib/format';
import { cardToString, holeCardsToString } from '../lib/parser';
import type { HandRecord } from '../lib/db';

function equityHref(hand: HandRecord): string | undefined {
  const hc = hand.parsed.heroCards;
  if (!hc || hc.kind !== 'exact') return undefined;
  const board = hand.parsed.streets.flatMap((s) => s.board).map(cardToString);
  const params = new URLSearchParams();
  params.set('hero', holeCardsToString(hc));
  if (board.length > 0) params.set('board', board.join(''));
  return `#/equity?${params.toString()}`;
}

function HandRow({ hand }: { hand: HandRecord }) {
  const store = useStore();
  const [confirm, setConfirm] = useState(false);
  const parsed = hand.parsed;
  const net = parsed.result?.heroNet;
  const session = hand.sessionId ? store.sessions.find((s) => s.id === hand.sessionId) : undefined;
  const eqHref = equityHref(hand);

  return (
    <details className="hand-row">
      <summary>
        <span>
          {parsed.heroCards ? <HoleCardsText cards={parsed.heroCards} /> : <span className="faint">??</span>}{' '}
          {parsed.heroPosition && <span className="dim">{parsed.heroPosition}</span>}
        </span>
        <span className="meta">
          {formatDateTime(hand.loggedAt)}
          {parsed.stakes ? ` · ${parsed.stakes.sb}/${parsed.stakes.bb}` : ''}
          {session ? ` · ${session.location}` : ''}
        </span>
        <span
          className={`num ${net === undefined ? 'faint' : net >= 0 ? 'win-text' : 'loss-text'}`}
        >
          {net === undefined ? 'no result' : formatMoney(net, { sign: true, unit: parsed.unit })}
        </span>
      </summary>
      <div className="body">
        <HandPreview hand={parsed} />
        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          {eqHref && (
            <a className="btn small" href={eqHref}>
              Check equity
            </a>
          )}
          {confirm ? (
            <>
              <button type="button" className="btn small danger" onClick={() => void store.deleteHand(hand.id)}>
                Confirm delete
              </button>
              <button type="button" className="btn small" onClick={() => setConfirm(false)}>
                Keep
              </button>
            </>
          ) : (
            <button type="button" className="btn small" onClick={() => setConfirm(true)}>
              Delete
            </button>
          )}
        </div>
      </div>
    </details>
  );
}

export function HandsScreen() {
  const store = useStore();
  const [filter, setFilter] = useState<string>('all');

  const hands = useMemo(() => {
    if (filter === 'all') return store.hands;
    if (filter === 'unattached') return store.hands.filter((h) => !h.sessionId);
    return store.hands.filter((h) => h.sessionId === filter);
  }, [store.hands, filter]);

  return (
    <section aria-labelledby="hands-title">
      <h2 id="hands-title" className="screen-title">
        Hands
      </h2>

      {store.hands.length === 0 ? (
        <div className="empty">
          <p>No hands logged yet.</p>
          <p className="hint">
            Log hands from the <a href="#/log">Log</a> tab between orbits. Each saved hand feeds the
            leak report — the more you log, the more honest it gets.
          </p>
        </div>
      ) : (
        <>
          <label className="field" style={{ maxWidth: 420 }}>
            <span>Show</span>
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">All hands ({store.hands.length})</option>
              <option value="unattached">Not attached to a session</option>
              {store.sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {formatDateTime(s.startedAt)} — {s.stakes} at {s.location}
                </option>
              ))}
            </select>
          </label>

          {hands.length === 0 ? (
            <div className="empty">
              <p>No hands match this filter.</p>
            </div>
          ) : (
            <div className="panel" style={{ paddingTop: 4, paddingBottom: 4 }}>
              {hands.map((h) => (
                <HandRow key={h.id} hand={h} />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
