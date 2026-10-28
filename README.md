# Mathematics for Engineers (offline build, recommended for GitHub)
Static site. All mathematics is **pre-rendered with KaTeX 0.16.45** at build time: no MathJax, no CDN, no request to any other site. The pages work offline, can be opened from disk, and load faster. KaTeX's stylesheet and fonts are in `assets/katex/`. Text fonts fall back to the reader's system fonts; see `assets/fonts/README.md` to self-host Big Shoulders Display and IBM Plex.

## Publish on GitHub Pages
1. Create a repository and upload the contents of this folder (keep the folder structure). The GitHub web page accepts about 100 files per upload, so upload in two batches: first the `assets` folder (79 files), then everything else; or use GitHub Desktop, which has no such limit.
2. Settings → Pages → Build and deployment → Deploy from a branch → `main` / `(root)`.
3. The site appears at `https://<user>.github.io/<repository>/`. All links are relative, so it also works under a sub-path.
4. For the license, open `LICENSE` on GitHub, or use *Add file → Create new file → LICENSE → Choose a license template → Creative Commons Attribution Share Alike 4.0* to replace it with the official full text.

## Layout
- `index.html` – home page; `linear-algebra.html` – the linear-algebra notes; `analytic-geometry.html` – vectors, lines, planes, conics and quadrics (all figures included; interactive versions later)
- `interactives/index.html` – **one hub page** with all interactive tools: 9 quick demos (Part 1) and 9 interactive figures (Part 2)
- `interactives/figures/` – the nine interactive figures as stand-alone pages (`truss.html`, `springs.html`, ...) with `assets/` (shared CSS/JS), a gallery `index.html`, the LaTeX macro `kaifigure.tex` and its own `README.md`
- `assets/figures/linear-algebra/` – static figures (PNG), named after the figure label (`lines-a.png` = figure "lines", panel a)
- `pdf/linear-algebra.pdf` – the PDF of the notes
- `LICENSE`, `.nojekyll`

## Editing note
`linear-algebra.html` contains pre-rendered math, so edit formulas in the LaTeX/Markdown source and rebuild instead of editing the HTML by hand.

## License
The notes, figures and interactive tools are © 2026 Kaveh Eftekharinasab and licensed under
[Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)](https://creativecommons.org/licenses/by-sa/4.0/).
You may share and adapt them, also commercially, if you give credit and distribute your changes under the same license.
See `LICENSE`. KaTeX (`assets/katex/`) is MIT-licensed and keeps its own license file.
