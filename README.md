# Sight Reading Trail

A mobile-first, account-free interval sight-reading web app with browser-only progress storage.

## Current features

- 24 stages and 72 pathway levels.
- Read, Listen and Sing activities for every stage.
- Ascending and descending intervals in this order: P8, M3, P5, P4, M2, M6, M7, m3, m2, m6, m7 and tritone.
- Pitch labels such as B4 and B5 are hidden from exercises and singing feedback.
- Low G2-G4, Middle C3-C5 and High G3-G5 range presets.
- Read and Listen autoplay.
- Sustained clarinet-style browser synthesis.
- Cumulative mixed-mode Practice sessions.
- Skip-stage assessments with three Read, three Listen and three Sing questions; 8 out of 9 passes the stage.
- Next level, Back to pathway and Try again controls on results screens.
- Cookie-based progress with a localStorage fallback and no sign-in.
- Mobile-responsive interface, installable manifest and offline service worker.

## Open directly from VS Code

1. Open this `sight-reading-trail` folder in VS Code.
2. Open **Run and Debug**.
3. Select **Launch Sight Reading Trail**.
4. Press `F5`.

This opens `index.html` directly in Chrome. Progress falls back to localStorage in direct-file mode. Service workers do not run on `file://` pages, and microphone behaviour can vary by browser.

## Run with full browser features

For the most reliable microphone, cookies and offline behaviour, start a local server from this folder:

```bash
python3 -m http.server 8080
```

On Windows, use this if needed:

```bash
py -m http.server 8080
```

Then select **Launch Sight Reading Trail on localhost** in VS Code and press `F5`, or open `http://localhost:8080` in Chrome.

## Files

- `index.html` - application structure
- `styles.css` - responsive interface styling
- `app.js` - curriculum, lessons, assessments, persistence, notation, audio and pitch detection
- `manifest.json` and `sw.js` - installable offline support
- `icon.svg` - app icon
- `.vscode/launch.json` - direct-file and localhost Chrome launch configurations

## GitHub Pages deployment

Upload the files in this folder directly to the repository root. In **Settings > Pages**, publish the `main` branch from `/(root)`. This build uses versioned JavaScript and CSS URLs plus service-worker cache `v10`, so the newest deployment is fetched instead of an older cached copy.


## New settings

- Custom theme colour with presets and a browser colour picker.
- Practice can be set to Mixed, Read only, Listen only or Sing only.
