import { useMemo, useState, type ReactNode } from 'react';
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Check,
  Clock3,
  Coffee,
  Heart,
  Hourglass,
  LoaderCircle,
  PiggyBank,
  Search,
  ShoppingBag,
  Sparkles,
  Wallet,
  X,
} from 'lucide-react';
import './_group.css';

type CatalogItem = {
  id: string;
  name: string;
  category: string;
  price: number;
  currency: string;
  alternativePrice: number | null;
  discountLabel: string | null;
  promoCode: string | null;
  cashbackPercent: number | null;
  expectedUses: number;
};

type DecisionType = 'buy' | 'wait_24h' | 'wait_7_days' | 'skip';
type Decision = {
  id: string;
  itemName: string;
  price: number;
  decision: DecisionType;
  status: 'waiting' | 'completed';
  createdAt: string;
  waitUntil: string | null;
  waitingPeriod: '24h' | '7d' | null;
  savedAmount: number;
  preparedContribution: number;
};

const demoCatalog: CatalogItem[] = [
  {
    id: 'airpods-pro-demo',
    name: 'AirPods Pro (2nd Gen)',
    category: 'Headphones',
    price: 60,
    currency: 'KWD',
    alternativePrice: 42,
    discountLabel: 'Sample offer · 10% off',
    promoCode: 'PAUSE10',
    cashbackPercent: 2,
    expectedUses: 50,
  },
  {
    id: 'wireless-headphones-demo',
    name: 'Wireless noise-cancelling headphones',
    category: 'Headphones',
    price: 38.5,
    currency: 'KWD',
    alternativePrice: 25.75,
    discountLabel: 'Sample offer · 5% off',
    promoCode: null,
    cashbackPercent: 1,
    expectedUses: 80,
  },
  {
    id: 'coffee-demo',
    name: 'Iced latte',
    category: 'Coffee',
    price: 2.5,
    currency: 'KWD',
    alternativePrice: 0.65,
    discountLabel: null,
    promoCode: null,
    cashbackPercent: null,
    expectedUses: 1,
  },
  {
    id: 'sneakers-demo',
    name: 'Everyday sneakers',
    category: 'Fashion',
    price: 32,
    currency: 'KWD',
    alternativePrice: 21,
    discountLabel: 'Sample offer · 15% off',
    promoCode: 'DEMO15',
    cashbackPercent: null,
    expectedUses: 120,
  },
  {
    id: 'makeup-demo',
    name: 'Everyday skincare set',
    category: 'Beauty',
    price: 18,
    currency: 'KWD',
    alternativePrice: 12.5,
    discountLabel: null,
    promoCode: null,
    cashbackPercent: 3,
    expectedUses: 60,
  },
];

function money(amount: number, currency = 'KWD') {
  return `${amount.toFixed(2)} ${currency}`;
}

function humanDecision(decision: DecisionType) {
  return {
    buy: 'Bought (decision saved)',
    wait_24h: 'Waited 24 hours',
    wait_7_days: 'Waited 7 days',
    skip: 'Skipped',
  }[decision];
}

export function Current() {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(demoCatalog[0].id);
  const [notice, setNotice] = useState<Decision | null>(null);
  const [history, setHistory] = useState<Decision[]>([]);
  const items = useMemo(
    () => demoCatalog.filter((item) => item.name.toLowerCase().includes(search.trim().toLowerCase())),
    [search],
  );
  const selected = items.find((item) => item.id === selectedId) ?? items[0] ?? null;
  const waiting = history.filter((entry) => entry.status === 'waiting');
  const discount = selected?.alternativePrice != null && selected.price > 0
    ? Math.round((1 - selected.alternativePrice / selected.price) * 100)
    : null;
  const costPerUse = selected ? selected.price / Math.max(1, selected.expectedUses) : 0;

  const decide = (decision: DecisionType) => {
    if (!selected) return;
    const now = new Date();
    const waitUntil = decision === 'wait_24h'
      ? new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()
      : decision === 'wait_7_days'
        ? new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
        : null;
    const result: Decision = {
      id: `${selected.id}-${now.getTime()}`,
      itemName: selected.name,
      price: selected.price,
      decision,
      status: waitUntil ? 'waiting' : 'completed',
      createdAt: now.toISOString(),
      waitUntil,
      waitingPeriod: decision === 'wait_24h' ? '24h' : decision === 'wait_7_days' ? '7d' : null,
      savedAmount: decision === 'skip' ? selected.price : 0,
      preparedContribution: decision === 'skip' ? selected.price * 0.1 : 0,
    };
    setHistory((entries) => [...entries, result]);
    setNotice(result);
  };

  return (
    <div className="savewise-current">
      <main className="min-h-[100dvh] bg-[#faf9f5] text-[#1b1c1a]">
        <header className="topbar">
          <div className="topbar-inner">
            <div className="brand-mark"><span className="brand-symbol"><ArrowDownRight size={17} /></span><span>SaveWise</span></div>
            <a href="#future-fund" className="fund-nav"><PiggyBank size={15} /> Future Fund <ArrowRight size={13} /></a>
            <span className="demo-pill"><span className="demo-dot" /> DEMO DATA</span>
          </div>
        </header>

        <div className="page-wrap">
          <section className="intro-row">
            <div>
              <div className="eyebrow"><span className="eyebrow-line" /> BEFORE I CLICK <span className="eyebrow-divider">/</span> DECISION STUDIO</div>
              <h1>Make the next click <span>count.</span></h1>
              <p>Take a breath. See the numbers. Choose what feels right for you.</p>
            </div>
            <div className="privacy-note"><BadgeCheck size={16} /><span>Your choices stay yours.<br /><small>No purchase is ever made here.</small></span></div>
          </section>

          <section className="search-box" aria-label="Search demo catalog">
            <div className="search-icon"><Search size={19} /></div>
            <label className="sr-only" htmlFor="catalog-search">Search demo items</label>
            <input
              id="catalog-search"
              type="search"
              placeholder="What are you thinking of buying?"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            {search && <button className="clear-search" type="button" aria-label="Clear search" onClick={() => setSearch('')}><X size={16} /></button>}
            <span className="search-hint">DEMO CATALOG</span>
          </section>

          {items.length === 0 ? (
            <section className="empty-panel"><div className="empty-icon"><Search size={20} /></div><h2>No demo items found</h2><p>Try another search, or clear it to browse the sample catalog.</p><button className="text-button" onClick={() => setSearch('')}>Show all demo items <ArrowRight size={15} /></button></section>
          ) : selected ? (
            <>
              <div className="section-kicker"><span>01</span> THE ITEM <span className="kicker-rule" /><span className="catalog-count">{items.length} DEMO {items.length === 1 ? 'MATCH' : 'MATCHES'}</span></div>
              <section className="product-panel">
                <aside className="product-aside">
                  <div className="product-art">
                    <div className="art-grid" />
                    <div className="art-tag"><span className="tiny-dot" /> DEMO ITEM</div>
                    <div className="art-object"><ShoppingBag size={64} strokeWidth={1.2} /></div>
                    <div className="art-category">{selected.category}</div>
                  </div>
                  <div className="unit-metric">
                    <div className="metric-icon"><Coffee size={16} /></div>
                    <div><span>COST PER USE</span><strong>{money(costPerUse, selected.currency)}<small> / use</small></strong></div>
                    <span className="uses-pill">{selected.expectedUses} USES EST.</span>
                  </div>
                </aside>
                <div className="product-info">
                  <div className="product-heading">
                    <div>
                      <span className="category-label">{selected.category}</span>
                      <h2>{selected.name}</h2>
                      <p className="subtle">A considered look at the numbers before you decide.</p>
                    </div>
                    <div className="price-block">
                      <strong>{money(selected.price, selected.currency)}</strong>
                      <small>DEMO LISTED PRICE</small>
                      {selected.alternativePrice != null && <span className="alt-price">Alternative {money(selected.alternativePrice, selected.currency)}</span>}
                    </div>
                  </div>
                  <div className="offer-row">
                    {selected.alternativePrice != null && <span className="offer-chip savings"><ArrowDownRight size={14} /> Better listed price: {money(selected.alternativePrice, selected.currency)}{discount != null && ` · ${discount}% less`}</span>}
                    {selected.discountLabel && <span className="offer-chip discount"><Sparkles size={13} /> {selected.discountLabel}</span>}
                    {selected.promoCode && <span className="offer-chip promo">CODE <b>{selected.promoCode}</b></span>}
                    {selected.cashbackPercent != null && <span className="offer-chip cashback"><Wallet size={13} /> {selected.cashbackPercent}% cashback</span>}
                    {!selected.alternativePrice && !selected.discountLabel && !selected.promoCode && selected.cashbackPercent == null && <span className="offer-chip neutral">No listed offer</span>}
                  </div>
                  <div className="insight-box">
                    <div className="insight-heading"><span className="insight-icon"><Sparkles size={14} /></span><strong>THE PAUSE</strong><span>YOUR CALL, NO PRESSURE</span></div>
                    <p>{selected.alternativePrice != null ? `A lower listed option could leave ${money(selected.price - selected.alternativePrice, selected.currency)} in your pocket. You can compare, wait, or decide it’s not for you.` : 'There’s no rush to decide. Check the cost per use, give it a day, or choose to move on.'}</p>
                    <div className="insight-foot"><span><Check size={14} /> Demo figures only · No checkout links</span><span>{selected.expectedUses} estimated uses</span></div>
                  </div>
                  <div className="selected-nav">
                    <span>Browse demo items</span>
                    <div className="item-switcher" role="group" aria-label="Choose demo item">
                      {items.map((item) => (
                        <button key={item.id} onClick={() => { setSelectedId(item.id); setNotice(null); }} className={`item-chip ${selected.id === item.id ? 'active' : ''}`} aria-pressed={selected.id === item.id}>
                          {item.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              <div className="section-kicker choice-kicker"><span>02</span> YOUR NEXT MOVE <span className="kicker-rule" /><span className="choose-copy">There’s no wrong answer.</span></div>
              <section className="choices-grid" aria-label="Decision options">
                <ChoiceCard number="01" label="DIRECT" title="Buy now" text="Record that you’re ready. SaveWise won’t take you to checkout or make a purchase." icon={<ShoppingBag size={18} />} button="I’VE DECIDED" tone="direct" onClick={() => decide('buy')} />
                <ChoiceCard number="02" label="A DAY TO THINK" title="Wait 24 hours" text="Give the impulse a little room to settle. Revisit this tomorrow." icon={<Hourglass size={18} />} button="WAIT 24 HOURS" tone="wait" onClick={() => decide('wait_24h')} />
                <ChoiceCard number="03" label="A WEEK TO THINK" title="Wait 7 days" text="Let a week pass. If it still feels right, you can decide then." icon={<Clock3 size={18} />} button="WAIT 7 DAYS" tone="wait-long" onClick={() => decide('wait_7_days')} />
                <ChoiceCard number="04" label="KEEP YOUR MONEY" title="Skip it" text="Choose not to buy. See what you’re keeping, with no pressure to do anything else." icon={<Heart size={18} />} button="I’M SKIPPING THIS" tone="skip" onClick={() => decide('skip')} />
              </section>
              {notice && <SuccessNotice decision={notice} onDismiss={() => setNotice(null)} />}
            </>
          ) : null}

          <section className="history-area">
            <div className="history-header">
              <div><div className="section-kicker"><span>03</span> YOUR DECISION LOG</div><h2>Small choices, remembered.</h2></div>
              <span className="history-total">{history.length} {history.length === 1 ? 'DECISION' : 'DECISIONS'}</span>
            </div>
            {history.length === 0 ? <div className="history-empty"><div className="history-empty-icon"><Clock3 size={18} /></div><div><strong>Your log starts here.</strong><p>Every choice you save will appear here. No judgment, just a clearer picture.</p></div></div>
              : <div className="history-list">{[...history].reverse().map((entry) => <HistoryRow key={entry.id} entry={entry} />)}</div>}
          </section>

          <section className="waiting-area">
            <div className="waiting-title"><div className="waiting-symbol"><Clock3 size={18} /></div><div><span className="eyebrow">THE COOLING-OFF LIST</span><h2>Ready to revisit?</h2></div><span className="waiting-count">{waiting.length} WAITING</span></div>
            {waiting.length === 0 ? <div className="waiting-empty"><span className="waiting-empty-mark"><Check size={15} /></span><p>Nothing waiting right now. Your headspace is clear.</p></div>
              : <div className="waiting-list">{waiting.map((entry) => <div className="waiting-card" key={entry.id}>
                <div className="waiting-card-main"><div className="wait-card-icon"><Hourglass size={17} /></div><div><strong>{entry.itemName}</strong><span>{money(entry.price)} · {entry.waitingPeriod === '24h' ? '24-hour pause' : '7-day pause'}</span></div></div>
                <span className="due-date"><Clock3 size={13} /> Revisit {entry.waitUntil ? new Date(entry.waitUntil).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'soon'}</span>
              </div>)}</div>}
          </section>
        </div>
        <footer><div className="footer-brand"><span className="brand-symbol small"><ArrowDownRight size={12} /></span> SaveWise</div><p>DEMO DATA ONLY · Not live pricing · No purchase is made · Decisions are yours</p><span>BEFORE I CLICK</span></footer>
      </main>
    </div>
  );
}

function ChoiceCard({ number, label, title, text, icon, button, tone, onClick }: {
  number: string; label: string; title: string; text: string; icon: ReactNode;
  button: string; tone: string; onClick: () => void;
}) {
  return <article className={`choice-card ${tone}`}>
    <div className="choice-top"><span>OPTION {number}</span><span className="choice-label">{label}</span></div>
    <div className="choice-icon">{icon}</div>
    <h3>{title}</h3><p>{text}</p>
    <button className="choice-button" onClick={onClick} data-testid={`button-decision-${tone}`}>
      {button}<ArrowRight size={14} />
    </button>
  </article>;
}

function SuccessNotice({ decision, onDismiss }: { decision: Decision; onDismiss: () => void }) {
  const skipped = decision.decision === 'skip';
  return <section className={`success-notice ${skipped ? 'success-skip' : ''}`} aria-live="polite">
    <div className="success-check"><Check size={19} /></div>
    <div className="success-copy"><strong>{skipped ? 'A thoughtful choice.' : decision.status === 'waiting' ? 'Your pause is saved.' : 'Choice saved.'}</strong>
      <p>{skipped ? `You kept ${money(decision.savedAmount)}.` : decision.status === 'waiting' ? 'We’ll keep this here so you can revisit it when the wait is over.' : 'Your decision is recorded. No purchase has been made.'}</p>
      {skipped && <div className="prepared-note">
        <span>10% FUTURE FUND SIMULATION · PREPARED ONLY</span>
        <strong>{money(decision.preparedContribution)}</strong>
        <small>Possible value if you approve this virtual contribution. Nothing is invested or transferred.</small>
        <div className="prepared-projection-grid">
          {[1, 3, 5, 10].map((years) => (
            <span key={years}><small>{years}Y</small><b>{money(decision.preparedContribution * Math.pow(1.05, years))}</b></span>
          ))}
        </div>
        <em>Illustrative estimate at 5% annually, not guaranteed.</em>
        <a href="#future-fund" className="prepared-link">Review and approve in Future Fund <ArrowUpRight size={13} /></a>
      </div>}
    </div>
    <button className="dismiss-notice" onClick={onDismiss} aria-label="Dismiss confirmation"><X size={17} /></button>
  </section>;
}

function HistoryRow({ entry }: { entry: Decision }) {
  const isSkipped = entry.decision === 'skip';
  const isWaiting = entry.status === 'waiting';
  return <article className="history-row">
    <div className={`history-icon ${isSkipped ? 'skip-history' : isWaiting ? 'wait-history' : ''}`}>
      {isSkipped ? <Heart size={17} /> : isWaiting ? <Hourglass size={17} /> : <ShoppingBag size={17} />}
    </div>
    <div className="history-item"><strong>{entry.itemName}</strong><span>{new Date(entry.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · {money(entry.price)}</span></div>
    <span className={`decision-status ${isSkipped ? 'status-skip' : isWaiting ? 'status-wait' : 'status-buy'}`}>{humanDecision(entry.decision)}</span>
    {isSkipped && <span className="history-saved">+{money(entry.savedAmount)} kept</span>}
    {isWaiting && <span className="history-date">{entry.waitUntil ? `Until ${new Date(entry.waitUntil).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : 'Waiting'}</span>}
  </article>;
}
