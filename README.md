# Felt Notes

A live poker session tracker and leak analyzer, built for people who play
physical cards. Online players get hand histories for free; live players get
nothing. Felt Notes closes that gap with three things:

1. **Shorthand hand logging.** Type hands the way you'd tell a friend —
   `1/2 NL, 300 eff. BTN AhKs. UTG opens 15, I 3bet 45, he calls. Flop Jh7d2c…`
   — and a deterministic parser (no LLM, no network) turns it into a fully
   structured hand: stakes, positions, streets, bet sizes, pot per street,
   result. You confirm a structured preview before anything is saved, and if
   a fragment can't be read, exactly that fragment is highlighted for fixing.
2. **Session tracking.** Buy-ins, cash-outs, hours, the profit line drawn as
   an ink ledger, results by stake / room / weekday, and session length vs.
   hourly rate to surface fatigue.
3. **Leak reports.** VPIP, PFR, 3-bet%, c-bet%, fold-to-3-bet, aggression by
   street, showdown vs. non-showdown winnings, positional results, and
   rule-based leak flags in plain language — each gated behind a minimum
   sample size so it never dresses noise up as insight. Plus a Monte Carlo
   equity calculator (in a Web Worker) for any logged hand vs. a hand or range.

Everything lives in your browser's IndexedDB. No accounts, no analytics, no
API keys, no network calls after first load — it's a PWA that works offline
in a concrete card room. Your data exports to a single JSON file you own.

## Run it

```bash
npm install
npm run dev        # dev server
npm test           # 99 Vitest tests (parser, equity engine, stats, import validation)
npm run build      # type-check + production build into dist/
npm run preview    # serve the production build locally
```

Optional end-to-end walkthrough of the release checklist (needs the preview
server running on :4173):

```bash
npm run preview &
node scripts/walkthrough.mjs
```

## Deploy to Netlify

The build is a fully static site:

1. `npm run build`
2. Drag the `dist/` folder onto https://app.netlify.com/drop

That's it — no environment variables, no functions, no redirects (routing is
hash-based). Any static host works the same way.

## Project layout

```
src/lib/parser/    shorthand parser — pure, standalone, exhaustively tested
src/lib/equity/    7-card evaluator, range parser, Monte Carlo + Web Worker
src/lib/stats/     hand aggregates, session stats, rule-based leak flags
src/lib/db.ts      minimal promise wrapper over IndexedDB
src/lib/export.ts  JSON export/import with full validation
src/screens/       Ledger, Log, Hands, Leaks, Equity, Data
src/styles/        design tokens + base styles (all colors in tokens.css)
public/            manifest, service worker, icons, self-hosted fonts
scripts/           E2E walkthrough (playwright-core against the built app)
```

- `PARSER.md` — the shorthand grammar, with examples.
- `DECISIONS.md` — every judgment call made while building, and why.

## Honesty notes

- Stats are computed only from what you log. Live players log memorable hands,
  not every hand, and the UI says so where it matters.
- Hands whose results can't be valued in real money (bb-denominated with
  unknown stakes, or no recorded winner) are excluded from money stats and
  counted as excluded rather than guessed at.
- Leak flags stay silent below their minimum sample sizes.
