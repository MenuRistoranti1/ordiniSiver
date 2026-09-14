-- Permessi sulle tabelle rimaste scoperte.
--
-- Queste tabelle erano le uniche del progetto senza protezione: chiunque
-- conoscesse l'indirizzo del sito poteva leggerle, scriverci e svuotarle, senza
-- bisogno di fare login. Dentro ci sono i prezzi d'acquisto del fornitore per
-- tutti i locali.
--
-- Da qui in poi valgono le stesse regole del resto del progetto:
--   - l'amministrazione fa tutto;
--   - un locale vede e tocca solo i documenti del proprio locale;
--   - chi non ha fatto login non vede niente.
--
-- Le rotte API del server usano la chiave di servizio, che ignora questi
-- permessi: continuano a funzionare come prima.

alter table public.documents      enable row level security;
alter table public.document_rows  enable row level security;

-- Ripetibile senza danni: si rimuovono le versioni precedenti, se esistono.
drop policy if exists "documenti: amministrazione"      on public.documents;
drop policy if exists "documenti: il proprio locale"    on public.documents;
drop policy if exists "righe: amministrazione"          on public.document_rows;
drop policy if exists "righe: il proprio locale"        on public.document_rows;

-- Chi è amministratore lo dice il token, non una tabella: è la stessa
-- informazione che controllano le rotte API.
create or replace function public.e_amministrazione()
returns boolean
language sql
stable
as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    false
  )
$$;

-- I locali di competenza dell'utente collegato.
--
-- Due strade, perché il progetto usa entrambe: la tabella dei collegamenti per
-- chi segue più locali, e il locale scritto nel token per tutti gli altri.
create or replace function public.miei_locali()
returns setof uuid
language sql
stable
as $$
  select restaurant_id
    from public.local_user_restaurants
   where user_id = auth.uid()
  union
  select (auth.jwt() -> 'app_metadata' ->> 'locale_id')::uuid
   where (auth.jwt() -> 'app_metadata' ->> 'locale_id') is not null
$$;

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

-- Una riga segue il documento a cui appartiene: se il locale può vedere il
-- documento, può vedere e validare le sue righe.
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

-- ---------------------------------------------------------------------------
-- Tabelle avanzate da versioni precedenti.
--
-- giacenze_obbligatorie, product_categories, suppliers e roles erano anch'esse
-- leggibili e modificabili senza login. Nessuna riga del programma le usa piu':
-- si chiudono del tutto, lasciandole alla sola amministrazione. Se un giorno
-- servissero di nuovo, basta aggiungere una regola di lettura.

alter table public.giacenze_obbligatorie enable row level security;
alter table public.product_categories    enable row level security;
alter table public.suppliers             enable row level security;
alter table public.roles                 enable row level security;

drop policy if exists "solo amministrazione" on public.giacenze_obbligatorie;
drop policy if exists "solo amministrazione" on public.product_categories;
drop policy if exists "solo amministrazione" on public.suppliers;
drop policy if exists "solo amministrazione" on public.roles;

create policy "solo amministrazione" on public.giacenze_obbligatorie
  for all to authenticated
  using (public.e_amministrazione()) with check (public.e_amministrazione());

create policy "solo amministrazione" on public.product_categories
  for all to authenticated
  using (public.e_amministrazione()) with check (public.e_amministrazione());

create policy "solo amministrazione" on public.suppliers
  for all to authenticated
  using (public.e_amministrazione()) with check (public.e_amministrazione());

create policy "solo amministrazione" on public.roles
  for all to authenticated
  using (public.e_amministrazione()) with check (public.e_amministrazione());
