-- Lets the content-importer account (role granted only for the duration of an import)
-- load devotional drafts from content/devotionals/*.json, so reviewed text is never retyped.
-- Importers can only create unpublished rows; publishing stays a separate, audited step.

drop policy if exists "Importers read devotionals" on public.devotionals;
create policy "Importers read devotionals" on public.devotionals
  for select to authenticated using ((select public.has_role('content_importer')));
drop policy if exists "Importers add devotional drafts" on public.devotionals;
create policy "Importers add devotional drafts" on public.devotionals
  for insert to authenticated
  with check ((select public.has_role('content_importer')) and status in ('draft', 'in_review'));

drop policy if exists "Importers read devotional texts" on public.devotional_localisations;
create policy "Importers read devotional texts" on public.devotional_localisations
  for select to authenticated using ((select public.has_role('content_importer')));
drop policy if exists "Importers add devotional draft texts" on public.devotional_localisations;
create policy "Importers add devotional draft texts" on public.devotional_localisations
  for insert to authenticated
  with check ((select public.has_role('content_importer')) and review_status = 'draft');

grant insert on public.devotionals, public.devotional_localisations to authenticated;
