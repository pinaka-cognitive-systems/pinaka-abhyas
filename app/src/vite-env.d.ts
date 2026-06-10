/// <reference types="vite/client" />

// Brings `import.meta.env` (and `import.meta.env.PROD`) into the type graph for
// the app (W5-4 service-worker registration gates on PROD). `types: []` in
// tsconfig keeps ambient @types out, so this explicit reference is how the
// Vite client types are pulled in — exactly where they are needed and no wider.
