// Single source of truth for the version-indicator string the UI
// renders (e.g. in the Layout footer). All four values are baked at
// build time by vite.config.ts; see src/vite-env.d.ts for their decls.
export const VERSION_INDICATOR =
  `${__APP_NAME__} ${__APP_VERSION__} / engine ${__ENGINE_VERSION__} (${__ENGINE_SHA__})`;

export const APP_NAME = __APP_NAME__;
export const APP_VERSION = __APP_VERSION__;
export const ENGINE_VERSION = __ENGINE_VERSION__;
export const ENGINE_SHA = __ENGINE_SHA__;
