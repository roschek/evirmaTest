import { useState } from 'react';
import { SearchCard } from '@/features/search-card';
import { MediaSelectionModal } from '@/features/media-selection';
import type { ProductCard } from '@/entities/product-card';

export const HomePage = () => {
  const [card, setCard] = useState<ProductCard | null>(null);
  const [open, setOpen] = useState(false);

  const onFound = (foundCard: ProductCard) => {
    setCard(foundCard);
    setOpen(true);
  };

  return (
    <>
      <SearchCard onFound={onFound} />
      {card && <MediaSelectionModal open={open} card={card} onClose={() => setOpen(false)} />}
    </>
  );
};
