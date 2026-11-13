#!/usr/bin/env python3
"""
Load Discover drafts from content/discover/*.json into Supabase as unpublished rows.

  python3 scripts/content/import_discover.py                       # every file
  python3 scripts/content/import_discover.py content/discover/quizzes.json

Run scripts/content/validate_discover.py first. Signs in as the content-importer account.
Rows are created as in_review / draft, so nothing becomes visible; publishing is a separate
step after owner approval. Existing slugs are skipped. Finishes by reading every row back
and comparing it with the file, so reviewed text is never retyped.

Env: SUPABASE_URL, SUPABASE_ANON_KEY, IMPORTER_EMAIL, IMPORTER_PASSWORD.
"""
import glob, json, os, sys
import requests

def localisation(item, lang):
    """The row stored for one language. Quiz answers and references are shared by both languages."""
    x = item[lang]
    quiz = item['kind'] == 'quiz'
    questions = [
        {'prompt': q['prompt'], 'options': q['options'], 'correct': a['correct'],
         'explanation': q['explanation'], 'ref': a['ref']}
        for q, a in zip(x['questions'], item['answers'])
    ] if quiz else []
    return {
        'language_code': lang, 'title': x['title'], 'summary': x['summary'],
        'sections': [] if quiz else x['sections'], 'questions': questions,
        'scripture_refs': [] if quiz else item['scripture_refs'],
        'sources': item.get('sources', []), 'review_status': 'draft',
    }

def main():
    paths = sys.argv[1:] or sorted(glob.glob('content/discover/*.json'))
    items = [it for p in paths for it in json.load(open(p, encoding='utf-8'))]
    url, anon = os.environ['SUPABASE_URL'], os.environ['SUPABASE_ANON_KEY']
    auth = requests.post(f'{url}/auth/v1/token?grant_type=password', headers={'apikey': anon},
                         json={'email': os.environ['IMPORTER_EMAIL'], 'password': os.environ['IMPORTER_PASSWORD']}, timeout=30)
    auth.raise_for_status()
    h = {'apikey': anon, 'Authorization': 'Bearer ' + auth.json()['access_token'], 'Content-Type': 'application/json'}
    for it in items:
        found = requests.get(f"{url}/rest/v1/content_items?select=id&slug=eq.{it['slug']}", headers=h, timeout=30).json()
        if found:
            cid = found[0]['id']
        else:
            r = requests.post(f'{url}/rest/v1/content_items', headers={**h, 'Prefer': 'return=representation'}, timeout=30,
                              json={'slug': it['slug'], 'kind': it['kind'], 'sort_order': it['sort_order'], 'status': 'in_review'})
            if r.status_code != 201: raise SystemExit(f"{it['slug']}: {r.status_code} {r.text[:200]}")
            cid = r.json()[0]['id']
        for lang in ('en', 'ml'):
            row = {'content_id': cid, **localisation(it, lang)}
            q = f"{url}/rest/v1/content_localisations?content_id=eq.{cid}&language_code=eq.{lang}"
            if not requests.get(q + '&select=id', headers=h, timeout=30).json():
                r = requests.post(f'{url}/rest/v1/content_localisations', headers=h, json=row, timeout=30)
                if r.status_code != 201: raise SystemExit(f"{it['slug']} {lang}: {r.status_code} {r.text[:200]}")
            back = requests.get(q + '&select=title,summary,sections,questions,scripture_refs,sources', headers=h, timeout=30).json()[0]
            if back != {k: row[k] for k in back}: raise SystemExit(f"{it['slug']} {lang}: database text differs from the file")
        print('ok', it['slug'])
    print(f'{len(items)} items in the database match the files (unpublished)')

if __name__ == '__main__':
    sys.exit(main())
