import { isReadingList } from "@/lib/readings";

export const dynamic = "force-dynamic";

export async function GET() {
  const headers = { "Cache-Control": "no-store, max-age=0" };
  const base = process.env.FLOWAQUA_API_URL;
  if (!base) {
    return Response.json({ message: "FLOWAQUA_API_URL belum dikonfigurasi di server dashboard." }, { status: 503, headers });
  }
  try {
    const url = new URL(`${base.replace(/\/$/, "")}/readings`);
    url.searchParams.set("limit", "100");
    const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error("Backend unavailable");
    const rows: unknown = await response.json();
    if (!isReadingList(rows)) throw new Error("Invalid sensor response");
    rows.sort((a, b) => Date.parse(b.recordedAt) - Date.parse(a.recordedAt));
    return Response.json(rows, { headers });
  } catch {
    return Response.json({ message: "API sensor belum dapat dihubungi. Data terakhir tetap ditampilkan; mencoba lagi otomatis." }, { status: 502, headers });
  }
}
