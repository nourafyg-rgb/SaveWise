import { type ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  getGetFutureFundSummaryQueryKey,
  getGetRewardsSummaryQueryKey,
  getListSavingsGoalsQueryKey,
  getListDecisionsQueryKey,
  getSearchCatalogItemsQueryKey,
  useCreateDecision,
  useGetFutureFundSummary,
  useGetRewardsSummary,
  useListSavingsGoals,
  useListDecisions,
  useResolveWaitingDecision,
  useSearchCatalogItems,
  useSimulateFutureFundInvestment,
} from '@workspace/api-client-react';
import type { CatalogItem, Decision, DecisionDecision } from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import SiteHeader from '@/components/site-header';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import Rewards from '@/pages/rewards';
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Check,
  Clock3,
  Coffee,
  Coins,
  Heart,
  Hourglass,
  LoaderCircle,
  LockKeyhole,
  PiggyBank,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import { ConfirmationModal } from '@/components/confirmation-modal';
import { getSaveWisePick } from '@/lib/savewise-pick';
import { getSmartRecommendation } from '@/lib/smart-recommendations';
import { createSaveWiseRequestId, getSaveWiseSessionId } from '@/lib/session';
import SmartPicksCard from '@/components/smart-picks-card';
import WelcomePage from '@/pages/auth/welcome-page';
import {
  Route,
  Switch,
  Link,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

const queryClient = new QueryClient();
const appBasePath = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/SaveWise`;

type DecisionModalActionState =
  | { kind: 'decision'; decision: DecisionDecision; item: CatalogItem; requestId: string }
  | { kind: 'waiting'; decision: DecisionDecision; record: Decision };
type DecisionModalState =
  | DecisionModalActionState
  | { kind: 'why'; item: CatalogItem | null; itemName: string; price: number; percent: number; returnTo?: DecisionModalActionState };

const contributionPresets = [5, 10, 15, 20, 25, 50, 100];

function validPercent(value: string) {
  return /^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= 100;
}

function percentFromPrepared(entry: Decision) {
  if (entry.price <= 0) return '10';
  const rounded = Math.round((entry.preparedContribution / entry.price) * 100);
  return String(Math.min(100, Math.max(1, rounded)));
}

function PercentPicker({ value, onChange, idPrefix }: {
  value: string;
  onChange: (value: string) => void;
  idPrefix: string;
}) {
  const valid = validPercent(value);
  return <fieldset className="percent-picker" aria-label="Future Fund contribution percentage">
    <legend>Choose your Future Fund amount</legend>
    <div className="percent-presets">
      {contributionPresets.map((preset) => <button type="button" key={preset}
        className={`percent-preset ${value === String(preset) ? 'active' : ''}`}
        aria-pressed={value === String(preset)} onClick={() => onChange(String(preset))}
        data-testid={`button-rate-${idPrefix}-${preset}`}>{preset}%</button>)}
    </div>
    <label className="custom-percent-label" htmlFor={`custom-percent-${idPrefix}`}>Custom integer</label>
    <div className={`custom-percent ${!valid ? 'invalid' : ''}`}>
      <input id={`custom-percent-${idPrefix}`} type="number" min="1" max="100" step="1"
        inputMode="numeric" value={value} aria-invalid={!valid}
        aria-describedby={`percent-error-${idPrefix}`}
        onChange={(event) => onChange(event.target.value)}
        data-testid={`input-custom-percent-${idPrefix}`} />
      <span>%</span>
    </div>
    {!valid && <p className="percent-error" id={`percent-error-${idPrefix}`} role="alert">Enter a whole number from 1% to 100%.</p>}
  </fieldset>;
}

function money(amount: number, currency = 'KWD') {
  return `${amount.toFixed(2)} ${currency}`;
}

function humanDecision(decision: DecisionDecision) {
  return {
    buy: 'Bought (decision saved)',
    wait_24h: 'Waited 24 hours',
    wait_7_days: 'Waited 7 days',
    skip: 'Skipped',
  }[decision];
}

function Home() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const sessionId = useMemo(getSaveWiseSessionId, []);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<CatalogItem | null>(null);
  const [notice, setNotice] = useState<Decision | null>(null);
  const [clock, setClock] = useState(() => Date.now());
  const [modal, setModal] = useState<DecisionModalState | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [contributionPercent, setContributionPercent] = useState('10');
  const submittingRef = useRef(false);
  const searchParams = useMemo(() => ({ q: search.trim() || undefined }), [search]);
  const listParams = useMemo(() => ({ sessionId }), [sessionId]);
  const catalog = useSearchCatalogItems(searchParams, {
    query: { queryKey: getSearchCatalogItemsQueryKey(searchParams) },
  });
  const catalogFactsParams = useMemo(() => ({}), []);
  const catalogFacts = useSearchCatalogItems(catalogFactsParams, {
    query: { queryKey: getSearchCatalogItemsQueryKey(catalogFactsParams) },
  });
  const decisions = useListDecisions(listParams, {
    query: { queryKey: getListDecisionsQueryKey(listParams) },
  });
  const timeZone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', []);
  const rewardsParams = useMemo(() => ({ sessionId, timeZone }), [sessionId, timeZone]);
  const rewardsSummary = useGetRewardsSummary(rewardsParams, {
    query: { queryKey: getGetRewardsSummaryQueryKey(rewardsParams) },
  });
  const goals = useListSavingsGoals(listParams, {
    query: { queryKey: getListSavingsGoalsQueryKey(listParams) },
  });
  const createDecision = useCreateDecision();
  const resolveDecision = useResolveWaitingDecision();

  useEffect(() => {
    const items = catalog.data ?? [];
    if (!selected || !items.some((item) => item.id === selected.id)) {
      setSelected(items[0] ?? null);
    }
  }, [catalog.data, selected]);

  useEffect(() => {
    const interval = window.setInterval(() => setClock(Date.now()), 30_000);
    return () => window.clearInterval(interval);
  }, []);

  const invalidateDecisions = () =>
    queryClient.invalidateQueries({ queryKey: getListDecisionsQueryKey(listParams) });
  const openDecision = (decision: DecisionDecision) => {
    if (!selected) return;
    if (decision === 'skip') setContributionPercent('10');
    setNotice(null);
    setModalError(null);
    createDecision.reset();
    resolveDecision.reset();
    setModal({ kind: 'decision', decision, item: selected, requestId: createSaveWiseRequestId() });
  };

  const confirmDecision = () => {
    if (!modal || modal.kind === 'why' || submittingRef.current) return;
    setModalError(null);
    submittingRef.current = true;
    const decision = modal.decision;
    const onSuccess = async (result: Decision) => {
      if (result.decision !== 'skip') setNotice(result);
      setModal(null);
      submittingRef.current = false;
      await invalidateDecisions();
      if (result.decision === 'skip') {
        await queryClient.invalidateQueries({ queryKey: getGetRewardsSummaryQueryKey(rewardsParams) });
      }
      if (result.decision === 'skip') setLocation('/future-fund');
    };
    const onError = () => {
      submittingRef.current = false;
      setModalError('That choice didn’t save. Check your connection, then try again.');
    };
    if (modal.kind === 'decision') {
      createDecision.mutate(
        { data: { sessionId, itemId: modal.item.id, decision, requestId: modal.requestId, ...(decision === 'skip' ? { contributionPercent: Number(contributionPercent) } : {}) } },
        { onSuccess, onError },
      );
    } else {
      resolveDecision.mutate(
        { id: modal.record.id, params: { sessionId }, data: { decision, ...(decision === 'skip' ? { contributionPercent: Number(contributionPercent) } : {}) } },
        { onSuccess, onError },
      );
    }
  };

  const resolveWaiting = (record: Decision, decision: DecisionDecision) => {
    if (decision === 'skip') setContributionPercent('10');
    setNotice(null);
    setModalError(null);
    createDecision.reset();
    resolveDecision.reset();
    setModal({ kind: 'waiting', record, decision });
  };

  const items = catalog.data ?? [];
  const history = decisions.data ?? [];
  const smartRecommendation = useMemo(
    () => getSmartRecommendation({
      item: selected,
      goals: goals.data ?? [],
      rewards: rewardsSummary.data,
      decisions: history,
    }),
    [selected, goals.data, rewardsSummary.data, history],
  );
  const smartPicksState = catalog.isLoading || decisions.isLoading || goals.isLoading || rewardsSummary.isLoading
    ? 'loading'
    : catalog.isError || decisions.isError || goals.isError || rewardsSummary.isError
      ? 'error'
      : 'ready';
  const waiting = history.filter((entry) => entry.status === 'waiting');
  const due = waiting.filter((entry) => entry.waitUntil && new Date(entry.waitUntil).getTime() <= clock);
  const discount = selected?.alternativePrice != null && selected.alternativePrice < selected.price && selected.price > 0
    ? Math.round((1 - selected.alternativePrice / selected.price) * 100)
    : null;
  const costPerUse = selected ? selected.price / Math.max(1, selected.expectedUses) : 0;
  const pending = createDecision.isPending || resolveDecision.isPending;
  const percentValid = validPercent(contributionPercent);
  const ratePercent = Number(contributionPercent);
  const pick = selected ? getSaveWisePick(selected, 10) : null;
  const isSkipModal = modal?.kind !== 'why' && modal?.decision === 'skip';
  const modalItem = modal?.kind === 'decision' ? modal.item
    : modal?.kind === 'waiting' ? catalogFacts.data?.find((item) => item.id === modal.record.itemId) ?? null
      : null;
  const modalItemInfo = modal?.kind === 'decision'
    ? { name: modal.item.name, price: modal.item.price, currency: modal.item.currency }
    : modal?.kind === 'waiting'
      ? { name: modal.record.itemName, price: modal.record.price, currency: modalItem?.currency }
      : null;
  const whyPick = modal?.kind === 'why' && modal.item ? getSaveWisePick(modal.item, modal.percent) : null;
  const modalPick = modalItem && percentValid ? getSaveWisePick(modalItem, ratePercent) : null;
  const modalDecision = modal?.kind === 'why' ? null : modal?.decision;
  const modalTitle = modal?.kind === 'why'
    ? 'Why this SaveWise Pick?'
    : modalDecision === 'buy' ? 'Buy Decision'
      : modalDecision === 'wait_24h' ? 'Take a pause.'
        : modalDecision === 'wait_7_days' ? 'Give it more time.'
          : 'Skip it. Grow it.';
  const modalDescription = modal?.kind === 'why'
    ? 'A short explanation using available catalog facts, or saved amounts only when catalog details are unavailable.'
    : modalDecision === 'buy' ? `You’ve decided to buy ${modalItemInfo?.name ?? 'this item'}.`
      : modalDecision === 'wait_24h' ? 'You don’t have to decide right now.'
        : modalDecision === 'wait_7_days' ? 'Wait 7 days before deciding if you really want it.'
          : `You’ll keep ${money(modalItemInfo?.price ?? 0, modalItemInfo?.currency)}.`;
  const modalConfirmLabel = modalDecision === 'buy' ? 'Confirm Buy'
    : modalDecision === 'wait_24h' ? 'Start 24H Wait'
      : modalDecision === 'wait_7_days' ? 'Start 7-Day Wait'
        : 'Continue to Future Fund';
  return (
    <main className="min-h-[100dvh] bg-[#faf9f5] text-[#1b1c1a]">
      <SiteHeader activePage="decisions" statusLabel="DEMO DATA" />

      <div className="page-wrap">
        <section className="intro-row">
          <div>
            <div className="eyebrow"><span className="eyebrow-line" /> BEFORE I CLICK <span className="eyebrow-divider">/</span> DECISION STUDIO</div>
            <h1>Make the next click <span>count.</span></h1>
          </div>
          <div className="privacy-note"><BadgeCheck size={16} /><span>Your choices stay yours.<br /><small>No purchase is ever made here.</small></span></div>
        </section>

        <section className="search-box" aria-label="Search demo catalog">
          <div className="search-icon"><Search size={19} /></div>
          <label className="sr-only" htmlFor="catalog-search">Search demo items</label>
          <input
            id="catalog-search"
            data-testid="input-search-catalog"
            type="search"
            placeholder="What are you thinking of buying?"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          {search && <button className="clear-search" type="button" aria-label="Clear search" onClick={() => setSearch('')} data-testid="button-clear-search"><X size={16} /></button>}
          <span className="search-hint">DEMO CATALOG</span>
        </section>

        {catalog.isLoading ? (
          <section className="loading-panel" aria-live="polite"><LoaderCircle className="spin" size={22} /><span>Finding demo items…</span></section>
        ) : catalog.isError ? (
          <section className="error-panel" role="alert"><div><strong>We couldn’t load the demo catalog.</strong><p>Please try again in a moment.</p></div><button className="btn btn-outline" onClick={() => void catalog.refetch()} data-testid="button-retry-catalog">Try again</button></section>
        ) : items.length === 0 ? (
          <section className="empty-panel"><div className="empty-icon"><Search size={20} /></div><h2>No demo items found</h2><p>Try another search, or clear it to browse the sample catalog.</p><button className="text-button" onClick={() => setSearch('')} data-testid="button-reset-search">Show all demo items <ArrowRight size={15} /></button></section>
        ) : (
          <>
            <div className="section-kicker"><span>01</span> THE ITEM <span className="kicker-rule" /><span className="catalog-count">{items.length} DEMO {items.length === 1 ? 'MATCH' : 'MATCHES'}</span></div>
            <section className="product-panel">
              <aside className="product-aside">
                <div className="product-art">
                  <div className="art-grid" />
                  <div className="art-tag"><span className="tiny-dot" /> DEMO ITEM</div>
                  <div className="art-object"><ShoppingBag size={64} strokeWidth={1.2} /></div>
                  <div className="art-category">{selected?.category ?? 'CATALOG'}</div>
                </div>
                <div className="unit-metric">
                  <div className="metric-icon"><Coffee size={16} /></div>
                  <div><span>COST PER USE</span><strong>{money(costPerUse, selected?.currency)}<small> / use</small></strong></div>
                  <span className="uses-pill">{selected?.expectedUses} USES EST.</span>
                </div>
              </aside>
              <div className="product-info">
                <div className="product-heading">
                  <div>
                    <span className="category-label">{selected?.category}</span>
                    <h2>{selected?.name}</h2>
                  </div>
                  <div className="price-block">
                    <strong>{money(selected?.price ?? 0, selected?.currency)}</strong>
                    <small>DEMO LISTED PRICE</small>
                    {selected?.alternativePrice != null && <span className="alt-price">Alternative {money(selected.alternativePrice, selected.currency)}</span>}
                  </div>
                </div>
                <div className="offer-row">
                  {selected?.alternativePrice != null && <span className={`offer-chip ${selected.alternativePrice < selected.price ? 'savings' : 'neutral'}`}><ArrowDownRight size={14} /> {selected.alternativePrice < selected.price ? 'Lower listed alternative' : 'Listed alternative'}: {money(selected.alternativePrice, selected.currency)}{discount != null && ` · ${discount}% less`}</span>}
                  {selected?.discountLabel && <span className="offer-chip discount"><Sparkles size={13} /> {selected.discountLabel}</span>}
                  {selected?.promoCode && <span className="offer-chip promo">CODE <b>{selected.promoCode}</b></span>}
                  {selected?.cashbackPercent != null && <span className="offer-chip cashback"><Wallet size={13} /> {selected.cashbackPercent}% cashback</span>}
                  {selected?.alternativePrice == null && !selected?.discountLabel && !selected?.promoCode && selected?.cashbackPercent == null && <span className="offer-chip neutral">No listed offer</span>}
                </div>
                <div className="insight-box">
                  <div className="insight-heading"><span className="insight-icon"><Sparkles size={14} /></span><strong>THE PAUSE</strong><span>YOUR CALL, NO PRESSURE</span></div>
                  <p>{selected?.alternativePrice != null && selected.alternativePrice < selected.price ? `A lower listed option could leave ${money(selected.price - selected.alternativePrice, selected.currency)} in your pocket. You can compare, wait, or decide it’s not for you.` : 'There’s no rush to decide. Check the cost per use, give it a day, or choose to move on.'}</p>
                  <div className="insight-foot"><span><Check size={14} /> Demo figures only · No checkout links</span><span>{selected?.expectedUses} estimated uses</span></div>
                </div>
                {selected && <p className="studio-amount-note">At the 10% default, {money(selected.price * 0.1, selected.currency)} would be prepared and {money(selected.price * 0.9, selected.currency)} would remain outside the fund.</p>}
                {pick && <section className="savewise-pick" data-testid="card-savewise-pick">
                  <div className="pick-topline"><span className="pick-mark" aria-hidden="true">✦</span><span>SAVEWISE PICK</span><span className="pick-rule" /></div>
                   <strong className="pick-headline" data-testid="text-savewise-pick">{pick.headline}</strong>
                  <p>{pick.message}</p>
                   <div className="pick-growth" data-testid="section-contribution-projections">
                     <div><span>ILLUSTRATIVE CONTRIBUTION PROJECTIONS · 5% ANNUAL</span></div>
                      <div className="prepared-projection-grid">{[1, 3, 5, 10].map((years) => <span key={years}><small>{years}Y</small><b>{money((selected!.price * 0.1) * Math.pow(1.05, years), selected!.currency)}</b></span>)}</div>
                     <small>Estimates only; not guaranteed. No money moves.</small>
                   </div>
                  {pick.offers.length > 0 && <div className="pick-offers" data-testid="text-pick-offers"><span>Listed offers</span>{pick.offers.map((offer) => <span key={offer}>{offer}</span>)}</div>}
                  {pick.savings != null && <span className="pick-savings" data-testid="text-pick-savings">Listed difference · {money(pick.savings, selected?.currency)}</span>}
                    <button className="pick-why" type="button" onClick={() => { if (!selected) return; setModalError(null); createDecision.reset(); resolveDecision.reset(); setModal({ kind: 'why', item: selected, itemName: selected.name, price: selected.price, percent: 10 }); }} data-testid="button-see-why">Why this pick? <ArrowRight size={13} /></button>
                </section>}
                <div className="selected-nav">
                  <span>Browse demo items</span>
                  <div className="item-switcher" role="group" aria-label="Choose demo item">
                    {items.map((item) => (
                      <button key={item.id} onClick={() => { setSelected(item); setNotice(null); }} className={`item-chip ${selected?.id === item.id ? 'active' : ''}`} data-testid={`button-item-${item.id}`} aria-pressed={selected?.id === item.id}>
                        {item.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <SmartPicksCard
              recommendation={smartRecommendation}
              state={smartPicksState}
              onAction={(target) => {
                if (target === 'view-goals') {
                  setLocation('/rewards');
                } else if (target === 'view-future-fund') {
                  setLocation('/future-fund');
                } else {
                  document.getElementById('decision-options')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }}
              onRetry={() => {
                void Promise.all([
                  catalog.refetch(),
                  decisions.refetch(),
                  rewardsSummary.refetch(),
                  goals.refetch(),
                ]);
              }}
            />

            <div className="section-kicker choice-kicker"><span>02</span> YOUR NEXT MOVE <span className="kicker-rule" /></div>
            <section className="choices-grid" id="decision-options" aria-label="Decision options">
              <ChoiceCard
                number="01" label="DIRECT" title="Buy now" text="Record that you’re ready. SaveWise won’t take you to checkout or make a purchase."
                icon={<ShoppingBag size={18} />} button="I’VE DECIDED" tone="direct" onClick={() => openDecision('buy')} disabled={pending}
              />
              <ChoiceCard
                number="02" label="A DAY TO THINK" title="Wait 24 hours" text="Give the impulse a little room to settle. Revisit this tomorrow."
                icon={<Hourglass size={18} />} button="WAIT 24 HOURS" tone="wait" onClick={() => openDecision('wait_24h')} disabled={pending}
              />
              <ChoiceCard
                number="03" label="A WEEK TO THINK" title="Wait 7 days" text="Let a week pass. If it still feels right, you can decide then."
                icon={<Clock3 size={18} />} button="WAIT 7 DAYS" tone="wait-long" onClick={() => openDecision('wait_7_days')} disabled={pending}
              />
              <ChoiceCard
                number="04" label="KEEP YOUR MONEY" title="Skip it" text="Choose not to buy. See what you’re keeping, with no pressure to do anything else."
                icon={<Heart size={18} />} button="I’M SKIPPING THIS" tone="skip" onClick={() => openDecision('skip')} disabled={pending}
              />
            </section>
            {(createDecision.isError || resolveDecision.isError) && !modal && <div className="inline-error" role="alert" data-testid="status-decision-error">That choice didn’t save. Please try again.</div>}
            {pending && <div className="saving-line" role="status"><LoaderCircle size={15} className="spin" /> Saving your choice…</div>}
            {notice && <SuccessNotice decision={notice} onDismiss={() => setNotice(null)} />}
          </>
        )}

        <section className="history-area">
          <div className="history-header">
            <div><div className="section-kicker"><span>03</span> YOUR DECISION LOG</div><h2>Your decisions</h2></div>
            <span className="history-total">{history.length} {history.length === 1 ? 'DECISION' : 'DECISIONS'}</span>
          </div>
          {decisions.isLoading ? <div className="history-state"><span className="skeleton-line" /><span className="skeleton-line short" /></div>
            : decisions.isError ? <div className="history-error" role="alert"><span>Decision history couldn’t load.</span><button className="text-button" onClick={() => void decisions.refetch()} data-testid="button-retry-history">Retry <ArrowRight size={14} /></button></div>
              : history.length === 0 ? <div className="history-empty"><div className="history-empty-icon"><Clock3 size={18} /></div><div><strong>Your log starts here.</strong><p>Every choice you save will appear here. No judgment, just a clearer picture.</p></div></div>
                : <div className="history-list">{[...history].reverse().map((entry) => <HistoryRow key={entry.id} entry={entry} />)}</div>}
        </section>

        <section className="waiting-area">
          <div className="waiting-title"><div className="waiting-symbol"><Clock3 size={18} /></div><div><span className="eyebrow">THE COOLING-OFF LIST</span><h2>Waiting decisions</h2></div><span className="waiting-count">{waiting.length} WAITING</span></div>
          {decisions.isError ? <p className="waiting-message">Waiting items are unavailable until your decision log loads.</p>
            : waiting.length === 0 ? <div className="waiting-empty"><span className="waiting-empty-mark"><Check size={15} /></span><p>Nothing waiting.</p></div>
              : <div className="waiting-list">{waiting.map((entry) => {
                const isDue = due.some((candidate) => candidate.id === entry.id);
                return <div className={`waiting-card ${isDue ? 'is-due' : ''}`} key={entry.id} data-testid={`card-waiting-${entry.id}`}>
                  <div className="waiting-card-main"><div className="wait-card-icon"><Hourglass size={17} /></div><div><strong>{entry.itemName}</strong><span>{money(entry.price)} · {entry.waitingPeriod === '24h' ? '24-hour pause' : '7-day pause'}</span></div></div>
                  {isDue ? <div className="still-want">
                    <span>Still want it?</span>
                    <button className="mini-choice" onClick={() => resolveWaiting(entry, 'buy')} disabled={pending} data-testid={`button-still-want-${entry.id}`}>Buy</button>
                    <button className="mini-choice quiet" onClick={() => resolveWaiting(entry, 'wait_24h')} disabled={pending} data-testid={`button-wait-24h-again-${entry.id}`}>Wait 24h</button>
                    <button className="mini-choice quiet" onClick={() => resolveWaiting(entry, 'wait_7_days')} disabled={pending} data-testid={`button-wait-7-days-again-${entry.id}`}>Wait 7 days</button>
                    <button className="mini-choice quiet" onClick={() => resolveWaiting(entry, 'skip')} disabled={pending} data-testid={`button-no-longer-want-${entry.id}`}>Skip it</button>
                  </div>
                    : <span className="due-date"><Clock3 size={13} /> Revisit {entry.waitUntil ? new Date(entry.waitUntil).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'soon'}</span>}
                </div>;
              })}</div>}
          {resolveDecision.isError && <div className="inline-error" role="alert">Couldn’t resolve that item. Please try again.</div>}
        </section>
      </div>
      <ConfirmationModal
        open={Boolean(modal)}
        onOpenChange={(open) => {
          if (!open && !pending) {
            setModal(modal?.kind === 'why' && modal.returnTo ? modal.returnTo : null);
          }
        }}
        title={modalTitle}
        description={modalDescription}
        confirmLabel={modalConfirmLabel}
        onConfirm={confirmDecision}
        cancelLabel={modal?.kind === 'why' ? 'Got It' : modalDecision === 'buy' ? 'Go Back' : modalDecision === 'skip' ? 'Not Now' : 'Cancel'}
        pending={pending}
        confirmDisabled={modal?.kind === 'why' || (isSkipModal && !percentValid)}
        error={modalError}
        informational={modal?.kind === 'why'}
      >
        {modal?.kind === 'why' ? (
          <div>
            <div className="modal-why-amounts">
              <strong>{modal.itemName} · {money(modal.price, modal.item?.currency)}</strong>
              <span>{modal.percent}% rate · {money(modal.price * modal.percent / 100, modal.item?.currency)} prepared · {money(modal.price - modal.price * modal.percent / 100, modal.item?.currency)} remains outside the fund.</span>
            </div>
            {whyPick ? (
              <ul className="modal-fact-list" data-testid="list-savewise-pick-reasons">
                {whyPick.reasons.map((reason, index) => <li key={`${index}-${reason}`}><Check size={15} />{reason}</li>)}
              </ul>
            ) : <ul className="modal-fact-list" data-testid="list-savewise-pick-reasons">
              <li><Check size={15} />Based only on the saved item name, price, and selected rate. Catalog details are unavailable, so no alternative, discount, or offer is assumed.</li>
              <li><Check size={15} />The 10% rate is a default, not a recommendation that it is objectively best.</li>
            </ul>}
          </div>
        ) : modalDecision === 'buy' ? (
          <div className="modal-facts">
            <div><span>ITEM</span><strong>{modalItemInfo?.name}</strong></div>
            <div><span>PRICE</span><strong>{money(modalItemInfo?.price ?? 0, modalItemInfo?.currency)}</strong></div>
            <p>Before you buy, check whether there is a cheaper option.</p>
          </div>
        ) : modalDecision === 'wait_24h' ? (
          <div className="pause-preview">{modalItem && <div className="pause-item"><span>{modalItem.name}</span><strong>{money(modalItem.price, modalItem.currency)}</strong></div>}{modal?.kind === 'waiting' && <div className="pause-item"><span>{modal.record.itemName}</span><strong>{money(modal.record.price)}</strong></div>}<strong>24 HOURS</strong><p>Your decision will be saved here so you can revisit it after the pause. SaveWise does not send a notification.</p></div>
        ) : modalDecision === 'wait_7_days' ? (
          <div className="pause-preview">{modalItem && <div className="pause-item"><span>{modalItem.name}</span><strong>{money(modalItem.price, modalItem.currency)}</strong></div>}{modal?.kind === 'waiting' && <div className="pause-item"><span>{modal.record.itemName}</span><strong>{money(modal.record.price)}</strong></div>}<strong>7 DAYS</strong><p>Your decision will be available to revisit after the waiting period.</p></div>
        ) : isSkipModal && modalItem ? (
          <div className="skip-preview" data-testid="panel-skip-preview">
            <strong className="skip-item-name">{modalItem.name}</strong>
            <div className="skip-metrics">
              <div><span>ITEM PRICE</span><strong>{money(modalItem.price, modalItem.currency)}</strong></div>
              <span className="skip-arrow" aria-hidden="true">→</span>
              <div><span>POTENTIAL MONEY KEPT</span><strong>{money(modalItem.price, modalItem.currency)}</strong></div>
            </div>
            <PercentPicker value={contributionPercent} onChange={setContributionPercent} idPrefix="skip-modal" />
            {percentValid ? <div className="skip-metrics skip-rate-metrics">
              <div><span>SELECTED · {ratePercent}% CONTRIBUTION</span><strong>+{money(modalItem.price * ratePercent / 100, modalItem.currency)}</strong></div>
              <div><span>REMAINING OUTSIDE FUND</span><strong>{money(modalItem.price - modalItem.price * ratePercent / 100, modalItem.currency)}</strong></div>
            </div> : <p className="percent-error" role="alert">Enter a whole number from 1% to 100% to preview the contribution.</p>}
            {percentValid && <p>{ratePercent}% is your selected rate. The 10% default is not an objectively best choice; approval is optional.</p>}
            {percentValid && <div className="modal-pick-explanation"><strong>SaveWise Pick · {modalPick?.headline ?? `${ratePercent}% amount preview`}</strong><span>{modalPick?.message ?? `Using only the saved purchase price, ${money(modalItem.price * ratePercent / 100)} would be prepared and ${money(modalItem.price - modalItem.price * ratePercent / 100)} would remain. Catalog facts are unavailable; no offers are assumed.`}</span></div>}
            <button className="pick-why" type="button" onClick={() => {
              if (!percentValid || !modalItemInfo) return;
              setModal({
                kind: 'why',
                item: modalItem,
                itemName: modalItemInfo.name,
                price: modalItemInfo.price,
                percent: ratePercent,
                returnTo: modal ?? undefined,
              });
            }} disabled={!percentValid} data-testid="button-skip-why">Why this pick? <ArrowRight size={13} /></button>
            {percentValid && <div className="skip-growth"><span>{money(modalItem.price * ratePercent / 100, modalItem.currency)} today</span><ArrowRight size={15} /><strong>{money(modalItem.price * ratePercent / 100 * Math.pow(1.05, 5), modalItem.currency)} in 5 years*</strong></div>}
            <small>*Illustrative 5% annual compound estimate, not guaranteed. Simulation only; no real money moves.</small>
          </div>
        ) : isSkipModal && modal?.kind === 'waiting' ? (
          <div className="skip-preview" data-testid="panel-skip-preview">
            <strong className="skip-item-name">{modal.record.itemName}</strong>
            <div className="skip-metrics">
              <div><span>ITEM PRICE</span><strong>{money(modal.record.price)}</strong></div>
              <span className="skip-arrow" aria-hidden="true">→</span>
              <div><span>POTENTIAL MONEY KEPT</span><strong>{money(modal.record.price)}</strong></div>
            </div>
            <PercentPicker value={contributionPercent} onChange={setContributionPercent} idPrefix="waiting-skip-modal" />
            {percentValid ? <div className="skip-metrics skip-rate-metrics">
              <div><span>SELECTED · {ratePercent}% CONTRIBUTION</span><strong>+{money(modal.record.price * ratePercent / 100)}</strong></div>
              <div><span>REMAINING OUTSIDE FUND</span><strong>{money(modal.record.price - modal.record.price * ratePercent / 100)}</strong></div>
            </div> : <p className="percent-error" role="alert">Enter a whole number from 1% to 100% to preview the contribution.</p>}
            {percentValid && <p>{ratePercent}% is your selected rate. The 10% default is not an objectively best choice; approval is optional.</p>}
            {percentValid && <div className="modal-pick-explanation"><strong>SaveWise Pick · {modalPick?.headline ?? `${ratePercent}% amount preview`}</strong><span>{modalPick?.message ?? `Using only the saved purchase price, ${money(modal.record.price * ratePercent / 100)} would be prepared and ${money(modal.record.price - modal.record.price * ratePercent / 100)} would remain. Catalog facts are unavailable; no offers are assumed.`}</span></div>}
            <button className="pick-why" type="button" onClick={() => {
              if (!percentValid) return;
              setModal({
                kind: 'why',
                item: modalItem,
                itemName: modal.record.itemName,
                price: modal.record.price,
                percent: ratePercent,
                returnTo: modal,
              });
            }} disabled={!percentValid} data-testid="button-waiting-skip-why">Why this pick? <ArrowRight size={13} /></button>
            {percentValid && <div className="skip-growth"><span>{money(modal.record.price * ratePercent / 100)} today</span><ArrowRight size={15} /><strong>{money(modal.record.price * ratePercent / 100 * Math.pow(1.05, 5))} in 5 years*</strong></div>}
            <small>*Illustrative 5% annual compound estimate, not guaranteed. Simulation only; no real money moves.</small>
          </div>
        ) : null}
      </ConfirmationModal>
      <footer><div className="footer-brand"><span className="brand-symbol small"><ArrowDownRight size={12} /></span> SaveWise</div><p>DEMO DATA ONLY · Not live pricing · No purchase is made · Decisions are yours</p><span>BEFORE I CLICK</span></footer>
    </main>
  );
}

function FutureFund() {
  const queryClient = useQueryClient();
  const sessionId = useMemo(getSaveWiseSessionId, []);
  const params = useMemo(() => ({ sessionId }), [sessionId]);
  const decisions = useListDecisions(params, {
    query: { queryKey: getListDecisionsQueryKey(params) },
  });
  const summary = useGetFutureFundSummary(params, {
    query: { queryKey: getGetFutureFundSummaryQueryKey(params) },
  });
  const fundCatalogParams = useMemo(() => ({}), []);
  const fundCatalog = useSearchCatalogItems(fundCatalogParams, {
    query: { queryKey: getSearchCatalogItemsQueryKey(fundCatalogParams) },
  });
  const simulate = useSimulateFutureFundInvestment();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [successAmount, setSuccessAmount] = useState<number | null>(null);
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [fundWhyOpen, setFundWhyOpen] = useState(false);
  const approvalSubmittingRef = useRef(false);

  const contributions = summary.data?.contributions ?? [];
  const contributedIds = new Set(contributions.map((item) => item.decisionId));
  const eligible = (decisions.data ?? []).filter((entry) =>
    entry.decision === 'skip' &&
    entry.status === 'completed' &&
    entry.preparedContribution > 0 &&
    !entry.simulatedContributionAt &&
    !contributedIds.has(entry.id),
  );
  const alreadyAdded = (decisions.data ?? []).filter((entry) =>
    entry.decision === 'skip' && entry.status === 'completed' && entry.preparedContribution > 0 &&
    (Boolean(entry.simulatedContributionAt) || contributedIds.has(entry.id)),
  );
  const selected = eligible.find((entry) => entry.id === selectedId) ?? null;
  const fundRatePercent = selected ? Number(percentFromPrepared(selected)) : 10;
  const selectedContribution = selected?.preparedContribution ?? 0;
  const selectedRemaining = selected ? selected.price - selectedContribution : 0;
  const selectedCatalogItem = selected ? fundCatalog.data?.find((item) => item.id === selected.itemId) ?? null : null;
  const fundPick = selected && selectedCatalogItem
    ? getSaveWisePick(selectedCatalogItem, fundRatePercent)
    : null;
  const rate = summary.data?.annualReturnRate ?? 0.05;
  const total = summary.data?.totalContributed ?? 0;
  const project = (amount: number, years: number) => (total + amount) * Math.pow(1 + rate, years);
  const refreshFundData = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: getGetFutureFundSummaryQueryKey(params) }),
    queryClient.invalidateQueries({ queryKey: getListDecisionsQueryKey(params) }),
  ]);
  const openApproval = () => {
    if (!selected || simulate.isPending) return;
    simulate.reset();
    setApprovalModalOpen(true);
  };
  const selectEligible = (entry: Decision) => {
    setSelectedId(entry.id);
    setSuccess(false);
  };
  const approveContribution = () => {
    if (!selected || simulate.isPending || approvalSubmittingRef.current) return;
    approvalSubmittingRef.current = true;
    setSuccess(false);
    simulate.mutate({ data: { sessionId, decisionId: selected.id } }, {
      onSuccess: (result) => {
        queryClient.setQueryData(getGetFutureFundSummaryQueryKey(params), result);
        setSuccessAmount(selectedContribution);
        setSuccess(true);
        setApprovalModalOpen(false);
        approvalSubmittingRef.current = false;
        void refreshFundData();
      },
      onError: () => { approvalSubmittingRef.current = false; },
    });
  };

  return (
    <main className="min-h-[100dvh] bg-[#faf9f5] text-[#1b1c1a]">
      <SiteHeader activePage="future-fund" statusLabel="SIMULATION ONLY" />
      <div className="page-wrap fund-page">
        <section className="fund-hero">
          <div>
            <div className="eyebrow"><span className="eyebrow-line" /> A PAUSE CAN HAVE A NEXT CHAPTER</div>
            <h1>Your Future Fund,<br /><span>imagined.</span></h1>
            <p>When you skip something, you can choose to picture that prepared amount growing over time.</p>
          </div>
          <div className="fund-hero-mark" aria-hidden="true"><div className="fund-orbit orbit-one" /><div className="fund-orbit orbit-two" /><div className="fund-coin"><Coins size={37} strokeWidth={1.35} /></div><span>VIRTUAL ONLY</span></div>
        </section>

        <aside className="simulation-banner" data-testid="status-simulation-disclosure">
          <LockKeyhole size={18} />
          <div><strong>A thoughtful simulation, not a transaction.</strong><p>Nothing is invested or transferred. The 5% compound annual return is an illustrative estimate, not a guarantee.</p></div>
        </aside>

        {summary.isLoading ? (
          <section className="fund-loading" aria-live="polite" data-testid="status-fund-loading"><span className="skeleton-line" /><span className="skeleton-line short" /><span className="skeleton-line" /></section>
        ) : summary.isError ? (
          <section className="fund-error" role="alert" data-testid="status-fund-error"><div><strong>We couldn’t load your Future Fund.</strong><p>Your saved decisions are unchanged.</p></div><button className="btn btn-outline" onClick={() => void summary.refetch()} data-testid="button-retry-fund">Try again</button></section>
        ) : (
          <>
            <section className="fund-summary">
              <div className="fund-total">
                <div className="fund-total-top"><span className="fund-label">SIMULATED TOTAL</span><span className="simulation-tag"><span /> VIRTUAL</span></div>
                <strong data-testid="text-fund-total">{money(total)}</strong>
                <p>{summary.data?.contributionCount ?? 0} {summary.data?.contributionCount === 1 ? 'intentional skip' : 'intentional skips'} included</p>
                <div className="fund-total-rule"><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /></div>
                <small>Not a balance. No real funds have moved.</small>
              </div>
              <div className="fund-rate">
                <div className="rate-icon"><TrendingUp size={17} /></div>
                <div><span>ILLUSTRATIVE ASSUMPTION</span><strong>{(rate * 100).toFixed(0)}% <small>annual return</small></strong><p>Compounded once per year for the projection.</p></div>
              </div>
            </section>

            <section className="projection-section" data-testid="section-projections">
              <div className="section-kicker"><span>01</span> SEE A POSSIBLE PATH <span className="kicker-rule" /><span className="catalog-count">ILLUSTRATIVE ONLY</span></div>
              <div className="projection-heading"><div><h2>Illustrative projections</h2><p>Estimates use the simulated total and the assumed annual rate.</p></div><span className="projection-symbol"><TrendingUp size={22} /></span></div>
              <div className="projection-grid">
                {[...(summary.data?.projections ?? [])].sort((a, b) => a.years - b.years).map((projection) => (
                  <article className="projection-card" key={projection.years} data-testid={`card-projection-${projection.years}`}>
                    <span className="projection-years">{projection.years} {projection.years === 1 ? 'YEAR' : 'YEARS'}</span>
                    <strong>{money(projection.projectedValue)}</strong>
                    <span className="projection-growth">+{money(projection.projectedGrowth)} illustrative growth</span>
                    <div className="projection-track"><span style={{ transform: `scaleX(${Math.min(1, projection.years / 10)})` }} /></div>
                  </article>
                ))}
              </div>
              {selected && <div className="candidate-preview" data-testid="status-candidate-projection">
                <div><span className="candidate-label">PREPARED AT {fundRatePercent}% · IF YOU APPROVE</span><strong>{selected.itemName}</strong></div>
                <div className="fund-selected-amounts"><span>{money(selectedContribution)} prepared contribution</span><span>{money(selectedRemaining)} remains outside the fund</span></div>
                <div className="fund-pick-explanation">
                  <strong>SaveWise Pick · {fundPick?.headline ?? 'Amount-only preview'}</strong>
                  <p>{fundPick?.message ?? `This uses the saved purchase price and prepared amount only. Catalog facts are unavailable; no offers are assumed.`}</p>
                  {fundPick?.offers.length ? <div className="pick-offers">{fundPick.offers.map((offer) => <span key={offer}>{offer}</span>)}</div> : null}
                </div>
                <button className="pick-why" type="button" onClick={() => setFundWhyOpen(true)} data-testid="button-fund-preview-why">Why this pick? <ArrowRight size={13} /></button>
                <div className="candidate-estimates">{[1, 3, 5, 10].map((years) => <span key={years}><small>{years}Y</small><b>{money(project(selectedContribution, years))}</b></span>)}</div>
                <p>Illustrative total including this prepared amount. This is not an investment offer or a guaranteed return.</p>
              </div>}
            </section>

            <section className="eligible-section">
              <div className="eligible-heading"><div><div className="section-kicker"><span>02</span> YOUR CHOICE, ALWAYS</div><h2>Skipped purchases</h2><p>Only completed skips with a prepared amount can be considered. Adding one is entirely optional.</p></div><span className="eligible-count">{eligible.length} ELIGIBLE</span></div>
              {decisions.isLoading ? <div className="fund-loading compact" aria-live="polite" data-testid="status-decisions-loading"><span className="skeleton-line" /><span className="skeleton-line short" /></div>
                : decisions.isError ? <div className="fund-error" role="alert" data-testid="status-decisions-error"><div><strong>Decision list unavailable.</strong><p>Retry to check which completed skips are eligible.</p></div><button className="text-button" onClick={() => void decisions.refetch()} data-testid="button-retry-decisions">Retry <ArrowRight size={14} /></button></div>
                  : eligible.length === 0 ? <div className="fund-empty" data-testid="status-no-eligible"><div className="empty-icon"><Heart size={20} /></div><div><strong>No skips ready to add.</strong><p>Completed skips with a prepared amount will appear here. An addition will always need your approval.</p></div></div>
                    : <div className="eligible-list">{eligible.map((entry) => (
                      <button key={entry.id} type="button" className={`eligible-card ${selectedId === entry.id ? 'selected' : ''}`} onClick={() => selectEligible(entry)} disabled={simulate.isPending} aria-pressed={selectedId === entry.id} data-testid={`button-select-contribution-${entry.id}`}>
                        <span className="eligible-icon"><Heart size={17} /></span>
                        <span className="eligible-copy"><strong>{entry.itemName}</strong><small>Skipped {entry.completedAt ? new Date(entry.completedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : ''} · Completed</small></span>
                        <span className="eligible-amount"><small>PREPARED ONLY</small><strong>{money(entry.preparedContribution)}</strong></span>
                        <span className={`select-indicator ${selectedId === entry.id ? 'checked' : ''}`}>{selectedId === entry.id && <Check size={13} />}</span>
                      </button>
                    ))}</div>}
              {alreadyAdded.length > 0 && <div className="already-added-list" data-testid="section-already-added"><span className="already-added-title">ALREADY IN THE SIMULATION</span>{alreadyAdded.map((entry) => <div className="already-added-row" key={entry.id} data-testid={`status-already-added-${entry.id}`}><Check size={14} /><span>{entry.itemName}</span><strong>{money(entry.preparedContribution)}</strong><small>ADDED</small></div>)}</div>}

              {selected && !success && <div className="approval-action" data-testid="panel-approval-preview">
                <div><strong>Preview first. Decide when ready.</strong><p>Only this prepared amount will be added to the virtual simulation. No real money moves.</p></div>
                 <button className="fund-cta" onClick={openApproval} disabled={simulate.isPending} aria-label="Approve and invest in the simulation only" data-testid="button-confirm-approval">Approve & Invest · Simulation only <Check size={15} /></button>
              </div>}
              {simulate.isError && <p className="fund-mutation-error" role="alert" data-testid="status-approval-error">That approval didn’t save. Please try again.</p>}
              {simulate.isPending && <p className="saving-line" role="status" data-testid="status-approval-pending"><LoaderCircle size={15} className="spin" /> Recording virtual contribution…</p>}
              {success && <div className="fund-success" role="status" aria-live="polite" data-testid="status-contribution-success"><span className="success-check"><Check size={18} /></span><div><strong>Added to your simulation.</strong><p>{money(successAmount ?? 0)} is now shown as a virtual contribution. No money moved or was invested.</p></div></div>}
            </section>

            <section className="contribution-section">
              <div className="eligible-heading"><div><div className="section-kicker"><span>03</span> THE VIRTUAL LEDGER</div><h2>Contributions you approved</h2></div><span className="eligible-count">{contributions.length} RECORDED</span></div>
              {contributions.length === 0 ? <div className="ledger-empty" data-testid="status-ledger-empty"><span><PiggyBank size={18} /></span><p>Your approved simulated contributions will be listed here. Nothing is added without your say-so.</p></div>
                : <div className="contribution-list">{[...contributions].reverse().map((item) => <article key={item.decisionId} className="contribution-row" data-testid={`row-contribution-${item.decisionId}`}><span className="contribution-check"><Check size={15} /></span><div><strong>{item.itemName}</strong><small>{new Date(item.contributedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} · virtual</small></div><strong className="contribution-amount">+{money(item.amount)}</strong><span className="added-badge">ADDED</span></article>)}</div>}
            </section>
          </>
        )}
        <footer className="fund-footer"><div className="footer-brand"><span className="brand-symbol small"><ArrowDownRight size={12} /></span> SaveWise</div><p>SIMULATION ONLY · Illustrative estimate · Nothing invested or transferred</p><Link href="/" data-testid="link-back-decisions">BACK TO DECISIONS <ArrowUpRight size={12} /></Link></footer>
      </div>
      <ConfirmationModal
        open={approvalModalOpen}
        onOpenChange={(open) => { if (!simulate.isPending) setApprovalModalOpen(open); }}
        title="Put it to work."
        description="Review the prepared amount before adding it to your virtual simulation."
        confirmLabel="Approve & Invest"
        onConfirm={approveContribution}
        cancelLabel="Cancel"
        pending={simulate.isPending}
        confirmDisabled={!selected}
        error={simulate.isError ? 'That approval didn’t save. Your contribution is unchanged. Please try again.' : null}
      >
        {selected && <div className="approval-modal-preview" data-testid="panel-approval-modal-preview">
          <div className="approval-modal-projection"><span>SKIPPED PURCHASE PRICE</span><strong>{money(selected.price, selectedCatalogItem?.currency)}</strong></div>
          <div className="approval-modal-amount"><span>PREPARED RATE · {fundRatePercent}% CONTRIBUTION</span><strong>+{money(selectedContribution, selectedCatalogItem?.currency)}</strong></div>
          <div className="approval-modal-projection"><span>REMAINING OUTSIDE FUND</span><strong>{money(selectedRemaining, selectedCatalogItem?.currency)}</strong></div>
          <div className="approval-modal-projection"><span>PROJECTED TOTAL · 5 YEARS</span><strong>{money(project(selectedContribution, 5), selectedCatalogItem?.currency)}</strong></div>
          <div className="approval-pick-copy">
            <strong>SaveWise Pick · {fundPick?.headline ?? 'Amount-only preview'}</strong>
            <span>{fundPick ? `${fundPick.message}${fundPick.offers.length ? ` Listed details: ${fundPick.offers.join('; ')}.` : ''}` : 'The saved item name and price are available, but no matching catalog facts were found; no alternative or offer is assumed.'}</span>
          </div>
          <button className="pick-why" type="button" onClick={() => setFundWhyOpen(true)} data-testid="button-approval-why">Why this pick? <ArrowRight size={13} /></button>
          <p>Simulation only; no real money is invested or transferred. Projection uses the illustrative annual assumption and is not guaranteed.</p>
        </div>}
      </ConfirmationModal>
      <ConfirmationModal
        open={fundWhyOpen}
        onOpenChange={setFundWhyOpen}
        title="Why this SaveWise Pick?"
        description="A factual explanation using the selected skipped purchase and available catalog facts. No data will be changed."
        confirmLabel="Got It"
        onConfirm={() => setFundWhyOpen(false)}
        cancelLabel="Got It"
        informational
      >
        {selected && <div>
          <div className="modal-why-amounts">
            <strong>{selected.itemName} · {money(selected.price, selectedCatalogItem?.currency)}</strong>
            <span>{fundRatePercent}% rate · {money(selectedContribution, selectedCatalogItem?.currency)} prepared · {money(selectedRemaining, selectedCatalogItem?.currency)} remains outside the fund.</span>
          </div>
          {fundPick ? <ul className="modal-fact-list" data-testid="list-fund-pick-reasons">
            {fundPick.reasons.map((reason, index) => <li key={`${index}-${reason}`}><Check size={15} />{reason}</li>)}
          </ul> : <ul className="modal-fact-list" data-testid="list-fund-pick-reasons">
            <li><Check size={15} />The saved item name and price are available; no matching catalog facts were found, so no alternative or offer is assumed.</li>
            <li><Check size={15} />10% is the default, not an objectively best rate. Only your selected amount is being previewed.</li>
          </ul>}
        </div>}
      </ConfirmationModal>
    </main>
  );
}

function ChoiceCard({ number, label, title, text, icon, button, tone, onClick, disabled }: {
  number: string; label: string; title: string; text: string; icon: ReactNode;
  button: string; tone: string; onClick: () => void; disabled: boolean;
}) {
  return <article className={`choice-card ${tone}`}>
    <div className="choice-top"><span>OPTION {number}</span><span className="choice-label">{label}</span></div>
    <div className="choice-icon">{icon}</div>
    <h3>{title}</h3><p>{text}</p>
    <button className="choice-button" onClick={onClick} disabled={disabled} data-testid={`button-decision-${tone}`}>
      {disabled ? <LoaderCircle size={15} className="spin" /> : null}{button}<ArrowRight size={14} />
    </button>
  </article>;
}

function SuccessNotice({ decision, onDismiss }: { decision: Decision; onDismiss: () => void }) {
  const skipped = decision.decision === 'skip';
  return <section className={`success-notice ${skipped ? 'success-skip' : ''}`} aria-live="polite" data-testid="status-decision-success">
    <div className="success-check"><Check size={19} /></div>
    <div className="success-copy"><strong>{skipped ? 'Purchase skipped.' : decision.status === 'waiting' ? decision.waitingPeriod === '24h' ? '24-hour wait started.' : '7-day wait started.' : 'Decision saved.'}</strong>
      <p>{skipped ? `You kept ${money(decision.savedAmount)}.` : decision.status === 'waiting' ? 'This decision is saved here for you to revisit.' : decision.decision === 'buy' ? 'You chose to buy this item. No purchase was made.' : 'Your decision is recorded. No purchase has been made.'}</p>
      {skipped && <Link href="/future-fund" className="prepared-link" data-testid="link-review-future-fund">Review the optional prepared amount in Future Fund <ArrowUpRight size={13} /></Link>}
    </div>
    <button className="dismiss-notice" onClick={onDismiss} aria-label="Dismiss confirmation" data-testid="button-dismiss-success"><X size={17} /></button>
  </section>;
}

function HistoryRow({ entry }: { entry: Decision }) {
  const isSkipped = entry.decision === 'skip';
  const isWaiting = entry.status === 'waiting';
  return <article className="history-row" data-testid={`row-decision-${entry.id}`}>
    <div className={`history-icon ${isSkipped ? 'skip-history' : isWaiting ? 'wait-history' : ''}`}>
      {isSkipped ? <Heart size={17} /> : isWaiting ? <Hourglass size={17} /> : <ShoppingBag size={17} />}
    </div>
    <div className="history-item"><strong>{entry.itemName}</strong><span>{new Date(entry.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · {money(entry.price)}</span></div>
    <span className={`decision-status ${isSkipped ? 'status-skip' : isWaiting ? 'status-wait' : 'status-buy'}`}>{humanDecision(entry.decision)}</span>
    {isSkipped && <span className="history-saved">+{money(entry.savedAmount)} kept</span>}
    {isWaiting && <span className="history-date">{entry.waitUntil ? `Until ${new Date(entry.waitUntil).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : 'Waiting'}</span>}
  </article>;
}

function Router() {
  return (
    // Keep a shared shell (sidebar, navbar) outside the boundary so it
    // survives a page crash.
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={WelcomeRoute} />
        <Route path="/decision-studio" component={Home} />
        <Route path="/sign-in/*?" component={WelcomeRoute} />
        <Route path="/sign-up/*?" component={WelcomeRoute} />
        <Route path="/future-fund" component={FutureFund} />
        <Route path="/rewards" component={Rewards} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function WelcomeRoute() {
  const [, setLocation] = useLocation();
  return <WelcomePage onContinueAsGuest={() => setLocation('/decision-studio')} />;
}

function App() {
  const [location, setLocation] = useLocation();
  const isWithinAppBase = location === appBasePath || location.startsWith(`${appBasePath}/`);

  useEffect(() => {
    if (isWithinAppBase) return;
    const targetPath = location === '/' ? appBasePath : `${appBasePath}${location}`;
    setLocation(targetPath, { replace: true });
  }, [isWithinAppBase, location, setLocation]);

  if (!isWithinAppBase) {
    return (
      <main className="sw-auth-page sw-auth-frame" role="status" aria-live="polite">
        <div className="sw-auth-content">Opening SaveWise…</div>
      </main>
    );
  }

  return (
    <WouterRouter base={appBasePath}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Router />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </WouterRouter>
  );
}

export default App;
