# Attendance SAS

Academic attendance portal: students check in to classes by Bluetooth beacon, NFC or QR code; lecturers view and correct attendance; admins manage everything. One TypeScript codebase for web, iOS and Android (Expo Router, NativeWind, TanStack Query, Supabase, Netlify).

Plan: [PLAN.md](PLAN.md). Product and design documents: [docs/](docs/). Development skills: [docs/SKILLS.md](docs/SKILLS.md).

## Run it

```bash
npm install
cp .env.example .env     # then fill in EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_KEY
npm run web              # web dev server
npm run build:web        # static export to dist/ (what Netlify serves)
npm test                 # Jest
npm run typecheck
npx expo lint
```

NFC and Bluetooth need a development build (`expo-dev-client`), not Expo Go.

## Rules

- Use `npx expo install <package>` for Expo-compatible versions.
- Never put a secret or `service_role` key in an `EXPO_PUBLIC_*` variable.
- Screens use only `src/components/ui` primitives and Tailwind semantic tokens, so styling can change in one place later.
