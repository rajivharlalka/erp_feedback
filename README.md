# London Underground — Live 3D

An unofficial, open-source 3D visualization of live London Underground line status, built on Transport for London's Unified API and deployed as a **Next.js** app.

Tube lines are drawn as elevated paths over a pitched MapLibre map of London. Stations float above the city on thin stems — the worse the service, the higher they rise. Status colors (green / amber / orange / red) mirror what Tube customers see on the TfL site.

> This is a fan-built visualization and is **not affiliated with Transport for London**.

## Features

- Live status for all 11 Underground lines, polled every ~45 seconds
- 3D MapLibre basemap (OpenFreeMap liberty style with building extrusions)
- deck.gl overlay: route paths + station markers elevated by disruption severity
- Sidebar with per-line status chips; click a line to fly the camera to it
- Mode-generic architecture — DLR, Overground, Elizabeth line, Tram, River Bus, and Cable Car are stubbed as "soon" and can be enabled by flipping a config array

## Architecture

```
app/                 Next.js App Router
  api/network        Route Handler — proxies + caches TfL Unified API
  api/health         Health check
  page.tsx           Client map UI (dynamic import, no SSR for WebGL)

lib/                 Shared TfL client, cache, severity, types
components/          Header, Sidebar, Legend, MapView, …
map/                 deck.gl layer builders
```

The browser never talks to TfL directly (no CORS, and to keep the optional API key off the client). `/api/network` runs on the server (Node runtime) and caches status (~45s) and route geometry (~12h).

## Quick start

Requires Node.js 18+.

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

### Optional TfL API key

The app works anonymously (TfL allows ~50 requests/min without a key, and this app caches aggressively). To raise the limit to 500 requests/min, register at [api-portal.tfl.gov.uk](https://api-portal.tfl.gov.uk), then:

```bash
cp .env.example .env.local
# edit .env.local and set TFL_APP_KEY=...
```

### Production build

```bash
npm run build
npm start
```

## Deploy to Vercel

1. Push this repo to GitHub (already done on this branch).
2. Import the project at [vercel.com/new](https://vercel.com/new).
3. Framework Preset: **Next.js** (auto-detected). Leave build/output defaults.
4. Optional: add `TFL_APP_KEY` under Project → Settings → Environment Variables.
5. Deploy.

Or from the CLI:

```bash
npx vercel
# production:
npx vercel --prod
```

## Adding another mode later

1. Add the mode id to `MODES` in [`lib/config.ts`](lib/config.ts) and `AVAILABLE_MODES` in [`hooks/useNetworkData.ts`](hooks/useNetworkData.ts).
2. Confirm `MODE_META` / `LINE_COLORS` already have entries for it (placeholders are already there).
3. Drop an icon at `public/icons/<mode>.png` if you want a custom station glyph.
4. Remove the matching entry from the "soon" list in [`components/Sidebar.tsx`](components/Sidebar.tsx).

## Credits

- Live data: [Transport for London Unified API](https://api.tfl.gov.uk/) (open data)
- Basemap tiles & style: [OpenFreeMap](https://openfreemap.org/) / OpenMapTiles / OpenStreetMap contributors
- Map rendering: [MapLibre GL JS](https://maplibre.org/), [deck.gl](https://deck.gl/)
- Framework: [Next.js](https://nextjs.org/)

## License

This project is provided as-is for educational and personal use. TfL data is subject to [TfL's open data terms](https://tfl.gov.uk/info-for/open-data-users/).
