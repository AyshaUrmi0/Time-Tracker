// Round-trips a string through encrypt/decrypt to verify TOKEN_ENCRYPTION_KEY
// is configured correctly. Run with: pnpm test:encryption

import "dotenv/config";
import { encrypt, decrypt } from "../src/lib/encryption";

const samples = [
  "hello world",
  "",
  "a".repeat(4096),
  "ünicode 🔐 symbols — čes̄i",
  "clickup_pk_test_abcdef0123456789_with_long_token_value",
];

let failures = 0;

for (const sample of samples) {
  try {
    const { encrypted, iv } = encrypt(sample);
    const roundTripped = decrypt(encrypted, iv);
    if (roundTripped !== sample) {
      console.error(
        `FAIL — round-trip mismatch for sample of length ${sample.length}`,
      );
      failures++;
    } else {
      console.log(
        `ok  — length=${sample.length.toString().padStart(5)}  iv=${iv.slice(0, 12)}…`,
      );
    }
  } catch (err) {
    console.error(
      `FAIL — sample of length ${sample.length}:`,
      (err as Error).message,
    );
    failures++;
  }
}

// Tamper detection check
try {
  const { encrypted, iv } = encrypt("tamper me");
  const tampered =
    Buffer.from(encrypted, "base64").toString("base64").slice(0, -2) + "AA";
  decrypt(tampered, iv);
  console.error("FAIL — tampered ciphertext was decrypted without error");
  failures++;
} catch {
  console.log("ok  — tampered ciphertext rejected");
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nAll encryption checks passed ✓");
