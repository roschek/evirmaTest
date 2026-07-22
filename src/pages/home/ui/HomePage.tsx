import { useCallback, useState } from 'react';
import { SearchCard } from '@/features/search-card';
import { MediaSelectionModal } from '@/features/media-selection';
import type { ProductCard } from '@/entities/product-card';

export const HomePage = () => {
  const [card, setCard] = useState<ProductCard | null>(null);
  const [open, setOpen] = useState(false);

  // Stable across renders: SearchCard's effect depends on this reference, and an
  // unstable one would re-fire that effect on every HomePage re-render (e.g. right
  // after closing the modal), snapping `open` back to true.
  const onFound = useCallback((foundCard: ProductCard) => {
    setCard(foundCard);
    setOpen(true);
  }, []);

  const onClose = useCallback(() => setOpen(false), []);

  return (
    <>
      <SearchCard onFound={onFound} />
      {card && <MediaSelectionModal open={open} card={card} onClose={onClose} />}
    </>
  );
};
