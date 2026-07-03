"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  Boxes,
  CheckCircle2,
  ClipboardList,
  Euro,
  FileText,
  MessageCircle,
  Package,
  RefreshCw,
  Search,
  ShoppingCart,
  Truck,
  Users,
  XCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type StatoLocale = "ok" | "incompleto" | "mancante";

type LocaleDashboard = {
  id: string;
  name: string;
  ordini: number;
  giacenze: number;
  prodottiAttivi: number;
  giacenzeCompilate: number;
  statoGiacenze: StatoLocale;
};

export default function AdminDashboard() {
  const [locali, setLocali] = useState<any[]>([]);
  const [ordini, setOrdini] = useState<any[]>([]);
  const [giacenze, setGiacenze] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [settings, setSettings] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [errore, setErrore] = useState("");
  const [ricerca, setRicerca] = useState("");
  const [localeId, setLocaleId] = useState("");

  useEffect(() => {
    inizializza();

    const channel = supabase
      .channel("admin-dashboard-v2-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ordini" },
        caricaDashboard,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "giacenze_settimana" },
        caricaDashboard,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        caricaNotifiche,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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

    await Promise.all([caricaDashboard(), caricaNotifiche()]);
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

  function settimanaKey() {
    return sabatoCorrente().toISOString().split("T")[0];
  }

  function salutoOrario() {
    const ora = new Date().getHours();
    if (ora >= 5 && ora < 13) return "Buongiorno";
    if (ora >= 13 && ora < 18) return "Buon pomeriggio";
    return "Buonasera";
  }

  function dataLunga() {
    return new Date().toLocaleDateString("it-IT", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
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

  function prezzoNumero(prezzo: any) {
    const numero = Number(String(prezzo || "0").replace(",", "."));
    return Number.isFinite(numero) ? numero : 0;
  }

  function euro(valore: number) {
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "EUR",
    }).format(valore || 0);
  }

  function prodottoDaOrdine(ordine: any) {
    const codiceOrdine = normalizza(ordine.supplier_code || "");

    if (codiceOrdine) {
      const prodotto = products.find(
        (p) => normalizza(p.supplier_code || "") === codiceOrdine,
      );
      if (prodotto) return prodotto;
    }

    const nomeOrdine = normalizza(ordine.nome_prodotto || "");
    return (
      products.find((p) => normalizza(p.name || "") === nomeOrdine) || null
    );
  }

  async function caricaDashboard() {
    setLoading(true);
    setErrore("");

    try {
      const key = settimanaKey();

      const [localiRes, ordiniRes, giacenzeRes, productsRes, settingsRes] =
        await Promise.all([
          supabase.from("restaurants").select("*").order("name"),
          supabase
            .from("ordini")
            .select("*")
            .eq("settimana_key", key)
            .order("created_at", { ascending: false }),
          supabase
            .from("giacenze_settimana")
            .select("*")
            .eq("settimana_key", key),
          supabase
            .from("products")
            .select("id, name, supplier_code, category, unit, active, price")
            .order("name"),
          supabase
            .from("restaurant_product_settings")
            .select("restaurant_id, product_id, prodotto_id, active")
            .eq("active", true),
        ]);

      if (localiRes.error) throw localiRes.error;
      if (ordiniRes.error) throw ordiniRes.error;
      if (giacenzeRes.error) throw giacenzeRes.error;
      if (productsRes.error) throw productsRes.error;
      if (settingsRes.error) throw settingsRes.error;

      setLocali(localiRes.data || []);
      setOrdini(ordiniRes.data || []);
      setGiacenze(giacenzeRes.data || []);
      setProducts(productsRes.data || []);
      setSettings(settingsRes.data || []);
    } catch (error: any) {
      console.log(error);
      setErrore(error?.message || "Errore caricamento dashboard");
    }

    setLoading(false);
  }

  async function caricaNotifiche() {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) {
      console.log(error);
      return;
    }

    setNotifications(data || []);
  }

  const localiDashboard = useMemo<LocaleDashboard[]>(() => {
    return locali.map((locale) => {
      const ordiniLocale = ordini.filter(
        (ordine) => String(ordine.locale_id) === String(locale.id),
      );

      const giacenzeLocale = giacenze.filter(
        (g) => String(g.locale_id) === String(locale.id),
      );

      const prodottiAttivi = settings.filter(
        (s) => String(s.restaurant_id) === String(locale.id),
      ).length;

      const giacenzeCompilate = giacenzeLocale.filter(
        (g) => Number(g.quantita || 0) > 0,
      ).length;

      const percentuale = prodottiAttivi
        ? Math.round((giacenzeCompilate / prodottiAttivi) * 100)
        : 0;

      let statoGiacenze: StatoLocale = "mancante";
      if (giacenzeCompilate === 0) {
        statoGiacenze = "mancante";
      } else if (percentuale >= 90) {
        statoGiacenze = "ok";
      } else {
        statoGiacenze = "incompleto";
      }

      return {
        id: locale.id,
        name: locale.name,
        ordini: ordiniLocale.length,
        giacenze: giacenzeLocale.length,
        prodottiAttivi,
        giacenzeCompilate,
        statoGiacenze,
      };
    });
  }, [locali, ordini, giacenze, settings]);

  const localiFiltrati = useMemo(() => {
    const q = normalizza(ricerca);

    return localiDashboard.filter((locale) => {
      if (localeId && String(locale.id) !== String(localeId)) return false;
      if (q && !normalizza(locale.name).includes(q)) return false;
      return true;
    });
  }, [localiDashboard, ricerca, localeId]);

  const localiOk = localiDashboard.filter(
    (l) => l.statoGiacenze === "ok",
  ).length;
  const localiIncompleti = localiDashboard.filter(
    (l) => l.statoGiacenze === "incompleto",
  ).length;
  const localiMancanti = localiDashboard.filter(
    (l) => l.statoGiacenze === "mancante",
  ).length;

  const localiConOrdine = new Set(
    ordini.map((ordine) => String(ordine.locale_id)),
  ).size;
  const percentOrdini = locali.length
    ? Math.round((localiConOrdine / locali.length) * 100)
    : 0;
  const percentGiacenze = locali.length
    ? Math.round((localiOk / locali.length) * 100)
    : 0;

  const totaleQuantita = ordini.reduce(
    (sum, ordine) => sum + Number(ordine.quantita || 0),
    0,
  );

  const valoreStimato = ordini.reduce((sum, ordine) => {
    const prodotto = prodottoDaOrdine(ordine);
    return sum + Number(ordine.quantita || 0) * prezzoNumero(prodotto?.price);
  }, 0);

  const consegneDaFare = ordini.filter(
    (ordine) =>
      !ordine.stato_consegna || ordine.stato_consegna === "da_consegnare",
  ).length;

  const consegneParziali = ordini.filter(
    (ordine) => ordine.stato_consegna === "parziale",
  ).length;

  const prodottiSenzaCodice = products.filter(
    (p) => p.active !== false && !String(p.supplier_code || "").trim(),
  ).length;

  const prodottiSenzaPrezzo = products.filter(
    (p) => p.active !== false && prezzoNumero(p.price) <= 0,
  ).length;

  const anomalie =
    localiIncompleti +
    localiMancanti +
    consegneParziali +
    prodottiSenzaCodice +
    prodottiSenzaPrezzo;

  function badgeLocale(stato: StatoLocale) {
    if (stato === "ok") return "bg-emerald-100 text-emerald-700";
    if (stato === "incompleto") return "bg-amber-100 text-amber-700";
    return "bg-red-100 text-red-700";
  }

  function testoStato(stato: StatoLocale) {
    if (stato === "ok") return "Completa";
    if (stato === "incompleto") return "Incompleta";
    return "Mancante";
  }

  function vai(percorso: string) {
    window.location.href = percorso;
  }

  function StatCard({
    title,
    value,
    note,
    icon: Icon,
    tone,
    onClick,
  }: {
    title: string;
    value: string | number;
    note: string;
    icon: any;
    tone: string;
    onClick?: () => void;
  }) {
    return (
      <div
        onClick={onClick}
        className={`rounded-3xl border border-slate-200 bg-white p-5 shadow-sm ${
          onClick
            ? "cursor-pointer transition hover:border-blue-300 hover:shadow-md"
            : ""
        }`}
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
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <section className="mx-auto w-full max-w-[1600px] space-y-5 p-3 sm:p-5 lg:p-8">
        <header className="rounded-3xl bg-slate-950 p-5 text-white shadow-sm sm:p-7">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-wide text-blue-300">
                {dataLunga()}
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">
                {salutoOrario()}, Centro Controllo
              </h1>
              <p className="mt-2 max-w-3xl text-sm font-bold text-slate-300 sm:text-base">
                Monitoraggio settimanale di locali, ordini, giacenze, consegne e
                anomalie operative.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={caricaDashboard}
                disabled={loading}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-black text-white disabled:bg-slate-600"
              >
                <RefreshCw
                  className={`h-5 w-5 ${loading ? "animate-spin" : ""}`}
                />
                {loading ? "Aggiorno..." : "Aggiorna"}
              </button>

              <button
                onClick={() => vai("/admin-messaggi")}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-white/10 px-5 text-sm font-black text-white hover:bg-white/15"
              >
                <MessageCircle className="h-5 w-5" />
                Messaggi
              </button>
            </div>
          </div>
        </header>

        {errore && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 font-black text-red-700">
            {errore}
          </div>
        )}

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Locali"
            value={locali.length}
            note={`OK ${localiOk} · Incomplete ${localiIncompleti} · Mancanti ${localiMancanti}`}
            icon={Users}
            tone="bg-blue-100 text-blue-700"
          />
          <StatCard
            title="Ordini ricevuti"
            value={`${localiConOrdine}/${locali.length}`}
            note={`${percentOrdini}% completato`}
            icon={ShoppingCart}
            tone="bg-emerald-100 text-emerald-700"
            onClick={() => vai("/admin-storico-ordini")}
          />
          <StatCard
            title="Giacenze complete"
            value={`${localiOk}/${locali.length}`}
            note={`${percentGiacenze}% completato`}
            icon={Package}
            tone="bg-amber-100 text-amber-700"
            onClick={() => vai("/admin-giacenze")}
          />
          <StatCard
            title="Alert operativi"
            value={anomalie}
            note={`${prodottiSenzaPrezzo} prezzi · ${prodottiSenzaCodice} codici · ${consegneParziali} consegne`}
            icon={AlertTriangle}
            tone={
              anomalie > 0
                ? "bg-red-100 text-red-700"
                : "bg-emerald-100 text-emerald-700"
            }
            onClick={() => vai("/admin-alert")}
          />
        </section>

        <section className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-black text-slate-950">
                  Stato locali
                </h2>
                <p className="text-sm font-bold text-slate-500">
                  Controllo invio giacenze e ordini della settimana corrente.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_220px]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    value={ricerca}
                    onChange={(e) => setRicerca(e.target.value)}
                    placeholder="Cerca locale..."
                    className="h-12 w-full rounded-2xl border-2 border-slate-200 bg-white pl-12 pr-4 text-sm font-bold outline-none focus:border-blue-600"
                  />
                </div>

                <select
                  value={localeId}
                  onChange={(e) => setLocaleId(e.target.value)}
                  className="h-12 rounded-2xl border-2 border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:border-blue-600"
                >
                  <option value="">Tutti i locali</option>
                  {locali.map((locale) => (
                    <option key={locale.id} value={locale.id}>
                      {locale.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              {localiFiltrati.map((locale) => {
                const percentuale = locale.prodottiAttivi
                  ? Math.round(
                      (locale.giacenzeCompilate / locale.prodottiAttivi) * 100,
                    )
                  : 0;

                return (
                  <div
                    key={locale.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-black text-slate-950">
                          {locale.name}
                        </h3>
                        <p className="mt-1 text-xs font-bold text-slate-500">
                          Giacenze {locale.giacenzeCompilate}/
                          {locale.prodottiAttivi} · Ordini {locale.ordini}
                        </p>
                        <p className="mt-1 text-xs font-bold text-slate-400">
                          {percentuale}% completato
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${badgeLocale(locale.statoGiacenze)}`}
                        >
                          {testoStato(locale.statoGiacenze)}
                        </span>
                        <button
                          onClick={() =>
                            vai(
                              `/storico-giacenze?locale_id=${locale.id}&locale_nome=${encodeURIComponent(locale.name)}`,
                            )
                          }
                          className="rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-sm"
                        >
                          Storico
                        </button>
                        <button
                          onClick={() => vai("/admin-consegne")}
                          className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-black text-white"
                        >
                          Consegne
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                      <div
                        className={`h-full rounded-full ${
                          locale.statoGiacenze === "ok"
                            ? "bg-emerald-500"
                            : locale.statoGiacenze === "incompleto"
                              ? "bg-amber-500"
                              : "bg-red-500"
                        }`}
                        style={{ width: `${Math.min(percentuale, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}

              {localiFiltrati.length === 0 && (
                <div className="rounded-2xl bg-slate-50 p-8 text-center text-sm font-bold text-slate-500">
                  Nessun locale trovato.
                </div>
              )}
            </div>
          </div>

          <aside className="space-y-3">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-slate-950">
                    Notifiche
                  </h2>
                  <p className="text-sm font-bold text-slate-500">
                    {notifications.filter((n) => !n.read).length} non lette
                  </p>
                </div>
                <Bell className="h-6 w-6 text-slate-500" />
              </div>

              <div className="space-y-2">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`rounded-2xl border p-3 ${
                      n.read
                        ? "border-slate-200 bg-slate-50"
                        : "border-amber-200 bg-amber-50"
                    }`}
                  >
                    <p className="text-sm font-black text-slate-950">
                      {n.title}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs font-bold text-slate-600">
                      {n.message}
                    </p>
                  </div>
                ))}

                {notifications.length === 0 && (
                  <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">
                    Nessuna notifica.
                  </p>
                )}
              </div>

              <button
                onClick={() => vai("/admin-alert")}
                className="mt-3 w-full rounded-xl bg-slate-100 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200"
              >
                Mostra tutte →
              </button>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-black text-slate-950">
                Azioni rapide
              </h2>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {[
                  { label: "Prodotti", icon: Boxes, href: "/admin-prodotti" },
                  { label: "Consegne", icon: Truck, href: "/admin-consegne" },
                  {
                    label: "Ordini",
                    icon: ClipboardList,
                    href: "/admin-ordini",
                  },
                  {
                    label: "Fatture",
                    icon: FileText,
                    href: "/admin-storico-fatture",
                  },
                  {
                    label: "Messaggi",
                    icon: MessageCircle,
                    href: "/admin-messaggi",
                  },
                  { label: "Import", icon: Euro, href: "/admin-import-prezzi" },
                ].map((item) => (
                  <button
                    key={item.href}
                    onClick={() => vai(item.href)}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-left transition hover:border-blue-200 hover:bg-blue-50"
                  >
                    <item.icon className="h-5 w-5 text-blue-600" />
                    <p className="mt-2 text-xs font-black text-slate-800">
                      {item.label}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </aside>
        </section>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Prodotti richiesti"
            value={ordini.length}
            note="Righe ordine settimana"
            icon={Boxes}
            tone="bg-orange-100 text-orange-700"
          />
          <StatCard
            title="Quantità totale"
            value={totaleQuantita}
            note="Pezzi ordinati"
            icon={ClipboardList}
            tone="bg-indigo-100 text-indigo-700"
          />
          <StatCard
            title="Valore stimato"
            value={euro(valoreStimato)}
            note="Basato sui prezzi anagrafica"
            icon={Euro}
            tone="bg-purple-100 text-purple-700"
          />
          <StatCard
            title="Consegne"
            value={`${consegneDaFare}/${consegneParziali}`}
            note="Da fare / parziali"
            icon={Truck}
            tone="bg-slate-100 text-slate-700"
          />
        </section>
      </section>
    </main>
  );
}