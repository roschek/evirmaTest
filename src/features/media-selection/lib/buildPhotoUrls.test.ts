import { describe, it, expect } from 'vitest';
import { buildPhotoUrls } from './buildPhotoUrls';
import type { HostRange } from '@/shared/lib/media-url';

const ranges: HostRange[] = [{ host: 'b.ru', vol_range_from: 0, vol_range_to: 100 }];

describe('buildPhotoUrls', () => {
  it('produces one URL per photo, 1-indexed, dropping unresolved', () => {
    const urls = buildPhotoUrls(6041748, 2, ranges); // vol=60 in range
    expect(urls).toEqual([
      'https://b.ru/vol60/part6041/6041748/images/big/1.webp',
      'https://b.ru/vol60/part6041/6041748/images/big/2.webp',
    ]);
  });

  it('returns empty array when no range matches', () => {
    expect(buildPhotoUrls(6041748, 3, [])).toEqual([]);
  });
});
