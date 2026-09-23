import "server-only";

import { createHmac, scryptSync, timingSafeEqual } from "node:crypto";

export const SUPERADMIN_COOKIE = "cl_superadmin_session";
const SESSION_DURATION_SECONDS = 12 * 60 * 60;

function getSessionSecret(): string | null {
  const secret = process.env.SUPERADMIN_SESSION_SECRET;
  return secret && secret.length >= 32 ? secret : null;
}

export function verifySuperadminCredentials(username: string, password: string): boolean {
  const configuredUsername = process.env.SUPERADMIN_USERNAME;
  const storedPasswordHash = process.env.SUPERADMIN_PASSWORD_HASH;
  if (!configuredUsername || !storedPasswordHash || !password || password.length > 256) {
    return false;
  }

  const [saltHex, hashHex] = storedPasswordHash.split(":");
  if (!saltHex || !hashHex || !/^[a-f0-9]{32,128}$/i.test(saltHex) || !/^[a-f0-9]{128}$/i.test(hashHex)) {
    return false;
  }

  const usernameMatches = username === configuredUsername;
  const expectedHash = Buffer.from(hashHex, "hex");
  const actualHash = scryptSync(password, Buffer.from(saltHex, "hex"), expectedHash.length);
  const passwordMatches = timingSafeEqual(actualHash, expectedHash);
  return usernameMatches && passwordMatches;
}

export function createSuperadminSessionToken(): string | null {
  const secret = getSessionSecret();
  if (!secret) return null;

  const payload = Buffer.from(
    JSON.stringify({ sub: "super", exp: Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS })
  ).toString("base64url");
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function hasSuperadminSession(request: Request): boolean {
  const secret = getSessionSecret();
  if (!secret) return false;

  const cookie = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SUPERADMIN_COOKIE}=`));
  const token = cookie?.slice(SUPERADMIN_COOKIE.length + 1);
  if (!token) return false;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;

  const expected = createHmac("sha256", secret).update(payload).digest();
  let received: Buffer;
  try {
    received = Buffer.from(signature, "base64url");
  } catch {
    return false;
  }
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
    return false;
  }

  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      sub?: string;
      exp?: number;
    };
    return session.sub === "super" && Number(session.exp) > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}
