"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Edit3,
  EyeOff,
  Package,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type Prodotto = {
  id: string | number;
  name: string | null;
  supplier_code: string | null;
  category: string | null;
  unit: string | null;
  price: string | number | null;
  active: boolean | null;
};

type FormProdotto = {
  id: string;
  name: string;
  supplier_code: string;
  category: string;
  unit: string;
  price: string;
  active: boolean;
};

type Ordinamento = "nome" | "codice" | "prezzo_desc" | "prezzo_asc" | "stato";

type Filtro = "tutti" | "attivi" | "inattivi" | "senza_codice" | "senza_prezzo";

const FORM_VUOTO: FormProdotto = {
  id: "",
  name: "",
  supplier_code: "",
  category: "Siver",
  unit: "pz",
  price: "",
  active: true,
};

export default function AdminProdotti() {
  const [products, setProducts] = useState<Prodotto[]>([]);
  const [usage, setUsage] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errore, setErrore] = useState("");
  const [messaggio, setMessaggio] = useState("");
  const [ricerca, setRicerca] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("tutti");
  const [ordinamento, setOrdinamento] = useState<Ordinamento>("nome");
  const [editorAperto, setEditorAperto] = useState(false);
  const [form, setForm] = useState<FormProdotto>(FORM_VUOTO);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selezionati, setSelezionati] = useState<string[]>([]);

  useEffect(() => {
    inizializza();
  }, []);

  async function inizializza() {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      window.location.href = "/admin";
      return;
    }

    if (user.app_metadata?.role !== "admin") {
      await supabase.auth.signOut();
      window.location.href = "/admin";
      return;
    }

    await caricaProdotti();
  }

  async function caricaProdotti() {
    setLoading(true);
    setErrore("");

    const [productsRes, settingsRes] = await Promise.all([
      supabase
        .from("products")
        .select("id, name, supplier_code, category, unit, price, active")
        .order("name"),
      supabase
        .from("restaurant_product_settings")
        .select("restaurant_id, product_id, prodotto_id, active")
        .eq("active", true),
    ]);

    if (productsRes.error) {
      console.error(productsRes.error);
      setErrore("Impossibile caricare l'anagrafica prodotti.");
      setLoading(false);
      return;
    }

    const conteggi: Record<string, Set<string>> = {};

    (settingsRes.data || []).forEach((riga: any) => {
      const productId = String(riga.product_id || riga.prodotto_id || "");
      const restaurantId = String(riga.restaurant_id || "");
      if (!productId || !restaurantId) return;
      if (!conteggi[productId]) conteggi[productId] = new Set();
      conteggi[productId].add(restaurantId);
    });

    const usageMap: Record<string, number> = {};
    Object.keys(conteggi).forEach((id) => {
      usageMap[id] = conteggi[id].size;
    });

    setProducts((productsRes.data || []) as Prodotto[]);
    setUsage(usageMap);
    setSelezionati([]);
    setLoading(false);
  }

  function vai(percorso: string) {
    window.location.href = percorso;
  }

  function normalizza(testo: unknown) {
    return String(testo || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function normalizzaCodice(codice: unknown) {
    return String(codice || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "");
  }

  function prezzoNumero(prezzo: unknown) {
    const numero = Number(String(prezzo || "0").replace(",", "."));
    return Number.isFinite(numero) ? numero : 0;
  }

  function euro(valore: unknown) {
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "EUR",
    }).format(prezzoNumero(valore));
  }

  const prodottiFiltrati = useMemo(() => {
    const query = normalizza(ricerca);

    const risultato = products.filter((prodotto) => {
      const testo = normalizza(
        [
          prodotto.supplier_code,
          prodotto.name,
          prodotto.category,
          prodotto.unit,
        ]
          .filter(Boolean)
          .join(" "),
      );

      if (query && !testo.includes(query)) return false;
      if (filtro === "attivi" && prodotto.active === false) return false;
      if (filtro === "inattivi" && prodotto.active !== false) return false;
      if (filtro === "senza_codice" && normalizzaCodice(prodotto.supplier_code))
        return false;
      if (filtro === "senza_prezzo" && prezzoNumero(prodotto.price) > 0)
        return false;

      return true;
    });

    return risultato.sort((a, b) => {
      if (ordinamento === "codice") {
        return String(a.supplier_code || "").localeCompare(
          String(b.supplier_code || ""),
          "it",
        );
      }
      if (ordinamento === "prezzo_desc")
        return prezzoNumero(b.price) - prezzoNumero(a.price);
      if (ordinamento === "prezzo_asc")
        return prezzoNumero(a.price) - prezzoNumero(b.price);
      if (ordinamento === "stato") {
        const pesoA = a.active === false ? 2 : 1;
        const pesoB = b.active === false ? 2 : 1;
        return pesoA - pesoB;
      }
      return String(a.name || "").localeCompare(String(b.name || ""), "it");
    });
  }, [products, ricerca, filtro, ordinamento]);

  const attivi = products.filter((p) => p.active !== false).length;
  const inattivi = products.filter((p) => p.active === false).length;
  const senzaCodice = products.filter(
    (p) => p.active !== false && !normalizzaCodice(p.supplier_code),
  ).length;
  const senzaPrezzo = products.filter(
    (p) => p.active !== false && prezzoNumero(p.price) <= 0,
  ).length;

  function nuovoProdotto() {
    setForm(FORM_VUOTO);
    setMessaggio("");
    setErrore("");
    setEditorAperto(true);
  }

  function modificaProdotto(prodotto: Prodotto) {
    setForm({
      id: String(prodotto.id),
      name: prodotto.name || "",
      supplier_code: prodotto.supplier_code || "",
      category: prodotto.category || "",
      unit: prodotto.unit || "",
      price: String(prodotto.price ?? ""),
      active: prodotto.active !== false,
    });
    setMessaggio("");
    setErrore("");
    setEditorAperto(true);
  }

  async function salvaProdotto(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessaggio("");
    setErrore("");

    if (!form.name.trim()) {
      setErrore("Inserisci il nome del prodotto.");
      return;
    }

    const codice = normalizzaCodice(form.supplier_code);
    const duplicato = codice
      ? products.find(
          (p) =>
            normalizzaCodice(p.supplier_code) === codice &&
            String(p.id) !== form.id,
        )
      : null;

    if (duplicato) {
      setErrore(
        `Il codice ${form.supplier_code.trim()} è già associato a ${duplicato.name || "un altro prodotto"}.`,
      );
      return;
    }

    setSaving(true);

    const payload = {
      name: form.name.trim(),
      supplier_code: form.supplier_code.trim() || null,
      category: form.category.trim() || null,
      unit: form.unit.trim() || "pz",
      price: prezzoNumero(form.price),
      active: form.active,
    };

    const risultato = form.id
      ? await supabase.from("products").update(payload).eq("id", form.id)
      : await supabase.from("products").insert(payload);

    if (risultato.error) {
      console.error(risultato.error);
      setErrore(`Errore salvataggio prodotto: ${risultato.error.message}`);
      setSaving(false);
      return;
    }

    setMessaggio(
      form.id
        ? "Prodotto aggiornato correttamente."
        : "Prodotto aggiunto correttamente.",
    );
    setEditorAperto(false);
    await caricaProdotti();
    setSaving(false);
  }

  async function cambiaStato(prodotto: Prodotto) {
    setErrore("");
    setMessaggio("");

    const nuovoStato = prodotto.active === false;
    const { error } = await supabase
      .from("products")
      .update({ active: nuovoStato })
      .eq("id", prodotto.id);

    if (error) {
      setErrore(`Errore aggiornamento stato: ${error.message}`);
      return;
    }

    setMessaggio(nuovoStato ? "Prodotto attivato." : "Prodotto disattivato.");
    await caricaProdotti();
  }

  async function cambiaStatoMassivo(attivo: boolean) {
    if (selezionati.length === 0) return;

    const conferma = window.confirm(
      `${attivo ? "Attivare" : "Disattivare"} ${selezionati.length} prodotti selezionati?`,
    );

    if (!conferma) return;

    setSaving(true);
    const { error } = await supabase
      .from("products")
      .update({ active: attivo })
      .in("id", selezionati);

    if (error) {
      setErrore(`Errore aggiornamento prodotti: ${error.message}`);
      setSaving(false);
      return;
    }

    setMessaggio(`${selezionati.length} prodotti aggiornati.`);
    await caricaProdotti();
    setSaving(false);
  }

  async function eliminaProdotto(prodotto: Prodotto) {
    setErrore("");
    setMessaggio("");

    const nomeProdotto = prodotto.name || "Prodotto senza nome";
    const conferma = window.confirm(
      `Vuoi cancellare definitivamente “${nomeProdotto}”?\n\nLa cancellazione è consentita solo se il prodotto non è già presente negli ordini.`,
    );

    if (!conferma) return;

    setDeletingId(String(prodotto.id));

    try {
      let controllo = supabase
        .from("ordini")
        .select("id", { count: "exact", head: true });

      if (normalizzaCodice(prodotto.supplier_code)) {
        controllo = controllo.ilike(
          "supplier_code",
          String(prodotto.supplier_code).trim(),
        );
      } else {
        controllo = controllo.ilike("nome_prodotto", nomeProdotto.trim());
      }

      const { count, error: erroreControllo } = await controllo;

      if (erroreControllo) throw erroreControllo;

      if ((count || 0) > 0) {
        setErrore(
          `Non puoi cancellare “${nomeProdotto}” perché è già presente in ${count} ordine/i. Usa Disattiva per conservarne lo storico.`,
        );
        return;
      }

      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", prodotto.id);
      if (error) throw error;

      setMessaggio(`Prodotto “${nomeProdotto}” cancellato definitivamente.`);
      await caricaProdotti();
    } catch (error: any) {
      console.error(error);
      setErrore(
        `Errore cancellazione prodotto: ${error?.message || "operazione non riuscita"}`,
      );
    } finally {
      setDeletingId(null);
    }
  }

  async function esportaExcel(esportaTutti: boolean) {
    const righe = esportaTutti ? products : prodottiFiltrati;

    if (righe.length === 0) {
      alert("Nessun prodotto da esportare.");
      return;
    }

    const ExcelJS = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Anagrafica prodotti");

    worksheet.columns = [
      { header: "Codice", key: "codice", width: 20 },
      { header: "Nome prodotto", key: "nome", width: 48 },
      { header: "Categoria", key: "categoria", width: 20 },
      { header: "Unità", key: "unita", width: 14 },
      { header: "Prezzo", key: "prezzo", width: 16 },
      { header: "Stato", key: "stato", width: 14 },
      { header: "Locali", key: "locali", width: 12 },
      { header: "Controllo", key: "controllo", width: 30 },
    ];

    righe
      .slice()
      .sort((a, b) =>
        String(a.name || "").localeCompare(String(b.name || ""), "it"),
      )
      .forEach((prodotto) => {
        const anomalie = [];
        if (!normalizzaCodice(prodotto.supplier_code))
          anomalie.push("Senza codice");
        if (prezzoNumero(prodotto.price) <= 0) anomalie.push("Senza prezzo");

        worksheet.addRow({
          codice: prodotto.supplier_code || "",
          nome: prodotto.name || "",
          categoria: prodotto.category || "",
          unita: prodotto.unit || "",
          prezzo: prezzoNumero(prodotto.price),
          stato: prodotto.active === false ? "Inattivo" : "Attivo",
          locali: usage[String(prodotto.id)] || 0,
          controllo: anomalie.join("; ") || "OK",
        });
      });

    worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF2563EB" },
    };
    worksheet.getRow(1).height = 26;
    worksheet.getRow(1).alignment = {
      vertical: "middle",
      horizontal: "center",
    };
    worksheet.getColumn("prezzo").numFmt = "€ #,##0.00";
    worksheet.views = [{ state: "frozen", ySplit: 1 }];
    worksheet.autoFilter = { from: "A1", to: "H1" };

    const dataOggi = new Date().toISOString().split("T")[0];
    const nomeFile = esportaTutti
      ? `anagrafica-prodotti-completa-${dataOggi}.xlsx`
      : `anagrafica-prodotti-filtrata-${dataOggi}.xlsx`;

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([new Uint8Array(buffer)], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = nomeFile;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function toggleSelezione(id: string) {
    setSelezionati((attuali) =>
      attuali.includes(id)
        ? attuali.filter((item) => item !== id)
        : [...attuali, id],
    );
  }

  function toggleSelezionaTutti() {
    const idsVisibili = prodottiFiltrati.map((p) => String(p.id));
    const tuttiSelezionati = idsVisibili.every((id) =>
      selezionati.includes(id),
    );

    if (tuttiSelezionati) {
      setSelezionati((attuali) =>
        attuali.filter((id) => !idsVisibili.includes(id)),
      );
      return;
    }

    setSelezionati((attuali) =>
      Array.from(new Set([...attuali, ...idsVisibili])),
    );
  }

  function StatCard({
    title,
    value,
    note,
    tone,
    icon: Icon,
    onClick,
  }: {
    title: string;
    value: string | number;
    note: string;
    tone: string;
    icon: any;
    onClick?: () => void;
  }) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">
              {title}
            </p>
            <h2 className="mt-2 text-3xl font-black text-slate-950 sm:text-4xl">
              {value}
            </h2>
            <p className="mt-1 text-sm font-bold text-slate-500">{note}</p>
          </div>

          <div className={`rounded-2xl p-3 ${tone}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </button>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <section className="mx-auto w-full max-w-[1600px] space-y-5 p-3 sm:p-5 lg:p-8">
        <header className="rounded-3xl bg-slate-950 p-5 text-white shadow-sm sm:p-7">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-wide text-blue-300">
                Anagrafica prodotti
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">
                Prodotti Siver
              </h1>
              <p className="mt-2 max-w-3xl text-sm font-bold text-slate-300 sm:text-base">
                Gestisci codici fornitore, prezzi, unità di misura, stato
                prodotto e controlli anagrafici.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => vai("/admin-dashboard")}
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-white/10 px-5 text-sm font-black text-white hover:bg-white/15"
              >
                Home
              </button>
              <button
                onClick={caricaProdotti}
                disabled={loading}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-black text-white disabled:bg-slate-600"
              >
                <RefreshCw
                  className={`h-5 w-5 ${loading ? "animate-spin" : ""}`}
                />
                {loading ? "Aggiorno..." : "Aggiorna"}
              </button>
              <button
                onClick={nuovoProdotto}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 text-sm font-black text-white hover:bg-emerald-700"
              >
                <Plus className="h-5 w-5" />
                Nuovo prodotto
              </button>
            </div>
          </div>
        </header>

        {errore && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 font-bold text-red-700">
            {errore}
          </div>
        )}

        {messaggio && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 font-bold text-emerald-700">
            {messaggio}
          </div>
        )}

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Totale prodotti"
            value={products.length}
            note={`${prodottiFiltrati.length} visualizzati`}
            icon={Package}
            tone="bg-blue-100 text-blue-700"
            onClick={() => setFiltro("tutti")}
          />
          <StatCard
            title="Prodotti attivi"
            value={attivi}
            note={`${inattivi} inattivi`}
            icon={CheckCircle2}
            tone="bg-emerald-100 text-emerald-700"
            onClick={() => setFiltro("attivi")}
          />
          <StatCard
            title="Senza codice"
            value={senzaCodice}
            note="Da completare"
            icon={AlertTriangle}
            tone="bg-red-100 text-red-700"
            onClick={() => setFiltro("senza_codice")}
          />
          <StatCard
            title="Senza prezzo"
            value={senzaPrezzo}
            note="Prezzo nullo o mancante"
            icon={AlertTriangle}
            tone="bg-amber-100 text-amber-700"
            onClick={() => setFiltro("senza_prezzo")}
          />
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-2xl font-black text-slate-950">
                Elenco prodotti
              </h2>
              <p className="text-sm font-bold text-slate-500">
                {prodottiFiltrati.length} prodotti visualizzati su{" "}
                {products.length}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => esportaExcel(false)}
                className="inline-flex h-11 items-center gap-2 rounded-2xl bg-emerald-600 px-4 text-sm font-black text-white hover:bg-emerald-700"
              >
                <Download className="h-4 w-4" />
                Excel filtrati
              </button>
              <button
                onClick={() => esportaExcel(true)}
                className="inline-flex h-11 items-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-black text-white hover:bg-slate-800"
              >
                <Download className="h-4 w-4" />
                Excel tutti
              </button>
            </div>
          </div>

          <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_220px_220px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                value={ricerca}
                onChange={(e) => setRicerca(e.target.value)}
                placeholder="Cerca codice, nome, categoria o unità..."
                className="h-12 w-full rounded-2xl border-2 border-slate-200 bg-white pl-12 pr-4 text-sm font-bold text-slate-950 outline-none focus:border-blue-600"
              />
            </div>

            <select
              value={filtro}
              onChange={(e) => setFiltro(e.target.value as Filtro)}
              className="h-12 rounded-2xl border-2 border-slate-200 bg-white px-4 text-sm font-bold text-slate-950 outline-none focus:border-blue-600"
            >
              <option value="tutti">Tutti i prodotti</option>
              <option value="attivi">Solo attivi</option>
              <option value="inattivi">Solo inattivi</option>
              <option value="senza_codice">Senza codice</option>
              <option value="senza_prezzo">Senza prezzo</option>
            </select>

            <select
              value={ordinamento}
              onChange={(e) => setOrdinamento(e.target.value as Ordinamento)}
              className="h-12 rounded-2xl border-2 border-slate-200 bg-white px-4 text-sm font-bold text-slate-950 outline-none focus:border-blue-600"
            >
              <option value="nome">Ordina per nome</option>
              <option value="codice">Ordina per codice</option>
              <option value="prezzo_desc">Prezzo più alto</option>
              <option value="prezzo_asc">Prezzo più basso</option>
              <option value="stato">Ordina per stato</option>
            </select>
          </div>

          {selezionati.length > 0 && (
            <div className="mb-4 flex flex-col gap-2 rounded-2xl border border-blue-100 bg-blue-50 p-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-black text-blue-800">
                {selezionati.length} prodotti selezionati
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => cambiaStatoMassivo(true)}
                  disabled={saving}
                  className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white disabled:bg-slate-400"
                >
                  Attiva
                </button>
                <button
                  type="button"
                  onClick={() => cambiaStatoMassivo(false)}
                  disabled={saving}
                  className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-black text-white disabled:bg-slate-400"
                >
                  Disattiva
                </button>
                <button
                  type="button"
                  onClick={() => setSelezionati([])}
                  className="rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-700"
                >
                  Annulla selezione
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="rounded-2xl bg-slate-50 p-8 text-center text-sm font-bold text-slate-500">
              Caricamento prodotti...
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-[1100px] w-full text-left">
                <thead className="bg-slate-950 text-xs font-black uppercase text-white">
                  <tr>
                    <th className="w-12 px-4 py-4">
                      <input
                        type="checkbox"
                        checked={
                          prodottiFiltrati.length > 0 &&
                          prodottiFiltrati.every((p) =>
                            selezionati.includes(String(p.id)),
                          )
                        }
                        onChange={toggleSelezionaTutti}
                        className="h-4 w-4"
                      />
                    </th>
                    <th className="px-4 py-4">Codice</th>
                    <th className="px-4 py-4">Prodotto</th>
                    <th className="px-4 py-4">Categoria</th>
                    <th className="px-4 py-4">Unità</th>
                    <th className="px-4 py-4 text-right">Prezzo</th>
                    <th className="px-4 py-4 text-center">Locali</th>
                    <th className="px-4 py-4">Stato</th>
                    <th className="px-4 py-4 text-right">Azioni</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 bg-white">
                  {prodottiFiltrati.map((prodotto) => {
                    const senzaCod = !normalizzaCodice(prodotto.supplier_code);
                    const senzaPrez = prezzoNumero(prodotto.price) <= 0;
                    const anomalia = senzaCod || senzaPrez;

                    return (
                      <tr
                        key={String(prodotto.id)}
                        className={`text-sm font-bold text-slate-700 ${
                          anomalia ? "bg-amber-50/50" : "hover:bg-slate-50"
                        }`}
                      >
                        <td className="px-4 py-4">
                          <input
                            type="checkbox"
                            checked={selezionati.includes(String(prodotto.id))}
                            onChange={() =>
                              toggleSelezione(String(prodotto.id))
                            }
                            className="h-4 w-4"
                          />
                        </td>

                        <td className="px-4 py-4">
                          {senzaCod ? (
                            <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-black text-red-700">
                              Senza codice
                            </span>
                          ) : (
                            <span className="font-black text-slate-800">
                              {prodotto.supplier_code}
                            </span>
                          )}
                        </td>

                        <td className="max-w-[360px] px-4 py-4">
                          <p className="truncate font-black text-slate-950">
                            {prodotto.name || "-"}
                          </p>
                          {anomalia && (
                            <p className="mt-1 text-xs font-bold text-amber-700">
                              {[
                                senzaCod ? "codice mancante" : "",
                                senzaPrez ? "prezzo mancante" : "",
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          )}
                        </td>

                        <td className="px-4 py-4">
                          {prodotto.category || "-"}
                        </td>
                        <td className="px-4 py-4">{prodotto.unit || "-"}</td>

                        <td className="px-4 py-4 text-right">
                          {senzaPrez ? (
                            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-black text-amber-700">
                              Mancante
                            </span>
                          ) : (
                            <span className="font-black text-slate-950">
                              {euro(prodotto.price)}
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-4 text-center">
                          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                            {usage[String(prodotto.id)] || 0}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          {prodotto.active === false ? (
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">
                              Inattivo
                            </span>
                          ) : (
                            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">
                              Attivo
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => modificaProdotto(prodotto)}
                              className="rounded-xl bg-blue-50 p-2 text-blue-700 hover:bg-blue-100"
                              title="Modifica prodotto"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => cambiaStato(prodotto)}
                              className={`rounded-xl px-3 py-2 text-xs font-black ${
                                prodotto.active === false
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {prodotto.active === false
                                ? "Attiva"
                                : "Disattiva"}
                            </button>
                            <button
                              onClick={() => eliminaProdotto(prodotto)}
                              disabled={deletingId === String(prodotto.id)}
                              className="rounded-xl bg-red-50 p-2 text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                              title="Cancella definitivamente prodotto"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {prodottiFiltrati.length === 0 && (
                <p className="p-8 text-center text-sm font-bold text-slate-500">
                  Nessun prodotto trovato.
                </p>
              )}
            </div>
          )}
        </section>
      </section>

      {editorAperto && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-sm">
          <div className="h-full w-full max-w-xl overflow-y-auto bg-white p-5 shadow-2xl sm:p-7">
            <div className="mb-6 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-blue-600">
                  Anagrafica prodotti
                </p>
                <h2 className="mt-1 text-2xl font-black text-slate-950">
                  {form.id ? "Modifica prodotto" : "Nuovo prodotto"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setEditorAperto(false)}
                className="rounded-xl bg-slate-100 p-2 text-slate-600 hover:bg-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={salvaProdotto} className="space-y-4">
              <label className="block">
                <span className="mb-1 block text-sm font-black text-slate-700">
                  Nome prodotto *
                </span>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  className="h-14 w-full rounded-2xl border-2 border-slate-200 px-4 font-bold text-slate-950 outline-none focus:border-blue-600"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-black text-slate-700">
                  Codice fornitore
                </span>
                <input
                  value={form.supplier_code}
                  onChange={(e) =>
                    setForm({ ...form, supplier_code: e.target.value })
                  }
                  className="h-14 w-full rounded-2xl border-2 border-slate-200 px-4 font-bold text-slate-950 outline-none focus:border-blue-600"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label>
                  <span className="mb-1 block text-sm font-black text-slate-700">
                    Prezzo
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={(e) =>
                      setForm({ ...form, price: e.target.value })
                    }
                    className="h-14 w-full rounded-2xl border-2 border-slate-200 px-4 font-bold text-slate-950 outline-none focus:border-blue-600"
                  />
                </label>

                <label>
                  <span className="mb-1 block text-sm font-black text-slate-700">
                    Unità di misura
                  </span>
                  <input
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    className="h-14 w-full rounded-2xl border-2 border-slate-200 px-4 font-bold text-slate-950 outline-none focus:border-blue-600"
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-1 block text-sm font-black text-slate-700">
                  Categoria
                </span>
                <input
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                  className="h-14 w-full rounded-2xl border-2 border-slate-200 px-4 font-bold text-slate-950 outline-none focus:border-blue-600"
                />
              </label>

              <label className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) =>
                    setForm({ ...form, active: e.target.checked })
                  }
                  className="h-5 w-5"
                />
                <span className="font-black text-slate-700">
                  Prodotto attivo
                </span>
              </label>

              <div className="sticky bottom-0 -mx-5 mt-8 flex flex-col gap-2 border-t border-slate-200 bg-white p-5 sm:-mx-7 sm:flex-row sm:justify-end sm:p-7">
                <button
                  type="button"
                  onClick={() => setEditorAperto(false)}
                  className="rounded-2xl bg-slate-100 px-5 py-3 font-black text-slate-700 hover:bg-slate-200"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-black text-white disabled:bg-slate-400"
                >
                  <Save className="h-4 w-4" />
                  {saving ? "Salvataggio..." : "Salva prodotto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}