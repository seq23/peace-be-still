// Vite's ?raw imports (the test reads wrangler.jsonc as text).
declare module '*?raw' { const text: string; export default text; }
