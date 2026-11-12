#!/usr/bin/env python3
"""
Load devotional drafts from a content JSON file into Supabase as unpublished rows.

  python3 scripts/content/import_devotionals.py content/devotionals/week-02.json

Signs in as the content-importer account. Rows are created as in_review / draft, so
nothing becomes visible; publishing is a separate step after owner approval. Existing
slugs are skipped. Finishes by reading the rows back and comparing them with the file.

Env: SUPABASE_URL, SUPABASE_ANON_KEY, IMPORTER_EMAIL, IMPORTER_PASSWORD.
"""
import json, os, sys
import requests

def main():
    items = json.load(open(sys.argv[1], encoding='utf-8'))
    url, anon = os.environ['SUPABASE_URL'], os.environ['SUPABASE_ANON_KEY']
    auth = requests.post(f'{url}/auth/v1/token?grant_type=password', headers={'apikey': anon},
                         json={'email': os.environ['IMPORTER_EMAIL'], 'password': os.environ['IMPORTER_PASSWORD']}, timeout=30)
    auth.raise_for_status()
    h = {'apikey': anon, 'Authorization': 'Bearer ' + auth.json()['access_token'], 'Content-Type': 'application/json'}
    for d in items:
        found = requests.get(f"{url}/rest/v1/devotionals?select=id&slug=eq.{d['slug']}", headers=h, timeout=30).json()
        if found:
            dev_id = found[0]['id']
        else:
            r = requests.post(f'{url}/rest/v1/devotionals', headers={**h, 'Prefer': 'return=representation'}, timeout=30,
                              json={'slug': d['slug'], 'publication_date': d['publication_date'], 'theme': d['theme'], 'status': 'in_review'})
            if r.status_code != 201: raise SystemExit(f"{d['slug']}: {r.status_code} {r.text[:200]}")
            dev_id = r.json()[0]['id']
        for lang in ('en', 'ml'):
            x = d[lang]
            row = {'devotional_id': dev_id, 'language_code': lang, 'title': x['title'], 'scripture_refs': x['scripture_refs'],
                   'reflection': x['reflection'], 'application_text': x['application'],
                   'reflection_questions': x['reflection_questions'], 'prayer_text': x['prayer'], 'review_status': 'draft'}
            have = requests.get(f"{url}/rest/v1/devotional_localisations?select=id&devotional_id=eq.{dev_id}&language_code=eq.{lang}", headers=h, timeout=30).json()
            if not have:
                r = requests.post(f'{url}/rest/v1/devotional_localisations', headers=h, json=row, timeout=30)
                if r.status_code != 201: raise SystemExit(f"{d['slug']} {lang}: {r.status_code} {r.text[:200]}")
            back = requests.get(f"{url}/rest/v1/devotional_localisations?select=title,scripture_refs,reflection,application_text,reflection_questions,prayer_text"
                                f"&devotional_id=eq.{dev_id}&language_code=eq.{lang}", headers=h, timeout=30).json()[0]
            expect = {k: row[k] for k in back}
            if back != expect: raise SystemExit(f"{d['slug']} {lang}: database text differs from the file")
        print('ok', d['slug'])
    print(f'{len(items)} devotionals in the database match the file (unpublished)')

if __name__ == '__main__':
    sys.exit(main())
