/**
 * Monte Carlo equity calculator. Runs in a Web Worker so a 200k-iteration
 * simulation never blocks the UI. Prefillable from a logged hand via
 * #/equity?hero=AhKs&board=Jh7d2c.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRoute } from '../router';
import { parseCardRun, cardToString } from '../lib/parser';
import { CardRun } from '../components/CardText';
import type { EquityRequest, EquityResponse } from '../lib/equity/equity.worker';
import type { EquityResult } from '../lib/equity';

interface RunState {
  status: 'idle' | 'running' | 'done' | 'error';
  progress: number;
  result?: EquityResult;
  error?: string;
}

function validateInputs(hero: string, villain: string, board: string): string | undefined {
  const heroCards = parseCardRun(hero.replace(/[\s,]/g, ''));
  if (!heroCards || heroCards.length !== 2) {
    return 'Hero hand needs exactly two exact cards, e.g. AhKs.';
  }
  if (cardToString(heroCards[0]!) === cardToString(heroCards[1]!)) {
    return 'Hero hand uses the same card twice.';
  }
  if (villain.trim().length === 0) {
    return 'Give villain a hand or range, e.g. QQ+, AKs — or "random".';
  }
  const boardClean = board.replace(/[\s,]/g, '');
  if (boardClean.length > 0) {
    const boardCards = parseCardRun(boardClean);
    if (!boardCards) return 'Board must be exact cards, e.g. Jh7d2c.';
    if (boardCards.length > 5) return 'A board is at most five cards.';
    const all = [...heroCards, ...boardCards].map(cardToString);
    if (new Set(all).size !== all.length) return 'A card appears twice across hero hand and board.';
  }
  return undefined;
}

export function EquityScreen() {
  const route = useRoute();
  const [hero, setHero] = useState(route.params.get('hero') ?? '');
  const [villain, setVillain] = useState('random');
  const [board, setBoard] = useState(route.params.get('board') ?? '');
  const [iterations, setIterations] = useState(100_000);
  const [run, setRun] = useState<RunState>({ status: 'idle', progress: 0 });
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);

  // adopt new prefill when arriving from a hand's "check equity" link
  const prefillHero = route.params.get('hero');
  const prefillBoard = route.params.get('board');
  useEffect(() => {
    if (prefillHero !== null) setHero(prefillHero);
    if (prefillBoard !== null) setBoard(prefillBoard);
  }, [prefillHero, prefillBoard]);

  useEffect(() => {
    return () => workerRef.current?.terminate();
  }, []);

  const inputError = useMemo(() => validateInputs(hero, villain, board), [hero, villain, board]);

  const start = () => {
    if (inputError) return;
    workerRef.current?.terminate();
    const worker = new Worker(new URL('../lib/equity/equity.worker.ts', import.meta.url), {
      type: 'module',
    });
    workerRef.current = worker;
    const id = ++requestIdRef.current;
    setRun({ status: 'running', progress: 0 });
    worker.onmessage = (e: MessageEvent<EquityResponse>) => {
      const msg = e.data;
      if (msg.id !== requestIdRef.current) return;
      if (msg.type === 'progress') {
        setRun((r) => ({ ...r, progress: msg.fraction }));
      } else if (msg.type === 'result') {
        setRun({ status: 'done', progress: 1, result: msg.result });
      } else {
        setRun({ status: 'error', progress: 0, error: msg.message });
      }
    };
    const heroCards = parseCardRun(hero.replace(/[\s,]/g, ''))!;
    const boardCards = parseCardRun(board.replace(/[\s,]/g, '') || '') ?? [];
    const request: EquityRequest = {
      id,
      heroCards: [cardToString(heroCards[0]!), cardToString(heroCards[1]!)],
      villain: villain.trim(),
      board: boardCards.map(cardToString),
      iterations,
    };
    worker.postMessage(request);
  };

  const heroCards = parseCardRun(hero.replace(/[\s,]/g, ''));
  const boardCards = board.replace(/[\s,]/g, '').length > 0 ? parseCardRun(board.replace(/[\s,]/g, '')) : [];
  const result = run.result;

  return (
    <section aria-labelledby="equity-title">
      <h2 id="equity-title" className="screen-title">
        Equity
      </h2>

      <div className="two-col">
        <div className="panel">
          <h3>Matchup</h3>
          <label className="field">
            <span>Your hand (exact cards)</span>
            <input
              type="text"
              value={hero}
              onChange={(e) => setHero(e.target.value)}
              placeholder="AhKs"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
            />
          </label>
          <label className="field">
            <span>Villain hand or range</span>
            <input
              type="text"
              value={villain}
              onChange={(e) => setVillain(e.target.value)}
              placeholder="QQ+, AKs or random"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
            />
          </label>
          <label className="field">
            <span>Board (0–5 cards, optional)</span>
            <input
              type="text"
              value={board}
              onChange={(e) => setBoard(e.target.value)}
              placeholder="Jh7d2c"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
            />
          </label>
          <label className="field">
            <span>Iterations</span>
            <select value={iterations} onChange={(e) => setIterations(Number(e.target.value))}>
              <option value={20000}>20,000 — quick</option>
              <option value={100000}>100,000 — standard</option>
              <option value={400000}>400,000 — precise</option>
            </select>
          </label>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              type="button"
              className="btn primary"
              onClick={start}
              disabled={!!inputError || run.status === 'running'}
            >
              {run.status === 'running' ? 'Running…' : 'Run'}
            </button>
            {inputError && hero.trim().length + villain.trim().length > 0 && (
              <span className="note loss-text">{inputError}</span>
            )}
          </div>
          <p className="note" style={{ marginTop: 10 }}>
            Ranges: pairs (<code>TT+</code>, <code>99-66</code>), suited/offsuit (<code>AKs</code>,{' '}
            <code>AQo+</code>, <code>A2s+</code>), connectors (<code>T9s-65s</code>), exact combos (
            <code>AhKh</code>), or <code>random</code>. Comma-separated lists work.
          </p>
        </div>

        <div className="panel" aria-live="polite">
          <h3>Result</h3>
          {heroCards?.length === 2 && (
            <p>
              <CardRun cards={heroCards} />
              <span className="dim"> vs {villain.trim() || '—'}</span>
              {boardCards && boardCards.length > 0 && (
                <>
                  <span className="dim"> on </span>
                  <CardRun cards={boardCards} />
                </>
              )}
            </p>
          )}
          {run.status === 'idle' && <p className="note">Set up a matchup and hit Run.</p>}
          {run.status === 'running' && (
            <div>
              <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(run.progress * 100)}>
                <div style={{ width: `${run.progress * 100}%` }} />
              </div>
              <p className="note" style={{ marginTop: 6 }}>
                Simulating in a background thread…
              </p>
            </div>
          )}
          {run.status === 'error' && (
            <p className="loss-text" role="alert">
              {run.error}
            </p>
          )}
          {run.status === 'done' && result && (
            <div>
              <div className="tiles" style={{ marginBottom: 10 }}>
                <div className="tile">
                  <div className="k">Equity</div>
                  <div className="v win-text">{result.equity.toFixed(1)}%</div>
                  <div className="s">ties count half</div>
                </div>
                <div className="tile">
                  <div className="k">Win</div>
                  <div className="v">{((result.win / result.iterations) * 100).toFixed(1)}%</div>
                  <div className="s num">{result.win.toLocaleString('en-US')}</div>
                </div>
                <div className="tile">
                  <div className="k">Tie</div>
                  <div className="v">{((result.tie / result.iterations) * 100).toFixed(1)}%</div>
                  <div className="s num">{result.tie.toLocaleString('en-US')}</div>
                </div>
                <div className="tile">
                  <div className="k">Lose</div>
                  <div className="v">{((result.lose / result.iterations) * 100).toFixed(1)}%</div>
                  <div className="s num">{result.lose.toLocaleString('en-US')}</div>
                </div>
              </div>
              <div className="equity-bar" aria-hidden="true">
                <div className="w" style={{ width: `${(result.win / result.iterations) * 100}%` }}>
                  win
                </div>
                <div className="t" style={{ width: `${(result.tie / result.iterations) * 100}%` }} />
                <div className="l" style={{ width: `${(result.lose / result.iterations) * 100}%` }}>
                  lose
                </div>
              </div>
              <p className="note" style={{ marginTop: 8 }}>
                Monte Carlo over {result.iterations.toLocaleString('en-US')} deals — accurate to
                roughly ±{(150 / Math.sqrt(result.iterations)).toFixed(1)} points.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
