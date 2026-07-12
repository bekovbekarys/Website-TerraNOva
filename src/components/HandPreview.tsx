/**
 * Structured preview of a parsed hand: what the parser understood,
 * street by street, plus exact-span highlighting of anything it did not.
 */

import type { ParsedHand, HandAction, ParseIssue } from '../lib/parser';
import { CardRun, HoleCardsText } from './CardText';
import { formatMoney } from '../lib/format';

function actionText(a: HandAction, unit: 'chips' | 'bb'): string {
  const amt = a.to !== undefined ? ` ${formatMoney(a.to, { unit })}` : '';
  const allIn = a.allIn ? ' (all in)' : '';
  const who = a.actor === 'HERO' ? 'You' : a.actor;
  switch (a.type) {
    case 'raise':
      return `${who} raise${who === 'You' ? '' : 's'} to${amt}${allIn}`;
    case 'bet':
      return `${who} bet${who === 'You' ? '' : 's'}${amt}${allIn}`;
    case 'call':
      return `${who} call${who === 'You' ? '' : 's'}${amt ? ` to${amt}` : ''}${allIn}`;
    case 'check':
      return `${who} check${who === 'You' ? '' : 's'}`;
    case 'fold':
      return `${who} fold${who === 'You' ? '' : 's'}`;
    case 'limp':
      return `${who} limp${who === 'You' ? '' : 's'}${amt ? ` for${amt}` : ''}`;
    case 'straddle':
      return `${who} straddle${who === 'You' ? '' : 's'}${amt ? ` to${amt}` : ''}`;
    case 'post':
      return `${who} post${who === 'You' ? '' : 's'}${amt}`;
  }
}

/** Raw input with error/warning spans highlighted in place. */
export function MarkedInput({ text, issues }: { text: string; issues: ParseIssue[] }) {
  const spans = [...issues]
    .filter((i) => i.end > i.start)
    .sort((a, b) => a.start - b.start || b.end - a.end);
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  for (const issue of spans) {
    if (issue.start < cursor) continue; // overlapping; first wins
    if (issue.start > cursor) parts.push(text.slice(cursor, issue.start));
    parts.push(
      <mark
        key={`${issue.start}-${issue.end}`}
        className={issue.severity === 'error' ? 'err' : 'warn'}
        title={issue.message}
      >
        {text.slice(issue.start, issue.end)}
      </mark>,
    );
    cursor = issue.end;
  }
  if (cursor < text.length) parts.push(text.slice(cursor));
  return <div className="marked-input">{parts}</div>;
}

export function IssueList({ issues, raw }: { issues: ParseIssue[]; raw: string }) {
  if (issues.length === 0) return null;
  return (
    <div role={issues.some((i) => i.severity === 'error') ? 'alert' : 'status'}>
      {issues.map((issue, i) => (
        <div key={i} className={`issue ${issue.severity}`}>
          <span aria-hidden="true" className={issue.severity === 'error' ? 'loss-text' : 'faint'}>
            {issue.severity === 'error' ? '✗' : '△'}
          </span>
          <span>
            {issue.severity === 'error' && issue.end > issue.start && (
              <>
                <span className="frag">“{raw.slice(issue.start, issue.end).trim().slice(0, 48)}”</span>{' '}
              </>
            )}
            {issue.message}
          </span>
        </div>
      ))}
    </div>
  );
}

export function HandPreview({ hand }: { hand: ParsedHand }) {
  const unit = hand.unit;
  const headerBits: React.ReactNode[] = [];
  if (hand.stakes) {
    headerBits.push(
      <span key="stakes" className="num">
        {hand.stakes.sb}/{hand.stakes.bb}
        {hand.stakes.straddle !== undefined ? `/${hand.stakes.straddle}` : ''}
      </span>,
    );
  }
  headerBits.push(<span key="game">{hand.game}</span>);
  if (hand.heroPosition) headerBits.push(<strong key="pos">{hand.heroPosition}</strong>);
  if (hand.heroCards) headerBits.push(<HoleCardsText key="cards" cards={hand.heroCards} />);
  if (hand.effectiveStack !== undefined) {
    headerBits.push(
      <span key="eff" className="dim num">
        {formatMoney(hand.effectiveStack, { unit })} eff
      </span>,
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'baseline', marginBottom: 8 }}>
        {headerBits}
      </div>

      {hand.streets.map((s) => (
        <div key={s.street} className="street-block">
          <div className="head">
            <span className="rule-label">{s.street}</span>
            {s.board.length > 0 && <CardRun cards={s.board} />}
            <span className="num dim" style={{ marginLeft: 'auto' }}>
              pot {formatMoney(s.potAfter, { unit })}
            </span>
          </div>
          {s.actions.length > 0 && (
            <ul className="actions">
              {s.actions.map((a, i) => (
                <li key={i}>{actionText(a, unit)}</li>
              ))}
            </ul>
          )}
        </div>
      ))}

      {hand.result ? (
        <div style={{ borderTop: '1px solid var(--line)', paddingTop: 6, marginTop: 6 }}>
          <span className="rule-label">result </span>
          <span>
            {hand.result.winners.includes('HERO')
              ? hand.result.winners.length > 1
                ? 'Chopped — you split'
                : 'You win'
              : `${hand.result.winners.join(' + ')} wins`}{' '}
            <span className="num">{formatMoney(hand.result.pot, { unit })}</span>
            {hand.result.showdown ? ' at showdown' : ' without showdown'}
            {' · '}
          </span>
          {hand.result.heroNet !== undefined && (
            <strong className={`num ${hand.result.heroNet >= 0 ? 'win-text' : 'loss-text'}`}>
              you {hand.result.heroNet >= 0 ? 'net' : 'lose'} {formatMoney(Math.abs(hand.result.heroNet), { unit })}
            </strong>
          )}
        </div>
      ) : (
        <div className="note" style={{ marginTop: 6 }}>
          No result recorded — this hand won’t count toward profit stats.
        </div>
      )}
    </div>
  );
}
