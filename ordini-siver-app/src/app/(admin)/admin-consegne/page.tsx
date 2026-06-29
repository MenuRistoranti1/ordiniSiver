"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/Toast";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

type RigaFattura = {
  codice: string;
  codiceLetto: string;
  codiceCorretto: boolean;
  prodotto: string;
  quantita: number;
  prezzo?: number;
  prodottoAnagrafica?: string;
  productId?: string;
  prezzoAnagrafica?: number;
  prezzoVariato?: boolean;
  variazionePercentuale?: number;
};

export default function AdminConsegne() {
  const { showToast } = useToast();

  const [locali, setLocali] = useState<any[]>([]);
  const [localeId, setLocaleId] = useState("");
  const [ordini, setOrdini] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [ricerca, setRicerca] = useState("");

  const [fileFattura, setFileFattura] = useState<File | null>(null);
  const [righeFattura, setRigheFattura] = useState<RigaFattura[]>([]);
  const [localeFattura, setLocaleFattura] = useState<any | null>(null);
  const [numeroFattura, setNumeroFattura] = useState("");
  const [dataFattura, setDataFattura] = useState<string | null>(null);
  const [loadingFattura, setLoadingFattura] = useState(false);
  const [savingStoricoFattura, setSavingStoricoFattura] = useState(false);
  const [storicoFatturaId, setStoricoFatturaId] = useState<string | null>(null);

  useEffect(() => {
    if (localStorage.getItem("admin") !== "true") {
      window.location.href = "/admin";
      return;
    }

    caricaLocali();
  }, []);

  function getSettimanaKey() {
    const oggi = new Date();
    const giorno = oggi.getDay();
    const diff = giorno >= 6 ? giorno - 6 : giorno + 1;
    const sabato = new Date(oggi);

    sabato.setDate(oggi.getDate() - diff);
    sabato.setHours(0, 0, 0, 0);

    return sabato.toISOString().split("T")[0];
  }

  async function caricaLocali() {
    const { data, error } = await supabase
      .from("restaurants")
      .select("id, name, invoice_alias")
      .order("name", { ascending: true });

    if (error) {
      console.log(error);
      showToast("Errore caricamento locali", "error");
      return;
    }

    setLocali(data || []);
  }

  async function caricaOrdini(id: string) {
    setLocaleId(id);
    setOrdini([]);

    if (!id) return;

    setLoading(true);

    const { data: ordiniDb, error } = await supabase
      .from("ordini")
      .select("*")
      .eq("locale_id", id)
      .eq("settimana_key", getSettimanaKey())
      .order("nome_prodotto", { ascending: true });

    if (error) {
      console.log(error);
      showToast("Errore caricamento ordini", "error");
      setLoading(false);
      return;
    }

    const { data: prodottiDb } = await supabase
      .from("products")
      .select("id, name, supplier_code");

    const ordiniConCodice = (ordiniDb || []).map((ordine: any) => {
      let supplierCode = ordine.supplier_code || "";

      if (!supplierCode) {
        const prodotto = (prodottiDb || []).find((p: any) => {
          const nomeOrdine = normalizza(ordine.nome_prodotto);
          const nomeProdotto = normalizza(p.name);

          return (
            nomeOrdine === nomeProdotto ||
            nomeOrdine.includes(nomeProdotto) ||
            nomeProdotto.includes(nomeOrdine)
          );
        });

        supplierCode = prodotto?.supplier_code || "";
      }

      return {
        ...ordine,
        supplier_code: supplierCode,
        quantita_consegnata: ordine.quantita_consegnata ?? "",
        stato_consegna: ordine.stato_consegna || "da_consegnare",
        nota_consegna: ordine.nota_consegna || "",
      };
    });

    setOrdini(ordiniConCodice);
    setLoading(false);
  }

  function normalizza(testo: string) {
    return String(testo || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function normalizzaCodice(codice: string) {
    return String(codice || "")
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "");
  }

  function parseNumero(valore: string) {
    const pulito = String(valore || "")
      .replace(/\./g, "")
      .replace(",", ".")
      .replace(/[^0-9.]/g, "");

    return Number(pulito || 0);
  }

  function formatPrezzo(prezzo?: number) {
    if (prezzo === undefined || prezzo === null || Number.isNaN(prezzo))
      return "-";
    return `${prezzo.toFixed(3).replace(".", ",")} €`;
  }

  function arrotondaPrezzo(prezzo?: number) {
    return Number(Number(prezzo || 0).toFixed(4));
  }

  function calcolaVariazionePercentuale(prezzoVecchio?: number, prezzoNuovo?: number) {
    const vecchio = Number(prezzoVecchio || 0);
    const nuovo = Number(prezzoNuovo || 0);

    if (!vecchio || vecchio <= 0 || !nuovo || nuovo <= 0) return 0;

    return Number((((nuovo - vecchio) / vecchio) * 100).toFixed(2));
  }

  function prezzoCambiato(prezzoVecchio?: number, prezzoNuovo?: number) {
    const vecchio = arrotondaPrezzo(prezzoVecchio);
    const nuovo = arrotondaPrezzo(prezzoNuovo);

    if (!vecchio || !nuovo) return false;

    return vecchio !== nuovo;
  }

  function codiciCompatibili(codiceOrdine: string, codiceFattura: string) {
    const ordine = normalizzaCodice(codiceOrdine);
    const fattura = normalizzaCodice(codiceFattura);

    if (!ordine || !fattura) return false;

    return ordine === fattura;
  }

  function correggiRigaConAnagrafica(
    riga: RigaFattura,
    prodottiDb: any[],
  ): RigaFattura {
    const codiceLetto = normalizzaCodice(riga.codice);

    if (!codiceLetto) return riga;

    const prodottiValidi = (prodottiDb || []).filter((p: any) =>
      normalizzaCodice(p.supplier_code),
    );

    const esatto = prodottiValidi.find(
      (p: any) => normalizzaCodice(p.supplier_code) === codiceLetto,
    );

    if (esatto) {
      return {
        ...riga,
        codice: esatto.supplier_code,
        codiceLetto: riga.codiceLetto || riga.codice,
        codiceCorretto: false,
        prodottoAnagrafica: esatto.name,
        productId: esatto.id,
        prezzoAnagrafica: Number(esatto.price || 0),
        prezzoVariato: prezzoCambiato(Number(esatto.price || 0), riga.prezzo),
        variazionePercentuale: calcolaVariazionePercentuale(
          Number(esatto.price || 0),
          riga.prezzo,
        ),
      };
    }

    const candidati = prodottiValidi.filter((p: any) => {
      const codiceAnagrafica = normalizzaCodice(p.supplier_code);
      return codiceAnagrafica.endsWith(codiceLetto);
    });

    if (candidati.length === 1) {
      return {
        ...riga,
        codice: candidati[0].supplier_code,
        codiceLetto: riga.codiceLetto || riga.codice,
        codiceCorretto: true,
        prodottoAnagrafica: candidati[0].name,
        productId: candidati[0].id,
        prezzoAnagrafica: Number(candidati[0].price || 0),
        prezzoVariato: prezzoCambiato(Number(candidati[0].price || 0), riga.prezzo),
        variazionePercentuale: calcolaVariazionePercentuale(
          Number(candidati[0].price || 0),
          riga.prezzo,
        ),
      };
    }

    return {
      ...riga,
      codiceLetto: riga.codiceLetto || riga.codice,
      codiceCorretto: false,
    };
  }

  function trovaLocaleDaFattura(testo: string) {
    const testoNorm = normalizza(testo);

    return (
      locali.find((locale) => {
        const alias = normalizza(locale.invoice_alias || "");
        const nome = normalizza(locale.name || "");

        if (alias && testoNorm.includes(alias)) return true;
        if (nome && testoNorm.includes(nome)) return true;

        return false;
      }) || null
    );
  }

  function estraiNumeroFattura(testo: string) {
    const matchAccompagnatoria = testo.match(
      /Fattura\s+Accompagnatoria\s+N[°º]?\s+([0-9]+\/[0-9A-Z]+)/i,
    );

    if (matchAccompagnatoria?.[1]) return matchAccompagnatoria[1];

    const matchElettronica = testo.match(
      /TD01\s+fattura\s+([0-9]+\/[0-9A-Z]+)\s+\d{2}[-/]\d{2}[-/]\d{4}/i,
    );

    return matchElettronica?.[1] || "";
  }

  function estraiDataFattura(testo: string) {
    const matchElettronica = testo.match(
      /TD01\s+fattura\s+[0-9]+\/[0-9A-Z]+\s+(\d{2})[-/](\d{2})[-/](\d{4})/i,
    );

    if (matchElettronica?.[1] && matchElettronica?.[2] && matchElettronica?.[3]) {
      return `${matchElettronica[3]}-${matchElettronica[2]}-${matchElettronica[1]}`;
    }

    const matchAccompagnatoria = testo.match(
      /Fattura\s+Accompagnatoria\s+N[°º]?\s+[0-9]+\/[0-9A-Z]+\s+Data\s+(\d{2})[-/](\d{2})[-/](\d{4})/i,
    );

    if (
      matchAccompagnatoria?.[1] &&
      matchAccompagnatoria?.[2] &&
      matchAccompagnatoria?.[3]
    ) {
      return `${matchAccompagnatoria[3]}-${matchAccompagnatoria[2]}-${matchAccompagnatoria[1]}`;
    }

    return null;
  }

  function calcolaTotaleRighe(righe: RigaFattura[]) {
    return righe.reduce(
      (sum, riga) => sum + Number(riga.quantita || 0) * Number(riga.prezzo || 0),
      0,
    );
  }

  function descriviAnomalia(riga: RigaFattura, ordineMatch: any | null) {
    const note: string[] = [];

    if (!ordineMatch) {
      note.push("Nessun ordine abbinato");
    }

    if (riga.codiceCorretto) {
      note.push(`Codice corretto da ${riga.codiceLetto} a ${riga.codice}`);
    }

    if (ordineMatch) {
      const ordinata = Number(ordineMatch.quantita || 0);
      const consegnata = Number(riga.quantita || 0);

      if (ordinata > 0 && consegnata !== ordinata) {
        note.push(`Quantità diversa: ordinata ${ordinata}, fattura ${consegnata}`);
      }
    }

    if (riga.prezzoVariato) {
      const variazione = Number(riga.variazionePercentuale || 0);
      const segno = variazione > 0 ? "+" : "";
      note.push(
        `Prezzo variato: listino ${formatPrezzo(
          riga.prezzoAnagrafica,
        )}, fattura ${formatPrezzo(riga.prezzo)} (${segno}${variazione.toFixed(
          2,
        )}%)`,
      );
    }

    return note.join(" · ");
  }

  async function salvaStoricoPrezzi(righe: RigaFattura[]) {
    const righeConPrezzoVariato = righe.filter(
      (riga) =>
        riga.productId &&
        riga.codice &&
        riga.prezzo &&
        riga.prezzo > 0 &&
        riga.prezzoAnagrafica &&
        riga.prezzoAnagrafica > 0 &&
        prezzoCambiato(riga.prezzoAnagrafica, riga.prezzo),
    );

    if (righeConPrezzoVariato.length === 0) return 0;

    const records: any[] = [];

    for (const riga of righeConPrezzoVariato) {
      const { data: giaPresente } = await supabase
        .from("product_price_history")
        .select("id")
        .eq("supplier_code", riga.codice)
        .eq("invoice_number", numeroFattura || "Senza numero")
        .eq("new_price", Number(riga.prezzo || 0))
        .limit(1);

      if (giaPresente && giaPresente.length > 0) continue;

      records.push({
        product_id: riga.productId || null,
        supplier_code: riga.codice,
        product_name: riga.prodottoAnagrafica || riga.prodotto,
        supplier: "Siver",
        invoice_number: numeroFattura || "Senza numero",
        invoice_date: dataFattura,
        old_price: Number(riga.prezzoAnagrafica || 0),
        new_price: Number(riga.prezzo || 0),
        variation_percent: Number(riga.variazionePercentuale || 0),
        source: "invoice",
      });
    }

    if (records.length === 0) return 0;

    const { error } = await supabase
      .from("product_price_history")
      .insert(records);

    if (error) throw error;

    return records.length;
  }

  async function salvaStoricoFattura(
    righe: RigaFattura[],
    ordiniAggiornati: any[],
  ) {
    if (storicoFatturaId) return storicoFatturaId;

    const numero = numeroFattura || "Senza numero";
    const totale = calcolaTotaleRighe(righe);

    const { data: importData, error: importError } = await supabase
      .from("invoice_imports")
      .insert({
        supplier: "Siver",
        invoice_number: numero,
        invoice_date: dataFattura,
        restaurant_id: localeFattura?.id || localeId || null,
        restaurant_name: localeFattura?.name || null,
        total: Number(totale.toFixed(2)),
        pdf_name: fileFattura?.name || null,
        pdf_url: null,
        imported_by: localStorage.getItem("admin_email") || "admin",
        rows_count: righe.length,
        notes: "Importata da pagina consegne",
      })
      .select("id")
      .single();

    if (importError) throw importError;

    const invoiceImportId = importData.id;

    const rows = righe.map((riga) => {
      const ordineMatch =
        ordiniAggiornati.find((ordine) =>
          codiciCompatibili(ordine.supplier_code || "", riga.codice || ""),
        ) || null;

      const anomalyNote = descriviAnomalia(riga, ordineMatch);

      return {
        invoice_import_id: invoiceImportId,
        supplier_code: riga.codice,
        product_name: riga.prodottoAnagrafica || riga.prodotto,
        quantity: Number(riga.quantita || 0),
        unit_price: Number(riga.prezzo || 0),
        total_price: Number(
          (Number(riga.quantita || 0) * Number(riga.prezzo || 0)).toFixed(2),
        ),
        matched_order_id: ordineMatch?.id || null,
        matched: Boolean(ordineMatch),
        anomaly: Boolean(anomalyNote),
        anomaly_note: anomalyNote || null,
      };
    });

    const { error: rowsError } = await supabase
      .from("invoice_import_rows")
      .insert(rows);

    if (rowsError) throw rowsError;

    setStoricoFatturaId(invoiceImportId);
    return invoiceImportId;
  }

  function estraiRigheFattura(testo: string): RigaFattura[] {
    const risultati: RigaFattura[] = [];

    const testoUnico = testo
      .replace(/\(CODICE\)/gi, " ")
      .replace(/\s+/g, " ")
      .trim();

    const blocchi = testoUnico
      .split(/(?=\d{2,4}-\d{4,6}\s+)/g)
      .map((riga) => riga.trim())
      .filter(Boolean);

    for (const blocco of blocchi) {
      const match = blocco.match(
        /^(\d{2,4}-\d{4,6})\s+(.+?)\s+(\d+(?:[,.]\d+)?)\s+(\d+(?:[,.]\d+)?)\s*(?:€\s*)?(?:-?\d+(?:[,.]\d+)?%\s+)?(?:\d{1,2}[,.]\d{2}\s+)?\d+(?:[,.]\d+)?(?:\s|€|$)/i,
      );

      if (!match) continue;

      const codice = match[1];
      const prodotto = match[2].trim();
      const quantita = parseNumero(match[3]);
      const prezzo = parseNumero(match[4]);

      if (!codice || !prodotto || !quantita || quantita <= 0) continue;

      risultati.push({
        codice,
        codiceLetto: codice,
        codiceCorretto: false,
        prodotto,
        quantita,
        prezzo,
      });
    }

    return risultati;
  }

  async function leggiFatturaPdf() {
    if (!fileFattura) {
      showToast("Seleziona prima una fattura PDF", "warning");
      return;
    }

    setLoadingFattura(true);
    setRigheFattura([]);
    setLocaleFattura(null);
    setNumeroFattura("");
    setDataFattura(null);
    setStoricoFatturaId(null);

    try {
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
        import.meta.url,
      ).toString();

      const arrayBuffer = await fileFattura.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      let testoCompleto = "";

      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        const page = await pdf.getPage(pageNumber);
        const content = await page.getTextContent();

        const testoPagina = content.items
          .map((item: any) => item.str)
          .join(" ");

        testoCompleto += "\n" + testoPagina;
      }

      console.log("TESTO PDF LETTO:", testoCompleto);

      const locale = trovaLocaleDaFattura(testoCompleto);
      const numero = estraiNumeroFattura(testoCompleto);
      const dataFatturaLetta = estraiDataFattura(testoCompleto);

      const { data: prodottiDb, error: prodottiError } = await supabase
        .from("products")
        .select("id, name, supplier_code, price");

      if (prodottiError) {
        console.log(prodottiError);
        showToast("Errore caricamento anagrafica prodotti", "error");
        setLoadingFattura(false);
        return;
      }

      const righe = estraiRigheFattura(testoCompleto).map((riga) =>
        correggiRigaConAnagrafica(riga, prodottiDb || []),
      );

      console.log("NUMERO FATTURA:", numero);
      console.log("RIGHE FATTURA TROVATE:", righe);

      setLocaleFattura(locale);
      setNumeroFattura(numero);
      setDataFattura(dataFatturaLetta);
      setRigheFattura(righe);

      if (locale) {
        await caricaOrdini(locale.id);
        showToast(`Locale riconosciuto: ${locale.name}`, "success");
      } else {
        showToast("Locale non riconosciuto", "warning");
      }

      if (righe.length > 0) {
        showToast(`Trovate ${righe.length} righe prodotto`, "success");
      } else {
        showToast("Nessuna riga prodotto trovata nella fattura", "warning");
      }
    } catch (error) {
      console.log(error);
      showToast("Errore lettura PDF fattura", "error");
    }

    setLoadingFattura(false);
  }

  function trovaOrdinePerRiga(riga: RigaFattura) {
    return ordini.find((ordine) =>
      codiciCompatibili(ordine.supplier_code || "", riga.codice || ""),
    );
  }

  async function applicaFatturaAgliOrdini() {
    if (!localeFattura) {
      showToast("Locale fattura non riconosciuto", "warning");
      return;
    }

    if (righeFattura.length === 0) {
      showToast("Nessuna riga fattura da applicare", "warning");
      return;
    }

    if (savingStoricoFattura) return;

    setSavingStoricoFattura(true);

    try {
      const nuovi = [...ordini];
      let applicati = 0;
      let nonAbbinati = 0;
      let anomalie = 0;

      righeFattura.forEach((riga) => {
        const index = nuovi.findIndex((ordine) =>
          codiciCompatibili(ordine.supplier_code || "", riga.codice || ""),
        );

        if (index === -1) {
          nonAbbinati++;
          anomalie++;
          return;
        }

        const ordinata = Number(nuovi[index].quantita || 0);
        const consegnata = Number(riga.quantita || 0);

        if (ordinata > 0 && consegnata !== ordinata) {
          anomalie++;
        }

        if (riga.codiceCorretto) {
          anomalie++;
        }

        nuovi[index].quantita_consegnata = consegnata;
        nuovi[index].nota_consegna = numeroFattura
          ? `Fattura ${numeroFattura} · Codice ${riga.codice} · Prezzo ${formatPrezzo(riga.prezzo)}`
          : `Da fattura PDF · Codice ${riga.codice} · Prezzo ${formatPrezzo(riga.prezzo)}`;

        if (consegnata <= 0) {
          nuovi[index].stato_consegna = "da_consegnare";
        } else if (consegnata < ordinata) {
          nuovi[index].stato_consegna = "parziale";
        } else {
          nuovi[index].stato_consegna = "consegnato";
        }

        applicati++;
      });

      await salvaStoricoFattura(righeFattura, nuovi);
      const prezziSalvati = await salvaStoricoPrezzi(righeFattura);
      setOrdini(nuovi);

      if (applicati === 0) {
        showToast(
          `Storico salvato. Nessun prodotto fattura combacia con gli ordini. Prezzi storicizzati: ${prezziSalvati}`,
          "warning",
        );
      } else if (nonAbbinati > 0 || anomalie > 0) {
        showToast(
          `Storico salvato. ${applicati} righe applicate, ${nonAbbinati} non abbinate, ${anomalie} anomalie, ${prezziSalvati} prezzi storicizzati`,
          "warning",
        );
      } else {
        showToast(
          `Storico salvato. ${applicati} righe applicate agli ordini. Prezzi storicizzati: ${prezziSalvati}`,
          "success",
        );
      }
    } catch (error) {
      console.log(error);
      showToast("Errore salvataggio storico fattura", "error");
    }

    setSavingStoricoFattura(false);
  }

  function aggiornaConsegna(index: number, valore: string) {
    const nuovi = [...ordini];
    const consegnata = Number(valore || 0);
    const ordinata = Number(nuovi[index].quantita || 0);

    nuovi[index].quantita_consegnata = valore;

    if (consegnata <= 0) {
      nuovi[index].stato_consegna = "da_consegnare";
    } else if (consegnata < ordinata) {
      nuovi[index].stato_consegna = "parziale";
    } else {
      nuovi[index].stato_consegna = "consegnato";
    }

    setOrdini(nuovi);
  }

  function aggiornaNota(index: number, valore: string) {
    const nuovi = [...ordini];
    nuovi[index].nota_consegna = valore;
    setOrdini(nuovi);
  }

  async function salvaConsegne() {
    if (isSaving) return;

    if (!localeId) {
      showToast("Seleziona prima un locale", "warning");
      return;
    }

    setIsSaving(true);

    for (const ordine of ordini) {
      const consegnata = Number(ordine.quantita_consegnata || 0);
      const ordinata = Number(ordine.quantita || 0);

      if (isNaN(consegnata) || consegnata < 0) {
        showToast("Controlla le quantità consegnate", "warning");
        setIsSaving(false);
        return;
      }

      let stato = "da_consegnare";

      if (consegnata <= 0) {
        stato = "da_consegnare";
      } else if (consegnata < ordinata) {
        stato = "parziale";
      } else {
        stato = "consegnato";
      }

      const { error } = await supabase
        .from("ordini")
        .update({
          quantita_consegnata: consegnata,
          stato_consegna: stato,
          nota_consegna: ordine.nota_consegna || null,
        })
        .eq("id", ordine.id);

      if (error) {
        console.log(error);
        showToast("Errore salvataggio consegne", "error");
        setIsSaving(false);
        return;
      }
    }

    showToast("Consegne salvate correttamente", "success");
    setIsSaving(false);
    caricaOrdini(localeId);
  }

  async function logout() {
    await supabase.auth.signOut()
    localStorage.removeItem("admin")
    localStorage.removeItem("admin_mode")
    window.location.href = "/admin"
  }

  const ordiniFiltrati = useMemo(() => {
    const q = ricerca.toLowerCase().trim();

    if (!q) return ordini;

    return ordini.filter((ordine) =>
      [
        ordine.nome_prodotto,
        ordine.supplier_code,
        ordine.locale_nome,
        ordine.responsabile,
        ordine.stato_consegna,
        ordine.nota_consegna,
      ]
        .filter(Boolean)
        .some((valore) => String(valore).toLowerCase().includes(q)),
    );
  }, [ordini, ricerca]);

  const totaleOrdinato = ordiniFiltrati.reduce(
    (sum, ordine) => sum + Number(ordine.quantita || 0),
    0,
  );

  const totaleConsegnato = ordiniFiltrati.reduce(
    (sum, ordine) => sum + Number(ordine.quantita_consegnata || 0),
    0,
  );

  const totaleInevaso = Math.max(totaleOrdinato - totaleConsegnato, 0);

  function badgeStato(stato: string) {
    if (stato === "consegnato") {
      return "bg-green-50 text-green-700 border-green-200";
    }

    if (stato === "parziale") {
      return "bg-amber-50 text-amber-700 border-amber-200";
    }

    return "bg-slate-100 text-slate-700 border-slate-200";
  }
  return (
    <main className="min-h-screen bg-slate-100 px-3 pb-24 pt-4 sm:px-5 sm:pb-4 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-4">
        <section className="rounded-2xl bg-slate-950 p-4 text-white shadow-lg">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-lg font-bold tracking-tight sm:text-xl">
                OrdiniSiver
              </h1>

              <p className="mt-0.5 text-xs font-medium text-slate-300">
                Admin · Gestione consegne
              </p>
            </div>

            <button
              onClick={logout}
              disabled={isSaving}
              className="rounded-lg bg-red-500 px-3 py-2 text-xs font-bold text-white disabled:bg-slate-500"
            >
              Logout
            </button>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              onClick={() => (window.location.href = "/admin-dashboard")}
              disabled={isSaving}
              className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white"
            >
              Home Admin
            </button>

            <button
              onClick={() => window.history.back()}
              disabled={isSaving}
              className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-white"
            >
              Indietro
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-black text-slate-950">
            Carica fattura PDF
          </h2>

          <p className="mt-1 text-sm font-bold text-slate-600">
            Il sistema legge locale, numero fattura, prodotti e quantità
            consegnate.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_180px_220px]">
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => setFileFattura(e.target.files?.[0] || null)}
              className="h-14 rounded-2xl border-2 border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-950"
            />

            <button
              onClick={leggiFatturaPdf}
              disabled={loadingFattura || isSaving}
              className="h-14 rounded-2xl bg-blue-600 px-4 text-sm font-black text-white disabled:bg-slate-400"
            >
              {loadingFattura ? "Lettura..." : "Leggi PDF"}
            </button>

            <button
              onClick={applicaFatturaAgliOrdini}
              disabled={!localeFattura || righeFattura.length === 0 || isSaving || savingStoricoFattura}
              className="h-14 rounded-2xl bg-green-600 px-4 text-sm font-black text-white disabled:bg-slate-400"
            >
              {savingStoricoFattura ? "Salvataggio..." : "Applica alla consegna"}
            </button>
          </div>

          {(localeFattura || righeFattura.length > 0 || numeroFattura) && (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm font-black text-slate-950">
                Locale riconosciuto: {localeFattura?.name || "Non riconosciuto"}
              </p>

              <p className="mt-1 text-sm font-bold text-slate-700">
                Fattura: {numeroFattura || "Non rilevata"}
                {dataFattura ? ` · Data: ${dataFattura}` : ""}
              </p>

              {storicoFatturaId && (
                <p className="mt-1 text-xs font-black text-green-700">
                  Storico fattura salvato
                </p>
              )}

              <div className="mt-3 space-y-2">
                {righeFattura.map((riga, index) => {
                  const ordineMatch = trovaOrdinePerRiga(riga);

                  return (
                    <div
                      key={`${riga.codice}-${index}`}
                      className="rounded-xl border border-slate-200 bg-white p-3 text-sm"
                    >
                      <div className="font-black text-slate-950">
                        {riga.prodotto}
                      </div>

                      <div className="mt-1 text-xs font-bold text-slate-600">
                        Codice: {riga.codice} · Quantità: {riga.quantita} ·
                        Prezzo: {formatPrezzo(riga.prezzo)}
                      </div>

                      {riga.codiceCorretto && (
                        <div className="mt-1 text-xs font-black text-blue-700">
                          Corretto da {riga.codiceLetto} a {riga.codice}
                        </div>
                      )}

                      {riga.prezzoVariato && (
                        <div
                          className={`mt-1 text-xs font-black ${
                            Number(riga.variazionePercentuale || 0) > 0
                              ? "text-red-700"
                              : "text-green-700"
                          }`}
                        >
                          Prezzo variato: listino {formatPrezzo(riga.prezzoAnagrafica)} ·
                          fattura {formatPrezzo(riga.prezzo)} ·
                          variazione {Number(riga.variazionePercentuale || 0) > 0 ? "+" : ""}
                          {Number(riga.variazionePercentuale || 0).toFixed(2)}%
                        </div>
                      )}

                      <div
                        className={`mt-2 text-xs font-black ${
                          ordineMatch ? "text-green-700" : "text-red-700"
                        }`}
                      >
                        {ordineMatch
                          ? `Abbinato a ordine: ${ordineMatch.nome_prodotto}`
                          : "Nessun ordine abbinato"}
                      </div>

                      {descriviAnomalia(riga, ordineMatch) && (
                        <div className="mt-1 text-xs font-black text-amber-700">
                          Anomalia: {descriviAnomalia(riga, ordineMatch)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        <section className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <select
            value={localeId}
            onChange={(e) => caricaOrdini(e.target.value)}
            disabled={isSaving}
            className="h-14 rounded-2xl border-2 border-slate-300 bg-white px-4 text-base font-bold text-slate-950 outline-none focus:border-blue-600"
          >
            <option value="">Seleziona locale</option>

            {locali.map((locale) => (
              <option key={locale.id} value={locale.id}>
                {locale.name}
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Cerca prodotto, responsabile, stato..."
            value={ricerca}
            onChange={(e) => setRicerca(e.target.value)}
            className="h-14 rounded-2xl border-2 border-slate-300 bg-white px-4 text-base font-bold text-slate-950 placeholder:text-slate-500 outline-none focus:border-blue-600 lg:col-span-2"
          />
        </section>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-bold text-slate-500">Totale ordinato</p>
            <h3 className="mt-2 text-3xl font-black text-slate-950">
              {totaleOrdinato}
            </h3>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-bold text-slate-500">
              Totale consegnato
            </p>
            <h3 className="mt-2 text-3xl font-black text-green-700">
              {totaleConsegnato}
            </h3>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-bold text-slate-500">Totale inevaso</p>
            <h3 className="mt-2 text-3xl font-black text-amber-700">
              {totaleInevaso}
            </h3>
          </div>
        </section>

        {loading ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm font-bold text-slate-500">
            Caricamento ordini...
          </section>
        ) : (
          <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:overflow-hidden md:p-0">
            <div className="hidden grid-cols-[1fr_110px_100px_150px_140px_1fr] bg-slate-950 text-[11px] font-bold uppercase tracking-wide text-white md:grid">
              <div className="px-3 py-2.5">Prodotto</div>
              <div className="px-3 py-2.5">Codice</div>
              <div className="px-3 py-2.5">Ordinato</div>
              <div className="px-3 py-2.5">Consegnato</div>
              <div className="px-3 py-2.5">Stato</div>
              <div className="px-3 py-2.5">Nota</div>
            </div>

            <div className="hidden md:block">
              {ordiniFiltrati.map((ordine, index) => {
                const realIndex = ordini.findIndex((o) => o.id === ordine.id);
                const stato = ordine.stato_consegna || "da_consegnare";

                return (
                  <div
                    key={ordine.id}
                    className={`grid grid-cols-[1fr_110px_100px_150px_140px_1fr] items-center border-b border-slate-100 ${
                      index % 2 === 0 ? "bg-white" : "bg-slate-50"
                    }`}
                  >
                    <div className="min-w-0 px-3 py-3">
                      <p className="truncate text-sm font-bold text-slate-950">
                        {ordine.nome_prodotto}
                      </p>
                      <p className="mt-0.5 text-xs font-bold text-slate-600">
                        {ordine.responsabile || "Senza responsabile"}
                      </p>
                    </div>

                    <div className="px-3 py-3 text-xs font-black text-slate-700">
                      {ordine.supplier_code || "-"}
                    </div>

                    <div className="px-3 py-3 text-sm font-black text-slate-900">
                      {ordine.quantita}
                    </div>

                    <div className="px-3 py-2">
                      <input
                        type="number"
                        inputMode="decimal"
                        placeholder="0"
                        value={ordine.quantita_consegnata ?? ""}
                        disabled={isSaving}
                        onChange={(e) =>
                          aggiornaConsegna(realIndex, e.target.value)
                        }
                        className="h-10 w-full rounded-lg border-2 border-slate-300 bg-white px-3 text-right text-sm font-bold text-slate-950 outline-none focus:border-blue-600"
                      />
                    </div>

                    <div className="px-3 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-wide ${badgeStato(
                          stato,
                        )}`}
                      >
                        {stato.replace("_", " ")}
                      </span>
                    </div>

                    <div className="px-3 py-2">
                      <input
                        type="text"
                        placeholder="Nota consegna"
                        value={ordine.nota_consegna || ""}
                        disabled={isSaving}
                        onChange={(e) =>
                          aggiornaNota(realIndex, e.target.value)
                        }
                        className="h-10 w-full rounded-lg border-2 border-slate-300 bg-white px-3 text-sm font-bold text-slate-950 placeholder:text-slate-500 outline-none focus:border-blue-600"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="space-y-3 md:hidden">
              {ordiniFiltrati.map((ordine) => {
                const realIndex = ordini.findIndex((o) => o.id === ordine.id);
                const stato = ordine.stato_consegna || "da_consegnare";

                return (
                  <div
                    key={ordine.id}
                    className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
                  >
                    <h3 className="text-sm font-black leading-tight text-slate-950">
                      {ordine.nome_prodotto}
                    </h3>

                    <p className="mt-1 text-xs font-bold text-slate-600">
                      {ordine.responsabile || "Senza responsabile"}
                    </p>

                    <p className="mt-1 text-xs font-black text-slate-500">
                      Codice: {ordine.supplier_code || "-"}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-lg bg-blue-100 px-2 py-1 text-xs font-black text-blue-700">
                        Ordinato: {ordine.quantita}
                      </span>

                      <span
                        className={`rounded-lg border px-2 py-1 text-xs font-black uppercase ${badgeStato(
                          stato,
                        )}`}
                      >
                        {stato.replace("_", " ")}
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-2">
                      <input
                        type="number"
                        inputMode="decimal"
                        placeholder="Quantità consegnata"
                        value={ordine.quantita_consegnata ?? ""}
                        disabled={isSaving}
                        onChange={(e) =>
                          aggiornaConsegna(realIndex, e.target.value)
                        }
                        className="h-14 rounded-2xl border-2 border-slate-300 bg-white px-4 text-base font-black text-slate-950 placeholder:text-slate-500 outline-none focus:border-blue-600"
                      />

                      <input
                        type="text"
                        placeholder="Nota consegna"
                        value={ordine.nota_consegna || ""}
                        disabled={isSaving}
                        onChange={(e) =>
                          aggiornaNota(realIndex, e.target.value)
                        }
                        className="h-14 rounded-2xl border-2 border-slate-300 bg-white px-4 text-base font-bold text-slate-950 placeholder:text-slate-500 outline-none focus:border-blue-600"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {!localeId && (
              <div className="px-4 py-8 text-center text-sm font-semibold text-slate-500">
                Seleziona un locale o carica una fattura.
              </div>
            )}

            {localeId && ordiniFiltrati.length === 0 && (
              <div className="px-4 py-8 text-center text-sm font-semibold text-slate-500">
                Nessun ordine trovato per questo locale.
              </div>
            )}
          </section>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-3 shadow-2xl backdrop-blur sm:hidden">
        <button
          onClick={salvaConsegne}
          disabled={!localeId || ordini.length === 0 || isSaving}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-5 text-base font-bold text-white disabled:bg-slate-400"
        >
          {isSaving ? "Salvataggio..." : "Salva consegne"}
        </button>
      </div>

      <button
        onClick={salvaConsegne}
        disabled={!localeId || ordini.length === 0 || isSaving}
        className="mx-auto mt-4 hidden h-12 w-full max-w-7xl items-center justify-center gap-2 rounded-xl bg-green-600 px-5 text-base font-bold text-white disabled:bg-slate-400 sm:flex"
      >
        {isSaving ? "Salvataggio..." : "Salva consegne"}
      </button>
    </main>
  );
}