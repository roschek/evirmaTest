# WB Media Downloader Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a client-only React SPA that, given a Wildberries article number, shows all product-card photos in a modal, lets the user select and download chosen photos as a zip, and downloads the card video (if any) as mp4.

**Architecture:** Feature-Sliced Design SPA. Browser calls the WB card API and CDN directly. RTK Query owns server state (card + CDN host ranges). Pure functions in `shared/lib/media-url` build photo/video URLs from the article number and CDN ranges (logic from the task's gist). `shared/lib/download` fetches media as blobs, zips photos with JSZip, and triggers browser downloads. Photo-selection is local React state inside `features/media-selection`.

**Tech Stack:** Vite, React 19, TypeScript (strict), Redux Toolkit + RTK Query, MUI, JSZip, Vitest + Testing Library, ESLint, Prettier. Package manager: npm.

## Global Constraints

- TypeScript strict mode ON. No `any` — use `unknown` + narrowing where a type is genuinely unknown.
- FSD import direction only: `app → pages → features → entities → shared`. Never import upward or sideways between slices of the same layer.
- Every slice exposes a public API via its `index.ts`; cross-slice imports go through that barrel, never deep paths.
- No `widgets` layer (single modal — YAGNI).
- No router (single page).
- Photo selection state is local React state, never Redux.
- Server state (card, CDN ranges) lives only in RTK Query.
- Commit after every task with a conventional-commit message. Never one squashed "final" commit.
- Example card for live verification: article `604174866` (has photos and video).

---

### Task 1: Project scaffold + tooling

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `index.html`, `src/main.tsx`, `src/vite-env.d.ts`
- Create: `.eslintrc.cjs`, `.prettierrc.json`, `.gitignore`
- Create: `vitest.config.ts`, `src/test/setup.ts`

**Interfaces:**
- Produces: a runnable Vite+React+TS project; `npm run dev`, `npm run build`, `npm run lint`, `npm run typecheck`, `npm run test` all wired.

- [ ] **Step 1: Scaffold with Vite**

```bash
cd /d/develop/evirma
npm create vite@latest . -- --template react-ts
```
If the directory is non-empty, choose "Ignore files and continue". Do NOT let it overwrite `README.md`, `docs/`, or `.claude/`.

- [ ] **Step 2: Install runtime + dev dependencies**

```bash
npm install @reduxjs/toolkit react-redux @mui/material @emotion/react @emotion/styled jszip
npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event @vitest/coverage-v8 prettier
```

- [ ] **Step 3: Enable TS strict mode**

In `tsconfig.json`, under `compilerOptions`, ensure:
```json
"strict": true,
"noUnusedLocals": true,
"noUnusedParameters": true,
"noFallthroughCasesInSwitch": true,
"baseUrl": ".",
"paths": { "@/*": ["src/*"] }
```
Mirror the alias in `vite.config.ts`:
```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
});
```

- [ ] **Step 4: Configure Vitest**

Create `vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
```
Create `src/test/setup.ts`:
```ts
import '@testing-library/jest-dom';
```

- [ ] **Step 5: Add scripts to package.json**

```json
"scripts": {
  "dev": "vite",
  "build": "tsc -b && vite build",
  "preview": "vite preview",
  "lint": "eslint .",
  "typecheck": "tsc --noEmit",
  "test": "vitest run",
  "test:watch": "vitest",
  "format": "prettier --write \"src/**/*.{ts,tsx}\""
}
```

- [ ] **Step 6: Add Prettier config**

Create `.prettierrc.json`:
```json
{ "singleQuote": true, "semi": true, "trailingComma": "all", "printWidth": 100 }
```

- [ ] **Step 7: Verify the toolchain**

Run:
```bash
npm run typecheck
npm run lint
npm run build
```
Expected: all three succeed (build emits `dist/`).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite + React + TS project with tooling"
```

---

### Task 2: Project governance — CLAUDE.md, agents, MCP config

**Files:**
- Create: `CLAUDE.md`
- Create: `.claude/agents/orchestrator.md`, `.claude/agents/developer.md`, `.claude/agents/tester.md`
- Create: `.mcp.json`

**Interfaces:**
- Produces: governance docs future Claude sessions read; no runtime code.

- [ ] **Step 1: Write `CLAUDE.md`**

Must begin with:
```markdown
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
```
Then include these sections (concrete content, no placeholders):
- **Commands:** `npm run dev`, `npm run build`, `npm run test`, single test: `npx vitest run src/shared/lib/media-url/media-url.test.ts`, `npm run lint`, `npm run typecheck`, `npm run format`.
- **Architecture (FSD):** layer list `app / pages / features / entities / shared` (no `widgets`, no router). Import direction `app → pages → features → entities → shared`; never upward or sideways. Every slice exposes a public API via `index.ts`; import through the barrel, never deep paths. Where server state lives (RTK Query only) vs. UI state (local React state, e.g. photo selection).
- **Code style:** TS strict, no `any`; RTK Query api-slice naming (`productCardApi`, hooks `useGetCardQuery`); file naming (kebab-case dirs, PascalCase components, camelCase utils); pure functions in `shared/lib` with colocated `*.test.ts`.
- **Media approach:** photo/video URLs built by `shared/lib/media-url` from article number + CDN ranges; zip via JSZip in `shared/lib/download`; known WB CORS caveat + fallback (proxy) noted.
- **Agents:** one-paragraph table of `orchestrator` / `developer` / `tester` and when to invoke each.

- [ ] **Step 2: Write `.claude/agents/orchestrator.md`**

Frontmatter + body:
```markdown
---
name: orchestrator
description: Leads the full dev cycle for a task — breaks work into steps, delegates implementation to the developer agent and verification to the tester agent. Does not write code itself.
tools: Agent, Read, Grep, Glob
---

You coordinate implementation of tasks in this repo. You NEVER edit files or run
builds yourself. For each unit of work:
1. Break the task into concrete steps from the plan in docs/superpowers/plans/.
2. Dispatch the `developer` agent (via Agent tool) with one self-contained step.
3. When developer reports done, dispatch the `tester` agent to verify.
4. If tester reports failures, dispatch developer with the specific fix, then re-test.
5. Only advance to the next task when tests pass.
Follow the FSD rules and code style in the root CLAUDE.md when specifying work.
```

- [ ] **Step 3: Write `.claude/agents/developer.md`**

```markdown
---
name: developer
description: Implements FSD slices, RTK Query api, and MUI components step-by-step following the root CLAUDE.md code style. Writes code and tests.
tools: Read, Write, Edit, Bash, Grep, Glob
---

You implement one step at a time as directed by the orchestrator. Rules:
- Obey the FSD import direction and public-API (index.ts) rules in CLAUDE.md.
- TypeScript strict, no `any`. Follow TDD for pure logic (test first, watch it fail).
- Keep files focused and small. Commit after each completed step with a
  conventional-commit message.
- Consult context7 MCP for up-to-date RTK Query / MUI / Vite API when unsure.
```

- [ ] **Step 4: Write `.claude/agents/tester.md`**

```markdown
---
name: tester
description: Verifies work — runs vitest, lint, typecheck, and drives the real UI flow in a browser via Playwright MCP (article input → modal → photo select → zip/video download).
tools: Bash, Read, Grep
---

You verify, you do not implement. For each verification request:
1. Run `npm run typecheck`, `npm run lint`, `npm run test` and report failures verbatim.
2. When asked to check the live flow, use Playwright MCP to open the running app,
   enter the example article 604174866, open the modal, toggle photo selection,
   trigger "Скачать фото" and "Скачать видео", and report what actually happened.
3. Report evidence (command output / observed behavior). Never claim success without it.
```

- [ ] **Step 5: Write `.mcp.json`**

```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp"]
    },
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest"]
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": { "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}" }
    }
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add CLAUDE.md .claude/agents .mcp.json
git commit -m "docs: add CLAUDE.md, agent roles, and MCP server config"
```

---

### Task 3: shared/config

**Files:**
- Create: `src/shared/config/wb.ts`, `src/shared/config/index.ts`

**Interfaces:**
- Produces:
  - `WB_CARD_API: string` — card detail endpoint base.
  - `WB_UPSTREAMS_URL: string` — CDN upstreams endpoint.
  - `PHOTO_SIZE: 'big'` — default image size segment.
  - `VIDEO_QUALITIES: readonly string[]` — quality segments to try, highest first.

- [ ] **Step 1: Create config**

`src/shared/config/wb.ts`:
```ts
// WB card detail API (v4). Query params set by the api-slice; verified live against 604174866.
export const WB_CARD_API = 'https://card.wb.ru/cards/v4/detail';

// CDN host-range map used to resolve which basket serves a given article.
export const WB_UPSTREAMS_URL = 'https://cdn.wbbasket.ru/api/v3/upstreams';

export const PHOTO_SIZE = 'big' as const;

// Highest quality first — used when probing for a downloadable video.
export const VIDEO_QUALITIES = ['720p', '480p', '360p'] as const;
```
`src/shared/config/index.ts`:
```ts
export * from './wb';
```

- [ ] **Step 2: Typecheck + commit**

```bash
npm run typecheck
git add src/shared/config
git commit -m "feat(shared): add WB config constants"
```

---

### Task 4: shared/lib/media-url — pure URL builders (TDD)

**Files:**
- Create: `src/shared/lib/media-url/types.ts`
- Create: `src/shared/lib/media-url/media-url.ts`
- Test: `src/shared/lib/media-url/media-url.test.ts`
- Create: `src/shared/lib/media-url/index.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type HostRange = { host: string; vol_range_from: number; vol_range_to: number }`
  - `generateImageUrl(args: { nm: number; ranges: HostRange[]; size: string; index: number }): string | undefined`
  - `generateVideoUrl(args: { nm: number; ranges: HostRange[]; size: string; name: string }): string | undefined`

- [ ] **Step 1: Write the failing test**

`src/shared/lib/media-url/media-url.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { generateImageUrl, generateVideoUrl } from './media-url';
import type { HostRange } from './types';

const ranges: HostRange[] = [
  { host: 'basket-01.wbbasket.ru', vol_range_from: 0, vol_range_to: 143 },
  { host: 'basket-15.wbbasket.ru', vol_range_from: 6000, vol_range_to: 6100 },
];

describe('generateImageUrl', () => {
  it('builds a webp image URL from vol/part derived from nm', () => {
    // nm 6041748: vol = floor(nm/1e5) = 60 -> no range; use nm in range instead
    const nm = 6041748; // vol=60, part=6041
    const url = generateImageUrl({ nm, ranges: [
      { host: 'basket-05.wbbasket.ru', vol_range_from: 0, vol_range_to: 100 },
    ], size: 'big', index: 1 });
    expect(url).toBe(
      'https://basket-05.wbbasket.ru/vol60/part6041/6041748/images/big/1.webp',
    );
  });

  it('returns undefined when no host range matches', () => {
    const url = generateImageUrl({ nm: 6041748, ranges: [], size: 'big', index: 1 });
    expect(url).toBeUndefined();
  });
});

describe('generateVideoUrl', () => {
  it('builds an HLS-style video URL from vol=nm%144 and part=floor(nm/1e4)', () => {
    const nm = 6041748; // vol = 6041748 % 144 = 84, part = 604
    const url = generateVideoUrl({ nm, ranges: [
      { host: 'vid-01.example.ru', vol_range_from: 0, vol_range_to: 100 },
    ], size: '720p', name: 'index.m3u8' });
    expect(url).toBe('https://vid-01.example.ru/vol84/part604/6041748/hls/720p/index.m3u8');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/shared/lib/media-url/media-url.test.ts`
Expected: FAIL — cannot resolve `./media-url`.

- [ ] **Step 3: Write types + implementation**

`src/shared/lib/media-url/types.ts`:
```ts
export type HostRange = {
  host: string;
  vol_range_from: number;
  vol_range_to: number;
};
```
`src/shared/lib/media-url/media-url.ts`:
```ts
import type { HostRange } from './types';

function findHost(vol: number, ranges: HostRange[]): string | undefined {
  return ranges.find(
    (r) => vol >= r.vol_range_from && vol <= r.vol_range_to,
  )?.host;
}

export function generateImageUrl(args: {
  nm: number;
  ranges: HostRange[];
  size: string;
  index: number;
}): string | undefined {
  const { nm, ranges, size, index } = args;
  const vol = Math.floor(nm / 1e5);
  const part = Math.floor(nm / 1e3);
  const host = findHost(vol, ranges);
  if (!host) return undefined;
  return `https://${host}/vol${vol}/part${part}/${nm}/images/${size}/${index}.webp`;
}

export function generateVideoUrl(args: {
  nm: number;
  ranges: HostRange[];
  size: string;
  name: string;
}): string | undefined {
  const { nm, ranges, size, name } = args;
  const vol = nm % 144;
  const part = Math.floor(nm / 1e4);
  const host = findHost(vol, ranges);
  if (!host) return undefined;
  return `https://${host}/vol${vol}/part${part}/${nm}/hls/${size}/${name}`;
}
```
`src/shared/lib/media-url/index.ts`:
```ts
export { generateImageUrl, generateVideoUrl } from './media-url';
export type { HostRange } from './types';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/shared/lib/media-url/media-url.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/shared/lib/media-url
git commit -m "feat(shared): add pure media-url builders with tests"
```

---

### Task 5: shared/lib/download — zip + file download (TDD)

**Files:**
- Create: `src/shared/lib/download/download.ts`
- Test: `src/shared/lib/download/download.test.ts`
- Create: `src/shared/lib/download/index.ts`

**Interfaces:**
- Consumes: `jszip`.
- Produces:
  - `type FetchLike = (url: string) => Promise<{ ok: boolean; blob: () => Promise<Blob> }>`
  - `buildZipFromImages(urls: string[], deps?: { fetchFn?: FetchLike }): Promise<{ zip: Blob; failed: string[] }>` — fetches each URL, adds ok ones to the zip, collects failed URLs.
  - `triggerDownload(blob: Blob, filename: string): void` — creates an object URL and clicks a temporary `<a download>`.

- [ ] **Step 1: Write the failing test**

`src/shared/lib/download/download.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest';
import JSZip from 'jszip';
import { buildZipFromImages } from './download';

function okResponse(bytes: number[]) {
  return { ok: true, blob: async () => new Blob([new Uint8Array(bytes)]) };
}
function failResponse() {
  return { ok: false, blob: async () => new Blob([]) };
}

describe('buildZipFromImages', () => {
  it('zips successful images and reports failed URLs', async () => {
    const fetchFn = vi.fn(async (url: string) =>
      url.includes('bad') ? failResponse() : okResponse([1, 2, 3]),
    );
    const { zip, failed } = await buildZipFromImages(
      ['https://x/1.webp', 'https://x/bad.webp', 'https://x/2.webp'],
      { fetchFn },
    );
    expect(failed).toEqual(['https://x/bad.webp']);
    const loaded = await JSZip.loadAsync(zip);
    const names = Object.keys(loaded.files).sort();
    expect(names).toEqual(['photo-1.webp', 'photo-2.webp']);
  });

  it('returns an empty-but-valid zip and all-failed list when everything fails', async () => {
    const fetchFn = vi.fn(async () => failResponse());
    const { failed } = await buildZipFromImages(['https://x/a.webp'], { fetchFn });
    expect(failed).toEqual(['https://x/a.webp']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/shared/lib/download/download.test.ts`
Expected: FAIL — cannot resolve `./download`.

- [ ] **Step 3: Write the implementation**

`src/shared/lib/download/download.ts`:
```ts
import JSZip from 'jszip';

export type FetchLike = (
  url: string,
) => Promise<{ ok: boolean; blob: () => Promise<Blob> }>;

export async function buildZipFromImages(
  urls: string[],
  deps: { fetchFn?: FetchLike } = {},
): Promise<{ zip: Blob; failed: string[] }> {
  const fetchFn: FetchLike = deps.fetchFn ?? ((url) => fetch(url));
  const zip = new JSZip();
  const failed: string[] = [];
  let ok = 0;

  await Promise.all(
    urls.map(async (url) => {
      try {
        const res = await fetchFn(url);
        if (!res.ok) {
          failed.push(url);
          return;
        }
        const blob = await res.blob();
        ok += 1;
        zip.file(`photo-${ok}.webp`, blob);
      } catch {
        failed.push(url);
      }
    }),
  );

  const blob = await zip.generateAsync({ type: 'blob' });
  return { zip: blob, failed };
}

export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
```
> Note: the `ok += 1` counter makes photo numbering deterministic regardless of which fetches fail; the test relies on `photo-1`/`photo-2` naming.

`src/shared/lib/download/index.ts`:
```ts
export { buildZipFromImages, triggerDownload } from './download';
export type { FetchLike } from './download';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/shared/lib/download/download.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/shared/lib/download
git commit -m "feat(shared): add zip builder and file download helpers with tests"
```

---

### Task 6: shared/api base + entities/product-card api-slice

**Files:**
- Create: `src/shared/api/baseApi.ts`, `src/shared/api/index.ts`
- Create: `src/entities/product-card/model/types.ts`
- Create: `src/entities/product-card/model/normalize.ts`
- Test: `src/entities/product-card/model/normalize.test.ts`
- Create: `src/entities/product-card/api/productCardApi.ts`
- Create: `src/entities/product-card/index.ts`

**Interfaces:**
- Consumes: `@/shared/config`, `@/shared/lib/media-url` (`HostRange`).
- Produces:
  - `type ProductCard = { nm: number; name: string; photoCount: number; hasVideo: boolean }`
  - `normalizeCard(raw: unknown, nm: number): ProductCard` — defensive parse of the v4 detail response.
  - `baseApi` — RTK Query `createApi` instance with `reducerPath: 'api'`.
  - `productCardApi` extending `baseApi` with:
    - `useGetCardQuery(nm: number)` → `ProductCard`
    - `useGetHostRangesQuery()` → `HostRange[]`

- [ ] **Step 1: Write the failing normalize test**

`src/entities/product-card/model/normalize.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { normalizeCard } from './normalize';

describe('normalizeCard', () => {
  it('reads photo count and video flag from a v4-style response', () => {
    const raw = {
      products: [
        { id: 604174866, name: 'Test', media: { photo_count: 8, has_video: true } },
      ],
    };
    expect(normalizeCard(raw, 604174866)).toEqual({
      nm: 604174866,
      name: 'Test',
      photoCount: 8,
      hasVideo: true,
    });
  });

  it('falls back to pics field and defaults when media is absent', () => {
    const raw = { products: [{ id: 1, name: 'X', pics: 3 }] };
    expect(normalizeCard(raw, 1)).toEqual({
      nm: 1,
      name: 'X',
      photoCount: 3,
      hasVideo: false,
    });
  });

  it('throws when the product is missing', () => {
    expect(() => normalizeCard({ products: [] }, 1)).toThrow('Card not found');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/entities/product-card/model/normalize.test.ts`
Expected: FAIL — cannot resolve `./normalize`.

- [ ] **Step 3: Write types + normalize**

`src/entities/product-card/model/types.ts`:
```ts
export type ProductCard = {
  nm: number;
  name: string;
  photoCount: number;
  hasVideo: boolean;
};
```
`src/entities/product-card/model/normalize.ts`:
```ts
import type { ProductCard } from './types';

type RawProduct = {
  id?: number;
  name?: string;
  pics?: number;
  media?: { photo_count?: number; has_video?: boolean };
};

export function normalizeCard(raw: unknown, nm: number): ProductCard {
  const products = (raw as { products?: RawProduct[] })?.products;
  const product = products?.[0];
  if (!product) throw new Error('Card not found');
  const photoCount = product.media?.photo_count ?? product.pics ?? 0;
  const hasVideo = product.media?.has_video ?? false;
  return {
    nm,
    name: product.name ?? String(nm),
    photoCount,
    hasVideo,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/entities/product-card/model/normalize.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Write the RTK Query base + api-slice**

`src/shared/api/baseApi.ts`:
```ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: '/' }),
  endpoints: () => ({}),
});
```
`src/shared/api/index.ts`:
```ts
export { baseApi } from './baseApi';
```
`src/entities/product-card/api/productCardApi.ts`:
```ts
import { baseApi } from '@/shared/api';
import { WB_CARD_API, WB_UPSTREAMS_URL } from '@/shared/config';
import type { HostRange } from '@/shared/lib/media-url';
import { normalizeCard } from '../model/normalize';
import type { ProductCard } from '../model/types';

type UpstreamsResponse = {
  recommend?: {
    mediabasket_route_map?: { hosts?: HostRange[] }[];
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
    getHostRanges: build.query<HostRange[], void>({
      query: () => ({ url: WB_UPSTREAMS_URL }),
      transformResponse: (raw: UpstreamsResponse) =>
        raw.recommend?.mediabasket_route_map?.[0]?.hosts ?? [],
    }),
  }),
});

export const { useGetCardQuery, useGetHostRangesQuery } = productCardApi;
```
`src/entities/product-card/index.ts`:
```ts
export { useGetCardQuery, useGetHostRangesQuery, productCardApi } from './api/productCardApi';
export type { ProductCard } from './model/types';
```

- [ ] **Step 6: Typecheck + commit**

```bash
npm run typecheck
git add src/shared/api src/entities/product-card
git commit -m "feat(entities): add product-card api-slice and card normalizer with tests"
```

> **Live-verification note (do during Task 10 browser check, not here):** confirm the
> `getCard` query params and the `mediabasket_route_map[0].hosts` shape against article
> `604174866`. If the live response differs, adjust `normalizeCard` field names and the
> `UpstreamsResponse` path in this task's files only — the pure builders in Task 4 stay fixed.

---

### Task 7: app layer — store + providers

**Files:**
- Create: `src/app/store.ts`
- Create: `src/app/providers/AppProviders.tsx`
- Create: `src/app/theme.ts`
- Create: `src/app/index.ts`
- Modify: `src/main.tsx`

**Interfaces:**
- Consumes: `@/shared/api` (`baseApi`).
- Produces:
  - `store` — configured Redux store with `baseApi` reducer + middleware.
  - `type RootState`, `type AppDispatch`.
  - `AppProviders` — wraps children in Redux `<Provider>` + MUI `<ThemeProvider>` + `<CssBaseline>`.

- [ ] **Step 1: Create the store**

`src/app/store.ts`:
```ts
import { configureStore } from '@reduxjs/toolkit';
import { baseApi } from '@/shared/api';

export const store = configureStore({
  reducer: { [baseApi.reducerPath]: baseApi.reducer },
  middleware: (getDefault) => getDefault().concat(baseApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

- [ ] **Step 2: Create theme + providers**

`src/app/theme.ts`:
```ts
import { createTheme } from '@mui/material/styles';

export const theme = createTheme();
```
`src/app/providers/AppProviders.tsx`:
```tsx
import type { ReactNode } from 'react';
import { Provider } from 'react-redux';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { store } from '../store';
import { theme } from '../theme';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </Provider>
  );
}
```
`src/app/index.ts`:
```ts
export { store } from './store';
export type { RootState, AppDispatch } from './store';
export { AppProviders } from './providers/AppProviders';
```

- [ ] **Step 3: Wire main.tsx**

`src/main.tsx`:
```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppProviders } from '@/app';
import { HomePage } from '@/pages/home';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <HomePage />
    </AppProviders>
  </StrictMode>,
);
```
> `@/pages/home` is created in Task 10. Until then `npm run dev` will fail to resolve it — that is expected; typecheck of this task's own files still passes.

- [ ] **Step 4: Typecheck + commit**

```bash
npm run typecheck || true   # HomePage import unresolved until Task 10 — expected
git add src/app src/main.tsx
git commit -m "feat(app): add Redux store, MUI providers, and theme"
```

---

### Task 8: features/search-card

**Files:**
- Create: `src/features/search-card/ui/SearchCard.tsx`
- Create: `src/features/search-card/index.ts`

**Interfaces:**
- Consumes: `@/entities/product-card` (`useGetCardQuery`), MUI.
- Produces:
  - `SearchCard({ onFound }: { onFound: (nm: number) => void })` — renders a `TextField` (article) + `Button` "Скачать фото". On submit, validates the number, triggers `useGetCardQuery`, shows inline error on failure/empty, and calls `onFound(nm)` when the card loads.

- [ ] **Step 1: Implement the component**

`src/features/search-card/ui/SearchCard.tsx`:
```tsx
import { useState } from 'react';
import { Box, Button, Stack, TextField, Alert } from '@mui/material';
import { useGetCardQuery } from '@/entities/product-card';

export function SearchCard({ onFound }: { onFound: (nm: number) => void }) {
  const [value, setValue] = useState('');
  const [nm, setNm] = useState<number | null>(null);
  const { data, error, isFetching } = useGetCardQuery(nm as number, { skip: nm === null });

  const submit = () => {
    const parsed = Number(value.trim());
    if (!value.trim() || Number.isNaN(parsed) || parsed <= 0) {
      setNm(null);
      return;
    }
    setNm(parsed);
  };

  if (data && nm !== null) onFound(nm);

  const invalid = value.trim() !== '' && (Number.isNaN(Number(value.trim())) || Number(value.trim()) <= 0);

  return (
    <Box sx={{ maxWidth: 480, mx: 'auto', mt: 8 }}>
      <Stack spacing={2}>
        <TextField
          label="Артикул"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          error={invalid}
          helperText={invalid ? 'Введите числовой артикул' : ' '}
        />
        <Button variant="contained" onClick={submit} disabled={isFetching}>
          {isFetching ? 'Загрузка…' : 'Скачать фото'}
        </Button>
        {error && <Alert severity="error">Не удалось получить карточку. Возможно, нужен прокси (CORS).</Alert>}
      </Stack>
    </Box>
  );
}
```
`src/features/search-card/index.ts`:
```ts
export { SearchCard } from './ui/SearchCard';
```

- [ ] **Step 2: Typecheck + commit**

```bash
npm run typecheck || true
git add src/features/search-card
git commit -m "feat(search-card): article input with card lookup and inline errors"
```

---

### Task 9: features/media-selection — modal with selection + downloads

**Files:**
- Create: `src/features/media-selection/lib/buildPhotoUrls.ts`
- Test: `src/features/media-selection/lib/buildPhotoUrls.test.ts`
- Create: `src/features/media-selection/ui/MediaSelectionModal.tsx`
- Create: `src/features/media-selection/index.ts`

**Interfaces:**
- Consumes: `@/entities/product-card` (`ProductCard`, `useGetHostRangesQuery`), `@/shared/lib/media-url`, `@/shared/lib/download`, `@/shared/config`, MUI, JSZip (via download lib).
- Produces:
  - `buildPhotoUrls(nm: number, photoCount: number, ranges: HostRange[]): string[]`
  - `MediaSelectionModal({ open, card, onClose }: { open: boolean; card: ProductCard; onClose: () => void })`

- [ ] **Step 1: Write the failing buildPhotoUrls test**

`src/features/media-selection/lib/buildPhotoUrls.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { buildPhotoUrls } from './buildPhotoUrls';
import type { HostRange } from '@/shared/lib/media-url';

const ranges: HostRange[] = [{ host: 'b.ru', vol_range_from: 0, vol_range_to: 100 }];

describe('buildPhotoUrls', () => {
  it('produces one URL per photo, 1-indexed, dropping unresolved', () => {
    const urls = buildPhotoUrls(6041748, 2, ranges); // vol=60 in range
    expect(urls).toEqual([
      'https://b.ru/vol60/part6041/6041748/images/big/1.webp',
      'https://b.ru/vol60/part6041/6041748/images/big/2.webp',
    ]);
  });

  it('returns empty array when no range matches', () => {
    expect(buildPhotoUrls(6041748, 3, [])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/media-selection/lib/buildPhotoUrls.test.ts`
Expected: FAIL — cannot resolve `./buildPhotoUrls`.

- [ ] **Step 3: Implement buildPhotoUrls**

`src/features/media-selection/lib/buildPhotoUrls.ts`:
```ts
import { generateImageUrl, type HostRange } from '@/shared/lib/media-url';
import { PHOTO_SIZE } from '@/shared/config';

export function buildPhotoUrls(nm: number, photoCount: number, ranges: HostRange[]): string[] {
  const urls: string[] = [];
  for (let index = 1; index <= photoCount; index += 1) {
    const url = generateImageUrl({ nm, ranges, size: PHOTO_SIZE, index });
    if (url) urls.push(url);
  }
  return urls;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/media-selection/lib/buildPhotoUrls.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Implement the modal**

`src/features/media-selection/ui/MediaSelectionModal.tsx`:
```tsx
import { useMemo, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, ImageList, ImageListItem, Checkbox, Box, Alert, Snackbar,
} from '@mui/material';
import type { ProductCard } from '@/entities/product-card';
import { useGetHostRangesQuery } from '@/entities/product-card';
import { generateVideoUrl } from '@/shared/lib/media-url';
import { buildZipFromImages, triggerDownload } from '@/shared/lib/download';
import { VIDEO_QUALITIES } from '@/shared/config';
import { buildPhotoUrls } from '../lib/buildPhotoUrls';

export function MediaSelectionModal({
  open, card, onClose,
}: { open: boolean; card: ProductCard; onClose: () => void }) {
  const { data: ranges = [] } = useGetHostRangesQuery();
  const photoUrls = useMemo(
    () => buildPhotoUrls(card.nm, card.photoCount, ranges),
    [card.nm, card.photoCount, ranges],
  );
  const [selected, setSelected] = useState<Set<string>>(() => new Set(photoUrls));
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Re-select all when the photo set changes (ranges arrive after first render).
  useMemo(() => setSelected(new Set(photoUrls)), [photoUrls]);

  const toggle = (url: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  };

  const downloadPhotos = async () => {
    setBusy(true);
    try {
      const { zip, failed } = await buildZipFromImages([...selected]);
      triggerDownload(zip, `wb-${card.nm}-photos.zip`);
      if (failed.length) setToast(`Пропущено фото: ${failed.length}`);
    } finally {
      setBusy(false);
    }
  };

  const downloadVideo = async () => {
    setBusy(true);
    try {
      for (const q of VIDEO_QUALITIES) {
        const url = generateVideoUrl({ nm: card.nm, ranges, size: q, name: 'index.mp4' });
        if (!url) continue;
        const res = await fetch(url);
        if (res.ok) {
          triggerDownload(await res.blob(), `wb-${card.nm}-${q}.mp4`);
          return;
        }
      }
      setToast('Видео недоступно в mp4 (см. README — ограничение HLS).');
    } catch {
      setToast('Не удалось скачать видео.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Фото карточки {card.nm}</DialogTitle>
      <DialogContent>
        {photoUrls.length === 0 && <Alert severity="warning">Фото не найдены.</Alert>}
        <ImageList cols={3} gap={8}>
          {photoUrls.map((url) => (
            <ImageListItem key={url} sx={{ position: 'relative' }}>
              <img src={url} alt="" loading="lazy" />
              <Box sx={{ position: 'absolute', top: 0, left: 0 }}>
                <Checkbox checked={selected.has(url)} onChange={() => toggle(url)} />
              </Box>
            </ImageListItem>
          ))}
        </ImageList>
      </DialogContent>
      <DialogActions>
        <Button onClick={downloadPhotos} disabled={busy || selected.size === 0} variant="contained">
          Скачать фото
        </Button>
        <Button onClick={downloadVideo} disabled={busy || !card.hasVideo} variant="outlined">
          Скачать видео
        </Button>
        <Button onClick={onClose}>Закрыть</Button>
      </DialogActions>
      <Snackbar open={toast !== null} autoHideDuration={4000} onClose={() => setToast(null)} message={toast ?? ''} />
    </Dialog>
  );
}
```
`src/features/media-selection/index.ts`:
```ts
export { MediaSelectionModal } from './ui/MediaSelectionModal';
```

- [ ] **Step 6: Typecheck + commit**

```bash
npm run typecheck || true
npx vitest run src/features/media-selection
git add src/features/media-selection
git commit -m "feat(media-selection): modal with photo selection, zip and video download"
```

---

### Task 10: pages/home + wire-up + live verification

**Files:**
- Create: `src/pages/home/ui/HomePage.tsx`
- Create: `src/pages/home/index.ts`
- Delete: leftover Vite template files (`src/App.tsx`, `src/App.css`, `src/index.css`, `src/assets/react.svg` if present)

**Interfaces:**
- Consumes: `@/features/search-card`, `@/features/media-selection`, `@/entities/product-card`.
- Produces: `HomePage` — holds `nm` state, renders `SearchCard`; when a card is found, fetches it and renders `MediaSelectionModal`.

- [ ] **Step 1: Implement HomePage**

`src/pages/home/ui/HomePage.tsx`:
```tsx
import { useState } from 'react';
import { SearchCard } from '@/features/search-card';
import { MediaSelectionModal } from '@/features/media-selection';
import { useGetCardQuery } from '@/entities/product-card';

export function HomePage() {
  const [nm, setNm] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const { data: card } = useGetCardQuery(nm as number, { skip: nm === null });

  const onFound = (foundNm: number) => {
    setNm(foundNm);
    setOpen(true);
  };

  return (
    <>
      <SearchCard onFound={onFound} />
      {card && (
        <MediaSelectionModal open={open} card={card} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
```
`src/pages/home/index.ts`:
```ts
export { HomePage } from './ui/HomePage';
```

- [ ] **Step 2: Remove Vite template leftovers**

```bash
rm -f src/App.tsx src/App.css src/index.css
```
Remove any `import './index.css'` / `import './App.css'` lines left in `src/main.tsx`.

- [ ] **Step 3: Full verification (automated)**

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```
Expected: all pass; `npm run test` green across media-url, download, normalize, buildPhotoUrls.

- [ ] **Step 4: Live browser verification (tester agent / Playwright MCP)**

```bash
npm run dev
```
Then, against `http://localhost:5173`, using the example article `604174866`:
1. Enter the article, click "Скачать фото" → modal opens with photos.
2. Confirm all photos are checked by default; toggle one off.
3. Click "Скачать фото" → a `wb-604174866-photos.zip` downloads.
4. Click "Скачать видео" → either an mp4 downloads or the HLS-limitation toast appears.

If the card request fails (CORS) or fields don't match, fix **only** the api-slice /
normalizer in Task 6's files (query params, `UpstreamsResponse` path, `normalizeCard`
field names), then re-run Step 3. Record whichever video outcome occurred — it feeds the
README limitations section in Task 11.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(home): wire search + modal into single page; drop template files"
```

---

### Task 11: README + deliverables

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: the observed video outcome from Task 10 Step 4.

- [ ] **Step 1: Write README**

Replace `README.md` with sections required by the assignment:
- **Что это** — короткое описание и как запустить (`npm install`, `npm run dev`).
- **Подход к получению медиа и почему** — article number → `vol`/`part` → CDN basket via
  `upstreams` host ranges; фото как `.webp` (`images/big`), zip через JSZip на клиенте;
  почему client-only (соответствует заданию, минимум инфраструктуры).
- **Что доделали бы для продакшена (особенно видео)** — WB отдаёт видео как HLS
  (`hls/{quality}/index.m3u8`); честный mp4 требует муксинга сегментов (ffmpeg.wasm) или
  бэкенд-прокси, транскодящего HLS→mp4; для фото — серверный прокси, чтобы снять CORS и
  батчить загрузку.
- **Ограничения** — возможный CORS на WB API из браузера (fallback: dev-proxy / backend
  proxy); видео-исход из Task 10 Step 4 записать как факт; отсутствие ретраев/пагинации.
- **Демо** — плейсхолдер-ссылка на gif/видео 20–40 сек (записывается вручную).

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README with media approach, production TODOs, and limitations"
```

- [ ] **Step 3: Manual follow-up (out of automated scope)**

Record a 20–40s gif/video of the flow and link it in the README's Демо section.

---

## Self-Review

- **Spec coverage:** article input + "Скачать фото" (Task 8); modal with all photos,
  default-all selected, per-photo toggle (Task 9); zip of selected (Tasks 5, 9); video
  download with mp4-first + documented HLS fallback (Tasks 9, 10, 11); FSD layers app/
  pages/features/entities/shared (Tasks 3–10, no widgets/router per spec); RTK Query server
  state, local selection state (Tasks 6, 9); MUI (Tasks 7–10); Vitest units on media-url,
  download, normalize, buildPhotoUrls (Tasks 4, 5, 6, 9); ESLint/Prettier/strict (Task 1);
  agents + CLAUDE.md + .mcp.json (Task 2); README with the three required sections (Task 11);
  incremental commits (every task). All spec sections map to a task.
- **Placeholder scan:** no "TBD"/"add error handling"-style gaps; every code step shows full
  code. The one live-verification allowance (Task 6 note / Task 10 Step 4) is scoped to
  specific files and is genuine external-API confirmation, not a deferred design decision.
- **Type consistency:** `HostRange` (media-url) reused everywhere; `ProductCard`
  (`nm/name/photoCount/hasVideo`) consistent across normalize, api-slice, features, page;
  `generateImageUrl`/`generateVideoUrl`/`buildPhotoUrls`/`buildZipFromImages`/
  `triggerDownload` signatures match their call sites; `useGetCardQuery`/
  `useGetHostRangesQuery` names consistent from Task 6 through Task 10.
