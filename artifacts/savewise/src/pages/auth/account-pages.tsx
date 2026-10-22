import { useEffect, useState, type FormEvent } from "react";
import type { ReactNode } from "react";
import { ArrowDownRight, ArrowLeft, LoaderCircle, LockKeyhole } from "lucide-react";
import { Link, useLocation } from "wouter";
import { requestAuth, useAuth, type AuthSession } from "@/lib/auth-context";
import { getSaveWiseSessionId } from "@/lib/session";
import "./auth-pages.css";

function AccountPageFrame({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow: string;
  children: ReactNode;
}) {
  return (
    <main className="sw-auth-page sw-account-page">
      <header className="sw-account-header">
        <Link className="sw-brand" href="/" aria-label="SaveWise home">
          <span className="sw-brand-mark"><ArrowDownRight size={18} strokeWidth={2.5} /></span>
          <span>SaveWise</span>
        </Link>
        <Link href="/" className="sw-account-back"><ArrowLeft size={15} /> Back to welcome</Link>
      </header>
      <section className="sw-account-card" aria-labelledby="account-title">
        <span className="sw-account-icon"><LockKeyhole size={20} /></span>
        <div className="sw-account-eyebrow">{eyebrow}</div>
        <h1 id="account-title">{title}</h1>
        {children}
      </section>
      <p className="sw-account-footnote">Your account keeps your SaveWise activity with you. No payments or bank access.</p>
    </main>
  );
}

function FormFeedback({ error, message }: { error: string; message: string }) {
  if (!error && !message) return null;
  return (
    <p className={`sw-account-feedback ${error ? "is-error" : "is-success"}`} role="status">
      {error || message}
    </p>
  );
}

export function SignUpPage() {
  const { session, acceptSession } = useAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session?.authenticated) setLocation("/decision-studio", { replace: true });
  }, [session, setLocation]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Those passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const result = await requestAuth<AuthSession>("register", {
        email,
        password,
        sessionId: getSaveWiseSessionId(),
      });
      await acceptSession(result);
      setLocation("/decision-studio");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Account creation failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AccountPageFrame title="Make it yours." eyebrow="CREATE YOUR ACCOUNT">
      <p className="sw-account-intro">Your guest activity on this browser will move into your account.</p>
      <form className="sw-account-form" onSubmit={submit}>
        <label htmlFor="signup-email">Email</label>
        <input
          id="signup-email"
          type="email"
          autoComplete="email"
          maxLength={254}
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <label htmlFor="signup-password">Password</label>
        <input
          id="signup-password"
          type="password"
          autoComplete="new-password"
          minLength={12}
          maxLength={128}
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <span className="sw-account-hint">Use at least 12 characters.</span>
        <label htmlFor="signup-confirm-password">Confirm password</label>
        <input
          id="signup-confirm-password"
          type="password"
          autoComplete="new-password"
          minLength={12}
          maxLength={128}
          required
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
        />
        <FormFeedback error={error} message="" />
        <button className="sw-account-submit" type="submit" disabled={busy}>
          {busy ? <><LoaderCircle className="sw-spin" size={17} /> Creating account…</> : "Create account"}
        </button>
      </form>
      <p className="sw-account-switch">Already have an account? <Link href="/sign-in">Log in</Link></p>
    </AccountPageFrame>
  );
}

export function SignInPage() {
  const { session, acceptSession } = useAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session?.authenticated) setLocation("/decision-studio", { replace: true });
  }, [session, setLocation]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = await requestAuth<AuthSession>("login", { email, password });
      await acceptSession(result);
      setLocation("/decision-studio");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sign in failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AccountPageFrame title="Welcome back." eyebrow="LOG IN">
      <p className="sw-account-intro">Pick up where you left off.</p>
      <form className="sw-account-form" onSubmit={submit}>
        <label htmlFor="signin-email">Email</label>
        <input
          id="signin-email"
          type="email"
          autoComplete="email"
          maxLength={254}
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <label htmlFor="signin-password">Password</label>
        <input
          id="signin-password"
          type="password"
          autoComplete="current-password"
          minLength={12}
          maxLength={128}
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <div className="sw-account-inline-link"><Link href="/forgot-password">Forgot password?</Link></div>
        <FormFeedback error={error} message="" />
        <button className="sw-account-submit" type="submit" disabled={busy}>
          {busy ? <><LoaderCircle className="sw-spin" size={17} /> Logging in…</> : "Log in"}
        </button>
      </form>
      <p className="sw-account-switch">New to SaveWise? <Link href="/sign-up">Create an account</Link></p>
    </AccountPageFrame>
  );
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);
    try {
      const result = await requestAuth<{ message: string }>("password-reset/request", { email });
      setMessage(result.message);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not request a reset link.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AccountPageFrame title="Reset your password." eyebrow="ACCOUNT RECOVERY">
      <p className="sw-account-intro">Enter your account email and we’ll send a reset link if it matches an account.</p>
      <form className="sw-account-form" onSubmit={submit}>
        <label htmlFor="reset-email">Email</label>
        <input
          id="reset-email"
          type="email"
          autoComplete="email"
          maxLength={254}
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <FormFeedback error={error} message={message} />
        <button className="sw-account-submit" type="submit" disabled={busy}>
          {busy ? <><LoaderCircle className="sw-spin" size={17} /> Sending…</> : "Send reset link"}
        </button>
      </form>
      <p className="sw-account-switch"><Link href="/sign-in">Back to log in</Link></p>
    </AccountPageFrame>
  );
}

export function ResetPasswordPage() {
  const [, setLocation] = useLocation();
  const { acceptSession } = useAuth();
  const token = new URLSearchParams(window.location.search).get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Those passwords do not match.");
      return;
    }
    if (!token) {
      setError("This reset link is missing its token. Request a new link.");
      return;
    }
    setBusy(true);
    try {
      await requestAuth<{ message: string }>("password-reset/confirm", { token, password });
      await acceptSession({ authenticated: false, userId: null, email: null });
      setLocation("/sign-in");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not reset your password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AccountPageFrame title="Choose a new password." eyebrow="PASSWORD RESET">
      <p className="sw-account-intro">Use at least 12 characters. The link can only be used once.</p>
      <form className="sw-account-form" onSubmit={submit}>
        <label htmlFor="new-password">New password</label>
        <input
          id="new-password"
          type="password"
          autoComplete="new-password"
          minLength={12}
          maxLength={128}
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <label htmlFor="new-password-confirm">Confirm new password</label>
        <input
          id="new-password-confirm"
          type="password"
          autoComplete="new-password"
          minLength={12}
          maxLength={128}
          required
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
        />
        <FormFeedback error={error} message="" />
        <button className="sw-account-submit" type="submit" disabled={busy}>
          {busy ? <><LoaderCircle className="sw-spin" size={17} /> Updating…</> : "Save new password"}
        </button>
      </form>
      <p className="sw-account-switch"><Link href="/sign-in">Back to log in</Link></p>
    </AccountPageFrame>
  );
}
