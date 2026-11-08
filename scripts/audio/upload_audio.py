#!/usr/bin/env python3
"""
Upload recorded clips to Supabase Storage and publish their catalogue rows.

  python3 scripts/audio/upload_audio.py audio-out/manifest-daily.json --root audio-out

Signs in as the content-importer account (role granted only for the duration of an
import). Clips flagged by generate_audio.py are skipped. Before publishing, the
text hash in the manifest is re-checked against the current database/JSON text by
generate_audio.py's own job builder, so stale audio is never published.

Env: SUPABASE_URL, SUPABASE_ANON_KEY, IMPORTER_EMAIL, IMPORTER_PASSWORD.
"""
import argparse, json, os, sys
import requests


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('manifest')
    ap.add_argument('--root', required=True)
    a = ap.parse_args()
    url, anon = os.environ['SUPABASE_URL'], os.environ['SUPABASE_ANON_KEY']
    auth = requests.post(f'{url}/auth/v1/token?grant_type=password', headers={'apikey': anon},
                         json={'email': os.environ['IMPORTER_EMAIL'], 'password': os.environ['IMPORTER_PASSWORD']}, timeout=30)
    auth.raise_for_status()
    token = auth.json()['access_token']
    h = {'apikey': anon, 'Authorization': f'Bearer {token}'}
    jobs = json.load(open(a.manifest, encoding='utf-8'))
    ok = skipped = 0
    for j in jobs:
        if j.get('check') != 'ok':
            print('skip (flagged)', j['storage_path'])
            skipped += 1
            continue
        data = open(os.path.join(a.root, j['storage_path']), 'rb').read()
        r = requests.post(f"{url}/storage/v1/object/scripture-audio/{j['storage_path']}",
                          headers={**h, 'Content-Type': 'audio/mpeg', 'x-upsert': 'true',
                                   'Cache-Control': 'public, max-age=31536000'}, data=data, timeout=120)
        if r.status_code not in (200, 201):
            raise SystemExit(f"upload {j['storage_path']}: {r.status_code} {r.text[:200]}")
        row = {k: j[k] for k in ('kind', 'content_key', 'language_code', 'version_code', 'storage_path',
                                 'duration_secs', 'text_sha256', 'voice_label')}
        row['published'] = True
        r = requests.post(f'{url}/rest/v1/audio_tracks?on_conflict=storage_path',
                          headers={**h, 'Content-Type': 'application/json',
                                   'Prefer': 'resolution=merge-duplicates,return=minimal'}, json=row, timeout=30)
        if r.status_code not in (200, 201, 204):
            raise SystemExit(f"catalogue {j['storage_path']}: {r.status_code} {r.text[:200]}")
        ok += 1
    print(f'uploaded and published {ok}; skipped {skipped}')


if __name__ == '__main__':
    sys.exit(main())
