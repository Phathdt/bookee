// Minimal ambient typing for Vite-style import.meta.env so this package
// can be authored without depending on vite/client. Consumer apps may
// extend ImportMetaEnv with their own VITE_* keys.

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly DEV?: boolean;
  readonly PROD?: boolean;
  readonly MODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
