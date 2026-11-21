// The ONE way this repo publishes a folder to a Cloudflare Pages preview (the phone app preview,
// app/scripts/preview/host.mjs, and the website preview, .github/workflows/site.yml): find or create
// the project, deploy the folder on a branch, accept only wrangler's confirmed-success line, and
// return the deployment URL. Any failure is NAMED STOP [PREVIEW_HOST_FAILED].
// CLI: PREVIEW_BRANCH=<branch> node scripts/lib/pages-publish.mjs <project> <directory> [--noindex] [--wait]
//   --noindex writes X-Robots-Tag noindex headers and a Disallow robots.txt into the folder first
//             (use it on a throwaway copy: it overwrites _headers and robots.txt);
//   --wait    also requires the URL to answer 200 within 5 minutes (a new project's hostname waits
//             for its TLS certificate on the first deploy).
import { spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const WRANGLER = 'wrangler@4.110.0';
const stop = () => { throw new Error('NAMED STOP [PREVIEW_HOST_FAILED]'); };

export function noindex(directory, extraHeaders = '') {
  writeFileSync(resolve(directory, '_headers'), `/*\n  X-Robots-Tag: noindex, nofollow, noarchive\n${extraHeaders}`);
  writeFileSync(resolve(directory, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
}

export function publishPages({ project, branch, directory, env = process.env, run = spawnSync }) {
  if (!env.CLOUDFLARE_API_TOKEN || !env.CLOUDFLARE_ACCOUNT_ID || !project || !branch || !existsSync(resolve(directory, 'index.html'))) stop();
  const invoke = (args) => run('npx', ['--yes', WRANGLER, 'pages', ...args], { env: { ...env, NO_COLOR: '1' }, encoding: 'utf8', timeout: 120000 });
  const list = invoke(['project', 'list', '--json']);
  if (list.status !== 0) stop();
  let projects;
  try { projects = JSON.parse(list.stdout); } catch { stop(); }
  if (!Array.isArray(projects)) stop();
  if (!projects.some((p) => p.name === project || p['Project Name'] === project)) {
    if (invoke(['project', 'create', project, '--production-branch', 'main']).status !== 0) stop();
  }
  const deployed = invoke(['deploy', directory, '--project-name', project, '--branch', branch]);
  if (deployed.status !== 0) stop();
  // Wrangler 4.110 can exit zero with an unconfirmed status and a URL.
  // Only its confirmed-success branch emits this result line.
  const confirmed = (deployed.stdout ?? '').match(/Deployment complete! Take a peek over at (https:\/\/[a-z0-9.-]+\.pages\.dev)\b/);
  if (!confirmed) stop();
  const urls = confirmed[1].match(/https:\/\/[a-z0-9-]+\.[a-z0-9-]+\.pages\.dev\b/g) ?? [];
  const url = urls.find((value) => new URL(value).hostname.endsWith('.' + project + '.pages.dev'));
  if (!url) stop();
  if (env.GITHUB_OUTPUT) appendFileSync(env.GITHUB_OUTPUT, `url=${url}\n`);
  return url;
}

export async function waitUp(url, { tries = 30, delayMs = 10000, fetcher = fetch } = {}) {
  for (let i = 0; i < tries; i++) {
    try { if ((await fetcher(url + '/')).status === 200) return url; } catch {}
    if (i < tries - 1) await new Promise((r) => setTimeout(r, delayMs));
  }
  stop();
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  try {
    const [project, directory] = process.argv.slice(2);
    if (process.argv.includes('--noindex') && existsSync(resolve(directory ?? '', 'index.html'))) noindex(directory);
    const url = publishPages({ project, branch: process.env.PREVIEW_BRANCH, directory });
    if (process.argv.includes('--wait')) await waitUp(url);
    console.log(url);
  } catch { console.error('NAMED STOP [PREVIEW_HOST_FAILED]'); process.exitCode = 1; }
}
