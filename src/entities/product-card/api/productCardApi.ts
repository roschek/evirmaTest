import { baseApi } from '@/shared/api';
import { WB_CARD_API, WB_UPSTREAMS_URL } from '@/shared/config';
import type { HostRange } from '@/shared/lib/media-url';
import { normalizeCard } from '../model/normalize';
import type { ProductCard } from '../model/types';

type UpstreamsResponse = {
  origin?: {
    mediabasket_route_map?: { hosts?: HostRange[] }[];
    videonme_route_map?: { hosts?: HostRange[] }[];
  };
};

export type UpstreamRanges = {
  photoRanges: HostRange[];
  videoRanges: HostRange[];
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
      }),
    }),
  }),
});

export const { useLazyGetCardQuery, useGetUpstreamsQuery } = productCardApi;
