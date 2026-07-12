/**
 * Hand entry: shorthand in, structured preview out, confirm to save.
 * Built for thumbs at the table — big textarea, one-tap snippets,
 * exact highlighting of anything the parser couldn't read.
 */

import { useMemo, useRef, useState } from 'react';
import { parseHand } from '../lib/parser';
import { useStore } from '../store';
import { HandPreview, IssueList, MarkedInput } from '../components/HandPreview';
import { formatDateTime } from '../lib/format';

const SNIPPETS = ['Flop ', 'Turn ', 'River ', 'check check. ', 'I fold.', 'he folds.', 'I win.', 'chop.'];

const PLACEHOLDER =
  '1/2 NL, 300 eff. BTN AhKs. UTG opens 15, I 3bet 45, he calls. Flop Jh7d2c, he checks, I cbet 40, he calls. Turn 5s, check check. River Qd, he bets 90, I fold.';

export function LogScreen() {
  const store = useStore();
  const [text, setText] = useState('');
  const [sessionChoice, setSessionChoice] = useState<string>('active');
  const [savedAt, setSavedAt] = useState<number | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const trimmed = text.trim();
  const parsed = useMemo(() => (trimmed.length > 0 ? parseHand(text) : undefined), [text, trimmed]);
  const errors = parsed?.issues.filter((i) => i.severity === 'error') ?? [];
  const warnings = parsed?.issues.filter((i) => i.severity === 'warning') ?? [];

  const insert = (snippet: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart ?? text.length;
    const end = el.selectionEnd ?? text.length;
    const before = text.slice(0, start);
    const needsSpace = before.length > 0 && !/[\s]$/.test(before) && !snippet.startsWith(' ');
    const inserted = (needsSpace ? ' ' : '') + snippet;
    const next = before + inserted + text.slice(end);
    setText(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + inserted.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const save = async () => {
    if (!parsed || !parsed.ok || saving) return;
    setSaving(true);
    try {
      const sessionId =
        sessionChoice === 'active'
          ? store.activeSession?.id
          : sessionChoice === 'none'
            ? undefined
            : sessionChoice;
      await store.addHand(parsed, sessionId);
      setText('');
      setSavedAt(Date.now());
      window.setTimeout(() => setSavedAt(undefined), 2600);
      textareaRef.current?.focus();
    } finally {
      setSaving(false);
    }
  };

  return (
    <section aria-labelledby="log-title">
      <h2 id="log-title" className="screen-title">
        Log a hand
      </h2>

      <div className="two-col">
        <div>
          <label className="field" htmlFor="hand-input">
            <span>Shorthand</span>
          </label>
          <textarea
            id="hand-input"
            ref={textareaRef}
            className="shorthand"
            value={text}
            placeholder={PLACEHOLDER}
            onChange={(e) => {
              setText(e.target.value);
              setSavedAt(undefined);
            }}
            rows={5}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="done"
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault();
                void save();
              }
            }}
          />
          <div className="chip-row" role="toolbar" aria-label="Quick snippets">
            {SNIPPETS.map((s) => (
              <button key={s} type="button" className="chip" onClick={() => insert(s)}>
                {s.trim()}
              </button>
            ))}
          </div>

          <label className="field" htmlFor="hand-session">
            <span>Attach to session</span>
            <select
              id="hand-session"
              value={sessionChoice}
              onChange={(e) => setSessionChoice(e.target.value)}
            >
              <option value="active">
                {store.activeSession
                  ? `Live session — ${store.activeSession.stakes} at ${store.activeSession.location}`
                  : 'Live session (none running)'}
              </option>
              <option value="none">No session</option>
              {store.sessions
                .filter((s) => s.endedAt !== undefined)
                .slice(0, 12)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {formatDateTime(s.startedAt)} — {s.stakes} at {s.location}
                  </option>
                ))}
            </select>
          </label>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              type="button"
              className="btn primary"
              disabled={!parsed || !parsed.ok || saving}
              onClick={() => void save()}
            >
              {saving ? 'Saving…' : 'Save hand'}
            </button>
            {parsed && !parsed.ok && (
              <span className="note" role="status">
                Fix the highlighted part{errors.length > 1 ? 's' : ''} to save.
              </span>
            )}
            {savedAt !== undefined && (
              <span className="win-text" role="status">
                Hand saved.
              </span>
            )}
          </div>
        </div>

        <div>
          {!parsed && (
            <div className="empty">
              <p>The preview of your parsed hand appears here.</p>
              <p className="hint">
                Write hands the way you'd tell a friend. Stakes, seat, cards, then the action street by
                street:
              </p>
              <code>{PLACEHOLDER}</code>
            </div>
          )}

          {parsed && (
            <div className="panel" aria-live="polite">
              <h3>Parsed preview {parsed.ok ? '— confirm before saving' : ''}</h3>
              {(errors.length > 0 || warnings.length > 0) && (
                <>
                  <MarkedInput text={text} issues={parsed.issues} />
                  <IssueList issues={parsed.issues} raw={text} />
                  <div style={{ height: 10 }} />
                </>
              )}
              <HandPreview hand={parsed} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
