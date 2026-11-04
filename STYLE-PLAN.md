 # Style plan: apply the mockups to Attendance SAS

Source: the three PDFs in `docs/Mockups/` (`Mockups Student UI.pdf` 42 pages, `Mockups Student Lecturer.pdf` 27 pages, `Mockups Admin UI.pdf` 29 pages). Pages alternate: odd pages are the desktop web layout, even pages the phone layout. Student UI page 1 is the style sheet. Written 2026-11-03. Phases 0 to 10 of `PLAN.md` are built as an unstyled prototype; this plan only changes how it looks, never what it does.

## Primary goal

A student, lecturer or admin opens the app on a phone or in a browser and sees the friendly, rounded, blue-branded design from the mockups on every screen they use, while everything they could do before still works exactly as before.

---

## Phase 0: Documentation discovery (done)

**How this serves the primary goal:** It fixes the exact colours, sizes and layouts to copy, and the APIs that really exist in Expo SDK 58, React Native 0.88 and NativeWind 4.2.7, so later phases copy instead of guess.

### Design facts taken from the mockups (Student UI p1, plus screens)

| Token | Value | Use |
|---|---|---|
| Primary | `#015C93` (1 92 147) | Brand, buttons, links, Live |
| Primary dark | `#0A4570` (10 69 112) | Banners, gradients |
| Primary tint | `#EAF3FA` (234 243 250) | Active nav, Upcoming |
| Cream | `#FFF3DF` (255 243 223) | Class artwork background |
| Present (green) | `#159357` (21 147 87) | On time |
| Late (yellow) | `#FCC101` (252 193 1) | Late; dark text on it |
| Absent (red) | `#C24753` (194 71 83) | Absent, errors, Sign out |
| Text | `#101828` (16 24 40) | Headings and body |
| Muted | `#667085` (102 112 133) | Secondary text |
| Border | `#E4E7EC` (228 231 236) | Dividers, inputs |
| Background | `#F4F6FA` (244 246 250) | App canvas |

- **Font:** Inter (Google Fonts), fallback `system-ui`. Scale: Title 24 Bold, Section 17 Bold, Card 15 Semibold, Body 14 Regular, Meta 13 Regular, Label 12 Semibold (labels are upper case, spaced).
- **Shape:** cards radius 20, inner blocks 14, buttons 12, pills fully round. 4 px grid (8, 12, 16, 20, 24, 32). Card shadow `0 6px 20px rgba(16,24,40,.06)`, card padding 12 to 22.
- **Buttons:** height 44 (52 large on mobile), one primary per screen. Variants seen: primary (blue, optional check icon), secondary (white, blue outline, optional icon), plain text (Cancel), danger (red, Sign out), disabled (grey, "Check in opens 12:50").
- **Status pills:** Session: Live (solid blue with dot), Upcoming (tint), Finished (grey), Rescheduled (cream), Cancelled (grey, struck). Attendance: Present, Late, Absent, Not checked in. "Status is always written in words; colour supports the word, it never replaces it."
- **Charts:** donut ring with the percentage in the middle (89% overall, 75% session, 64% class below 75% in red), thin progress bars in tables (`21/24`).
- **Class artwork:** abstract shapes (rings, rounded bars, circles) in the four brand colours on cream; four patterns, each class gets one so cards are easy to tell apart.
- **App mark:** a tick with a beacon signal, in a blue rounded square. Name shown: **Attendancely**.
- **Inputs:** 44 high, radius 12, border `#E4E7EC`; error state red border plus a red message; error banner (red tint, icon, message, "View booking" and "Dismiss").
- **Navigation:** phone: bottom tab bar (Home, Classes, Calendar, Profile; Admin for admins), active item in blue with label. Desktop: left sidebar with the app mark, group labels `OVERVIEW` (Home, Classes, Calendar, Admin) and `ACCOUNT` (Profile, red Sign out), a top bar with page title, bell and user chip (initials, name, role). Phone top: initials avatar, date, "Hi, [First name]", bell.
- **Colour modes:** the mockups are light only. No dark theme is drawn.

### Screen inventory (page numbers in the three PDFs)

| Screen | Student UI | Lecturer/Student | Admin UI |
|---|---|---|---|
| Sign in, check email, link expired, set up check-in | 2 to 8 | | |
| Home | 9, 10 (also 11 to 14 variants) | 1, 2 | 1 to 3 |
| Classes, class details | 15 to 20 | 3 to 8 | 6 to 9 |
| Calendar | 21 to 25 | 24, 25 | 4, 5 |
| Session details (Live, Upcoming, Finished, Cancelled) | 26 to 32 | 9 to 15 | 10, 11 |
| Check in (searching, failed, success) | 33 to 38 | | |
| Room QR display | | 11 | |
| Attendance record, Change attendance | | 16 to 21 | |
| Student history | | 22, 23 | |
| Profile | 39 to 42 | 26, 27 | 12, 13 |
| Admin hub, periods, forms, role, beacon, error banners | | | 14 to 29 |

### Allowed APIs (read in the versioned docs; sources in the last column)

| Need | Use | Source |
|---|---|---|
| Inter font | `npx expo install @expo-google-fonts/inter expo-font expo-splash-screen`; `useFonts({ Inter_400Regular, ... })` and `SplashScreen.preventAutoHideAsync()`; each weight is its own family name (`fontFamily: 'Inter_700Bold'`) on every platform | docs.expo.dev/develop/user-interface/fonts/ and /versions/v58.0.0/sdk/font/ |
| Font loading choice | `useFonts` (works in Expo Go and on web). The config-plugin route is preferred by the docs for native but needs a development build and does not cover web | same |
| Font classes | tailwind `fontFamily` entries such as `'inter-bold': ['Inter_700Bold']`; `font-bold` only sets weight, so never use it | nativewind.dev/docs/guides/custom-fonts |
| Colour tokens | existing CSS variables plus `rgb(var(--x) / <alpha-value>)` in `tailwind.config.js` (already in place) | nativewind.dev/docs/guides/themes |
| Opacity modifiers | NativeWind disables `textOpacity`, `borderOpacity`, `backgroundOpacity` for speed and sets opacity statically; do not rely on `bg-primary/10`, use named tint tokens | nativewind.dev/docs/core-concepts/differences |
| Radii | `rounded-{n}`, `rounded-[n]`, `rounded-full` are supported on native; extend `borderRadius` in the theme | nativewind.dev/docs/tailwind/borders/border-radius |
| Card shadow | RN style `boxShadow: '0px 6px 20px rgba(16, 24, 40, 0.06)'` (New Architecture; iOS and Android; Android 9+). NativeWind `shadow-[...]` is web only | reactnative.dev/docs/view-style-props, /boxshadowvalue |
| Gradient | `expo-linear-gradient`: `npx expo install expo-linear-gradient`; `<LinearGradient colors={['#015C93','#0A4570']} start={{x:0,y:0}} end={{x:1,y:1}} />`; documented for Android, iOS and web. NativeWind `bg-gradient-*`, `from-*`, `to-*` are web only | docs.expo.dev/versions/v58.0.0/sdk/linear-gradient/ |
| Icons | `expo-symbols` `SymbolView` with `name={{ ios: 'house', android: 'home', web: 'home' }}`, `tintColor`, `size`; iOS uses SF Symbols, Android and web use Material Symbols; a plain string name renders on iOS only. Already installed (58.0.4) and it depends on `@expo-google-fonts/material-symbols`, which is installed | docs.expo.dev/versions/v58.0.0/sdk/symbols/ |
| Charts, mark, artwork | `react-native-svg` 15.16.0 (installed). On native use explicit colours; `fill-current` and `stroke-current` are web only | docs.expo.dev/versions/v58.0.0/sdk/svg/ |
| Tab bar | `Tabs` from `expo-router`: `tabBarActiveTintColor`, `tabBarInactiveTintColor`, `tabBarStyle`, `tabBarLabelStyle`, `tabBarIcon`, `tabBarItemStyle`, `tabBarPosition: 'left' \| 'bottom' ...`, `tabBarVariant: 'material'` (left or right only); `Tabs.Protected` keeps working; all tab screens must be declared (SDK 58) | docs.expo.dev/router/advanced/tabs/ and /router/migrate/sdk-57-to-58.md |
| Navigation theme | `ThemeProvider`, `DefaultTheme`, `useTheme` imported from `expo-router`, never from `@react-navigation/*` | docs.expo.dev/versions/latest/sdk/router.md |
| System appearance | `userInterfaceStyle` in `app.json` (`light`, `dark`, `automatic`); `automatic` is set today | docs.expo.dev/develop/user-interface/color-themes/ |

### Anti-patterns to avoid (each one is checked by a grep or test in the last phase)

- `@expo/vector-icons`: it is not installed and the docs say "will be deprecated and is not recommended".
- A plain-string `SymbolView` name (renders only on iOS).
- `font-bold` / `font-semibold` for Inter (sets weight, not family, on native).
- `bg-gradient-*`, `from-*`, `ring-*`, `divide-*`, `shadow-[...]`, `grid`, `fill-current` in shared components (web only).
- `/10`-style opacity modifiers on token colours for backgrounds that must show on native.
- Hard-coded hex colours in screens or components (all colours come from tokens; today there are none outside `qr-code.tsx`).
- Imports from `@react-navigation/*` or a navigation container wrapper (removed in SDK 58).
- Variable fonts on native (the NativeWind page says to use static weights).
- Colour as the only carrier of status.
- Changing behaviour, queries, routes or copy that tests rely on while restyling.

### Unverified items that Phase 1 to 4 must settle first (spikes)

1. Whether `boxShadow` draws on react-native-web and on the Android emulator (docs do not say web).
2. Whether `tabBarPosition: 'left'` renders a sidebar on web (the docs' options table lists only Android and iOS and the sample code was lost in conversion).
3. The `ThemeProvider value={...}` prop and the `colors` keys (not in the fetched pages).
4. The `Inter_400Regular`, `Inter_500Medium`, `Inter_600SemiBold`, `Inter_700Bold` export names after install.
5. Whether `bg-primary/10` already renders on native here (the code uses it in four places).
6. The pill tint colours: the mockup text gives no hex for them. Proposed (12 to 20 % of the status colour over white): success tint `227 242 235`, warning tint `254 243 204`, danger tint `248 233 234`. Match them by eye against the mockup at phase 1.

### Contrast findings (computed from the style sheet colours, WCAG ratios)

Text `#101828` on white 17:1. Primary on white 7.1:1, white on primary 7.1:1. Muted `#667085` on background `#F4F6FA` 4.6:1 (passes narrowly). Absent `#C24753` on white 4.9:1 (passes). Late yellow with dark text 10.7:1 (passes; white text on yellow fails, as the style sheet says). **Present green `#159357` on white is 3.9:1: it fails for small text and for white text on a green button.** Phase 1 adds a darker `success-strong` (about `#0F7A46`) for small text and pills, keeping `#159357` for rings, bars and large elements.

---

## Phase 1: Design tokens, Inter and the navigation theme

**How this serves the primary goal:** Every later screen takes its colours, type and shape from one place, so the whole app changes to the mockup palette and font at once.

**Testable product:** The app runs with the new palette and Inter on web and Android, nothing moves, and the 144 existing tests still pass.

### What to implement

1. `src/theme/tokens.ts`: the single source of truth for hex values (the table above plus tint and strong variants), radii, spacing and the card shadow string. Export `colors`, `radii`, `shadows`.
2. `src/global.css`: replace the `:root` triplets with the mockup palette; add `--color-primary-dark`, `--color-primary-tint`, `--color-cream`, `--color-success-tint`, `--color-warning-tint`, `--color-danger-tint`, `--color-success-strong`, and keep `surface` white and `surface-muted` as the canvas `#F4F6FA`. Copy the structure of the existing file; only values and names change.
3. `tailwind.config.js`: add the new colours with the same `rgb(var(--x) / <alpha-value>)` pattern; add `borderRadius: { card: '20px', block: '14px', button: '12px' }`; add `fontFamily` entries `inter`, `inter-medium`, `inter-semibold`, `inter-bold` (copy the shape from nativewind.dev/docs/guides/custom-fonts); add `fontSize` entries for the six steps with line heights.
4. Install fonts: `npx expo install @expo-google-fonts/inter expo-font expo-splash-screen` (expo-font and splash are already present; the command only adds Inter). Load the four weights with `useFonts` in `src/app/_layout.tsx` and hold the splash screen until loaded or errored (copy the snippet in the font docs). Check the export names in `node_modules/@expo-google-fonts/inter` first.
5. Navigation theme: wrap the root in `ThemeProvider` from `expo-router` with `DefaultTheme` colours overridden (background `#F4F6FA`, card white, primary `#015C93`, text `#101828`, border `#E4E7EC`). Settle spike 3 here.
6. `app.json`: `name` to "Attendancely" (keep `slug` and `scheme`), `userInterfaceStyle` to `light` (decided: no dark mode, and `automatic` would flip the status bar and keyboard on dark phones while the app stays light), splash `backgroundColor` to the primary `#015C93`, Android adaptive icon `backgroundColor` to `#015C93`. The camera permission text becomes "Allow Attendancely to use the camera to read the QR code shown in the room." The web `<title>` and any visible "Attendance SAS" text change to Attendancely. Note: `name`, `userInterfaceStyle` and splash changes need a new development build or an app restart in Expo Go; they do not apply to an already installed build.
7. Tests: `src/__tests__/theme.test.ts`: (a) every colour in `tokens.ts` equals the matching triplet in `global.css` (drift guard), (b) the contrast pairs listed above meet 4.5:1 for text and 3:1 for large and graphic elements, (c) the six type steps and four radii exist in the tailwind config.
8. Spikes 1, 5 and 6: render a throwaway card with `boxShadow` on web and on the Android emulator; confirm `bg-primary/10`; compare the three pill tints to the mockup.

### Documentation references

Style sheet: Student UI page 1. Fonts: docs.expo.dev/develop/user-interface/fonts/. NativeWind: /docs/guides/themes, /docs/guides/custom-fonts, /docs/core-concepts/differences. Theme exports: docs.expo.dev/versions/latest/sdk/router.md.

### Verification checklist

- [ ] `npx tsc --noEmit`, `npx expo lint`, `npx jest` all pass (144 plus the new theme tests).
- [ ] On web the page background is `#F4F6FA`, headings use Inter (check computed `font-family` and that the Inter file loaded in the network panel).
- [ ] On the Android emulator text renders in Inter and the splash screen holds until fonts load.
- [ ] `grep -rn "#[0-9A-Fa-f]\{6\}" src --include=*.tsx` finds only `qr-code.tsx`.
- [ ] The spike results are written at the top of the Phase 3 section of this file.

### Anti-pattern guards

No `font-bold` on Inter text; no dark-mode values; no screen files touched in this phase.

### Phase 1 results (done 2026-11-03)

- **Built:** `src/theme/tokens.ts` (colours, radii, spacing, card shadow, type scale), `src/global.css` and `tailwind.config.js` (19 colour tokens, radii `rounded-card/block/button`, Inter families `font-inter`, `-medium`, `-semibold`, `-bold`, six type sizes `text-title` ... `text-label`), `src/theme/navigation-theme.ts` (`ThemeProvider` from `expo-router`, Inter in the theme fonts), Inter loaded with `useFonts` in `src/app/_layout.tsx` with the splash screen held, `Text` and `TextField` now use the Inter families (sizes unchanged until Phase 3), `app.json` (name Attendancely, `userInterfaceStyle: light`, splash and adaptive icon background `#015C93`, splash image width 200, the iOS Expo icon bundle removed so `icon.png` is used), the new icon files checked (all use exactly `#015C93`), README and the email template subject renamed.
- **Packages added:** `@expo-google-fonts/inter`, `expo-linear-gradient` (both with `npx expo install`).
- **Added beyond the plan:** `danger-strong` `#B03A48` for small red text (the mockup red is 4.49:1 on the canvas and 4.13:1 on its tint), used by `Text variant="error"`. Muted text must not sit on the primary tint (4.43:1).
- **Spikes settled:** (1) `boxShadow` renders the soft card shadow on the Android emulator, and `react-native-web` passes the string straight to CSS; (2) `bg-primary/10` and `bg-success/15` do render on native but blend with what is behind them and come out greyer than the named tints, so Phase 3 uses the tint tokens; (3) `ThemeProvider value={...}` takes a `Theme` with `dark`, `colors` (primary, background, card, text, border, notification) and `fonts`, confirmed in the installed types; (4) the Inter export names `Inter_400Regular`, `Inter_500Medium`, `Inter_600SemiBold`, `Inter_700Bold` exist; (5) the pill tints `227 242 235`, `254 243 204`, `248 233 234` look right on screen; (6) `expo-linear-gradient` and the four Inter weights render on Android.
- **Verified:** web (sign-in heading is `Inter_700Bold` 24 px in `#101828`, canvas `#F4F6FA`), Android emulator in Expo Go (fonts, shadow, tints, radii, gradient). 175 tests, typecheck and lint pass.
- **Not verified:** the new app icon, splash screen and app name on a real build (Expo Go ignores them; they need a development build). The browser tab title is still empty (set in Phase 4).
- **Notes for later phases:** input borders (`#E4E7EC`, 1.24:1 on white) follow the mockup and are decorative; the focus ring in Phase 3 must carry the 3:1 contrast. The dev server's typed-route file sometimes comes out stale after a restart; a clean restart of `web-dev` fixes it.

---

## Phase 2: Icons, app mark, class artwork and charts

**How this serves the primary goal:** These are the pieces that make the mockups look like the mockups (icons, the Attendancely mark, the colourful class cards, the percentage rings), built once and reused by every screen.

**Testable product:** A dev-only gallery route `/dev/ui` (only when `__DEV__`) shows every icon, the mark, the four artworks and the charts at several sizes; unit tests render each.

### What to implement

1. `src/components/icon.tsx`: `Icon` wrapping `SymbolView` with a typed registry that maps one app name to `{ ios, android, web }` (copy the docs' per-platform object form). Names needed (from the mockups): home, classes (book), calendar, profile, admin (shield), bell, check, close, chevron-right, chevron-down, clock, location pin, search, filter, qr, bluetooth, nfc, pencil, hand, warning, sign-out, user, lock. `tintColor` comes from `tokens.ts` (className to `tintColor` bridging is not documented, so use a `color` prop that takes a token name).
2. `src/components/app-mark.tsx`: the tick with beacon signal in a rounded blue square, drawn with `react-native-svg`.
3. `src/components/class-artwork.tsx`: four SVG patterns (rings, rounded bars, circles) in primary, yellow, red and green on cream; `artworkFor(classId)` picks pattern `classId % 4` so the same class always looks the same.
4. `src/components/charts.tsx`: `ProgressRing` (donut with centred percentage, colour from the value: 75 and above green, below 75 red, plus a three-segment present/late/absent version for "My attendance") and `ProgressBar`.
5. `src/components/avatar.tsx`: initials in a tinted circle (the hue taken from the id so lists vary).
6. Gallery route `src/app/(app)/dev/ui.tsx` registered only when `__DEV__`.
7. Tests: each component renders with an accessible label; `artworkFor` is stable and covers all four patterns; `ProgressRing` picks the right colour at 74, 75 and 100; the registry has an `ios`, `android` and `web` name for every entry.

### Documentation references

Mockup pages: Student UI 1, 9, 16, 20 (rings and artwork), Lecturer 10 (ring banner), Admin 2 (progress bars). Icons: docs.expo.dev/versions/v58.0.0/sdk/symbols/ (Material names from fonts.google.com/icons). SVG: docs.expo.dev/versions/v58.0.0/sdk/svg/ and nativewind.dev/docs/tailwind/svg/fill (use explicit colours on native).

### Verification checklist

- [ ] Gallery shows every icon on web and on the Android emulator (screenshots, none blank).
- [ ] Rings read 92, 85, 64 and 100 as in Student UI page 16.
- [ ] Tests, typecheck, lint pass.

### Anti-pattern guards

No `@expo/vector-icons`; no plain-string `SymbolView` names; no `fill-current`; no remote images.

### Phase 2 results (done 2026-11-03)

- **Built:** `src/components/icon.tsx` (`Icon` and a typed registry of 41 icons, each with an iOS SF Symbol name and a Material Symbol name for Android and web; the Bluetooth icon uses a radio-waves symbol on iOS because SF Symbols has no Bluetooth glyph), `app-mark.tsx` (the tick and beacon in `tile`, `plain` and `brand` variants, drawn like the icon file), `class-artwork.tsx` (four patterns on cream, `artworkIndex(classId)` = id mod 4, cropped not stretched), `charts.tsx` (`ProgressRing`, `BreakdownRing`, `ProgressBar`), `avatar.tsx` (five tints, each text colour contrast-checked), `src/lib/ring.ts` and `src/lib/initials.ts` (pure logic), the dev gallery `src/features/dev/ui-gallery.tsx` at `/dev/ui` (only registered when `__DEV__`, opened from Profile with "Dev: UI gallery").
- **Tests:** 20 new (registry names exist in the Material font table, tint and platform names, hidden-versus-labelled icons, ring tones at 74/75/100, arc and segment maths, bar clamping, initials and avatar colours, gallery shows every colour, icon and pattern). `expo-symbols` is mocked for Jest in `jest/expo-symbols.tsx`.
- **Found while verifying:** (1) on web, `react-native-svg` passes unknown props such as `accessible` to the page, which React warns about, so accessibility props sit on a wrapping `View` and decorative icons use `aria-hidden`; (2) "100%" did not fit the 56 px ring, so three-digit values use a smaller number; (3) Metro's file watcher on this machine sometimes serves a stale route chunk to the emulator after an edit (the new Profile button did not appear until Metro was restarted with `--clear`), and the web dev server's static render graph goes stale after edits ("Requiring unknown module"); both are fixed by a clean restart.
- **Verified:** Android emulator in Expo Go (all sections of the gallery) and web (icons via the Material Symbols font, charts, avatars). 195 tests, typecheck and lint pass.
- **Not verified:** iOS (SF Symbol names are type-checked against the installed list, not seen on a device). The artwork patterns are my reading of the mockup (rings, bars and circles in the four brand colours), so compare them with the mockup cards and say if a pattern should change.

---

## Phase 3: Restyle the shared UI kit

**How this serves the primary goal:** The 41 source files that use `className` are built from the 12 components in `src/components/ui` and the semantic tokens (no screen hard-codes a colour), so restyling the kit in place restyles most of the app without touching each screen.

**Testable product:** The gallery shows the kit in every state; every existing screen already looks closer to the mockups; all existing tests pass unchanged.

### What to implement (keep every exported name and prop; add, never remove)

1. `Text`: map variants to Inter families and the type scale (`title` 24 bold, `heading` 17 bold, add `section`, `card` 15 semibold, `body`, `muted` 13, `label` 12 semibold upper case, `error`). Use family classes only.
2. `Button`: radius 12, height 44, `size="large"` 52, variants `primary`, `secondary` (white with blue outline), `danger`, new `ghost` (text only), optional `icon`; disabled state per the mockup (tinted grey, muted text). Keep the `label` and `onPress` API.
3. `Card`: white, radius 20, padding 16, `boxShadow` from `tokens.ts` (plus `elevation` fallback if spike 1 needs it). Add `variant="hero"` using `expo-linear-gradient` (install with `npx expo install expo-linear-gradient`), used by the Home banners.
4. `Badge`: becomes the status pill: tones `success`, `warning` (dark text), `danger`, `neutral`, plus `live` (solid primary with a dot), `upcoming` (primary tint), `rescheduled` (cream), `cancelled`. Backgrounds come from the tint tokens, not opacity. Keep `label` and `tone`; map existing tones. Still always text.
5. `TextField`, `Select`, `Dropdown`, `DateField`, `TimeField`, `Collapsible`, `Checkbox`: inputs 44 high, radius 12, border `#E4E7EC`, focus ring in primary (web `focus-visible`), error state with red border and the existing message prop; `Select` chips use the primary fill when selected; `Dropdown` menu gets the card shadow and radius; `Collapsible` uses the chevron icon instead of the text arrows.
6. `Screen`: canvas `#F4F6FA`, title in the Title style, keep the `standalone`, scroll-up context and max width.
7. New small kit pieces used later: `Banner` (error/info/warning with icon, message, actions), `EmptyState` (illustration slot, one title, one line, one action), `SegmentedTabs` (Active period | Previous, Previous | Upcoming), `ListRow` (icon, title, chevron).
8. Tests: update only class-name assertions if any exist (none today); add tests for the new variants, `Badge` text always present, `Button` disabled behaviour, `SegmentedTabs` selection and `Banner` actions.

### Documentation references

Mockup pages: Student UI 1 (buttons, inputs, pills, cards, empty state), Admin 19 and 25 (form and error banner), Lecturer 19 (change attendance). NativeWind: radii, shadow and opacity pages listed in Phase 0.

### Verification checklist

- [ ] All existing suites pass without edits to their expectations.
- [ ] Gallery matches Student UI page 1 side by side at 1500 px and 390 px.
- [ ] Contrast test still passes with the real component colours (white on primary, dark on yellow, `success-strong` text on the success tint).
- [ ] `grep -rn "font-bold\|font-semibold\|bg-gradient\|shadow-\[" src` finds nothing in components.

### Anti-pattern guards

Do not change a component's props contract; do not use opacity modifiers for backgrounds; no web-only classes in shared components (use `Platform.OS === 'web'` style branches where needed).

### Phase 3 results (done 2026-11-03)

- **Restyled in place, same props:** `Text` (new styles `section`, `card`, `meta`, `label` besides the old ones; `heading` is now the 17 bold section style), `Button` (primary, secondary = blue outline, danger, new `ghost`; height 44, `size="large"` 52, optional `icon`, press and disabled states), `Card` (radius 20 with the soft shadow; new `variant="flat"` and `variant="hero"`, the blue gradient from `expo-linear-gradient`), `Badge` (pills with the tint tokens and strong text colours; existing tones kept, new tones `live`, `upcoming`, `rescheduled`, `cancelled`, optional `dot`), `TextField` (44 high, radius 12, blue border on focus, red with an error, taller when multi-line, placeholder colour from tokens), `Select` (round chips), `Dropdown` (chevron, tick on the chosen row, shadowed menu), `DateField` and `TimeField` (same field look, calendar icon), `Collapsible` (card with chevron), `Checkbox` (real tick or dash icon, 44 high), `Screen` (20 px side margins). A shared `field.ts` holds the common input look.
- **New:** `Banner` (error, warning, info, success, with icon, optional title, actions and dismiss; an error is one announcement for screen readers with its buttons kept reachable), `EmptyState` (icon, title, line, action), `SegmentedTabs` (Active period | Previous), `ListRow` (icon tile, title, subtitle, chevron or custom trailing). A `minus` icon was added for the partly-ticked checkbox.
- **Dev gallery:** `src/features/dev/kit-gallery.tsx` shows every variant and state at the top of `/dev/ui`.
- **Tests:** the 195 existing tests pass unchanged; 24 new ones in `ui-kit.test.tsx` (variants, disabled, icon tint, pills always show text, gradient colours, errors, chosen state, mixed checkbox, banner announce and dismiss, empty state, tabs, list rows). `expo-linear-gradient` is mocked for Jest in `jest/expo-linear-gradient.tsx`.
- **Verified:** web (gallery sections and the admin Today screen, which picked up the new look with no edits) and the Android emulator (gallery and the real student Home). Screens that still use their own styling and will be rebuilt in later phases: the admin "Stat" tiles (border instead of shadow), and four places with `/10` opacity tints (`crud-error.tsx` becomes a `Banner` in Phase 7; `location-picker.tsx`, `admin-calendar.tsx`, `student-history.tsx` get the tint token in Phases 5 to 7).
- **Not verified:** iOS. The status words on session cards still use the old tone mapping (`statusBadge` maps Live to success, Upcoming to neutral); Phase 5 switches the screens to the new `live` and `upcoming` tones when they are rebuilt.

---

## Phase 4: App shell (tab bar, desktop sidebar, headers) and sign-in screens

**How this serves the primary goal:** Navigation chrome and the first screen people see carry most of the design's character, and they appear on every page.

**Testable product:** Phone widths show the bottom tab bar with icons and an active state; widths of 1024 and up on web show the left sidebar with groups and a user chip; sign-in, code entry and the device permissions screen match the mockups.

### What to implement

1. **Spike first (web):** try `tabBarPosition: 'left'` with `tabBarVariant: 'material'` driven by `useWindowDimensions` (copy the candidate in the router docs summary; it is unverified on web). If it does not render a usable sidebar, fall back to a custom sidebar component rendered in the `(tabs)` layout beside the `Tabs` content (hide the built-in bar on wide screens), using `usePathname` and `useRouter` from `expo-router`. Keep `Tabs.Protected` for the Admin tab and declare every tab screen (SDK 58 rule). Record the result here.
2. Bottom tab bar: icons from the registry, active tint primary, inactive muted, label 11 to 12, white background with a top border, height that respects the safe area.
3. Sidebar and top bar per Student UI page 9 and Admin page 1: app mark with the name, `OVERVIEW` and `ACCOUNT` group labels, Sign out in red (use the existing sign-out confirmation), user chip with initials, name and role from the auth claims, no bell icon for now (decided: nothing to open yet; leave the space so it can be added).
4. `ScreenHeader` component: circular back button, title, optional status pill on the right (replaces the plain "Back" buttons on detail screens; keep each screen's existing back behaviour).
5. Auth screens (Student UI 2 to 8): centred card, app mark, "Sign in", helper text, email field, primary button; code entry; device permissions "Set up check-in" with icon rows. The mockup copy talks about an emailed link ("Send sign-in link", "This link has expired") but the app signs in with a 6 digit code. Decided: keep the code flow and use the OTP wording ("Send sign-in code", "Check your email", "Enter the code", "This code has expired"). Update the existing sign-in tests only where they assert the old words.
6. Tests: the existing sign-in, tabs and device permissions tests keep passing; add tests for the sidebar items per audience (student 4, lecturer 4, admin 5, from `audienceOf`/`can`), Sign out opening the confirmation, and the tab bar hiding Admin from non-admins.

### Documentation references

docs.expo.dev/router/advanced/tabs/, /router/migrate/sdk-57-to-58.md (declare all screens, `redirectTo`), /router/advanced/protected.md. Mockups: Student UI 2 to 9, 39; Admin 1, 14.

### Verification checklist

- [ ] Resize the browser to 390, 768 and 1280: bottom bar, then sidebar from the breakpoint, no layout jump.
- [ ] Student, lecturer and admin each see only their items (sign in as the demo accounts).
- [ ] Android emulator shows the bottom bar; the device permissions Continue still works.
- [ ] Tests, typecheck, lint pass.

### Anti-pattern guards

No navigation container wrappers or `@react-navigation/*` imports; do not remove or reorder routes; do not touch auth logic.

### Phase 4 results (done 2026-11-03)

- **Sidebar spike, settled:** `tabBarPosition: 'left'` was not needed. The sidebar lives in the `(app)` layout around the whole stack (`src/features/shell/app-shell.tsx`), not in the tab bar, because detail pages (session, class, student, reports) sit outside the tabs and the mockups keep the sidebar on them. It shows from 1024 px wide (`WIDE_BREAKPOINT`, so a desktop browser or a tablet on its side) and is switched off while the first-launch permissions screen is showing. The tab navigator takes our own `tabBar` (a supported prop of the JS tabs), which draws the phone's bottom bar and nothing on wide screens.
- **Built:** `nav.ts` (destinations by permission, active-page rule, breakpoint), `sidebar.tsx` (app mark and name, OVERVIEW group, ACCOUNT group with Profile and a red Sign out that asks first, tint and blue bar on the current page), `user-chip.tsx` and the top bar (initials, name, role; no bell, as decided), `bottom-tab-bar.tsx` (icon and label per tab, blue when current, tabPress can still be cancelled), `sign-out-confirm.tsx` (shared by the sidebar and Profile), `use-my-profile.ts` (the one profile query both use), the `ScreenHeader` component (round back button, title, second line, status pill; applied to screens in Phases 5 to 7), the browser tab title (`<Head>` in the root layout), the auth frame `auth-shell.tsx` (phone: mark, name and form in a column; wide: a blue panel with "Check in to class in seconds." and pills beside the form), the sign-in and code screens with the OTP wording ("Send sign-in code", "Check your email", Resend, "Use a different email"; no link wording), and the "Set up check-in" device permissions screen with icon rows.
- **Tests:** 33 new (navigation rules by permission, active page, sidebar items, groups, current page, sign-out confirmation, user chip, shell on wide, phone and switched off, bottom bar items, selected state, tabPress cancel and wide, ScreenHeader, the sign-in flow end to end with mocked sign-in functions, device permissions). 252 in total; typecheck and lint pass.
- **Verified:** web at 1024 px (sidebar and user chip, navigation including onto `/session/38` with the sidebar kept, Sign out asking first, the sign-in screen with the blue panel, the browser tab title "Attendancely") and at 375 px (sign-in in a column); Android emulator as the demo student (the bottom bar with icons and labels, Home then Classes highlighted in blue, switching tabs works). The emulator showed one "Expo Go isn't responding" dialog right after a clean Metro rebuild; closing the app and relaunching once Metro was fully up fixed it, so it is a start-up glitch of the dev setup, not of the app.
- **Known gaps:** no bell icon (nothing to open yet). Detail pages show no highlighted sidebar item, because a session or class belongs to more than one tab. The device permissions screen is native-only and could not be opened on web; its logic is tested.

---

## Phase 5: Student screens

**How this serves the primary goal:** Students are the largest group and the only ones who check in, so their screens are where the design matters most.

**Testable product:** A student signs in and sees Home, Classes, Calendar, Session details, Check in and Profile in the mockup design on phone and web, and can still check in.

### What to implement (one commit per screen group; behaviour untouched)

1. **Home** (Student UI 9 to 14): greeting header with avatar and date, hero card (gradient, Live now pill, class, time, room, large white Check in button; hidden when nothing is live), Today's sessions as artwork cards with status pill and "Check in opens 12:50" or the attendance pill, My attendance donut, Coming up list; desktop adds the profile card and "My classes this period" rings. The empty state "No sessions today" with the next session line.
2. **Classes** (15 to 18) and **Class details** (19, 20): artwork cards with the percentage ring and "Below 75%" in red; SegmentedTabs Active period | Previous; class details banner with the ring and counts, lecturer card, Previous | Upcoming list with status pills.
3. **Calendar** (21 to 25): month strip and day list styled with the kit (the existing week calendar logic stays).
4. **Session details** (26 to 32): header with status pill, details card, lecturer card, attendees with avatars, and the blue "You haven't checked in yet" banner holding the Check in button; Upcoming, Finished (attendance pill) and Cancelled variants.
5. **Check in** (33 to 38): gradient header with the animated rings and method icon, method list cards with status chips (Searching, Not available, Next if needed), Skip to QR code, camera card, failure screen (yellow hand icon, struck methods with red reasons, Try again), success screen (green check, summary card, Back to session). Keep the dev paste box, only restyled.
6. **Profile** (39 to 42).
7. Tests: all existing student, session and check-in tests pass; add render tests for the new states (hero hidden when nothing is live, Below 75% shown in red text, failure and success screens show the same words as today).

### Documentation references

Student UI pages above; `src/features/student/*`, `src/features/sessions/*`, `src/features/check-in/*` for the behaviour to keep; Phase 2 and 3 components.

### Verification checklist

- [ ] Side-by-side screenshots against each mockup page at 390 px and 1280 px (web) and on the Android emulator for Home, Classes, Session, Check in.
- [ ] A real check in still works end to end (paste box on web, demo student) and the success screen appears.
- [ ] Tests, typecheck, lint pass.

### Anti-pattern guards

No change to queries, routes, copy that tests assert, or the check-in orchestrator; artwork never replaces text; the Check in button keeps its disabled reasons.

### Phase 5 results (done 2026-11-03)

- **Rebuilt, with every query, route and tested word unchanged (all 252 earlier tests pass without edits):**
  - **Home** (`student/home.tsx`): avatar, date and "Hi, [first name]"; a blue hero with "Live now", the class, time and room and a Check in button while a session is live; "Today's sessions" as artwork cards; the "My attendance" donut over all classes (`attendance-summary.tsx`, counts from the database); "Coming up" with date blocks (`upcoming-row.tsx`); empty states "No sessions today" (with the next session and an Open calendar action) and "No classes yet" ("Welcome, [first name]"). From 1280 px wide the donut and Coming up move to a column on the right.
  - **Session card** (`session-card.tsx`, shared with the Calendar): artwork strip with the status pill, name, time and room with a clock, the lecturer with an avatar, and for a student a Check in button, or a disabled "Check in opens at 08:50".
  - **Classes:** "Active period | Previous" tabs; cards with artwork thumbnail, slot, lecturer, "Below 75%" in red and a percentage ring from the database; empty states with "See previous periods".
  - **Class details:** back header, a blue hero with the ring in a white circle and "2 present · 0 late · 2 absent", slot and room, lecturer card, "Previous | Upcoming" tabs, session rows with pills (attendance pills with a dot, Cancelled struck through).
  - **Calendar:** a week strip of day chips (today outlined, chosen day solid blue, a dot when something is on), icon buttons for the previous and next week, "This week" only when away from it, and the chosen day's sessions below.
  - **Session details:** header with the status pill, a meta card (date, time, room), then the right card for the moment: the blue "You haven't checked in yet" with Check in, a "You're checked in" banner, "Check in opens at 12:50" with a disabled button, "This session was cancelled", plus "My attendance" (status pill, time, method, and "Something wrong? Ask your lecturer to correct it."), the lecturer card and the attendees with avatars. Lecturers and admins keep their panel.
  - **Check in:** a blue banner that says what to do now (scan, checking, or "We couldn't check you in" with a yellow hand), the methods with icon tiles and chips ("Scanning", "Not available on this device"), the camera, a red error banner with Try again, and a centred green tick success screen. The dev paste box is unchanged.
  - **Profile:** big avatar, name, "Student · S1000002", the Check-in permissions list (students only), personal info rows, and Sign out asking first.
- **New small pieces:** `Screen` takes an optional `header` instead of the plain title; `sessionPill` and `attendancePill` (the new pill tones; the old `statusBadge` stays for the lecturer and admin screens until Phases 6 and 7); `BreakdownRing` can show the database's percentage instead of one worked out from the counts; `ClassArtwork` has `fit="whole"` for wide strips so shapes are not cut off; `useIsExtraWide`.
- **Tests:** 30 new in `student-screens.test.tsx` (pills, session card states, Home live, empty and no-classes states, Classes tabs and red below 75%, Calendar chips and weeks, Session details in each state, Profile). 282 in total; typecheck and lint pass.
- **Verified:** web at 1024 px as the demo student, with a temporary live session: Home, Classes, Class details, Calendar, Session details, Check in (scanning and the failure state after a wrong code), Profile. Android emulator as the same student: Home (matches mockup page 10), Classes (artwork thumbnails, red "Below 75%", rings) and Check in (hero, method chips, camera card). On the emulator the method chips read "Not available on this device" because it has no Bluetooth/NFC and the camera is not yet allowed.
- **Follow-up (after the first review):** empty states use the supplied illustrations (`EmptyState image="calendar" | "classes"`, picture left and text right as on the style sheet); the Home live card uses `Artboard Banner.png` (pinned right on narrow cards so the circles show); pages no longer sit in a centred 768 px column, and a `Grid` puts cards in 1, 2 or 3 columns from 1280 / 1800 px.
- **Not verified:** the check in success screen (it needs a real check in, which cannot be undone because attendance history is permanent), the Cancelled and Finished session variants on screen (covered by tests), iOS.

---

## Phase 6: Lecturer screens

**How this serves the primary goal:** Lecturers run the live session and fix records; clear status colours and big targets make that fast.

**Testable product:** A lecturer sees Home, Classes, Class details, Live, Upcoming and Finished session, Room QR, Attendance record, Change attendance and Student history in the mockup design, and can still change attendance.

### What to implement

1. **Home** (Lecturer 1, 2): Open live session hero, Coming up list with Rescheduled pill, "10 students below 75%" summary card.
2. **Classes and class details** (3 to 8) with the enrolled list, rings and the empty state "No students enrolled yet".
3. **Session** (9 to 15): Live (75% ring banner with "15 present / 3 late / 6 not yet" chips, search and QR button, attendee rows with initials avatars and status pills, realtime unchanged), Upcoming ("Not open yet"), Finished (counts and Absent). The Show room QR button becomes the QR button; Room QR page (11) with the large code and "Scan to check in".
4. **Attendance record** (16, 17) with the centred avatar and the sticky Change attendance button; **Change attendance** (18 to 21): three large status tiles with icons (Present, Late, Absent), time field, disabled Method, reason area, the two step confirmation restyled as a sheet or screen as drawn.
5. **Student history** (22, 23), **Calendar** (24, 25), **Profile** (26, 27).
6. Tests: all Phase 7 and 9 tests pass; add tests that the status tiles select exactly like the current radio chips and that Save is still blocked without a reason.

### Verification checklist

- [ ] Screenshots against Lecturer pages 1 to 27 on web and on the Android emulator for session, record and change.
- [ ] Manual check in of one student as the demo lecturer still saves (reason required, confirmation shown).
- [ ] Tests, typecheck, lint pass.

### Anti-pattern guards

Do not alter `change_attendance` payloads, the realtime hook or the focus refetch; keep the QR code white on black for scanning (no tinted QR).

### Phase 6 results (done 2026-11-04)

- **Rebuilt, with every query, route, payload and the realtime hook unchanged:**
  - **Home** (`teaching/lecturer-home.tsx`): avatar, date and "Hi, [first name]"; a blue banner with "Live now", the class, a ring, "18 of 24 checked in · 3 late so far" and Open live session; "Today's sessions" cards; a "N students below 75%" card with See classes; "Coming up" (Rescheduled pill); same two-column layout from 1280 px as the student Home.
  - **Classes:** "Active period | Previous periods" tabs, cards with artwork, slot, enrolled, sessions held, red "N students below 75%" and the class average as a ring.
  - **Class details** (shared with admin): back header, blue banner with the class average ring, info card, Students | Upcoming | Previous tabs, student rows with avatar and "46% Below 75%" / "92% On track" pills, "No students enrolled yet" empty state.
  - **Session panel:** blue banner with the ring and "15 present · 3 late · 6 not yet" (Absent once finished), "Check in opens at 12:50" before it opens, a cancelled banner, attendee rows with avatars and attendance pills.
  - **Room QR:** back header, "Scan to check in", the code unchanged (black on white), countdown pill.
  - **Attendance record, Change attendance, confirmation:** centred avatar and pill, label/value rows, "Need to correct this?" card, three status tiles (Present, Late, Absent) with icons, disabled Method box, reason area; save still needs a reason and the second step.
  - **Student history:** avatar, shared class picker with a tick, blue banner with the ring, rows with pills.
  - **Calendar:** a lecturer's day shows the teaching cards with live figures. **Profile:** classes, students and average for a lecturer, plus the "Lecturers don't check in" note.
- **New small pieces:** `useLecturerOverview` (classes, students, below 75%, average), used by Home and Profile; `TeachingSessionCard` is restyled and shared with admin (progress bar and pill; same figures).
- **Fix found while checking:** `Card` called `Image.resolveAssetSource`, which react-native-web does not have, so the student Home crashed on web while a session was live. It now falls back to the 4:1 ratio.
- **Tests:** 8 new in `lecturer-screens.test.tsx` and a status tile test in `attendance-edit.test.tsx` (291 in total; typecheck and lint pass). Four assertions in `attendance-edit.test.tsx` changed with the new label/value rows (same facts).
- **Verified:** web at 1440 px as the demo lecturer with a temporary live session: Home, Session, Room QR (error state only, QR is off for that room), Attendance record, Change attendance (blocked without a reason, then the confirmation), Class details, Classes, Student, Calendar, Profile. The temporary change was reverted.
- **Not verified:** the Android emulator and iOS, the Room QR success layout, the final save of a change (it is permanent), the phone layout of these screens.

---

## Phase 7: Admin screens and reports

**How this serves the primary goal:** Admins manage everything and need the same polish, including the CRUD forms and error messages that are the densest screens.

**Testable product:** An admin sees Today, Calendar, Classes, class details, Session, the Admin hub, every CRUD list, details and form, and Reports in the mockup design, and can still create, edit and delete.

### What to implement

1. **Today** (Admin 1 to 3): stat tiles (Sessions, Live now, Upcoming, Finished, Rescheduled or cancelled), search with a Filters button and removable filter chips, session cards with a coloured left bar and a progress bar (`18/24`), "Each listed once".
2. **Calendar** (4, 5), **Classes and class details** (6 to 9), **Session** (10, 11), **Profile** (12, 13).
3. **Admin hub** (14, 15): icon rows with chevrons using `ListRow`; Periods with Active, Planning, Finished tabs (16, 17).
4. **Generic CRUD** (`entity-list`, `entity-details`, `entity-form`, `permission-checklist`, `overrides-editor`, `location-picker`): list rows, detail cards, forms per page 19 (day chips M T W, time fields, location radio cards with Free and Booked states), role form (21), beacon form (23), delete confirmation. The CRUD error banner per pages 25, 27, 29 with the Banner component ("Location already booked", "Role already exists", "Beacon already assigned") keeping the current error mapping and scroll-to-top behaviour.
5. **Reports** (not in the mockups): apply the kit (SegmentedTabs for the three views, filter chips, rows with ProgressRing or pill, Export CSV as a secondary button). Mark as an assumption.
6. Tests: all admin, teaching and reports tests pass; add a test that the error banner still shows the mapped message and the form scrolls to the top.

### Verification checklist

- [ ] Screenshots against Admin pages 1 to 29 on web (390 and 1280) and the Android emulator for Today, hub, schedule form.
- [ ] Create, edit and delete a location, role and schedule as the demo admin; trigger the booked-location error and see the banner.
- [ ] Tests, typecheck, lint pass.

### Anti-pattern guards

Do not touch entity definitions, validation or database error mapping; forms keep their field names and labels used by tests.

### Phase 7 results (done 2026-11-04)

- **Rebuilt, with entity definitions, validation, database error mapping, queries and routes unchanged:**
  - **Today:** date and "Today" header, five stat tiles (Live now in blue, Rescheduled or cancelled in amber), a class name search, the Filters panel with each active filter as a removable chip (plus "Clear filters (N)"), "Each listed once", cards with a status pill, progress bar and lecturer, in a 1, 2 or 3 column grid.
  - **Calendar:** the same week strip as everyone else with the session count under each day, search, filters, cards.
  - **Classes:** search, filters, cards with lecturer avatar, enrolment, "N below 75%" and the class average ring. Class details and Session are the shared screens from Phase 6.
  - **Admin hub:** one white card of icon rows with chevrons (`ListRow`), plus Attendance reports.
  - **CRUD:** list rows with chevrons and an empty state; details as label/value rows; round back button header; location picker as radio cards with Free / Booked / Selected pills; the error is now the shared `Banner` (red, title, message, "Conflicts with", the action and Dismiss). Scroll to top on an error is unchanged.
  - **Reports (an assumption, not in the mockups):** By student | By lecturer | By class tabs, white cards with percentage pills, Export CSV as a secondary button.
- **Cleanup:** `statusBadge` and the local status map in `schedule-extras.tsx` are gone (everything uses `sessionPill`).
- **Tests:** 3 new in `admin-screens.test.tsx` (the error banner shows the mapped title, message, conflict and both actions; class search; filter chips). 294 in total; typecheck and lint pass.
- **Verified:** web at 1440 px as the demo admin: Today, Calendar, Hub, Schedules list, the Add schedule form with its "Check the details" banner (scrolls up, nothing saved), Reports.
- **Not done or not verified:** the Android emulator and phone widths; creating, editing and deleting a location, role and schedule and the booked-location banner against the real database (the error component is covered by a test, the saves were not run); day chips (M T W) and the beacon "move" confirmation, and the wide two pane list plus form layout from the mockups (forms still use the existing fields and the single column); the Admin profile "Access" list; the Periods status tabs.

---

## Phase 8: States, accessibility and polish

**How this serves the primary goal:** The mockup feeling has to hold in the moments the mockups barely show: loading, empty, error, keyboard and screen reader use.

**Testable product:** Every list and screen has a designed loading, empty and error state; the app is usable with keyboard and a screen reader on web.

### What to implement

1. Replace the plain "Loading..." texts with one `Loading` component (spinner plus text) and skeleton blocks for the long lists; keep the words for screen readers.
2. Use `EmptyState` wherever a list can be empty (no sessions today, no classes, no students, no history, no report rows) with the one title, one line, one action pattern.
3. Web: focus-visible outlines in primary, hover states on cards and rows, cursor pointer, keyboard operation of Dropdown, Select and tabs.
4. Accessibility: 44 px minimum touch targets, labels on icon-only buttons, status always as words, reduced motion respected for the check-in rings (`useReducedMotion` from `react-native-reanimated`, installed).
5. Tests: a11y label assertions for icon-only buttons; reduced-motion test for the rings.

### Verification checklist

- [ ] Tab through sign-in and Home in the browser with the keyboard only.
- [ ] Turn on Android TalkBack for one screen and confirm labels read sensibly (manual note).
- [ ] Tests, typecheck, lint pass.

### Phase 8 results (done 2026-11-04)

- **Loading:** one `Loading` component (spinner plus the words, announced as a progress bar) replaces every "Loading..." line, "Loading the code..." and "Checking locations...".
- **Web:** a visible keyboard focus ring, the pointer cursor on buttons, links, tabs, radios and checkboxes, a "not allowed" cursor on disabled ones, and a light hover. The CSS is added once from `src/lib/web-styles.ts` (called in the root layout). A custom `+html.tsx` was tried first and removed: in the dev server it stopped Expo adding the app script, which left a blank page.
- **Touch targets:** every tab, chip, collapsible header, back and week step button, and filter chip is now at least 44 px (they were 24 to 40).
- **Tests:** `states-a11y.test.tsx` (Loading, names on the icon-only week and dismiss buttons, tab and collapsible state). 299 in total; typecheck and lint pass.
- **Verified:** web at 1440 px as the demo admin: Tab moves focus with a visible outline, Enter opens Filters, the cursor is a pointer, and Today's five stat tiles now fit in one row.
- **Not done:**
  - Skeleton blocks for long lists (the spinner line is used everywhere).
  - Reduced motion for the check-in rings: nothing in the app animates (no animation library is used), so there is nothing to switch off.
  - Arrow-key movement inside Dropdown and Select (they work with Tab and Enter or Space).
  - TalkBack on Android and a screen reader pass on web.
  - Empty states still use the short inline text in a few lists (for example attendees and history rows inside a card).

### Anti-pattern guards

No animation that blocks check in; no information conveyed by colour alone.

### Home correction (2026-11-04, after Phase 9)

Student and lecturer Home now follow the reference images: no separate header; one `HomeBanner` (`src/features/sessions/components/home-banner.tsx`) with the date, the greeting and the live session plus its button, or, with none live, the next session today (no button), or "No sessions today. Your next one is ...". On 1280 px and wider the banner and "Today's sessions" take two thirds and the attendance and Coming up cards sit beside them; narrower, everything stacks with the banner first. Today's cards are a wrapping row (`CardRow`, at least 240 px each). The lecturer banner no longer has the progress ring; the "N of M checked in" line stays.

### Classes, Calendar and class details corrections (2026-11-04, after Phase 9)

- **Classes:** from 768 px the card is the full one (artwork on top, name and ring, clock and pin rows, lecturer and status pill, `ClassTile`); the phone keeps the compact row. The Active period | Previous tabs are small, with the period name and class count on the same line at the right (`ClassesToolbar`).
- **Calendar:** one row per session, no artwork (`SessionRow`): times, bar (solid blue when live), class, room, status, and the figure at the right (a student's own attendance, a lecturer's count or percentage).
- **Class details:** from 1024 px there are no Upcoming | Previous tabs: everything is on the page, and from 1280 px it is in two columns. Lecturer: the enrolled students as a table (avatar, name, ID, bar and percentage, status, View) with Upcoming and Previous beside it. Student: the class, attendance and lecturer on the left, Upcoming sessions and a Previous sessions table (date, checked in, method, status) on the right. Upcoming lists the next five.

### Lecturer session and attendance record corrections (2026-11-04, after Phase 9)

- **Session (lecturer and admin):** no lecturer card (an admin sees whose session it is as a chip); the date, time and room are small chips. From 1024 px four cards: attendance % and "N of M checked in" on the banner artwork, Present on time, Present late, and Not checked in yet (Absent once finished). On a phone one banner holds the figures (Attendance, Checked in, Late; Attended, Present, Late, Absent when finished). Before the session starts there is no blue card, only "Check in opens at HH:MM".
- **Attendees:** the title has no count; search and the status filter sit on the title's row and have no labels. Desktop is a table, one line per student: avatar and name, ID, status, checked in at, method, View (before the session only student, ID and status). On a phone each student is one tappable card (avatar, name, ID and time, status). The inline "View record" and "Check in manually" buttons are gone: the record has Check in manually.
- **Attendance record:** from 1024 px three columns: the student and the record take two (History under them), the third has "Need to correct this?" and "Student in this class" (ring, N of M attended, View student's attendance). The phone layout is unchanged.

---

## Phase 9: Final verification

**How this serves the primary goal:** It proves the whole app, not a few screens, now looks like the mockups and still behaves as before.

### Checklist

1. `npx tsc --noEmit`, `npx expo lint`, `npx jest` pass (the count is the 144 today plus the new tests).
2. Anti-pattern greps return nothing: hard-coded hex outside `src/theme/tokens.ts` and `qr-code.tsx`; `font-bold`, `font-semibold`, `bg-gradient`, `from-`, `to-`, `ring-`, `divide-`, `shadow-[`, `@expo/vector-icons`, `@react-navigation` in `src` (except `.expo` types).
3. Visual review: for every screen in the inventory, one screenshot per role at 390 px and 1280 px on web, plus the Android emulator for the ten main screens; list any deliberate difference from the mockup in this file.
4. Behaviour review as the three demo accounts: sign in with a code, student check in, lecturer manual check in and change, admin create, edit and report export.
5. `npx expo-doctor`, `npm run build:web` and a Netlify deploy preview open and load Inter, the artwork and the icons.
6. Update `PLAN.md` with a short "Styling" section pointing here, and commit by phase.

### Phase 9 results (done 2026-11-04)

- **Checks:** `tsc` and `expo lint` clean; 299 tests in 23 suites pass; `npm run build:web` exports all routes. The anti-pattern greps find nothing: the only hex values outside `tokens.ts` and `qr-code.tsx` are in `theme.test.ts` (which checks the tokens), and the only `font-bold` is inside a comment in `text.tsx`.
- **Production build:** served `dist/` and signed in as the demo student with a real emailed code. Home loads Inter, the class artwork, the symbol icons and the "Attendancely" title, with the bottom tab bar at 390 px and the sidebar and two columns at 1280 px (after a reload).
- **`expo-doctor`:** 19 of 20 pass. The one failure is 13 packages a patch version behind the SDK 58 set (for example `expo-router` 58.0.30 against 58.0.26 expected). Not changed here; `npx expo install --fix` would do it.
- **Visual review:** every screen was checked against its mockup in the phase that restyled it (Phases 3 to 8, on web at phone and desktop widths). This phase re-checked only the student Home on the production build. A full one-screenshot-per-screen-per-role pass at 390 and 1280 px was not repeated.
- **Not done:**
  - Android emulator pass for the ten main screens: last done in Phase 5, not repeated for Phases 6 to 8.
  - Netlify deploy preview: needs the commits pushed first.
  - Behaviour as lecturer and admin on the production build (manual check-in, change attendance, create/edit/delete, report export). Those flows have tests, and the lecturer and admin screens were checked on the dev server in Phases 6 and 7, but saves were not run against the database.
  - Mockup items still not built: day chips (M T W) in the schedule form, the beacon "move closer" confirmation, the wide list-plus-form two-pane, the admin Profile "Access" list, Period status tabs.
- **Found, not fixed:**
  - The sign-in email subject still reads "Your Attendance SAS sign-in code" while the sender name is Attendancely. It comes from the Supabase auth email template, not the app code, so it needs changing in the Supabase dashboard.
  - Known review items: Home briefly shows "No sessions today" before the schedules load; the session card's button sits inside a link-role pressable; the disabled check-in button label is lower-cased; the calendar chip reads "1 sessions".

---

## Decisions

Decided by the user on 2026-11-03:

1. **Brand name: Attendancely.** Use it everywhere the user sees a name: sidebar, sign-in, page titles, `app.json` `name`, the web `<title>`, the camera permission text, emails' display name where we control it. Keep the technical `slug` (`attendance-sas`) and the `attendancesas` URL scheme unchanged so builds, deep links and the Netlify site keep working.
2. **Sign-in copy: OTP.** Keep the 6 digit code flow and adapt the mockup words: "Send sign-in code", "Check your email", "Enter the code", "This code has expired. Request a new one." No link wording anywhere.
3. **No dark mode.** Set `userInterfaceStyle` to `light` in `app.json` in Phase 1; no `dark:` classes, no dark token values.
4. **Icons: `expo-symbols`**, with the per-platform name registry from Phase 2.
5. **App icon:** the user will add the artwork to `assets/` (see "Icon and splash files" below).

Not answered, so the plan proceeds with these defaults (say so if you want a change):

6. **Bell icon:** hidden until there is something to open (there are no notifications yet). The sidebar and phone header are laid out so it can be added without moving anything.
7. **Reports page:** not in the mockups; the kit is applied as described in Phase 7.

### Icon and splash files

The **splash screen** is the screen shown for a moment while the app starts on a phone, before the first screen is ready: today a plain blue background with the Expo logo in the middle (`splash-icon.png`, background `#208AEF` in `app.json`). It will become the Attendancely mark on the brand background.

Files to provide in `assets/images/` (replacing the current Expo placeholders):

| File | Size now | Needed | Content |
|---|---|---|---|
| `icon.png` | 1024x1024 | 1024x1024, no transparency | App icon (iOS and stores): the mark on the blue tile, full bleed |
| `android-icon-foreground.png` | 512x512 | 1024x1024 recommended, transparent | The tick and beacon only, kept inside the centre 66% so Android's masks do not cut it |
| `android-icon-background.png` | 512x512 | 1024x1024 | Plain `#015C93` (or the gradient) |
| `android-icon-monochrome.png` | 432x432 | 1024x1024, transparent | The tick and beacon in one colour (Android themed icons) |
| `splash-icon.png` | 228x213 | about 1024 wide, transparent | The mark alone (white tick and beacon works on the blue splash) |
| `favicon.png` | 48x48 | 256x256 | The mark for the browser tab |

One transparent SVG or a 1024 px PNG of the mark is enough for me to produce the rest if you prefer. Phase 1 changes the splash and adaptive-icon background colours in `app.json` to match; replacing the image files does not change code.

## Not in this plan

Dark theme · new features or copy changes beyond the sign-in wording · notifications behind the bell · illustrations beyond the class artwork and the empty-state icon · Bluetooth and NFC screens beyond their restyled method cards · iOS device verification (no iOS build exists yet).
