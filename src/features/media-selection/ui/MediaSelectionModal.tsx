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

// The WB card API exposes no reliable "has video" field (confirmed against a live
// response), so availability is discovered by HEAD-probing the CDN directly across
// quality tiers, highest first. Returns the first quality that responds ok.
const findAvailableVideoUrl = async (nm: number, ranges: HostRange[]): Promise<string | null> => {
  for (const quality of VIDEO_QUALITIES) {
    const url = generateVideoUrl({ nm, ranges, size: quality, name: 'index.mp4' });
    if (!url) continue;
    try {
      const res = await fetch(url, { method: 'HEAD' });
      if (res.ok) return url;
    } catch {
      // network/CORS error on this quality -- try the next one
    }
  }
  return null;
};

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
  // undefined = still checking, null = confirmed unavailable, string = the working URL.
  const [videoUrl, setVideoUrl] = useState<string | null | undefined>(undefined);

  // Select all photos by default, and whenever the resolved photo set changes
  // (e.g. host ranges arrive after the first render).
  useEffect(() => {
    setSelected(new Set(photoUrls));
  }, [photoUrls]);

  useEffect(() => {
    if (videoRanges.length === 0) return;
    let cancelled = false;
    setVideoUrl(undefined);
    findAvailableVideoUrl(card.nm, videoRanges).then((url) => {
      if (!cancelled) setVideoUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [card.nm, videoRanges]);

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
    if (!videoUrl) return;
    setBusy(true);
    try {
      const res = await fetch(videoUrl);
      if (!res.ok) throw new Error('video fetch failed');
      triggerDownload(await res.blob(), `wb-${card.nm}.mp4`);
    } catch {
      setToast('Не удалось скачать видео.');
    } finally {
      setBusy(false);
    }
  };

  const videoChecking = videoUrl === undefined;

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
        <Button
          onClick={downloadVideo}
          disabled={busy || videoChecking || !videoUrl}
          variant="outlined"
          startIcon={
            busy || videoChecking ? <CircularProgress size={16} color="inherit" /> : undefined
          }
        >
          {busy ? 'Загрузка…' : videoChecking ? 'Проверка видео…' : 'Скачать видео'}
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
