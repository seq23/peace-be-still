// Vite's ?raw imports (the test reads wrangler.jsonc as text).
declare module '*?raw' { const text: string; export default text; }
// The local made-for-you Worker test's fixture: the chat's wrangler vars, injected by esbuild (madeForYou.local.mjs).
declare module 'chat-vars' { const vars: Record<string, string>; export default vars; }
