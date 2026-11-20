import { build } from 'esbuild';
import { mkdtempSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
const dir = mkdtempSync(join(tmpdir(), 'pbs-render-'));
const entries = readdirSync('test').filter(f => f.endsWith('.render.tsx'));
await build({ entryPoints: entries.map(f => `test/${f}`), outdir: dir, outExtension: { '.js': '.cjs' }, bundle: true, platform: 'node', format: 'cjs', packages: 'external', external: ['react', 'react-test-renderer'], plugins: [{ name: 'native-mocks', setup(b) {
  b.onResolve({ filter: /^(react-native|react-native-svg|expo-localization|expo-crypto|@expo-google-fonts\/.*|@react-native-async-storage\/async-storage)$/ }, args => ({ path: args.path, namespace: 'mock' }));
  b.onLoad({ filter: /.*/, namespace: 'mock' }, args => {
    if (args.path === 'react-native') return { contents: `const React = require('react'); const component = name => props => React.createElement(name, props, props.children); for (const name of ['ActivityIndicator','Pressable','SafeAreaView','ScrollView','Text','TextInput','View']) exports[name] = component(name); exports.StyleSheet = {create: x => x}; exports.useColorScheme = () => 'light'; exports.Linking = { openURL: async url => { (globalThis.__pbsOpened ??= []).push(url); } };`, loader: 'js' };
    if (args.path === 'react-native-svg') return { contents: `const React = require('react'); const component = name => props => React.createElement(name, props, props.children); exports.__esModule = true; exports.default = component('Svg'); exports.Path = component('Path'); exports.Rect = component('Rect');`, loader: 'js' };
    if (args.path.includes('async-storage')) return { contents: `module.exports = globalThis.__pbsStorage;`, loader: 'js' };
    if (args.path === 'expo-crypto') return { contents: `exports.randomUUID = () => require('node:crypto').randomUUID();`, loader: 'js' };
    if (args.path === 'expo-localization') return { contents: `exports.getLocales = () => [{ languageCode: globalThis.__pbsLocale || 'en' }];`, loader: 'js' };
    return { contents: `exports.useFonts = () => [true];`, loader: 'js' };
  });
} }] });
const result = spawnSync(process.execPath, ['--test', ...entries.map(f => join(dir, f.replace(/\.tsx$/, '.cjs')))], { stdio: 'inherit', env: { ...process.env, NODE_PATH: join(process.cwd(), 'node_modules') } });
process.exit(result.status ?? 1);
