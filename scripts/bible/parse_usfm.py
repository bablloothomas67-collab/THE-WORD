#!/usr/bin/env python3
"""
Parse eBible.org USFM files into clean verse records for THE WORD.

Usage:  python3 parse_usfm.py <usfm_dir> <version_code> <out.jsonl> <books.json>

Output (one JSON object per line):
  {"book": "GEN", "chapter": 1, "verse": 1, "label": "1", "text": "..."}
Verse 0 holds a Psalm superscription (\\d) when present.

What is removed: footnotes (\\f), cross references (\\x), Strong's attributes,
introductions, section headings. Scripture wording itself is never altered —
only markup is stripped and whitespace normalised.
"""
import json
import re
import sys
from pathlib import Path

SKIP_BOOKS = {"FRT", "BAK", "GLO", "OTH", "INT", "CNC", "TDX", "NDX", "XXA", "XXB", "XXC", "XXD", "XXE", "XXF", "XXG"}

# Paragraph/heading markers whose *content* is not verse text.
DROP_LINE = re.compile(
    r"^\\(id|ide|h|toc\d?|toca\d?|mt\d?|mte\d?|ms\d?|mr|s\d?|sr|r|sp|is\d?|ip|ipi|im|imi|ipq|imq|ipr|iq\d?|ib|ili\d?|iot|io\d?|ior|iex|imte\d?|ie|rem|sts|cl|cp|cd|restore)\b"
)

NOTE = re.compile(r"\\(f|fe|x|ef|ex)\s.*?\\\1\*", re.S)
WORD_ATTR = re.compile(r"\\(\+?)(w|rb|fig)\s+([^\\|]*?)(\|[^\\]*?)?\\\1\2\*")
CHAR_MARK = re.compile(r"\\\+?[a-z]+[0-9]*\*?")
SPACE = re.compile(r"\s+")


def clean(text: str) -> str:
    text = NOTE.sub(" ", text)
    # \w word|strong="H123"\w*  ->  word   (repeat for nesting)
    for _ in range(3):
        text = WORD_ATTR.sub(lambda m: m.group(3), text)
    text = CHAR_MARK.sub("", text)  # \add, \nd, \wj, \qs, \k ... keep their content
    text = text.replace("¶", " ")
    text = SPACE.sub(" ", text).strip()
    # tidy spaces before punctuation introduced by markup removal
    text = re.sub(r"\s+([,.;:!?’”)\]])", r"\1", text)
    text = re.sub(r"([“‘(\[])\s+", r"\1", text)
    return text


def parse_book(path: Path):
    raw = path.read_text(encoding="utf-8-sig")
    meta = {}
    m = re.search(r"^\\id\s+([A-Z0-9]{3})", raw, re.M)
    if not m:
        return None, None, []
    book = m.group(1)
    for key in ("h", "toc1", "toc2", "toc3"):
        mm = re.search(rf"^\\{key}\s+(.+)$", raw, re.M)
        if mm:
            meta[key] = SPACE.sub(" ", mm.group(1)).strip()

    # Join into one stream of markers, dropping non-verse paragraph content.
    kept = []
    for line in raw.splitlines():
        s = line.strip()
        if not s or DROP_LINE.match(s):
            continue
        kept.append(s)
    stream = " ".join(kept)

    verses = []
    chapter = 0
    current = None  # dict being filled
    pending_title = []

    tokens = re.split(r"(\\c\s+\d+|\\v\s+\d+[a-z]?(?:-\d+[a-z]?)?|\\d\b)", stream)
    mode = None
    for tok in tokens:
        if not tok:
            continue
        cm = re.fullmatch(r"\\c\s+(\d+)", tok)
        vm = re.fullmatch(r"\\v\s+(\d+)([a-z]?)(?:-(\d+)[a-z]?)?", tok)
        if cm:
            chapter = int(cm.group(1))
            current, mode = None, None
            continue
        if tok == r"\d":
            mode = "title"
            current = {"book": book, "chapter": chapter, "verse": 0, "label": "", "parts": []}
            verses.append(current)
            continue
        if vm:
            num = int(vm.group(1))
            label = vm.group(1) + (f"-{vm.group(3)}" if vm.group(3) else "")
            mode = "verse"
            current = {"book": book, "chapter": chapter, "verse": num, "label": label, "parts": []}
            verses.append(current)
            continue
        if current is not None:
            current["parts"].append(tok)

    out = []
    seen = set()
    for v in verses:
        text = clean(" ".join(v.pop("parts")))
        key = (v["chapter"], v["verse"])
        if not text:
            continue
        if key in seen:  # merge duplicate numbering (e.g. 'a'/'b' split verses)
            prev = next(o for o in reversed(out) if (o["chapter"], o["verse"]) == key)
            prev["text"] = (prev["text"] + " " + text).strip()
            continue
        seen.add(key)
        v["text"] = text
        out.append(v)
    return book, meta, out


def main():
    src, version, out_path, books_path = sys.argv[1:5]
    records, books = [], []
    for path in sorted(Path(src).glob("*.usfm")):
        book, meta, verses = parse_book(path)
        if not book or book in SKIP_BOOKS or not verses:
            continue
        books.append({"book": book, **meta, "chapters": max(v["chapter"] for v in verses)})
        records.extend(verses)
    with open(out_path, "w", encoding="utf-8") as f:
        for r in records:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
    Path(books_path).write_text(json.dumps(books, ensure_ascii=False, indent=1), encoding="utf-8")
    numbered = [r for r in records if r["verse"] > 0]
    print(f"{version}: {len(books)} books, {len(numbered)} verses, {len(records) - len(numbered)} titles")


if __name__ == "__main__":
    main()
