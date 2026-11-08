import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase as defaultClient } from '../../services/supabase/client';
import type { LanguageCode } from '../../config/languages';

export interface PlanDay {
  dayNumber: number;
  bookCode: string;
  chapterStart: number;
  chapterEnd: number;
}

export interface ReadingPlan {
  id: string;
  slug: string;
  durationDays: number;
  title: string;
  description: string;
}

export interface ReadingPlanDetail extends ReadingPlan {
  days: PlanDay[];
}

export interface MyPlan {
  plan: ReadingPlan;
  startedAt: string;
  completed: Set<number>;
}

type Row = Record<string, unknown>;

/** Picks the localisation for the UI language, falling back to English. */
function localise(rows: Row[], lang: LanguageCode): { title: string; description: string } | null {
  const pick = rows.find((r) => r.language_code === lang) ?? rows.find((r) => r.language_code === 'en');
  return pick ? { title: String(pick.title), description: String(pick.description) } : null;
}

function parsePlan(r: Row, lang: LanguageCode): ReadingPlan | null {
  const text = localise((r.reading_plan_localisations as Row[] | null) ?? [], lang);
  if (!text || typeof r.id !== 'string') return null;
  return { id: r.id, slug: String(r.slug), durationDays: Number(r.duration_days), ...text };
}

const PLAN_COLUMNS = 'id, slug, duration_days, sort_order, reading_plan_localisations(language_code, title, description)';

export function createPlansService(client: SupabaseClient | null = defaultClient) {
  function db(): SupabaseClient {
    if (!client) throw new Error('Supabase is not configured');
    return client;
  }
  function check(error: { message: string } | null, what: string) {
    if (error) throw new Error(`${what}: ${error.message}`);
  }

  return {
    async listPlans(lang: LanguageCode): Promise<ReadingPlan[]> {
      const { data, error } = await db().from('reading_plans').select(PLAN_COLUMNS).order('sort_order');
      check(error, 'Load plans');
      return ((data ?? []) as Row[]).flatMap((r) => parsePlan(r, lang) ?? []);
    },

    async getPlan(slug: string, lang: LanguageCode): Promise<ReadingPlanDetail | null> {
      const { data, error } = await db()
        .from('reading_plans')
        .select(`${PLAN_COLUMNS}, reading_plan_days!reading_plan_days_plan_id_fkey(day_number, book_code, chapter_start, chapter_end)`)
        .eq('slug', slug)
        .maybeSingle();
      check(error, 'Load plan');
      if (!data) return null;
      const plan = parsePlan(data as Row, lang);
      if (!plan) return null;
      const days = (((data as Row).reading_plan_days as Row[] | null) ?? [])
        .map((d) => ({
          dayNumber: Number(d.day_number),
          bookCode: String(d.book_code),
          chapterStart: Number(d.chapter_start),
          chapterEnd: Number(d.chapter_end),
        }))
        .sort((a, b) => a.dayNumber - b.dayNumber);
      return { ...plan, days };
    },

    async listMyPlans(lang: LanguageCode): Promise<MyPlan[]> {
      const [enrolments, progress] = await Promise.all([
        db().from('user_reading_plans').select(`started_at, reading_plans(${PLAN_COLUMNS})`).order('started_at', { ascending: false }),
        db().from('user_reading_progress').select('plan_id, day_number'),
      ]);
      check(enrolments.error, 'Load my plans');
      check(progress.error, 'Load progress');
      const done = new Map<string, Set<number>>();
      for (const r of (progress.data ?? []) as Row[]) {
        const id = String(r.plan_id);
        if (!done.has(id)) done.set(id, new Set());
        done.get(id)!.add(Number(r.day_number));
      }
      return ((enrolments.data ?? []) as Row[]).flatMap((r) => {
        const plan = r.reading_plans ? parsePlan(r.reading_plans as Row, lang) : null;
        return plan ? [{ plan, startedAt: String(r.started_at), completed: done.get(plan.id) ?? new Set<number>() }] : [];
      });
    },

    async getProgress(planId: string): Promise<{ enrolled: boolean; completed: Set<number> }> {
      const [enrolment, progress] = await Promise.all([
        db().from('user_reading_plans').select('plan_id').eq('plan_id', planId).maybeSingle(),
        db().from('user_reading_progress').select('day_number').eq('plan_id', planId),
      ]);
      check(enrolment.error, 'Load enrolment');
      check(progress.error, 'Load progress');
      return {
        enrolled: Boolean(enrolment.data),
        completed: new Set(((progress.data ?? []) as Row[]).map((r) => Number(r.day_number))),
      };
    },

    async startPlan(planId: string): Promise<void> {
      const { error } = await db()
        .from('user_reading_plans')
        .upsert({ plan_id: planId }, { onConflict: 'user_id,plan_id', ignoreDuplicates: true });
      check(error, 'Start plan');
    },

    /** Leaves the plan and deletes its progress (asked for confirmation in the UI). */
    async leavePlan(planId: string): Promise<void> {
      const p = await db().from('user_reading_progress').delete().eq('plan_id', planId);
      check(p.error, 'Delete progress');
      const e = await db().from('user_reading_plans').delete().eq('plan_id', planId);
      check(e.error, 'Leave plan');
    },

    async setDayDone(planId: string, dayNumber: number, done: boolean): Promise<void> {
      if (done) {
        const { error } = await db()
          .from('user_reading_progress')
          .upsert({ plan_id: planId, day_number: dayNumber }, { onConflict: 'user_id,plan_id,day_number', ignoreDuplicates: true });
        check(error, 'Mark day');
      } else {
        const { error } = await db().from('user_reading_progress').delete().match({ plan_id: planId, day_number: dayNumber });
        check(error, 'Unmark day');
      }
    },
  };
}

/** First day not yet completed, or null when the plan is finished. */
export function nextDay(durationDays: number, completed: Set<number>): number | null {
  for (let d = 1; d <= durationDays; d++) if (!completed.has(d)) return d;
  return null;
}

export const plansService = createPlansService();
