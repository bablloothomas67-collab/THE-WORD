# Scripture and prayer audio

Visitors can read or listen to the verse of the day, a devotional's Scripture and its prayer,
in English or Malayalam. The player loads a file only when **Listen** is pressed.

## Voice
- **THE WORD – Ammachi**: an AI voice designed in ElevenLabs (voice id `Gp0oOn0KXQwkVSSTGa3v`),
  an elderly Kerala grandmother, chosen by the project owner on 8 Nov 2026.
- Model `eleven_v4`, read with the `[softly]` direction. The player always says the voice is AI.
- Commercial use of ElevenLabs output needs a paid ElevenLabs plan.

## What is recorded
| Content | English | Malayalam |
|---|---|---|
| Verse of the day (87) | KJV (public domain) | Malayalam 1910 (CC BY-SA 4.0, Free Bible Foundation) |
| Devotional Scripture + prayer | KJV + English prayer | 1910 + Malayalam prayer |

If a reader shows a different version (WEB, IRV), the player says which version the audio is
read from. The 1910 recordings are adaptations of a CC BY-SA 4.0 text: they keep the same
licence and attribution, which the reader shows next to the passage.

Devotional audio is recorded only after the owner approves that devotional's text.

## Pipeline (`scripts/audio/`)
1. `generate_audio.py daily|devotional --slug X --out DIR [--dry-run]` reads the text straight from
   the database / `content/devotionals/*.json` (never retyped). It refuses partial passages,
   skips clips that already exist (no double billing), measures each clip's duration and
   flags clips whose speaking rate looks wrong. Writes a manifest with the SHA-256 of the
   exact text spoken.
2. `upload_audio.py MANIFEST --root DIR` signs in as the content-importer account (role granted
   only during an import, then revoked and the password rotated), uploads to the public
   `scripture-audio` bucket and publishes rows in `audio_tracks`. Flagged clips are skipped.

Secrets (`ELEVENLABS_API_KEY`, importer password) live only in local, untracked env files; the
app never calls ElevenLabs.

## Status (8 Nov 2026)
- 174 daily-verse clips and 30 devotional clips (Week 1: Scripture + prayer, EN + ML) published.
- Characters billed: 25,349 (daily) + 5,934 (devotionals) + ~1,900 samples.
- 12 Nov 2026: Week 2 devotionals (16–22 Nov) — 28 clips, 7,139 characters billed. Total published: 232 clips.

## Recorded plan audio (not AI) — added 15 Nov 2026

Reading-plan chapters use existing human recordings, not the AI voice. They live in the private
`premium-audio` bucket (`audio_tracks.kind = 'plan_chapter'`, `content_key = 'JHN.3'`) and are
served through one-hour signed links. While the paywall is off any signed-in reader can listen;
with it on, only Premium readers can.

| Language | Version | Source | Licence | What we changed |
|---|---|---|---|---|
| English | `web` | LibriVox "Book of John WEB", archive.org item `book_john` | Public domain | LibriVox spoken intro and closing line removed; volume levelled |
| Malayalam | `malirv` | Malayalam IRV Audio Bible from Bridge Connectivity Solutions' catalogue (Vachan Online) | CC BY-SA 4.0, © 2022 Davar Partners International and Bridge Connectivity Solutions (tag embedded in every file) | Leading/trailing silence removed; volume levelled |

Rules that follow from the licences:
- The Malayalam credit line and a link to the licence are shown under the player
  (`plans.audioCredit.malirv`, `RECORDING_CREDITS` in `audioService.ts`). Do not remove them.
- Our adapted Malayalam files are themselves CC BY-SA 4.0 (stated in each file's tags). We may charge
  for access, but we may not forbid listeners from sharing the files.
- The English recording was read from the 2006 WEB edition; about 2% of words differ from the WEB
  text on the site. The credit line says so.
- A reader sees the recording in their interface language; Malayalam falls back to English when a
  chapter has no Malayalam recording.

Process (`scripts/audio/plan/`): download the source files; for English run `transcribe.py`
(speech-to-text with word timings) and `align.py` (matches the words to the site's text to find
where Scripture starts and ends, and reports the match rate); `build_plan_audio.py en|ml OUT`
trims, levels to −16 LUFS, re-encodes at 80 kbit/s mono and writes a manifest; then
`upload_audio.py` as above. Chapters whose match rate is under 95% are flagged and not uploaded.
The Malayalam audio has not been machine-checked against the text; the owner listened to samples.
