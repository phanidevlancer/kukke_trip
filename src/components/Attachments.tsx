import { useCallback, useEffect, useRef, useState } from 'react';
import {
  deleteAttachment,
  listAttachments,
  uploadAttachment,
  type Attachment,
  type AttachmentTarget,
} from '../lib/api';
import { getPin, isUnlocked } from '../lib/pin';
import { PinModal } from './PinModal';
import { TrashIcon } from './icons';

interface Props {
  targetType: AttachmentTarget;
  targetId: string;
  label?: string;
}

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPT = 'image/*,application/pdf';

function fmtSize(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

function isImage(t: string): boolean {
  return t.startsWith('image/');
}

function openInNewTab(url: string) {
  const w = window.open(url, '_blank');
  if (w) {
    try {
      w.opener = null;
    } catch {
      /* ignore */
    }
  } else {
    window.location.href = url;
  }
}

export function Attachments({ targetType, targetId, label = 'Attachments' }: Props) {
  const [items, setItems] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const pendingFiles = useRef<File[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const rows = await listAttachments(targetType, targetId);
      setItems(rows);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, [targetType, targetId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  function pick() {
    inputRef.current?.click();
  }

  async function handleFiles(files: File[]) {
    if (files.length === 0) return;

    // Client-side gate; server re-validates.
    for (const f of files) {
      if (!f.type.startsWith('image/') && f.type !== 'application/pdf') {
        setErr(`${f.name}: unsupported type (${f.type || 'unknown'}). Only images and PDFs.`);
        return;
      }
      if (f.size > MAX_BYTES) {
        setErr(`${f.name}: too large (${fmtSize(f.size)}). Max ${fmtSize(MAX_BYTES)} per file.`);
        return;
      }
    }

    if (!isUnlocked() || !getPin()) {
      pendingFiles.current = files;
      setPinOpen(true);
      return;
    }
    await doUpload(files, getPin()!);
  }

  async function doUpload(files: File[], pin: string) {
    setUploading(true);
    setErr(null);
    try {
      for (const f of files) {
        const item = await uploadAttachment(pin, targetType, targetId, f);
        setItems((rows) => [item, ...rows]);
      }
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setUploading(false);
      pendingFiles.current = [];
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function onDelete(att: Attachment) {
    if (!isUnlocked() || !getPin()) {
      setPinOpen(true);
      return;
    }
    if (!confirm(`Delete ${att.filename}?`)) return;
    const prev = items;
    setItems((rows) => rows.filter((r) => r.id !== att.id));
    try {
      await deleteAttachment(getPin()!, att.id);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
      setItems(prev);
    }
  }

  function open(att: Attachment) {
    if (!att.url) {
      setErr('Could not generate a download link — try refreshing.');
      return;
    }
    // Refresh the URL list shortly so subsequent clicks have a fresh signature.
    openInNewTab(att.url);
  }

  return (
    <div className="atts">
      <div className="atts-head">
        <span className="atts-label">{label}</span>
        <span className="atts-count">{items.length}</span>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          style={{ display: 'none' }}
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            handleFiles(files);
          }}
        />
        <button className="atts-add" onClick={pick} disabled={uploading}>
          {uploading ? 'Uploading…' : '+ Attach'}
        </button>
      </div>

      {err && (
        <div className="atts-err">
          {err}
          <button onClick={() => setErr(null)} aria-label="Dismiss">×</button>
        </div>
      )}

      {loading ? (
        <div className="atts-empty">Loading…</div>
      ) : items.length === 0 ? (
        <div className="atts-empty">No files yet. Attach PhonePe screenshots, ticket PDFs, hotel invoices.</div>
      ) : (
        <ul className="atts-list">
          {items.map((a) => (
            <li key={a.id} className="att">
              <button className="att-open" onClick={() => open(a)} title={a.filename}>
                {isImage(a.content_type) && a.url ? (
                  <img src={a.url} alt={a.filename} loading="lazy" />
                ) : (
                  <span className="att-pdf">PDF</span>
                )}
                <span className="att-meta">
                  <span className="att-name">{a.filename}</span>
                  <span className="att-sub">
                    {fmtSize(a.size_bytes)} · {new Date(a.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                  </span>
                </span>
              </button>
              <button className="att-del" onClick={() => onDelete(a)} aria-label={`Delete ${a.filename}`}>
                <TrashIcon />
              </button>
            </li>
          ))}
        </ul>
      )}

      {pinOpen && (
        <PinModal
          onClose={() => {
            setPinOpen(false);
            pendingFiles.current = [];
          }}
          onUnlocked={() => {
            setPinOpen(false);
            const queued = pendingFiles.current;
            pendingFiles.current = [];
            if (queued.length) doUpload(queued, getPin()!);
          }}
        />
      )}
    </div>
  );
}

