import json, re, sys, difflib
T = json.load(open('john_text.json'))
def norm(w): return re.sub(r"[^a-z0-9']", '', w.lower().replace('’', "'"))
def chapter_words(code, ch):
    return [x for r in T[code] if r['chapter'] == ch for x in (norm(w) for w in r['text'].split()) if x]
def analyse(ch, code='web'):
    tr = json.load(open(f'tr_john_{ch:02d}_web.json'))
    hyp = [norm(w['w']) for w in tr]
    ref = chapter_words(code, ch)
    sm = difflib.SequenceMatcher(None, ref, hyp, autojunk=False)
    blocks = [b for b in sm.get_matching_blocks() if b.size]
    matched = sum(b.size for b in blocks)
    # Scripture starts at the first matched run near the top of the chapter text and ends at
    # the last matched run near its end (runs of 2+ words, so stray single-word matches inside
    # the LibriVox intro/outro are ignored).
    runs = [b for b in blocks if b.size >= 2]
    first = next((b for b in runs if b.a <= 8), next(b for b in blocks if b.size >= 4))
    last = next((b for b in reversed(runs) if b.a + b.size >= len(ref) - 8), [b for b in blocks if b.size >= 4][-1])
    # The recording follows an older edition, so its opening or closing words can differ from
    # the site's text. Extend the window over neighbouring words until a heading
    # ("Chapter 16", "XVI.", "LibriVox.org") or the closing "End of chapter" is reached.
    heading = re.compile(r"^(chapter|librivox|org|end|[ivxlc]+|\d+)$")
    fi, li = first.b, last.b + last.size - 1
    while fi > 0 and not heading.match(hyp[fi - 1]) and tr[fi]['s'] - tr[fi - 1]['e'] < 1.5: fi -= 1
    while li + 1 < len(tr) and not heading.match(hyp[li + 1]) and tr[li + 1]['s'] - tr[li]['e'] < 1.5: li += 1
    start = tr[fi]['s']; end = tr[li]['e']
    diffs = [(' '.join(ref[i1:i2]), ' '.join(hyp[j1:j2])) for tag, i1, i2, j1, j2 in sm.get_opcodes() if tag != 'equal']
    return dict(ch=ch, ref=len(ref), hyp=len(hyp), match=round(matched / len(ref), 4), start=start, end=end,
                lead_ref_missing=first.a, tail_ref_missing=len(ref) - (last.a + last.size), diffs=diffs)
if __name__ == '__main__':
    for ch in map(int, sys.argv[2:]):
        r = analyse(ch, sys.argv[1])
        d = r.pop('diffs'); print(r); 
        for a, b in d[:int(1e9) if len(sys.argv) < 0 else 14]: print('   site:', repr(a), '| heard:', repr(b))
