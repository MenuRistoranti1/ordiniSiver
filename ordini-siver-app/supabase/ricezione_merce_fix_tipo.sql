-- Correzione del tipo di document_rows.matched_order_id.
--
-- La colonna era stata creata come uuid, ma ordini.id è un bigint: ogni
-- tentativo di collegare una riga di fattura al suo ordine veniva rifiutato
-- ("invalid input syntax for type uuid"). Senza quel collegamento la stessa
-- fattura verrebbe riproposta a ogni apertura della schermata di ricezione e
-- sommata di nuovo alle quantità già registrate.
--
-- La colonna non contiene ancora dati, quindi la conversione è sicura.
-- Da eseguire nel SQL Editor di Supabase.

alter table public.document_rows
  drop column if exists matched_order_id;

alter table public.document_rows
  add column matched_order_id bigint;

create index if not exists idx_document_rows_matched_order
  on public.document_rows (matched_order_id);
