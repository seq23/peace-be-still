// Android: Write your own night's folder (files/own-nights/, Paths.document in app/src/ownNight/adapters.ts) is left
// out of Google backup and of device-to-device transfer, so "never uploaded" stays true; the rest of the app's
// data (settings, journal) still backs up as before. Android reads these rules at build time: fullBackupContent
// for Android 11 and below, dataExtractionRules for Android 12 and up. The iPhone marks the same folder at run
// time (modules/backup-exclude). scripts/android/check-aab.mjs fails a bundle whose manifest lacks both.
const fs = require('fs');
const path = require('path');
const { withAndroidManifest, withDangerousMod } = require('expo/config-plugins');

const FOLDER = 'own-nights/';
const FULL_BACKUP = 'pbs_backup_rules';
const EXTRACTION = 'pbs_data_extraction_rules';

const exclude = `<exclude domain="file" path="${FOLDER}" />`;
const FILES = {
  [`${FULL_BACKUP}.xml`]: `<?xml version="1.0" encoding="utf-8"?>\n<full-backup-content>\n  ${exclude}\n</full-backup-content>\n`,
  [`${EXTRACTION}.xml`]: `<?xml version="1.0" encoding="utf-8"?>\n<data-extraction-rules>\n  <cloud-backup>\n    ${exclude}\n  </cloud-backup>\n  <device-transfer>\n    ${exclude}\n  </device-transfer>\n</data-extraction-rules>\n`,
};

/** Points the application at the two rule files. Another plugin's rules would be dropped silently, so that stops the build. */
function setBackupRules(manifest) {
  const app = manifest.manifest.application?.[0];
  if (!app) throw new Error('OWN_NIGHT_BACKUP_NO_APPLICATION: the Android manifest has no <application>');
  app.$ = app.$ ?? {};
  for (const [attr, name] of [['android:fullBackupContent', FULL_BACKUP], ['android:dataExtractionRules', EXTRACTION]]) {
    const was = app.$[attr];
    if (was && was !== `@xml/${name}`) throw new Error(`OWN_NIGHT_BACKUP_RULES_TAKEN: ${attr} is already ${was}; merge its rules with ${name}.xml by hand`);
    app.$[attr] = `@xml/${name}`;
  }
  return manifest;
}

function writeRuleFiles(projectRoot) {
  const dir = path.join(projectRoot, 'app', 'src', 'main', 'res', 'xml');
  fs.mkdirSync(dir, { recursive: true });
  for (const [file, xml] of Object.entries(FILES)) fs.writeFileSync(path.join(dir, file), xml);
}

const withOwnNightBackup = config => withDangerousMod(
  withAndroidManifest(config, c => { setBackupRules(c.modResults); return c; }),
  ['android', async c => { writeRuleFiles(c.modRequest.platformProjectRoot); return c; }],
);

module.exports = withOwnNightBackup;
module.exports.FOLDER = FOLDER;
module.exports.FILES = FILES;
module.exports.setBackupRules = setBackupRules;
module.exports.writeRuleFiles = writeRuleFiles;
