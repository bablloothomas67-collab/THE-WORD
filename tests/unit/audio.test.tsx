import { beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { SupabaseClient } from '@supabase/supabase-js';
import i18n, { initI18n } from '../../src/app/i18n';
import { AudioPlayer } from '../../src/features/audio/AudioPlayer';
import { formatClock } from '../../src/features/audio/formatClock';
import { chooseTrack, createAudioService, scriptureAudioKey } from '../../src/features/audio/audioService';

describe('audio helpers', () => {
  it('formats durations as m:ss and guards bad input', () => {
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(9.9)).toBe('0:09');
    expect(formatClock(75.4)).toBe('1:15');
    expect(formatClock(Number.NaN)).toBe('0:00');
    expect(formatClock(-3)).toBe('0:00');
  });

  it('prefers the recording of the version on screen, else the first in that language', () => {
    const rows = [{ version_code: 'kjv' }, { version_code: 'web' }];
    expect(chooseTrack(rows, 'web')?.version_code).toBe('web');
    expect(chooseTrack(rows, 'other')?.version_code).toBe('kjv');
    expect(chooseTrack([], 'kjv')).toBeUndefined();
  });

  it('builds stable keys for devotional passages', () => {
    expect(scriptureAudioKey('come-and-rest', { book: 'MAT', chapter: 11, verseStart: 28, verseEnd: 30 })).toBe(
      'come-and-rest:MAT.11.28-30',
    );
  });
});

describe('audio service', () => {
  function fakeClient(rows: unknown[], error: { message: string } | null = null) {
    const calls: Record<string, unknown> = {};
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn((col: string, val: unknown) => {
        calls[col] = val;
        return query;
      }),
      order: vi.fn(async () => ({ data: rows, error })),
    };
    const client = {
      from: vi.fn(() => query),
      storage: {
        from: vi.fn(() => ({
          getPublicUrl: (path: string) => ({ data: { publicUrl: `https://cdn.test/${path}` } }),
        })),
      },
    } as unknown as SupabaseClient;
    return { client, calls };
  }

  it('returns a public URL for the matching recording', async () => {
    const { client, calls } = fakeClient([
      { storage_path: 'daily/kjv/013.mp3', version_code: 'kjv', duration_secs: '21.5' },
    ]);
    const track = await createAudioService(client).getTrack('daily_verse', '13', 'en', 'kjv');
    expect(calls).toEqual({ kind: 'daily_verse', content_key: '13', language_code: 'en' });
    expect(track).toEqual({ url: 'https://cdn.test/daily/kjv/013.mp3', versionCode: 'kjv', durationSecs: 21.5 });
  });

  it('returns null when nothing is recorded, and throws on API errors', async () => {
    expect(await createAudioService(fakeClient([]).client).getTrack('daily_verse', '1', 'ml')).toBeNull();
    await expect(
      createAudioService(fakeClient([], { message: 'boom' }).client).getTrack('daily_verse', '1', 'ml'),
    ).rejects.toThrow('Load audio: boom');
    expect(await createAudioService(null).getTrack('daily_verse', '1', 'ml')).toBeNull();
  });
});

describe('AudioPlayer', () => {
  beforeAll(async () => {
    initI18n('en');
    await i18n.changeLanguage('en');
  });

  it('renders an accessible play control, duration and caption without loading the file', () => {
    const { container } = render(
      <AudioPlayer src="https://cdn.test/a.mp3" durationSecs={65} label="John 3:16" caption="AI voice · KJV" />,
    );
    expect(screen.getByRole('button', { name: 'Play: John 3:16' })).toHaveTextContent('Listen');
    expect(screen.getByRole('slider', { name: 'Playback position' })).toHaveAttribute('aria-valuetext', '0:00 / 1:05');
    expect(screen.getByText('AI voice · KJV')).toBeInTheDocument();
    expect(container.querySelector('audio')).toHaveAttribute('preload', 'none');
  });

  it('plays and pauses through the audio element', async () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function (this: HTMLMediaElement) {
      this.dispatchEvent(new Event('play'));
      return Promise.resolve();
    });
    vi.spyOn(HTMLMediaElement.prototype, 'paused', 'get').mockReturnValueOnce(true).mockReturnValue(false);
    const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(function (this: HTMLMediaElement) {
      this.dispatchEvent(new Event('pause'));
    });
    render(<AudioPlayer src="https://cdn.test/a.mp3" durationSecs={10} label="Prayer" />);
    await userEvent.click(screen.getByRole('button', { name: 'Play: Prayer' }));
    expect(play).toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Pause: Prayer' }));
    expect(pause).toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it('shows a message instead of failing silently when the file cannot play', async () => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockRejectedValue(new Error('network'));
    vi.spyOn(HTMLMediaElement.prototype, 'paused', 'get').mockReturnValue(true);
    render(<AudioPlayer src="https://cdn.test/a.mp3" durationSecs={10} label="Prayer" />);
    await userEvent.click(screen.getByRole('button', { name: 'Play: Prayer' }));
    expect(await screen.findByRole('status')).toHaveTextContent("The audio couldn't be played");
    vi.restoreAllMocks();
  });
});
