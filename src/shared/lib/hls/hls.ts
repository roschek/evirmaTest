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
      // Consume front-to-back so each raw segment becomes GC-eligible as soon as
      // mux.js has parsed it, instead of holding the whole video's raw bytes for
      // the entire transmux.
      while (segments.length > 0) {
        transmuxer.push(segments.shift()!);
      }
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

  // Segments are independent downloads -- fetch them concurrently instead of
  // paying the sum of their round trips one at a time.
  const segments = await Promise.all(
    segmentUrls.map(async (url) => {
      const res = await fetchFn(url);
      if (!res.ok) throw new Error(`Segment HTTP ${res.status}`);
      return new Uint8Array(await res.arrayBuffer());
    }),
  );

  return transmuxToMp4(segments);
};
