// Prints a fresh VAPID key pair for Web Push reminders. No dependencies.
// Usage: node scripts/generate-vapid-keys.mjs
import { generateKeyPairSync } from "node:crypto";

const { publicKey, privateKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
const publicJwk = publicKey.export({ format: "jwk" });
const privateJwk = privateKey.export({ format: "jwk" });

// Web Push expects the public key as a base64url uncompressed P-256 point and
// the private key as its base64url 32-byte scalar.
const uncompressedPoint = Buffer.concat([
  Buffer.from([4]),
  Buffer.from(publicJwk.x, "base64url"),
  Buffer.from(publicJwk.y, "base64url")
]);

console.log("Add these to the Vercel project env vars (and web/.env.local for local testing):");
console.log("");
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${uncompressedPoint.toString("base64url")}`);
console.log(`VAPID_PRIVATE_KEY=${privateJwk.d}`);
console.log("VAPID_SUBJECT=mailto:you@example.com");
