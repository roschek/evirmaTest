import { generateImageUrl, type HostRange } from '@/shared/lib/media-url';
import { PHOTO_SIZE } from '@/shared/config';

export const buildPhotoUrls = (nm: number, photoCount: number, ranges: HostRange[]): string[] => {
  const urls: string[] = [];
  for (let index = 1; index <= photoCount; index += 1) {
    const url = generateImageUrl({ nm, ranges, size: PHOTO_SIZE, index });
    if (url) urls.push(url);
  }
  return urls;
};
