# Opaque color-pair contrast check

The optional scripts/contrast_pairs.py accepts a local JSON array of up to 1000 objects, at most 256 KiB. Each object has exactly foreground, background and threshold. Colors are opaque #RRGGBB sRGB strings. Threshold is a finite JSON number from 1 through 21. No networking, dependency installation, file mutation or automatic color replacement occurs.

```json
[
  {"foreground":"#000000","background":"#FFFFFF","threshold":4.5}
]
```

Output reports the calculated ratio and whether the supplied threshold is met for each input pair. Comparison uses the unrounded ratio. Exit 0 means all supplied pair checks pass; 1 means at least one fails; 2 means invalid input. This is a mechanical pair check, not an accessibility conformance report.

The calculation follows [W3C relative luminance and contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html): convert sRGB components to linear light, combine their weighted luminance, then divide the lighter-plus-offset by the darker-plus-offset. Review the applicable criterion for text size, use and exceptions instead of assuming a caller-provided threshold is appropriate. Logos and other particular uses can have different applicability.

The helper does not parse documents or determine rendered text size, alpha compositing, gradients, images, blend modes, display color management, focus states or other accessibility properties. Verify actual rendered applications separately. In a Markdown-only host, calculate the same opaque-pair values with assigned tools or report the missing execution capability; do not fetch a remote replacement automatically.
