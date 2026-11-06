import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase as defaultClient } from '../../services/supabase/client';
import { isEnabledLanguage, type LanguageCode } from '../../config/languages';

export interface Profile {
  id: string;
  displayName: string;
  preferredLanguage: LanguageCode;
  timezone: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProfilePatch {
  displayName?: string;
  preferredLanguage?: LanguageCode;
}

const COLUMNS = 'id, display_name, preferred_language, timezone, created_at, updated_at';
export const MAX_DISPLAY_NAME = 80;

/** Validates a database row before the app trusts it. */
export function parseProfile(row: unknown): Profile {
  if (typeof row !== 'object' || row === null) throw new Error('Profile row missing');
  const r = row as Record<string, unknown>;
  const str = (k: string) => {
    if (typeof r[k] !== 'string') throw new Error(`Profile field ${k} is not a string`);
    return r[k] as string;
  };
  const lang = str('preferred_language');
  return {
    id: str('id'),
    displayName: str('display_name'),
    // A language disabled after the user chose it falls back to English.
    preferredLanguage: isEnabledLanguage(lang) ? lang : 'en',
    timezone: str('timezone'),
    createdAt: str('created_at'),
    updatedAt: str('updated_at'),
  };
}

export function createProfileService(client: SupabaseClient | null = defaultClient) {
  return {
    async getOwnProfile(userId: string): Promise<Profile | null> {
      if (!client) return null;
      const { data, error } = await client.from('profiles').select(COLUMNS).eq('id', userId).maybeSingle();
      if (error) throw new Error(`Could not load profile: ${error.message}`);
      return data ? parseProfile(data) : null;
    },

    async updateOwnProfile(userId: string, patch: ProfilePatch): Promise<Profile> {
      if (!client) throw new Error('Supabase is not configured');
      const update: Record<string, string> = {};
      if (patch.displayName !== undefined) {
        const name = patch.displayName.trim();
        if (!name || name.length > MAX_DISPLAY_NAME) throw new Error('Invalid display name');
        update.display_name = name;
      }
      if (patch.preferredLanguage !== undefined) {
        if (!isEnabledLanguage(patch.preferredLanguage)) throw new Error('Language not enabled');
        update.preferred_language = patch.preferredLanguage;
      }
      const { data, error } = await client.from('profiles').update(update).eq('id', userId).select(COLUMNS).single();
      if (error) throw new Error(`Could not update profile: ${error.message}`);
      return parseProfile(data);
    },
  };
}

export type ProfileService = ReturnType<typeof createProfileService>;
export const profileService = createProfileService();
