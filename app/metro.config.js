const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
// The Bible ships as SQLite files (src/bible/data/*.db); the web build of SQLite is a .wasm file.
config.resolver.assetExts.push('db', 'wasm');
// The 66-book list is shared with the audio and import scripts (content/bible/books.json).
config.watchFolders = [...(config.watchFolders ?? []), path.resolve(__dirname, '../content/bible')];
// SQLite on the web needs SharedArrayBuffer, so the page must be cross-origin isolated. require-corp (not
// credentialless, which iPhone Safari lacks) with every asset same-origin; the preview host sets the same.
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
