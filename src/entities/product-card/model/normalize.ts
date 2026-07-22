import type { ProductCard } from './types';

type RawProduct = {
  id?: number;
  name?: string;
  pics?: number;
  media?: { photo_count?: number; has_video?: boolean };
};

export const normalizeCard = (raw: unknown, nm: number): ProductCard => {
  const products = (raw as { products?: RawProduct[] })?.products;
  const product = products?.[0];
  if (!product) throw new Error('Card not found');
  const photoCount = product.media?.photo_count ?? product.pics ?? 0;
  const hasVideo = product.media?.has_video ?? false;
  return {
    nm,
    name: product.name ?? String(nm),
    photoCount,
    hasVideo,
  };
};
