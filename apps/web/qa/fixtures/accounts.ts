import { readFileSync, existsSync } from "fs"
import { resolve } from "path"

export interface SeededAccount {
  email: string
  userId: string
  orgId?: string
  role?: "CLIENT_ADMIN" | "CLIENT_USER"
}

export interface SeedFile {
  password: string
  adminA: SeededAccount
  userA: SeededAccount
  adminB: SeededAccount
  platform: SeededAccount
  noOrg: SeededAccount
}

const path = resolve(__dirname, "accounts.generated.json")

export function loadAccounts(): SeedFile {
  if (!existsSync(path)) {
    throw new Error(
      `qa/fixtures/accounts.generated.json not found — run "pnpm qa:seed" first (see qa/README.md).`
    )
  }
  return JSON.parse(readFileSync(path, "utf-8")) as SeedFile
}
