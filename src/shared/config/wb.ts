// WB card detail API (v4). The task's technical hints point at
// www.wildberries.ru/__internal/card/cards/v4/detail, but that endpoint 403s
// both server-side (curl) and cross-origin from the browser (confirmed live,
// even with a CORS-unblock extension) -- it appears to be locked to
// same-origin requests from wildberries.ru itself, not callable from a
// third-party SPA. Using the public mirror instead, which returns real card
// data for cross-origin callers (see README for the full tradeoff).
export const WB_CARD_API = 'https://card.wb.ru/cards/v4/detail';

// CDN host-range map used to resolve which basket serves a given article.
export const WB_UPSTREAMS_URL = 'https://cdn.wbbasket.ru/api/v3/upstreams';

export const PHOTO_SIZE = 'big' as const;

// Highest quality first — used when probing for a downloadable video.
export const VIDEO_QUALITIES = ['720p', '480p', '360p'] as const;
