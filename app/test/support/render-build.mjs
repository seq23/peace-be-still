// Bundles test/screens.render.tsx with the real screens and runs it under node:test. Native modules are
// replaced by HOST elements (a plain string type, as React Native's own primitives are), so each element
// exists once in the tree. expo-router is replaced by a recorder: tests assert where a screen navigates
// (push/replace/back/Redirect) and read the layouts' Stack/Tabs configuration as data.
import { build } from 'esbuild';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const host = names => names.map(name => `exports[${JSON.stringify(name)}] = ${JSON.stringify(name)};`).join('\n');
const MOCKS = {
  'react-native': `${host(['ActivityIndicator', 'Pressable', 'ScrollView', 'Switch', 'Text', 'TextInput', 'View'])}
    exports.StyleSheet = { create: x => x };
    exports.Platform = { OS: 'web', select: o => o.web ?? o.default };
    exports.useColorScheme = () => globalThis.__pbsScheme || 'light';`,
  'react-native-safe-area-context': `${host(['SafeAreaView'])}
    exports.SafeAreaProvider = ({ children }) => children;
    exports.useSafeAreaInsets = () => ({ top: 0, bottom: 0, left: 0, right: 0 });`,
  'react-native-svg': `exports.__esModule = true; exports.default = 'Svg'; ${host(['Path', 'Rect', 'Circle'])}`,
  'expo-router': `const React = require('react');
    const r = () => globalThis.__pbsRouter;
    exports.useRouter = () => r();
    exports.useLocalSearchParams = () => globalThis.__pbsParams || {};
    exports.Redirect = props => React.createElement('Redirect', props);
    const layout = name => { const C = props => React.createElement(name, props, props.children); C.Screen = props => React.createElement(name + '.Screen', props); C.Protected = props => React.createElement(name + '.Protected', props, props.children); return C; };
    exports.Stack = layout('Stack'); exports.Tabs = layout('Tabs');`,
  'expo-font': `exports.useFonts = () => globalThis.__pbsFonts || [true, null];`,
  'expo-localization': `exports.getLocales = () => [{ languageCode: globalThis.__pbsLocale || 'en' }];`,
  '@react-native-async-storage/async-storage': `module.exports = { __esModule: true, default: globalThis.__pbsStorage };`,
  'react-native-purchases': `exports.default = { configure() {} };`,
};

const dir = mkdtempSync(join(tmpdir(), 'pbs-render-'));
await build({
  entryPoints: ['test/screens.render.tsx'], outfile: join(dir, 'screens.cjs'), bundle: true, platform: 'node', format: 'cjs',
  packages: 'external', external: ['react', 'react-test-renderer', 'i18n-js'], jsx: 'automatic', logLevel: 'warning',
  plugins: [{ name: 'native-mocks', setup(b) {
    b.onResolve({ filter: /^(react-native|react-native-safe-area-context|react-native-svg|expo-router|expo-font|expo-localization|@react-native-async-storage\/async-storage|react-native-purchases|@expo-google-fonts\/.*)$/ }, args => ({ path: args.path, namespace: 'mock' }));
    b.onLoad({ filter: /.*/, namespace: 'mock' }, args => ({
      contents: MOCKS[args.path] ?? `module.exports = new Proxy({}, { get: (_, key) => key === '__esModule' ? false : String(key) });`,
      loader: 'js',
    }));
  } }],
});
const result = spawnSync(process.execPath, ['--test', ...process.argv.slice(2), join(dir, 'screens.cjs')], { stdio: 'inherit', env: { ...process.env, NODE_PATH: join(process.cwd(), 'node_modules') } });
process.exit(result.status ?? 1);
