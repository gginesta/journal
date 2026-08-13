import { createDecipheriv, createECDH, generateKeyPairSync, hkdfSync, verify } from "node:crypto";
import { describe, expect, it } from "vitest";
import { encryptPushPayload, vapidAuthorizationHeader } from "../src/lib/web-push";

// The dispatcher's crypto has no library to lean on, so these tests play the
// browser's role: decrypt the aes128gcm body with the user-agent keys per
// RFC 8291, and verify the VAPID JWT signature with the public key.

function makeUserAgentKeys() {
  const userAgent = createECDH("prime256v1");
  userAgent.generateKeys();
  return {
    publicKey: userAgent.getPublicKey(),
    authSecret: Buffer.from("0123456789abcdef"),
    ecdh: userAgent
  };
}

function decryptLikeABrowser(body: Buffer, userAgent: ReturnType<typeof makeUserAgentKeys>): Buffer {
  const salt = body.subarray(0, 16);
  const recordSize = body.readUInt32BE(16);
  expect(recordSize).toBeGreaterThanOrEqual(18);
  const keyIdLength = body.readUInt8(20);
  expect(keyIdLength).toBe(65);
  const senderPublicKey = body.subarray(21, 21 + keyIdLength);
  const ciphertext = body.subarray(21 + keyIdLength);

  const sharedSecret = userAgent.ecdh.computeSecret(senderPublicKey);
  const keyInfo = Buffer.concat([Buffer.from("WebPush: info\0"), userAgent.publicKey, senderPublicKey]);
  const ikm = Buffer.from(hkdfSync("sha256", sharedSecret, userAgent.authSecret, keyInfo, 32));
  const contentEncryptionKey = Buffer.from(hkdfSync("sha256", ikm, salt, Buffer.from("Content-Encoding: aes128gcm\0"), 16));
  const nonce = Buffer.from(hkdfSync("sha256", ikm, salt, Buffer.from("Content-Encoding: nonce\0"), 12));

  const decipher = createDecipheriv("aes-128-gcm", contentEncryptionKey, nonce);
  decipher.setAuthTag(ciphertext.subarray(ciphertext.length - 16));
  const padded = Buffer.concat([decipher.update(ciphertext.subarray(0, ciphertext.length - 16)), decipher.final()]);

  // Strip the aes128gcm last-record padding delimiter (0x02) and padding.
  const delimiterIndex = padded.lastIndexOf(2);
  expect(delimiterIndex).toBeGreaterThanOrEqual(0);
  expect(padded.subarray(delimiterIndex + 1).every((byte) => byte === 0)).toBe(true);
  return padded.subarray(0, delimiterIndex);
}

function makeVapidConfig() {
  const { publicKey, privateKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const publicJwk = publicKey.export({ format: "jwk" }) as { x: string; y: string };
  const privateJwk = privateKey.export({ format: "jwk" }) as { d: string };
  const uncompressedPoint = Buffer.concat([
    Buffer.from([4]),
    Buffer.from(publicJwk.x, "base64url"),
    Buffer.from(publicJwk.y, "base64url")
  ]);
  return {
    config: {
      publicKey: uncompressedPoint.toString("base64url"),
      privateKey: privateJwk.d,
      subject: "mailto:beta@example.com"
    },
    verificationKey: publicKey
  };
}

describe("encryptPushPayload", () => {
  it("round-trips a payload through RFC 8291 aes128gcm", () => {
    const userAgent = makeUserAgentKeys();
    const payload = Buffer.from(JSON.stringify({ title: "Time to keep today", body: "One photo or one line is enough." }));
    const body = encryptPushPayload(userAgent.publicKey, userAgent.authSecret, payload);
    expect(decryptLikeABrowser(body, userAgent).toString("utf8")).toBe(payload.toString("utf8"));
  });

  it("uses a fresh ephemeral key and salt per message", () => {
    const userAgent = makeUserAgentKeys();
    const payload = Buffer.from("hello");
    const first = encryptPushPayload(userAgent.publicKey, userAgent.authSecret, payload);
    const second = encryptPushPayload(userAgent.publicKey, userAgent.authSecret, payload);
    expect(first.subarray(0, 16).equals(second.subarray(0, 16))).toBe(false);
    expect(first.subarray(21, 86).equals(second.subarray(21, 86))).toBe(false);
    expect(decryptLikeABrowser(second, userAgent).toString("utf8")).toBe("hello");
  });

  it("rejects malformed subscription keys", () => {
    expect(() => encryptPushPayload(Buffer.alloc(10), Buffer.alloc(16), Buffer.from("x"))).toThrow(/p256dh/);
    expect(() => encryptPushPayload(makeUserAgentKeys().publicKey, Buffer.alloc(5), Buffer.from("x"))).toThrow(/auth secret/);
  });
});

describe("vapidAuthorizationHeader", () => {
  it("emits a verifiable ES256 JWT with the right claims", () => {
    const { config, verificationKey } = makeVapidConfig();
    const nowSeconds = 1_770_000_000;
    const header = vapidAuthorizationHeader("https://push.example.com", config, nowSeconds);

    const match = /^vapid t=([^,]+), k=(.+)$/.exec(header);
    expect(match).not.toBeNull();
    const [, jwt, key] = match as RegExpExecArray;
    expect(key).toBe(config.publicKey);

    const [encodedHeader, encodedClaims, encodedSignature] = jwt.split(".");
    expect(JSON.parse(Buffer.from(encodedHeader, "base64url").toString("utf8"))).toEqual({ typ: "JWT", alg: "ES256" });
    const claims = JSON.parse(Buffer.from(encodedClaims, "base64url").toString("utf8"));
    expect(claims.aud).toBe("https://push.example.com");
    expect(claims.sub).toBe("mailto:beta@example.com");
    expect(claims.exp).toBe(nowSeconds + 12 * 60 * 60);

    const verified = verify(
      "sha256",
      Buffer.from(`${encodedHeader}.${encodedClaims}`),
      { key: verificationKey, dsaEncoding: "ieee-p1363" },
      Buffer.from(encodedSignature, "base64url")
    );
    expect(verified).toBe(true);
  });

  it("rejects malformed VAPID keys", () => {
    const { config } = makeVapidConfig();
    expect(() => vapidAuthorizationHeader("https://push.example.com", { ...config, publicKey: "short" })).toThrow(/public key/);
    expect(() => vapidAuthorizationHeader("https://push.example.com", { ...config, privateKey: "short" })).toThrow(/private key/);
  });
});
