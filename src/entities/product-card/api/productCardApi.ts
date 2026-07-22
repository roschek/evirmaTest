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

export const productCardApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getCard: build.query<ProductCard, number>({
      query: (nm) => ({
        url: WB_CARD_API,
        params: { appType: 1, curr: 'rub', dest: -1257786, nm },
      }),
      transformResponse: (raw: unknown, _meta, nm) => normalizeCard(raw, nm),
    }),
    // Photo CDN buckets (basket-XX.wbbasket.ru), keyed by vol range.
    getHostRanges: build.query<HostRange[], void>({
      query: () => ({ url: WB_UPSTREAMS_URL }),
      transformResponse: (raw: UpstreamsResponse) =>
        raw.origin?.mediabasket_route_map?.[0]?.hosts ?? [],
    }),
    // Video uses a separate CDN bucket set (videonme-basket-XX.wbbasket.ru), not the
    // photo buckets above -- confirmed against the live /api/v3/upstreams response.
    getVideoHostRanges: build.query<HostRange[], void>({
      query: () => ({ url: WB_UPSTREAMS_URL }),
      transformResponse: (raw: UpstreamsResponse) =>
        raw.origin?.videonme_route_map?.[0]?.hosts ?? [],
    }),
  }),
});

export const { useGetCardQuery, useGetHostRangesQuery, useGetVideoHostRangesQuery } =
  productCardApi;
