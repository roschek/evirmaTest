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
  Typography,
  Alert,
  Snackbar,
  CircularProgress,
  ButtonBase,
} from '@mui/material';
import type { ProductCard } from '@/entities/product-card';
import { useGetUpstreamsQuery, useGetFeedbacksQuery } from '@/entities/product-card';
import type { HostRange } from '@/shared/lib/media-url';
import { buildZipFromImages, triggerDownload } from '@/shared/lib/download';
import { downloadHlsAsMp4 } from '@/shared/lib/hls';
import { buildPhotoUrls } from '../lib/buildPhotoUrls';
import { useVideoSources } from '../model/useVideoSources';

// Stable references for the "no data yet" case -- a fresh `[]`/hooks default would
// change identity on every render, which would re-trigger effects below in a loop.
const EMPTY_RANGES: HostRange[] = [];
const EMPTY_HOSTS: string[] = [];

const videoFilename = (nm: number, index: number) => `wb-${nm}-video-${index + 1}.mp4`;

export const MediaSelectionModal = ({
  open,
  card,
  onClose,
}: {
  open: boolean;
  card: ProductCard;
  onClose: () => void;
}) => {
  const { data: upstreams, isFetching: rangesLoading } = useGetUpstreamsQuery();
  const ranges = upstreams?.photoRanges ?? EMPTY_RANGES;
  const videoRanges = upstreams?.videoRanges ?? EMPTY_RANGES;
  const videoFeedbackHosts = upstreams?.videoFeedbackHosts ?? EMPTY_HOSTS;

  // Fallback source: customer review videos from the card's media carousel, used
  // when the product has no video of its own. Public, CORS-open API keyed by `root`
  // (see README -- native "Wibes" clips aren't reachable without HTML scraping, but
  // review videos are a real, confirmed public endpoint).
  const { data: feedbacks, isFetching: feedbacksLoading } = useGetFeedbacksQuery(card.root);
  const { videoSources, videoChecking } = useVideoSources(
    card,
    videoRanges,
    videoFeedbackHosts,
    feedbacks,
    feedbacksLoading,
  );

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

  const downloadVideo = async (playlistUrl: string, filename: string) => {
    setBusy(true);
    try {
      const blob = await downloadHlsAsMp4(playlistUrl);
      triggerDownload(blob, filename);
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'неизвестная ошибка';
      setToast(`Не удалось скачать видео: ${reason}`);
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
          {videoSources.map((url, index) => (
            <ImageListItem key={url}>
              <ButtonBase
                onClick={() => downloadVideo(url, videoFilename(card.nm, index))}
                disabled={busy}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 0.5,
                  width: '100%',
                  height: '100%',
                  minHeight: 120,
                  bgcolor: 'action.hover',
                  borderRadius: 1,
                }}
              >
                <Typography sx={{ fontSize: 32, lineHeight: 1 }}>▶</Typography>
                <Typography variant="caption" color="text.secondary">
                  Видео {index + 1}
                </Typography>
              </ButtonBase>
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
          onClick={() => downloadVideo(videoSources[0], videoFilename(card.nm, 0))}
          disabled={busy || videoChecking || videoSources.length === 0}
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
