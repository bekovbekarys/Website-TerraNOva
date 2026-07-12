/**
 * The leak report. Frequencies with sample sizes, aggression by street,
 * showdown vs non-showdown money, positional results, and rule-based
 * leak flags. Anything without enough data says so instead of guessing.
 */

import { useMemo } from 'react';
import { useStore } from '../store';
import { aggregateHands, findLeaks, type Rate } from '../lib/stats';
import { formatMoney, formatPct } from '../lib/format';
import type { Position } from '../lib/parser';

function StatTile({ label, rate, hint, digits = 0 }: { label: string; rate: Rate; hint: string; digits?: number }) {
  return (
    <div className="tile">
      <div className="k">{label}</div>
      <div className="v">{formatPct(rate.pct, digits)}</div>
      <div className="s">
        {rate.opportunities > 0 ? `${rate.count}/${rate.opportunities} ${hint}` : `no ${hint} yet`}
      </div>
    </div>
  );
}

const POSITION_ORDER: Position[] = ['UTG', 'UTG1', 'UTG2', 'LJ', 'MP', 'HJ', 'CO', 'BTN', 'SB', 'BB', 'ST'];

export function StatsScreen() {
  const store = useStore();
  const parsedHands = useMemo(() => store.hands.map((h) => h.parsed), [store.hands]);
  const agg = useMemo(() => aggregateHands(parsedHands), [parsedHands]);
  const leaks = useMemo(() => findLeaks(agg, store.sessions), [agg, store.sessions]);

  if (store.hands.length === 0) {
    return (
      <section aria-labelledby="stats-title">
        <h2 id="stats-title" className="screen-title">
          Leaks
        </h2>
        <div className="empty">
          <p>The leak report builds from your logged hands.</p>
          <p className="hint">
            Log hands from the <a href="#/log">Log</a> tab. Frequencies (VPIP, PFR, 3-bet…) start
            showing immediately; leak flags wait until there's enough data to mean something —
            usually 20–40 hands.
          </p>
        </div>
      </section>
    );
  }

  const positions = POSITION_ORDER.filter((p) => agg.byPosition[p]);

  return (
    <section aria-labelledby="stats-title">
      <h2 id="stats-title" className="screen-title">
        Leaks — {agg.hands} hand{agg.hands === 1 ? '' : 's'} on record
      </h2>

      {leaks.length > 0 ? (
        <div style={{ marginBottom: 14 }}>
          {leaks.map((flag) => (
            <div key={flag.id} className={`flag ${flag.severity === 'note' ? 'note-flag' : ''}`}>
              <h3>{flag.title}</h3>
              <p style={{ marginBottom: 4 }}>{flag.detail}</p>
              <span className="sample">sample: {flag.sample}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="panel">
          <h3>No leak flags yet</h3>
          <p className="note">
            Flags only fire once a pattern shows up across enough hands to be signal rather than
            noise. Keep logging — especially the hands that felt bad.
          </p>
        </div>
      )}

      <div className="panel">
        <h3>Preflop</h3>
        <div className="tiles">
          <StatTile label="VPIP" rate={agg.vpip} hint="hands" />
          <StatTile label="PFR" rate={agg.pfr} hint="hands" />
          <StatTile label="3-bet" rate={agg.threeBet} hint="chances" digits={1} />
          <StatTile label="Fold to 3-bet" rate={agg.foldTo3Bet} hint="3-bets faced" />
          <StatTile label="Limp" rate={agg.limpRate} hint="hands played" />
        </div>
        <p className="note" style={{ marginTop: 6 }}>
          Live players tend to log memorable hands, not every hand — read these as “of what you wrote
          down”, not a HUD.
        </p>
      </div>

      <div className="panel">
        <h3>Postflop</h3>
        <div className="tiles">
          <StatTile label="C-bet flop" rate={agg.cbet} hint="flops as raiser" />
          <StatTile label="Agg flop" rate={agg.afq.flop} hint="actions" />
          <StatTile label="Agg turn" rate={agg.afq.turn} hint="actions" />
          <StatTile label="Agg river" rate={agg.afq.river} hint="actions" />
          <StatTile label="WTSD" rate={agg.wentToShowdown} hint="resolved hands" />
          <StatTile label="W$SD" rate={agg.wonAtShowdown} hint="showdowns" />
        </div>
      </div>

      <div className="panel">
        <h3>Where the money went</h3>
        {agg.handsWithMoney === 0 ? (
          <p className="note">
            No hands with a recorded result yet. End hands with “I win”, “he takes it”, or “chop” so
            they can be valued.
          </p>
        ) : (
          <>
            <div className="tiles">
              <div className="tile">
                <div className="k">At showdown</div>
                <div className={`v ${agg.showdownWinnings >= 0 ? 'win-text' : 'loss-text'}`}>
                  {formatMoney(agg.showdownWinnings, { sign: true })}
                </div>
                <div className="s">hands that showed down</div>
              </div>
              <div className="tile">
                <div className="k">No showdown</div>
                <div className={`v ${agg.nonShowdownWinnings >= 0 ? 'win-text' : 'loss-text'}`}>
                  {formatMoney(agg.nonShowdownWinnings, { sign: true })}
                </div>
                <div className="s">pots taken / surrendered</div>
              </div>
              <div className="tile">
                <div className="k">Valued</div>
                <div className="v">{agg.handsWithMoney}</div>
                <div className="s">
                  {agg.handsExcludedFromMoney > 0
                    ? `${agg.handsExcludedFromMoney} excluded (no $ value)`
                    : 'hands counted'}
                </div>
              </div>
            </div>
            {positions.length > 0 && (
              <div className="table-wrap" style={{ marginTop: 10 }}>
                <table className="ledger">
                  <thead>
                    <tr>
                      <th scope="col">Seat</th>
                      <th scope="col" className="num">
                        Hands
                      </th>
                      <th scope="col" className="num">
                        Valued
                      </th>
                      <th scope="col" className="num">
                        Net
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {positions.map((p) => {
                      const row = agg.byPosition[p]!;
                      return (
                        <tr key={p}>
                          <td>{p}</td>
                          <td className="num">{row.hands}</td>
                          <td className="num">{row.handsWithMoney}</td>
                          <td className={`num ${row.net >= 0 ? 'win-text' : 'loss-text'}`}>
                            {row.handsWithMoney > 0 ? formatMoney(row.net, { sign: true }) : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
