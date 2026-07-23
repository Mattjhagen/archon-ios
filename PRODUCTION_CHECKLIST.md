# Production Deployment Checklist

This document covers what's left to do before shipping Archon Mobile to the App Store.

---

## 1. Xcode Project Setup (required before first build)

```bash
./setup.sh
```

Then edit `Config/Config.xcconfig` with your real values:

```
SUPABASE_URL = https://your-project.supabase.co
SUPABASE_ANON_KEY = your_anon_key_here
API_BASE_URL = https://app.relayapp.pro/api
```

---

## 2. Set Development Team

In `project.yml`, set your Apple Developer Team ID:

```yaml
DEVELOPMENT_TEAM: "YOUR_TEAM_ID"
```

Then regenerate the Xcode project:

```bash
xcodegen generate
```

Without this, builds will fail on physical devices and you cannot submit to the App Store.

---

## 3. App Store Connect Setup

- [ ] Create an App Store Connect app record
- [ ] Set the app's Bundle ID to `com.archon.mobile` (or update `bundleIdPrefix` in `project.yml`)
- [ ] Upload app screenshots for all required device sizes (6.7", 6.5", 5.5" iPhone + 12.9" iPad)
- [ ] Write app description, keywords, and marketing URL
- [ ] Set privacy policy URL (required for apps with accounts)

---

## 4. Backend Requirements

The app expects a REST API at the configured `API_BASE_URL` with these endpoints:

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/projects` | List user projects |
| POST | `/projects` | Create project |
| PATCH | `/projects/:id` | Update project |
| DELETE | `/projects/:id` | Delete project |
| GET | `/agent/tasks` | List tasks |
| GET | `/agent/tasks/:id` | Get task details |
| GET | `/agent/tasks/:id/events` | Get task events |
| POST | `/agent/tasks` | Create task |
| POST | `/agent/tasks/:id/cancel` | Cancel task |
| POST | `/ai/chat` | Send chat message |
| GET | `/ai/providers` | List AI providers |

Ensure your backend is deployed, responding correctly, and the Supabase auth RLS policies allow the mobile app user to access their data.

---

## 5. Apple Sign In

Apple Sign In requires an Apple Developer account with "Sign In with Apple" capability enabled:

- [ ] Enable "Sign In with Apple" in your Apple Developer account
- [ ] In Xcode, add the "Sign In with Apple" capability to the target
- [ ] Configure the Supabase OAuth provider for Apple with your Apple Team ID and Service ID
- [ ] Update the redirect URL if needed (currently `com.archonmobile.auth://auth/callback`)

---

## 6. Crash Reporting & Analytics

These are not yet integrated. Add before shipping:

- [ ] **Crashlytics** or **Sentry** for crash reporting
- [ ] **PostHog**, **Amplitude**, or **Mixpanel** for user analytics
- [ ] At minimum, add `os_log` or `OSLog` calls in catch blocks for server-side logging

---

## 7. CI/CD

No CI pipeline is configured yet. Recommended:

- [ ] Set up GitHub Actions or Fastlane for:
  - Build verification on PRs
  - Automatic TestFlight uploads on `main` branch pushes
  - App Store submission automation

Example Fastlane `Fastfile`:

```ruby
default_platform(:ios)

platform :ios do
  desc "Run tests"
  lane :test do
    run_tests(scheme: "ArchonMobile")
  end

  desc "Push to TestFlight"
  lane :beta do
    build_app(scheme: "ArchonMobile")
    upload_to_testflight
  end
end
```

---

## 8. Networking & Security

- [ ] **Certificate pinning** — Consider adding `URLSession` certificate pinning for the API endpoint to prevent MITM attacks
- [ ] **Token refresh** — Verify Supabase token refresh works correctly on long-lived sessions
- [ ] **Rate limiting** — The API client has retry logic for 5xx, but verify your backend has rate limiting configured
- [ ] **Minimum TLS version** — Ensure your backend enforces TLS 1.2+

---

## 9. Performance

- [ ] **Network caching** — Add `URLCache` configuration or ETag support to reduce redundant API calls
- [ ] **Image caching** — If you add project thumbnails later, use `AsyncImage` with a cache
- [ ] **Launch screen** — The app uses `UILaunchScreen_Generation` which shows a blank screen; add a branded launch screen for better first impression

---

## 10. App Review Guidelines

Apple will review your app. Common rejection reasons to address:

- [ ] **Sign In with Apple** — If you offer any third-party login (email counts), you must also offer Apple Sign In (already implemented)
- [ ] **Privacy nutrition labels** — In App Store Connect, declare what data you collect (email, user content, usage data)
- [ ] **App Review notes** — Provide test credentials in the review notes so Apple can test the login flow
- [ ] **Minimum functionality** — Ensure the demo mode (MockAPIClient) works without login so reviewers can see the UI
- [ ] **No broken links** — Verify all URLs in the app (privacy policy, licenses) are accessible

---

## 11. What Was Fixed in This Pass

These issues were resolved to improve production readiness:

| Fix | File | Detail |
|-----|------|--------|
| Pinned Supabase SDK | `project.yml` | Locked to `exact: 2.53.0` for reproducible builds |
| Removed force unwraps | `Environment.swift` | All URLs now use `guard let` with `assertionFailure` in debug |
| Moved URLs to xcconfig | `Environment.swift`, `Config.example.xcconfig` | All config is now environment-driven |
| Fixed force unwrap | `CodeBrowserViewModel.swift:80` | `var children = nodes[i].children` instead of `!` |
| Fixed silent catch | `BuilderViewModel.swift:180` | Empty `catch {}` now logs in DEBUG builds |
| Removed force unwraps | `MockAPIClient.swift` | All `Calendar.current.date(byAdding:)!` replaced with `?? now` |
| Added AuthManager tests | `AuthManagerTests.swift` | Tests for UserProfile, singleton pattern, initial state |
| Added SettingsViewModel tests | `SettingsViewModelExtendedTests.swift` | Tests for persistence, defaults, bundle version |
| Fixed polling test | `PollingTestsFixed.swift` | Replaced broken assertion with meaningful tests |
| Added setup script | `setup.sh` | Automated project setup for new developers |
| Added accessibility hints | `BuilderView.swift`, `SettingsView.swift` | Hints on model picker, licenses, delete account |

---

## 12. Recommended Next Steps (Priority Order)

1. **Set `DEVELOPMENT_TEAM`** and regenerate the Xcode project
2. **Fill in `Config.xcconfig`** with real Supabase credentials
3. **Verify backend endpoints** return the correct shapes (see API models in `ArchonMobile/Models/`)
4. **Add crash reporting** (Sentry or Crashlytics)
5. **Set up Fastlane** for automated TestFlight uploads
6. **Test on a physical device** — verify Keychain storage, Apple Sign In, and push notifications
7. **Submit to App Store** with privacy nutrition labels and review notes
