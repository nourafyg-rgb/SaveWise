import { ArrowDownRight, ArrowRight, Check, Clock3, ShieldCheck, Sparkles } from 'lucide-react';
import { Link } from 'wouter';
import SaveWiseModel from './savewise-model';
import './auth-pages.css';

type WelcomePageProps = {
  onContinueAsGuest: () => void;
};

function FutureFundIllustration() {
  return (
    <div className="sw-hero-art" data-testid="illustration-future-fund">
      <SaveWiseModel />
      <div className="sw-fund-float" aria-hidden="true">
        <span className="sw-fund-float-icon"><Sparkles size={15} /></span>
        <span><small>YOUR FUTURE FUND</small><strong>Small choices add up.</strong></span>
        <Check size={16} className="sw-fund-check" />
      </div>
      <span className="sw-art-caption">A pause can make room for a plan.</span>
    </div>
  );
}

export default function WelcomePage({ onContinueAsGuest }: WelcomePageProps) {
  return (
    <main className="sw-auth-page sw-welcome-page">
      <div className="sw-auth-grain" aria-hidden="true" />
      <header className="sw-welcome-header">
        <Link className="sw-brand" href="/" aria-label="SaveWise home" data-testid="link-savewise-home">
          <span className="sw-brand-mark"><ArrowDownRight size={18} strokeWidth={2.5} /></span>
          <span>SaveWise</span>
        </Link>
        <div className="sw-header-actions">
          <span className="sw-header-note">A little pause. Your call.</span>
          <Link className="sw-auth-link" href="/sign-in" data-testid="link-welcome-login">Log in</Link>
          <Link className="sw-auth-link sw-auth-link-primary" href="/sign-up" data-testid="link-welcome-signup">Sign up</Link>
        </div>
      </header>

      <section className="sw-hero" aria-labelledby="welcome-title">
        <div className="sw-hero-copy">
          <div className="sw-eyebrow"><span className="sw-eyebrow-dot" /> MONEY, ON YOUR TERMS</div>
          <h1 id="welcome-title" data-testid="text-welcome-title">Want it?<br /><em>Give it</em> a minute.</h1>
          <p className="sw-hero-description" data-testid="text-welcome-description">
            Take a breath before you buy. Compare options, make a choice, and save toward something that matters to you.
          </p>
          <div className="sw-hero-actions">
            <button className="sw-button-primary" onClick={onContinueAsGuest} data-testid="button-continue-as-guest">
              Continue as Guest <ArrowRight size={17} />
            </button>
          </div>
          <div className="sw-privacy-line"><ShieldCheck size={16} /> Virtual-only tracking. No checkout or money transfers.</div>
        </div>
        <FutureFundIllustration />
      </section>

      <section className="sw-how-section" aria-labelledby="how-title">
        <div className="sw-section-heading">
          <span className="sw-section-index">01 / A BETTER WAY TO DECIDE</span>
          <h2 id="how-title" data-testid="text-how-title">Your money. <span>Your pace.</span></h2>
        </div>
        <div className="sw-steps">
          <article className="sw-step">
            <span className="sw-step-number">01</span>
            <span className="sw-step-icon"><Clock3 size={19} /></span>
            <h3>Take a beat</h3>
            <p>Put a little space between “want” and “buy.”</p>
          </article>
          <article className="sw-step sw-step-featured">
            <span className="sw-step-number">02</span>
            <span className="sw-step-icon"><ArrowDownRight size={19} /></span>
            <h3>Choose what fits</h3>
            <p>Compare demo options, then buy, wait, or skip.</p>
          </article>
          <article className="sw-step">
            <span className="sw-step-number">03</span>
            <span className="sw-step-icon"><Sparkles size={19} /></span>
            <h3>Keep a little for later</h3>
            <p>Track a virtual Future Fund alongside your goals.</p>
          </article>
        </div>
      </section>

      <section className="sw-bottom-cta">
        <div>
          <span className="sw-section-index">02 / START WHERE YOU ARE</span>
          <h2 data-testid="text-bottom-cta">A good money habit<br />can start <em>right now.</em></h2>
        </div>
        <div className="sw-bottom-actions">
          <button className="sw-button-primary" onClick={onContinueAsGuest} data-testid="button-bottom-continue-as-guest">Continue as Guest <ArrowRight size={17} /></button>
        </div>
      </section>

      <footer className="sw-welcome-footer">
        <Link className="sw-brand sw-brand-footer" href="/" data-testid="link-footer-home"><span className="sw-brand-mark"><ArrowDownRight size={16} /></span><span>SaveWise</span></Link>
        <span>Demo choices. Real-life confidence.</span>
      </footer>
    </main>
  );
}
