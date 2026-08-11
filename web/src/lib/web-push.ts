import { createCipheriv, createECDH, createPrivateKey, hkdfSync, randomBytes, sign } from "node:crypto";

// Minimal, dependency-free Web Push sender.
//
// Chosen variant: full encrypted payloads (RFC 8291 aes128gcm) rather than the
// empty-push fallback — Node's crypto module covers every primitive directly
// (ECDH P-256, HKDF-SHA256, AES-128-GCM, ES256 with IEEE-P1363 signatures),
// and the round-trip is verified by a decrypting unit test. Payloads carry the
// notification title/body, so the service worker can show reminder-specific
// copy while still falling back to a generic reminder if a payload is absent.
//
// References: RFC 8291 (Message Encryption for Web Push), RFC 8188 (aes128gcm
// content coding), RFC 8292 (VAPID).

export type WebPushSubscription = {
  endpoint: string;
  // base64url-encoded subscription keys, exactly as the browser reported them.
  p256dh: string;
  auth: string;
};

export type VapidConfig = {
  // base64url uncompressed P-256 point (65 bytes).
  publicKey: string;
  // base64url raw private scalar (32 bytes).
  privateKey: string;
  // mailto: or https: contact for the push service.
  subject: string;
};

export type WebPushResult = {
  ok: boolean;
  status: number;
  // 404/410 mean the subscription no longer exists and should be deleted.
  expired: boolean;
};

const recordSize = 4096;

export function vapidAuthorizationHeader(audience: string, config: VapidConfig, nowSeconds: number = Math.floor(Date.now() / 1000)): string {
  const header = base64Url(Buffer.from(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  // 12h expiry is comfortably under the 24h VAPID maximum.
  const claims = base64Url(Buffer.from(JSON.stringify({ aud: audience, exp: nowSeconds + 12 * 60 * 60, sub: config.subject })));
  const signingInput = `${header}.${claims}`;
  const signature = sign("sha256", Buffer.from(signingInput), {
    key: vapidPrivateKey(config),
    dsaEncoding: "ieee-p1363"
  });
  return `vapid t=${signingInput}.${base64Url(signature)}, k=${config.publicKey}`;
}

function vapidPrivateKey(config: VapidConfig) {
  const publicPoint = Buffer.from(config.publicKey, "base64url");
  if (publicPoint.length !== 65 || publicPoint[0] !== 4) {
    throw new Error("VAPID public key must be a base64url uncompressed P-256 point");
  }
  const privateScalar = Buffer.from(config.privateKey, "base64url");
  if (privateScalar.length !== 32) {
    throw new Error("VAPID private key must be a base64url 32-byte scalar");
  }
  return createPrivateKey({
    format: "jwk",
    key: {
      kty: "EC",
      crv: "P-256",
      x: base64Url(publicPoint.subarray(1, 33)),
      y: base64Url(publicPoint.subarray(33, 65)),
      d: base64Url(privateScalar)
    }
  });
}

// RFC 8291 encryption: returns the aes128gcm request body
// (salt | rs | idlen | sender public key | ciphertext+tag).
export function encryptPushPayload(userPublicKey: Buffer, userAuthSecret: Buffer, plaintext: Buffer): Buffer {
  if (userPublicKey.length !== 65 || userPublicKey[0] !== 4) {
    throw new Error("Subscription p256dh key must be an uncompressed P-256 point");
  }
  if (userAuthSecret.length !== 16) {
    throw new Error("Subscription auth secret must be 16 bytes");
  }

  const sender = createECDH("prime256v1");
  sender.generateKeys();
  const senderPublicKey = sender.getPublicKey();
  const sharedSecret = sender.computeSecret(userPublicKey);

  const keyInfo = Buffer.concat([Buffer.from("WebPush: info\0"), userPublicKey, senderPublicKey]);
  const ikm = Buffer.from(hkdfSync("sha256", sharedSecret, userAuthSecret, keyInfo, 32));

  const salt = randomBytes(16);
  const contentEncryptionKey = Buffer.from(hkdfSync("sha256", ikm, salt, Buffer.from("Content-Encoding: aes128gcm\0"), 16));
  const nonce = Buffer.from(hkdfSync("sha256", ikm, salt, Buffer.from("Content-Encoding: nonce\0"), 12));

  // Single record: plaintext + the 0x02 last-record padding delimiter.
  const cipher = createCipheriv("aes-128-gcm", contentEncryptionKey, nonce);
  const ciphertext = Buffer.concat([cipher.update(Buffer.concat([plaintext, Buffer.from([2])])), cipher.final(), cipher.getAuthTag()]);

  const header = Buffer.alloc(21);
  salt.copy(header, 0);
  header.writeUInt32BE(recordSize, 16);
  header.writeUInt8(senderPublicKey.length, 20);
  return Buffer.concat([header, senderPublicKey, ciphertext]);
}

export async function sendWebPush(
  subscription: WebPushSubscription,
  payload: string,
  config: VapidConfig,
  ttlSeconds = 4 * 60 * 60
): Promise<WebPushResult> {
  const audience = new URL(subscription.endpoint).origin;
  const body = encryptPushPayload(
    Buffer.from(subscription.p256dh, "base64url"),
    Buffer.from(subscription.auth, "base64url"),
    Buffer.from(payload, "utf8")
  );

  const response = await fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      Authorization: vapidAuthorizationHeader(audience, config),
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      TTL: String(ttlSeconds),
      Urgency: "normal"
    },
    body: new Uint8Array(body)
  });
  // Push services return small text bodies; consume so the socket is released.
  await response.arrayBuffer().catch(() => undefined);

  return { ok: response.ok, status: response.status, expired: response.status === 404 || response.status === 410 };
}

function base64Url(buffer: Buffer): string {
  return buffer.toString("base64url");
}
