<!-- 7ca628db-841b-4ae7-b199-6a72847e3408 078ebbbc-3ea0-4c60-828f-21b286e50ac8 -->
# EAS Deployment Guide

### 1) Preview build (simulators) for QA

- Goal: quick internal testing; not store‑distributable.
- Config (already set): `eas.json` → `build.preview.ios.simulator: true` and `distribution: "internal"`.
- Build commands (no credentials needed):
```bash
npx --yes eas build --platform ios --profile preview --non-interactive
npx --yes eas build --platform android --profile preview --non-interactive
```

- Install
  - iOS: download `.tar.gz`, extract `.app`, open with iOS Simulator (drag‑drop onto Simulator).
  - Android: download APK from EAS build page; sideload to device or emulator.

### 2) Production build for stores

- Goal: store‑ready artifacts (.ipa for iOS, .aab for Android).
- Build commands:
```bash
npx --yes eas build --platform all --profile production --non-interactive
```

- Notes
  - iOS must be a device build (no simulator flag). EAS can manage signing automatically.
  - Android default output is AAB (required by Play).

### 3) What “submission” means

- After a successful build, “submission” is the step that uploads your artifact to the store:
  - Apple: to App Store Connect (TestFlight and App Store).
  - Google: to Google Play Console (internal/closed/open testing or production track).
- EAS Submit automates this upload so you don’t manually use Transporter/Xcode (iOS) or the Play Console (Android).

### 4) Create store accounts (costs and requirements)

- Apple Developer Program
  - Cost: USD $99/year.
  - Where: developer.apple.com → enroll (Individual or Company).
  - Requirements: legal name, phone, address; for Company, D‑U‑N‑S number; Apple ID with 2FA; banking/tax info later in App Store Connect.
- Google Play Console
  - Cost: USD $25 one‑time.
  - Where: play.google.com/console → Sign up.
  - Requirements: Google account with 2FA; developer name, contact email; later banking/tax info.

### 5) Store listing checklists (minimum to publish)

- Apple (App Store Connect)
  - App record for `com.metals.wallet`, display name, category, age rating, privacy policy URL, App Privacy questionnaire, screenshots, description, keywords, support URL, marketing URL (optional).
- Google (Play Console)
  - App for `com.metals.wallet`, app content rating, Data Safety form, privacy policy URL, short/long descriptions, screenshots, feature graphic (optional), contact email/website.

### 6) Connect credentials for EAS Submit (recommended)

- iOS: App Store Connect API Key (best for CI/non‑interactive)

  1. App Store Connect → Users and Access → Keys → App Store Connect API → Generate.
  2. Roles: Admin or Developer (Admin if also managing certificates/profiles).
  3. Save Key ID, Issuer ID, and download the `.p8` private key.
  4. Configure in EAS once:
```bash
# Option A: store with EAS (encrypted)
eas credentials -p ios
# Option B: pass at submit time
npx --yes eas submit -p ios --latest \
  --asc-api-key-path ./AuthKey_XXXXXX.p8 \
  --asc-api-key-issuer-id <ISSUER_ID> \
  --asc-api-key-id <KEY_ID> --non-interactive
```


- Android: Google Play Service Account JSON

  1. Play Console → API access → Link Google Cloud project → Create Service Account.
  2. In IAM, grant role: Release Manager (or Editor) to the service account.
  3. Create key → JSON, download.
  4. Configure in EAS:
```bash
# Option A: store with EAS (encrypted)
eas credentials -p android
# Option B: pass at submit time
npx --yes eas submit -p android --latest \
  --key ./play-service-account.json --non-interactive
```


### 7) Submit with EAS (repeatable monthly releases)

- After each production build completes (or reuse the latest):
```bash
# iOS (TestFlight/App Store Connect)
npx --yes eas submit -p ios --latest --non-interactive

# Android (Google Play Console)
npx --yes eas submit -p android --latest --non-interactive
```

- Target tracks:
  - iOS: uploaded build goes to TestFlight; promote to App Store release in App Store Connect.
  - Android: specify track if desired (defaults vary by account). Example:
```bash
npx --yes eas submit -p android --latest --track internal --non-interactive
```


### 8) Versioning and incrementing

- Your `eas.json` uses remote app versions; `production.autoIncrement: true` will bump build numbers automatically.
- Marketing version (app version) stays under `app.json` → `expo.version`.

### 9) When to use EAS Submit vs manual

- Use EAS Submit (recommended): predictable monthly cadence, CI/CD friendly, credential reuse, fewer manual steps, consistent logs.
- Manual upload: only when troubleshooting store validation issues, or when company policy requires Transporter/Xcode (iOS) or manual Play Console steps.

### 10) Release flow template

- Preview: build simulator artifacts → ad‑hoc internal testing.
- Pre‑release: production builds → submit to TestFlight and Play internal track → QA/sign‑offs.
- Release: promote approved builds to production in App Store Connect and Google Play.
- Repeat monthly with same commands; keep credentials/API keys managed once in EAS.

### 11) Create your store listings (where to go and what to fill)

- Apple (App Store Connect → My Apps → “+” → New App)
  - Platform: iOS; Name; Primary language; Bundle ID: `com.metals.wallet`; SKU; User access.
  - App Information: name, subtitle, categories, privacy policy URL, age rating.
  - App Privacy: complete data collection/usage (Privacy Nutrition Labels).
  - Pricing and Availability: price tier (Free), territories.
  - App Review Information: contact, demo account if needed, reviewer notes.
  - Screenshots: iPhone 6.7" and 5.5" required sets; upload after building or from design exports.
  - Links: App Store Connect → My Apps; Users and Access for API keys.
- Google (Play Console → All apps → Create app)
  - App details: name, default language, App, Free.
  - Store presence → Main store listing: short/long descriptions, 512×512 icon, 1024×500 feature graphic, phone screenshots (+ tablet recommended), contact email/website, privacy policy URL.
  - App content: Data safety form, Ads declaration, Content rating, Target audience.
  - Countries/regions: select availability; Pricing: Free.
  - Testing tracks: Internal or Closed testing recommended before production.

### To-dos

- [ ] Create Apple and Google developer accounts and complete tax/banking
- [ ] Add App Store Connect API key and Play service account to EAS
- [ ] Run preview simulator builds for QA
- [ ] Run production builds for iOS and Android
- [ ] Submit latest builds with EAS Submit to TestFlight/Play track
- [ ] Promote approved builds to production in both stores