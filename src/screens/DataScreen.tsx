/**
 * Your data, your file. Export everything to JSON, import with full
 * validation, or wipe the device. No servers, no accounts.
 */

import { useRef, useState } from 'react';
import { useStore } from '../store';
import { buildExport, parseExportFile, type ExportFile } from '../lib/export';
import { formatDateTime } from '../lib/format';

interface PendingImport {
  data: ExportFile;
  fileName: string;
}

export function DataScreen() {
  const store = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [pending, setPending] = useState<PendingImport | undefined>(undefined);
  const [wipeArmed, setWipeArmed] = useState(false);
  const [message, setMessage] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  const exportData = () => {
    const file = buildExport(store.sessions, store.hands);
    const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `felt-notes-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setMessage('Export downloaded.');
  };

  const onFile = async (file: File) => {
    setImportErrors([]);
    setPending(undefined);
    setMessage(undefined);
    const text = await file.text();
    const result = parseExportFile(text);
    if (!result.ok || !result.data) {
      setImportErrors(result.errors);
      return;
    }
    setPending({ data: result.data, fileName: file.name });
  };

  const applyImport = async (mode: 'merge' | 'replace') => {
    if (!pending || busy) return;
    setBusy(true);
    try {
      await store.importData(pending.data, mode);
      setMessage(
        `Imported ${pending.data.sessions.length} sessions and ${pending.data.hands.length} hands (${mode}).`,
      );
      setPending(undefined);
      if (fileRef.current) fileRef.current.value = '';
    } finally {
      setBusy(false);
    }
  };

  const wipe = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await store.wipe();
      setWipeArmed(false);
      setMessage('All local data wiped.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="data-title">
      <h2 id="data-title" className="screen-title">
        Data
      </h2>

      <div className="panel">
        <h3>On this device</h3>
        <p>
          <span className="num">{store.sessions.length}</span> sessions ·{' '}
          <span className="num">{store.hands.length}</span> hands. Everything lives in this
          browser's storage — nothing ever leaves your device unless you export it.
        </p>
        <button type="button" className="btn primary" onClick={exportData}>
          Export JSON
        </button>
      </div>

      <div className="panel">
        <h3>Import</h3>
        <p className="note">
          Restores a Felt Notes export. The file is fully validated first; a corrupted file changes
          nothing.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          aria-label="Choose a Felt Notes export file"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onFile(f);
          }}
        />
        {importErrors.length > 0 && (
          <div role="alert" style={{ marginTop: 8 }}>
            <p className="loss-text" style={{ marginBottom: 4 }}>
              This file can't be imported:
            </p>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {importErrors.slice(0, 8).map((e, i) => (
                <li key={i} className="note loss-text">
                  {e}
                </li>
              ))}
              {importErrors.length > 8 && (
                <li className="note">…and {importErrors.length - 8} more problems.</li>
              )}
            </ul>
          </div>
        )}
        {pending && (
          <div style={{ marginTop: 10 }}>
            <p>
              <strong>{pending.fileName}</strong> checks out:{' '}
              <span className="num">{pending.data.sessions.length}</span> sessions,{' '}
              <span className="num">{pending.data.hands.length}</span> hands, exported{' '}
              {formatDateTime(pending.data.exportedAt)}.
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" className="btn primary" disabled={busy} onClick={() => void applyImport('merge')}>
                Merge into current data
              </button>
              <button type="button" className="btn danger" disabled={busy} onClick={() => void applyImport('replace')}>
                Replace current data
              </button>
              <button type="button" className="btn" disabled={busy} onClick={() => setPending(undefined)}>
                Cancel
              </button>
            </div>
            <p className="note" style={{ marginTop: 6 }}>
              Merge keeps existing records and overwrites any with matching ids. Replace wipes first.
            </p>
          </div>
        )}
      </div>

      <div className="panel">
        <h3>Wipe</h3>
        <p className="note">
          Removes every session and hand from this device. Export first — there is no undo.
        </p>
        {wipeArmed ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn danger" disabled={busy} onClick={() => void wipe()}>
              Yes, wipe everything
            </button>
            <button type="button" className="btn" onClick={() => setWipeArmed(false)}>
              Cancel
            </button>
          </div>
        ) : (
          <button type="button" className="btn danger" onClick={() => setWipeArmed(true)}>
            Wipe all data…
          </button>
        )}
      </div>

      <div className="panel">
        <h3>About</h3>
        <p className="note">
          Felt Notes is a fully offline tool for live poker players: shorthand hand logging, session
          tracking, and honest leak analysis. No account, no analytics, no network calls. Install it
          from your browser menu ("Add to Home Screen") and it works without signal in the card room.
        </p>
      </div>

      {message && (
        <div className="toast" role="status">
          {message}
        </div>
      )}
    </section>
  );
}
