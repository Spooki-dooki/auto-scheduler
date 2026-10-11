import crypto from "node:crypto";

/**
 * AES-256-GCM encryption for OAuth tokens at rest.
 *
 * Ciphertext format: `v1:<iv>:<authTag>:<payload>` (each part base64url).
 * Anything without the `v1:` prefix is returned untouched, so a database that
 * already holds plaintext tokens keeps working and gets upgraded on next write.
 */

const PREFIX = "v1";

let cachedKey: Buffer | null = null;

function key(): Buffer {
  if (cachedKey) return cachedKey;

  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY is not set. Generate one with `openssl rand -base64 32`.",
    );
  }

  const buf = Buffer.from(raw, "base64");
  if (buf.length !== 32) {
    throw new Error(
      `TOKEN_ENCRYPTION_KEY must decode to 32 bytes, got ${buf.length}.`,
    );
  }

  cachedKey = buf;
  return buf;
}

export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const payload = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    PREFIX,
    iv.toString("base64url"),
    tag.toString("base64url"),
    payload.toString("base64url"),
  ].join(":");
}

export function decrypt(value: string): string {
  if (!isEncrypted(value)) return value;

  const [, ivPart, tagPart, payloadPart] = value.split(":");
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key(),
    Buffer.from(ivPart, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagPart, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(payloadPart, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function isEncrypted(value: string): boolean {
  return value.startsWith(`${PREFIX}:`) && value.split(":").length === 4;
}

export function encryptNullable(value: string | null | undefined): string | null {
  if (value == null || value === "") return null;
  return encrypt(value);
}

export function decryptNullable(value: string | null | undefined): string | null {
  if (value == null || value === "") return null;
  return decrypt(value);
}
