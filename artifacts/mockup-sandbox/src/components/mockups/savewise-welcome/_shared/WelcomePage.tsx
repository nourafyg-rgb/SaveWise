import { ArrowDownRight, ArrowRight, Check, Clock3, ShieldCheck, Sparkles } from 'lucide-react';
import '../_group.css';

type WelcomePageProps = {
  onSignUp: () => void;
  onSignIn: () => void;
  onContinueAsGuest: () => void;
};

function FutureFundIllustration() {
  return (
    <div className="sw-hero-art" data-testid="illustration-future-fund">
      <svg className="sw-orbit" viewBox="0 0 520 470" role="img" aria-labelledby="fund-art-title fund-art-desc">
        <title id="fund-art-title">A little pause, a bigger future</title>
        <desc id="fund-art-desc">A sculptural blue savings jar with floating coins, a small star, and a growing fund balance.</desc>
        <defs>
          <linearGradient id="jarBody" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#4A9AB4" />
            <stop offset=".55" stopColor="#17617E" />
            <stop offset="1" stopColor="#123B5B" />
          </linearGradient>
          <linearGradient id="jarTop" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#E7BE68" />
            <stop offset="1" stopColor="#B87B24" />
          </linearGradient>
          <linearGradient id="coinFace" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#F7D98D" />
            <stop offset="1" stopColor="#D79A38" />
          </linearGradient>
          <filter id="softShadow" x="-30%" y="-30%" width="160%" height="180%">
            <feDropShadow dx="0" dy="18" stdDeviation="15" floodColor="#173B52" floodOpacity=".17" />
          </filter>
        </defs>
        <ellipse cx="265" cy="409" rx="159" ry="23" fill="#C9D3CC" opacity=".48" />
        <circle cx="265" cy="229" r="179" fill="#F0E9D8" />
        <circle cx="265" cy="229" r="150" fill="none" stroke="#D8C99F" strokeWidth="1.5" strokeDasharray="3 10" />
        <path d="M83 222c-9-74 24-138 79-174" fill="none" stroke="#D9C99E" strokeWidth="2" strokeLinecap="round" />
        <g className="sw-art-coin sw-art-coin-one" filter="url(#softShadow)">
          <ellipse cx="138" cy="151" rx="29" ry="12" fill="#B87922" />
          <path d="M109 136v15c0 7 13 13 29 13s29-6 29-13v-15" fill="url(#coinFace)" />
          <ellipse cx="138" cy="136" rx="29" ry="12" fill="#F6D98F" />
          <ellipse cx="138" cy="136" rx="19" ry="7" fill="none" stroke="#C48A32" strokeWidth="2" />
        </g>
        <g className="sw-art-coin sw-art-coin-two" filter="url(#softShadow)">
          <ellipse cx="375" cy="153" rx="24" ry="10" fill="#B87922" />
          <path d="M351 138v13c0 6 11 11 24 11s24-5 24-11v-13" fill="url(#coinFace)" />
          <ellipse cx="375" cy="138" rx="24" ry="10" fill="#F6D98F" />
        </g>
        <g filter="url(#softShadow)">
          <path d="M184 195c0-11 9-20 20-20h122c11 0 20 9 20 20v23c0 11-9 20-20 20H204c-11 0-20-9-20-20z" fill="#123B5B" />
          <path d="M194 198c0-6 5-11 11-11h120c6 0 11 5 11 11v11H194z" fill="url(#jarTop)" />
          <path d="M199 226h132l17 127c3 24-15 45-39 45h-88c-24 0-42-21-39-45z" fill="url(#jarBody)" />
          <path d="M218 244h18l-12 112c-1 12 7 23 18 27-19 1-35-15-33-34z" fill="#91C3CC" opacity=".38" />
          <path d="M251 280h31" stroke="#E9C675" strokeWidth="9" strokeLinecap="round" />
          <path d="M265 264v33" stroke="#E9C675" strokeWidth="9" strokeLinecap="round" />
          <path d="M226 377h79" stroke="#72B1BB" strokeWidth="2" opacity=".65" />
          <path d="M213 223h104" stroke="#FFFFFF" strokeWidth="2" opacity=".38" />
        </g>
        <g className="sw-art-coin sw-art-coin-three" filter="url(#softShadow)">
          <ellipse cx="359" cy="305" rx="27" ry="11" fill="#B87922" />
          <path d="M332 290v14c0 6 12 12 27 12s27-6 27-12v-14" fill="url(#coinFace)" />
          <ellipse cx="359" cy="290" rx="27" ry="11" fill="#F6D98F" />
          <ellipse cx="359" cy="290" rx="17" ry="6" fill="none" stroke="#C48A32" strokeWidth="2" />
        </g>
        <path d="m402 218 6 13 14 2-10 9 3 14-13-7-12 7 2-14-10-9 14-2z" fill="#D99B3C" />
        <circle cx="127" cy="294" r="5" fill="#D99B3C" />
        <circle cx="410" cy="112" r="4" fill="#5F9BAD" />
        <path d="M119 371h23m-12-12v24" stroke="#78A8A8" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <div className="sw-fund-float" aria-hidden="true">
        <span className="sw-fund-float-icon"><Sparkles size={15} /></span>
        <span><small>YOUR FUTURE FUND</small><strong>Small choices add up.</strong></span>
        <Check size={16} className="sw-fund-check" />
      </div>
      <span className="sw-art-caption">A pause can make room for a plan.</span>
    </div>
  );
}

export default function WelcomePage({ onSignUp, onSignIn, onContinueAsGuest }: WelcomePageProps) {
  return (
    <main className="sw-auth-page sw-welcome-page">
      <div className="sw-auth-grain" aria-hidden="true" />
      <header className="sw-welcome-header">
        <a className="sw-brand" href="/" aria-label="SaveWise home" data-testid="link-savewise-home">
          <span className="sw-brand-mark"><ArrowDownRight size={18} strokeWidth={2.5} /></span>
          <span>SaveWise</span>
        </a>
        <div className="sw-header-actions">
          <span className="sw-header-note">A little pause. Your call.</span>
          <button className="sw-signin-link" onClick={onSignIn} data-testid="button-welcome-sign-in">Sign in <ArrowRight size={15} /></button>
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
            <button className="sw-button-primary" onClick={onSignUp} data-testid="button-welcome-sign-up">
              Make your free account <ArrowRight size={17} />
            </button>
            <button className="sw-button-quiet" onClick={onContinueAsGuest} data-testid="button-continue-as-guest">
              Try it as a guest <span>→</span>
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
          <button className="sw-button-primary" onClick={onSignUp} data-testid="button-bottom-sign-up">Get started <ArrowRight size={17} /></button>
          <button className="sw-bottom-signin" onClick={onSignIn} data-testid="button-bottom-sign-in">Already have an account? Sign in</button>
        </div>
      </section>

      <footer className="sw-welcome-footer">
        <a className="sw-brand sw-brand-footer" href="/" data-testid="link-footer-home"><span className="sw-brand-mark"><ArrowDownRight size={16} /></span><span>SaveWise</span></a>
        <span>Demo choices. Real-life confidence.</span>
      </footer>
    </main>
  );
}
