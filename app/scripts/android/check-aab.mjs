// Reads the built Android App Bundle before it is uploaded: package name, versionCode, permissions and the
// upload certificate. Fails on the wrong package, a missing versionCode, or a permission the app must not ask for
// (the Play Data safety answers and the privacy policy rely on these staying out; app.config.ts blocks them).
// Writes version_code and sha1 to $GITHUB_OUTPUT when it is set.
// Usage: node scripts/android/check-aab.mjs <app.aab> <bundletool.jar>
import { appendFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

export const PACKAGE = 'com.peacebestillapp.mobile';
export const FORBIDDEN = ['android.permission.RECORD_AUDIO', 'android.permission.READ_EXTERNAL_STORAGE', 'android.permission.WRITE_EXTERNAL_STORAGE',
  'android.permission.SYSTEM_ALERT_WINDOW', 'com.google.android.gms.permission.AD_ID', 'android.permission.CAMERA', 'android.permission.ACCESS_FINE_LOCATION',
  'android.permission.ACCESS_COARSE_LOCATION', 'android.permission.READ_CONTACTS'];

export function manifestIssues(xml) {
  const pkg = xml.match(/\bpackage="([^"]+)"/)?.[1];
  const versionCode = xml.match(/android:versionCode="(\d+)"/)?.[1];
  const permissions = [...xml.matchAll(/<uses-permission[^>]*android:name="([^"]+)"/g)].map(m => m[1]);
  const issues = [];
  if (pkg !== PACKAGE) issues.push(`AAB_WRONG_PACKAGE: ${pkg ?? 'none'}`);
  if (!versionCode) issues.push('AAB_NO_VERSION_CODE');
  for (const p of permissions.filter(p => FORBIDDEN.includes(p))) issues.push(`AAB_FORBIDDEN_PERMISSION: ${p}`);
  if (!permissions.includes('com.android.vending.BILLING')) issues.push('AAB_NO_BILLING: Google Play Billing is missing, the paid plan could not be bought');
  return { pkg, versionCode, permissions, issues };
}

function run(cmd, args) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`${cmd} ${args[0]} failed: ${r.stderr.slice(0, 500)}`);
  return r.stdout;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [aab, jar] = process.argv.slice(2);
  try {
    const { pkg, versionCode, permissions, issues } = manifestIssues(run('java', ['-jar', jar, 'dump', 'manifest', `--bundle=${aab}`]));
    const sha1 = run('keytool', ['-printcert', '-jarfile', aab]).match(/SHA1:\s*([0-9A-F:]{59})/)?.[1];
    if (!sha1) issues.push('AAB_UNSIGNED: no upload certificate on the bundle');
    console.log(`package ${pkg} versionCode ${versionCode} upload-cert SHA1 ${sha1 ?? 'none'}`);
    console.log(`permissions: ${permissions.join(' ')}`);
    if (issues.length) throw new Error(issues.join('; '));
    if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `version_code=${versionCode}\nsha1=${sha1}\n`);
    console.log(`OUTPUT aab: ${pkg} versionCode ${versionCode}, signed (SHA1 ${sha1}), no forbidden permission`);
  } catch (error) { console.error(String(error.message ?? error)); process.exit(1); }
}
