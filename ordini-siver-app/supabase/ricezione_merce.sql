-- Ricezione merce: colonne necessarie per validare le consegne
-- partendo dai PDF di fattura e inevaso.
--
-- Da eseguire una sola volta nel SQL Editor di Supabase.
-- Tutte le istruzioni sono additive e usano IF NOT EXISTS: non modificano
-- dati esistenti e possono essere rilanciate senza danni.

-- 1. Tipo di documento riconosciuto dalla pipeline ("fattura" o "inevaso").
--    Serve a sapere se le righe rappresentano merce arrivata o merce mancante.
alter table public.documents
  add column if not exists document_type text;

-- 2. Riga d'ordine a cui è stata abbinata la riga del documento.
--    L'abbinamento avviene per codice fornitore e resta salvato, così la
--    correzione fatta a mano da un responsabile non va persa.
alter table public.document_rows
  add column if not exists matched_order_id uuid;

-- 3. Firma della validazione sulla riga d'ordine.
--    Chi ordina e chi riceve la merce sono spesso persone diverse dello stesso
--    locale: la validazione appartiene al locale, queste colonne dicono solo
--    chi l'ha materialmente confermata e quando.
alter table public.ordini
  add column if not exists consegna_validata_da text;

alter table public.ordini
  add column if not exists consegna_validata_il timestamptz;

-- 4. Indici per le ricerche usate dalla schermata di ricezione.
create index if not exists idx_document_rows_matched_order
  on public.document_rows (matched_order_id);

create index if not exists idx_ordini_locale_settimana
  on public.ordini (locale_id, settimana_key);
