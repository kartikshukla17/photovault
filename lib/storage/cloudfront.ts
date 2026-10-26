import { createPrivateKey, createSign } from "crypto";
import { readFileSync } from "fs";
import { isAbsolute, resolve as resolvePath } from "path";

const DEFAULT_EXPIRES_IN_SECONDS = 60 * 15;

function toCloudFrontSafeBase64(base64: string): string {
  // CloudFront uses a URL-safe base64 variant:
  //   + -> -
  //   = -> _
  //   / -> ~
  return base64.replace(/\+/g, "-").replace(/=/g, "_").replace(/\//g, "~");
}

function normalizeMultilineEnv(value: string): string {
  let trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    trimmed = trimmed.slice(1, -1).trim();
  }
  return trimmed.replace(/\\n/g, "\n").trim();
}

function getPrivateKeyFromEnv(): string {
  const fromPath = process.env.CLOUDFRONT_PRIVATE_KEY_PATH;
  if (fromPath) {
    const normalized = normalizeMultilineEnv(fromPath);
    const expanded =
      normalized.startsWith("~/") && process.env.HOME
        ? resolvePath(process.env.HOME, normalized.slice(2))
        : normalized;
    const keyPath = isAbsolute(expanded) ? expanded : resolvePath(process.cwd(), expanded);
    return readFileSync(keyPath, "utf8").trim();
  }

  const fromBase64 = process.env.CLOUDFRONT_PRIVATE_KEY_BASE64;
  if (fromBase64) {
    const decoded = Buffer.from(normalizeMultilineEnv(fromBase64), "base64").toString("utf8").trim();
    if (!decoded.includes("BEGIN ")) {
      throw new Error(
        "CLOUDFRONT_PRIVATE_KEY_BASE64 must be base64 of the PRIVATE KEY PEM text (including BEGIN/END lines), not a DER-encoded key."
      );
    }
    return decoded;
  }

  const raw = process.env.CLOUDFRONT_PRIVATE_KEY;
  if (!raw) throw new Error("Missing env var CLOUDFRONT_PRIVATE_KEY");
  return normalizeMultilineEnv(raw);
}

type SignedUrlOptions = {
  expiresInSeconds?: number;
};

export function getCloudFrontSignedUrlForKey(key: string, options: SignedUrlOptions = {}): string {
  const baseUrl = process.env.NEXT_PUBLIC_STORAGE_CDN_URL;
  if (!baseUrl) {
    throw new Error("Missing env var NEXT_PUBLIC_STORAGE_CDN_URL (CloudFront base URL)");
  }

  const keyPairId = process.env.CLOUDFRONT_KEY_PAIR_ID;
  if (!keyPairId) {
    throw new Error("Missing env var CLOUDFRONT_KEY_PAIR_ID");
  }

  const expiresInSeconds = options.expiresInSeconds ?? DEFAULT_EXPIRES_IN_SECONDS;
  const expiresAtEpochSeconds = Math.floor(Date.now() / 1000) + expiresInSeconds;

  const trimmedBase = baseUrl.replace(/\/$/, "");
  const trimmedKey = key.replace(/^\/+/, "");
  const resourceUrl = `${trimmedBase}/${trimmedKey}`;

  // Canned policy: DateLessThan only.
  const policy = JSON.stringify({
    Statement: [
      {
        Resource: resourceUrl,
        Condition: { DateLessThan: { "AWS:EpochTime": expiresAtEpochSeconds } },
      },
    ],
  });

  const signer = createSign("RSA-SHA1");
  signer.update(policy);
  signer.end();
  const privateKeyPem = getPrivateKeyFromEnv();
  if (/BEGIN (RSA )?PUBLIC KEY/.test(privateKeyPem)) {
    throw new Error(
      "CLOUDFRONT_PRIVATE_KEY is a PUBLIC key. Set it to the matching RSA PRIVATE KEY PEM."
    );
  }

  let signature: Buffer;
  try {
    const privateKey = createPrivateKey({ key: privateKeyPem, format: "pem" });
    signature = signer.sign(privateKey);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to read CLOUDFRONT private key (must be an RSA private key PEM). ${message}`
    );
  }

  const signatureParam = toCloudFrontSafeBase64(signature.toString("base64"));
  const separator = resourceUrl.includes("?") ? "&" : "?";
  return (
    `${resourceUrl}${separator}` +
    `Expires=${expiresAtEpochSeconds}` +
    `&Signature=${encodeURIComponent(signatureParam)}` +
    `&Key-Pair-Id=${encodeURIComponent(keyPairId)}`
  );
}
