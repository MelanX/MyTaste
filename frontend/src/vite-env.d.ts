/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_VERSION?: string;
  readonly VITE_COMMIT_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
