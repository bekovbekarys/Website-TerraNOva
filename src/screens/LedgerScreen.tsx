/**
 * The ledger — home screen. Live session control, cumulative profit
 * line, summary figures, and the session book with breakdowns.
 */

import { useMemo, useState } from 'react';
import { useStore } from '../store';
import { ProfitGraph } from '../components/ProfitGraph';
import {
  byLength,
  byLocation,
  byStake,
  byWeekday,
  isFinished,
  profitSeries,
  sessionHours,
  sessionProfit,
  summarizeSessions,
  type GroupRow,
} from '../lib/stats';
import { formatDateTime, formatHours, formatMoney } from '../lib/format';
import type { Session } from '../lib/db';

function StartSessionForm({ onDone }: { onDone: () => void }) {
  const store = useStore();
  const [stakes, setStakes] = useState('1/2');
  const [location, setLocation] = useState('');
  const [buyIn, setBuyIn] = useState('300');
  const [error, setError] = useState<string | undefined>(undefined);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const buyInNum = Number(buyIn);
    if (!Number.isFinite(buyInNum) || buyInNum <= 0) {
      setError('Buy-in must be a positive number.');
      return;
    }
    if (stakes.trim().length === 0) {
      setError('Stakes are required — "1/2" style.');
      return;
    }
    setError(undefined);
    await store.startSession({
      stakes: stakes.trim(),
      location: location.trim() || 'Unspecified',
      buyIn: buyInNum,
    });
    onDone();
  };

  return (
    <form onSubmit={(e) => void submit(e)} className="panel">
      <h3>Start a session</h3>
      <div className="form-grid">
        <label className="field">
          <span>Stakes</span>
          <input type="text" value={stakes} onChange={(e) => setStakes(e.target.value)} placeholder="1/2" required />
        </label>
        <label className="field">
          <span>Location</span>
          <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Card room" />
        </label>
        <label className="field">
          <span>Buy-in ($)</span>
          <input
            type="number"
            inputMode="decimal"
            min="0.01"
            step="any"
            value={buyIn}
            onChange={(e) => setBuyIn(e.target.value)}
            required
          />
        </label>
        <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 10 }}>
          <button type="submit" className="btn primary">
            Start
          </button>
        </div>
      </div>
      {error && (
        <p className="loss-text" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

function LiveSessionCard({ session }: { session: Session }) {
  const store = useStore();
  const [cashOut, setCashOut] = useState('');
  const [addOn, setAddOn] = useState('');
  const [error, setError] = useState<string | undefined>(undefined);
  const [ending, setEnding] = useState(false);
  const handsInSession = store.hands.filter((h) => h.sessionId === session.id).length;

  const end = async (e: React.FormEvent) => {
    e.preventDefault();
    const cash = Number(cashOut);
    if (cashOut.trim() === '' || !Number.isFinite(cash) || cash < 0) {
      setError('Cash-out must be zero or more (what you walked away with).');
      return;
    }
    setError(undefined);
    setEnding(true);
    try {
      await store.endSession(session.id, cash);
    } finally {
      setEnding(false);
    }
  };

  const applyAddOn = async () => {
    const amount = Number(addOn);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Add-on must be a positive amount.');
      return;
    }
    setError(undefined);
    await store.updateSession({ ...session, buyIn: session.buyIn + amount });
    setAddOn('');
  };

  return (
    <div className="panel" style={{ borderLeft: '3px solid var(--win)' }}>
      <h3>
        Live — {session.stakes} at {session.location}
      </h3>
      <p className="dim" style={{ fontSize: 13.5 }}>
        Seated {formatDateTime(session.startedAt)} · in for{' '}
        <strong className="num">{formatMoney(session.buyIn)}</strong> · {handsInSession} hand
        {handsInSession === 1 ? '' : 's'} logged ·{' '}
        <a href="#/log">log a hand</a>
      </p>
      <form onSubmit={(e) => void end(e)} className="form-grid">
        <label className="field">
          <span>Add-on ($)</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              type="number"
              inputMode="decimal"
              min="0.01"
              step="any"
              value={addOn}
              onChange={(e) => setAddOn(e.target.value)}
              placeholder="100"
            />
            <button type="button" className="btn small" onClick={() => void applyAddOn()}>
              Add
            </button>
          </div>
        </label>
        <label className="field">
          <span>Cash-out ($)</span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            value={cashOut}
            onChange={(e) => setCashOut(e.target.value)}
            placeholder="0"
          />
        </label>
        <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 10 }}>
          <button type="submit" className="btn" disabled={ending}>
            End session
          </button>
        </div>
      </form>
      {error && (
        <p className="loss-text" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function BreakdownTable({ title, rows, keyHeader }: { title: string; rows: GroupRow[]; keyHeader: string }) {
  if (rows.length === 0) return null;
  return (
    <div className="panel">
      <h3>{title}</h3>
      <div className="table-wrap">
        <table className="ledger">
          <thead>
            <tr>
              <th scope="col">{keyHeader}</th>
              <th scope="col" className="num">
                Sessions
              </th>
              <th scope="col" className="num">
                Hours
              </th>
              <th scope="col" className="num">
                Result
              </th>
              <th scope="col" className="num">
                $/hr
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key}>
                <td>{r.key}</td>
                <td className="num">{r.sessions}</td>
                <td className="num">{r.hours.toFixed(1)}</td>
                <td className={`num ${r.profit >= 0 ? 'win-text' : 'loss-text'}`}>
                  {formatMoney(r.profit, { sign: true })}
                </td>
                <td className="num">{r.hourly === undefined ? '—' : formatMoney(r.hourly, { sign: true })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function LedgerScreen() {
  const store = useStore();
  const [showStart, setShowStart] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | undefined>(undefined);

  const finished = useMemo(() => store.sessions.filter(isFinished), [store.sessions]);
  const summary = useMemo(() => summarizeSessions(store.sessions), [store.sessions]);
  const series = useMemo(() => profitSeries(store.sessions), [store.sessions]);

  return (
    <section aria-labelledby="ledger-title">
      <h2 id="ledger-title" className="screen-title">
        Ledger
      </h2>

      {store.activeSession ? (
        <LiveSessionCard session={store.activeSession} />
      ) : showStart ? (
        <StartSessionForm onDone={() => setShowStart(false)} />
      ) : (
        <div style={{ marginBottom: 12 }}>
          <button type="button" className="btn primary" onClick={() => setShowStart(true)}>
            Start a session
          </button>
        </div>
      )}

      {finished.length === 0 && !store.activeSession && !showStart ? (
        <div className="empty">
          <p>No sessions on the books yet.</p>
          <p className="hint">
            Start a session when you sit down — stakes, room, buy-in. End it when you rack up. Your
            profit line, hourly rate, and the leak report all build from here.
          </p>
        </div>
      ) : (
        <>
          <div className="panel">
            <h3>The line</h3>
            <ProfitGraph series={series} />
          </div>

          {finished.length > 0 && (
            <>
              <div className="tiles" style={{ marginBottom: 12 }}>
                <div className="tile">
                  <div className="k">Result</div>
                  <div className={`v ${summary.totalProfit >= 0 ? 'win-text' : 'loss-text'}`}>
                    {formatMoney(summary.totalProfit, { sign: true })}
                  </div>
                  <div className="s">{summary.sessions} sessions</div>
                </div>
                <div className="tile">
                  <div className="k">Hourly</div>
                  <div className={`v ${(summary.hourly ?? 0) >= 0 ? 'win-text' : 'loss-text'}`}>
                    {summary.hourly === undefined ? '—' : formatMoney(summary.hourly, { sign: true })}
                  </div>
                  <div className="s">{formatHours(summary.totalHours)} played</div>
                </div>
                <div className="tile">
                  <div className="k">Win rate</div>
                  <div className="v">
                    {summary.sessions > 0 ? Math.round((summary.winningSessions / summary.sessions) * 100) : 0}%
                  </div>
                  <div className="s">{summary.winningSessions} winning</div>
                </div>
                <div className="tile">
                  <div className="k">Best</div>
                  <div className="v win-text">
                    {summary.bestSession === undefined ? '—' : formatMoney(summary.bestSession, { sign: true })}
                  </div>
                  <div className="s">single session</div>
                </div>
                <div className="tile">
                  <div className="k">Worst</div>
                  <div className="v loss-text">
                    {summary.worstSession === undefined ? '—' : formatMoney(summary.worstSession, { sign: true })}
                  </div>
                  <div className="s">single session</div>
                </div>
              </div>

              <BreakdownTable title="By stake" keyHeader="Stake" rows={byStake(store.sessions)} />
              <BreakdownTable title="By room" keyHeader="Room" rows={byLocation(store.sessions)} />
              <BreakdownTable title="By day of week" keyHeader="Day" rows={byWeekday(store.sessions)} />
              <BreakdownTable
                title="By session length (fatigue check)"
                keyHeader="Length"
                rows={byLength(store.sessions)}
              />

              <div className="panel">
                <h3>Session book</h3>
                <div className="table-wrap">
                  <table className="ledger">
                    <thead>
                      <tr>
                        <th scope="col">When</th>
                        <th scope="col">Stakes</th>
                        <th scope="col">Room</th>
                        <th scope="col" className="num">
                          Hours
                        </th>
                        <th scope="col" className="num">
                          In / Out
                        </th>
                        <th scope="col" className="num">
                          Result
                        </th>
                        <th scope="col">
                          <span className="visually-hidden">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {finished.map((s) => {
                        const profit = sessionProfit(s);
                        return (
                          <tr key={s.id}>
                            <td>{formatDateTime(s.startedAt)}</td>
                            <td className="num">{s.stakes}</td>
                            <td>{s.location}</td>
                            <td className="num">{sessionHours(s).toFixed(1)}</td>
                            <td className="num dim">
                              {formatMoney(s.buyIn)} / {formatMoney(s.cashOut)}
                            </td>
                            <td className={`num ${profit >= 0 ? 'win-text' : 'loss-text'}`}>
                              {formatMoney(profit, { sign: true })}
                            </td>
                            <td>
                              {confirmDelete === s.id ? (
                                <span style={{ whiteSpace: 'nowrap' }}>
                                  <button
                                    type="button"
                                    className="btn small danger"
                                    onClick={() => {
                                      void store.deleteSession(s.id);
                                      setConfirmDelete(undefined);
                                    }}
                                  >
                                    Confirm
                                  </button>{' '}
                                  <button type="button" className="btn small" onClick={() => setConfirmDelete(undefined)}>
                                    Keep
                                  </button>
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  className="btn small"
                                  aria-label={`Delete session on ${formatDateTime(s.startedAt)}`}
                                  onClick={() => setConfirmDelete(s.id)}
                                >
                                  Delete
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="note" style={{ marginTop: 8 }}>
                  Deleting a session keeps its logged hands — they just detach from the session.
                </p>
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}
