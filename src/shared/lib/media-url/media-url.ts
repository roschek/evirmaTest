import type { HostRange } from './types';

function findHost(vol: number, ranges: HostRange[]): string | undefined {
  return ranges.find(
    (r) => vol >= r.vol_range_from && vol <= r.vol_range_to,
  )?.host;
}

export function generateImageUrl(args: {
  nm: number;
  ranges: HostRange[];
  size: string;
  index: number;
}): string | undefined {
  const { nm, ranges, size, index } = args;
  const vol = Math.floor(nm / 1e5);
  const part = Math.floor(nm / 1e3);
  const host = findHost(vol, ranges);
  if (!host) return undefined;
  return `https://${host}/vol${vol}/part${part}/${nm}/images/${size}/${index}.webp`;
}

export function generateVideoUrl(args: {
  nm: number;
  ranges: HostRange[];
  size: string;
  name: string;
}): string | undefined {
  const { nm, ranges, size, name } = args;
  const vol = Math.floor(nm / 1e5);
  const part = Math.floor(nm / 1e4);
  const host = findHost(vol, ranges);
  if (!host) return undefined;
  return `https://${host}/vol${vol}/part${part}/${nm}/hls/${size}/${name}`;
}
