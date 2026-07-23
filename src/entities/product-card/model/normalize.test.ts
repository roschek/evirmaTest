import { describe, it, expect } from 'vitest';
import { normalizeCard } from './normalize';

describe('normalizeCard', () => {
  it('reads photo count and video flag from a v4-style response', () => {
    const raw = {
      products: [
        { id: 604174866, root: 774188667, name: 'Test', media: { photo_count: 8, has_video: true } },
      ],
    };
    expect(normalizeCard(raw, 604174866)).toEqual({
      nm: 604174866,
      root: 774188667,
      name: 'Test',
      photoCount: 8,
      hasVideo: true,
    });
  });

  it('falls back to pics field and defaults when media is absent', () => {
    const raw = { products: [{ id: 1, name: 'X', pics: 3 }] };
    expect(normalizeCard(raw, 1)).toEqual({
      nm: 1,
      root: 1,
      name: 'X',
      photoCount: 3,
      hasVideo: false,
    });
  });

  it('throws when the product is missing', () => {
    expect(() => normalizeCard({ products: [] }, 1)).toThrow('Card not found');
  });
});
