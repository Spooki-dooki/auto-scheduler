import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Adapter, AdapterAccount } from "next-auth/adapters";
import type { PrismaClient } from "@prisma/client";

import { encryptNullable } from "@/lib/crypto";

/**
 * The stock Prisma adapter stores Google's access/refresh tokens in plaintext.
 * This wrapper encrypts them on the way in. Reads go through
 * `getGoogleAccount()` in src/lib/google.ts, which decrypts.
 */
export function encryptedPrismaAdapter(prisma: PrismaClient): Adapter {
  const base = PrismaAdapter(prisma);

  return {
    ...base,
    async linkAccount(account: AdapterAccount) {
      const encrypted = {
        ...account,
        access_token: encryptNullable(account.access_token),
        refresh_token: encryptNullable(account.refresh_token),
        id_token: encryptNullable(account.id_token),
      } as AdapterAccount;

      return base.linkAccount!(encrypted);
    },
  };
}
