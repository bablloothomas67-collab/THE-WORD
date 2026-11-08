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
