#!/usr/bin/env python3
"""
Record Scripture / prayer audio with ElevenLabs, exactly from the stored text.

  python3 scripts/audio/generate_audio.py daily  --out audio-out
  python3 scripts/audio/generate_audio.py devotional --slug loved-first --out audio-out

Text comes straight from the database (Bible verses) or content/devotionals/*.json
(prayers) — never retyped. Each clip gets a manifest entry with the SHA-256 of the
exact text spoken and its measured duration. Existing clips are skipped, so the
script can be re-run after an interruption without paying twice.

Env: ELEVENLABS_API_KEY (never committed), SUPABASE_URL, SUPABASE_ANON_KEY.
"""
import argparse, hashlib, json, os, subprocess, sys, time, urllib.parse
from concurrent.futures import ThreadPoolExecutor
import requests

VOICE_ID = 'Gp0oOn0KXQwkVSSTGa3v'          # "THE WORD – Ammachi" (designed voice, owner-approved 8 Nov 2026)
VOICE_LABEL = 'THE WORD – Ammachi (ElevenLabs AI voice)'
MODEL_ID = 'eleven_v4'
DELIVERY_TAG = '[softly] '                  # how it is read; not part of the hashed text
AUDIO_VERSIONS = {'en': 'kjv', 'ml': 'mal1910'}
# Speaking-rate sanity bounds (characters per second) to catch truncated or garbled clips.
RATE_BOUNDS = {'en': (6, 25), 'ml': (5, 25)}


def rest(path):
    url, key = os.environ['SUPABASE_URL'], os.environ['SUPABASE_ANON_KEY']
    r = requests.get(f'{url}/rest/v1/{path}', headers={'apikey': key, 'Authorization': f'Bearer {key}'}, timeout=60)
    r.raise_for_status()
    return r.json()


def passage_text(version_id, book, chapter, start, end):
    rows = rest(f'bible_verses?select=verse,text&version_id=eq.{version_id}&book_code=eq.{book}'
                f'&chapter=eq.{chapter}&verse=gte.{start}&verse=lte.{end}&order=verse')
    if [r['verse'] for r in rows] != list(range(start, end + 1)):
        raise SystemExit(f'Missing verses for {book} {chapter}:{start}-{end} — refusing to record a partial passage')
    return ' '.join(r['text'] for r in rows)


def daily_jobs():
    versions = {v['code']: v['id'] for v in rest('bible_versions?select=id,code')}
    refs = rest('daily_verse_refs?select=position,book_code,chapter,verse_start,verse_end&order=position')
    jobs = []
    for ref in refs:
        end = ref['verse_end'] or ref['verse_start']
        for lang, code in AUDIO_VERSIONS.items():
            jobs.append({
                'kind': 'daily_verse', 'content_key': str(ref['position']), 'language_code': lang,
                'version_code': code,
                'storage_path': f"daily/{code}/{ref['position']:03d}.mp3",
                'text': passage_text(versions[code], ref['book_code'], ref['chapter'], ref['verse_start'], end),
            })
    return jobs


def devotional_jobs(slug):
    versions = {v['code']: v['id'] for v in rest('bible_versions?select=id,code')}
    items = []
    for f in sorted(os.listdir('content/devotionals')):
        items += json.load(open(os.path.join('content/devotionals', f), encoding='utf-8'))
    dev = next((d for d in items if d['slug'] == slug), None)
    if not dev:
        raise SystemExit(f'No devotional {slug}')
    jobs = []
    for lang, code in AUDIO_VERSIONS.items():
        loc = dev[lang]
        for r in loc['scripture_refs']:
            key = f"{slug}:{r['book']}.{r['chapter']}.{r['verse_start']}-{r['verse_end']}"
            jobs.append({
                'kind': 'devotional_scripture', 'content_key': key, 'language_code': lang, 'version_code': code,
                'storage_path': f"devotional/{slug}/{code}-{r['book'].lower()}-{r['chapter']}-{r['verse_start']}-{r['verse_end']}.mp3",
                'text': passage_text(versions[code], r['book'], r['chapter'], r['verse_start'], r['verse_end']),
            })
        jobs.append({
            'kind': 'devotional_prayer', 'content_key': slug, 'language_code': lang, 'version_code': None,
            'storage_path': f'devotional/{slug}/prayer-{lang}.mp3', 'text': loc['prayer'],
        })
    return jobs


def duration(path):
    out = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path],
                         capture_output=True, text=True, check=True)
    return round(float(out.stdout.strip()), 2)


def record(job, out_dir, api_key):
    path = os.path.join(out_dir, job['storage_path'])
    job['text_sha256'] = hashlib.sha256(job['text'].encode('utf-8')).hexdigest()
    if not os.path.exists(path):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        for attempt in range(3):   # retries only on transport/5xx errors, never after a successful clip
            r = requests.post(
                f'https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}?output_format=mp3_44100_128',
                headers={'xi-api-key': api_key, 'Content-Type': 'application/json'},
                json={'text': DELIVERY_TAG + job['text'], 'model_id': MODEL_ID, 'language_code': job['language_code']},
                timeout=180,
            )
            if r.status_code == 200 and r.headers.get('content-type', '').startswith('audio/'):
                tmp = path + '.part'
                open(tmp, 'wb').write(r.content)
                os.replace(tmp, path)
                break
            if r.status_code < 500 and r.status_code != 429:
                raise SystemExit(f"{job['storage_path']}: ElevenLabs {r.status_code} {r.text[:300]}")
            time.sleep(5 * (attempt + 1))
        else:
            raise SystemExit(f"{job['storage_path']}: ElevenLabs kept failing")
    job['duration_secs'] = duration(path)
    rate = len(job['text']) / job['duration_secs']
    lo, hi = RATE_BOUNDS[job['language_code']]
    job['check'] = 'ok' if lo <= rate <= hi else f'suspicious rate {rate:.1f} chars/s'
    job['voice_label'] = VOICE_LABEL
    return job


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('what', choices=['daily', 'devotional'])
    ap.add_argument('--slug')
    ap.add_argument('--out', default='audio-out')
    ap.add_argument('--limit', type=int, help='only the first N clips (for a trial)')
    ap.add_argument('--dry-run', action='store_true', help='list clips and character count, spend nothing')
    a = ap.parse_args()
    jobs = daily_jobs() if a.what == 'daily' else devotional_jobs(a.slug)
    if a.limit:
        jobs = jobs[:a.limit]
    chars = sum(len(DELIVERY_TAG + j['text']) for j in jobs)
    todo = [j for j in jobs if not os.path.exists(os.path.join(a.out, j['storage_path']))]
    print(f'{len(jobs)} clips, {len(todo)} to record, ~{sum(len(DELIVERY_TAG + j["text"]) for j in todo)} chars to bill ({chars} total)')
    if a.dry_run:
        return
    key = os.environ['ELEVENLABS_API_KEY']
    with ThreadPoolExecutor(max_workers=3) as pool:
        done = list(pool.map(lambda j: record(j, a.out, key), jobs))
    manifest = os.path.join(a.out, f'manifest-{a.what}{"-" + a.slug if a.slug else ""}.json')
    json.dump(done, open(manifest, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    bad = [j for j in done if j['check'] != 'ok']
    print(f'wrote {manifest}; {len(done) - len(bad)} ok, {len(bad)} flagged')
    for j in bad:
        print('  FLAG', j['storage_path'], j['check'])


if __name__ == '__main__':
    sys.exit(main())
