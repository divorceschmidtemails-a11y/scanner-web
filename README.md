# Scanner (web app)

A camera scanner that runs in Safari on iPhone — no App Store, no Apple developer account, nothing expires.
Scan notebooks, loose paper, binders, printed pages, photos, or any object. Pages are straightened
automatically (OpenCV.js + jscanify, bundled locally in `vendor/`); you can drag the corners, or tap
**Use Original** for things that aren't flat pages (bracelets, objects). Works offline after the first load.

Scans are stored on the phone (IndexedDB), grouped by collection. Get them out by:
- **Download JPEG** / **Share** on any single scan
- **Export PDF** of a whole collection (Share sheet → Save to Files, AirDrop, Mail, etc.)
- **Share All** – every image in a collection via the iOS share sheet
- **Upload to GitHub** – commits each scan to `scans/<collection>/<time>.jpg` in your private
  `divorceschmidtemails-a11y/scans` repo, viewable from any computer at github.com.

## Hosting
The app must be served over HTTPS for the camera, offline mode and Add to Home Screen to work.
It is **not hosted yet** (this repo is private and GitHub Pages is not enabled). Options: enable
GitHub Pages on this repo (makes the site URL public, though your scans stay in the private `scans` repo),
or any static host.

## Add to Home Screen (iPhone)
1. Open the app's URL in **Safari** (not Chrome).
2. Tap the **Share** button (square with arrow).
3. Scroll down, tap **Add to Home Screen**, then **Add**.
4. Open **Scanner** from the home screen. It now runs full-screen like an app and works offline.

## GitHub token setup (one time)
1. On a computer, go to github.com → your avatar → **Settings → Developer settings →
   Personal access tokens → Fine-grained tokens → Generate new token**.
2. Name it "Scanner", pick an expiration.
3. **Repository access → Only select repositories →** `divorceschmidtemails-a11y/scans`.
4. **Permissions → Repository permissions → Contents → Read and write.** Nothing else.
5. Generate and copy the token (`github_pat_…`).
6. In the app tap **Settings**, paste the token, keep repo `divorceschmidtemails-a11y/scans`, **Save**.

The token is stored only in this phone's Safari storage (localStorage) and is sent only to api.github.com.

## Develop
`npm test` runs node tests for the pure logic (naming, paths, base64, upload request).
Serve locally with `python3 -m http.server`.
Licenses: jsPDF (MIT), jscanify (MIT), OpenCV (Apache 2.0) — see `vendor/`.
