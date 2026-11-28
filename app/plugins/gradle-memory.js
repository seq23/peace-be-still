// Android: Gradle's own memory for the store and card builds. Expo's template gives the Gradle daemon 2 GiB of heap
// and 512 MiB of Metaspace; with SDK 58's native modules the release build ran out of Metaspace (23 Nov it warned at
// the limit, from 24 Nov every Android build hung in "OutOfMemoryError: Metaspace" until the 75-minute timeout).
// The GitHub ubuntu-24.04 runner has 16 GB, so the daemon gets 4 GiB of heap and 1.5 GiB of Metaspace.
const { withGradleProperties } = require('expo/config-plugins');

const KEY = 'org.gradle.jvmargs';
const JVM_ARGS = '-Xmx4096m -XX:MaxMetaspaceSize=1536m -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8';

/** Replaces the template's jvmargs line (or adds one), so there is only ever one. */
function setJvmArgs(props) {
  const kept = props.filter(p => !(p.type === 'property' && p.key === KEY));
  return [...kept, { type: 'property', key: KEY, value: JVM_ARGS }];
}

const withGradleMemory = config => withGradleProperties(config, c => {
  c.modResults = setJvmArgs(c.modResults);
  return c;
});

module.exports = withGradleMemory;
module.exports.setJvmArgs = setJvmArgs;
module.exports.JVM_ARGS = JVM_ARGS;
