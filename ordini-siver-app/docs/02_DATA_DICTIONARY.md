# Data Dictionary - OrdiniSiver v1.0

## Obiettivo

Questo documento descrive le tabelle principali del database Supabase/PostgreSQL di OrdiniSiver.

Il database gestisce:

* locali
* prodotti
* ordini
* giacenze
* consegne
* messaggi
* alert
* import fatture
* storico prezzi
* impostazioni operative

---

# Elenco tabelle

| Tabella                       | Scopo                                           |
| ----------------------------- | ----------------------------------------------- |
| `admin_menu_preferences`      | Preferenze menu amministratore                  |
| `alert_log`                   | Log degli alert inviati                         |
| `breakages`                   | Rotture o dispersioni                           |
| `giacenze_obbligatorie`       | Prodotti obbligatori da monitorare              |
| `giacenze_settimana`          | Giacenze settimanali inserite dai locali        |
| `inventory_alerts`            | Alert inventario                                |
| `invoice_anomalies`           | Anomalie rilevate sulle fatture                 |
| `invoice_import_rows`         | Righe importate dalle fatture                   |
| `invoice_imports`             | Testate degli import fattura                    |
| `messages`                    | Messaggi tra locali e admin                     |
| `notifications`               | Notifiche interne                               |
| `order_items`                 | Righe prodotto della struttura ordini evolutiva |
| `orders`                      | Testata ordini evolutiva                        |
| `ordini`                      | Ordini operativi attualmente usati              |
| `product_price_history`       | Storico variazioni prezzo                       |
| `products`                    | Anagrafica prodotti                             |
| `restaurant_product_settings` | Impostazioni prodotto per locale                |
| `restaurants`                 | Anagrafica locali                               |
| `stock_entries`               | Movimenti di magazzino                          |

---

# Tabella: restaurants

## Scopo

Contiene l'anagrafica dei locali che utilizzano OrdiniSiver.

È una delle tabelle centrali del sistema perché identifica il locale in quasi tutti i flussi operativi.

## Colonne

| Colonna         | Tipo                        | Nullable | Default              |
| --------------- | --------------------------- | -------- | -------------------- |
| `id`            | uuid                        | NO       | `uuid_generate_v4()` |
| `name`          | text                        | NO       | null                 |
| `pin_code`      | text                        | NO       | null                 |
| `active`        | boolean                     | YES      | true                 |
| `created_at`    | timestamp without time zone | YES      | now()                |
| `email`         | text                        | YES      | null                 |
| `invoice_alias` | text                        | YES      | null                 |

## Utilizzata da

* Login locale
* Dashboard locale
* Giacenze
* Nuovo ordine
* Messaggi
* Dashboard admin
* Consegne
* Statistiche
* Import fatture

## Tabelle collegate

* `ordini`
* `orders`
* `messages`
* `notifications`
* `giacenze_settimana`
* `restaurant_product_settings`
* `invoice_imports`
* `stock_entries`
* `breakages`

## Regole di business

* Ogni locale deve avere un nome e un PIN.
* Il PIN permette l'accesso lato locale.
* `active` può essere usato per disattivare un locale senza eliminarne lo storico.
* `invoice_alias` può essere usato per collegare nomi diversi provenienti dalle fatture.

## Miglioramenti futuri

* Gestione responsabile locale.
* Ruolo supervisore.
* Indirizzo locale.
* Telefono.
* Orari operativi.
* Configurazioni personalizzate per locale.

---

# Tabella: products

## Scopo

Contiene l'anagrafica unica dei prodotti utilizzati da ordini, giacenze, consegne, import prezzi e report.

## Colonne

| Colonna         | Tipo                        | Nullable | Default              |
| --------------- | --------------------------- | -------- | -------------------- |
| `id`            | uuid                        | NO       | `uuid_generate_v4()` |
| `supplier_code` | text                        | YES      | null                 |
| `name`          | text                        | NO       | null                 |
| `category`      | text                        | YES      | null                 |
| `unit`          | text                        | YES      | null                 |
| `active`        | boolean                     | YES      | true                 |
| `created_at`    | timestamp without time zone | YES      | now()                |
| `price`         | numeric                     | YES      | 0                    |

## Utilizzata da

* Nuovo ordine
* Giacenze
* Admin prodotti
* Dashboard admin
* Consegne
* Import prezzi
* Statistiche
* Soglie giacenze
* Alert

## Tabelle collegate

* `restaurant_product_settings`
* `product_price_history`
* `order_items`
* `inventory_alerts`
* `stock_entries`
* `breakages`
* `invoice_import_rows`

## Regole di business

* `supplier_code` è il codice fornitore usato per il matching con fatture e consegne.
* I prodotti con `active = false` non dovrebbero comparire nelle schermate operative.
* `price` rappresenta il prezzo corrente.
* Le variazioni di prezzo dovrebbero essere storicizzate in `product_price_history`.

## Miglioramenti futuri

* Fornitore.
* Codice a barre.
* Immagine prodotto.
* IVA.
* Unità di acquisto.
* Unità di consumo.
* Storico modifiche anagrafica.
* Disattivazione con motivazione.

---

# Tabella: restaurant_product_settings

## Scopo

Contiene le impostazioni specifiche di un prodotto per un determinato locale.

Serve per configurare soglie minime/massime e attivazione prodotto per locale.

## Colonne

| Colonna         | Tipo    | Nullable | Default              |
| --------------- | ------- | -------- | -------------------- |
| `id`            | uuid    | NO       | `uuid_generate_v4()` |
| `restaurant_id` | uuid    | YES      | null                 |
| `product_id`    | uuid    | YES      | null                 |
| `min_stock`     | numeric | YES      | 0                    |
| `max_stock`     | numeric | YES      | 0                    |
| `active`        | boolean | YES      | true                 |
| `prodotto_id`   | uuid    | YES      | null                 |

## Utilizzata da

* Soglie giacenze
* Alert
* Giacenze
* Dashboard admin

## Tabelle collegate

* `restaurants`
* `products`

## Regole di business

* Ogni impostazione dovrebbe riferirsi a un locale e a un prodotto.
* `min_stock` e `max_stock` servono per generare alert o controlli operativi.
* `active` permette di escludere un prodotto per un locale specifico.

## Nota tecnica

Sono presenti sia `product_id` sia `prodotto_id`. Questa duplicazione va verificata e normalizzata.

## Miglioramenti futuri

* Rimuovere il campo duplicato se non più necessario.
* Aggiungere storico modifiche soglie.
* Aggiungere utente che ha modificato la soglia.
* Aggiungere data ultima modifica.

---

# Tabella: ordini

## Scopo

Contiene gli ordini operativi inviati dai locali.

È la tabella principale attualmente usata per ordini, dashboard, consegne e storico.

## Colonne

| Colonna               | Tipo                        | Nullable | Default                 |
| --------------------- | --------------------------- | -------- | ----------------------- |
| `id`                  | bigint                      | NO       | null                    |
| `nome_prodotto`       | text                        | YES      | null                    |
| `quantita`            | bigint                      | YES      | null                    |
| `responsabile`        | text                        | YES      | null                    |
| `locale_id`           | text                        | YES      | null                    |
| `locale_nome`         | text                        | YES      | null                    |
| `created_at`          | timestamp without time zone | YES      | now()                   |
| `quantita_consegnata` | bigint                      | YES      | 0                       |
| `quantita_inevasa`    | bigint                      | YES      | 0                       |
| `stato`               | text                        | YES      | `'ordinato'::text`      |
| `misure`              | text                        | YES      | null                    |
| `settimana_key`       | text                        | YES      | null                    |
| `stato_consegna`      | text                        | YES      | `'da_consegnare'::text` |
| `nota_consegna`       | text                        | YES      | null                    |
| `supplier_code`       | text                        | YES      | null                    |

## Utilizzata da

* Nuovo ordine
* Storico ordini
* Dashboard admin
* Admin ordini
* Consegne
* Storico consegne
* Statistiche
* Alert
* Estrazioni

## Tabelle collegate

* `restaurants`
* `products`
* `notifications`
* `invoice_import_rows`

## Regole di business

* Ogni riga rappresenta un prodotto ordinato da un locale.
* `settimana_key` identifica il periodo/settimana dell'ordine.
* `quantita_consegnata` e `quantita_inevasa` servono per la gestione consegne.
* `stato_consegna` indica se una riga è da consegnare, parziale o completata.
* `supplier_code` permette il collegamento con l'anagrafica prodotti.

## Nota tecnica

`locale_id` è `text`, mentre in altre tabelle `restaurant_id` è `uuid`. Questa differenza va valutata in fase di refactoring.

## Miglioramenti futuri

* Uniformare `locale_id` a uuid.
* Separare testata ordine e righe ordine.
* Migrare gradualmente verso `orders` + `order_items`.
* Aggiungere log modifiche ordine.
* Aggiungere utente che modifica consegne.

---

# Tabella: orders

## Scopo

Rappresenta una struttura evolutiva per la testata ordine.

È pensata per separare la testata dell'ordine dalle righe prodotto, che sono in `order_items`.

## Colonne

| Colonna         | Tipo                        | Nullable | Default              |
| --------------- | --------------------------- | -------- | -------------------- |
| `id`            | uuid                        | NO       | `uuid_generate_v4()` |
| `restaurant_id` | uuid                        | YES      | null                 |
| `status`        | text                        | YES      | `'inviato'::text`    |
| `notes`         | text                        | YES      | null                 |
| `created_at`    | timestamp without time zone | YES      | now()                |
| `created_by`    | text                        | YES      | null                 |

## Utilizzata da

* Struttura ordini evolutiva
* Possibile futura migrazione da `ordini`

## Tabelle collegate

* `restaurants`
* `order_items`

## Regole di business

* Ogni record rappresenta una testata ordine.
* Le righe dovrebbero essere in `order_items`.
* `status` descrive lo stato generale dell'ordine.

## Miglioramenti futuri

* Valutare migrazione completa da `ordini`.
* Aggiungere settimana/periodo ordine.
* Aggiungere responsabile.
* Aggiungere stato consegna globale.

---

# Tabella: order_items

## Scopo

Contiene le righe prodotto collegate alla tabella `orders`.

## Colonne

| Colonna              | Tipo    | Nullable | Default              |
| -------------------- | ------- | -------- | -------------------- |
| `id`                 | uuid    | NO       | `uuid_generate_v4()` |
| `order_id`           | uuid    | YES      | null                 |
| `product_id`         | uuid    | YES      | null                 |
| `requested_quantity` | numeric | YES      | 0                    |
| `approved_quantity`  | numeric | YES      | 0                    |
| `delivered_quantity` | numeric | YES      | 0                    |
| `notes`              | text    | YES      | null                 |

## Utilizzata da

* Struttura ordini evolutiva
* Possibile futura gestione ordini normalizzata

## Tabelle collegate

* `orders`
* `products`

## Regole di business

* Ogni riga deve riferirsi a un ordine e a un prodotto.
* `requested_quantity` è la quantità richiesta.
* `approved_quantity` può essere usata per approvazione admin.
* `delivered_quantity` rappresenta la quantità consegnata.

## Miglioramenti futuri

* Collegamento completo con le consegne.
* Migrazione dal modello `ordini`.
* Gestione quantità approvate.
* Log modifiche riga.

---

# Tabella: giacenze_settimana

## Scopo

Contiene le giacenze settimanali inserite dai locali.

## Colonne

| Colonna            | Tipo                        | Nullable | Default      |
| ------------------ | --------------------------- | -------- | ------------ |
| `id`               | bigint                      | NO       | null         |
| `locale_id`        | text                        | NO       | null         |
| `locale_nome`      | text                        | NO       | null         |
| `responsabile`     | text                        | NO       | null         |
| `nome_prodotto`    | text                        | NO       | null         |
| `quantita`         | bigint                      | NO       | null         |
| `data_inserimento` | date                        | YES      | CURRENT_DATE |
| `created_at`       | timestamp without time zone | YES      | now()        |
| `settimana_key`    | text                        | YES      | null         |

## Utilizzata da

* Giacenze locale
* Dashboard locale
* Storico giacenze
* Dashboard admin
* Alert
* Statistiche

## Tabelle collegate

* `restaurants`
* `products`
* `giacenze_obbligatorie`
* `restaurant_product_settings`

## Regole di business

* Le giacenze devono essere inserite prima dell'ordine.
* Ogni record rappresenta la quantità disponibile di un prodotto in un locale.
* `settimana_key` identifica il periodo operativo.
* Il nome locale e il nome prodotto sono salvati anche come testo per facilitare report e storico.

## Nota tecnica

Come per `ordini`, `locale_id` è `text` e non `uuid`. Valutare uniformazione.

## Miglioramenti futuri

* Usare `product_id` invece di solo `nome_prodotto`.
* Usare `restaurant_id` uuid.
* Aggiungere log modifiche.
* Gestire rettifiche.
* Migliorare confronto tra giacenza, ordini e consegne.

---

# Tabella: giacenze_obbligatorie

## Scopo

Contiene l'elenco dei prodotti obbligatori da monitorare nelle giacenze.

## Colonne

| Colonna         | Tipo    | Nullable | Default |
| --------------- | ------- | -------- | ------- |
| `id`            | bigint  | NO       | null    |
| `nome_prodotto` | text    | YES      | null    |
| `soglia_alert`  | numeric | YES      | 0       |

## Utilizzata da

* Giacenze
* Alert
* Dashboard locale

## Tabelle collegate

* `giacenze_settimana`
* `products`

## Regole di business

* I prodotti presenti in questa tabella vengono richiesti nella compilazione giacenze.
* `soglia_alert` rappresenta una soglia base di controllo.

## Miglioramenti futuri

* Migrare verso `products` + `restaurant_product_settings`.
* Sostituire `nome_prodotto` con `product_id`.
* Gestire obbligatorietà per singolo locale.

---

# Tabella: stock_entries

## Scopo

Contiene movimenti di magazzino o registrazioni stock.

## Colonne

| Colonna         | Tipo                        | Nullable | Default              |
| --------------- | --------------------------- | -------- | -------------------- |
| `id`            | uuid                        | NO       | `uuid_generate_v4()` |
| `restaurant_id` | uuid                        | YES      | null                 |
| `product_id`    | uuid                        | YES      | null                 |
| `quantity`      | numeric                     | YES      | 0                    |
| `created_at`    | timestamp without time zone | YES      | now()                |
| `created_by`    | text                        | YES      | null                 |

## Utilizzata da

* Magazzino evolutivo
* Possibile gestione movimenti futuri

## Tabelle collegate

* `restaurants`
* `products`

## Regole di business

* Ogni movimento dovrebbe indicare locale, prodotto e quantità.
* `created_by` identifica chi ha registrato il movimento.

## Miglioramenti futuri

* Tipo movimento: carico, scarico, rettifica, rottura.
* Collegamento a consegne.
* Collegamento a inventario.
* Storico completo di magazzino.

---

# Tabella: breakages

## Scopo

Contiene rotture, dispersioni o scarti di prodotto.

## Colonne

| Colonna         | Tipo                        | Nullable | Default              |
| --------------- | --------------------------- | -------- | -------------------- |
| `id`            | uuid                        | NO       | `uuid_generate_v4()` |
| `restaurant_id` | uuid                        | YES      | null                 |
| `product_id`    | uuid                        | YES      | null                 |
| `quantity`      | numeric                     | YES      | 0                    |
| `notes`         | text                        | YES      | null                 |
| `created_at`    | timestamp without time zone | YES      | now()                |
| `created_by`    | text                        | YES      | null                 |

## Utilizzata da

* Controllo dispersioni
* Possibile modulo magazzino
* Report futuri

## Tabelle collegate

* `restaurants`
* `products`

## Regole di business

* Ogni rottura deve indicare prodotto e quantità.
* Le note permettono di spiegare il motivo della dispersione.

## Miglioramenti futuri

* Causale rottura.
* Foto allegata.
* Approvazione admin.
* Collegamento a dashboard dispersioni.
* Report mensile scarti.

---

# Tabella: messages

## Scopo

Contiene i messaggi tra locali e amministrazione.

## Colonne

| Colonna         | Tipo                     | Nullable | Default             |
| --------------- | ------------------------ | -------- | ------------------- |
| `id`            | uuid                     | NO       | `gen_random_uuid()` |
| `locale_id`     | uuid                     | NO       | null                |
| `locale_nome`   | text                     | NO       | null                |
| `sender`        | text                     | NO       | null                |
| `message`       | text                     | NO       | null                |
| `is_read`       | boolean                  | YES      | false               |
| `created_at`    | timestamp with time zone | YES      | now()               |
| `nome_mittente` | text                     | YES      | null                |

## Utilizzata da

* Messaggi locale
* Messaggi admin
* Dashboard locale
* Dashboard admin

## Tabelle collegate

* `restaurants`

## Regole di business

* `sender` distingue admin e locale.
* `is_read` gestisce lo stato di lettura.
* Il nome locale è duplicato per facilitare la visualizzazione.

## Miglioramenti futuri

* Thread/conversazioni.
* Allegati.
* Priorità messaggio.
* Notifiche automatiche.
* Ricerca messaggi.

---

# Tabella: notifications

## Scopo

Contiene notifiche interne del sistema.

## Colonne

| Colonna       | Tipo                     | Nullable | Default             |
| ------------- | ------------------------ | -------- | ------------------- |
| `id`          | uuid                     | NO       | `gen_random_uuid()` |
| `created_at`  | timestamp with time zone | YES      | now()               |
| `type`        | text                     | YES      | null                |
| `title`       | text                     | YES      | null                |
| `message`     | text                     | YES      | null                |
| `severity`    | text                     | YES      | `'info'::text`      |
| `locale_id`   | uuid                     | YES      | null                |
| `locale_nome` | text                     | YES      | null                |
| `read`        | boolean                  | YES      | false               |
| `source`      | text                     | YES      | null                |
| `source_id`   | text                     | YES      | null                |

## Utilizzata da

* Dashboard admin
* Alert
* Import fatture
* Consegne
* Controlli automatici

## Tabelle collegate

* `restaurants`
* `ordini`
* `products`
* `invoice_import_rows`

## Regole di business

* `severity` indica il livello della notifica.
* `read` permette di distinguere notifiche lette e non lette.
* `source` e `source_id` collegano la notifica all'origine.

## Miglioramenti futuri

* Notifiche per ruolo.
* Scadenza notifica.
* Azione collegata.
* Centro notifiche avanzato.

---

# Tabella: inventory_alerts

## Scopo

Contiene alert legati all'inventario o alle soglie prodotto.

## Colonne

| Colonna              | Tipo                     | Nullable | Default             |
| -------------------- | ------------------------ | -------- | ------------------- |
| `id`                 | uuid                     | NO       | `gen_random_uuid()` |
| `product_id`         | uuid                     | YES      | null                |
| `user_id`            | uuid                     | YES      | null                |
| `current_quantity`   | numeric                  | NO       | null                |
| `threshold_quantity` | numeric                  | NO       | null                |
| `status`             | text                     | YES      | `'open'::text`      |
| `created_at`         | timestamp with time zone | YES      | now()               |
| `resolved_at`        | timestamp with time zone | YES      | null                |

## Utilizzata da

* Alert
* Dashboard admin
* Controllo giacenze

## Tabelle collegate

* `products`
* `restaurant_product_settings`

## Regole di business

* Un alert nasce quando la quantità corrente supera o scende sotto una soglia.
* `status` indica se l'alert è aperto o risolto.
* `resolved_at` viene valorizzato quando l'alert viene chiuso.

## Miglioramenti futuri

* Collegamento diretto al locale.
* Tipologia alert.
* Motivo risoluzione.
* Utente che ha risolto.

---

# Tabella: alert_log

## Scopo

Registra gli alert inviati o tentati dal sistema.

## Colonne

| Colonna         | Tipo                     | Nullable | Default             |
| --------------- | ------------------------ | -------- | ------------------- |
| `id`            | uuid                     | NO       | `gen_random_uuid()` |
| `locale_id`     | uuid                     | YES      | null                |
| `locale_nome`   | text                     | YES      | null                |
| `email`         | text                     | YES      | null                |
| `tipo_alert`    | text                     | YES      | null                |
| `settimana_key` | text                     | YES      | null                |
| `inviato`       | boolean                  | YES      | false               |
| `errore`        | text                     | YES      | null                |
| `created_at`    | timestamp with time zone | YES      | now()               |

## Utilizzata da

* Alert automatici
* Controllo invio notifiche/email

## Tabelle collegate

* `restaurants`

## Regole di business

* Ogni alert inviato dovrebbe generare un record.
* `inviato` indica se l'invio è andato a buon fine.
* `errore` contiene il messaggio di errore in caso di fallimento.

## Miglioramenti futuri

* Retry automatico.
* Stato invio più dettagliato.
* Destinatari multipli.
* Log canale notifica.

---

# Tabella: invoice_imports

## Scopo

Contiene la testata degli import fattura.

## Colonne

| Colonna           | Tipo                     | Nullable | Default             |
| ----------------- | ------------------------ | -------- | ------------------- |
| `id`              | uuid                     | NO       | `gen_random_uuid()` |
| `created_at`      | timestamp with time zone | YES      | now()               |
| `supplier`        | text                     | YES      | null                |
| `invoice_number`  | text                     | YES      | null                |
| `invoice_date`    | date                     | YES      | null                |
| `restaurant_id`   | uuid                     | YES      | null                |
| `restaurant_name` | text                     | YES      | null                |
| `total`           | numeric                  | YES      | 0                   |
| `pdf_name`        | text                     | YES      | null                |
| `pdf_url`         | text                     | YES      | null                |
| `imported_by`     | text                     | YES      | null                |
| `rows_count`      | integer                  | YES      | 0                   |
| `notes`           | text                     | YES      | null                |

## Utilizzata da

* Import fatture
* Storico fatture
* Alert
* Dashboard admin

## Tabelle collegate

* `invoice_import_rows`
* `restaurants`

## Regole di business

* Ogni import fattura deve avere una testata.
* Le righe della fattura sono salvate in `invoice_import_rows`.
* `rows_count` aiuta a controllare quante righe sono state importate.
* `pdf_name` e `pdf_url` permettono di risalire al file originale.

## Miglioramenti futuri

* Stato import.
* Validazione totale fattura.
* Collegamento a fornitore.
* Allegati multipli.

---

# Tabella: invoice_import_rows

## Scopo

Contiene le righe prodotto estratte dalle fatture importate.

## Colonne

| Colonna             | Tipo                     | Nullable | Default             |
| ------------------- | ------------------------ | -------- | ------------------- |
| `id`                | uuid                     | NO       | `gen_random_uuid()` |
| `created_at`        | timestamp with time zone | YES      | now()               |
| `invoice_import_id` | uuid                     | YES      | null                |
| `supplier_code`     | text                     | YES      | null                |
| `product_name`      | text                     | YES      | null                |
| `quantity`          | numeric                  | YES      | 0                   |
| `unit_price`        | numeric                  | YES      | 0                   |
| `total_price`       | numeric                  | YES      | 0                   |
| `matched_order_id`  | uuid                     | YES      | null                |
| `matched`           | boolean                  | YES      | false               |
| `anomaly`           | boolean                  | YES      | false               |
| `anomaly_note`      | text                     | YES      | null                |

## Utilizzata da

* Import fatture
* Storico fatture
* Alert
* Prezzi
* Consegne

## Tabelle collegate

* `invoice_imports`
* `products`
* `ordini`

## Regole di business

* `supplier_code` viene usato per collegare la riga al prodotto.
* `matched` indica se la riga è stata abbinata a un ordine/prodotto.
* `anomaly` segnala problemi di import o prezzo.
* `anomaly_note` descrive il problema.

## Miglioramenti futuri

* Collegamento più preciso con righe ordine.
* Gestione IVA.
* Gestione sconti.
* Gestione unità misura.
* Matching assistito manuale.

---

# Tabella: invoice_anomalies

## Scopo

Contiene anomalie rilevate durante import o analisi delle fatture.

## Colonne

| Colonna           | Tipo    | Nullable | Default |
| ----------------- | ------- | -------- | ------- |
| `invoice_number`  | text    | YES      | null    |
| `invoice_date`    | date    | YES      | null    |
| `restaurant_name` | text    | YES      | null    |
| `supplier_code`   | text    | YES      | null    |
| `product_name`    | text    | YES      | null    |
| `quantity`        | numeric | YES      | null    |
| `unit_price`      | numeric | YES      | null    |
| `total_price`     | numeric | YES      | null    |
| `anomaly`         | boolean | YES      | null    |
| `anomaly_note`    | text    | YES      | null    |

## Utilizzata da

* Alert fatture
* Storico fatture
* Controlli import

## Tabelle collegate

* `invoice_import_rows`
* `products`

## Regole di business

* Ogni anomalia deve indicare fattura, prodotto e motivo.
* `anomaly_note` deve essere leggibile dall'amministrazione.

## Miglioramenti futuri

* Aggiungere `id`.
* Collegare a `invoice_import_id`.
* Collegare a `product_id`.
* Aggiungere stato risoluzione.

---

# Tabella: product_price_history

## Scopo

Contiene lo storico delle variazioni prezzo dei prodotti.

## Colonne

| Colonna             | Tipo                     | Nullable | Default             |
| ------------------- | ------------------------ | -------- | ------------------- |
| `id`                | uuid                     | NO       | `gen_random_uuid()` |
| `created_at`        | timestamp with time zone | YES      | now()               |
| `product_id`        | uuid                     | YES      | null                |
| `supplier_code`     | text                     | YES      | null                |
| `product_name`      | text                     | YES      | null                |
| `supplier`          | text                     | YES      | `'Siver'::text`     |
| `invoice_number`    | text                     | YES      | null                |
| `invoice_date`      | date                     | YES      | null                |
| `old_price`         | numeric                  | YES      | null                |
| `new_price`         | numeric                  | YES      | null                |
| `variation_percent` | numeric                  | YES      | null                |
| `source`            | text                     | YES      | `'invoice'::text`   |

## Utilizzata da

* Import prezzi
* Dashboard admin
* Alert prezzi
* Storico fatture
* Statistiche

## Tabelle collegate

* `products`
* `invoice_imports`
* `invoice_import_rows`

## Regole di business

* Ogni variazione prezzo rilevante dovrebbe generare uno storico.
* `old_price` e `new_price` indicano la variazione.
* `variation_percent` permette di evidenziare aumenti anomali.
* `source` indica l'origine della variazione.

## Miglioramenti futuri

* Utente che ha approvato la variazione.
* Stato variazione: proposta, accettata, rifiutata.
* Alert automatici sopra soglia percentuale.
* Report mensile aumenti prezzo.

---

# Tabella: admin_menu_preferences

## Scopo

Memorizza le preferenze di ordinamento del menu amministratore per utente.

## Colonne

| Colonna      | Tipo                     | Nullable | Default        |
| ------------ | ------------------------ | -------- | -------------- |
| `user_id`    | uuid                     | NO       | null           |
| `item_order` | ARRAY                    | NO       | `'{}'::text[]` |
| `updated_at` | timestamp with time zone | NO       | now()          |

## Utilizzata da

* Menu admin
* Layout admin

## Tabelle collegate

* Supabase Auth users

## Regole di business

* Ogni admin può avere un ordine personalizzato delle voci menu.
* `item_order` contiene l'elenco ordinato delle voci.

## Miglioramenti futuri

* Preferenze tema.
* Menu preferiti.
* Sezioni collassate.
* Layout dashboard personalizzato.

---

# Note tecniche generali

## Tabelle operative storiche

Attualmente esistono sia:

* `ordini`
* `orders`
* `order_items`

`ordini` sembra essere la tabella operativa principale attualmente usata dall'app.

`orders` e `order_items` rappresentano una struttura più normalizzata, probabilmente pensata per evoluzioni future.

## Campi duplicati o da verificare

* `restaurant_product_settings.product_id`
* `restaurant_product_settings.prodotto_id`

Va verificato quale dei due campi sia effettivamente usato dal codice.

## Tipi da uniformare

Alcune tabelle usano `locale_id` come `text`, altre usano `restaurant_id` come `uuid`.

Nel refactoring futuro conviene uniformare verso `uuid`.

## Tabelle da consolidare

* `invoice_anomalies` potrebbe essere consolidata con `invoice_import_rows`.
* `giacenze_obbligatorie` potrebbe evolvere verso `products` + `restaurant_product_settings`.
* `ordini` potrebbe essere migrata verso `orders` + `order_items`.

---

# Priorità future database

1. Uniformare identificativi locale/prodotto.
2. Definire relazioni e foreign key.
3. Documentare policy RLS.
4. Aggiungere storico modifiche per prodotti, soglie e ordini.
5. Migrare gradualmente verso una struttura ordini normalizzata.
6. Creare backup SQL completo dello schema.
