# Interactive figures for Chapter 1 (Matrix Algebra)

Nine self-contained HTML figures plus a gallery page. No build step, no dependencies, no internet needed.
Everything works from `file://`, from GitHub Pages, and inside an `<iframe>`.

```
figures/
  index.html            gallery (links, "Try this" blurbs, preview buttons)
  transformations.html  composition.html   cancellation.html
  matrix-product.html   matrix-image.html  symmetric-skew.html
  truss.html            springs.html       robot-arm.html
  assets/kai.css        shared theme (colours, controls, light and dark)
  assets/kai.js         shared helpers (SVG plane, draggable handles, sliders, matrices)
  assets/kai-host.js    include on the page that embeds figures; sizes the iframes
  kaifigure.tex         LaTeX macro: iframe in HTML, QR code + link in the PDF
```

## 1. Publish on GitHub Pages

1. Create a repository, copy the `figures/` folder into it (keep the `assets/` subfolder next to the HTML files).
2. Settings, Pages, "Deploy from a branch", branch `main`, folder `/ (root)`.
3. After a minute the gallery is at `https://YOURNAME.github.io/YOURREPO/figures/`.

Each figure is an ordinary page, so you can also link to it directly: `.../figures/truss.html`.

## 2. Embed a figure in an HTML page

```html
<div class="kai-embed">
  <iframe src="figures/truss.html?title=0" title="Forces in a truss" loading="lazy" height="760"></iframe>
</div>
<script src="figures/assets/kai-host.js"></script>   <!-- once per page -->
```

`kai-host.js` receives the figure's real height and resizes the iframe, so there is no inner scrollbar when the
reader's screen is narrow. Suggested CSS for the host page:

```css
.kai-embed iframe { width: 100%; border: 1px solid #cbd5e1; border-radius: 12px; }
```

URL options: `?title=0` hides the figure's own heading (use it when the book caption already says what it is);
`?theme=light` or `?theme=dark` forces a theme (default: follows the reader's system).

## 3. From the LaTeX book

Add `kaifigure.tex` to `kainotes.sty` (or `\input` it) after `\dynlink`, and set `\kaibaseurl` to your Pages address.

```latex
\kaifigure[760]{truss}{Forces in a truss}{Explore the truss online}
%            ^height  ^file   ^accessible title   ^text shown in the PDF
```

* In the **PDF** you get a QR code and a link to `\kaibaseurl truss.html` (uses your existing `\dynlink`).
* In the **HTML** (make4ht) you get the iframe. The macro tests `\ifdefined\HCode`.

The PDF branch was compile-tested here (pdfLaTeX; the links point where they should). The HTML branch is **not tested**:
TeX4ht is not installed in my workspace, so I have not seen make4ht emit the iframe. If the `<iframe>` does not appear in the
generated HTML, send me the make4ht log and the snippet of output and I will adjust the macro. As a fallback you can always
paste the iframe snippet from section 2 into the generated page by hand.

### Where each figure goes in `c1.tex`

| Figure | File | Place after | Height |
|---|---|---|---|
| 1 | `transformations` | the section "Matrices as Transformations of the Plane", after its first example | 620 |
| 2 | `composition` | "Real Numbers vs. Matrix Operations", where `AB != BA` is shown | 700 |
| 3 | `cancellation` | the same section, at the cancellation-law remark | 720 |
| 4 | `matrix-product` | "Matrix Multiplication", after Falk's scheme figure | 900 |
| 5 | `matrix-image` | Introduction, after the pixel figure; mention again under "Scalar Multiplication" | 900 |
| 6 | `symmetric-skew` | "Special Types of Square Matrices", after the symmetric-plus-skew theorem box | 820 |
| 7 | `truss` | "Statics: Forces in a Truss", after the example box | 760 |
| 8 | `springs` | "Mechanics: Coupled Springs", after the three-equal-springs example | 900 |
| 9 | `robot-arm` | "Rotations and Robot Arms", after the worked tip position | 760 |

## 4. What each figure checks against the book

* **transformations**: columns of A are the images of i and j; the readout gives det, orientation, rank and Ax.
* **composition**: default A = rotation 90 deg, B = horizontal shear 1 gives AB = [[0,-1],[1,1]] and BA = [[1,-1],[1,0]].
* **matrix-product**: text example [[1,2],[3,4]] times [[5,6],[7,8]] = [[19,22],[43,50]].
* **truss**: f1 = -P cos(t2)/sin(t1+t2), f2 = -P cos(t1)/sin(t1+t2), f3 = P cos(t1)cos(t2)/sin(t1+t2), det E = -sin(t1+t2). For 30, 60 deg and P = 10: f = (-5, -8.66, 4.33).
* **springs**: k = 100 for all, F2 = 30 gives x = (0.1, 0.2).
* **robot-arm**: L1 = L2 = 1, 30 and 60 deg gives p = (sqrt(3)/2, 3/2).
* **symmetric-skew**: A = [[1,2],[4,3]] gives S = [[1,3],[3,3]], K = [[0,-1],[1,0]].

The figures are plain JavaScript, so the numbers are computed by the same formulas students see in the text.

## 5. Notes and open items

* **Index convention.** The figures write the product as c_ij = sum over k of a_ik b_kj (the usual convention). The text of `c1.tex` currently writes c_ik = sum over j of a_ij b_jk. Both are correct; I suggest changing the text so the page and the figure agree.
* **Accessibility.** Every handle is reachable with Tab and moves with the arrow keys (Shift = 5 times larger steps). Results are announced in a polite live region, colour is never the only cue (tension/compression carry the letters T and C, clipped pixels carry a wavy underline), and animation is switched off for readers with "reduce motion" set.
* **Library choice.** The figures use a small shared SVG helper (`kai.js`) instead of JSXGraph or GeoGebra, so that they look identical to the book, stay accessible, and load instantly. They are ordinary HTML/JS: you or an AI assistant can edit them freely.
* **To add a new figure**, copy the smallest one (`symmetric-skew.html`), keep the two `<link>`/`<script>` lines for `assets/`, and add a row to the list in `index.html`.
