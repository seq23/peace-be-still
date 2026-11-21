// Bundles test/screens.render.tsx with the real screens and runs it under node:test. Native modules are
// replaced by HOST elements (a plain string type, as React Native's own primitives are), so each element
// exists once in the tree. expo-router is replaced by a recorder: tests assert where a screen navigates
// (push/replace/back/Redirect) and read the layouts' Stack/Tabs configuration as data.
import { build } from 'esbuild';
import { mkdtempSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const host = names => names.map(name => `exports[${JSON.stringify(name)}] = ${JSON.stringify(name)};`).join('\n');
const MOCKS = {
  'react-native': `${host(['ActivityIndicator', 'Image', 'Modal', 'Pressable', 'ScrollView', 'Switch', 'Text', 'TextInput', 'View'])}
    exports.StyleSheet = { create: x => x };
    exports.AppState = { currentState: 'active', addEventListener: () => ({ remove() {} }) };
    exports.Linking = { openURL: async url => globalThis.__pbsOpenURL?.(url), openSettings: async () => globalThis.__pbsOpenURL?.('app-settings:') };
    exports.Platform = { get OS() { return globalThis.__pbsPlatform ?? 'web'; }, select: o => o.web ?? o.default };
    exports.useColorScheme = () => globalThis.__pbsScheme || 'light';`,
  'react-native-safe-area-context': `${host(['SafeAreaView'])}
    exports.SafeAreaProvider = ({ children }) => children;
    exports.useSafeAreaInsets = () => ({ top: 0, bottom: 0, left: 0, right: 0 });`,
  'react-native-svg': `const React = require('react');
    exports.__esModule = true;
    exports.default = React.forwardRef(({ children, ...props }, ref) => {
      React.useImperativeHandle(ref, () => ({ toDataURL: callback => globalThis.__pbsCapture(callback) }));
      return React.createElement('Svg', props, children);
    });
    ${host(['Path', 'Rect', 'Circle'])}
    exports.Text = 'SvgText';`,
  'expo-asset': `const { readFileSync } = require('node:fs');
    exports.Asset = { fromModule: name => ({
      uri: 'data:application/octet-stream;base64,' + readFileSync(name.endsWith('.wasm') ? 'node_modules/sql.js/dist/' + name : 'src/bible/data/' + name).toString('base64')
    }) };`,
  'expo-file-system': '',
  // The web Bible's real engine (src/bible/open.web.ts), with one switch: a test may make the next N reads fail,
  // like a cold start whose first open or read fails.
  'sql.js': `const real = require(require.resolve('sql.js/dist/sql-wasm.js', { paths: [process.cwd()] }));
    module.exports = async options => {
      const SQL = await real(options);
      const prepare = SQL.Database.prototype.prepare;
      SQL.Database.prototype.prepare = function (sql) {
        if (globalThis.__pbsSqlFailures > 0) { globalThis.__pbsSqlFailures--; throw new Error('cold start'); }
        return prepare.call(this, sql);
      };
      return SQL;
    };
    module.exports.default = module.exports;`,
  'expo-router': `const React = require('react');
    const r = () => globalThis.__pbsRouter;
    exports.useRouter = () => r();
    exports.useLocalSearchParams = () => globalThis.__pbsParams || {};
    exports.useIsFocused = () => true;
    exports.useGlobalSearchParams = () => globalThis.__pbsParams || {};
    exports.useSegments = () => globalThis.__pbsSegments || [];
    exports.Redirect = props => React.createElement('Redirect', props);
    const layout = name => { const C = props => React.createElement(name, props, props.children); C.Screen = props => React.createElement(name + '.Screen', props); C.Protected = props => React.createElement(name + '.Protected', props, props.children); return C; };
    exports.Stack = layout('Stack'); exports.Tabs = layout('Tabs');`,
  'expo-font': `exports.useFonts = () => globalThis.__pbsFonts || [true, null];`,
  'expo-localization': `exports.getLocales = () => [{ languageCode: globalThis.__pbsLocale || 'en', regionCode: globalThis.__pbsRegion ?? 'US' }];`,
  '@react-native-async-storage/async-storage': `module.exports = { __esModule: true, default: globalThis.__pbsStorage };`,
  // The audio host from app.config.ts, plus whatever a test sets (the RevenueCat key).
  'expo-constants': `exports.__esModule = true; exports.default = { get expoConfig() {
    return { ...globalThis.__pbsExpoConfig, extra: { audioBaseUrl: require('./app.config').default.extra.audioBaseUrl, ...globalThis.__pbsExpoConfig?.extra } };
  } };`,
  'expo-audio': '',
  // The phone's own time picker, drawn as a host the test can turn and close.
  '@react-native-community/datetimepicker': `const React = require('react'); exports.__esModule = true; exports.default = props => React.createElement('DateTimePicker', props);`,
  // The phone's notification system: the test's fake phone (globalThis.__pbsNotifications) answers every call.
  'expo-notifications': `const n = () => globalThis.__pbsNotifications;
    exports.SchedulableTriggerInputTypes = { DAILY: 'daily' };
    exports.setNotificationHandler = () => {};
    for (const name of ['getPermissionsAsync', 'requestPermissionsAsync', 'cancelAllScheduledNotificationsAsync', 'scheduleNotificationAsync'])
      exports[name] = (...args) => n()[name](...args);`,
  'expo-brightness': '',
  // Lane 4S: the player hook reads the test's fake player.
  'player-hook': `const React = require('react');
    exports.tracks = require('./src/player/library.json');
    exports.useDimmer = () => ({ dimmed: false, touch() {} });
    exports.usePlayer = () => {
      const player = globalThis.__pbsPlayer;
      const state = React.useSyncExternalStore(player.subscribe, player.getState);
      return { player, state, stop: globalThis.__pbsAudioStop || null };
    };`,
  'expo-crypto': `let n = 0; exports.randomUUID = () => '00000000-0000-4000-8000-' + String(++n).padStart(12, '0');`,
  'react-native-purchases': `exports.__esModule = true; exports.default = globalThis.__pbsPurchases;
    exports.PURCHASES_ERROR_CODE = { PAYMENT_PENDING_ERROR: '20', PURCHASE_CANCELLED_ERROR: '1' };`,
};

// Every test/*.render.tsx is its own bundle and process, so each file sets its own globals.
const dir = mkdtempSync(join(tmpdir(), 'pbs-render-'));
const files = readdirSync('test').filter(f => f.endsWith('.render.tsx'));
for (const file of files) await build({
  entryPoints: [join('test', file)], outfile: join(dir, file.replace(/\.tsx$/, '.cjs')), bundle: true, platform: 'node', format: 'cjs',
  define: { __DEV__: 'false' }, resolveExtensions: ['.web.tsx', '.web.ts', '.tsx', '.ts', '.jsx', '.js', '.json'], packages: 'external', external: ['react', 'react-test-renderer', 'i18n-js'], jsx: 'automatic', logLevel: 'warning',
  plugins: [{ name: 'native-mocks', setup(b) {
    b.onResolve({ filter: /\/player\/usePlayer$/ }, () => ({ path: 'player-hook', namespace: 'mock' }));
    b.onResolve({ filter: /\.(db|wasm)$/ }, args => ({ path: args.path.split('/').at(-1), namespace: 'bible-asset' }));
    b.onLoad({ filter: /.*/, namespace: 'bible-asset' }, args => ({ contents: `module.exports = ${JSON.stringify(args.path)}` }));
    b.onResolve({ filter: /^(@react-native-community\/datetimepicker|expo-notifications|expo-audio|expo-brightness|expo-asset|expo-file-system|sql\.js|react-native|react-native-safe-area-context|react-native-svg|expo-router|expo-constants|expo-font|expo-localization|expo-crypto|@react-native-async-storage\/async-storage|react-native-purchases|@expo-google-fonts\/.*)$/ }, args => ({ path: args.path, namespace: 'mock' }));
    b.onLoad({ filter: /.*/, namespace: 'mock' }, args => ({
      contents: MOCKS[args.path] ?? `module.exports = new Proxy({}, { get: (_, key) => key === '__esModule' ? false : String(key) });`,
      loader: 'js', resolveDir: process.cwd(),
    }));
  } }],
});
const result = spawnSync(process.execPath, ['--test', ...process.argv.slice(2), ...files.map(f => join(dir, f.replace(/\.tsx$/, '.cjs')))], { stdio: 'inherit', env: { ...process.env, NODE_PATH: join(process.cwd(), 'node_modules') } });
process.exit(result.status ?? 1);
