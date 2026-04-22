import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // GCM standard
const KEY_LENGTH = 32; // AES-256
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer {
  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY is not set. Generate one with: openssl rand -base64 32",
    );
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== KEY_LENGTH) {
    throw new Error(
      `TOKEN_ENCRYPTION_KEY must decode to exactly ${KEY_LENGTH} bytes; got ${key.length}. ` +
        `Generate with: openssl rand -base64 32`,
    );
  }
  return key;
}

/**
 * Encrypts plaintext with AES-256-GCM.
 * Returns base64-encoded ciphertext (including auth tag appended) and IV.
 */
export function encrypt(plaintext: string): { encrypted: string; iv: string } {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  // Store ciphertext||authTag together so decrypt only needs encrypted + iv.
  const payload = Buffer.concat([ciphertext, authTag]);
  return {
    encrypted: payload.toString("base64"),
    iv: iv.toString("base64"),
  };
}

/**
 * Decrypts a string produced by `encrypt`.
 * Throws if the ciphertext has been tampered with (GCM auth tag mismatch).
 */
export function decrypt(encrypted: string, iv: string): string {
  const key = getKey();
  const ivBuf = Buffer.from(iv, "base64");
  if (ivBuf.length !== IV_LENGTH) {
    throw new Error(`Invalid IV length: expected ${IV_LENGTH}, got ${ivBuf.length}`);
  }
  const payload = Buffer.from(encrypted, "base64");
  if (payload.length < AUTH_TAG_LENGTH) {
    throw new Error("Encrypted payload is too short to contain an auth tag");
  }
  const ciphertext = payload.subarray(0, payload.length - AUTH_TAG_LENGTH);
  const authTag = payload.subarray(payload.length - AUTH_TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, key, ivBuf);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}
