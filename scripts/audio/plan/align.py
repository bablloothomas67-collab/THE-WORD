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
    first = next(b for b in blocks if b.size >= 4); last = [b for b in blocks if b.size >= 4][-1]
    start = tr[first.b]['s']; end = tr[last.b + last.size - 1]['e']
    diffs = [(' '.join(ref[i1:i2]), ' '.join(hyp[j1:j2])) for tag, i1, i2, j1, j2 in sm.get_opcodes() if tag != 'equal']
    return dict(ch=ch, ref=len(ref), hyp=len(hyp), match=round(matched / len(ref), 4), start=start, end=end,
                lead_ref_missing=first.a, tail_ref_missing=len(ref) - (last.a + last.size), diffs=diffs)
if __name__ == '__main__':
    for ch in map(int, sys.argv[2:]):
        r = analyse(ch, sys.argv[1])
        d = r.pop('diffs'); print(r); 
        for a, b in d[:int(1e9) if len(sys.argv) < 0 else 14]: print('   site:', repr(a), '| heard:', repr(b))
