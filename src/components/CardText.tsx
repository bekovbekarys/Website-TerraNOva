/**
 * Renders card notation ("Ah", "AhKs", boards) as typographic suit
 * glyphs with correct red/black coloring.
 */

import type { Card, HoleCards } from '../lib/parser';
import { rankToChar, SUIT_GLYPHS } from '../lib/parser';

export function CardGlyph({ card }: { card: Card }) {
  return (
    <span className={`suit-${card.suit}`}>
      {rankToChar(card.rank)}
      {SUIT_GLYPHS[card.suit]}
    </span>
  );
}

export function CardRun({ cards, gap = true }: { cards: Card[]; gap?: boolean }) {
  return (
    <span className="card">
      {cards.map((c, i) => (
        <span key={i}>
          {i > 0 && gap ? ' ' : ''}
          <CardGlyph card={c} />
        </span>
      ))}
    </span>
  );
}

export function HoleCardsText({ cards }: { cards: HoleCards }) {
  if (cards.kind === 'exact') return <CardRun cards={cards.cards} />;
  const [hi, lo] = cards.ranks;
  const suffix = hi === lo ? '' : cards.suited === 'suited' ? 's' : cards.suited === 'offsuit' ? 'o' : '';
  return (
    <span className="card">
      {rankToChar(hi)}
      {rankToChar(lo)}
      {suffix}
    </span>
  );
}
