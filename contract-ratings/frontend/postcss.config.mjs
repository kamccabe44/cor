// Vite's PostCSS auto-detection walks up parent directories looking for a
// config and would otherwise find ../../postcss.config.mjs (the Next.js
// app's Tailwind setup, whose plugin is only installed in the repo root's
// node_modules, not here). This frontend doesn't use PostCSS/Tailwind at
// all, so an empty local config just stops that upward search.
export default {};
