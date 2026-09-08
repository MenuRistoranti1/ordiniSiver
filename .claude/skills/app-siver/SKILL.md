---
name: app-siver
description: Contesto operativo dell'app Ordini Siver (gestionale ordini/giacenze Next.js + Supabase) - come avviarla in locale e da mobile, com'è fatta l'architettura, a che punto è il refactor phase-1, e quali trappole evitare. Usare quando si lavora su questo repo - avvio dell'app, login admin o locale, refactor delle pagine, modifiche ai dati.
---

# App Siver — contesto operativo

Gestionale ordini, giacenze e forniture per i locali Siver. Il codice sta tutto in
`ordini-siver-app/`; il `package.json` alla radice è un residuo con due dipendenze.

## ⚠️ Regola numero uno: si lavora sui dati veri

`ordini-siver-app/.env.local` contiene le chiavi del Supabase **di produzione**.
Non esiste staging, non esiste seed locale: `npm run dev` legge e scrive il database
usato dai 54 utenti reali (53 `locale` + 1 `admin`).

Quindi: in sviluppo leggere liberamente, ma **prima di scrivere** (inviare giacenze,
creare ordini, modificare prodotti o soglie, lanciare script con la service-role key
che bypassa le RLS) avvisare e chiedere conferma.

## Avviare l'app

```bash
cd ordini-siver-app && npm run dev
```

- Desktop: http://localhost:3000
- Da telefono: l'indirizzo `Network` stampato all'avvio (es. http://192.168.2.41:3000)

**Trappola nota (già capitata):** se dal telefono la pagina resta bloccata su
"Verifica sessione…", quasi sempre non è un bug dell'app ma `allowedDevOrigins` in
`next.config.ts`, che elenca IP fissi di reti precedenti. Quando l'IP del Mac cambia,
Next blocca le risorse `/_next/*` per l'origin nuovo, il JS non si idrata e la pagina
resta congelata sul primo render SSR — che è esattamente la schermata "Verifica
sessione…". Nel log del dev server compare `⚠ Blocked cross-origin request`.
Rimedio: aggiungere l'IP corrente alla lista e riavviare.

## Accessi

Due schermate di login che funzionano in modo **diverso**:

| Area | Rotta | Cosa si inserisce |
|---|---|---|
| Admin | `/admin` | l'**email** vera (`signInWithPassword({ email })`). Non esiste nessuno username "admin" |
| Locali | `/` | uno **username**, che il codice trasforma in `<username>@local.siver.internal` |

C'è **un solo utente admin** (`role: "admin"` in `app_metadata`), ed è l'email della
proprietaria del repo. Le password sono hash bcrypt: non sono recuperabili da nessuna
parte, né dal repo né dal database. Se serve rientrare: il pulsante di reset nella
pagina `/admin` invia la mail di recupero; in alternativa si può generare un magic link
o impostare una password nuova con la service-role key — ma sono azioni sull'unico
account admin di produzione, quindi si chiede prima.

Gli utenti `locale` hanno username tipo `rdiaz`, `vporrello`, e ognuno è legato a uno o
più ristoranti (`TONNARELLO SCALA`, `TONNARELLO SANTA MARIA`, …).

## Stack

Next.js 16.2.6 (App Router, React Compiler attivo), React 19.2.4, Tailwind 4,
TypeScript strict, Supabase (auth + Postgres), deploy su Vercel (branch di produzione:
`production`). Extra: `exceljs`, `pdf-parse`/`pdfjs-dist` per l'import fatture,
`nodemailer`/`resend` per gli alert, un cron in `vercel.json` che chiama
`/api/check-missing-orders` ogni domenica alle 23.

## Architettura

Due aree separate per route group, entrambe client-side:

| | `(locale)` | `(admin)` |
|---|---|---|
| Guard | `LocaleRouteGuard` → `app_metadata.role === "locale"` | `AdminRouteGuard` → `role === "admin"` |
| Shell | `LocaleShell` mobile-first (PWA) | `AdminV2Shell` sidebar desktop |
| Pagine | dashboard, giacenze, nuovo-ordine, storico ×2, messaggi, documenti | ~22 pagine |

Il locale selezionato vive in `localStorage` (`locale_id`, `locale_nome`,
`locale_scelto`): è di fatto il "tenant corrente" letto da tutte le pagine locale.

**Due canali verso i dati:** le pagine parlano direttamente a Supabase con la anon key
(`lib/supabase.ts`), mentre le API route usano la service-role key con un
`verificaAdmin()` che valida il Bearer token. La sicurezza è quindi delegata alle RLS
di Supabase, che **non sono versionate** in questo repo.

**Dominio** (~22 tabelle): `products`, `restaurants`, `ordini`, `giacenze_settimana`,
`restaurant_product_settings` (soglie min/max per locale), `documents`/`document_rows`,
`messages`, `notifications`, `invoice_imports`/`invoice_import_rows`,
`local_users`/`local_user_restaurants`, `alert_log`, `categories`, `units`.

Il ciclo è settimanale e ancorato al **sabato**: `settimana_key` = data del sabato
corrente. Attenzione, `sabatoCorrente()` è duplicata a mano in almeno 4 file.

## Il refactor (branch `refactor/phase-1`)

Convivono **tre generazioni di codice**:

1. **Legacy monolitico** — pagine da 500-1200 righe con fetch, stato e UI mescolati.
   Le più grosse: `nuovo-ordine` (1223), `admin-alert` (1067), `admin-prodotti` (1036),
   `giacenze` (1001).
2. **CRUD engine + modules** — `components/crud-engine/` + `modules/`, config-driven,
   usato solo da `admin-categories`, `admin-units`, `admin-products-v2`.
3. **Pattern phase-1** — `types/` → `services/` → `hooks/use*` → pagina dichiarativa.
   È la direzione attuale. Riferimento: la dashboard, passata da 1365 righe a 313 di
   sola UI + `useLocaleDashboard.ts` + `dashboard.service.ts`.

**Dove si era arrivati:** dashboard, messaggi e documenti sono stati convertiti
(commit `ab0cf4a`). Il pezzo in corso è **giacenze**: `types/inventory.ts` e
`services/inventory.service.ts` sono scritti, **`hooks/useLocaleInventory.ts` è ancora
vuoto** e la pagina non è stata toccata. Il passo naturale successivo è scrivere
l'hook e alleggerire la pagina, seguendo il modello della dashboard.

## Cose da sapere prima di toccare il codice

- **Prodotti implementati tre volte**: pagina legacy, `admin-prodotti/hooks+components/`,
  e `admin-products-v2` sul crud-engine. Anche il service è doppio
  (`modules/products/service.ts` e `services/products.service.ts`).
- **Codice morto**: `core/crud/useCrud.ts` (astrazione CRUD parallela, la usa solo
  `modules/categories`), `modules/index.ts` e `CrudModuleByKey.tsx` (nessuno li importa),
  `DashboardQuickActions.tsx` (creato e mai usato), e i 5 file in
  `lib/document-center/` creati vuoti e mai riempiti.
- **Pagine orfane**, raggiungibili solo via URL perché assenti dal menu di `AdminV2Shell`:
  `admin-documenti`, `admin-statistiche`, `admin-cancellazioni`, `admin-estrazioni`,
  `admin-responsabili`, `admin-storico-consegne`, `admin-giacenze`, `admin-products-v2`.
- **`any` diffuso** nonostante `strict: true`, e **nessun test** nel repo. La verifica
  disponibile è `npx tsc --noEmit` e `npm run lint`.
- L'auth locale è ricontrollata a mano in ogni pagina (`getUser` + check ruolo + lettura
  di `localStorage`) invece di passare da `hooks/useLocale.ts`, che esiste già ed è usato
  solo dal guard.
- **Le schermate di verifica sessione devono sempre uscire dal loading.** Le funzioni che
  chiamano `supabase.auth.getUser()` all'avvio ora hanno `try/catch`: senza, un errore di
  rete o Safari iOS in navigazione privata (dove `localStorage` solleva un'eccezione)
  lasciano la pagina appesa per sempre, senza messaggio. Mantenere questa gestione in
  qualsiasi nuovo guard o hook di sessione.

## Convenzioni

Il codice è **in italiano** — nomi di funzioni, variabili, messaggi UI, commit
(`refactor:`, `feat(...)`, `chore:`). Mantenere questa lingua. Niente punto e virgola
nei file nuovi, doppi apici, componenti funzione con `export default` per le pagine.
