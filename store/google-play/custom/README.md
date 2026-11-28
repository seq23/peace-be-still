# Google Play custom store listings (Peace Be Still)

One file per listing, one per App Store custom product page (store/custom/<page>.md). Each is entered by hand in
Play Console > Grow users > Store presence > Store listings > Create custom store listing (Play has no API for
custom listings), audience "Users who visit via a unique URL" with the URL parameter on the `URL parameter:` line,
no country targeting. Contact details, privacy policy and category are shared with the main listing.

- `<page>.md`: the listing text per Play language (`## en-US`, `## es-US`); the first section is the default language.
- `<page>/<lang>/phone/NN-key.png`: phone screenshots, 1080x1920, no alpha, in order.
- `<page>/<lang>/feature-graphic.png`: 1024x500, no alpha.
- `icon-512.png`: the app icon at 512x512 with alpha (the same on every listing).
- `shots.json`: every screen's text on screen, from the run that made the pictures.

Made by `PW_DIR=<dir with playwright-core> node scripts/store-shots/shots.mjs <main web preview url> <out> --play`,
then copied here without `raw/`. app/test/releaseGate.unit.ts checks the text, the pictures and the record.
The site links each listing from the same pages as its App Store page (site/config/store.json `play_listing`).
