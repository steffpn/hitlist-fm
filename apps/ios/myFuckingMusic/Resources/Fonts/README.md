# Fonts (onair.music)

Bundled and registered automatically — no action needed.

- **Sora.ttf** — variable font (Thin→ExtraBold), the UI typeface (`Font.sora`). Family: "Sora".
- **IBMPlexMono-Regular.ttf** / **IBMPlexMono-Medium.ttf** — timestamps / ISRC / counts
  (`Font.mono`). Family: "IBM Plex Mono".

They are in the target's Copy Bundle Resources; `AppDelegate.registerBundledFonts()` registers
every bundled `.ttf` at launch via CoreText (this target uses a generated Info.plist, so no
`UIAppFonts` entry is needed). Source: Google Fonts (SIL OFL). To add more weights, drop the
`.ttf` here and add it to the target.
