-- Permessi sui file dell'archivio "documents".
--
-- Il contenitore e' privato — da fuori non si scarica niente — ma chiunque
-- avesse fatto login poteva scaricare qualsiasi PDF, comprese le fatture degli
-- altri locali. Verificato: un responsabile di un locale ha scaricato la
-- fattura di un altro.
--
-- Il percorso del file non dice a quale locale appartiene, quindi la regola lo
-- chiede alla tabella documents, dove "file_url" contiene esattamente il
-- percorso del file.
--
-- Da eseguire DOPO permessi_documenti.sql, che definisce le due funzioni usate
-- qui sotto.

-- ---------------------------------------------------------------------------
-- 1. Si rimuovono le regole precedenti che riguardano questo archivio.
--    Vengono toccate solo quelle che nominano "documents": le altre restano.

do $$
declare
  regola record;
begin
  for regola in
    select policyname
      from pg_policies
     where schemaname = 'storage'
       and tablename  = 'objects'
       and (coalesce(qual, '') || coalesce(with_check, '')) like '%documents%'
  loop
    execute format('drop policy %I on storage.objects', regola.policyname);
  end loop;
end
$$;

-- ---------------------------------------------------------------------------
-- 2. Lettura: l'amministrazione vede tutto, il locale solo i propri documenti.

create policy "archivio documenti: lettura"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'documents'
    and (
      public.e_amministrazione()
      or exists (
        select 1
          from public.documents d
         where d.file_url = storage.objects.name
           and d.restaurant_id in (select public.miei_locali())
      )
    )
  );

-- ---------------------------------------------------------------------------
-- 3. Caricamento e cancellazione: solo l'amministrazione.
--    I locali validano la merce, non gestiscono i file.

create policy "archivio documenti: caricamento"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'documents' and public.e_amministrazione());

create policy "archivio documenti: modifica"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'documents' and public.e_amministrazione())
  with check (bucket_id = 'documents' and public.e_amministrazione());

create policy "archivio documenti: cancellazione"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'documents' and public.e_amministrazione());

-- ---------------------------------------------------------------------------
-- 4. Riepilogo: mostra come sono rimaste le regole dell'archivio.

select policyname as regola, cmd as operazione
  from pg_policies
 where schemaname = 'storage'
   and tablename  = 'objects'
 order by policyname;
