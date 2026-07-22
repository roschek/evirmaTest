import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  ImageList,
  ImageListItem,
  Checkbox,
  Box,
  Alert,
  Snackbar,
} from '@mui/material';
import type { ProductCard } from '@/entities/product-card';
import { useGetHostRangesQuery } from '@/entities/product-card';
import { generateVideoUrl } from '@/shared/lib/media-url';
import { buildZipFromImages, triggerDownload } from '@/shared/lib/download';
import { VIDEO_QUALITIES } from '@/shared/config';
import { buildPhotoUrls } from '../lib/buildPhotoUrls';

export const MediaSelectionModal = ({
  open,
  card,
  onClose,
}: {
  open: boolean;
  card: ProductCard;
  onClose: () => void;
}) => {
  const { data: ranges = [], isFetching: rangesLoading } = useGetHostRangesQuery();
  const photoUrls = useMemo(
    () => buildPhotoUrls(card.nm, card.photoCount, ranges),
    [card.nm, card.photoCount, ranges],
  );
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Select all photos by default, and whenever the resolved photo set changes
  // (e.g. host ranges arrive after the first render).
  useEffect(() => {
    setSelected(new Set(photoUrls));
  }, [photoUrls]);

  const toggle = (url: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  };

  const downloadPhotos = async () => {
    setBusy(true);
    try {
      const { zip, failed } = await buildZipFromImages([...selected]);
      triggerDownload(zip, `wb-${card.nm}-photos.zip`);
      if (failed.length) setToast(`Пропущено фото: ${failed.length}`);
    } finally {
      setBusy(false);
    }
  };

  const downloadVideo = async () => {
    setBusy(true);
    try {
      for (const quality of VIDEO_QUALITIES) {
        const url = generateVideoUrl({ nm: card.nm, ranges, size: quality, name: 'index.mp4' });
        if (!url) continue;
        const res = await fetch(url);
        if (res.ok) {
          triggerDownload(await res.blob(), `wb-${card.nm}-${quality}.mp4`);
          return;
        }
      }
      setToast('Видео недоступно в mp4 (см. README — ограничение HLS).');
    } catch {
      setToast('Не удалось скачать видео.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Фото карточки {card.nm}</DialogTitle>
      <DialogContent>
        {!rangesLoading && photoUrls.length === 0 && (
          <Alert severity="warning">Фото не найдены.</Alert>
        )}
        <ImageList cols={3} gap={8}>
          {photoUrls.map((url) => (
            <ImageListItem key={url} sx={{ position: 'relative' }}>
              <img src={url} alt="" loading="lazy" />
              <Box sx={{ position: 'absolute', top: 0, left: 0 }}>
                <Checkbox checked={selected.has(url)} onChange={() => toggle(url)} />
              </Box>
            </ImageListItem>
          ))}
        </ImageList>
      </DialogContent>
      <DialogActions>
        <Button onClick={downloadPhotos} disabled={busy || selected.size === 0} variant="contained">
          Скачать фото
        </Button>
        <Button onClick={downloadVideo} disabled={busy || !card.hasVideo} variant="outlined">
          Скачать видео
        </Button>
        <Button onClick={onClose}>Закрыть</Button>
      </DialogActions>
      <Snackbar
        open={toast !== null}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        message={toast ?? ''}
      />
    </Dialog>
  );
};
