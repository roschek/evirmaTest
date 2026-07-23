declare module 'mux.js' {
  interface TransmuxedSegment {
    initSegment: Uint8Array<ArrayBuffer>;
    data: Uint8Array<ArrayBuffer>;
  }

  class Transmuxer {
    constructor(options?: { remux?: boolean });
    on(event: 'data', handler: (segment: TransmuxedSegment) => void): void;
    on(event: 'done', handler: () => void): void;
    push(data: Uint8Array<ArrayBuffer>): void;
    flush(): void;
  }

  const muxjs: {
    mp4: {
      Transmuxer: typeof Transmuxer;
    };
  };

  export default muxjs;
}
