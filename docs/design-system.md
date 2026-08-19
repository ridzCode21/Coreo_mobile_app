# Design System — Coreo

**Status: populated from design source (v2.1 "The wave" / v2.0 "Sky").** Distilled from
[`designs/coreobook (1).html`](<../designs/coreobook%20(1).html>) (brand system) and
[`designs/Coreo App Screens (standalone) (1).html`](<../designs/Coreo%20App%20Screens%20(standalone)%20(1).html>)
(57 production screens). For pixel-level detail beyond what's summarized here, read
[`designs/reference/screens-source.html`](../designs/reference/screens-source.html) — see
[`designs/README.md`](../designs/README.md) for how to search it.

This is not final visual sign-off (the source screens themselves say so) — it's a real, detailed
system that should be implemented as described. If a later design pass changes something,
update this file and note it in §11 (changelog).

## 0. Brand essence (read this first)

Coreo is **"a health app with a core."** One AI-aware app reasoning across diet, fitness, and
wellness instead of three disconnected apps. The design language carries that idea literally:

- **The wave** is the mark — one continuous line, rising and falling. It's the logo, the app
  icon, and the shape every data reading takes (line charts are waves, never dials/gauges/rings).
- **Liquid glass on sky** is the material — translucent, blurred, floating panels over a
  gradient atmosphere that shifts with time of day.
- **One typeface, five weights (200–500), never heavier.** Numbers are always the visual heroes.
- **Voice is calm, first-person, evidence-cited, never alarmist.** No red, no shame, no hedging.

Everything below is the concrete implementation of that idea. If a new component doesn't fit
these rules, it's probably the wrong component, not an exception to add.

## 1. Color tokens

| Token                       | Hex                   | Role                                                                                                        |
| --------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------- |
| `ink`                       | `#17191D`             | Primary text, primary icon stroke                                                                           |
| `ink60`                     | `rgba(23,25,29,.62)`  | Secondary text                                                                                              |
| `ink40`                     | `rgba(23,25,29,.42)`  | Tertiary text, eyebrow labels                                                                               |
| `ink45`                     | `rgba(23,25,29,.45)`  | Screen/chip caption labels (very common in practice)                                                        |
| `label`                     | `#5F6B76`             | Muted caption/label color used inside light glass cards (e.g. field labels)                                 |
| `zenith`                    | `#EDF4FB`             | Atmosphere · highest/lightest (morning)                                                                     |
| `day`                       | `#D3E6F8`             | Atmosphere · high                                                                                           |
| `air`                       | `#9EC3E8`             | Atmosphere · mid                                                                                            |
| `sky`                       | `#7FA0C6`             | Atmosphere · mid                                                                                            |
| `dusk`                      | `#5D80A9`             | Atmosphere · low                                                                                            |
| `horizon`                   | `#466687`             | Atmosphere · low                                                                                            |
| `evening`                   | `#48678C`             | Night ramp                                                                                                  |
| `night`                     | `#2E4666`             | Night ramp · dark glass base                                                                                |
| `midnight`                  | `#152741`             | Night ramp · deepest                                                                                        |
| `coreBlue` / `coreBlueDeep` | `#35689E` → `#16395E` | **Primary action only** — one circular button per screen, max. Never on charts, tints, text, or decoration. |
| `white`                     | `#FFFFFF`             | Interactive glass, highlights, active states                                                                |
| `onNight`                   | `#EFF4F9` / `#F0F4F8` | Text/icon color on dark glass or night atmosphere                                                           |
| `success`                   | `#2F5D3A`             | Status tint · "on track" — always paired with a word, never used alone                                      |
| `attention`                 | `#7A5220`             | Status tint · "needs a look" — always paired with a word, never used as a raw error/red                     |

**Four laws of color** (from brand system, non-negotiable):

1. Atmosphere is time-aware: morning screens sit high in the ramp (`zenith`/`day`), evening
   screens sit deep (`horizon`/`evening`), lock-screen/notifications sit on `night`/`midnight`.
2. Sky colors are neutral. Meaning-color is reserved for `success`/`attention` tints, always
   paired with text, never alone.
3. Interactive surfaces are white glass.
4. `coreBlue` is the primary action — the one door on a screen. One per screen, maximum.

**Contrast constraints:** `ink` on `zenith`/light glass and `onNight` on `midnight` are ~14:1
(AAA). White on `dusk`/`sky` is only ~2.7–4.1:1 — **any text under 18px sitting directly on
mid-ramp atmosphere must sit on a scrim or glass surface**, never bare on the gradient.

## 2. Typography

**Single typeface: Poppins, weights 200/300/400/500 only — never 600+.** Hierarchy comes from
weight contrast within a size, not from adding more sizes or going bold.

| Token           | Size      | Weight           | Tracking                  | Use                                                                   |
| --------------- | --------- | ---------------- | ------------------------- | --------------------------------------------------------------------- |
| `display`       | 78–88px   | 200              | tight (−2 to −2.5px)      | Hero data numbers (rendered as dot-matrix, see §6), lock-screen clock |
| `heroMarketing` | 52–64px   | 200              | −1.5 to −2px              | Marketing/brand moments only                                          |
| `wordmark`      | 38px      | 300              | +6px                      | Logo wordmark exactly — never reuse this size for anything else       |
| `pageTitle`     | 34px      | 200(+500 accent) | −1px                      | Section/page headers                                                  |
| `questionTitle` | 30px      | 200(+400 accent) | −0.5px                    | Onboarding question headline                                          |
| `greeting`      | 26–28px   | 200(+400 accent) | −0.5px                    | "Morning, {name}." home greeting                                      |
| `cardValue`     | 22–24px   | 300              | normal                    | Stat values inside cards (age/height/weight, profile name)            |
| `sheetTitle`    | 25px      | 200              | −0.4px                    | Bottom-sheet titles (e.g. paywall)                                    |
| `bodyLg`        | 14–15px   | 300              | normal                    | Assistant responses, emphasized body text                             |
| `body`          | 13–13.5px | 300              | normal, line-height 1.85  | Default body copy                                                     |
| `bodySm`        | 12–12.5px | 300              | normal, line-height ~1.6  | Card descriptions, insight text                                       |
| `caption`       | 11–11.5px | 300–400          | normal                    | Chip text, secondary metadata                                         |
| `label`         | 10–10.5px | 500              | +1.6 to +2.6px, uppercase | Field labels, section eyebrows, nav captions                          |
| `micro`         | 8.5–9.5px | 500              | +1 to +1.6px, uppercase   | Tiny axis labels, timestamps inside charts                            |

Rules:

- Numbers are always the visual hero: oversized, weight 200, with a small quiet unit/label next
  to them — never the same visual weight as surrounding text.
- Type must scale with system font-size settings up to ~135% without truncating data — design
  layouts with room to grow, not fixed-height text containers around numbers.
- Never introduce a second typeface or a weight above 500.

## 3. Spacing & radius

**Screen padding convention:** horizontal `26px` (small variants use `22px`), top `64–76px`
(clears status bar + breathing room for a large title), bottom `30–40px`. Use safe-area insets
plus these as additional padding, not instead of them.

**Spacing scale** (use these, not arbitrary values):

| Token              | px                         |
| ------------------ | -------------------------- |
| `space.xs`         | 4                          |
| `space.sm`         | 8                          |
| `space.md`         | 12                         |
| `space.lg`         | 16                         |
| `space.xl`         | 20                         |
| `space.xxl`        | 24                         |
| `space.xxxl`       | 32                         |
| `screen.padX`      | 26 (22 on compact layouts) |
| `screen.padTop`    | 64–76                      |
| `screen.padBottom` | 30–40                      |

**Radius scale:**

| Token           | px                      | Use                                                                   |
| --------------- | ----------------------- | --------------------------------------------------------------------- |
| `radius.sm`     | 14–16                   | Small chips/tags                                                      |
| `radius.md`     | 20                      | Compact rows, small cards                                             |
| `radius.lg`     | 22–24                   | Standard glass card (default)                                         |
| `radius.xl`     | 26–30                   | Hero/primary glass card, nav dock                                     |
| `radius.pill`   | `height / 2`            | Any full pill button/bar — compute from actual height, don't hardcode |
| `radius.circle` | `50%`                   | Icon buttons, avatars, orb                                            |
| `radius.petal`  | 125 (outer corner only) | Petal-cluster cells, see §6                                           |

## 4. Material — "liquid glass on sky"

The single most important pattern in the system. Two variants:

### Light glass (default surface)

```
background: linear-gradient(135deg, rgba(255,255,255,.62) 0%, rgba(255,255,255,.2) 100%)
            // screens sometimes use 160deg, rgba(255,255,255,.34→.36) ... .14→.16 for a subtler card
backdrop-filter: blur(8–26px) saturate(1.35–1.7) brightness(1.05)
border: 1px solid rgba(255,255,255,.5–.7)
border-radius: 20–30px (see §3)
box-shadow: 0 16–28px 32–56px rgba(18,42,70,.1–.18),
            inset 0 1px 0 rgba(255,255,255,.65)   // top highlight
```

### Night/dark glass (hero cards, nav dock, chat surfaces, notifications)

```
background: linear-gradient(150–160deg, rgba(34,66,102,.5–.6) 0%, rgba(12,28,48,.62–.7) 100%)
backdrop-filter: blur(20–30px) saturate(1.7)
border: 1px solid rgba(255,255,255,.2)
color: #EFF4F9 / #F0F4F8
box-shadow: 0 20–24px 44–48px rgba(8,24,44,.3–.36), inset 0 1px 0 rgba(255,255,255,.2–.25)
```

**Laws of the material:** glass always floats on atmosphere, never on flat opaque color; light
should visually "pass through" (no opaque fills stacked inside a glass card); one dark/night
glass hero card per screen, maximum; ambient background blobs (radial gradients, `blur(30–40px)`,
slow drift) sit behind everything, respecting `prefers-reduced-motion`/reduced-motion settings.

### React Native implementation

RN has no `backdrop-filter`. Build the effect from primitives:

- **Blur:** `expo-blur`'s `<BlurView intensity={40-80} tint="light" | "dark">` as the card
  background layer. iOS gets a real blur; note Android blur quality/perf varies — test on a
  real mid-range Android device, and have a fallback (semi-opaque solid color, no blur) behind a
  capability check if it looks bad.
- **Gradient tint:** `expo-linear-gradient`'s `<LinearGradient>` layered on top of/instead of the
  blur for the color wash (the `rgba(255,255,255,.62→.2)` etc. gradients above).
- **Border:** a plain semi-transparent border color (`rgba(255,255,255,.5-.7)`) is a fine
  approximation of the web version's fancier gradient-mask border — don't chase the exact
  CSS `mask-composite` trick, it has no direct RN equivalent and isn't worth the complexity.
- **Shadow:** iOS via `shadowColor`/`shadowOffset`/`shadowOpacity`/`shadowRadius`; Android via
  `elevation` (Android shadows are always a flat gray-black — accept the platform difference
  rather than fighting it).
- Wrap this into one shared `<GlassCard variant="light" | "night">` primitive in
  `src/shared/components` — every screen consumes that, no screen hand-rolls blur/gradient/shadow
  props itself.

## 5. Motion

- **Ambient drift:** background blobs slowly translate/scale (`coreoDrift1/2/3`, ~20–30s
  ease loops) — implement with Reanimated `withRepeat`/`withTiming`, not JS-driven animation.
  Always gate behind a reduced-motion check (`AccessibilityInfo.isReduceMotionEnabled`).
  Skip entirely at first pass if not worth the perf budget — never a functional requirement.
  This background layer is decorative only and must never be required for legibility.
- **Presence pulse/breathe:** the assistant's listening rings pulse outward (`scale .9→1.3`,
  `opacity .7→0`, ~3s, ease-out, looping) — same reduced-motion gate.
- **Waves animate their "now" point** with a soft glow (see §6); everything to the right of "now"
  is dashed (future/projection), everything left is solid (past/actual).
- **Splash draw-in** (built — `features/splash/components/AnimatedSplash.tsx`): the wave logo
  draws itself via animated `strokeDashoffset` (~900ms ease-out), then a soft glow appears at its
  "now" point and the `coreo` wordmark fades in (~300ms) — Reanimated + `react-native-svg`, gated
  behind `AccessibilityInfo.isReduceMotionEnabled` (static logo + wordmark, no draw-in, when on).
  Minimum on-screen time ~1.2s regardless of animation speed. See implementation-plan.md §5.

## 6. Signature elements

These four elements are what make a screen feel like Coreo. Reference implementation logic in
[`designs/reference/signature-elements.jsx`](../designs/reference/signature-elements.jsx)
(algorithm reference only — written for a web canvas runtime, needs a real RN port).

1. **The wave chart.** Every time-series reading (stress, sleep, energy) renders as a wave, never
   a dial/gauge/ring — that's a hard rule. Solid stroke for past values, dashed stroke for
   projected future, a glowing dot at "now." Amplitude scales to the user's own last-30-days
   range, not a fixed axis. Implement with `react-native-svg` (`Path` with a `strokeDasharray`
   for the future segment) driven by Reanimated for the glow pulse.
2. **Dot-matrix numerals.** Hero scores (e.g. the daily Core Index) render as lit dots over a
   faint (10% opacity) unlit dot grid — a 5×7 dot-matrix font, not a text glyph. See the `FONT`
   map in the reference file for the exact dot patterns. Implement as SVG circles generated from
   that map; keep it a reusable `<DotMatrixNumeral value={78} color={...} cell={8} />` primitive.
3. **The petal cluster.** The home centerpiece: four rounded cells (Diet, Fitness, Wellness,
   Core) in a 2×2 grid inside a soft halo glow, each cell's **outer** corner swept to a 125px
   radius and its other three corners at 30px — one self, four sections, one shape. In RN, set
   `borderTopLeftRadius`/`borderTopRightRadius`/`borderBottomLeftRadius`/`borderBottomRightRadius`
   per cell based on its grid position (the corner facing away from the cluster's center gets
   125, the rest get 30). The "Core" cell is visually brighter/more opaque than the pillar cells.
4. **The presence orb.** The assistant's face during conversation: a small white luminous
   center (not `coreBlue` — white) inside 2–3 concentric listening rings and a soft halo, on a
   `night`-ramp background. Brightens/expands while listening, softens while speaking. Implement
   as layered absolutely-positioned circles (`View`s with `borderRadius: '50%'` or SVG circles)
   with a radial-gradient center (`expo-linear-gradient` doesn't do radial — use
   `react-native-svg`'s `RadialGradient`, or a stacked-circle approximation).

## 7. Core component inventory

All components below should be built once in `src/shared/components` and reused — no per-screen
reimplementation. "Source" references the screen codes in
[`designs/reference/screens-source.html`](../designs/reference/screens-source.html) (search by
the `data-screen-label` text shown).

| Component           | Spec                                                                                                                                                                                                                                                                                                                                                                                              | Source screens                                                                                                           |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `WaveMark`          | The wave logo (`react-native-svg` `Path`, exact path in `shared/components/WaveMark.tsx`), optional `coreo` wordmark alongside it                                                                                                                                                                                                                                                                 | app icon, splash, first-open, headers, empty states                                                                      |
| `GlassCard`         | Light/night glass container, see §4                                                                                                                                                                                                                                                                                                                                                               | nearly every screen                                                                                                      |
| `PrimaryIconButton` | Circular, 44–64px, `coreBlue` gradient fill, white icon, one per screen max                                                                                                                                                                                                                                                                                                                       | first-open CTA, onboarding confirm                                                                                       |
| `VoiceInputBar`     | Full-width night-glass pill (~60px tall): placeholder/typed text, circular mic button, circular white confirm/arrow button                                                                                                                                                                                                                                                                        | onboarding steps 7A1–7A8, chat entry points                                                                              |
| `SelectableChip`    | Pill, `radius.pill`; **selected** = white fill + shadow + weight 500; **unselected** = translucent glass + border + weight 300, `ink60` text                                                                                                                                                                                                                                                      | 7A2 goals, 12A1–12A6 diet interview, 16A/17A setup flows                                                                 |
| `ProgressDots`      | Row of 8 pill/dot segments; active = 24×4px white pill with glow, inactive = 10×4px `rgba(255,255,255,.45)`                                                                                                                                                                                                                                                                                       | all onboarding step screens                                                                                              |
| `SliderRow`         | Glass card containing: label + value header, track (`rgba(ink,.16)`), filled portion (`rgba(ink,.6)`), 18px white glowing thumb                                                                                                                                                                                                                                                                   | 7A3 about you (age/height/weight)                                                                                        |
| `ToggleRow`         | Full-width selectable row, `radii.xl` corners, ~70px min height, top sheen highlight, `cardValue` (18–20/300) title; `selectionMode: 'radio' \| 'check'` prop picks a dot (single-select) or check (multi-select) trailing mark on the same chassis — not in the original spec, promoted to shared after appearing 2×+ (see §12)                                                                  | 7A4 pillars, 7A5 sources, all 12A diet-interview single/multi cards                                                      |
| `ListRow`           | Row with title + muted subtitle on the left, chevron on the right, inside a light-glass card                                                                                                                                                                                                                                                                                                      | profile pillar summaries, connected devices                                                                              |
| `StatusChip`        | Small rounded label chip, translucent white or `rgba(255,255,255,.16)` on dark, `caption` text                                                                                                                                                                                                                                                                                                    | assistant action confirmations ("Fitness moved"), check-in preference tags                                               |
| `SegmentedControl`  | Glass track, active segment = white pill w/ shadow, others plain text                                                                                                                                                                                                                                                                                                                             | "pillar strip" home nav concept (23B) — see §8 for nav status                                                            |
| `BottomDock`        | Fixed 72px-tall night-glass bar, 4 icon+label columns, active item = dark filled circle behind icon                                                                                                                                                                                                                                                                                               | "glass dock" home nav concept (23A)                                                                                      |
| `PetalCluster`      | See §6.3                                                                                                                                                                                                                                                                                                                                                                                          | home centerpiece (24B and others)                                                                                        |
| `PresenceOrb`       | See §6.4                                                                                                                                                                                                                                                                                                                                                                                          | 18C presence / chat                                                                                                      |
| `WaveChart`         | See §6.1. Built in `shared/components/WaveChart.tsx`: animated solid (past) → dashed (future) stroke, glowing white "now" dot at the boundary, optional area fill under the solid segment, `reduceMotion`-aware. Promoted from the onboarding-only `OnboardingWaveStrip` (deleted) once a second use case (diet-profile completeness) needed the real signature treatment, not a decorative sine. | throughout (home "today" card, week review, lock-screen widget, onboarding Reading/Promise/Save/**Calibrating** screens) |
| `DotMatrixNumeral`  | See §6.2                                                                                                                                                                                                                                                                                                                                                                                          | hero score displays                                                                                                      |
| `NotificationCard`  | Compact night-glass card: small icon badge, eyebrow + timestamp, bold headline, body — reusable for in-app banners as well as the lock-screen widget layout                                                                                                                                                                                                                                       | 27A/27B lock-screen designs                                                                                              |
| `EmptyOrErrorState` | Icon (muted, in a small rounded frame) + short headline + one-line subcopy + one primary recovery action + a lighter-weight fallback link + a quiet footer note ("Nothing was logged yet") — **never a scary/red error screen**                                                                                                                                                                   | 25A/25B/25C honest failure states                                                                                        |
| `PaywallSheet`      | Bottom-sheet variant (partial, dismissible) and full-page variant; feature list as icon + two-line description rows; primary dark pill CTA + secondary "Not now" glass pill + a small trust-note footer                                                                                                                                                                                           | 26A/26B "Coreo Plus" — **flagged, see §9**                                                                               |

## 8. Navigation — decided

The design source explored **four different concepts** for primary (pillar) navigation. Decided:
**petal cluster is canonical.** The other three remain documented below for context (they may
resurface for a specific sub-case — e.g. a persistent way to reach a pillar from _inside_ another
pillar's screens, which the petal cluster alone doesn't solve since it's a Home-only centerpiece)
but should not be built as the primary navigation.

1. **Petal cluster (24B, the current "Sky" home) — canonical.** Static 2×2 flower-grid
   centerpiece on the Home screen itself; tapping a petal navigates into that pillar. Because
   this is a Home-only element, still decide (when building navigation) how a user gets back to
   another pillar or Home while already inside a pillar's screens — e.g. a header
   back-to-home affordance, or Expo Router's tab/stack structure underneath the visual
   centerpiece. That's an implementation detail for the `react-native-architecture` skill/§2 of
   `architecture.md` to resolve, not a re-opening of this decision.
2. **Glass dock (23A)** — persistent bottom tab bar, 4 items (Diet/Fitness/Wellness/Coreo home).
   Not canonical; kept as reference for the "how do I get back to a pillar" sub-case above.
3. **Pillar strip (23B)** — segmented control at the top of Home ("Today / Diet / Fitness /
   Wellness"), implies swipeable pages. Not canonical.
4. **Orb bloom (23C)** — a single central FAB that blooms into three orbiting pillar buttons
   around a center "Coreo" button on tap; hold to talk. Not canonical.

## 9. Flags: design/product-scope mismatches

Surfacing per `AGENTS.md` §8 — these exist in the design but conflict with current
`docs/product-context.md` MVP scope. Build the screens (they're designed), but gate the
underlying functionality behind the product decisions below rather than wiring them live:

- **26A/26B "Coreo Plus" paywall** — `product-context.md` §5 lists subscriptions/monetization as
  explicitly out of MVP scope. Treat as a real screen to have ready, but don't integrate real
  billing/entitlements until product scope changes.
- **21A/21B photo- and receipt-based food logging** — **now in MVP scope** as of 2026-07-26
  (`product-context.md` §5 scope-change note; feature-map.md flag F-N1). The nutrition Layer-1
  build wires photo (`/food/photo/`) and barcode (`/food/lookup/barcode/`) as first-class logging
  paths (14b). Note: 21A/21B's richer *per-ingredient* editable breakdown is **not** built — the
  photo API returns a single aggregate estimate, so the confirm screen (15a-style) edits the
  aggregate; the itemized treatment needs a backend change (flag F-N2). Receipt-specific OCR (21B)
  is still deferred — only the meal-photo path is built.
- **25A "couldn't read the plate"** is the error state for the photo-logging flow — now relevant
  (photo logging is built). Layer 1 surfaces the API's own 422/429 copy inline in the log sheet and
  falls back to manual entry; a dedicated full 25A screen can follow.
- **Net-new diet-interview screens (no design-source mockup).** Cuisine preference, activity
  level, budget tier, and health conditions are all real `diet-profile` API fields (§5 of
  `API_REFERENCE.md`) with no corresponding screen in the 57-screen export. Built in the
  established glass `ToggleRow`-card style (radio for single-select, check for multi-select) to
  match the rest of the 12A diet interview rather than inventing a different visual treatment —
  see `docs/onboarding-refinement-plan.md` Part B1 for the full mapping. Same for the
  **"calibrating your core"** wave-progress screen after the diet interview (Part C of that
  plan) — a new screen, not present in the design source, built from the signature `WaveChart`
  primitive.

## 10. Voice, content, and usage rules

(From the brand system — applies to all copy: UI strings, empty states, notifications, and
especially the AI assistant.)

**Always:** first person, 2–4 sentences, cites the user's own numbers, ends with one next step.
Never shames, never lectures, never claims false certainty (estimates are labeled as estimates).
Locked vocabulary: "your core" · "Core Index" · "pillars" · "Smart Insight" · "the notebook" ·
"the check-in."

**Never:** exclamation marks, emojis, pep-talk clichés ("You CRUSHED it!"), AI-disclaimer
boilerplate. The assistant observes and suggests — it never diagnoses or prescribes, and hands
acute situations to real care immediately and clearly.

**Do:**

- Map each screen's atmosphere to its time band (morning high in the ramp, evening deep, lock
  screens on night).
- Put any sub-18px text on a scrim/chip/glass surface when it sits over atmosphere directly.
- Show honest states: calibrating, stale data labeled stale, estimates named as estimates.

**Don't:**

- Use dials, gauges, or rings for any reading — waves only.
- Use `coreBlue` anywhere except the single primary action.
- Introduce saturated accents, red error states, font weights above 500, or a second typeface.

## 11. Responsiveness — phone sizes, tablet, and orientation

The design source is **phone-portrait mockups only**, authored at a single reference frame
(390×844 — iPhone 14/15/16-class, safe-area padding already baked into the `64–76px` top /
`30–40px` bottom screen padding in §3). There is no tablet or landscape design reference, so the
rules below are implementation guidance to fill that gap, not a translation of existing designs.
`product-context.md` §8 requires phone **and tablet** support with a responsive (not
bespoke-per-form-factor) layout — build accordingly from the start, not as a retrofit.

### 11.1 Phone size variance (portrait — the common case)

- Treat 390×844 as the base. Don't pixel-scale everything proportionally; instead:
  - Horizontal screen padding (`screen.padX`) stays fixed (26px) across phone sizes — don't
    shrink or grow it with screen width.
  - Vertical rhythm compresses gracefully on short screens (iPhone SE, 375×667) by making the
    main content area scrollable by default — **never** assume a fixed-height flex layout with
    a `flex: 1` spacer will always have room; that breaks first on the shortest supported device.
  - On larger phones (Pro Max class, 430×932+), don't stretch card widths edge-to-edge if it
    starts looking sparse — cap hero card width (e.g. a max width around 420–440pt) and center
    it, same as the tablet rule below, just with a larger cap.
- Test every screen at minimum on: a small phone (~375pt wide) and a large phone (~430pt wide),
  per the `responsive-ui` skill.

### 11.2 Tablet

Glass-card layouts tuned for ~390pt width don't just "stretch" to 768–1024pt tablet widths well.
Rules:

- **Default strategy — constrain, don't stretch:** cap main content width (roughly 480–560pt),
  center it with side gutters on larger screens. This preserves the tuned card proportions
  without a tablet-specific redesign of every card.
- **Progressive enhancement for specific screens, not a blanket tablet mode:** a few screens
  benefit from real multi-pane layouts on tablet width — e.g. Profile (list + detail side by
  side), a pillar home screen (persistent side rail instead of a bottom dock, once §8's
  navigation decision is made). Only build these where they clearly help; don't invent tablet
  layouts speculatively for screens that work fine constrained-and-centered.
- Tablets are more likely to be used in landscape than phones — see §11.3, the two concerns
  compound (tablet + landscape is the most common "wide" case to design for).

### 11.3 Landscape (explicit requirement)

Every screen must remain usable in landscape, not just avoid visually breaking. Concrete rules:

- **Scrollable by default.** Any screen currently laid out with `flex: 1` spacers assuming a
  tall viewport (most onboarding steps, Home) must wrap content in a scroll container so it
  doesn't clip or overlap when height drops in landscape. This is the single most important
  rule — audit every screen against it.
- **Reflow, don't just shrink, for content-heavy portrait-only patterns.** Specifically:
  - Onboarding steps (question + input/options stacked vertically) should switch to a
    **left/right split** (question on one side, input/options on the other) once the viewport is
    wider than it is tall — drive this off `useWindowDimensions()`, not a fixed device check.
  - The presence/chat screen (orb + transcript stacked vertically) should move the orb to one
    side and the transcript/actions to the other in landscape, rather than squeezing a
    full-height orb into a short viewport.
  - The bottom glass dock/nav bar stays anchored at the bottom in landscape (don't relocate it to
    a side rail purely for orientation — that's a tablet-width decision from §11.2, independent
    of orientation).
- **Decorative elements must not be viewport-fixed-pixel.** Ambient background blobs and other
  absolutely-positioned decoration are currently sized/positioned for 390×844; express their
  size/position relative to the container (`%`) or recompute from `useWindowDimensions()`, and
  clip them so they never overlap real content at any aspect ratio.
- **Lock-screen/notification designs (27A–27C) are OS-rendered**, not in-app layouts (iOS Live
  Activities / Android notifications, built later) — they're exempt from in-app responsive rules
  entirely.
- **Decide per-screen orientation policy explicitly**, don't leave it implicit: short,
  full-bleed, single-decision moments (e.g. the very first-open screen) may reasonably lock
  portrait; anything a user could plausibly stay on for a while (Home, chat, lists, profile) must
  support rotation.

### 11.4 Implementation pattern

Centralize this instead of scattering `Dimensions`/`useWindowDimensions` calls through screens:

- Add a `useResponsive()` hook in `src/shared/hooks` returning at least: current breakpoint
  (`compact` / `base` / `large` / `tablet`), `orientation` (`portrait` / `landscape`), and safe
  content max-width for the current size.
- Components that need to adapt layout (onboarding step template, the presence screen, any future
  split-pane screen) take an explicit layout mode derived from that hook
  (e.g. `layout: 'stacked' | 'split'`) rather than each component independently querying
  dimensions and re-deriving the same breakpoint logic.
- Add this to the `pr-review` checklist mentally for any new screen: does it scroll instead of
  clipping in a short/landscape viewport, and does it have an explicit (not accidental)
  orientation policy?

## 12. Changelog

- **v1 (this doc, current):** Populated from brand system v2.1 ("The wave") and the 57-screen
  Sky-era production export. Added responsiveness/tablet/landscape guidance (not present in the
  design source — implementation guidance to fill that gap). Flagged the open navigation-pattern
  decision (§8) and two design/product-scope mismatches (§9).
- **v1.1 (Phase 0/1 build):** Added `WaveMark` to the §7 inventory and the splash draw-in to §5
  motion, both now built. `GlassCard` gained the top-highlight approximation §4 called for.
  `ProgressDots`/`SelectableChip`/`PrimaryIconButton` built per §7 spec. See
  `implementation-plan.md` for the build plan these came from.
- **v1.2 (Phase 3 part 1 — onboarding core setup + save):** Built `VoiceInputBar`, `SliderRow`
  per §7 spec, plus a new `ToggleRow` (full-width selectable row — appears on 7A4/7A5, promoted to
  shared rather than reimplemented per-screen). Added `OnboardingStepScaffold` (feature-local
  chrome: gradient + `ProgressDots` + wave-glyph question header + footer slot) and two
  feature-local footer variants, `NextBar` and a decorative `OnboardingWaveStrip` (simplified
  stand-in for the full `WaveChart` in §6.1, used until real daily-summary data exists to drive
  it). 7A1–7A7 core setup and 8A save-your-core (register, incl. mocked Apple/Google buttons and
  an "Use email instead" real-schema form) are built; 7A8 Arrival and the 12A/16A/17A pillar
  interviews remain.
- **v1.3 (Phase 3 part 2 — diet interview + calibrating, `onboarding-refinement-plan.md`):**
  `ToggleRow` refined to match design exactly (`radii.xl`, ~70px, top sheen, `cardValue` type,
  `selectionMode: 'radio' | 'check'`); `SelectableChip` unselected state changed from flat fill
  to glass gradient. `OnboardingWaveStrip` **deleted**, replaced everywhere (Reading, Promise,
  Save) by the real `WaveChart` primitive built to full §6.1 spec (solid/dashed/glow-dot/area
  fill/animated). `OnboardingStepScaffold`'s progress dots are now parameterized
  (`{ index, total }` per flow) instead of hardwired to the 8-step core track, so the diet
  interview's own dot count renders correctly. Built the full D1–D10 diet interview
  (config-driven, see `feature-map.md`) and the new "calibrating your core" wave-progress
  screen — 4 of the 10 diet questions and the calibrating screen have no design-source mockup,
  flagged in §9.
- **v1.4 (design re-import audit — screen-by-screen pass against the re-synced source export):**
  Corrected drift found by comparing every built screen against the design source directly
  rather than against this doc's own summary of it. `ToggleRow`'s title text was hardcoded to
  the `cardValue` token (22px) — the real source uses 16px on Pillars (7a·4) rows and 14px on
  Sources (7a·5) rows, neither matching; added a `titleFontSize` prop (default 16) and set 14 on
  Sources. Sources rows were also using Pillars' taller/rounder chassis (`radii.xl`/~70px) instead
  of the source's more compact list-row treatment (`radii.md`/56px) — now passed explicitly.
  The diet interview's single-choice questions (12a·1 diet-type, 12a·4 who-cooks, 12a·5 meal
  rhythm, and the added cuisine/activity/budget screens) were rendered as full-width `ToggleRow`
  radio rows; the source renders all of these as wrapped, centered `SelectableChip` pills instead
  — corrected, and diet-interview chip grids (single/multi/mock-only) now center-justify to match.
  Diet-interview question titles were sharing core-setup's 30px `questionTitle` size; the source
  uses a tighter 25px/1.5-line-height for every 12a screen — added
  `onboardingTitleStyles.compact` for this. Promise's (7a·7) footer was a full-width night-glass
  `NextBar` plus a separate underlined "why dashed?" link; the source shows a small two-pill row
  ("Deal" primary + "Why dashed?" secondary) — rebuilt to match, keeping the inline-expand
  behavior for the explanation. Save's (8a) privacy note card used `radii.md` (20px); the source
  is 14px, closer to `radii.sm` — corrected.
  **Still open, flagged rather than silently changed** (interaction/product calls, not visual
  polish): (1) the source's 7a·2/7a·3/7a·4/7a·5/7a·6 footers pair a shortcut-chip row with a
  `VoiceInputBar`-style free-text bar; core setup collapses this to a single `NextBar` everywhere
  except the primary text-entry steps — a deliberate existing simplification (see `NextBar`'s own
  docstring) that this pass left in place pending a product decision on whether free-text goal/
  bio parsing is worth building. (2) 7a·8 Arrival (the petal-cluster "Enter Coreo" screen) is
  still unbuilt — already flagged inline in `lib/steps.ts`. (3) 12a·3 Target's source mockup has a
  large hero weight numeral plus a "Gently / Steady / Push me" pace selector with no corresponding
  `DietProfile` field (like D10's mock-only pattern) — not built; needs a decision on whether pace
  is worth capturing before adding the UI. (4) The source's "How do you eat?" (12a·1) options
  (Vegetarian/Vegan/Everything/No beef/Halal/Eggs are fine/Pescatarian/Jain/No pork) don't match
  the current `DIET_TYPES` enum (adds Keto/Low carb, drops several of the above) — left as-is since
  that enum is a backend contract (API_REFERENCE.md §5), not a client-only value to relabel.
- **v1.5 (follow-up, reported from an Android device):** `ToggleRow`'s selected-row text was
  hardcoded to weight 300 — the source uses weight 500 on selected Pillars/Sources rows, a visible
  gap between checked and unchecked states. Unselected row text was also using the `ink60` (62%
  opacity) token where the source uses ~80% opacity — noticeably fainter than intended. Added the
  design's missing white glow halo behind selected rows (the source has two box-shadows there — a
  dark drop shadow, already present, plus a soft white halo RN can't express on one view; added as
  a second outer wrapping view's shadow, iOS-only since Android shadows are always flat gray-black
  per §4). Root-caused the flat/boxy look reported on Android specifically: `expo-blur`'s
  `blurMethod` prop **defaults to `'none'` on Android** — no real blur at all, just a flat
  semi-transparent fallback — which stacked under the gradient overlay reads as a flat double
  rectangle rather than frosted glass. Set `blurMethod="dimezisBlurViewSdk31Plus"` on every
  `BlurView` in `GlassCard` and `ToggleRow` (real blur on SDK 31+, safe fallback to `'none'` below
  that) — this affects every glass surface in the app, not just Pillars/Sources, so worth
  retesting broadly on a real Android device.
- **v1.6 (confirmed on a live Android emulator — root cause was not the gradient at all):**
  v1.5's `blurMethod="dimezisBlurViewSdk31Plus"` change turned out to be a no-op: device logs
  (`adb logcat`) showed `expo-blur` warning that the method needs a `blurTarget` (via
  `BlurTargetView`) which isn't wired up anywhere in the app, so it was silently falling back to
  `'none'` exactly as before. The reported "blue box surrounding the option name" was that
  unconfigured native fallback view itself rendering as a narrower, hard-edged rectangle instead
  of filling the row — not a gradient or sizing issue in our styles. Fix: stop rendering
  `BlurView` on Android entirely in `GlassCard`/`ToggleRow` (gradient-only fallback, per §4's own
  "semi-opaque solid color, no blur" guidance) rather than depend on a blur backend that isn't
  actually configured. Verified by installing to a running Android emulator directly (`adb`) and
  screenshotting before/after — the boxed artifact is gone and selected/unselected rows now render
  as a smooth, uniform glass tint matching the design source. Wiring up `BlurTargetView` app-wide
  for real Android blur remains open as a future enhancement, not required for visual correctness.
- **v1.7 (onboarding v2 — value-first/signup-last, `onboarding-v2-flow-plan.md`):** Three
  reported-bug fixes plus a flow-level restructure, no new visual language:
  - **`SelectableChip`/`ToggleRow` resizing on tap** — root cause in both was mismatched vertical
    font metrics between the selected/unselected weight, not layout: `SelectableChip`'s
    `selectedText` was missing `textStyle('body')`'s pinned `lineHeight`, so Poppins-Medium's own
    default line box (shorter than Poppins-Light's explicit 1.85× one) made the whole pill visibly
    shrink the instant it was tapped. `ToggleRow` had the same class of bug between its
    selected/unselected title styles. Fixed by pinning an identical, explicit `lineHeight` to both
    states in each component — only `fontFamily`/`color` differ now, never the box.
  - **Slider crash on drag** — `SliderRow` was rebuilding its `Gesture.Pan()` on every render
    because every pixel of drag called `onChange` synchronously (`runOnJS`), and for
    store-backed callers that re-render triggered a fresh gesture object mid-touch. Rewritten to
    build the gesture once (`useMemo`), drive the visual fill/thumb/live-value from a UI-thread
    `useSharedValue` while dragging, and only call `onChange` once on release.
  - **Question copy sitting mid-screen instead of near the footer** — `OnboardingStepScaffold`
    moved its flexible spacer from _below_ the footer to _above_ the header. **Overcorrected, fixed
    in v1.8 below** — this dragged the title down to sit right on top of its answer instead of
    matching the design's actual layout (title high, answer low, big gap between).
  - **Flow restructure:** `GoalsScreen`/`SourcesScreen`/`ReadingScreen` deleted — `goal_type`
    became a direct, required diet-interview question (personalizes its own title with the user's
    name) instead of a derived heuristic from a separate goals screen, and Sources/Reading moved
    out of the required path entirely per the v2 plan's D1 decision. `about-you` gained a `gender`
    `SelectableChip` row (feeds the Mifflin-St Jeor mock estimate the same way age/weight already
    did) — **split into its own screen in v1.8 below**. The core-setup and diet-interview step
    sequencers merged into one ordered list (`features/onboarding/lib/steps.ts`'s `FLOW_STEP_IDS`)
    — see `architecture.md` §5.1. Account creation (8a Save) is now the **last** step of the
    interview, not a mid-flow gate before the diet questions; the whole draft (including an
    approximate `date_of_birth` derived from the age slider at commit time) is persisted locally
    (`onboardingStore` + Zustand `persist`/AsyncStorage) so the interview can resume after an app
    kill, and is written to the server in one register call plus one diet-profile `PUT`, not
    incrementally.
- **v1.8 (layout correction, from a direct design-vs-build screenshot comparison):**
  - **Header/body layout was backwards, not just "not spread out enough".** v1.7 read the design
    as "title sits low, right above its answer" and put the spacer _above_ the header to pull the
    whole title+body+footer cluster toward the bottom. The actual design (re-checked against the
    reference screenshots) keeps the question header pinned near the _top_, right under the
    progress dots, with a large empty gap before the answer/options and footer near the _bottom_ —
    the two are meant to be far apart, not clustered together. Fixed by moving
    `OnboardingStepScaffold`'s flexible spacer back to between the header and the body (header
    stays top-anchored with a fixed `marginTop`; body+footer anchor to the bottom via the spacer
    absorbing the slack between them) — the opposite of both the original bug and v1.7's fix.
  - **Gender split into its own screen.** Cramming a 4th input (a `SelectableChip` grid) onto
    `about-you` alongside three sliders didn't align cleanly against the corrected top/bottom
    template — a full chip grid and three full-width sliders don't share one "answer block" shape.
    Split into a new bespoke `gender` step (its own screen, own dot) directly after `about-you` in
    `FLOW_STEP_IDS`, styled like the diet interview's net-new chip screens (D3/D5/D8/D9) since it
    has no design-source mockup either.
  - **D2 "Anything your body refuses?" free-text bar removed for now** — the generic
    `DietQuestionScreen` was rendering a `VoiceInputBar` for `disliked_foods` free-text entry
    _above_ the screen's `NextBar`, i.e. two stacked glass pill bars on one screen. Not a spacing
    bug so much as a treatment this screen doesn't have a matching design for; removed the
    `freeAddField` config for D2 so only the `allergies` chip grid + one `NextBar` render, matching
    every other diet-interview screen's one-footer chrome. See `feature-map.md` F10.
- **v1.9 (nutrition Layer 1 — food logging + tracking):** First app-area (post-onboarding) feature.
  Built the Diet home (14a), Log-a-meal sheet (14b), and a 15a-style confirm/edit screen, plus the
  nutrition components (`MacroSummaryCard`, `LoggingOptionTile`, `LogMealSheet`, `FoodEntryRow`,
  `FoodSearchList`). Notes:
  - **Macro progress bars** on the night-glass `MacroSummaryCard` use white-glass fills
    (`rgba(255,255,255,.16)` track / `rgba(255,255,255,.6)` fill) — the night-surface analog of
    `SliderRow`'s documented ink track/fill (§6). Bars, never wave charts (§6.1 hard rule). If this
    treatment recurs, promote those two values to named tokens.
  - Over-budget calories render **neutrally** (the number can go negative) — never red, per the
    "nothing turns red here" voice (§10). The one `coreBlue` primary action per screen is the
    confirm "Looks right" / barcode "Look it up" button.
  - Photo + barcode logging moved into MVP scope (§9 update above, flag F-N1). `expo-image-picker`
    added as a dependency for camera capture (isolated to `features/nutrition/lib/photoCapture.ts`).
