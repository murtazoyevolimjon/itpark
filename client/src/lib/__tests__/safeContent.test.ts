import { describe, expect, it } from 'vitest';
import { safeAttachment, safeHttpUrl } from '../safeContent';

describe('safeHttpUrl', () => {
  it('keeps http(s) links and adds https to bare hosts', () => {
    expect(safeHttpUrl('https://example.com/a?b=1')).toBe('https://example.com/a?b=1');
    expect(safeHttpUrl('example.com/work')).toBe('https://example.com/work');
  });
  it('rejects script and data links in any casing', () => {
    expect(safeHttpUrl('javascript:alert(1)')).toBe('');
    expect(safeHttpUrl('JaVaScRiPt:alert(1)')).toBe('');
    expect(safeHttpUrl('data:text/html;base64,PHNjcmlwdD4=')).toBe('');
    expect(safeHttpUrl('vbscript:x')).toBe('');
    expect(safeHttpUrl('')).toBe('');
    expect(safeHttpUrl(null)).toBe('');
  });
});

describe('safeAttachment', () => {
  const pdf = 'data:application/pdf;base64,JVBERi0xLjQK';
  it('accepts an allowed base64 document', () => {
    expect(safeAttachment({ name: 'a.pdf', size: 10, type: 'x', dataUrl: pdf })?.type).toBe('application/pdf');
  });
  it('rejects HTML / SVG / script data URLs and oversized or malformed files', () => {
    expect(safeAttachment({ dataUrl: 'data:text/html;base64,PGgxPg==' })).toBeNull();
    expect(safeAttachment({ dataUrl: 'data:image/svg+xml;base64,PHN2Zz4=' })).toBeNull();
    expect(safeAttachment({ dataUrl: 'javascript:alert(1)' })).toBeNull();
    expect(safeAttachment({ dataUrl: 'data:application/pdf;base64,' + 'A'.repeat(3_100_000) })).toBeNull();
    expect(safeAttachment(null)).toBeNull();
  });
  it('strips markup characters from the file name', () => {
    expect(safeAttachment({ name: '<b>x</b>"\n.pdf', dataUrl: pdf })?.name).toBe('bx/b.pdf');
  });
});
