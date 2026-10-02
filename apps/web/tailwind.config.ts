import type { Config } from "tailwindcss"
// ESM import, not require() — this file mixes `import`/`export default` (ESM)
// with a bare `require()` call, and under some invocation paths (confirmed:
// postcss-loader's config resolution on a cold route compile) Node's module
// loader runs it as real ESM, where `require` is undefined at module scope
// and crashes the whole dev server. CJS default-export interop handles this
// cleanly regardless of which loader path picks the file up.
import baseConfig from "../../packages/config/tailwind.config.js"

const config: Config = {
  ...baseConfig,
  content: [
    "./src/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
}

export default config
