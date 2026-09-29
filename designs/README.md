# Designs

Source-of-truth design exports from Claude, plus cleaned reference files extracted from them.
The actual design system distilled from these lives in
[`docs/design-system.md`](../docs/design-system.md) — read that first. Come here only when you
need pixel-level detail for a specific screen.

## Files

- **`coreobook (1).html`** — the brand/design-system reference ("coreobook v2.1"): logo geometry,
  color ramp, type rules, material recipe, signature elements, voice, do/don't. Open directly in
  a browser.
- **`Coreo App Screens (standalone) (1).html`** — the full 57-screen production export. This is a
  self-contained Claude Artifact bundle (compressed JS/JSX + fonts packed into one HTML file) —
  open it in a browser to view/interact with it, but don't try to read it as text; the real
  markup is gzip+base64-encoded inside a JS bundler shim.
- **`reference/screens-source.html`** — the same 57 screens, decompressed to plain, greppable
  HTML/CSS. Use this when you need to check exact styling for a specific screen. Each screen has
  a `data-screen-label="<code> <name>"` attribute (e.g. `data-screen-label="7a·1 Name"`) — search
  for the code or name to jump to it. `{{ placeholder }}` tokens mark spots that were dynamically
  rendered (waves, scores, `{{ userName }}`) in the original artifact; treat them as "dynamic
  content goes here", not literal text.
- **`reference/signature-elements.jsx`** — extracted rendering logic for the two signature data
  visualizations: the wave chart (solid past / dashed future / glowing "now" dot) and the
  dot-matrix hero numerals. Useful as an algorithm reference when implementing these in React
  Native (SVG path generation, dot-grid font map) — it won't run as-is (written against a DOM/web
  canvas runtime), treat it as a spec, not a library.

## How these were derived

The screens file is a Claude Artifact "standalone" export: an HTML shell that decompresses
embedded JS/JSX/font assets at load time in the browser. `reference/screens-source.html` and
`reference/signature-elements.jsx` were extracted once (base64-decoded + gunzipped) so future
work doesn't need to redo that — just read the reference files directly.

If a newer design export replaces the original files, re-extract by finding the
`<script type="__bundler/template">` tag's JSON-string content in the new file (that's the plain
HTML) and, within it, the `<script type="text/x-dc">` tag's contents (that's the signature-element
render logic).
