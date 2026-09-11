-- Riferimento all'ordine sulle righe dei documenti.
--
-- Gli inevasi in formato tabellare indicano, per ogni riga, il numero e la
-- data dell'ordine da cui nasce l'arretrato ("ordine 21126/2026 del
-- 08/09/2026"). Il dato veniva letto e poi scartato: conservandolo, un
-- inevaso dice esattamente quale ordine è scoperto, senza doverlo dedurre
-- imputando le quantità dalla riga più vecchia.
--
-- Da eseguire una sola volta nel SQL Editor di Supabase.
-- Entrambe le istruzioni sono additive: non toccano i dati esistenti.

alter table public.document_rows
  add column if not exists order_reference text;

alter table public.document_rows
  add column if not exists order_date date;
