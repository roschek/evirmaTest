// WB card detail API (v4), per the task's technical hints. Blocks non-browser
// requests (403 from a plain curl/server-side call -- confirmed), so it can only
// be verified from within the app running in an actual browser.
export const WB_CARD_API = 'https://www.wildberries.ru/__internal/card/cards/v4/detail';

// CDN host-range map used to resolve which basket serves a given article.
export const WB_UPSTREAMS_URL = 'https://cdn.wbbasket.ru/api/v3/upstreams';

export const PHOTO_SIZE = 'big' as const;

// Highest quality first — used when probing for a downloadable video.
export const VIDEO_QUALITIES = ['720p', '480p', '360p'] as const;
