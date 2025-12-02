Design Match Notes

Computed Fonts & Fallbacks
- Body font used: `Times New Roman`, fallback `Times`, serif.
- Heading font used: `Georgia`, then `Times New Roman`, serif.
- If the reference OJS site used custom web fonts, this project falls back to the system serif stack listed above.

Type scale and sizes
- Base body font-size: `16px`.
- Site title: `1.25rem` (~20px).
- Article title: `1.02rem` (~16.3px).
- Widget headings: `1rem` (~16px).

Color tokens
- Link color: `#1a5a96` (used for primary navigation and article links).
- Accent / header background: `#f4f6f9`.

Notes on matching
- Exact OJS font files were not bundled; using system serif fonts provides the same typographic tone.
- If exact OJS webfonts are required, include font-face declarations and licensed font files or point to the OJS CDN.
