# App Store Launch — Step by Step

Plain-language guide to getting Kalba live on the Apple App Store.
ASC app: **Kalba** (id `6761315112`), bundle `com.kalba.app`, version **1.0.0**.

---

## ✅ Already done (no action needed)

1. **"Delete account"** added in the app (Apple requires it). Live.
2. **Privacy Policy** page (Polish) served at `https://backend-kalba.fly.dev/privacy`. Live.
3. **Server** updated so both work. Deployed to Fly.
4. **Build 32** built on EAS and submitted to TestFlight / App Store Connect.

All code, server, and the build are handled.

---

## 👉 What YOU do (Apple web forms + in-app taps — can't be automated)

### JOB 1 — In the app, on your phone (~5 min)
1. Log in with your **trainer** account.
2. **Create workshop** → title, date a few days out, **price = 0**, capacity = 5 → Save.
   (So the reviewer doesn't see an empty screen.)
3. Log out → **register a NEW account** (Sign up screen):
   - Email: `appreview@kalba.app`
   - Password: anything with letters + numbers (write it down)
   - Name: `App Reviewer`
   This is the demo account for Apple.

### JOB 2 — App Store Connect website (~30–45 min)
Go to **appstoreconnect.apple.com** → app **Kalba** → version **1.0.0**:
1. **Privacy Policy URL** → `https://backend-kalba.fly.dev/privacy`
2. **App Privacy** questionnaire → collect **Email, Name, User ID**; all **"linked to the user"**;
   purpose **"App Functionality"**; **NOT** used for tracking (no analytics/ad SDKs).
3. **Screenshots** → upload app screenshots (6.7" and 6.5" iPhone sizes).
4. **Description, keywords, support URL, category, age rating** → fill the text fields.
5. **App Review Information** → paste demo email + password from Job 1.3.
   Note: *"Log in with the provided email/password. Account deletion is under the Profile tab."*
6. **Build** → select **build 32** (appears after Apple finishes processing, ~10 min after upload).

### JOB 3 — Submit
Top of the version page → **"Add for Review" / "Submit for Review."**
Apple reviews it (usually 1–3 days).

---

## Notes / deliberate choices
- **Sign in with Apple** NOT added — email/password is the accepted alternative (Guideline 4.8).
  Only add it if Apple specifically rejects for it.
- **Forgot-password emails land in spam** (Brevo-from-Gmail) — do NOT make password reset part of
  the review path.
- Build number auto-increments on EAS (`appVersionSource: remote`). Export Compliance auto-passes
  (`ITSAppUsesNonExemptEncryption: false`).

## Links
- Build 32: https://expo.dev/accounts/kalba/projects/kalba/builds/a92aa6d2-2981-4e29-b005-891aac56a7d7
- Submission: https://expo.dev/accounts/kalba/projects/kalba/submissions/141b9dfe-7af5-479c-b7b1-19bb77be2537
- TestFlight: https://appstoreconnect.apple.com/apps/6761315112/testflight/ios
