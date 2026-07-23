import muxjs from 'mux.js';

export type FetchLike = (url: string) => Promise<{
  ok: boolean;
  status: number;
  text: () => Promise<string>;
  arrayBuffer: () => Promise<ArrayBuffer>;
}>;

const resolveSegmentUrls = (playlistText: string, playlistUrl: string): string[] => {
  const base = new URL(playlistUrl);
  return playlistText
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'))
    .map((line) => new URL(line, base).toString());
};

const transmuxToMp4 = (segments: Uint8Array<ArrayBuffer>[]): Promise<Blob> =>
  new Promise((resolve, reject) => {
    const transmuxer = new muxjs.mp4.Transmuxer();
    let initSegment: Uint8Array<ArrayBuffer> | null = null;
    const chunks: Uint8Array<ArrayBuffer>[] = [];

    transmuxer.on('data', (segment) => {
      if (!initSegment) initSegment = segment.initSegment;
      chunks.push(segment.data);
    });
    transmuxer.on('done', () => {
      if (!initSegment) {
        reject(new Error('Transmux produced no output'));
        return;
      }
      resolve(new Blob([initSegment, ...chunks], { type: 'video/mp4' }));
    });

    try {
      for (const segment of segments) transmuxer.push(segment);
      transmuxer.flush();
    } catch (err) {
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });

// Downloads an HLS (MPEG-TS) playlist and remuxes it client-side into a single
// playable fMP4 file via mux.js -- a real container conversion, not a renamed
// .ts concatenation, since WB never serves a progressive mp4 next to the HLS path.
export const downloadHlsAsMp4 = async (
  playlistUrl: string,
  deps: { fetchFn?: FetchLike } = {},
): Promise<Blob> => {
  const fetchFn: FetchLike = deps.fetchFn ?? ((url) => fetch(url));

  const playlistRes = await fetchFn(playlistUrl);
  if (!playlistRes.ok) throw new Error(`Playlist HTTP ${playlistRes.status}`);
  const playlistText = await playlistRes.text();

  const segmentUrls = resolveSegmentUrls(playlistText, playlistUrl);
  if (segmentUrls.length === 0) throw new Error('Playlist has no segments');

  const segments: Uint8Array<ArrayBuffer>[] = [];
  for (const url of segmentUrls) {
    const res = await fetchFn(url);
    if (!res.ok) throw new Error(`Segment HTTP ${res.status}`);
    segments.push(new Uint8Array(await res.arrayBuffer()));
  }

  return transmuxToMp4(segments);
};
