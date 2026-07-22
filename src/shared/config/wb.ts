// WB card detail API (v4). Query params set by the api-slice; verified live against 604174866.
export const WB_CARD_API = 'https://card.wb.ru/cards/v4/detail';

// CDN host-range map used to resolve which basket serves a given article.
export const WB_UPSTREAMS_URL = 'https://cdn.wbbasket.ru/api/v3/upstreams';

export const PHOTO_SIZE = 'big' as const;

// Highest quality first — used when probing for a downloadable video.
export const VIDEO_QUALITIES = ['720p', '480p', '360p'] as const;
