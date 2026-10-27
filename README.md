# Cover Page Maker

A professional, form-based lab report and assignment cover generator by Fuad. Fill out either form to generate a print-ready PDF that matches its supplied template. Templates are never displayed to visitors; each is fetched only when its cover is generated. Developer-only coordinate previews are available at `?debug=1`.

## Run locally

The page fetches `Cover.pdf` or `Assignment_Cover.pdf` when a visitor generates a cover, so it must be served over HTTP rather than opened directly as a `file://` URL. In Visual Studio Code, open this folder and use the **Live Server** extension's **Open with Live Server** command on `index.html`.

The PDF export library is loaded from jsDelivr, so an internet connection is required.

## Files

- `index.html` — semantic website and form
- `style.css` — responsive styling and design tokens
- `script.js` — form handling, local persistence, validation, and PDF generation
- `Cover.pdf` — original one-page template (kept unchanged)
- `Assignment_Cover.pdf` — assignment cover template

Lab report field positions are collected in `FIELDS` and assignment positions in `ASSIGNMENT_FIELDS` in `script.js`. Both use 924 x 1308 reference coordinates measured from the top-left corner. To view either template with coordinate overlays while tuning positions, open the site with `?debug=1`.
