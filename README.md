# blue travels

A small, static travel journal for Markdown notes and a personal map of China.

Radio assets live together under `assets/radio/`: the two radio illustrations are in `images/`, and bundled recordings are in `audio/`. The player references local audio only. The map is bundled at `assets/maps/china-provinces-with-names.svg`; the source link in the page points back to Wikimedia Commons. Web fonts are still loaded from Google Fonts.

## Add a note

1. Drop a Markdown file into `posts/`.
2. Add its filename, title, place, and date to `posts/index.json`.
3. Deploy the folder to any static host (GitHub Pages, Netlify, Cloudflare Pages, etc.).

The homepage reads the first three entries from the manifest and renders their opening paragraph. The published map position is stored in `index.html` on `.map-visual` via `data-map-default-x`, `data-map-default-y`, and `data-map-default-scale`. Visitor edits are saved in that visitor's browser via `localStorage` and do not change the published default.

## Adjust the map locally

Open the map with `?edit-map=1` (for example, `http://localhost:8000/?edit-map=1`) to reveal the local editor. Drag the map to reposition it, drag a city label to reposition that marker, and use the size slider to adjust the map scale. Reset or clear the saved layout from the editor at any time. To publish a corrected map position, copy the resulting `x`, `y`, and `scale` values into the three `data-map-default-*` attributes on `.map-visual`, then deploy the changed `index.html`. The layout is otherwise stored only in that browser's `localStorage`.

## Adding a stop

For each new stop on the map:

1. Add or update a Markdown post in `posts/` and add its metadata to `posts/index.json`.
2. In `index.html`, add a city label inside `.map-visual` using the `.city` class. Adjust its `left` and `top` percentages in `styles.css` to place it on the map.
3. Extend the `.route-overlay` with a curved SVG `<path>` to connect the new city or cities. Keep the route dashed with `stroke-dasharray`.
4. Add a numbered `<circle>` and `<text>` on the route. Make the number link to the Markdown post by wrapping it in an SVG `<a>` element when the number needs to be clickable.
5. Add a matching linked entry in `.map-notes` on the right, with the same number and the post date.

The current first stop is Shenyang (沈阳) to Dalian (大连), footnote 1, dated `2026-10-21`.

## Check radio assets

Run `node --test test/radio-assets.test.js` to verify every song and ad referenced by the player exists, is non-empty, and has a recognizable audio-file header. The test intentionally fails while queued recordings have not been downloaded.

To resume the queued Commons downloads, run `node scripts/download-radio-assets.mjs`. It skips files already present, retries transient failures with backoff, and leaves the player on local assets only.
