# Game of Thrones Episode Guide (Unofficial)

A simple, offline-ready web app that lists every season + episode with short **original** summaries.

## Run it

### Quickest (no install)
- Open `index.html` in your browser.

> Note: Some browsers restrict PWA/offline features on `file://`.

### Recommended (for offline install / “Install” button)
Use a local web server from this folder, e.g.:

- Python: `python -m http.server 5173`
- Node: `npx serve .`

Then open:
- `http://localhost:5173/`

## Images

All images in `assets/` are safe placeholder SVG artwork (not screenshots).

- Season headers: `assets/season-*.svg`
- Episode images: `assets/episodes/s<season>-e<episode>.svg`

You can replace them with your own images if you have rights to use them.

## Spoiler levels

Use the Spoilers control in the toolbar:

- Hidden: hides summaries by default (you can reveal per-episode)
- Teaser: shows a short teaser extracted from the summary
- Full: shows the full summary
