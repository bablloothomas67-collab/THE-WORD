import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatClock } from './formatClock';
import styles from './audio.module.css';

interface Props {
  src: string;
  /** Duration from the catalogue, shown before the file has loaded. */
  durationSecs: number;
  /** Accessible name, e.g. "Listen to John 3:16". */
  label: string;
  /** Short line under the controls, e.g. "AI voice · KJV". */
  caption?: string;
  tone?: 'light' | 'dark';
}

/**
 * Small accessible audio player. The file is fetched only when the visitor presses
 * play (preload="none"), so pages stay light on mobile data.
 */
export function AudioPlayer({ src, durationSecs, label, caption, tone = 'light' }: Props) {
  const { t } = useTranslation();
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(durationSecs);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = audio.current;
    return () => el?.pause();
  }, [src]);

  function toggle() {
    const el = audio.current;
    if (!el) return;
    if (el.paused) {
      el.play().catch(() => setFailed(true));
    } else {
      el.pause();
    }
  }

  function seek(value: number) {
    const el = audio.current;
    if (el) el.currentTime = value;
    setCurrent(value);
  }

  return (
    <div className={`${styles.player} ${tone === 'dark' ? styles.dark : ''}`}>
      <audio
        ref={audio}
        src={src}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setCurrent(0);
        }}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => Number.isFinite(e.currentTarget.duration) && setDuration(e.currentTarget.duration)}
        onError={() => setFailed(true)}
      />
      <div className={styles.row}>
        <button
          type="button"
          className={styles.play}
          onClick={toggle}
          aria-label={`${playing ? t('audio.pause') : t('audio.play')}: ${label}`}
          disabled={failed}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            {playing ? (
              <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor" />
            ) : (
              <path d="M8 5.5v13l11-6.5z" fill="currentColor" />
            )}
          </svg>
          <span>{playing ? t('audio.pause') : current > 0 ? t('audio.resume') : t('audio.listen')}</span>
        </button>
        <input
          type="range"
          className={styles.seek}
          min={0}
          max={Math.max(duration, 0.1)}
          step={0.1}
          value={Math.min(current, duration)}
          onChange={(e) => seek(Number(e.target.value))}
          aria-label={t('audio.position')}
          aria-valuetext={`${formatClock(current)} / ${formatClock(duration)}`}
          disabled={failed}
        />
        <span className={styles.time} aria-hidden="true">
          {formatClock(current)} / {formatClock(duration)}
        </span>
      </div>
      {failed ? (
        <p className={styles.caption} role="status">
          {t('audio.error')}
        </p>
      ) : (
        caption && <p className={styles.caption}>{caption}</p>
      )}
    </div>
  );
}
