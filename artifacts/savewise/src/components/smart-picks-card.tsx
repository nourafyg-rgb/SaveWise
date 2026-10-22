import { useState } from 'react';
import { ArrowRight, ChevronDown, CircleAlert, Lightbulb, RefreshCw, Sparkles } from 'lucide-react';
import type { SmartRecommendation, SmartRecommendationAction } from '@/lib/smart-recommendations';
import './smart-picks-card.css';

type SmartPicksCardProps = {
  recommendation: SmartRecommendation;
  state: 'loading' | 'error' | 'ready';
  onAction: (target: SmartRecommendationAction) => void;
  onRetry: () => void;
};

export default function SmartPicksCard({
  recommendation,
  state,
  onAction,
  onRetry,
}: SmartPicksCardProps) {
  const [whyOpen, setWhyOpen] = useState(false);

  if (state === 'loading') {
    return (
      <section className="smart-pick smart-pick--loading" aria-labelledby="smart-pick-loading-title" aria-live="polite" data-testid="card-smart-pick-loading">
        <div className="smart-pick__ornament" aria-hidden="true"><span /><span /><span /></div>
        <div className="smart-pick__loading-copy">
          <span className="smart-pick__eyebrow"><span className="smart-pick__pixel" aria-hidden="true" /> A THOUGHTFUL NUDGE</span>
          <h2 id="smart-pick-loading-title">Finding a helpful next step…</h2>
          <p>Just a moment while your Studio gets ready.</p>
        </div>
        <div className="smart-pick__skeleton" aria-hidden="true"><i /><i /><i /></div>
      </section>
    );
  }

  if (state === 'error') {
    return (
      <section className="smart-pick smart-pick--error" aria-labelledby="smart-pick-error-title" data-testid="card-smart-pick-error">
        <div className="smart-pick__icon smart-pick__icon--error" aria-hidden="true"><CircleAlert size={19} /></div>
        <div className="smart-pick__body">
          <span className="smart-pick__eyebrow">A SMALL PAUSE CAN HELP</span>
          <h2 id="smart-pick-error-title">A tip for your next click</h2>
          <p className="smart-pick__message" data-testid="text-smart-pick-error-tip">
            For a non-essential purchase, try waiting a day or comparing the cost per use before you decide.
          </p>
          <p className="smart-pick__error-note">Your recommendation couldn’t load just now. You can try again in a moment.</p>
          <button className="smart-pick__retry" type="button" onClick={onRetry} data-testid="button-retry-smart-pick">
            <RefreshCw size={14} /> Try again
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="smart-pick" aria-labelledby="smart-pick-title" data-testid="card-smart-pick">
      <div className="smart-pick__side" aria-hidden="true">
        <div className="smart-pick__icon"><Lightbulb size={19} strokeWidth={1.8} /></div>
        <span className="smart-pick__side-label">A GOOD<br />NEXT STEP</span>
        <div className="smart-pick__pixel-stack"><i /><i /><i /><i /><i /></div>
      </div>
      <div className="smart-pick__body">
        <div className="smart-pick__topline">
          <span className="smart-pick__eyebrow"><span className="smart-pick__pixel" aria-hidden="true" /> YOUR SMART PICKS</span>
          <span className="smart-pick__issue" aria-hidden="true">NO. 01</span>
        </div>
        <h2 id="smart-pick-title" data-testid="text-smart-pick-title">{recommendation.title}</h2>
        <p className="smart-pick__message" data-testid="text-smart-pick-message">{recommendation.message}</p>
        {recommendation.action && (
          <button
            className="smart-pick__action"
            type="button"
            onClick={() => onAction(recommendation.action!.target)}
            data-testid="button-smart-pick-action"
          >
            {recommendation.action.label}<ArrowRight size={15} />
          </button>
        )}
        <div className={`smart-pick__why ${whyOpen ? 'is-open' : ''}`}>
          <button
            className="smart-pick__why-toggle"
            type="button"
            aria-expanded={whyOpen}
            aria-controls="smart-pick-why-content"
            onClick={() => setWhyOpen((open) => !open)}
            data-testid="button-smart-pick-why"
          >
            <span>Why am I seeing this?</span>
            <ChevronDown size={15} />
          </button>
          <div id="smart-pick-why-content" className="smart-pick__why-content" hidden={!whyOpen}>
            <p data-testid="text-smart-pick-why">{recommendation.why}</p>
          </div>
        </div>
      </div>
      <div className="smart-pick__stamp" aria-hidden="true"><Sparkles size={14} /><span>YOUR<br />CALL</span></div>
    </section>
  );
}
