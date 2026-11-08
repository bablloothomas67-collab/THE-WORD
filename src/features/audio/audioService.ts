import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase as defaultClient } from '../../services/supabase/client';
import type { LanguageCode } from '../../config/languages';

export const AUDIO_BUCKET = 'scripture-audio';

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
  };
}

export const audioService = createAudioService();
