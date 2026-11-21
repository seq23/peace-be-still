const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
// The Bible ships as SQLite files (src/bible/data/*.db); the web preview's SQLite engine (sql.js) is a .wasm file.
config.resolver.assetExts.push('db', 'wasm');
// sql.js (the web preview's in-memory Bible, src/bible/open.web.ts) names Node's fs, path and crypto in a branch
// that only runs under Node; on the web they resolve to nothing.
const resolve = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, name, platform) => {
  if (platform === 'web' && ['fs', 'path', 'crypto'].includes(name) && /[\\/]sql\.js[\\/]/.test(context.originModulePath)) return { type: 'empty' };
  return (resolve ?? context.resolveRequest)(context, name, platform);
};
// The 66-book list is shared with the audio and import scripts (content/bible/books.json).
config.watchFolders = [...(config.watchFolders ?? []), path.resolve(__dirname, '../content/bible')];
// The dev server serves the page cross-origin isolated, as the preview host does (require-corp, not credentialless,
// which iPhone Safari lacks), so the local page behaves like the preview.
const enhance = config.server.enhanceMiddleware;
config.server.enhanceMiddleware = (middleware, server) => {
  const next = enhance ? enhance(middleware, server) : middleware;
  return (req, res, done) => {
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    return next(req, res, done);
  };
};
module.exports = config;
