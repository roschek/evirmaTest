import { baseApi } from '@/shared/api';
import { WB_CARD_API, WB_UPSTREAMS_URL } from '@/shared/config';
import type { HostRange } from '@/shared/lib/media-url';
import { normalizeCard } from '../model/normalize';
import type { ProductCard } from '../model/types';

type UpstreamsResponse = {
  origin?: {
    mediabasket_route_map?: { hosts?: HostRange[] }[];
    videonme_route_map?: { hosts?: HostRange[] }[];
    // Feedback (customer review) videos are addressed by shard index, not vol range --
    // see resolveVideoFeedbackUrl in shared/lib/media-url.
    videofeedback_uuid_route_map?: { hosts?: { host: string }[] }[];
  };
};

export type UpstreamRanges = {
  photoRanges: HostRange[];
  videoRanges: HostRange[];
  videoFeedbackHosts: string[];
};

export type FeedbackVideo = {
  id: string;
  isReady: boolean;
};

export type Feedback = {
  video?: FeedbackVideo;
};

export type FeedbacksResponse = {
  feedbackCountWithVideo?: number;
  feedbacks?: Feedback[];
};

export const productCardApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getCard: build.query<ProductCard, number>({
      query: (nm) => ({
        url: WB_CARD_API,
        params: { appType: 1, curr: 'rub', dest: -1257786, nm },
      }),
      transformResponse: (raw: unknown, _meta, nm) => normalizeCard(raw, nm),
    }),
    // Single request for both CDN bucket sets: photos (basket-XX.wbbasket.ru) and
    // video (videonme-basket-XX.wbbasket.ru) live under the same /api/v3/upstreams
    // response, keyed by vol range -- fetched once and split in transformResponse
    // rather than as two separate endpoints, which would double-request the same URL.
    getUpstreams: build.query<UpstreamRanges, void>({
      query: () => ({ url: WB_UPSTREAMS_URL }),
      transformResponse: (raw: UpstreamsResponse): UpstreamRanges => ({
        photoRanges: raw.origin?.mediabasket_route_map?.[0]?.hosts ?? [],
        videoRanges: raw.origin?.videonme_route_map?.[0]?.hosts ?? [],
        videoFeedbackHosts:
          raw.origin?.videofeedback_uuid_route_map?.[0]?.hosts?.map((h) => h.host) ?? [],
      }),
    }),
    // Public, CORS-open feedbacks API keyed by the card's `root` (not nm). Used as a
    // fallback video source when the card has no "classic" product video: many cards
    // carry customer review videos here even without one of their own (see README).
    getFeedbacks: build.query<FeedbacksResponse, number>({
      query: (root) => ({ url: `https://feedbacks1.wb.ru/feedbacks/v1/${root}` }),
    }),
  }),
});

export const { useLazyGetCardQuery, useGetUpstreamsQuery, useGetFeedbacksQuery } = productCardApi;
