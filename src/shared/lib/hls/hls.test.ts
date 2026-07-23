import { describe, it, expect, vi } from 'vitest';
import { downloadHlsAsMp4 } from './hls';

vi.mock('mux.js', () => {
  class FakeTransmuxer {
    private handlers: Record<string, ((arg: never) => void)[]> = {};
    on(event: string, handler: (arg: never) => void) {
      (this.handlers[event] ??= []).push(handler);
    }
    push(data: Uint8Array) {
      const initSegment = new Uint8Array([0xf7]);
      this.handlers.data?.forEach((h) => h({ initSegment, data } as never));
    }
    flush() {
      this.handlers.done?.forEach((h) => h(undefined as never));
    }
  }
  return { default: { mp4: { Transmuxer: FakeTransmuxer } } };
});

const textResponse = (text: string) => ({
  ok: true,
  status: 200,
  text: async () => text,
  arrayBuffer: async () => new ArrayBuffer(0),
});
const bufferResponse = (bytes: number[]) => ({
  ok: true,
  status: 200,
  text: async () => '',
  arrayBuffer: async () => new Uint8Array(bytes).buffer,
});
const failResponse = (status: number) => ({
  ok: false,
  status,
  text: async () => '',
  arrayBuffer: async () => new ArrayBuffer(0),
});

describe('downloadHlsAsMp4', () => {
  it('fetches segments listed in the playlist, in order, and returns a Blob', async () => {
    const playlist = '#EXTM3U\n#EXTINF:1\n1.ts\n#EXTINF:1\n2.ts\n#EXT-X-ENDLIST';
    const fetched: string[] = [];
    const fetchFn = vi.fn(async (url: string) => {
      fetched.push(url);
      if (url.endsWith('index.m3u8')) return textResponse(playlist);
      if (url.endsWith('1.ts')) return bufferResponse([1, 2]);
      if (url.endsWith('2.ts')) return bufferResponse([3]);
      return failResponse(404);
    });

    const blob = await downloadHlsAsMp4('https://cdn.example/vol1/index.m3u8', { fetchFn });

    expect(fetched).toEqual([
      'https://cdn.example/vol1/index.m3u8',
      'https://cdn.example/vol1/1.ts',
      'https://cdn.example/vol1/2.ts',
    ]);
    expect(blob.type).toBe('video/mp4');
    expect(blob.size).toBeGreaterThan(0);
  });

  it('throws when the playlist request fails', async () => {
    const fetchFn = vi.fn(async () => failResponse(404));
    await expect(
      downloadHlsAsMp4('https://cdn.example/index.m3u8', { fetchFn }),
    ).rejects.toThrow('Playlist HTTP 404');
  });

  it('throws when a segment request fails', async () => {
    const playlist = '#EXTM3U\n1.ts\n#EXT-X-ENDLIST';
    const fetchFn = vi.fn(async (url: string) =>
      url.endsWith('.m3u8') ? textResponse(playlist) : failResponse(500),
    );
    await expect(
      downloadHlsAsMp4('https://cdn.example/index.m3u8', { fetchFn }),
    ).rejects.toThrow('Segment HTTP 500');
  });
});
