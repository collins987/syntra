import type { Config } from "tailwindcss"
// eslint-disable-next-line @typescript-eslint/no-require-imports
const baseConfig = require("../../packages/config/tailwind.config.js") as Config

const config: Config = {
  ...baseConfig,
  content: [
    "./src/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
}

export default config
