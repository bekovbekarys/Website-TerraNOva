# The Felt Notes shorthand grammar

The parser is deterministic and fully offline (`src/lib/parser/`). It reads
casual poker shorthand, phrase by phrase, and produces a structured hand with
computed pots. Anything it can't read is reported with the exact character
span, so you fix just that fragment.

A hand is a sequence of phrases separated by commas, periods, or newlines.
Order: header info → preflop action → streets (each street's cards, then its
action) → result.

## Header

| You write | Meaning |
| --- | --- |
| `1/2`, `$1/$3`, `1/2/5` | blinds (third number = straddle). `NL`, `NLHE`, `PLO` set the game. |
| `300 eff`, `2k eff`, `150bb effective` | effective stack |
| `BTN AhKs`, `CO AKo`, `SB QQ`, `BB Ah Ks` | your seat and hole cards |

Seats: `UTG`, `UTG+1`, `UTG+2`, `LJ`, `MP`, `HJ`, `CO`, `BTN` (or `button`),
`SB`, `BB`, plus `straddle` as a seat name.

Hole cards can be exact (`AhKs`, `10h9h`) or abstract when you don't remember
suits: `AKs` (suited), `AKo` (offsuit), `AK` (either), `QQ`.

## Actions

`<who> <verb> [amount]`, comma-separated:

- **Who:** `I`/`me`/`hero`, a seat (`UTG bets 30`), or `he`/`she`/`they`/`villain`.
  A pronoun binds to the only villain in the hand; in multiway pots it binds
  to the last aggressor and the parser warns you it guessed.
- **Verbs:** `opens`, `raises to`, `makes it`, `3bets`/`4bets`, `bets`,
  `cbets`, `leads`, `donks`, `barrels`, `calls`, `flats`, `checks` (`x`),
  `folds`, `limps`, `jams`, `shoves`, `is all in`, `straddles to 5`, `posts`.
- **Amounts:** `15`, `$15`, `12.5`, `2k`, or `15bb`. One `bb` amount switches
  the whole hand to big-blind units. `bets pot` uses the current pot size.
  Raise amounts are always "to" totals (`I 3bet 45` = raise **to** 45).
- **Shortcuts:** `check check` / `x/x` / `checks through` (everyone checks),
  `folds to me` (skip the folds), `everyone folds` / `both fold`,
  `blinds fold`.

## Streets

`Flop Jh7d2c`, `Turn 5s`, `River Qd` — or a full runout at once:
`Board Ts9c4c2s2h`. Wrong card counts (a two-card flop, a three-card turn)
are rejected, as is any card appearing twice anywhere in the hand.

## Results

`I win`, `he takes it`, `UTG wins`, `we chop`, `he shows AhKs and wins`,
`he mucks, I win`, `I win 180` (states the pot). If nobody's win is recorded
and more than one player is left, the hand is saved with a warning and is
excluded from profit stats rather than guessed at.

## Pot math

- Posted blinds of seats that never act are counted as dead money (needs
  stakes in the header).
- Raise sizes are "to" amounts; calls match the current bet.
- The uncalled portion of a final bet is refunded before the pot is awarded —
  if you bet 90 and everyone folds, you don't "win" your own 90.
- Your net for the hand = your share of the pot minus everything you put in.

## The canonical example

```
1/2 NL, 300 eff. BTN AhKs. UTG opens 15, I 3bet 45, he calls.
Flop Jh7d2c, he checks, I cbet 40, he calls.
Turn 5s, check check. River Qd, he bets 90, I fold.
```

parses to: stakes 1/2, hero BTN with A♥K♠, 300 effective; preflop pot 93
(45 + 45 + 3 dead); flop pot 173; river bet of 90 refunded to UTG after your
fold; UTG wins 173; your net −85.

## Errors vs. warnings

**Errors** (block saving, highlighted at the exact span): unreadable
fragments, impossible cards (`AhAh`, a 5-ace board), out-of-order actions
(checking when facing a bet, acting after folding, raising below the bet),
malformed streets.

**Warnings** (saved anyway, shown in the preview): missing stakes, missing
bet sizes (pot becomes approximate), ambiguous pronouns, all-in with unknown
size, no recorded result.
