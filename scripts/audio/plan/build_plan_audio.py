#!/usr/bin/env python3
"""Prepare recorded (not AI) chapter audio for a reading plan.

Sources for the Gospel of John (see docs/AUDIO.md, "Recorded plan audio"):
  en / web     LibriVox "Book of John WEB" (archive.org item book_john), public domain.
               The LibriVox spoken intro and closing line are cut using word timings from
               a speech-to-text pass aligned against the site's WEB text (align.py).
  ml / malirv  Malayalam Indian Revised Version audio, (c) 2022 Davar Partners International
               and Bridge Connectivity Solutions, CC BY-SA 4.0 (tag embedded in each file).
               Only leading/trailing silence is cut.
Both are loudness-normalised to -16 LUFS and re-encoded as 80 kbit/s mono MP3.
Writes OUT/plan/<version>/jhn/NN.mp3 and OUT/manifest.json for upload_audio.py.

Usage: build_plan_audio.py en|ml OUT
"""
import hashlib, json, re, subprocess, sys

BOOK, CHAPTERS = 'JHN', 21
TEXT = json.load(open('john_text.json', encoding='utf-8'))
SRC = {
    'en': dict(version='web', voice='LibriVox volunteer recording, WEB 2006 edition (public domain)',
               file=lambda c: f'raw/john_{c:02d}_web.mp3',
               tags={'album': 'World English Bible - John (LibriVox recording, public domain)',
                     'comment': 'LibriVox public-domain recording; intro and outro trimmed and volume levelled by THE WORD (vachanambible.net).'}),
    'ml': dict(version='malirv', voice='Davar Partners International, Malayalam IRV audio 2022 (CC BY-SA 4.0)',
               file=lambda c: f'ml_raw/jhn_{c}.mp3',
               tags={'album': 'Malayalam Indian Revised Version (IRV)',
                     'copyright': '2022 CC BY-SA 4.0, Davar Partners International, Bridge Connectivity Solutions',
                     'comment': 'Adapted by THE WORD (vachanambible.net): silence trimmed and volume levelled. This adapted file is also licensed CC BY-SA 4.0 https://creativecommons.org/licenses/by-sa/4.0/'}),
}

def run(args):
    return subprocess.run(args, capture_output=True, text=True)

def duration(path):
    return float(run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path]).stdout)

def silences(path, noise='-40dB', d='0.2'):
    err = run(['ffmpeg', '-i', path, '-af', f'silencedetect=n={noise}:d={d}', '-f', 'null', '-']).stderr
    starts = [float(x) for x in re.findall(r'silence_start: ([\d.]+)', err)]
    ends = [float(x) for x in re.findall(r'silence_end: ([\d.]+)', err)]
    return starts, ends

def window(lang, ch, path):
    total = duration(path)
    if lang == 'en':
        from align import analyse
        r = analyse(ch)
        ok = r['match'] >= 0.95 and r['lead_ref_missing'] == 0 and r['tail_ref_missing'] == 0
        return max(0, r['start'] - 0.35), min(total, r['end'] + 0.7), ok, f"text match {r['match']:.3f}"
    starts, ends = silences(path)
    lead = ends[0] if starts and starts[0] < 0.05 and ends else 0.0
    tail = starts[-1] if starts and (len(ends) < len(starts) or ends[-1] > total - 0.05) else total
    ok = lead < 6 and total - tail < 8
    return max(0, lead - 0.35), min(total, tail + 0.9), ok, f'lead {lead:.2f}s tail {total - tail:.2f}s'

def main():
    lang, out = sys.argv[1], sys.argv[2]
    src = SRC[lang]; manifest = []
    for ch in range(1, CHAPTERS + 1):
        path = src['file'](ch)
        s, e, ok, note = window(lang, ch, path)
        rel = f"plan/{src['version']}/jhn/{ch:02d}.mp3"
        dst = f'{out}/{rel}'
        subprocess.run(['mkdir', '-p', dst.rsplit('/', 1)[0]], check=True)
        d = e - s
        af = (f'atrim={s:.3f}:{e:.3f},asetpts=PTS-STARTPTS,highpass=f=70,loudnorm=I=-16:TP=-1.5:LRA=11,'
              f'afade=t=in:d=0.12,afade=t=out:st={d - 0.35:.2f}:d=0.35')
        meta = []
        for k, v in {'title': f'John {ch}', **src['tags']}.items():
            meta += ['-metadata', f'{k}={v}']
        p = run(['ffmpeg', '-v', 'error', '-y', '-i', path, '-map_metadata', '-1', '-af', af,
                 '-ac', '1', '-ar', '44100', '-b:a', '80k', *meta, dst])
        if p.returncode: raise SystemExit(p.stderr)
        text = '\n'.join(r['text'] for r in TEXT[src['version']] if r['chapter'] == ch)
        manifest.append(dict(kind='plan_chapter', content_key=f'{BOOK}.{ch}', language_code=lang,
                             version_code=src['version'], storage_path=rel, bucket='premium-audio',
                             duration_secs=round(duration(dst), 2),
                             text_sha256=hashlib.sha256(text.encode('utf-8')).hexdigest(),
                             voice_label=src['voice'], check='ok' if ok else 'review', note=note))
        print(ch, f'{s:.2f}-{e:.2f}', manifest[-1]['duration_secs'], manifest[-1]['check'], note, flush=True)
    json.dump(manifest, open(f'{out}/manifest_{lang}.json', 'w'), ensure_ascii=False, indent=1)
    print('total minutes', round(sum(m['duration_secs'] for m in manifest) / 60, 1),
          'flagged', [m['content_key'] for m in manifest if m['check'] != 'ok'])

if __name__ == '__main__':
    main()
