# Development skills and tools (Phase 1)

Status: **INSTALLED globally on 2026-10-27 (12 skills; see "Installed" below).** Searched with `npx skills find`; install counts are from that output, stars and activity from the GitHub API. The installer printed "PromptScript does not support global skill installation" for every skill. That is only a non-Claude agent target; each skill installed to `~/.agents/skills` and is symlinked into `~/.claude/skills`.

## Installed (12)

`expo-router`, `expo-data-fetching`, `expo-module`, `expo-dev-client`, `supabase`, `supabase-postgres-best-practices`, `vercel-react-native-skills`, `react-native-testing`, `playwright-cli`, `netlify-deploy`, `netlify-config`, `eas-app-stores`, `eas-workflows`.

That is 13 names. `expo-deployment` **does not exist any more**: the search index listed it, but the Expo repo no longer has it, so it was replaced (with user approval) by `eas-app-stores` (store submission, TestFlight) and `eas-workflows` (CI). `native-data-fetching` was likewise renamed to `expo-data-fetching`.

Install command pattern (global, no prompts): `npx skills add <owner/repo@skill> -g -y`

## Recommended (install)

| Tool | Skill | Installs | Source repo (stars, last push) | Why |
|---|---|---|---|---|
| Expo Router | `expo/skills@expo-router` | 28K | expo/skills (3,125; 2026-10-26) | Route structure, groups, tabs, headers. Official. |
| Expo data loading | `expo/skills@native-data-fetching` | 46.4K | expo/skills | Fetching and caching patterns for Expo apps (covers React Query use). |
| Expo native modules | `expo/skills@expo-module` | 45.2K | expo/skills | Needed for the Phase 12 Bluetooth/iBeacon spike if a custom module is required. |
| Dev builds | `expo/skills@expo-dev-client` | 70.3K | expo/skills | NFC and Bluetooth cannot run in Expo Go (Phases 11-12). |
| Builds and releases | `expo/skills@expo-deployment` | 40.2K | expo/skills | EAS Build, TestFlight, Play (Phase 14). |
| Supabase | `supabase/agent-skills@supabase` | 344.6K | supabase/agent-skills (2,937; 2026-10-02) | Auth, RLS, Edge Functions, migrations, CLI. Official. Not React Native specific. |
| Postgres | `supabase/agent-skills@supabase-postgres-best-practices` | 461.3K | supabase/agent-skills | Indexes, RLS performance, schema rules (Phase 3, 13). Official. |
| React Native | `vercel-labs/agent-skills@vercel-react-native-skills` | 255.7K | vercel-labs/agent-skills (33,056; 2026-10-14) | General React Native performance and patterns. |
| Unit tests | `callstack/react-native-testing-library@react-native-testing` | 5.3K | callstack/react-native-testing-library (3,427; 2026-10-20) | Official RNTL guidance for the Jest tests in every phase. |
| Web E2E | `microsoft/playwright-cli@playwright-cli` | 197.1K | microsoft/playwright-cli (14,649; 2026-10-19) | Web end-to-end check per phase. |

## Optional (install only if you want them)

| Tool | Skill | Installs | Notes |
|---|---|---|---|
| EAS CI | `expo/skills@expo-cicd-workflows` | 39.2K | Phase 14 only. |
| TanStack Query | `deckardger/tanstack-agent-skills@tanstack-query-best-practices` | 12.8K | 228 stars, third party. `native-data-fetching` may be enough. |
| React Native | `callstackincubator/agent-skills@react-native-best-practices` | 30.3K | 1,684 stars. Overlaps the Vercel skill; pick one. |
| Netlify | `netlify/context-and-tools@netlify-deploy`, `@netlify-config` | ~3.4K each | Official Netlify org but only 46 stars (below the 100-star bar). Phase 2 and 14. |
| Accessibility | `wshobson/agents@accessibility-compliance` | 14.7K | Web-focused WCAG; Phase 13. |
| Mobile E2E | `tovimx/maestro-mobile-testing-skill@maestro-mobile-testing` | 1.2K | Low adoption; only if native E2E with Maestro is wanted. |

## Not recommended

| Skill | Reason |
|---|---|
| `expo/skills@expo-tailwind-setup` (53.6K) | Sets up **Tailwind v4 + NativeWind v5 preview** (`nativewind@5.0.0-preview.2`, nightly `react-native-css`). PLAN.md pins **NativeWind 4.2.7 + Tailwind 3.4** (stable). Installing it could steer the agent into the wrong setup. |
| `expo/skills@building-native-ui`, `expo-native-ui`, `expo-ui` | UI/styling focused; styling is deferred. Revisit in the design stage. |
| NativeWind v4 skills (`tristanmanchester/...styling-nativewind-v4-expo` 410; others under 300) | Under the 1K-install bar; use nativewind.dev docs. |
| Other Postgres/Neon/Prisma skills | Wrong platform. |
| `antibrow/anti-detect-browser-*` | Appeared under Playwright search; not relevant and not trustworthy for this project. |

## No skill found (use official docs)

| Tool | Result | Use instead |
|---|---|---|
| NFC (`react-native-nfc-manager`) | Only a 21-install skill | github.com/revtel/react-native-nfc-manager and its `docs/guide/*` |
| Bluetooth / iBeacon | Only a 2-install skill | Phase 12 spike; Expo Modules API docs |
| NativeWind | Only the v5 skill above and tiny v4 ones | nativewind.dev/docs |
| TypeScript | Only generic or unrelated skills (mattpocock, wshobson) | Not needed |

## CLIs on this machine (checked)

| CLI | Status |
|---|---|
| node 22.19.0, npm 11.6.2, git 2.49, Docker 28.4 | present |
| `supabase`, `netlify`, `eas`, `expo` | **not installed** globally. `npx supabase`, `npx netlify-cli`, `npx eas-cli` work without installing; or install later with approval. Docker is available for `supabase start`. |
