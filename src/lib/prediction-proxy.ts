import { isCurrentPrediction, isPredictionHistory } from "@/lib/predictions";

export async function predictionProxy(kind: "current" | "history") {
  const headers = { "Cache-Control": "no-store, max-age=0" };
  const base = process.env.FLOWAQUA_API_URL;
  if (!base) {
    return Response.json(
      { message: "FLOWAQUA_API_URL belum dikonfigurasi di server dashboard." },
      { status: 503, headers },
    );
  }
  try {
    const response = await fetch(
      new URL(`${base.replace(/\/$/, "")}/prediction/${kind}`),
      {
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!response.ok) throw new Error("Prediction service unavailable");
    const data: unknown = await response.json();
    if (
      kind === "current"
        ? !isCurrentPrediction(data)
        : !isPredictionHistory(data)
    )
      throw new Error("Invalid prediction response");
    return Response.json(data, { headers });
  } catch {
    return Response.json(
      {
        message: `Layanan ${kind === "current" ? "prediksi aktif" : "riwayat prediksi"} belum dapat dihubungi atau mengirim data tidak valid. Mencoba lagi otomatis.`,
      },
      { status: 502, headers },
    );
  }
}
