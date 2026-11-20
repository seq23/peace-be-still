/** Expo Audio and FileSystem are supplied by the app shell, keeping this lane independent. */
export function createNativeAdapters({ Audio, FileSystem }) {
  const player = Audio.createAudioPlayer(null);
  const directory = new FileSystem.Directory(FileSystem.Paths.document, 'audio');
  const fileFor = item => new FileSystem.File(directory, item.sha256 + '.' + item.file.split('.').pop());
  return {
    audio: {
      async load(uri) {
        await Audio.setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true });
        player.replace({ uri });
      },
      play: () => player.play(), pause: () => player.pause(), dispose: () => player.remove()
    },
    downloads: {
      async find(item) { const file = fileFor(item); return file.exists ? file.uri : null; },
      async save(item) {
        if (!/^[a-f0-9]{64}$/.test(item.sha256)) throw new Error('Track has no verified identity');
        if (!directory.exists) directory.create({ intermediates: true, idempotent: true });
        const file = fileFor(item);
        if (!file.exists) await FileSystem.File.downloadFileAsync(item.url, file, { idempotent: true });
        return file.uri;
      }
    }
  };
}
