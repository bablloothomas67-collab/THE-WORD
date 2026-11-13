#!/usr/bin/env python3
"""Turn content/discover/*.json into one readable review file (Markdown) for the owner.

  python3 scripts/content/build_discover_review.py > THE-WORD-Discover-review.md
"""
import json

ORDER = [('stories', 'Bible stories'), ('history', 'Christian history'), ('theology', 'Theology'),
         ('apologetics', 'Apologetics'), ('quizzes', 'Quizzes')]

def ref(r):
    v = str(r['verse_start']) if r['verse_start'] == r['verse_end'] else f"{r['verse_start']}–{r['verse_end']}"
    return f"{r['book']} {r['chapter']}:{v}"

def main():
    out = ['# THE WORD — Discover starter content for review', '',
           'Status: DRAFT, not published. English first, then Malayalam, for each item.',
           'Numbers in double brackets like [[1]] become links to the listed Bible passages; the passage text itself is shown from the Bible in the app.',
           'To approve: reply "approve discover" (all), or name the items to change.', '']
    n = 0
    for name, heading in ORDER:
        items = json.load(open(f'content/discover/{name}.json', encoding='utf-8'))
        out += [f'# {heading}', '']
        for it in items:
            n += 1
            quiz = it['kind'] == 'quiz'
            out += [f"## {n}. {it['en']['title']} / {it['ml']['title']}", '', f"Item code: `{it['slug']}`", '']
            if not quiz:
                out += ['Bible passages: ' + '; '.join(f'[[{i+1}]] {ref(r)}' for i, r in enumerate(it['scripture_refs'])), '']
            for lang, label in (('en', 'English'), ('ml', 'മലയാളം')):
                x = it[lang]
                out += [f'### {label}', '', f"*{x['summary']}*", '']
                if quiz:
                    for i, (q, a) in enumerate(zip(x['questions'], it['answers'])):
                        out.append(f"{i+1}. {q['prompt']}")
                        for j, o in enumerate(q['options']):
                            out.append(f"   - {'**' + o + '** ✔' if j == a['correct'] else o}")
                        out.append(f"   - _{q['explanation']}_" + (f" ({ref(a['ref'])})" if a['ref'] else ''))
                    out.append('')
                else:
                    for s in x['sections']:
                        out += [f"**{s['heading']}**", '', s['body'], '']
            if it.get('sources'):
                out += ['Sources: ' + '; '.join(s['label'] for s in it['sources']), '']
            out += ['---', '']
    print('\n'.join(out))

if __name__ == '__main__':
    main()
