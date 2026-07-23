import { useEffect, useMemo, useState } from 'react';
import type { ProductCard, FeedbacksResponse } from '@/entities/product-card';
import { generateVideoUrl, resolveVideoFeedbackUrl, type HostRange } from '@/shared/lib/media-url';
import { VIDEO_QUALITIES } from '@/shared/config';

// The "classic" product-video scheme is real HLS (m3u8 playlist + .ts segments) --
// WB never serves a progressive mp4 next to it -- so availability is probed against
// the actual playlist name across quality tiers, highest first.
const findClassicVideoPlaylist = async (nm: number, ranges: HostRange[]): Promise<string | null> => {
  for (const quality of VIDEO_QUALITIES) {
    const url = generateVideoUrl({ nm, ranges, size: quality, name: 'index.m3u8' });
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

// All ready feedback videos, not just the first -- the card can have several
// customer review videos, same as it can be seen on wildberries.ru itself.
export const resolveFeedbackVideoUrls = (
  feedbacks: FeedbacksResponse | undefined,
  hosts: string[],
): string[] => {
  const urls: string[] = [];
  for (const item of feedbacks?.feedbacks ?? []) {
    if (!item.video?.isReady) continue;
    const url = resolveVideoFeedbackUrl(item.video.id, hosts);
    if (url) urls.push(url);
  }
  return urls;
};

// Finds every downloadable video source for a card: its own "classic" video (if
// any), followed by customer review videos resolved from the feedbacks API.
export const useVideoSources = (
  card: ProductCard,
  videoRanges: HostRange[],
  videoFeedbackHosts: string[],
  feedbacks: FeedbacksResponse | undefined,
  feedbacksLoading: boolean,
): { videoSources: string[]; videoChecking: boolean } => {
  // undefined = still checking classic scheme, null = confirmed unavailable, string = playlist URL.
  const [classicVideoUrl, setClassicVideoUrl] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (videoRanges.length === 0) return;
    let cancelled = false;
    setClassicVideoUrl(undefined);
    findClassicVideoPlaylist(card.nm, videoRanges).then((url) => {
      if (!cancelled) setClassicVideoUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [card.nm, videoRanges]);

  const feedbackVideoUrls = useMemo(
    () => resolveFeedbackVideoUrls(feedbacks, videoFeedbackHosts),
    [feedbacks, videoFeedbackHosts],
  );

  const videoSources = useMemo(
    () => [classicVideoUrl, ...feedbackVideoUrls].filter((url): url is string => Boolean(url)),
    [classicVideoUrl, feedbackVideoUrls],
  );

  // Still resolving only while there's nothing downloadable yet: either the classic
  // probe hasn't settled, or it came back empty and feedback videos are still loading.
  const videoChecking = videoSources.length === 0 && (classicVideoUrl === undefined || feedbacksLoading);

  return { videoSources, videoChecking };
};
