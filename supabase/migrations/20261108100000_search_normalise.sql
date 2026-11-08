-- Search normalisation in SQL, identical to scripts/bible/search_normalise.py and
-- src/features/bible/searchNormalise.ts. Recomputes bible_verses.search_text.
-- Folds Malayalam chillu letters to consonant + virama and removes ZWJ/ZWNJ so
-- the 1910 and IRV spellings of the same word match.

create or replace function public.normalise_search(input text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select btrim(regexp_replace(
    lower(
      replace(replace(replace(replace(replace(replace(replace(replace(replace(
        regexp_replace(normalize(input, NFC), '[‌‍]', '', 'g'),
        U&'\0D7A', U&'\0D23\0D4D'),
        U&'\0D7B', U&'\0D28\0D4D'),
        U&'\0D7C', U&'\0D30\0D4D'),
        U&'\0D7D', U&'\0D32\0D4D'),
        U&'\0D7E', U&'\0D33\0D4D'),
        U&'\0D7F', U&'\0D15\0D4D'),
        U&'\0D54', U&'\0D2E\0D4D'),
        U&'\0D55', U&'\0D2F\0D4D'),
        U&'\0D56', U&'\0D34\0D4D')
    ),
    '[^0-9a-z_À-ɏഀ-ൿ]+', ' ', 'g'
  ));
$$;

update public.bible_verses
set search_text = public.normalise_search(text)
where search_text is distinct from public.normalise_search(text);
