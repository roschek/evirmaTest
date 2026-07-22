import { describe, it, expect, vi } from 'vitest';
import JSZip from 'jszip';
import { buildZipFromImages } from './download';

function okResponse(bytes: number[]) {
  return { ok: true, blob: async () => new Blob([new Uint8Array(bytes)]) };
}
function failResponse() {
  return { ok: false, blob: async () => new Blob([]) };
}

describe('buildZipFromImages', () => {
  it('zips successful images and reports failed URLs', async () => {
    const fetchFn = vi.fn(async (url: string) =>
      url.includes('bad') ? failResponse() : okResponse([1, 2, 3]),
    );
    const { zip, failed } = await buildZipFromImages(
      ['https://x/1.webp', 'https://x/bad.webp', 'https://x/2.webp'],
      { fetchFn },
    );
    expect(failed).toEqual(['https://x/bad.webp']);
    const loaded = await JSZip.loadAsync(zip);
    const names = Object.keys(loaded.files).sort();
    expect(names).toEqual(['photo-1.webp', 'photo-2.webp']);
  });

  it('returns an empty-but-valid zip and all-failed list when everything fails', async () => {
    const fetchFn = vi.fn(async () => failResponse());
    const { failed } = await buildZipFromImages(['https://x/a.webp'], { fetchFn });
    expect(failed).toEqual(['https://x/a.webp']);
  });
});
