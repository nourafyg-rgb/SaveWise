const RESEND_ENDPOINT = "https://api.resend.com/emails";

export class PasswordResetEmailError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PasswordResetEmailError";
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character]!;
  });
}

export function isPasswordResetEmailConfigured(): boolean {
  return Boolean(
    process.env.RESEND_API_KEY &&
      process.env.RESEND_FROM_EMAIL &&
      process.env.SAVEWISE_PUBLIC_URL,
  );
}

export async function sendPasswordResetEmail(
  email: string,
  token: string,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const publicUrl = process.env.SAVEWISE_PUBLIC_URL;
  if (!apiKey || !from || !publicUrl) {
    throw new PasswordResetEmailError("Password-reset email is not configured.");
  }

  let resetUrl: URL;
  try {
    const base = new URL(publicUrl);
    if (base.protocol !== "https:" && base.hostname !== "localhost") {
      throw new Error("The public URL must use HTTPS.");
    }
    base.pathname = `${base.pathname.replace(/\/+$/, "")}/reset-password`;
    base.search = "";
    base.hash = "";
    base.searchParams.set("token", token);
    resetUrl = base;
  } catch {
    throw new PasswordResetEmailError("The SaveWise public URL is invalid.");
  }

  const link = resetUrl.toString();
  const response = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "User-Agent": "SaveWise API",
      "Idempotency-Key": `savewise-password-reset-${token}`,
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "Reset your SaveWise password",
      text: `Use this link to reset your SaveWise password. It expires in one hour: ${link}`,
      html: `<p>Use the link below to reset your SaveWise password. It expires in one hour.</p><p><a href="${escapeHtml(link)}">Reset password</a></p>`,
    }),
  });

  if (!response.ok) {
    throw new PasswordResetEmailError(
      `Resend rejected the password-reset email (HTTP ${response.status}).`,
    );
  }
}
