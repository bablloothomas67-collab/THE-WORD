import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase as defaultClient } from '../../services/supabase/client';
import type { LanguageCode } from '../../config/languages';

export const AUDIO_BUCKET = 'scripture-audio';

export const PREMIUM_AUDIO_BUCKET = 'premium-audio';

export type AudioKind = 'daily_verse' | 'devotional_scripture' | 'devotional_prayer';

export interface AudioTrack {
  url: string;
  versionCode: string | null;
  durationSecs: number;
}

type Row = Record<string, unknown>;

/** Catalogue key for one Scripture passage inside a devotional, e.g. "come-and-rest:MAT.11.28-30". */
export function scriptureAudioKey(
  slug: string,
  ref: { book: string; chapter: number; verseStart: number; verseEnd: number },
): string {
  return `${slug}:${ref.book}.${ref.chapter}.${ref.verseStart}-${ref.verseEnd}`;
}

/**
 * Picks the recording for the version the reader is looking at; otherwise the
 * first recording in that language (the player then names its version).
 */
export function chooseTrack(rows: Row[], preferredVersion: string | null): Row | undefined {
  return rows.find((r) => r.version_code === preferredVersion) ?? rows[0];
}

export interface PlanChapterAudio {
  available: boolean;
  url: string | null;
  durationSecs: number;
  versionCode: string | null;
  languageCode: string | null;
}

/** The reader's own language first; English is the fallback when no recording exists in it. */
export function choosePlanRow(rows: Row[], lang: string): Row | undefined {
  return rows.find((r) => r.language_code === lang) ?? rows.find((r) => r.language_code === 'en');
}

/**
 * Credit lines for recorded (not AI-generated) audio, keyed by Bible version code.
 * The text is in the locale files under `plans.audioCredit`; a licence link is shown
 * where the recording's licence requires one.
 */
export const RECORDING_CREDITS: Readonly<Record<string, { licenceUrl?: string }>> = {
  web: {},
  malirv: { licenceUrl: 'https://creativecommons.org/licenses/by-sa/4.0/' },
};

export function createAudioService(client: SupabaseClient | null = defaultClient) {
  return {
    async getTrack(
      kind: AudioKind,
      contentKey: string,
      lang: LanguageCode,
      preferredVersion: string | null = null,
    ): Promise<AudioTrack | null> {
      if (!client) return null;
      const { data, error } = await client
        .from('audio_tracks')
        .select('storage_path, version_code, duration_secs')
        .eq('kind', kind)
        .eq('content_key', contentKey)
        .eq('language_code', lang)
        .order('version_code');
      if (error) throw new Error(`Load audio: ${error.message}`);
      const row = chooseTrack((data ?? []) as Row[], preferredVersion);
      if (!row || typeof row.storage_path !== 'string') return null;
      const { data: pub } = client.storage.from(AUDIO_BUCKET).getPublicUrl(row.storage_path);
      return {
        url: pub.publicUrl,
        versionCode: typeof row.version_code === 'string' ? row.version_code : null,
        durationSecs: Number(row.duration_secs),
      };
    },

    /**
     * Recorded audio for one reading-plan chapter, in the reader's language when a
     * recording exists and otherwise in English. `available` says a recording exists;
     * `url` is a short-lived private link, present only when this reader may listen
     * (the private bucket refuses everyone else). `versionCode` names the Bible version
     * that was read, so the player can show the right credit line.
     */
    async getPlanChapter(bookCode: string, chapter: number, lang: LanguageCode = 'en'): Promise<PlanChapterAudio> {
      const none: PlanChapterAudio = { available: false, url: null, durationSecs: 0, versionCode: null, languageCode: null };
      if (!client) return none;
      const { data, error } = await client
        .from('audio_tracks')
        .select('storage_path, duration_secs, version_code, language_code')
        .eq('kind', 'plan_chapter')
        .eq('content_key', `${bookCode}.${chapter}`)
        .in('language_code', lang === 'en' ? ['en'] : [lang, 'en']);
      if (error) throw new Error(`Load plan audio: ${error.message}`);
      const row = choosePlanRow((data ?? []) as Row[], lang);
      if (!row || typeof row.storage_path !== 'string') return none;
      const signed = await client.storage.from(PREMIUM_AUDIO_BUCKET).createSignedUrl(row.storage_path, 3600);
      return {
        available: true,
        url: signed.data?.signedUrl ?? null,
        durationSecs: Number(row.duration_secs),
        versionCode: typeof row.version_code === 'string' ? row.version_code : null,
        languageCode: typeof row.language_code === 'string' ? row.language_code : null,
      };
    },
  };
}

export const audioService = createAudioService();
