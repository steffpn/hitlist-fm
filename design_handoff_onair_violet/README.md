# Handoff: onair.music — iOS Redesign (“Pulse / 2c Violet”)

## Overview
This package redesigns the existing **RadioBug** SwiftUI app (radio-airplay monitoring for
Artists, Labels, and Stations) into **onair.music** — a rebrand from the old teal theme to a
violet-purple **“Pulse”** direction: near-black violet base, **glassy translucent cards**,
a signature **circular airplay gauge**, the **Sora** typeface, and a coral-orange kept only as
the semantic “detection point” marker.

The redesign is **visual only** — no data model, networking, or navigation changes. All existing
ViewModels, APIClient calls, and the tab structure stay exactly as they are. You are re-skinning.

## About the design files
The files in this bundle (`onair iOS.dc.html` + `ios-frame.jsx` + `support.js`) are a **design
reference created in HTML** — a prototype showing the intended look, layout, and copy. **Do not
ship the HTML.** The task is to **recreate these designs in the existing SwiftUI codebase**
(`apps/ios/myFuckingMusic`) using its established patterns (SwiftUI views, the `Color` theme
extension, view modifiers, Swift Charts).

Open `onair iOS.dc.html` in a browser. It’s a horizontally-scrolling canvas of iPhone frames,
grouped into **turns**:
- **Turn 3 (top)** = the finalized direction applied across the app → **implement this**.
- Turn 2 = the three blue-purple shades (2c Violet was chosen).
- Turn 1 = the original four directions (Nocturne / On Air / Studio / Pulse).

Each frame has an id badge (e.g. `3a`, `3b`). Turn 3 screens: **3a Login · 3b Dashboard ·
3c My Songs · 3d Song detail · 3e Detections · 3f Settings.**

## Fidelity
**High-fidelity.** Colors, typography, spacing, radii, and component structure are final.
Recreate pixel-faithfully with SwiftUI. Only the six screens above are mocked, but the **design
tokens + components below define the whole system** — apply the same tokens to every remaining
screen (Label dashboard, Station dashboard, Competitors, Analytics, Insights, Add-song sheet,
Subscription, sub-settings, empty/loading/error states).

---

## The migration strategy (read this first)
The app already funnels every color through semantic tokens in
`Theme/RadioBugTheme.swift` (`Color.rbAccent`, `.rbBackground`, `.rbSurface`, …) and every card
through `RadioBugModifiers.swift` (`.rbCard()`). **~80% of the reskin is done by editing those two
files.** Then:

1. Swap the token hex values (table below). This instantly recolors every screen teal → violet.
2. Replace the card modifier with the **glass** recipe.
3. Register **Sora** and make it the default font; **IBM Plex Mono** for timestamps/ISRC/counts.
4. Fix the **button text color** (old style used black text on teal; violet needs **white**).
5. Build the **new components**: pulse gauge, restyled tab bar / now-playing bar, and the new
   **Login** brand screen.
6. Rebrand copy: **“RadioBug” → “onair.music”** everywhere (app name, Settings section header
   `"RadioBug"`, login).

---

## Design Tokens

### Color migration — edit `Theme/RadioBugTheme.swift`
Keep the token **names** (so no call sites change); replace only the hex values.

| Token | Old (teal) | New (onair Violet) | Notes |
|---|---|---|---|
| `rbBackground` | `#0A0A0A` | `#0A070E` | violet-tinted near-black app base |
| `rbSurface` | `#1A1A2E` | `#16121F` | solid fallback; prefer the glass modifier for cards |
| `rbSurfaceLight` | `#252540` | `#241C36` | borders / elevated fills |
| `rbSurfaceHighlight` | `#2D2D4A` | `#2E2442` | selected/active row (e.g. now-playing detection row) |
| `rbAccent` | `#00D4AA` | `#9A6DFF` | **primary interactive** — icons, active tab, links, play buttons |
| `rbAccentLight` | `#4DFFD4` | `#C4A5FF` | light accent text (LIVE label, “Premium”) |
| `rbAccentDark` | `#00A080` | `#7C5CF6` | gradient **start** / pressed state |
| `rbWarm` | `#FF6B35` | `#FF6B35` | **unchanged** — semantic “detection point” marker only |
| `rbWarmLight` | `#FFA06B` | `#FFA06B` | unchanged |
| `rbTextPrimary` | `#F0F0F0` | `#F3F1F6` | |
| `rbTextSecondary` | `#A0A0B0` | `#A8A2B6` | |
| `rbTextTertiary` | `#6B6B80` | `#8E86A2` | |
| `rbLive` | `#00FF88` | `#34D399` | up-trend green / “Live” dot |
| `rbError` | `#FF4757` | `#FF7B7B` | softer red (Log out) |
| `rbWarning` | `#FFB347` | `#FBBF24` | amber — PENDING status |
| `rbGradientStart` | `#00D4AA` | `#7C5CF6` | violet |
| `rbGradientEnd` | `#0066FF` | `#B84DF0` | magenta-purple |

**Add these new tokens** (used by the glass + gauge components):
```swift
static let rbAccentGradEnd  = Color(hex: "B84DF0")   // magenta end (== rbGradientEnd)
static let rbTextQuaternary = Color(hex: "726A84")   // dimmest labels / inactive tab
static let rbGlassTint      = Color.white.opacity(0.055) // card fill over material
static let rbGlassBorder    = Color.white.opacity(0.11)  // 1px hairline on glass
static let rbHairline       = Color.white.opacity(0.08)  // row dividers
static let rbDetection      = Color(hex: "FF6B35")   // alias of rbWarm, for clarity
```
The reusable brand gradient (already `LinearGradient.rbAccentGradient`) becomes violet→magenta
at **135°** (`topLeading → bottomTrailing`) for fills, `leading → trailing` for the now-playing
progress bar.

### The signature “glow” background
Dashboard, Login, and Song-detail sit on a radial violet glow over `rbBackground`. Add a
reusable background:
```swift
extension View {
    func onairGlow() -> some View {
        self.background(
            RadialGradient(
                colors: [Color(hex:"7C5CF6").opacity(0.42), Color(hex:"AF46F0").opacity(0.16), .clear],
                center: .init(x: 0.5, y: -0.05), startRadius: 0, endRadius: 430
            ).background(Color.rbBackground).ignoresSafeArea()
        )
    }
}
```
List screens (My Songs, Detections, Settings) use a **subtler** version (top opacity ~0.20,
smaller radius) so lists stay readable.

### Glass card — replace `RBCardStyle` in `RadioBugModifiers.swift`
```swift
struct RBCardStyle: ViewModifier {
    var radius: CGFloat = 22
    func body(content: Content) -> some View {
        content
            .padding(16)
            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: radius, style: .continuous))
            .background(RoundedRectangle(cornerRadius: radius, style: .continuous).fill(Color.rbGlassTint))
            .overlay(
                RoundedRectangle(cornerRadius: radius, style: .continuous)
                    .strokeBorder(Color.rbGlassBorder, lineWidth: 1)
            )
            // subtle top “shine”
            .overlay(alignment: .top,
                content: { RoundedRectangle(cornerRadius: radius, style: .continuous)
                    .stroke(Color.white.opacity(0.06), lineWidth: 1).blur(radius: 2).mask(
                        LinearGradient(colors: [.white, .clear], startPoint: .top, endPoint: .center)) })
    }
}
```
Radii: **hero/report cards 22**, secondary cards 18–20, artwork/tiles 10–12, list rows 16–18,
pills/buttons full (Capsule). All use `.continuous` corners.

### Typography — Sora (+ IBM Plex Mono)
Bundle **Sora** (400/500/600/700/800) and **IBM Plex Mono** (400/500) — add the `.ttf`s to the
target, list them in **Info.plist → `UIAppFonts`**. Sora replaces the system font *and* the old
`.rounded` numeric styling. Helper:
```swift
extension Font {
    static func sora(_ size: CGFloat, _ w: Font.Weight = .regular) -> Font { .custom("Sora", size: size).weight(w) }
    static func mono(_ size: CGFloat, _ w: Font.Weight = .regular) -> Font { .custom("IBMPlexMono", size: size).weight(w) }
}
```
Scale (pt / weight):
- Large nav title **30 / 700**, letter-spacing ≈ −0.6
- Screen/section titles 22 / 700; card headers 15–16 / 700
- Hero numbers (gauge, stats) **30–46 / 800** — for the “most-played count” and detail “342”,
  fill the text with the brand gradient (`.foregroundStyle(LinearGradient.rbAccentGradient)`)
- Body 13–14 / 400–600; secondary 12 / 500; caption 11 / 400–500
- Uppercase micro-labels (“AIRPLAY”, “MOST PLAYED”) 10 / 600, tracking ≈ 1.4pt, `rbTextTertiary`
- **Monospace** (IBM Plex Mono) for timestamps `0:18 / 0:30`, ISRC codes, and inline counts

### Spacing
Screen horizontal padding **16pt**. Vertical gap between cards **12–14pt**. Card inner padding
14–18pt. List-row inner padding 12–14pt. Tab bar: icon 24pt, label 10pt, ~26pt bottom safe area.

### Shadows
Cards rely on the glass border + material, not drop shadows. **Colored** shadows only on:
- CTA gradient buttons: `rbAccent.opacity(0.5)`, radius ~14, y ~8
- Song-detail artwork: `#7C5CF6.opacity(0.55)`, radius ~30, y ~14 (plus a soft black one)
- Login logo mark: `#7C5CF6.opacity(0.6)`, radius ~12, y ~10

---

## Global component changes

### Buttons — fix text color (`RadioBugModifiers.swift`)
`RBAccentButtonStyle` currently sets `.foregroundStyle(.black)` (fine on teal, wrong on violet).
Change primary CTA text to **white**. Primary CTA = violet→magenta gradient Capsule, white Sora
700. Secondary = `rbAccent.opacity(0.12)` fill + `rbAccent.opacity(0.4)` border, `rbAccentLight`
text (used for “Continue with invite code”).

### Tab bar (`Views/MainTabView.swift`)
The `UITabBarAppearance` already uses `Color.rbAccent` for the selected state, so it recolors to
violet automatically once the token changes; set `backgroundColor` to `rbBackground`. In the mocks
the bar reads as blurred dark glass — you may switch to `configureWithDefaultBackground()` for the
system blur. Selected icon+label `#9A6DFF`, unselected `#726A84` (`rbTextQuaternary`). Icons stay
SF Symbols: Dashboard `chart.bar.fill` (or the 3-bar mark), My Songs `music.note.list`,
Detections `antenna.radiowaves.left.and.right`, Settings `gearshape.fill`.

### Now-Playing bar (`Views/Shared/NowPlayingBar.swift`)
Keep all playback logic. Restyle: container = dark glass (`ultraThinMaterial` over
`rbBackground.opacity(0.72)`), 1px top hairline. Progress fill = **violet→magenta gradient**
(`leading→trailing`). Keep the **`rbWarm` detection marker** (2pt vertical bar at the 25s/30s
detection point) — it’s the one intentional warm accent. Waveform icon + time in
`rbAccent` / mono. Play-pause circle = `white.opacity(0.10)` bg, white glyph.

---

## Screens

### 3a — Login  (`Views/Auth/LoginView.swift`, and the `WelcomeView` entry)
- **Purpose:** authenticate; brand moment.
- **Layout:** vertically centered column, 26pt horizontal padding, over the **violet glow** bg.
- **Components (top→bottom):**
  - **Logo mark:** 66×66 rounded-square (radius 20) filled with the 135° violet→magenta gradient,
    centered SF Symbol `waveform` (white, ~30pt); colored shadow (see Shadows).
  - **Wordmark:** “onair” `rbTextPrimary` + “.” in `rbAccent` + “music” `rbTextTertiary`,
    Sora 700 / 27pt. Tagline “Know exactly where your music plays.” 14pt `rbTextSecondary`.
  - **Fields:** Email + Password. Glass inputs — fill `white.opacity(0.06)`, 1px `rbGlassBorder`,
    radius 14, 14×16 padding, placeholder `rbTextTertiary`. Uppercase 10.5pt label above each.
    Password field trailing eye icon; “Forgot password?” right-aligned `rbAccent` 12pt.
  - **Primary CTA:** full-width gradient Capsule-ish (radius 14), white “Log in” Sora 700.
  - Divider “or” (hairline + centered label).
  - **Secondary:** “Continue with invite code” — glass/outline button, lock icon, `rbAccentLight`
    text → routes to existing `InviteCodeView`.
  - Footer: “New here? **Create account**” (accent) → `RegisterView`.
- Replaces the old `person.circle` + teal button. No tab bar. Status bar light.

### 3b — Dashboard  (`Views/Artist/ArtistDashboardView.swift`)
- **Purpose:** artist home — today’s airplay at a glance.
- **Layout:** scroll over violet glow; 16pt padding. Order: app top-bar → “Dashboard” large title →
  **Airplay gauge card** → **Most played** card → **Weekly report** card. Now-playing + tab bar pinned.
- **Top bar (custom, replaces large nav title):** left onair.music wordmark; right a glass **LIVE**
  pill (accent dot + `rbAccentLight` label) + circular avatar (gradient, initial).
- **Airplay gauge card** (glass, radius 22, the hero — NEW component, see below): left = 88pt
  circular gauge, center “**142**” (Sora 800 23pt) + “TODAY”; right = “AIRPLAY” micro-label,
  “**968**” 30/800 + “this week”, and a green `▲ 12% vs yesterday` pill (`rbLive` on tinted bg).
  *(Maps the old two `statCard`s — Plays Today / Plays This Week — into one richer card.)*
- **Most played card:** crown glyph + “MOST PLAYED” micro-label; 52pt gradient artwork tile,
  song title (700/15) + artist (`rbTextSecondary`), right = play count in **gradient text** +
  “plays”. (Same data as existing `mostPlayedCard`.)
- **Weekly report card:** header “Weekly report” + “N songs”; rows = song title, `NNN plays` +
  green/gray trend pill, optional `New on <station>` line (accent, small antenna glyph), and the
  big count on the right (Sora 800). (Same data as existing `weeklyDigestSection`/`digestRow`;
  reuse `TrendBadge` recolored.)

### 3c — My Songs  (`Views/Artist/MonitoredSongsView.swift`)
- **Purpose:** the artist’s monitored catalog; tap → Song detail; “+” → Add-song sheet.
- **Layout:** large title “My Songs” + subtitle “N songs monitored”; trailing **+** button as a
  38pt gradient rounded-square (radius 12) instead of the old plain `plus.circle.fill`.
- **Song row** (glass, radius 18, 12pt padding): 46pt gradient artwork tile · title (600/14) +
  **status badge** (ACTIVE = `rbLive` on 16%-tint; PENDING = `rbWarning`; EXPIRED = tertiary) ·
  ISRC in **mono** `rbTextQuaternary` · stats line “342 plays · 14 stations” (`rbTextSecondary`) ·
  right column = trend pill + chevron. Keep the existing press-scale button style.
- Keep the **empty state** (music.note.list glyph, “No Monitored Songs”, gradient “Add Song” CTA) —
  restyle to violet.

### 3d — Song detail  (`Views/Detections/SongDetailView.swift` + `Views/Artist/SongAnalyticsView.swift`)
- **Purpose:** immersive song view with proof playback + analytics.
- **Layout:** immersive top **gradient** (violet → deep violet → `rbBackground`, top→bottom),
  scrollable, 24pt padding. Order: back/ellipsis glass circles → 184pt artwork (radius 18,
  gradient placeholder or Deezer art, colored shadow) → **Play Broadcast Proof** gradient Capsule
  (white, play glyph) → title/artist/album (centered) → **streaming links** row (Spotify/Deezer/
  YouTube round tinted icons) → **Play count** bar chart card → **Top stations** card → metadata
  tiles (ISRC mono, Total plays).
- **Play count chart** (`Views/Dashboard/PlayCountChartView.swift`): Swift Charts `BarMark`,
  bars filled with the violet→magenta gradient (top→bottom), 4pt corner radius; highlight the
  peak/last bar in a lighter violet. Plot bg transparent; axis labels `rbTextSecondary`.
- **Top stations** (`Views/Dashboard/TopStationsView.swift`): horizontal bars, violet→magenta
  `leading→trailing`, station label + count. In the mock these are simple bars — Swift Charts
  `BarMark` horizontal is fine.
- Keep the existing artwork/dominant-color loading + `PulsingModifier`. No tab bar (pushed view).

### 3e — Detections  (`Views/Detections/DetectionsView.swift`, `DetectionRowView`, `FilterChipsView`)
- **Purpose:** global live airplay feed with search + filters.
- **Layout:** large title “Detections”; trailing = **Live** indicator (green dot + label, driven by
  existing `connectionState`) + export glyph (`square.and.arrow.up`). Below: glass **search bar**
  (magnifier + “Search songs, artists, ISRC…”), then a horizontal **filter-chips** row.
- **Filter chips** (`FilterChipsView`): Capsules. Inactive = glass (`rbGlassTint`, `rbGlassBorder`,
  `rbTextSecondary`). **Active = `rbAccent.opacity(0.16)` fill + `rbAccent.opacity(0.5)` border +
  `rbAccentLight` text** (with an ✕ to clear). (Old code used `rbAccent.opacity(0.2)` — keep that
  pattern, just recolored.)
- **Detection row** (`DetectionRowView`): 48pt artwork thumbnail (radius 10; real Deezer art or
  gradient fallback) · title (600/14) + artist (`rbTextSecondary`) + station (`rbTextQuaternary`) ·
  right = relative time (mono/tertiary, top-aligned) + **play** circle (`rbAccent`, 30pt).
  The **currently-playing** row gets a `rbAccent.opacity(0.09)` rounded highlight and a
  pause glyph. Row dividers = `rbHairline`, inset to the text (leading ~68pt).
- Keep infinite scroll, SSE indicator, search debounce, export sheet — logic unchanged.

### 3f — Settings  (`Views/Settings/SettingsView.swift`)
- **Purpose:** account, preferences, plan, logout.
- **Layout:** large title “Settings”, then a **profile card** (glass, radius 20): 52pt gradient
  avatar + name (700/16) + email (`rbTextSecondary`) + role badge (`rbAccentLight` on tinted,
  bordered pill, e.g. “ARTIST”).
- **Grouped sections** (iOS inset style): uppercase `rbTextTertiary` header + a rounded container
  (`white.opacity(0.05)` fill, `rbGlassBorder`, radius 16) with rows separated by `rbHairline`.
  Each row = **30pt colored icon tile** (rounded-square, gradient/solid bg, white SF Symbol) +
  title (500/14.5) + optional detail (e.g. “Premium” in `rbAccentLight`) + chevron.
  - **Preferences:** Notifications (violet tile), Daily report (blue tile), Chart alerts (green
    tile). (Roles gate these exactly as today; Station shows “Competitor stations”.)
  - **Plan & billing:** Subscription → detail “Premium”, routes to `SubscriptionView`.
  - **Log out:** full-width soft-red button (`rbError` text on `rbError.opacity(0.1)`, radius 16).
  - Footer: “onair.music · version 1.0”. Rename the old section header **“RadioBug” → “onair.music”**.
  - Keep the Admin-only “View as role” section (recolored).

---

## New component: Airplay Pulse gauge
The dashboard hero ring. Reusable:
```swift
struct AirplayGauge: View {
    var value: Int            // e.g. 142 (plays today)
    var fraction: Double      // 0…1 fill (e.g. today ÷ personal best)
    var body: some View {
        ZStack {
            Circle().stroke(Color.white.opacity(0.10), lineWidth: 7)
            Circle()
                .trim(from: 0, to: fraction)
                .stroke(LinearGradient(colors: [Color(hex:"7C5CF6"), Color(hex:"B84DF0")],
                                       startPoint: .topLeading, endPoint: .bottomTrailing),
                        style: .init(lineWidth: 7, lineCap: .round))
                .rotationEffect(.degrees(-90))
            VStack(spacing: 2) {
                Text("\(value)").font(.sora(23, .heavy)).foregroundStyle(Color.rbTextPrimary)
                Text("TODAY").font(.sora(9, .semibold)).tracking(0.8).foregroundStyle(Color.rbTextTertiary)
            }
        }
        .frame(width: 88, height: 88)
    }
}
```
Animate `trim` on appear (`.easeOut`, ~0.7s) for a satisfying fill.

---

## Interactions & behavior
Unchanged from the current app — reuse all existing gestures/logic:
- Tap detection/song row → push detail; tap song in My Songs → `SongAnalyticsView`.
- Play buttons → `AudioPlayerManager.play(eventId:)`; Now-Playing bar seek gesture; detection
  marker at 25/30s.
- Pull-to-refresh, infinite scroll (load-more near last 5), search debounce 300ms, SSE live status.
- Add these **micro-animations**: gauge fill on appear; card press-scale (already on
  `SummaryCard`/`SongRow`, keep ~0.97); gauge/CTA colored shadows. Keep `.preferredColorScheme(.dark)`
  on dark screens.

## State management
No new state. All existing ViewModels (`ArtistDashboardViewModel`, `MonitoredSongsViewModel`,
`DetectionsViewModel`, `SongDetailViewModel`, `AuthViewModel`, `LiveFeedViewModel`,
`AudioPlayerManager`, `AuthManager`, `ImpersonationManager`) and API endpoints are reused as-is.

## Assets
- **Fonts (add to project + `UIAppFonts`):** Sora (400/500/600/700/800), IBM Plex Mono (400/500).
  Both are open-source (SIL OFL) — download from Google Fonts. *(In the HTML they load from the
  Google Fonts CDN; native must bundle the `.ttf`s.)*
- **Album artwork:** already fetched from Deezer at runtime (`DetectionRowView`, `SongDetailView`).
  Gradient tiles in the mock are **placeholders** for when art is missing — keep the existing
  fallback, recolored violet.
- **Icons:** SF Symbols throughout (waveform, crown.fill, music.note.list,
  antenna.radiowaves.left.and.right, bell, chart.bar.fill, gearshape.fill, creditcard, etc.).
  The SVG icons in the HTML are stand-ins for these SF Symbols.
- No raster/brand-image assets required. Update the app display name + icon to “onair.music”.

## Files

**In this bundle (design reference — open in a browser):**
- `onair iOS.dc.html` — the canvas of all screens/turns (implement **Turn 3 / 2c**).
- `ios-frame.jsx`, `support.js` — runtime needed to render the HTML; not part of the app.

**Codebase files to edit (target: `apps/ios/myFuckingMusic/myFuckingMusic/`):**
- `Theme/RadioBugTheme.swift` — swap token hex (table above) + add new tokens/gradient/glow.
- `Theme/RadioBugModifiers.swift` — glass `RBCardStyle`; button text → white.
- `App/…` + Info.plist — register Sora + IBM Plex Mono; set default font; rename app to onair.music.
- `Views/MainTabView.swift` — tab-bar tint/background.
- `Views/Shared/NowPlayingBar.swift`, `TrendBadge.swift` — restyle.
- `Views/Auth/LoginView.swift` (+ `WelcomeView`, `InviteCodeView`, `RegisterView`) — new brand entry.
- `Views/Artist/ArtistDashboardView.swift` (+ `AirplayGauge` new file) — gauge/most-played/report.
- `Views/Artist/MonitoredSongsView.swift` — song rows + “+”.
- `Views/Detections/SongDetailView.swift`, `Views/Artist/SongAnalyticsView.swift` — immersive detail.
- `Views/Dashboard/PlayCountChartView.swift`, `TopStationsView.swift` — chart gradients.
- `Views/Detections/DetectionsView.swift`, `DetectionRowView.swift`, `FilterChipsView.swift`.
- `Views/Settings/SettingsView.swift` — profile card, grouped sections, rebrand string.
- **Then apply the same tokens/components** to the un-mocked screens: Label (`LabelDashboardView`,
  `LabelArtistListView`, `StationAffinityView`, `ArtistComparisonView`), Station
  (`StationDashboardView`, `CompetitorListView`, `PlaylistOverlapView`, `RotationAnalysisView`,
  `DiscoveryScoreView`, `NewSongsView`), `AddSongSheet`, `SubscriptionView`, and the
  `LoadingView`/`ErrorView`/empty states.

## Suggested implementation order
1. Tokens + glass modifier + fonts + button fix → build & eyeball (whole app recolors).
2. Tab bar + Now-Playing bar.
3. Dashboard (+ AirplayGauge). 4. My Songs. 5. Detections. 6. Song detail (+ charts). 7. Settings + rebrand.
8. Login/auth. 9. Roll tokens across the remaining Label/Station/sheet/empty screens.
