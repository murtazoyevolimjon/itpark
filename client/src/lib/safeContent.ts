/**
 * Validation for content that other users later open: links and attached files.
 * A `javascript:` link or an HTML data URL placed in a stored record would run script in the app's origin
 * when somebody clicks it, so only plain http(s) links and a short list of document/image types pass.
 */

export const MAX_ATTACHMENT_CHARS = 3_000_000; // ~2.2 MB of file data once base64-encoded

const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'text/plain',
  'application/zip',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

/** Plain http(s) URL, normalised; anything else (javascript:, data:, relative text) becomes ''. */
export function safeHttpUrl(value: unknown, maxLength = 500): string {
  if (typeof value !== 'string') return '';
  const raw = value.trim();
  if (!raw || raw.length > maxLength) return '';
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(candidate);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : '';
  } catch {
    return '';
  }
}

export interface SafeAttachment {
  name: string;
  size: number;
  type: string;
  dataUrl: string;
}

/** Returns a cleaned attachment, or null when it is missing / not an allowed base64 data URL. */
export function safeAttachment(file: any): SafeAttachment | null {
  if (!file || typeof file !== 'object') return null;
  const dataUrl = typeof file.dataUrl === 'string' ? file.dataUrl : '';
  const match = /^data:([a-z0-9.+/-]+);base64,[A-Za-z0-9+/=\r\n]+$/i.exec(dataUrl);
  if (!match || dataUrl.length > MAX_ATTACHMENT_CHARS) return null;
  const mime = match[1].toLowerCase();
  if (!ALLOWED_MIME.has(mime)) return null;
  return {
    name: String(file.name || 'fayl').replace(/[\r\n<>"]/g, '').slice(0, 200),
    size: Number(file.size) || 0,
    type: mime,
    dataUrl,
  };
}
