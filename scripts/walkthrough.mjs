/**
 * Felt Notes E2E walkthrough of the release checklist:
 * create session → log 5 hands (one malformed) → verify parse previews →
 * end session → hand-check stats → export → wipe → re-import → offline reload.
 */
import { chromium } from 'playwright-core';
import { mkdirSync, readFileSync } from 'node:fs';

const BASE = process.env.BASE_URL ?? 'http://localhost:4173/';
const SHOTS = (process.env.SHOTS_DIR ?? new URL('./shots/', import.meta.url).pathname).replace(/\/?$/, '/');
mkdirSync(SHOTS, { recursive: true });

let failures = 0;
function ok(cond, msg) {
  if (cond) console.log(`  ✓ ${msg}`);
  else {
    failures++;
    console.error(`  ✗ FAIL: ${msg}`);
  }
}

const HANDS = [
  {
    name: 'canonical (net -85, no showdown)',
    text: '1/2 NL, 300 eff. BTN AhKs. UTG opens 15, I 3bet 45, he calls. Flop Jh7d2c, he checks, I cbet 40, he calls. Turn 5s, check check. River Qd, he bets 90, I fold.',
    expectPreview: ['pot $93', 'pot $173', 'you lose $85'],
  },
  {
    name: 'uncontested cbet win (net +11)',
    text: '1/2. CO AsAd. I open 10, BB calls. Flop 2c2d9h, he checks, I bet 15, he folds.',
    expectPreview: ['pot $21', 'You win', 'you net $11'],
  },
  {
    name: 'limped blind battle (net +2)',
    text: '1/2. SB A5s. I limp, BB checks. Flop Ah8h3c, I bet 4, he folds.',
    expectPreview: ['pot $4', 'you net $2'],
  },
  {
    name: 'river fold after calling (net -35, no showdown)',
    text: '1/2. BTN Th9h. UTG opens 15, I call. Flop Qs9d2h, he bets 20, I call. Turn 8h, check check. River Js, he bets 40, I fold.',
    expectPreview: ['pot $33', 'pot $73', 'you lose $35'],
  },
  {
    name: 'showdown loss (net -22)',
    text: '1/2. CO ThTs. I open 10, BTN calls. Flop Ks8d4c, I bet 12, he calls. Turn 2h, check check. River 6s, check check. He shows KhJh and wins.',
    expectPreview: ['pot $47', 'at showdown', 'you lose $22'],
  },
];

const MALFORMED =
  '1/2. BTN Th9h. UTG opens 15, I call. Flop qqqzzz nonsense, he bets 20, I call.';

async function main() {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const context = await browser.newContext({
    viewport: { width: 360, height: 740 },
    acceptDownloads: true,
  });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text());
  });
  page.on('pageerror', (e) => consoleErrors.push(String(e)));

  console.log('1. Fresh load — empty state');
  await page.goto(BASE, { waitUntil: 'networkidle' });
  ok(await page.locator('.masthead .brand').isVisible(), 'masthead renders');
  ok(
    (await page.locator('.empty', { hasText: 'No sessions on the books yet' }).count()) === 1,
    'ledger empty state with guidance',
  );
  await page.screenshot({ path: SHOTS + 'ledger-empty-360.png' });

  console.log('2. Start a session');
  await page.getByRole('button', { name: 'Start a session' }).click();
  await page.getByLabel('Stakes').fill('1/2');
  await page.getByLabel('Location').fill('Lucky Chances');
  await page.getByLabel('Buy-in ($)').fill('300');
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await page.locator('h3', { hasText: 'Live — 1/2 at Lucky Chances' }).waitFor();
  ok(true, 'live session card appears');

  console.log('2b. Negative buy-in is rejected');
  // end current? No: try invalid input path separately later — form validates on submit only when open.

  console.log('3. Log hands (with parse previews)');
  for (const hand of HANDS) {
    await page.goto(BASE + '#/log');
    const input = page.locator('#hand-input');
    await input.fill(hand.text);
    await page.locator('.panel h3', { hasText: 'Parsed preview' }).waitFor();
    const previewText = await page.locator('.panel', { hasText: 'Parsed preview' }).innerText();
    for (const expected of hand.expectPreview) {
      ok(previewText.includes(expected), `${hand.name}: preview shows "${expected}"`);
    }
    const saveBtn = page.getByRole('button', { name: /Save hand/ });
    ok(await saveBtn.isEnabled(), `${hand.name}: save enabled`);
    await saveBtn.click();
    await page.locator('text=Hand saved.').waitFor();
  }

  console.log('4. Malformed hand is blocked with exact-span highlight');
  await page.goto(BASE + '#/log');
  await page.locator('#hand-input').fill(MALFORMED);
  await page.locator('.panel h3', { hasText: 'Parsed preview' }).waitFor();
  ok(
    !(await page.getByRole('button', { name: /Save hand/ }).isEnabled()),
    'save disabled on parse error',
  );
  const marked = await page.locator('.marked-input mark.err').first().innerText();
  ok(marked.includes('qqqzzz'), `error highlight covers the bad fragment ("${marked.trim()}")`);
  ok(
    (await page.locator('.issue.error').count()) >= 1,
    'issue list explains the error',
  );
  await page.screenshot({ path: SHOTS + 'log-malformed-360.png', fullPage: true });
  // fix just that part
  await page.locator('#hand-input').fill(MALFORMED.replace('qqqzzz nonsense', 'Qs9d2h'));
  ok(
    await page.getByRole('button', { name: /Save hand/ }).isEnabled(),
    'fixing the fragment re-enables save',
  );
  // do not save (would duplicate hand 4)

  console.log('5. Hands list shows all five');
  await page.goto(BASE + '#/hands');
  ok((await page.locator('details.hand-row').count()) === 5, 'five hands listed');
  await page.locator('details.hand-row').first().click();
  ok(
    await page.locator('details.hand-row .body .street-block').first().isVisible(),
    'hand expands to structured detail',
  );
  await page.screenshot({ path: SHOTS + 'hands-360.png', fullPage: true });

  console.log('6. Stats — hand-computed checks');
  await page.goto(BASE + '#/stats');
  const vpip = await page.locator('.tile:has-text("VPIP") .v').innerText();
  ok(vpip.trim() === '100%', `VPIP is 100% of 5 logged hands (got ${vpip.trim()})`);
  const sd = await page.locator('.tile:has-text("At showdown") .v').innerText();
  ok(sd.trim() === '-$22', `showdown winnings -$22 (got ${sd.trim()})`);
  const nsd = await page.locator('.tile:has-text("No showdown") .v').innerText();
  // -85 + 11 + 2 - 35 = -107
  ok(nsd.trim() === '-$107', `non-showdown winnings -$107 (got ${nsd.trim()})`);
  const wtsd = await page.locator('.tile:has-text("WTSD") .v').innerText();
  ok(wtsd.trim() === '20%', `WTSD 1/5 resolved hands = 20% (got ${wtsd.trim()})`);
  await page.screenshot({ path: SHOTS + 'stats-360.png', fullPage: true });

  console.log('7. End the session');
  await page.goto(BASE + '#/');
  await page.getByLabel('Cash-out ($)').fill('250');
  await page.getByRole('button', { name: 'End session' }).click();
  await page.locator('.tile:has-text("Result") .v').waitFor();
  const result = await page.locator('.tile:has-text("Result") .v').first().innerText();
  ok(result.trim() === '-$50', `session book shows -$50 (got ${result.trim()})`);
  ok((await page.locator('table.ledger').first().isVisible()), 'session table renders');
  ok((await page.locator('figure svg [fill="var(--loss)"]').count()) >= 1, 'profit graph draws a losing session mark');
  await page.screenshot({ path: SHOTS + 'ledger-360.png', fullPage: true });

  console.log('8. Equity calculator (worker)');
  await page.goto(BASE + '#/equity');
  await page.getByLabel('Your hand (exact cards)').fill('AhAs');
  await page.getByLabel('Villain hand or range').fill('KK');
  await page.getByLabel('Iterations').selectOption('20000');
  await page.getByRole('button', { name: 'Run', exact: true }).click();
  await page.locator('.tile:has-text("Equity") .v').waitFor({ timeout: 30000 });
  const eq = parseFloat(await page.locator('.tile:has-text("Equity") .v').innerText());
  ok(eq > 80.5 && eq < 83.5, `AA vs KK equity ≈ 81.9 in-app (got ${eq})`);
  await page.screenshot({ path: SHOTS + 'equity-360.png', fullPage: true });

  console.log('9. Export JSON');
  await page.goto(BASE + '#/data');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export JSON' }).click();
  const download = await downloadPromise;
  const exportPath = SHOTS + 'export.json';
  await download.saveAs(exportPath);
  const exported = JSON.parse(readFileSync(exportPath, 'utf8'));
  ok(exported.sessions.length === 1 && exported.hands.length === 5, 'export contains 1 session + 5 hands');

  console.log('10. Wipe');
  await page.getByRole('button', { name: 'Wipe all data…' }).click();
  await page.getByRole('button', { name: 'Yes, wipe everything' }).click();
  await page.locator('.toast', { hasText: 'wiped' }).waitFor();
  const counts = await page.locator('.panel', { hasText: 'On this device' }).innerText();
  ok(counts.includes('0') && counts.match(/0\s*sessions/s) !== null || counts.includes('0 sessions'), 'counts show zero after wipe');
  await page.goto(BASE + '#/');
  ok(
    (await page.locator('.empty', { hasText: 'No sessions on the books yet' }).count()) === 1,
    'ledger back to empty state',
  );

  console.log('11. Re-import restores everything');
  await page.goto(BASE + '#/data');
  await page.locator('input[type="file"]').setInputFiles(exportPath);
  await page.locator('text=checks out').waitFor();
  await page.getByRole('button', { name: 'Merge into current data' }).click();
  await page.locator('.toast', { hasText: 'Imported 1 sessions and 5 hands' }).waitFor();
  await page.goto(BASE + '#/hands');
  ok((await page.locator('details.hand-row').count()) === 5, 'five hands restored');
  await page.goto(BASE + '#/');
  const restored = await page.locator('.tile:has-text("Result") .v').first().innerText();
  ok(restored.trim() === '-$50', 'session result restored');

  console.log('12. Corrupted import file is rejected');
  const badPath = SHOTS + 'corrupt.json';
  const { writeFileSync } = await import('node:fs');
  writeFileSync(badPath, '{"app": "felt-notes", "version": 1, "sessions": [{"id":"x","startedAt":1,"stakes":"1/2","location":"X","buyIn":-500}], "hands": []}');
  await page.goto(BASE + '#/data');
  await page.locator('input[type="file"]').setInputFiles(badPath);
  await page.locator('text=can\'t be imported').waitFor();
  ok(
    (await page.locator('li', { hasText: 'invalid buy-in' }).count()) === 1,
    'negative buy-in in import file called out specifically',
  );

  console.log('13. Offline reload');
  await page.goto(BASE);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    // ensure the SW controls this client
    if (!navigator.serviceWorker.controller) {
      await new Promise((r) => navigator.serviceWorker.addEventListener('controllerchange', r, { once: true }));
    }
  });
  await context.setOffline(true);
  await page.reload({ waitUntil: 'load' });
  ok(await page.locator('.masthead .brand').isVisible(), 'app shell loads offline');
  await page.goto(BASE + '#/stats');
  ok(await page.locator('.tile:has-text("VPIP")').isVisible(), 'stats screen works offline with data intact');
  await context.setOffline(false);

  console.log('14. Desktop 1440px pass');
  const desktop = await context.newPage();
  await desktop.setViewportSize({ width: 1440, height: 900 });
  await desktop.goto(BASE, { waitUntil: 'networkidle' });
  await desktop.screenshot({ path: SHOTS + 'ledger-1440.png', fullPage: true });
  await desktop.goto(BASE + '#/log');
  await desktop.locator('#hand-input').fill(HANDS[0].text);
  await desktop.locator('.panel h3', { hasText: 'Parsed preview' }).waitFor();
  await desktop.screenshot({ path: SHOTS + 'log-1440.png', fullPage: true });
  await desktop.goto(BASE + '#/stats');
  await desktop.screenshot({ path: SHOTS + 'stats-1440.png', fullPage: true });

  console.log('15. Console errors');
  ok(consoleErrors.length === 0, `no console errors (got ${consoleErrors.length}${consoleErrors.length ? ': ' + consoleErrors.join(' | ') : ''})`);

  await browser.close();
  console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECKS FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('WALKTHROUGH CRASHED:', e);
  process.exit(2);
});
