import { useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import {
  getGetRewardsSummaryQueryKey,
  getListSavingsGoalsQueryKey,
  useAddSavingsGoalContribution,
  useCreateSavingsGoal,
  useDeleteSavingsGoal,
  useGetRewardsSummary,
  useListSavingsGoals,
  useUpdateSavingsGoal,
} from '@workspace/api-client-react';
import type { SavingsGoal, SavingsGoalContributionResult } from '@workspace/api-client-react';
import SiteHeader from '@/components/site-header';
import { Link } from 'wouter';
import {
  ArrowRight, BadgeCheck, Check, Flame, Goal, Heart,
  LoaderCircle, LockKeyhole, Pencil, Plus, RefreshCw, Sparkles, Target,
  Trash2, Trophy, X,
} from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { getSaveWiseSessionId, createSaveWiseRequestId } from '@/lib/session';

const money = (value: number) => `${value.toFixed(3)} KWD`;
const amountStringSchema = z.string()
  .trim()
  .min(1, 'Enter an amount.')
  .refine((value) => /^\d+(\.\d{1,3})?$/.test(value), 'Use up to 3 decimal places.')
  .refine((value) => Number.isFinite(Number(value)) && Number(value) > 0, 'Amount must be greater than zero.');
const goalSchema = z.object({
  name: z.string().trim().min(1, 'Give your goal a name.').max(60, 'Keep the name to 60 characters or fewer.'),
  targetAmount: amountStringSchema,
});
const goalContributionSchema = (remainingAmount: number) => z.object({
  amount: amountStringSchema.refine((value) => Number(value) <= remainingAmount, `Enter no more than ${money(remainingAmount)} remaining.`),
});
type GoalFormValues = z.infer<typeof goalSchema>;
type ContributionFormValues = { amount: string };

function ContributionForm({ goal, pending, onClose, onSubmit }: {
  goal: SavingsGoal;
  pending: boolean;
  onClose: () => void;
  onSubmit: (amount: number, goal: SavingsGoal) => void;
}) {
  const form = useForm<ContributionFormValues>({
    resolver: zodResolver(goalContributionSchema(goal.remainingAmount)),
    defaultValues: { amount: '' },
    mode: 'onChange',
  });
  return <Form {...form}>
    <form className="rw-contribute-form" onSubmit={form.handleSubmit((values) => onSubmit(Number(values.amount), goal))} data-testid={`form-contribution-${goal.id}`}>
      <FormField control={form.control} name="amount" render={({ field }) => <FormItem>
        <div className="rw-contribution-label">
          <FormLabel>Track a little progress</FormLabel><span>virtual only</span>
        </div>
        <div className="rw-contribute-row">
          <FormControl><input {...field} type="number" min="0.001" max={goal.remainingAmount} step="0.001" inputMode="decimal" placeholder="0.000 KWD" data-testid={`input-contribution-${goal.id}`} /></FormControl>
          <button className="rw-button rw-primary" type="submit" disabled={pending || !form.formState.isValid} data-testid={`button-submit-contribution-${goal.id}`}>{pending ? <LoaderCircle size={15} className="rw-spin" /> : <Plus size={15} />} Add progress</button>
          <button type="button" className="rw-icon-button" onClick={onClose} aria-label="Close progress form" data-testid={`button-close-contribution-${goal.id}`}><X size={17} /></button>
        </div>
        <FormMessage className="rw-field-error" />
      </FormItem>} />
      <small>This is progress tracking only. It does not move money or approve a Future Fund contribution.</small>
    </form>
  </Form>;
}

export default function Rewards() {
  const queryClient = useQueryClient();
  const sessionId = useMemo(getSaveWiseSessionId, []);
  const timeZone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', []);
  const summaryParams = useMemo(() => ({ sessionId, timeZone }), [sessionId, timeZone]);
  const goalsParams = useMemo(() => ({ sessionId }), [sessionId]);
  const summary = useGetRewardsSummary(summaryParams, { query: { queryKey: getGetRewardsSummaryQueryKey(summaryParams) } });
  const goals = useListSavingsGoals(goalsParams, { query: { queryKey: getListSavingsGoalsQueryKey(goalsParams) } });
  const createGoal = useCreateSavingsGoal();
  const updateGoal = useUpdateSavingsGoal();
  const deleteGoal = useDeleteSavingsGoal();
  const contribute = useAddSavingsGoalContribution();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SavingsGoal | null>(null);
  const [contributingGoal, setContributingGoal] = useState<string | null>(null);
  const [goalToDelete, setGoalToDelete] = useState<SavingsGoal | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const createAttempt = useRef<{ signature: string; id: string } | null>(null);
  const contributionAttempt = useRef<{ signature: string; id: string } | null>(null);
  const goalForm = useForm<GoalFormValues>({
    resolver: zodResolver(goalSchema),
    defaultValues: { name: '', targetAmount: '' },
    mode: 'onChange',
  });

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: getListSavingsGoalsQueryKey(goalsParams) }),
      queryClient.invalidateQueries({ queryKey: getGetRewardsSummaryQueryKey(summaryParams) }),
    ]);
  };
  const resetGoalForm = () => {
    setFormOpen(false);
    setEditing(null);
    goalForm.reset({ name: '', targetAmount: '' });
    createAttempt.current = null;
  };
  const beginCreate = () => {
    setEditing(null);
    goalForm.reset({ name: '', targetAmount: '' });
    setFeedback(null);
    setFormOpen(true);
  };
  const beginEdit = (goal: SavingsGoal) => {
    setEditing(goal);
    goalForm.reset({ name: goal.name, targetAmount: String(goal.targetAmount) });
    setFeedback(null);
    setFormOpen(true);
  };
  const submitGoal = (values: GoalFormValues) => {
    const name = values.name.trim();
    const targetAmount = Number(values.targetAmount);
    if (createGoal.isPending || updateGoal.isPending) return;
    setFeedback(null);
    if (editing) {
      updateGoal.mutate({ id: editing.id, data: { sessionId, name, targetAmount } }, {
        onSuccess: async (updatedGoal) => {
          const newlyAwarded = !editing.bonusAwarded && updatedGoal.bonusAwarded;
          resetGoalForm();
          setFeedback({
            type: 'success',
            text: newlyAwarded
              ? `Goal complete — +50 bonus points awarded for ${updatedGoal.name}.`
              : updatedGoal.isComplete
                ? `Goal complete. ${updatedGoal.bonusAwarded ? 'Your completion bonus was already awarded.' : 'Your progress has been updated.'}`
                : 'Goal updated. Your progress is right where you left it.',
          });
          await invalidate();
        },
        onError: () => setFeedback({ type: 'error', text: 'That goal could not be updated. Please try again.' }),
      });
      return;
    }
    const signature = `${name}|${targetAmount}`;
    if (!createAttempt.current || createAttempt.current.signature !== signature) {
      createAttempt.current = { signature, id: createSaveWiseRequestId() };
    }
    createGoal.mutate({
      data: { sessionId, requestId: createAttempt.current.id, name, targetAmount },
    }, {
      onSuccess: async () => {
        resetGoalForm();
        setFeedback({ type: 'success', text: 'Your new goal is ready. Every small step counts.' });
        await invalidate();
      },
      onError: () => setFeedback({ type: 'error', text: 'That goal could not be saved. Retry to keep the same request safe.' }),
    });
  };
  const removeGoal = (goal: SavingsGoal) => {
    setFeedback(null);
    deleteGoal.mutate({ id: goal.id, params: { sessionId } }, {
      onSuccess: async () => {
        setFeedback({ type: 'success', text: `“${goal.name}” was removed.` });
        await invalidate();
      },
      onError: () => setFeedback({ type: 'error', text: 'That goal could not be deleted. Please try again.' }),
    });
  };
  const submitContribution = (amount: number, goal: SavingsGoal) => {
    if (contribute.isPending) return;
    const signature = `${goal.id}|${amount}`;
    if (!contributionAttempt.current || contributionAttempt.current.signature !== signature) {
      contributionAttempt.current = { signature, id: createSaveWiseRequestId() };
    }
    setFeedback(null);
    contribute.mutate({ id: goal.id, data: { sessionId, requestId: contributionAttempt.current.id, amount } }, {
      onSuccess: async (result: SavingsGoalContributionResult) => {
        contributionAttempt.current = null;
        setContributingGoal(null);
        setFeedback({
          type: 'success',
          text: result.bonusAwardedNow
            ? `${result.completedNow ? 'Goal complete' : 'Progress saved'} — you earned 50 bonus points.`
            : result.duplicate
              ? 'That progress was already recorded, so it was not counted twice.'
              : result.completedNow
                ? `Goal complete. ${result.goal.bonusAwarded ? 'Your 50-point completion bonus is already on record.' : 'Your tracked progress is complete.'}`
                : `${money(amount)} of virtual progress added to ${result.goal.name}.`,
        });
        await invalidate();
      },
      onError: () => setFeedback({ type: 'error', text: 'Progress could not be saved. Retry safely; the same request will be reused.' }),
    });
  };
  const pending = createGoal.isPending || updateGoal.isPending || deleteGoal.isPending || contribute.isPending;
  const goalList = goals.data ?? [];
  const summaryData = summary.data;

  return <main className="rw-page">
    <SiteHeader activePage="rewards" statusLabel="YOUR PRIVATE SPACE" />
    <div className="rw-wrap">
      <section className="rw-heading">
        <div>
          <div className="rw-eyebrow"><span /> YOUR LITTLE WINS / REWARDS</div>
          <h1>Look what you <em>kept.</em></h1>
        </div>
        <div className="rw-stamp"><span>MAKE IT</span><strong>COUNT</strong><div className="rw-pixel-row"><i /><i /><i /><i /><i /></div></div>
      </section>
      {summary.isLoading ? <section className="rw-loading" aria-live="polite" data-testid="status-rewards-loading">
        <div className="rw-skeleton rw-wide" /><div className="rw-skeleton" /><div className="rw-skeleton rw-short" />
      </section> : summary.isError ? <section className="rw-error" role="alert" data-testid="status-rewards-error">
        <div><strong>We couldn’t load your rewards yet.</strong><p>Your choices are still here. Let’s try that again.</p></div>
        <button type="button" className="rw-button rw-outline" onClick={() => void summary.refetch()} data-testid="button-retry-rewards"><RefreshCw size={15} /> Retry</button>
      </section> : summaryData && <>
        <section className="rw-hero-grid" aria-label="Your rewards summary">
          <article className="rw-points-card" data-testid="card-points-balance">
            <div className="rw-card-label"><span className="rw-pixel-gem"><Sparkles size={15} /></span> POINTS IN YOUR POCKET</div>
            <div className="rw-points-total" data-testid="text-points-balance">{summaryData.pointsBalance.toLocaleString()}</div>
            <div className="rw-points-bottom"><Trophy size={23} /></div>
            <div className="rw-points-rule"><span>DECISION POINTS <b data-testid="text-decision-points">{summaryData.decisionPoints}</b></span><span>GOAL BONUSES <b data-testid="text-goal-bonus-points">{summaryData.goalBonusPoints}</b></span></div>
          </article>
          <article className="rw-streak-card" data-testid="card-streak">
            <div className="rw-card-label"><Flame size={16} /> YOUR RHYTHM</div>
            <div className="rw-streak-num" data-testid="text-current-streak">{summaryData.currentStreak}<small> days</small></div>
            <div className="rw-streak-footer"><span className="rw-streak-mark"><Flame size={15} /></span><span>PERSONAL BEST</span><b data-testid="text-longest-streak">{summaryData.longestStreak} days</b></div>
          </article>
          <article className="rw-saved-card" data-testid="card-real-savings">
            <div className="rw-card-label"><Heart size={16} /> ACTUAL PURCHASES SKIPPED</div>
            <div className="rw-saved-total" data-testid="text-total-saved">{money(summaryData.totalSaved)}</div>
            <div className="rw-saved-footer"><span data-testid="text-skipped-purchases">{summaryData.skippedPurchases} {summaryData.skippedPurchases === 1 ? 'purchase' : 'purchases'} skipped</span><span>{summaryData.savedToday ? 'TODAY: SAVED' : 'TODAY: OPEN'}</span></div>
          </article>
        </section>
      </>}
      {feedback && <div className={`rw-feedback ${feedback.type}`} role={feedback.type === 'error' ? 'alert' : 'status'} data-testid={`status-goal-${feedback.type}`}>
        {feedback.type === 'success' ? <Check size={17} /> : <X size={17} />}{feedback.text}
      </div>}
      <section className="rw-goals-section">
        <div className="rw-section-heading">
          <div><div className="rw-eyebrow"><span /> THE THINGS YOU’RE SAVING FOR</div><h2>Your goals, your pace.</h2></div>
          <button className="rw-button rw-primary" type="button" onClick={beginCreate} data-testid="button-add-goal"><Plus size={16} /> New goal</button>
        </div>
        {formOpen && <Form {...goalForm}>
          <form className="rw-goal-form" onSubmit={goalForm.handleSubmit(submitGoal)} data-testid="form-goal">
          <div className="rw-form-head"><div><span className="rw-form-tag">{editing ? 'TUNE YOUR GOAL' : 'A NEW THING TO LOOK FORWARD TO'}</span><h3>{editing ? 'A little update.' : 'What are you working toward?'}</h3></div><button type="button" className="rw-icon-button" onClick={resetGoalForm} aria-label="Close goal form" data-testid="button-close-goal-form"><X size={18} /></button></div>
          <div className="rw-form-fields">
            <FormField control={goalForm.control} name="name" render={({ field }) => <FormItem>
              <FormLabel>Goal name</FormLabel>
              <FormControl><input {...field} maxLength={60} placeholder="A camera, a trip, a soft landing…" data-testid="input-goal-name" /></FormControl>
              <FormMessage className="rw-field-error" />
            </FormItem>} />
            <FormField control={goalForm.control} name="targetAmount" render={({ field }) => <FormItem>
              <FormLabel>Target amount</FormLabel>
              <span className="rw-input-wrap"><FormControl><input {...field} type="number" min="0.001" step="0.001" placeholder="0.000" data-testid="input-goal-target" /></FormControl><small>KWD</small></span>
              <FormMessage className="rw-field-error" />
            </FormItem>} />
          </div>
          <div className="rw-form-actions"><button className="rw-button rw-outline" type="button" onClick={resetGoalForm} data-testid="button-cancel-goal">Cancel</button><button className="rw-button rw-primary" type="submit" disabled={pending || !goalForm.formState.isValid} data-testid="button-save-goal">{pending ? <LoaderCircle size={15} className="rw-spin" /> : <Check size={15} />}{editing ? 'Save changes' : 'Create goal'}</button></div>
          </form>
        </Form>}
        {goals.isLoading ? <div className="rw-goal-loading" data-testid="status-goals-loading"><div className="rw-skeleton" /><div className="rw-skeleton rw-wide" /><div className="rw-skeleton rw-short" /></div>
          : goals.isError ? <div className="rw-goals-error" role="alert" data-testid="status-goals-error"><span>Your goals didn’t load.</span><button className="rw-text-button" type="button" onClick={() => void goals.refetch()} data-testid="button-retry-goals">Try again <ArrowRight size={14} /></button></div>
            : goalList.length === 0 ? <div className="rw-empty" data-testid="status-goals-empty"><div className="rw-empty-icon"><Target size={22} /></div><div><span>YOUR FIRST MILESTONE IS WAITING</span><h3>Give a future-you something to look forward to.</h3></div><button className="rw-button rw-primary" type="button" onClick={beginCreate} data-testid="button-create-first-goal"><Plus size={15} /> Set a goal</button></div>
              : <div className="rw-goal-list" data-testid="list-savings-goals">{goalList.map((goal, index) => {
                const progress = Math.max(0, Math.min(goal.percentComplete, 100));
                const contributionOpen = contributingGoal === goal.id;
                return <article className={`rw-goal-card ${goal.isComplete ? 'complete' : ''}`} key={goal.id} data-testid={`card-goal-${goal.id}`}>
                  <div className={`rw-goal-art art-${index % 3}`}><span className="rw-goal-art-icon">{goal.isComplete ? <BadgeCheck size={23} /> : <Goal size={23} />}</span><span className="rw-goal-number">GOAL {String(index + 1).padStart(2, '0')}</span><div className="rw-art-blocks"><i /><i /><i /><i /><i /><i /></div></div>
                  <div className="rw-goal-content">
                  <div className="rw-goal-top"><div><span className="rw-goal-kicker">{goal.isComplete ? 'MILESTONE REACHED' : 'SAVING TOWARD'}</span><h3 data-testid={`text-goal-name-${goal.id}`}>{goal.name}</h3></div><div className="rw-goal-actions"><button type="button" className="rw-icon-button" aria-label={`Edit ${goal.name}`} onClick={() => beginEdit(goal)} data-testid={`button-edit-goal-${goal.id}`}><Pencil size={15} /></button><button type="button" className="rw-icon-button danger" aria-label={`Delete ${goal.name}`} onClick={() => setGoalToDelete(goal)} disabled={pending} data-testid={`button-delete-goal-${goal.id}`}><Trash2 size={15} /></button></div></div>
                    <div className="rw-goal-amounts"><strong data-testid={`text-goal-progress-${goal.id}`}>{money(goal.currentAmount)}</strong><span>of {money(goal.targetAmount)}</span><b>{progress.toFixed(0)}%</b></div>
                    <div className="rw-progress-track" role="progressbar" aria-label={`${goal.name} progress`} aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} data-testid={`progress-goal-${goal.id}`}><span style={{ width: `${progress}%` }} /></div>
                    <div className="rw-goal-bottom"><span>{goal.isComplete ? 'You made it. Take that in.' : `${money(goal.remainingAmount)} to go`}</span><span>{goal.bonusAwarded ? '50 POINT BONUS AWARDED' : '50 POINTS AT COMPLETION'}</span></div>
                    {contributionOpen && !goal.isComplete && <ContributionForm goal={goal} pending={contribute.isPending} onSubmit={submitContribution} onClose={() => setContributingGoal(null)} />}
                    {!goal.isComplete && !contributionOpen && <button type="button" className="rw-track-button" onClick={() => { setFeedback(null); setContributingGoal(goal.id); }} data-testid={`button-track-goal-${goal.id}`}><Plus size={14} /> Track progress <ArrowRight size={14} /></button>}
                    {goal.isComplete && <div className="rw-complete-note"><Trophy size={15} /> Completed {goal.completedAt ? new Date(goal.completedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'just now'}</div>}
                  </div>
                </article>;
              })}</div>}
      </section>
      <section className="rw-rules">
        <div className="rw-rules-title"><Sparkles size={17} /><div><span>THE LITTLE-WINS RULEBOOK</span><h2>Clear, kind, and no surprises.</h2></div></div>
        <div className="rw-rules-grid">
          <div><b>01</b><strong>A skip earns 10 points.</strong></div>
          <div><b>02</b><strong>Skip after waiting: 15 total.</strong></div>
          <div><b>03</b><strong>Finish a goal: 50 once.</strong></div>
          <div><b>04</b><strong>One streak day, max.</strong></div>
        </div>
        <div className="rw-reality-note"><span><Heart size={15} /> Keep the numbers in their lane</span><p><strong>Actual saved</strong> means the listed price of a skipped purchase. Future Fund figures are an illustrative simulation; goal amounts are virtual progress tracking. Neither moves money.</p></div>
      </section>
      <footer className="rw-footer"><span><LockKeyhole size={13} /> This anonymous session is local to this browser and device.</span><Link href="/" data-testid="link-back-to-decisions">Back to decision studio <ArrowRight size={14} /></Link></footer>
    </div>
    <AlertDialog open={Boolean(goalToDelete)} onOpenChange={(open) => { if (!open && !deleteGoal.isPending) setGoalToDelete(null); }}>
      <AlertDialogContent className="rw-delete-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this goal?</AlertDialogTitle>
          <AlertDialogDescription>{goalToDelete ? `Delete “${goalToDelete.name}”? This removes its tracked progress.` : 'This removes its tracked progress.'}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteGoal.isPending} data-testid="button-cancel-delete-goal">Keep goal</AlertDialogCancel>
          <AlertDialogAction
            className="rw-confirm-delete"
            disabled={deleteGoal.isPending}
            onClick={() => { if (goalToDelete) removeGoal(goalToDelete); setGoalToDelete(null); }}
            data-testid="button-confirm-delete-goal"
          >{deleteGoal.isPending ? 'Deleting…' : 'Delete goal'}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </main>;
}
