# API - OrdiniSiver v1.0

## Obiettivo

Questo documento descrive gli endpoint API interni presenti in OrdiniSiver.

Cartella API:

```text
src/app/api
```

Endpoint presenti:

```text
src/app/api/check-missing-orders/route.ts
src/app/api/import-invoice-pdf/route.ts
```

---

# API: check-missing-orders

## Percorso

```text
/api/check-missing-orders
```

## Metodo

```text
GET
```

## File

```text
src/app/api/check-missing-orders/route.ts
```

## Scopo

Controlla quali locali non hanno ancora completato:

* giacenze settimanali
* ordine settimanale

Se mancano giacenze o ordini, invia un'email di promemoria al locale.

---

## Dipendenze

### Librerie

* `next/server`
* `@supabase/supabase-js`
* `nodemailer`

### Variabili ambiente

```env
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
EMAIL_USER=
EMAIL_PASS=
```

---

## Tabelle usate

### Lettura

* `restaurants`
* `giacenze_settimana`
* `ordini`
* `alert_log`

### Scrittura

* `alert_log`

---

## Logica operativa

1. Calcola la `settimana_key` partendo dal sabato della settimana corrente.
2. Legge tutti i locali da `restaurants`.
3. Per ogni locale controlla se esiste almeno una giacenza in `giacenze_settimana`.
4. Per ogni locale controlla se esiste almeno un ordine in `ordini`.
5. Se mancano giacenza o ordine:

   * calcola il tipo di alert
   * controlla se l'alert è già stato inviato
   * invia email al locale
   * registra l'esito in `alert_log`

---

## Tipologie alert

```text
giacenza
ordine
giacenza_ordine
```

---

## Risposta

### Successo

```json
{
  "success": true,
  "settimanaKey": "2026-06-20",
  "risultatiEmail": []
}
```

### Errore

```json
{
  "error": "messaggio errore"
}
```

---

## Regole di business

* Ogni alert viene inviato una sola volta per locale, settimana e tipo alert.
* Gli alert già inviati vengono saltati.
* Se il locale non ha email, non viene inviato nulla.
* Gli errori di invio email vengono registrati in `alert_log`.

---

## Note tecniche

Questa API usa `SUPABASE_SERVICE_ROLE_KEY`, quindi deve rimanere lato server.

Non deve mai essere esposta nel browser.

---

## Miglioramenti futuri

* Proteggere l'endpoint con una secret di cron.
* Aggiungere log più dettagliati.
* Aggiungere canali alternativi: WhatsApp, notifica interna, SMS.
* Aggiungere configurazione per giorno/ora di invio.
* Aggiungere retry automatico.
* Aggiungere anteprima dei locali mancanti senza invio email.

---

# API: import-invoice-pdf

## Percorso

```text
/api/import-invoice-pdf
```

## Metodo

```text
POST
```

## File

```text
src/app/api/import-invoice-pdf/route.ts
```

## Scopo

Importa una fattura PDF Siver, estrae le righe prodotto, aggiorna l'anagrafica prodotti e registra eventuali variazioni prezzo.

---

## Runtime

```ts
export const runtime = "nodejs"
```

L'API usa runtime Node.js perché utilizza parsing PDF lato server.

---

## Dipendenze

### Librerie

* `next/server`
* `@supabase/supabase-js`
* `pdf-parse`

### Variabili ambiente

```env
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

---

## Input

Richiede un `FormData` con campo:

```text
file
```

Il file deve essere un PDF leggibile/testuale.

---

## Tabelle usate

### Lettura

* `products`
* `notifications`

### Scrittura

* `products`
* `invoice_import_rows`
* `product_price_history`
* `notifications`

---

## Logica operativa

1. Verifica presenza variabili Supabase.
2. Legge il file PDF dal `FormData`.
3. Converte il PDF in testo tramite `pdf-parse`.
4. Estrae:

   * numero fattura
   * data fattura
   * destinazione merce
5. Estrae le righe prodotto dal testo.
6. Per ogni riga:

   * cerca prodotto tramite `supplier_code`
   * se il prodotto non esiste, lo crea in `products`
   * se il prodotto esiste, aggiorna il prezzo
   * registra la riga in `invoice_import_rows`
   * se variazione prezzo >= 10%, registra in `product_price_history`
   * crea eventuali notifiche
7. Restituisce riepilogo dell'import.

---

## Funzioni interne principali

### `numeroIT(value)`

Converte numeri italiani in numero JavaScript.

Esempio:

```text
1.234,56 → 1234.56
```

### `euro(value)`

Formatta un numero in valuta italiana.

### `parseInvoiceInfo(text)`

Estrae dalla fattura:

* numero fattura
* data fattura
* destinazione merce

### `parseRows(text)`

Estrae le righe prodotto dal testo del PDF.

### `creaNotifica(...)`

Crea una notifica evitando duplicati non letti con stesso tipo, origine e sorgente.

---

## Risposta

### Successo

```json
{
  "invoice": {},
  "rows": [],
  "rows_count": 0,
  "updated": 0,
  "created": 0,
  "not_found": 0,
  "important_changes": 0
}
```

### PDF senza righe prodotto

```json
{
  "error": "Non ho trovato righe prodotto nel PDF. Probabile formato diverso o PDF scannerizzato.",
  "text_preview": "..."
}
```

### Errore generico

```json
{
  "error": "Errore import fattura PDF"
}
```

---

## Notifiche generate

### Nuovo prodotto creato

```text
product_created_from_invoice
```

### Aumento prezzo

```text
price_increase
```

### Diminuzione prezzo

```text
price_decrease
```

### Import completato

```text
invoice_pdf_import_completed
```

---

## Regole di business

* Il matching prodotto avviene tramite `supplier_code`.
* I prodotti nuovi vengono creati automaticamente.
* I prezzi vengono aggiornati automaticamente.
* Le variazioni prezzo pari o superiori al 10% generano storico e notifica.
* Se il PDF non contiene righe leggibili, l'API restituisce errore.
* Il parsing è pensato per uno specifico formato fattura Siver.

---

## Note tecniche

L'API utilizza `SUPABASE_SERVICE_ROLE_KEY`.

Questa chiave è molto sensibile e deve rimanere solo lato server.

Non deve mai essere usata in componenti client o nel browser.

---

## Criticità

### Campi scritti in `invoice_import_rows`

Nel codice vengono scritti campi come:

* `invoice_number`
* `invoice_date`
* `product_id`
* `price`
* `total`

Bisogna verificare che siano realmente presenti nella tabella `invoice_import_rows`.

Nel data dictionary attuale risultano invece:

* `invoice_import_id`
* `supplier_code`
* `product_name`
* `quantity`
* `unit_price`
* `total_price`
* `matched_order_id`
* `matched`
* `anomaly`
* `anomaly_note`

Questa differenza può generare errori Supabase in fase di insert.

---

## Miglioramenti futuri

* Salvare una testata in `invoice_imports`.
* Collegare ogni riga a `invoice_import_id`.
* Uniformare `price` con `unit_price`.
* Uniformare `total` con `total_price`.
* Gestire PDF scannerizzati tramite OCR.
* Aggiungere validazione prima dell'insert.
* Aggiungere pagina di revisione import prima del salvataggio definitivo.
* Gestire più fornitori e più formati PDF.
* Aggiungere storico completo del file importato.
* Aggiungere rollback import.
* Aggiungere matching manuale dei prodotti non riconosciuti.

---

# Sicurezza API

## Regola generale

Tutte le API che usano `SUPABASE_SERVICE_ROLE_KEY` devono:

* restare lato server
* non essere importate da componenti client
* non esporre la chiave nelle risposte
* essere protette se richiamabili da URL pubblico

---

# Variabili ambiente API

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
EMAIL_USER=
EMAIL_PASS=
```

---

# Priorità tecniche

1. Proteggere `/api/check-missing-orders` con una secret.
2. Verificare coerenza tra `import-invoice-pdf` e schema reale `invoice_import_rows`.
3. Salvare testata fattura in `invoice_imports`.
4. Aggiungere logging strutturato.
5. Aggiungere test sugli endpoint.
