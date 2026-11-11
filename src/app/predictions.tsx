"use client";

import { useEffect, useState } from "react";
import { apiErrorMessage } from "@/lib/readings";
import {
  isCurrentPrediction,
  isPredictionHistory,
  type CurrentPrediction,
  type Prediction,
} from "@/lib/predictions";

const number = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 });
const dateTime = (value: string) =>
  new Date(value).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

type State<T> = { data: T | null; error: string | null; loading: boolean };

export default function Predictions() {
  const [current, setCurrent] = useState<State<CurrentPrediction>>({
    data: null,
    error: null,
    loading: true,
  });
  const [history, setHistory] = useState<State<Prediction[]>>({
    data: null,
    error: null,
    loading: true,
  });

  useEffect(() => {
    let disposed = false;
    const controllers = new Map<string, AbortController>();
    async function poll(kind: "current" | "history") {
      if (controllers.has(kind)) return;
      const controller = new AbortController();
      controllers.set(kind, controller);
      try {
        const response = await fetch(`/api/prediction/${kind}`, {
          cache: "no-store",
          signal: AbortSignal.any([
            controller.signal,
            AbortSignal.timeout(10000),
          ]),
        });
        const data: unknown = await response.json();
        if (!response.ok) throw new Error(apiErrorMessage(data));
        if (kind === "current") {
          if (!isCurrentPrediction(data))
            throw new Error("Format prediksi aktif tidak valid.");
          if (!disposed) setCurrent({ data, error: null, loading: false });
        } else {
          if (!isPredictionHistory(data))
            throw new Error("Format riwayat prediksi tidak valid.");
          if (!disposed) setHistory({ data, error: null, loading: false });
        }
      } catch (e) {
        const message =
          e instanceof Error && e.name !== "TimeoutError"
            ? e.message
            : "Layanan prediksi tidak merespons. Mencoba lagi otomatis.";
        if (!disposed) {
          if (kind === "current")
            setCurrent((previous) => ({
              ...previous,
              error: message,
              loading: false,
            }));
          else
            setHistory((previous) => ({
              ...previous,
              error: message,
              loading: false,
            }));
        }
      } finally {
        controllers.delete(kind);
      }
    }
    const refresh = () => {
      void poll("current");
      void poll("history");
    };
    refresh();
    const interval = setInterval(refresh, 3000);
    return () => {
      disposed = true;
      clearInterval(interval);
      controllers.forEach((controller) => controller.abort());
    };
  }, []);

  const prediction = current.data?.status === "available" ? current.data : null;
  const status = current.loading ? "Menghubungkan" : current.error ? "Koneksi terganggu" : prediction ? "Prediksi tersedia" : "Menunggu prediksi";

  return (
    <section id="predictions" aria-labelledby="prediction-heading" className="ml-section">
      <div className="section-heading ml-heading">
        <div><span className="ml-eyebrow">MACHINE LEARNING</span><h2 id="prediction-heading">Selangkah sebelum perubahan.</h2><p>Perkiraan TDS dan rekam jejak prediksi air Anda.</p></div>
        <span className="ml-poll"><span className="dot" />Pembaruan otomatis · 3 detik</span>
      </div>
      <div className="ml-overview">
        <article className="card prediction-current">
          <div className="ml-card-top"><span className="ml-label">PREDIKSI TDS</span><span className={`status ${current.error || !prediction ? "warning" : ""}`} role="status"><span className="dot" />{status}</span></div>
          <div className="ml-value" aria-label="Nilai prediksi TDS">{prediction ? number.format(prediction.predictedTds) : "—"}<span>ppm</span></div>
          <p className="ml-value-caption">{prediction ? current.error ? "Hasil terakhir diterima · belum terverifikasi ulang" : "Estimasi rata-rata TDS pada interval target" : current.loading ? "Mengambil hasil dari layanan prediksi…" : current.error ? "Hasil prediksi belum dapat dimuat." : "Belum ada prediksi aktif untuk saat ini."}</p>
          {current.error && <div className="notice error ml-notice" role="alert">{current.error}</div>}
          <div className="ml-target">
            <span className="ml-target-icon" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg></span>
            <div><span className="ml-label">INTERVAL TARGET · WAKTU LOKAL</span><p>{prediction ? <><time dateTime={prediction.targetStart}>{dateTime(prediction.targetStart)}</time><span className="ml-interval-arrow" aria-hidden="true">→</span><time dateTime={prediction.targetEnd}>{dateTime(prediction.targetEnd)}</time></> : "Tersedia setelah prediksi berhasil dibuat"}</p></div>
          </div>
          {prediction && <div className="ml-cycle"><span>Siklus perangkat</span><code>{prediction.cycleId}</code></div>}
        </article>
        <aside className="card ml-context" aria-label="Tentang prediksi">
          <span className="ml-context-icon" aria-hidden="true"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="m3 16 5-5 4 3 8-9M15 5h5v5" /><path d="M3 21h18" /></svg></span>
          <h3>Dari data, menjadi antisipasi.</h3>
          <p>Model mempelajari pola suhu dan TDS untuk memperkirakan kondisi satu jam berikutnya.</p>
          <dl><div><dt>Data masukan</dt><dd>4 jam pembacaan sensor</dd></div><div><dt>Hasil model</dt><dd>Rata-rata TDS · ppm</dd></div></dl>
          <p className="ml-caution">Prediksi bukan pengukuran aktual dan tidak menentukan kelayakan air.</p>
        </aside>
      </div>
      <article className="card prediction-history">
        <div className="panel-header">
          <div><h2>Riwayat prediksi</h2><p>Jejak hasil model, dari yang terbaru · waktu lokal</p></div>
          <span className="ml-count">{history.data?.length ?? 0}<span> / 100 hasil</span></span>
        </div>
        {history.error && <div className="notice error ml-history-notice" role="alert">{history.error} {history.data && "Menampilkan riwayat terakhir yang diterima."}</div>}
        {history.loading ? <div className="empty-state ml-empty"><span className="ml-empty-symbol" aria-hidden="true">···</span><strong>Memuat riwayat prediksi</strong><p>Mengambil hasil yang tersimpan di backend.</p></div> : history.data?.length ? (
          <div className="table-scroll">
            <table>
              <caption className="ml-sr-only">Hingga 100 hasil prediksi TDS terbaru</caption>
              <thead><tr><th scope="col">INTERVAL TARGET</th><th scope="col">PREDIKSI TDS</th><th scope="col">SIKLUS PERANGKAT</th></tr></thead>
              <tbody>{history.data.map((item, index) => (
                <tr key={`${item.cycleId}-${item.targetStart}`}>
                  <td><div className="ml-history-date"><time dateTime={item.targetStart}>{dateTime(item.targetStart)}</time>{index === 0 && <span className="latest-tag">Terbaru</span>}</div><div className="ml-history-end">hingga <time dateTime={item.targetEnd}>{dateTime(item.targetEnd)}</time></div></td>
                  <td><strong className="ml-table-value">{number.format(item.predictedTds)}</strong><span className="unit">ppm</span></td>
                  <td><code className="ml-history-cycle">{item.cycleId}</code></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : <div className="empty-state ml-empty"><span className="ml-empty-symbol" aria-hidden="true">—</span><strong>{history.error ? "Riwayat belum dapat dimuat" : "Belum ada riwayat prediksi"}</strong><p>{history.error ? "Dashboard akan mencoba kembali secara otomatis." : "Hasil akan muncul di sini setelah model menghasilkan prediksi."}</p></div>}
        <div className="table-footer"><span>Hanya prediksi yang berhasil disimpan ditampilkan.</span><span>Satuan TDS · ppm</span></div>
      </article>
    </section>
  );
}
