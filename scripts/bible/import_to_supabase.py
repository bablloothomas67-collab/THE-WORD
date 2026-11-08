#!/usr/bin/env python3
"""
Import parsed verses into Supabase through the public REST API, signed in as an
account that holds the temporary `content_importer` role (granted and revoked
via SQL by an administrator). Uses only the public anon key.

Usage:
  SUPABASE_URL=... SUPABASE_ANON_KEY=... IMPORTER_EMAIL=... IMPORTER_PASSWORD=... \
  python3 import_to_supabase.py <version_uuid> <verses.jsonl> <books.json>
"""
import json
import os
import sys
import time
import urllib.error
import urllib.request

sys.path.insert(0, os.path.dirname(__file__))
from search_normalise import normalise  # noqa: E402

URL = os.environ["SUPABASE_URL"].rstrip("/")
KEY = os.environ["SUPABASE_ANON_KEY"]
BATCH = 500


def request(method, path, body=None, token=None, prefer=None):
    headers = {"apikey": KEY, "Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if prefer:
        headers["Prefer"] = prefer
    data = json.dumps(body, ensure_ascii=False).encode() if body is not None else None
    req = urllib.request.Request(URL + path, data=data, method=method, headers=headers)
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                raw = r.read()
                return json.loads(raw) if raw else None
        except urllib.error.HTTPError as e:
            msg = e.read().decode()
            if e.code >= 500 and attempt < 3:
                time.sleep(2 * (attempt + 1))
                continue
            raise SystemExit(f"{method} {path} -> {e.code}: {msg[:500]}")


def main():
    version_id, verses_path, books_path = sys.argv[1:4]
    session = request(
        "POST",
        "/auth/v1/token?grant_type=password",
        {"email": os.environ["IMPORTER_EMAIL"], "password": os.environ["IMPORTER_PASSWORD"]},
    )
    token = session["access_token"]

    books = json.load(open(books_path, encoding="utf-8"))
    names = [
        {
            "version_id": version_id,
            "book_code": b["book"],
            "name": b.get("h") or b.get("toc2") or b["book"],
            "long_name": b.get("toc1"),
            "abbreviation": b.get("toc3"),
            "chapter_count": b["chapters"],
        }
        for b in books
    ]
    request("POST", "/rest/v1/bible_book_names", names, token, "return=minimal")

    rows = []
    sent = 0
    with open(verses_path, encoding="utf-8") as f:
        for line in f:
            r = json.loads(line)
            rows.append(
                {
                    "version_id": version_id,
                    "book_code": r["book"],
                    "chapter": r["chapter"],
                    "verse": r["verse"],
                    "label": r["label"],
                    "text": r["text"],
                    "search_text": normalise(r["text"]),
                }
            )
            if len(rows) == BATCH:
                request("POST", "/rest/v1/bible_verses", rows, token, "return=minimal")
                sent += len(rows)
                rows = []
    if rows:
        request("POST", "/rest/v1/bible_verses", rows, token, "return=minimal")
        sent += len(rows)
    print(f"{version_id}: {len(names)} book names, {sent} verse rows imported")


if __name__ == "__main__":
    main()
