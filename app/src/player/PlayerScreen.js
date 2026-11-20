/** The shell supplies React and React Native so this component can be tested without an app shell. */
export function createPlayerScreen(React, { View, Text, Pressable }) {
  const h = React.createElement;
  return function PlayerScreen({ player, tracks, user }) {
    const [state, setState] = React.useState(player.state());
    const [message, setMessage] = React.useState('');
    React.useEffect(() => player.subscribe(setState), [player]);
    const button = (label, action) => h(Pressable, { key: label, accessibilityRole: 'button', accessibilityLabel: label, onPress: action }, h(Text, { style: styles.button }, label));
    return h(View, { style: [styles.screen, state.dimmed && styles.dim] },
      h(Text, { style: styles.title }, 'Listen'),
      h(Text, { style: styles.text }, state.track ? state.track.ref : 'Choose a track'),
      h(Text, { style: styles.text }, 'Voice made with AI'),
      state.error && h(Text, { style: styles.text }, state.error),
      message && h(Text, { style: styles.text }, message),
      ...tracks.map(item => button(item.ref, () => { player.play(item, user).catch(() => {}); })),
      state.track && button(state.playing ? 'Pause' : 'Resume', () => state.playing ? player.pause() : player.resume().catch(() => {})),
      h(Text, { style: styles.text }, state.deadline ? 'Sleep timer on' : 'Sleep timer off'),
      ...[15, 30, 45, 60].map(n => button(`${n} minutes`, () => player.setSleepTimer(n))),
      button('Turn timer off', () => player.setSleepTimer(null)),
      button(state.dimmed ? 'Brighten screen' : 'Dim screen', () => player.setDimmed(!state.dimmed)),
      state.track && button('Download for offline', () => player.download(state.track, user).then(() => setMessage('Downloaded for offline listening.'), () => setMessage('Offline download unavailable.')))
    );
  };
}
const styles = {
  screen: { flex: 1, backgroundColor: '#0E1A22', padding: 24 },
  dim: { opacity: 0.55 }, title: { color: '#F4F0E6', fontSize: 30, fontFamily: 'LibreCaslonText' },
  text: { color: '#F4F0E6', fontSize: 16, fontFamily: 'Figtree' },
  button: { color: '#86CBC1', fontSize: 16, paddingVertical: 8, fontFamily: 'Figtree' }
};
