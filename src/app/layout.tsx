import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FlowAqua — Pemantauan Air Kepiting",
  description: "Dashboard pemantauan suhu dan TDS air perawatan kepiting dengan pembaruan setiap 3 detik.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body>{children}</body></html>;
}
