# Fonts (onair.music)

The design uses **Sora** (UI) and **IBM Plex Mono** (timestamps / ISRC / counts).
Both are open-source (SIL OFL). Add them so `.sora()` / `.mono()` stop falling back to system:

1. Download the **.ttf** files:
   - Sora — https://fonts.google.com/specimen/Sora  (weights 400/500/600/700/800)
   - IBM Plex Mono — https://fonts.google.com/specimen/IBM+Plex+Mono  (weights 400/500)
2. Drop the `.ttf` files into THIS folder.
3. In Xcode: drag them into the project navigator → check **"Copy items if needed"** and
   **target membership: myFuckingMusic**. No Info.plist edit needed — `AppDelegate` registers
   every bundled `.ttf` at launch (CTFontManager).
4. Font names used in code: family **"Sora"** and **"IBMPlexMono"** (Font.sora / Font.mono).
