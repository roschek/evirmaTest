import JSZip from 'jszip';

export type FetchLike = (
  url: string,
) => Promise<{ ok: boolean; blob: () => Promise<Blob> }>;

export async function buildZipFromImages(
  urls: string[],
  deps: { fetchFn?: FetchLike } = {},
): Promise<{ zip: Blob; failed: string[] }> {
  const fetchFn: FetchLike = deps.fetchFn ?? ((url) => fetch(url));
  const zip = new JSZip();
  const failed: string[] = [];
  let ok = 0;

  await Promise.all(
    urls.map(async (url) => {
      try {
        const res = await fetchFn(url);
        if (!res.ok) {
          failed.push(url);
          return;
        }
        const blob = await res.blob();
        ok += 1;
        zip.file(`photo-${ok}.webp`, blob);
      } catch {
        failed.push(url);
      }
    }),
  );

  const blob = await zip.generateAsync({ type: 'blob' });
  return { zip: blob, failed };
}

export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
