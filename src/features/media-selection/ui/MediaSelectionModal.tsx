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
  CircularProgress,
} from '@mui/material';
import type { ProductCard } from '@/entities/product-card';
import { useGetHostRangesQuery, useGetVideoHostRangesQuery } from '@/entities/product-card';
import { generateVideoUrl, type HostRange } from '@/shared/lib/media-url';
import { buildZipFromImages, triggerDownload } from '@/shared/lib/download';
import { VIDEO_QUALITIES } from '@/shared/config';
import { buildPhotoUrls } from '../lib/buildPhotoUrls';

// Stable reference for the "no data yet" case -- a fresh `[]` literal in the
// query's destructuring default would change identity on every render, which
// would re-trigger the photoUrls/selection effect below in an infinite loop.
const EMPTY_RANGES: HostRange[] = [];

export const MediaSelectionModal = ({
  open,
  card,
  onClose,
}: {
  open: boolean;
  card: ProductCard;
  onClose: () => void;
}) => {
  const { data: ranges = EMPTY_RANGES, isFetching: rangesLoading } = useGetHostRangesQuery();
  const { data: videoRanges = EMPTY_RANGES } = useGetVideoHostRangesQuery();
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
        const url = generateVideoUrl({
          nm: card.nm,
          ranges: videoRanges,
          size: quality,
          name: 'index.mp4',
        });
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
        {rangesLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        )}
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
        <Button
          onClick={downloadPhotos}
          disabled={busy || selected.size === 0}
          variant="contained"
          startIcon={busy ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {busy ? 'Загрузка…' : 'Скачать фото'}
        </Button>
        {/* The WB card API exposes no reliable "has video" flag (confirmed against a
            live response), so availability is discovered by attempting the download
            rather than gating the button on card.hasVideo. */}
        <Button
          onClick={downloadVideo}
          disabled={busy}
          variant="outlined"
          startIcon={busy ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {busy ? 'Загрузка…' : 'Скачать видео'}
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
