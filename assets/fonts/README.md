# Optional: self-hosting the text fonts
The site's CSS names "Big Shoulders Display" (headings), "IBM Plex Sans" (text) and "IBM Plex Mono" (code). They are not bundled here, so readers see their system fonts unless the fonts are installed.
To self-host them (all three are SIL Open Font License):
1. Download the woff2 files, e.g. from https://fontsource.org (packages `@fontsource/big-shoulders-display`, `@fontsource/ibm-plex-sans`, `@fontsource/ibm-plex-mono`) and put them in this folder.
2. Create `assets/fonts/fonts.css` with one `@font-face` rule per file, for example:
```css
@font-face{font-family:"IBM Plex Sans";font-weight:400;font-style:normal;font-display:swap;src:url(ibm-plex-sans-latin-400-normal.woff2) format("woff2")}
```
3. Add `<link rel="stylesheet" href="assets/fonts/fonts.css">` to the `<head>` of `index.html` and `linear-algebra.html`.
