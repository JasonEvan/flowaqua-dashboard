"use client";

import { useEffect, useRef, useState } from "react";
import { apiErrorMessage, isReadingList, type Reading } from "@/lib/readings";

type Metric = "temperatureC" | "tdsPpm";
const number = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 });
const clock = (date: string | number) => new Date(date).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
const dateLabel = (date: string | number) => new Date(date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

function Icon({ name, size = 20 }: { name: "water" | "grid" | "pulse" | "temp" | "arrow" | "download" | "refresh"; size?: number }) {
  const paths = {
    water: <><path d="M12 3C9 7 5 11 5 15a7 7 0 0 0 14 0c0-4-4-8-7-12Z" /><path d="M9 16a3 3 0 0 0 3 3" /></>,
    grid: <><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="3" y="14" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" /></>,
    pulse: <path d="M2 12h5l3-8 4 16 3-8h5" />,
    temp: <><path d="M9 14V5a3 3 0 0 1 6 0v9a5 5 0 1 1-6 0Z" /><path d="M12 8v9" /></>,
    arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
    download: <path d="M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5" />,
    refresh: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M6 7a7 7 0 0 1 12-1l2 6M4 12l2 6a7 7 0 0 0 12-1" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function Trend({ rows, metric }: { rows: Reading[]; metric: Metric }) {
  if (!rows.length) return <div className="chart-empty"><Icon name="pulse" size={32} /><p>Grafik akan muncul saat data sensor tersedia.</p></div>;
  const points = [...rows].reverse();
  const values = points.map(r => r[metric]);
  const min = Math.min(...values), max = Math.max(...values);
  const pad = Math.max((max - min) * .2, metric === "tdsPpm" ? 5 : .5);
  const low = Math.max(metric === "tdsPpm" ? 0 : -273.15, min - pad), high = max + pad;
  const first = Date.parse(points[0].recordedAt), last = Date.parse(points[points.length - 1].recordedAt);
  const coords = points.map(r => ({ x: last === first ? 440 : 64 + (Date.parse(r.recordedAt) - first) / (last - first) * 796, y: 210 - (r[metric] - low) / (high - low) * 180, row: r }));
  const path = coords.map((p, i) => `${i ? "L" : "M"}${p.x},${p.y}`).join(" ");
  return <div className={`chart ${metric === "tdsPpm" ? "chart-blue" : ""}`}>
    <svg viewBox="0 0 900 255" role="img" aria-label={`Grafik ${metric === "tdsPpm" ? "TDS" : "suhu"}, ${rows.length} pembacaan terakhir`}>
      <defs><linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="currentColor" stopOpacity=".14" /><stop offset="100%" stopColor="currentColor" stopOpacity="0" /></linearGradient></defs>
      {[0, 1, 2, 3].map(i => <g key={i}><line x1="64" x2="860" y1={30 + i * 60} y2={30 + i * 60} stroke="var(--border)" strokeDasharray="4 6" /><text x="0" y={35 + i * 60}>{number.format(high - (high - low) * i / 3)}</text></g>)}
      {coords.length > 1 && <><path d={`${path} L860,210 L64,210 Z`} fill="url(#chart-fill)" /><path d={path} fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" /></>}
      {coords.map(p => <circle key={p.row.id} cx={p.x} cy={p.y} r={coords.length === 1 ? 6 : 3} fill="currentColor"><title>{clock(p.row.recordedAt)} · {number.format(p.row[metric])} {metric === "tdsPpm" ? "ppm" : "°C"}</title></circle>)}
      <text x="64" y="245">{clock(first)}</text>{last !== first && <text x="860" y="245" textAnchor="end">{clock(last)}</text>}
    </svg>
    {rows.length === 1 && <p className="chart-note">Satu pembacaan tersedia. Tren terbentuk saat data baru masuk.</p>}
  </div>;
}

export default function Dashboard() {
  const [rows, setRows] = useState<Reading[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [checked, setChecked] = useState<number | null>(null);
  const [now, setNow] = useState<number | null>(null);
  const [metric, setMetric] = useState<Metric>("temperatureC");
  const refresh = useRef<() => void>(() => {});

  useEffect(() => {
    let disposed = false;
    let controller: AbortController | null = null;
    async function poll() {
      if (controller) return;
      controller = new AbortController();
      setSyncing(true);
      try {
        const response = await fetch("/api/readings", { cache: "no-store", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]) });
        const data: unknown = await response.json();
        if (!response.ok) throw new Error(apiErrorMessage(data));
        if (!isReadingList(data)) throw new Error("Format data sensor tidak valid.");
        if (!disposed) { setRows(data); setError(null); setChecked(Date.now()); }
      } catch (e) {
        if (!disposed) setError(e instanceof Error && e.name !== "TimeoutError" ? e.message : "API tidak merespons. Mencoba lagi otomatis.");
      } finally {
        controller = null;
        if (!disposed) { setLoading(false); setSyncing(false); setNow(Date.now()); }
      }
    }
    refresh.current = () => { void poll(); };
    void poll();
    const interval = setInterval(() => { setNow(Date.now()); void poll(); }, 3000);
    return () => { disposed = true; clearInterval(interval); controller?.abort(); refresh.current = () => {}; };
  }, []);

  const latest = rows[0];
  const stale = !!latest && now !== null && now - Date.parse(latest.recordedAt) > 60000;
  const status = loading ? "Menghubungkan" : error ? "Koneksi terganggu" : !latest ? "Menunggu sensor" : stale ? "Data belum terbaru" : "Sensor aktif";
  const exportCsv = () => {
    const csv = "id,recordedAt,temperatureC,tdsPpm\n" + rows.map(r => [r.id, r.recordedAt, r.temperatureC, r.tdsPpm].map(v => `"${String(v).replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = "flowaqua-readings.csv"; a.click(); URL.revokeObjectURL(url);
  };

  return <div className="shell">
    <aside className="sidebar">
      <a className="brand" href="#overview"><span className="brand-icon"><Icon name="water" size={25} /></span>flowaqua<span className="brand-dot">.</span></a>
      <div className="workspace"><span className="workspace-avatar">FA</span><div><strong>Crab Care</strong><small>Water monitoring</small></div><span className="workspace-tag">01</span></div>
      <p className="nav-label">WORKSPACE</p>
      <nav aria-label="Navigasi utama"><a className="nav-link active" href="#overview"><Icon name="grid" />Ringkasan<span className="nav-dot" /></a><a className="nav-link" href="#history"><Icon name="pulse" />Riwayat pembacaan</a></nav>
      <div className="sidebar-bottom"><div className="connection-icon"><Icon name="water" /></div><strong>Air terpantau.<br />Perawatan lebih tenang.</strong><p>Kenali perubahan air dari data sensor Anda.</p><span className="sidebar-foot">FLOWAQUA / MONITORING</span></div>
    </aside>
    <div className="main-wrap">
      <header className="topbar"><div className="breadcrumb">Workspace <span>/</span> <strong>Ringkasan</strong></div><div className="top-right"><span className="poll-label"><span className="dot" />HTTP polling · 3 detik</span><span className="avatar">FA</span></div></header>
      <main id="overview">
        <section className="page-heading"><div><div className="eyebrow">CRAB CARE MONITORING</div><h1>Setiap perubahan, terpantau.</h1><p>Pantau kondisi air perawatan kepiting dalam satu tempat.</p></div><button className="button" onClick={exportCsv} disabled={!rows.length}><Icon name="download" size={17} />Ekspor data</button></section>
        <section className="overview-banner"><div className="banner-copy"><span className="banner-kicker"><span className="dot" />PEMANTAUAN AIR</span><h2>Data kecil.<br />Perhatian besar.</h2><p>Suhu dan zat padat terlarut, langsung dari sensor Anda.</p><a href="#history">Lihat pembacaan terakhir <Icon name="arrow" size={17} /></a></div><div className="water-art" aria-hidden="true"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="orbit orbit-three" /><div className="water-core"><Icon name="water" size={60} /></div><span className="art-tag tag-top"><Icon name="temp" size={15} />Suhu air</span><span className="art-tag tag-bottom"><Icon name="water" size={15} />TDS</span><span className="art-coordinate">01 / WATER SYSTEM</span></div></section>
        <div className="section-heading"><h2>Kondisi terkini</h2><span className={`status ${error || stale ? "warning" : ""}`}><span className="dot" />{status}</span></div>
        {error && <div className="notice error" role="alert">{error}</div>}
        {stale && !error && <div className="notice">Belum ada pembacaan baru dalam 60 detik. Koneksi API aktif, tetapi nilai di bawah adalah data terakhir yang diterima.</div>}
        <section className="metrics" aria-label="Pembacaan sensor terkini">
          <article className="card metric-card"><div className="metric-title"><span>Suhu air</span><span className="metric-icon mint"><Icon name="temp" /></span></div><div className="metric-value">{latest ? number.format(latest.temperatureC) : "—"}<span>°C</span></div><div className="metric-bottom"><span className="mini-line mint-line" />Temperatur air terukur</div></article>
          <article className="card metric-card"><div className="metric-title"><span>Total dissolved solids</span><span className="metric-icon blue"><Icon name="water" /></span></div><div className="metric-value">{latest ? number.format(latest.tdsPpm) : "—"}<span>ppm</span></div><div className="metric-bottom"><span className="mini-line blue-line" />Konsentrasi zat padat terlarut</div></article>
          <article className="card metric-card"><div className="metric-title"><span>Pembacaan terakhir</span><span className="metric-icon neutral"><Icon name="pulse" /></span></div><div className="metric-value time-value">{latest ? clock(latest.recordedAt) : "—"}</div><div className="metric-bottom">{latest ? `${dateLabel(latest.recordedAt)} · waktu lokal` : loading ? "Mengambil data sensor…" : "Belum ada data sensor"}</div></article>
        </section>
        <section className="card trend-card"><div className="panel-header"><div><h2>Tren kualitas air</h2><p>Maksimal 100 pembacaan terbaru · waktu lokal</p></div><div className="segmented" aria-label="Parameter grafik"><button aria-pressed={metric === "temperatureC"} onClick={() => setMetric("temperatureC")}>Suhu <span>°C</span></button><button aria-pressed={metric === "tdsPpm"} onClick={() => setMetric("tdsPpm")}>TDS <span>ppm</span></button></div></div><div className="chart-legend"><span className={`dot ${metric === "tdsPpm" ? "blue-dot" : ""}`} />{metric === "temperatureC" ? "Suhu air (°C)" : "TDS (ppm)"}<span className="legend-right">{rows.length} pembacaan</span></div><Trend rows={rows} metric={metric} /></section>
        <section className="card history-card" id="history"><div className="panel-header"><div><h2>Riwayat pembacaan</h2><p>10 data terbaru yang diterima backend</p></div><button className="button compact" onClick={() => refresh.current()} disabled={syncing}><Icon name="refresh" size={16} />{syncing ? "Memuat…" : "Perbarui"}</button></div><div className="table-scroll"><table><thead><tr><th>WAKTU PEMBACAAN</th><th>SUHU AIR</th><th>TDS</th><th>SUMBER</th></tr></thead><tbody>{rows.slice(0, 10).map((r, i) => <tr key={r.id}><td><span className="table-time">{clock(r.recordedAt)}</span><span className="table-date">{dateLabel(r.recordedAt)}</span>{i === 0 && <span className="latest-tag">Terakhir</span>}</td><td>{number.format(r.temperatureC)} <span className="unit">°C</span></td><td>{number.format(r.tdsPpm)} <span className="unit">ppm</span></td><td><span className="source">Sensor air</span></td></tr>)}</tbody></table>{!rows.length && <div className="empty-state">{loading ? "Menghubungkan ke sensor…" : error ? "Data belum tersedia. Dashboard akan mencoba kembali otomatis." : "Belum ada pembacaan. Data akan muncul otomatis ketika sensor mengirimkannya."}</div>}</div><div className="table-footer"><span>Waktu pencatatan oleh backend, bukan waktu pengukuran perangkat.</span><span>{rows.length ? `${Math.min(rows.length, 10)} dari ${rows.length} data` : "0 data"}</span></div></section>
        <footer><span><Icon name="water" size={15} />FlowAqua <span className="footer-divider">/</span> Dibuat untuk perawatan yang lebih baik.</span><span role="status">{checked ? `Sinkronisasi API ${clock(checked)}` : "Menunggu sinkronisasi API"}</span></footer>
        <p className="disclaimer">Suhu dan TDS bukan penentu tunggal kelayakan air. Sesuaikan evaluasi dengan spesies kepiting, salinitas, pH, dan oksigen terlarut.</p>
      </main>
    </div>
  </div>;
}
