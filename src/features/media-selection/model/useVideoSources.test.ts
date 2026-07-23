import { describe, it, expect } from 'vitest';
import { resolveFeedbackVideoUrls } from './useVideoSources';

const hosts = ['videofeedback01.wbbasket.ru', 'videofeedback02.wbbasket.ru'];

describe('resolveFeedbackVideoUrls', () => {
  it('resolves every ready feedback video, skipping ones without a ready video', () => {
    const feedbacks = {
      feedbacks: [
        { video: { id: '1/uuid-a', isReady: true } },
        { video: undefined },
        { video: { id: '2/uuid-b', isReady: false } },
        { video: { id: '2/uuid-c', isReady: true } },
      ],
    };
    expect(resolveFeedbackVideoUrls(feedbacks, hosts)).toEqual([
      'https://videofeedback01.wbbasket.ru/uuid-a/index.m3u8',
      'https://videofeedback02.wbbasket.ru/uuid-c/index.m3u8',
    ]);
  });

  it('returns an empty array when feedbacks is undefined or has none', () => {
    expect(resolveFeedbackVideoUrls(undefined, hosts)).toEqual([]);
    expect(resolveFeedbackVideoUrls({ feedbacks: [] }, hosts)).toEqual([]);
  });
});
