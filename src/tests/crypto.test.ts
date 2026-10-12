import { randomBytes } from "node:crypto";

import { beforeAll, describe, expect, it } from "vitest";

import {
  decrypt,
  decryptNullable,
  encrypt,
  encryptNullable,
  isEncrypted,
} from "@/lib/crypto";

beforeAll(() => {
  // A throwaway key generated per run; never a real secret.
  process.env.TOKEN_ENCRYPTION_KEY = randomBytes(32).toString("base64");
});

describe("token encryption", () => {
  it("round-trips a token and never stores it in plaintext", () => {
    const token = "ya29.a0AfH6SMBexampleAccessToken";
    const stored = encrypt(token);

    expect(stored).not.toContain(token);
    expect(isEncrypted(stored)).toBe(true);
    expect(decrypt(stored)).toBe(token);
  });

  it("uses a fresh IV, so the same token encrypts differently each time", () => {
    expect(encrypt("same")).not.toBe(encrypt("same"));
  });

  it("rejects ciphertext that has been tampered with", () => {
    const [prefix, iv, tag, payload] = encrypt("refresh-token").split(":");
    const flipped = `${payload[0] === "A" ? "B" : "A"}${payload.slice(1)}`;

    expect(() => decrypt([prefix, iv, tag, flipped].join(":"))).toThrow();
  });

  it("passes legacy plaintext through unchanged", () => {
    expect(decrypt("legacy-plain-token")).toBe("legacy-plain-token");
  });

  it("maps empty values to null in both directions", () => {
    expect(encryptNullable("")).toBeNull();
    expect(encryptNullable(null)).toBeNull();
    expect(decryptNullable(undefined)).toBeNull();
  });
});
