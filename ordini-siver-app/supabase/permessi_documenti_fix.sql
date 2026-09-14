-- Correzione di permessi_documenti.sql.
--
-- Dopo il primo file, document_rows restava leggibile e scrivibile senza
-- login: le regole di PostgreSQL si sommano, e su quella tabella ne esisteva
-- gia' una, piu' vecchia e piu' permissiva, che continuava a lasciar passare
-- tutti. Aggiungere le nostre non bastava: bisogna togliere anche quella.
--
-- Qui si azzerano tutte le regole delle due tabelle e si riscrivono solo le
-- nostre, cosi' lo stato di partenza e' certo. In fondo, un riepilogo di com'e'
-- cambiata la situazione.
--
-- Da eseguire dopo permessi_documenti.sql, che definisce le due funzioni usate.

-- Si annota com'erano le regole, per poterle confrontare alla fine.
create temp table regole_prima as
  select tablename, policyname, cmd, coalesce(qual, '') as condizione
    from pg_policies
   where schemaname = 'public'
     and tablename in ('documents', 'document_rows');

-- Via tutte le regole esistenti sulle due tabelle, comprese quelle vecchie.
do $$
declare
  regola record;
begin
  for regola in
    select tablename, policyname
      from pg_policies
     where schemaname = 'public'
       and tablename in ('documents', 'document_rows')
  loop
    execute format('drop policy %I on public.%I', regola.policyname, regola.tablename);
  end loop;
end
$$;

alter table public.documents     enable row level security;
alter table public.document_rows enable row level security;

create policy "documenti: amministrazione"
  on public.documents
  for all
  to authenticated
  using (public.e_amministrazione())
  with check (public.e_amministrazione());

create policy "documenti: il proprio locale"
  on public.documents
  for all
  to authenticated
  using (restaurant_id in (select public.miei_locali()))
  with check (restaurant_id in (select public.miei_locali()));

create policy "righe: amministrazione"
  on public.document_rows
  for all
  to authenticated
  using (public.e_amministrazione())
  with check (public.e_amministrazione());

create policy "righe: il proprio locale"
  on public.document_rows
  for all
  to authenticated
  using (
    exists (
      select 1
        from public.documents d
       where d.id = document_rows.document_id
         and d.restaurant_id in (select public.miei_locali())
    )
  )
  with check (
    exists (
      select 1
        from public.documents d
       where d.id = document_rows.document_id
         and d.restaurant_id in (select public.miei_locali())
    )
  );

-- Riepilogo: prima e dopo, una riga per regola.
select 'PRIMA' as quando, tablename as tabella, policyname as regola, cmd as operazione,
       left(condizione, 60) as condizione
  from regole_prima
union all
select 'DOPO', tablename, policyname, cmd, left(coalesce(qual, ''), 60)
  from pg_policies
 where schemaname = 'public'
   and tablename in ('documents', 'document_rows')
 order by quando desc, tabella, regola;
