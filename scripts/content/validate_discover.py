#!/usr/bin/env python3
"""
Check content/discover/*.json before review and import.

  python3 scripts/content/validate_discover.py            # structure + every reference exists
  python3 scripts/content/validate_discover.py --show     # also print the first verse of each reference

Structure: required fields, lengths, EN and ML shaped alike, every [[n]] marker points at
a reference, every reference is cited. References: each verse must exist in ALL enabled
Bible versions (public anon API). Exits non-zero on any problem.

Env: SUPABASE_URL, SUPABASE_ANON_KEY.
"""
import glob, json, os, re, sys
import requests

KINDS = {'story', 'history', 'theology', 'apologetics', 'quiz'}
LANGS = ('en', 'ml')
problems = []

def bad(slug, msg):
    problems.append(f'{slug}: {msg}')

def ref_ok(r):
    return (isinstance(r, dict) and re.fullmatch(r'[A-Z0-9]{3}', str(r.get('book', '')))
            and all(isinstance(r.get(k), int) and r[k] > 0 for k in ('chapter', 'verse_start', 'verse_end'))
            and r['verse_end'] >= r['verse_start'] and r['verse_end'] - r['verse_start'] < 30)

def load():
    items = []
    for path in sorted(glob.glob('content/discover/*.json')):
        items += json.load(open(path, encoding='utf-8'))
    return items

def check_structure(items):
    seen = set()
    for it in items:
        slug = it.get('slug', '?')
        if not re.fullmatch(r'[a-z0-9-]+', slug) or slug in seen: bad(slug, 'bad or duplicate slug')
        seen.add(slug)
        if it.get('kind') not in KINDS: bad(slug, 'bad kind')
        quiz = it.get('kind') == 'quiz'
        refs = [a.get('ref') for a in it.get('answers', [])] if quiz else it.get('scripture_refs', [])
        for r in refs:
            if r is not None and not ref_ok(r): bad(slug, f'bad reference {r}')
        for lang in LANGS:
            x = it.get(lang) or {}
            if not (0 < len(x.get('title', '')) <= 160): bad(slug, f'{lang} title length')
            if not (0 < len(x.get('summary', '')) <= 400): bad(slug, f'{lang} summary length')
            if quiz:
                qs = x.get('questions', [])
                if len(qs) != len(it['answers']) or not qs: bad(slug, f'{lang} question count')
                for i, (q, a) in enumerate(zip(qs, it['answers'])):
                    if not q.get('prompt') or not q.get('explanation'): bad(slug, f'{lang} q{i+1} text missing')
                    if len(q.get('options', [])) != 4 or len(set(q['options'])) != 4: bad(slug, f'{lang} q{i+1} options')
                    if not (isinstance(a.get('correct'), int) and 0 <= a['correct'] < 4): bad(slug, f'q{i+1} correct index')
            else:
                secs = x.get('sections', [])
                if not secs or any(not s.get('body', '').strip() for s in secs): bad(slug, f'{lang} empty section')
                text = ' '.join(s['body'] for s in secs)
                cited = {int(n) for n in re.findall(r'\[\[(\d+)\]\]', text)}
                want = set(range(1, len(refs) + 1))
                if cited - want: bad(slug, f'{lang} marker without reference: {sorted(cited - want)}')
                if want - cited: bad(slug, f'{lang} reference never cited: {sorted(want - cited)}')
                if it.get('kind') in ('history', 'apologetics', 'theology') and not it.get('sources'):
                    bad(slug, 'no sources')
        if not quiz:
            if len(it['en']['sections']) != len(it['ml']['sections']): bad(slug, 'EN and ML section counts differ')
            for s_en, s_ml in zip(it['en']['sections'], it['ml']['sections']):
                m = lambda s: re.findall(r'\[\[(\d+)\]\]', s['body'])
                if sorted(m(s_en)) != sorted(m(s_ml)): bad(slug, f"EN/ML markers differ in '{s_en.get('heading')}'")
        for s in it.get('sources', []):
            if not s.get('label') or (s.get('url') and not s['url'].startswith('https://')): bad(slug, 'bad source')

def check_refs(items, show):
    url, anon = os.environ['SUPABASE_URL'], os.environ['SUPABASE_ANON_KEY']
    h = {'apikey': anon, 'Authorization': 'Bearer ' + anon}
    versions = requests.get(f'{url}/rest/v1/bible_versions?select=id,code&order=code', headers=h, timeout=30).json()
    n = 0
    for it in items:
        quiz = it['kind'] == 'quiz'
        refs = [a['ref'] for a in it['answers'] if a['ref']] if quiz else it['scripture_refs']
        for r in refs:
            if not ref_ok(r): continue
            n += 1
            need = r['verse_end'] - r['verse_start'] + 1
            for v in versions:
                rows = requests.get(
                    f"{url}/rest/v1/bible_verses?select=verse,text&version_id=eq.{v['id']}&book_code=eq.{r['book']}"
                    f"&chapter=eq.{r['chapter']}&verse=gte.{r['verse_start']}&verse=lte.{r['verse_end']}&order=verse",
                    headers=h, timeout=30).json()
                if len(rows) != need:
                    bad(it['slug'], f"{r['book']} {r['chapter']}:{r['verse_start']}-{r['verse_end']} has {len(rows)}/{need} verses in {v['code']}")
                elif show and v['code'] in ('kjv', 'mal1910'):
                    print(f"  {it['slug']} {r['book']} {r['chapter']}:{r['verse_start']}-{r['verse_end']} [{v['code']}] {rows[0]['text'][:110]} … {rows[-1]['text'][-60:]}")
    return n, [v['code'] for v in versions]

def main():
    items = load()
    check_structure(items)
    n, versions = check_refs(items, '--show' in sys.argv)
    by = {}
    for it in items: by[it['kind']] = by.get(it['kind'], 0) + 1
    print(f'{len(items)} items {by}; {n} references checked in {versions}')
    if problems:
        print('\n'.join('PROBLEM ' + p for p in problems)); sys.exit(1)
    print('OK')

if __name__ == '__main__':
    main()
