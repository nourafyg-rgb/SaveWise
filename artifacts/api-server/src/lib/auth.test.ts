import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import {
  createOpaqueToken,
  hashPassword,
  hashToken,
  verifyPassword,
} from "./passwords.js";
import {
  isPasswordResetEmailConfigured,
  sendPasswordResetEmail,
} from "./password-reset-email.js";

const savedEnvironment = {
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
  SAVEWISE_PUBLIC_URL: process.env.SAVEWISE_PUBLIC_URL,
};
const originalFetch = globalThis.fetch;

afterEach(() => {
  for (const [name, value] of Object.entries(savedEnvironment)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
  globalThis.fetch = originalFetch;
});

test("passwords are salted and verified without storing the raw password", async () => {
  const password = "a-long-test-password";
  const firstHash = await hashPassword(password);
  const secondHash = await hashPassword(password);

  assert.notEqual(firstHash, secondHash);
  assert.equal(await verifyPassword(password, firstHash), true);
  assert.equal(await verifyPassword("a-different-password", firstHash), false);
  assert.equal(firstHash.includes(password), false);
});

test("opaque reset tokens are unique and stored through deterministic hashes", () => {
  const first = createOpaqueToken();
  const second = createOpaqueToken();
  assert.notEqual(first, second);
  assert.equal(hashToken(first), hashToken(first));
  assert.notEqual(hashToken(first), hashToken(second));
  assert.equal(hashToken(first).length, 64);
});

test("reset email uses the configured SaveWise route and Resend API", async () => {
  process.env.RESEND_API_KEY = "test-key";
  process.env.RESEND_FROM_EMAIL = "SaveWise <no-reply@example.test>";
  process.env.SAVEWISE_PUBLIC_URL = "https://savewise.example.test/SaveWise";
  assert.equal(isPasswordResetEmailConfigured(), true);

  let capturedUrl = "";
  let capturedInit: RequestInit | undefined;
  globalThis.fetch = (async (input, init) => {
    capturedUrl = String(input);
    capturedInit = init;
    return new Response(null, { status: 202 });
  }) as typeof fetch;

  await sendPasswordResetEmail("person@example.test", "token-value");

  assert.equal(capturedUrl, "https://api.resend.com/emails");
  assert.equal(capturedInit?.method, "POST");
  const headers = new Headers(capturedInit?.headers);
  assert.equal(headers.get("Authorization"), "Bearer test-key");
  assert.equal(headers.get("User-Agent"), "SaveWise API");
  const payload = JSON.parse(String(capturedInit?.body)) as {
    to: string[];
    text: string;
  };
  assert.deepEqual(payload.to, ["person@example.test"]);
  assert.match(payload.text, /https:\/\/savewise\.example\.test\/SaveWise\/reset-password\?token=token-value/);
});

test("reset email fails explicitly when Vercel mail settings are missing or rejected", async () => {
  delete process.env.RESEND_API_KEY;
  delete process.env.RESEND_FROM_EMAIL;
  delete process.env.SAVEWISE_PUBLIC_URL;
  assert.equal(isPasswordResetEmailConfigured(), false);
  await assert.rejects(
    sendPasswordResetEmail("person@example.test", "token-value"),
    /not configured/,
  );

  process.env.RESEND_API_KEY = "test-key";
  process.env.RESEND_FROM_EMAIL = "SaveWise <no-reply@example.test>";
  process.env.SAVEWISE_PUBLIC_URL = "https://savewise.example.test/SaveWise";
  globalThis.fetch = (async () => new Response(null, { status: 401 })) as typeof fetch;
  await assert.rejects(
    sendPasswordResetEmail("person@example.test", "token-value"),
    /HTTP 401/,
  );
});
