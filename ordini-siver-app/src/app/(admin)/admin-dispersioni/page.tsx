"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Boxes,
  Euro,
  FileDown,
  RefreshCw,
  Search,
  TrendingDown,
  Warehouse,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type RigaAnalisi = {
  locale_id: string;
  locale_nome: string;
  product_id: string | null;
  prodotto_id: string | null;
  supplier_code: string;
  nome_prodotto: string;
  categoria: string;
  unita_misura: string;
  giacenza_precedente: number;
  consegnato: number;
  giacenza_corrente: number;
  differenza: number;
  prezzo_unitario: number;
  valore_differenza: number;
  tipo_anomalia: string;
};

export default function AdminDispersioniPage() {
  const [loading, setLoading] = useState(true);
  const [errore, setErrore] = useState("");
  const [locali, setLocali] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [ordini, setOrdini] = useState<any[]>([]);
  const [giacenze, setGiacenze] = useState<any[]>([]);
  const [analisiSalvate, setAnalisiSalvate] = useState<any[]>([]);
  const [localeId, setLocaleId] = useState("");
  const [ricerca, setRicerca] = useState("");
  const [categoria, setCategoria] = useState("");
  const [soloAnomalie, setSoloAnomalie] = useState(true);

  useEffect(() => {
    inizializza();
  }, []);

  async function inizializza() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      window.location.href = "/admin";
      return;
    }
    if (user.app_metadata?.role !== "admin") {
      await supabase.auth.signOut();
      window.location.href = "/admin";
      return;
    }
    await caricaDati();
  }

  function sabatoCorrente() {
    const oggi = new Date();
    const giorno = oggi.getDay();
    const diff = giorno >= 6 ? giorno - 6 : giorno + 1;
    const sabato = new Date(oggi);
    sabato.setDate(oggi.getDate() - diff);
    sabato.setHours(0, 0, 0, 0);
    return sabato;
  }

  function sabatoPrecedente() {
    const data = sabatoCorrente();
    data.setDate(data.getDate() - 7);
    return data;
  }

  function sabatoSuccessivo() {
    const data = sabatoCorrente();
    data.setDate(data.getDate() + 7);
    return data;
  }

  function iso(data: Date) {
    return data.toISOString();
  }

  function key(data: Date) {
    return data.toISOString().split("T")[0];
  }

  const inizioSettimanaPrecedente = sabatoPrecedente();
  const inizioSettimanaCorrente = sabatoCorrente();
  const fineSettimanaCorrente = sabatoSuccessivo();
  const settimanaCorrenteKey = key(inizioSettimanaCorrente);
  const settimanaPrecedenteKey = key(inizioSettimanaPrecedente);

  function normalizza(testo: any) {
    return String(testo || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function numero(valore: any) {
    const n = Number(String(valore || "0").replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }

  function euro(valore: number) {
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "EUR",
    }).format(valore || 0);
  }

  function dataOra() {
    return new Date().toLocaleString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function dentroPeriodo(createdAt: any, start: Date, end: Date) {
    if (!createdAt) return false;
    const d = new Date(createdAt);
    return d >= start && d < end;
  }

  function trovaProdotto(nome: string, supplierCode?: string) {
    const codice = normalizza(supplierCode || "");
    if (codice) {
      const byCode = products.find((p) => normalizza(p.supplier_code || "") === codice);
      if (byCode) return byCode;
    }
    const nomeNorm = normalizza(nome);
    return products.find((p) => normalizza(p.name || "") === nomeNorm) || null;
  }

  async function caricaDati() {
    setLoading(true);
    setErrore("");
    try {
      const [localiRes, productsRes, ordiniRes, giacenzeRes, analisiRes] = await Promise.all([
        supabase.from("restaurants").select("*").order("name"),
        supabase.from("products").select("id, name, supplier_code, category, unit, active, price").order("name"),
        supabase.from("ordini").select("*").gte("created_at", iso(inizioSettimanaCorrente)).lt("created_at", iso(fineSettimanaCorrente)),
        supabase.from("giacenze_settimana").select("*").gte("created_at", iso(inizioSettimanaPrecedente)).lt("created_at", iso(fineSettimanaCorrente)),
        supabase.from("inventory_analysis").select("*").eq("settimana_key", settimanaCorrenteKey),
      ]);

      if (localiRes.error) throw localiRes.error;
      if (productsRes.error) throw productsRes.error;
      if (ordiniRes.error) throw ordiniRes.error;
      if (giacenzeRes.error) throw giacenzeRes.error;
      if (analisiRes.error) throw analisiRes.error;

      setLocali(localiRes.data || []);
      setProducts(productsRes.data || []);
      setOrdini(ordiniRes.data || []);
      setGiacenze(giacenzeRes.data || []);
      setAnalisiSalvate(analisiRes.data || []);
    } catch (error: any) {
      console.log(error);
      setErrore(error?.message || "Errore caricamento analisi dispersioni");
    }
    setLoading(false);
  }

  const righeCalcolate = useMemo<RigaAnalisi[]>(() => {
    const mappa = new Map<string, RigaAnalisi>();

    function getRiga(params: { locale_id: string; locale_nome: string; nome_prodotto: string; supplier_code?: string }) {
      const prodotto = trovaProdotto(params.nome_prodotto, params.supplier_code);
      const nomeProdotto = prodotto?.name || params.nome_prodotto;
      const keyRiga = `${params.locale_id}__${normalizza(nomeProdotto)}`;
      if (!mappa.has(keyRiga)) {
        mappa.set(keyRiga, {
          locale_id: params.locale_id,
          locale_nome: params.locale_nome,
          product_id: prodotto?.id || null,
          prodotto_id: prodotto?.id || null,
          supplier_code: prodotto?.supplier_code || params.supplier_code || "",
          nome_prodotto: nomeProdotto,
          categoria: prodotto?.category || "",
          unita_misura: prodotto?.unit || "",
          giacenza_precedente: 0,
          consegnato: 0,
          giacenza_corrente: 0,
          differenza: 0,
          prezzo_unitario: numero(prodotto?.price),
          valore_differenza: 0,
          tipo_anomalia: "ok",
        });
      }
      return mappa.get(keyRiga)!;
    }

    giacenze.forEach((g) => {
      const locale_id = String(g.locale_id || "");
      const locale_nome = String(g.locale_nome || "");
      const nome_prodotto = String(g.nome_prodotto || "");
      if (!locale_id || !nome_prodotto) return;
      const riga = getRiga({ locale_id, locale_nome, nome_prodotto, supplier_code: g.supplier_code || "" });
      if (dentroPeriodo(g.created_at, inizioSettimanaPrecedente, inizioSettimanaCorrente)) riga.giacenza_precedente += numero(g.quantita);
      if (dentroPeriodo(g.created_at, inizioSettimanaCorrente, fineSettimanaCorrente)) riga.giacenza_corrente += numero(g.quantita);
    });

    ordini.forEach((o) => {
      const locale_id = String(o.locale_id || "");
      const locale_nome = String(o.locale_nome || "");
      const nome_prodotto = String(o.nome_prodotto || "");
      if (!locale_id || !nome_prodotto) return;
      const riga = getRiga({ locale_id, locale_nome, nome_prodotto, supplier_code: o.supplier_code || "" });
      const consegnato = o.stato_consegna === "parziale" ? numero(o.quantita_consegnata) : o.stato_consegna === "consegnato" ? numero(o.quantita_consegnata || o.quantita) : 0;
      riga.consegnato += consegnato;
    });

    return Array.from(mappa.values())
      .map((riga) => {
        const differenza = riga.giacenza_precedente + riga.consegnato - riga.giacenza_corrente;
        const valore = differenza * riga.prezzo_unitario;
        let tipo = "ok";
        if (differenza > 0) tipo = "possibile_dispersione";
        if (differenza < 0) tipo = "giacenza_superiore";
        return { ...riga, differenza, valore_differenza: valore, tipo_anomalia: tipo };
      })
      .sort((a, b) => b.valore_differenza - a.valore_differenza);
  }, [giacenze, ordini, products]);

  const categorie = useMemo(() => Array.from(new Set(righeCalcolate.map((r) => r.categoria).filter(Boolean))).sort(), [righeCalcolate]);

  const righeFiltrate = useMemo(() => {
    const q = normalizza(ricerca);
    return righeCalcolate.filter((riga) => {
      if (localeId && String(riga.locale_id) !== String(localeId)) return false;
      if (categoria && riga.categoria !== categoria) return false;
      if (soloAnomalie && riga.differenza <= 0) return false;
      if (q) {
        const testo = normalizza(`${riga.locale_nome} ${riga.nome_prodotto} ${riga.supplier_code} ${riga.categoria}`);
        if (!testo.includes(q)) return false;
      }
      return true;
    });
  }, [righeCalcolate, localeId, categoria, soloAnomalie, ricerca]);

  const totaleDispersione = righeFiltrate.filter((r) => r.differenza > 0).reduce((sum, r) => sum + r.differenza, 0);
  const valoreDispersione = righeFiltrate.filter((r) => r.differenza > 0).reduce((sum, r) => sum + r.valore_differenza, 0);
  const prodottiCritici = righeFiltrate.filter((r) => r.differenza > 0).length;
  const localiCritici = new Set(righeFiltrate.filter((r) => r.differenza > 0).map((r) => r.locale_id)).size;

  const topLocali = useMemo(() => {
    const m = new Map<string, { nome: string; valore: number; pezzi: number }>();
    righeFiltrate.filter((r) => r.differenza > 0).forEach((r) => {
      const item = m.get(r.locale_id) || { nome: r.locale_nome, valore: 0, pezzi: 0 };
      item.valore += r.valore_differenza;
      item.pezzi += r.differenza;
      m.set(r.locale_id, item);
    });
    return Array.from(m.values()).sort((a, b) => b.valore - a.valore).slice(0, 5);
  }, [righeFiltrate]);

  const topProdotti = useMemo(() => {
    const m = new Map<string, { nome: string; valore: number; pezzi: number }>();
    righeFiltrate.filter((r) => r.differenza > 0).forEach((r) => {
      const k = normalizza(r.nome_prodotto);
      const item = m.get(k) || { nome: r.nome_prodotto, valore: 0, pezzi: 0 };
      item.valore += r.valore_differenza;
      item.pezzi += r.differenza;
      m.set(k, item);
    });
    return Array.from(m.values()).sort((a, b) => b.valore - a.valore).slice(0, 5);
  }, [righeFiltrate]);

  async function salvaAnalisi() {
    setLoading(true);
    setErrore("");
    try {
      const righeDaSalvare = righeCalcolate.map((r) => ({
        settimana_key: settimanaCorrenteKey,
        locale_id: r.locale_id,
        locale_nome: r.locale_nome,
        product_id: r.product_id,
        prodotto_id: r.prodotto_id,
        supplier_code: r.supplier_code,
        nome_prodotto: r.nome_prodotto,
        categoria: r.categoria,
        unita_misura: r.unita_misura,
        giacenza_precedente: r.giacenza_precedente,
        consegnato: r.consegnato,
        giacenza_corrente: r.giacenza_corrente,
        differenza: r.differenza,
        prezzo_unitario: r.prezzo_unitario,
        valore_differenza: r.valore_differenza,
        tipo_anomalia: r.tipo_anomalia,
      }));
      const { error } = await supabase.from("inventory_analysis").upsert(righeDaSalvare, { onConflict: "settimana_key,locale_id,nome_prodotto" });
      if (error) throw error;
      await caricaDati();
      alert("Analisi salvata correttamente.");
    } catch (error: any) {
      console.log(error);
      setErrore(error?.message || "Errore salvataggio analisi");
    }
    setLoading(false);
  }

  function esportaCsv() {
    const intestazioni = ["Locale", "Codice", "Prodotto", "Categoria", "Giacenza precedente", "Consegnato", "Giacenza corrente", "Differenza", "Prezzo unitario", "Valore differenza", "Tipo anomalia"];
    const righe = righeFiltrate.map((r) => [r.locale_nome, r.supplier_code, r.nome_prodotto, r.categoria, r.giacenza_precedente, r.consegnato, r.giacenza_corrente, r.differenza, r.prezzo_unitario, r.valore_differenza, r.tipo_anomalia]);
    const csv = [intestazioni, ...righe].map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `analisi-dispersioni-${settimanaCorrenteKey}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function badgeTipo(tipo: string) {
    if (tipo === "possibile_dispersione") return "bg-red-100 text-red-700";
    if (tipo === "giacenza_superiore") return "bg-blue-100 text-blue-700";
    return "bg-emerald-100 text-emerald-700";
  }

  function testoTipo(tipo: string) {
    if (tipo === "possibile_dispersione") return "Possibile dispersione";
    if (tipo === "giacenza_superiore") return "Giacenza superiore";
    return "OK";
  }

  function StatCard({ title, value, note, icon: Icon, tone }: { title: string; value: string | number; note: string; icon: any; tone: string }) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">{title}</p>
            <h2 className="mt-2 break-words text-3xl font-black text-slate-950 sm:text-4xl">{value}</h2>
            <p className="mt-1 text-sm font-bold text-slate-500">{note}</p>
          </div>
          <div className={`shrink-0 rounded-2xl p-3 ${tone}`}><Icon className="h-6 w-6" /></div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <section className="mx-auto w-full max-w-[1700px] space-y-5 p-3 sm:p-5 lg:p-8">
        <header className="rounded-3xl bg-slate-950 p-5 text-white shadow-sm sm:p-7">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <button onClick={() => (window.location.href = "/admin-dashboard")} className="mb-4 inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2 text-sm font-black text-white hover:bg-white/15">
                <ArrowLeft className="h-4 w-4" /> Torna alla dashboard
              </button>
              <p className="text-sm font-black uppercase tracking-wide text-blue-300">Settimana corrente: {settimanaCorrenteKey}</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">Analisi dispersioni magazzino</h1>
              <p className="mt-2 max-w-4xl text-sm font-bold text-slate-300 sm:text-base">Confronto tra giacenza precedente, consegne e giacenza corrente.</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-slate-400">
                <span className="rounded-full bg-white/10 px-3 py-1">Precedente: {settimanaPrecedenteKey}</span>
                <span className="rounded-full bg-white/10 px-3 py-1">Ultimo aggiornamento: {dataOra()}</span>
              </div>
              <p className="mt-3 text-xs font-bold text-slate-400">Formula: giacenza precedente + consegnato - giacenza corrente = differenza stimata</p>
            </div>
            <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-3 xl:w-auto xl:min-w-[520px]">
              <button onClick={caricaDati} disabled={loading} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 text-sm font-black text-white disabled:bg-slate-600">
                <RefreshCw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} /> {loading ? "Aggiorno..." : "Aggiorna"}
              </button>
              <button onClick={salvaAnalisi} disabled={loading || righeCalcolate.length === 0} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 text-sm font-black text-white disabled:bg-slate-600">
                <Warehouse className="h-5 w-5" /> Salva
              </button>
              <button onClick={esportaCsv} disabled={righeFiltrate.length === 0} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-white/10 px-4 text-sm font-black text-white hover:bg-white/15 disabled:bg-slate-700">
                <FileDown className="h-5 w-5" /> CSV
              </button>
            </div>
          </div>
        </header>

        {errore && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 font-black text-red-700">{errore}</div>}

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Prodotti critici" value={prodottiCritici} note="Righe con differenza positiva" icon={AlertTriangle} tone={prodottiCritici > 0 ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"} />
          <StatCard title="Quantità dispersa" value={totaleDispersione} note="Stima pezzi mancanti" icon={TrendingDown} tone="bg-orange-100 text-orange-700" />
          <StatCard title="Valore stimato" value={euro(valoreDispersione)} note="Basato sui prezzi prodotto" icon={Euro} tone="bg-purple-100 text-purple-700" />
          <StatCard title="Locali coinvolti" value={localiCritici} note="Con almeno una anomalia" icon={BarChart3} tone="bg-blue-100 text-blue-700" />
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(260px,1fr)_260px_260px_180px]">
            <div className="relative min-w-0">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input value={ricerca} onChange={(e) => setRicerca(e.target.value)} placeholder="Cerca prodotto, locale, codice o categoria..." className="h-12 w-full rounded-2xl border-2 border-slate-200 bg-white pl-12 pr-4 text-sm font-bold outline-none focus:border-blue-600" />
            </div>
            <select value={localeId} onChange={(e) => setLocaleId(e.target.value)} className="h-12 min-w-0 rounded-2xl border-2 border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:border-blue-600">
              <option value="">Tutti i locali</option>
              {locali.map((locale) => <option key={locale.id} value={locale.id}>{locale.name}</option>)}
            </select>
            <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="h-12 min-w-0 rounded-2xl border-2 border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:border-blue-600">
              <option value="">Tutte le categorie</option>
              {categorie.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            <button onClick={() => setSoloAnomalie(!soloAnomalie)} className={`h-12 w-full rounded-2xl px-4 text-sm font-black ${soloAnomalie ? "bg-red-600 text-white" : "bg-slate-100 text-slate-700"}`}>
              {soloAnomalie ? "Solo anomalie" : "Tutte le righe"}
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-slate-500">
            <span>Analisi salvate: {analisiSalvate.length}</span><span>·</span><span>Righe calcolate: {righeCalcolate.length}</span><span>·</span><span>Righe visualizzate: {righeFiltrate.length}</span>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-slate-950">Top locali</h2>
            <div className="mt-4 space-y-2">
              {topLocali.map((item, index) => <div key={item.nome} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3"><div className="min-w-0"><p className="truncate text-sm font-black text-slate-900">{index + 1}. {item.nome}</p><p className="text-xs font-bold text-slate-500">{item.pezzi} pezzi stimati</p></div><p className="shrink-0 text-sm font-black text-red-700">{euro(item.valore)}</p></div>)}
              {topLocali.length === 0 && <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">Nessun locale critico nel periodo.</p>}
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-slate-950">Top prodotti</h2>
            <div className="mt-4 space-y-2">
              {topProdotti.map((item, index) => <div key={item.nome} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3"><div className="min-w-0"><p className="truncate text-sm font-black text-slate-900">{index + 1}. {item.nome}</p><p className="text-xs font-bold text-slate-500">{item.pezzi} pezzi stimati</p></div><p className="shrink-0 text-sm font-black text-red-700">{euro(item.valore)}</p></div>)}
              {topProdotti.length === 0 && <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">Nessun prodotto critico nel periodo.</p>}
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5">
            <h2 className="text-2xl font-black text-slate-950">Dettaglio dispersioni</h2>
            <p className="text-sm font-bold text-slate-500">{righeFiltrate.length} righe visualizzate su {righeCalcolate.length} totali.</p>
          </div>
          <div className="max-w-full overflow-x-auto">
            <table className="w-full min-w-[1180px] border-collapse text-left">
              <thead className="sticky top-0 z-10 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-xs font-black uppercase text-slate-500">Locale</th>
                  <th className="px-4 py-3 text-xs font-black uppercase text-slate-500">Prodotto</th>
                  <th className="px-4 py-3 text-xs font-black uppercase text-slate-500">Categoria</th>
                  <th className="px-4 py-3 text-right text-xs font-black uppercase text-slate-500">Giac. prec.</th>
                  <th className="px-4 py-3 text-right text-xs font-black uppercase text-slate-500">Consegnato</th>
                  <th className="px-4 py-3 text-right text-xs font-black uppercase text-slate-500">Giac. attuale</th>
                  <th className="px-4 py-3 text-right text-xs font-black uppercase text-slate-500">Diff.</th>
                  <th className="px-4 py-3 text-right text-xs font-black uppercase text-slate-500">Prezzo</th>
                  <th className="px-4 py-3 text-right text-xs font-black uppercase text-slate-500">Valore</th>
                  <th className="px-4 py-3 text-xs font-black uppercase text-slate-500">Stato</th>
                </tr>
              </thead>
              <tbody>
                {righeFiltrate.map((riga, index) => (
                  <tr key={`${riga.locale_id}-${riga.nome_prodotto}-${index}`} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="max-w-[190px] px-4 py-3 text-sm font-black text-slate-900"><span className="line-clamp-2">{riga.locale_nome}</span></td>
                    <td className="max-w-[280px] px-4 py-3"><p className="line-clamp-2 text-sm font-black text-slate-900">{riga.nome_prodotto}</p><p className="text-xs font-bold text-slate-400">{riga.supplier_code || "Senza codice"}</p></td>
                    <td className="max-w-[190px] px-4 py-3 text-sm font-bold text-slate-600"><span className="line-clamp-2">{riga.categoria || "-"}</span></td>
                    <td className="px-4 py-3 text-right text-sm font-black text-slate-700">{riga.giacenza_precedente}</td>
                    <td className="px-4 py-3 text-right text-sm font-black text-slate-700">{riga.consegnato}</td>
                    <td className="px-4 py-3 text-right text-sm font-black text-slate-700">{riga.giacenza_corrente}</td>
                    <td className={`px-4 py-3 text-right text-sm font-black ${riga.differenza > 0 ? "text-red-700" : riga.differenza < 0 ? "text-blue-700" : "text-emerald-700"}`}>{riga.differenza}</td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-slate-600">{euro(riga.prezzo_unitario)}</td>
                    <td className={`px-4 py-3 text-right text-sm font-black ${riga.valore_differenza > 0 ? "text-red-700" : "text-slate-700"}`}>{euro(riga.valore_differenza)}</td>
                    <td className="px-4 py-3"><span className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-black ${badgeTipo(riga.tipo_anomalia)}`}>{testoTipo(riga.tipo_anomalia)}</span></td>
                  </tr>
                ))}
                {righeFiltrate.length === 0 && (
                  <tr><td colSpan={10} className="px-4 py-14"><div className="mx-auto max-w-xl rounded-3xl bg-slate-50 p-8 text-center"><AlertTriangle className="mx-auto h-10 w-10 text-slate-400" /><h3 className="mt-4 text-xl font-black text-slate-900">Nessuna analisi disponibile</h3><p className="mt-2 text-sm font-bold text-slate-500">Per calcolare le dispersioni servono almeno due invii di giacenza consecutivi e consegne registrate nel periodo corrente.</p>{soloAnomalie && <button onClick={() => setSoloAnomalie(false)} className="mt-5 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white">Mostra tutte le righe</button>}</div></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm font-bold text-amber-800">
          <div className="flex gap-3"><Boxes className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="font-black">Nota importante</p><p className="mt-1">La dispersione è una stima. Il sistema non può sapere se il prodotto è stato rotto, usato, contato male o non consegnato: segnala solo la differenza matematica tra giacenze e consegne.</p></div></div>
        </section>
      </section>
    </main>
  );
}