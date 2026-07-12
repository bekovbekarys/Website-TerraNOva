/**
 * JSON export/import so users own their data. Import validates the file
 * thoroughly and reports specific problems instead of silently corrupting
 * the database.
 */

import type { HandRecord, Session } from './db';

export interface ExportFile {
  app: 'felt-notes';
  version: 1;
  exportedAt: number;
  sessions: Session[];
  hands: HandRecord[];
}

export function buildExport(sessions: Session[], hands: HandRecord[]): ExportFile {
  return {
    app: 'felt-notes',
    version: 1,
    exportedAt: Date.now(),
    sessions,
    hands,
  };
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  data?: ExportFile;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

export function validateExportData(input: unknown): ValidationResult {
  const errors: string[] = [];
  if (!isRecord(input)) {
    return { ok: false, errors: ['File is not a JSON object.'] };
  }
  if (input.app !== 'felt-notes') {
    errors.push('This is not a Felt Notes export (missing "app": "felt-notes").');
  }
  if (input.version !== 1) {
    errors.push(`Unsupported export version: ${String(input.version)} (expected 1).`);
  }
  if (!Array.isArray(input.sessions)) {
    errors.push('"sessions" is missing or not an array.');
  }
  if (!Array.isArray(input.hands)) {
    errors.push('"hands" is missing or not an array.');
  }
  if (errors.length > 0) return { ok: false, errors };

  const sessions = input.sessions as unknown[];
  const hands = input.hands as unknown[];
  const sessionIds = new Set<string>();

  sessions.forEach((s, i) => {
    if (!isRecord(s)) {
      errors.push(`Session #${i + 1} is not an object.`);
      return;
    }
    if (typeof s.id !== 'string' || s.id.length === 0) errors.push(`Session #${i + 1} has no id.`);
    else if (sessionIds.has(s.id)) errors.push(`Duplicate session id: ${s.id}.`);
    else sessionIds.add(s.id);
    if (!isFiniteNumber(s.startedAt)) errors.push(`Session #${i + 1} has an invalid start time.`);
    if (!isFiniteNumber(s.buyIn) || (s.buyIn as number) < 0) {
      errors.push(`Session #${i + 1} has an invalid buy-in (must be a non-negative number).`);
    }
    if (s.cashOut !== undefined && (!isFiniteNumber(s.cashOut) || (s.cashOut as number) < 0)) {
      errors.push(`Session #${i + 1} has an invalid cash-out.`);
    }
    if (s.endedAt !== undefined && !isFiniteNumber(s.endedAt)) {
      errors.push(`Session #${i + 1} has an invalid end time.`);
    }
    if (
      s.endedAt !== undefined &&
      isFiniteNumber(s.endedAt) &&
      isFiniteNumber(s.startedAt) &&
      (s.endedAt as number) < (s.startedAt as number)
    ) {
      errors.push(`Session #${i + 1} ends before it starts.`);
    }
    if (typeof s.stakes !== 'string') errors.push(`Session #${i + 1} has invalid stakes.`);
    if (typeof s.location !== 'string') errors.push(`Session #${i + 1} has an invalid location.`);
  });

  const handIds = new Set<string>();
  hands.forEach((h, i) => {
    if (!isRecord(h)) {
      errors.push(`Hand #${i + 1} is not an object.`);
      return;
    }
    if (typeof h.id !== 'string' || h.id.length === 0) errors.push(`Hand #${i + 1} has no id.`);
    else if (handIds.has(h.id)) errors.push(`Duplicate hand id: ${h.id}.`);
    else handIds.add(h.id);
    if (!isFiniteNumber(h.loggedAt)) errors.push(`Hand #${i + 1} has an invalid log time.`);
    if (h.sessionId !== undefined) {
      if (typeof h.sessionId !== 'string') errors.push(`Hand #${i + 1} has an invalid session link.`);
      else if (!sessionIds.has(h.sessionId)) {
        errors.push(`Hand #${i + 1} points at a session that isn't in this file (${h.sessionId}).`);
      }
    }
    if (!isRecord(h.parsed)) {
      errors.push(`Hand #${i + 1} has no parsed hand data.`);
      return;
    }
    const parsed = h.parsed;
    if (typeof parsed.raw !== 'string') errors.push(`Hand #${i + 1} is missing its original text.`);
    if (!Array.isArray(parsed.streets)) errors.push(`Hand #${i + 1} has no streets array.`);
    if (!Array.isArray(parsed.players)) errors.push(`Hand #${i + 1} has no players array.`);
  });

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, errors: [], data: input as unknown as ExportFile };
}

/** Parse a raw file string; catches malformed JSON with a friendly message. */
export function parseExportFile(text: string): ValidationResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, errors: ['The file is not valid JSON — it may be truncated or corrupted.'] };
  }
  return validateExportData(data);
}
