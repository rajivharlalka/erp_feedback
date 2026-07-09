# London Underground — Live 3D

An unofficial, open-source 3D visualization of live London Underground line status, built on Transport for London's Unified API.

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
web/          Vite + React + TypeScript frontend
              MapLibre GL + deck.gl + TanStack Query + Tailwind

server/       Express + TypeScript API proxy
              Caches TfL /Status (~45s) and /Route/Sequence (~12h)
              Aggregates lines + stations into one /api/network payload
```

The browser never talks to TfL directly (no CORS, and to keep the optional API key off the client). In production the Express server also serves the built frontend, so the whole app is one process.

## Quick start

Requires Node.js 18+.

```bash
npm install
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173). Vite proxies `/api` to the Express server on port 3001.

### Optional TfL API key

The app works anonymously (TfL allows ~50 requests/min without a key, and this server caches aggressively). To raise the limit to 500 requests/min, register at [api-portal.tfl.gov.uk](https://api-portal.tfl.gov.uk), then:

```bash
cp server/.env.example server/.env
# edit server/.env and set TFL_APP_KEY=...
```

### Production build

```bash
npm run build
npm start
```

Serves the app at [http://localhost:3001](http://localhost:3001).

## Adding another mode later

1. Add the mode id to `MODES` in [`server/src/config.ts`](server/src/config.ts) and `AVAILABLE_MODES` in [`web/src/hooks/useNetworkData.ts`](web/src/hooks/useNetworkData.ts).
2. Confirm `MODE_META` / `LINE_COLORS` already have entries for it (placeholders are already there for DLR, Overground, Elizabeth line, Tram, River Bus, Cable Car).
3. Drop an icon at `web/public/icons/<mode>.png` if you want a custom station glyph.
4. Remove the matching entry from the "soon" list in [`web/src/components/Sidebar.tsx`](web/src/components/Sidebar.tsx).

## Credits

- Live data: [Transport for London Unified API](https://api.tfl.gov.uk/) (open data)
- Basemap tiles & style: [OpenFreeMap](https://openfreemap.org/) / OpenMapTiles / OpenStreetMap contributors
- Map rendering: [MapLibre GL JS](https://maplibre.org/), [deck.gl](https://deck.gl/)

## License

This project is provided as-is for educational and personal use. TfL data is subject to [TfL's open data terms](https://tfl.gov.uk/info-for/open-data-users/).
