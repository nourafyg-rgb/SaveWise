import type { ReactNode } from 'react';
import { ArrowDownRight, ArrowLeft, ShieldCheck } from 'lucide-react';
import { Link } from 'wouter';
import SaveWiseModel from './savewise-model';
import './auth-pages.css';

type AuthPageFrameProps = {
  children: ReactNode;
  title: string;
  description: string;
  alternateHref: string;
  alternateLabel: string;
};

export default function AuthPageFrame({
  children,
  title,
  description,
  alternateHref,
  alternateLabel,
}: AuthPageFrameProps) {
  return (
    <main className="sw-auth-page sw-auth-frame">
      <div className="sw-auth-grain" aria-hidden="true" />
      <header className="sw-welcome-header sw-auth-header">
        <Link className="sw-brand" href="/" data-testid="link-auth-home" aria-label="SaveWise home">
          <span className="sw-brand-mark"><ArrowDownRight size={18} strokeWidth={2.5} /></span>
          <span>SaveWise</span>
        </Link>
        <Link href="/" className="sw-back-link" data-testid="link-auth-back-home"><ArrowLeft size={15} /> Back home</Link>
      </header>
      <section className="sw-auth-layout" aria-labelledby="auth-page-title">
        <div className="sw-auth-aside">
          <span className="sw-section-index">A CLEARER KIND OF MONEY HABIT</span>
          <h1>Make space<br />for <em>what matters.</em></h1>
          <p>Pause, decide, and keep moving toward your own goals. No pressure to be perfect.</p>
          <div className="sw-auth-aside-note"><ShieldCheck size={17} /><span>Your choices stay yours.<br /><small>SaveWise never makes purchases.</small></span></div>
          <SaveWiseModel className="sw-auth-model-stage" />
        </div>
        <div className="sw-auth-content">
          <div className="sw-auth-heading">
            <span className="sw-section-index">YOUR SAVEWISE SPACE</span>
            <h2 id="auth-page-title" data-testid="text-auth-title">{title}</h2>
            <p data-testid="text-auth-description">{description}</p>
          </div>
          <div className="sw-auth-provider" data-testid="section-auth-form">
            {children}
          </div>
          <div className="sw-auth-alt">
            <span>{alternateHref === '/sign-up' ? 'New to SaveWise?' : 'Already have a SaveWise account?'}</span>
            <Link href={alternateHref} data-testid="link-auth-alternate">{alternateLabel}</Link>
          </div>
          <p className="sw-guest-transfer-note" data-testid="notice-guest-activity">
            Guest activity from this browser stays separate from your SaveWise account; it is not automatically transferred.
          </p>
          <Link href="/decision-studio" className="sw-guest-link" data-testid="link-auth-continue-as-guest">
            <span>Prefer to keep exploring as a guest?</span><strong>Continue as guest <ArrowDownRight size={15} /></strong>
          </Link>
        </div>
      </section>
      <footer className="sw-welcome-footer sw-auth-footer">
        <span>SaveWise</span><span>Your pace. Your choice.</span>
      </footer>
    </main>
  );
}
