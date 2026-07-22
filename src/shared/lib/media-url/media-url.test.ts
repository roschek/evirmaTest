import { describe, it, expect } from 'vitest';
import { generateImageUrl, generateVideoUrl } from './media-url';
import type { HostRange } from './types';

const ranges: HostRange[] = [
  { host: 'basket-01.wbbasket.ru', vol_range_from: 0, vol_range_to: 143 },
  { host: 'basket-15.wbbasket.ru', vol_range_from: 6000, vol_range_to: 6100 },
];

describe('generateImageUrl', () => {
  it('builds a webp image URL from vol/part derived from nm', () => {
    // nm 6041748: vol = floor(nm/1e5) = 60 -> no range; use nm in range instead
    const nm = 6041748; // vol=60, part=6041
    const url = generateImageUrl({ nm, ranges: [
      { host: 'basket-05.wbbasket.ru', vol_range_from: 0, vol_range_to: 100 },
    ], size: 'big', index: 1 });
    expect(url).toBe(
      'https://basket-05.wbbasket.ru/vol60/part6041/6041748/images/big/1.webp',
    );
  });

  it('returns undefined when no host range matches', () => {
    const url = generateImageUrl({ nm: 6041748, ranges: [], size: 'big', index: 1 });
    expect(url).toBeUndefined();
  });
});

describe('generateVideoUrl', () => {
  it('builds an HLS-style video URL from vol=nm%144 and part=floor(nm/1e4)', () => {
    const nm = 6041748; // vol = 6041748 % 144 = 60, part = 604
    const url = generateVideoUrl({ nm, ranges: [
      { host: 'vid-01.example.ru', vol_range_from: 0, vol_range_to: 100 },
    ], size: '720p', name: 'index.m3u8' });
    expect(url).toBe('https://vid-01.example.ru/vol60/part604/6041748/hls/720p/index.m3u8');
  });
});
