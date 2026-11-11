# FlowAqua Dashboard

Dashboard Next.js App Router + TypeScript untuk pemantauan suhu dan TDS air perawatan kepiting. UI Bahasa Indonesia, responsif desktop/mobile, grafik suhu/TDS, prediksi ML aktif dan riwayatnya, riwayat pembacaan, dan ekspor CSV.

## Development

Node.js 22+ dan npm.

```sh
npm ci
cp .env.example .env.local
npm run dev -- --port 3001
```

Buka http://localhost:3001. Port 3001 menghindari bentrok dengan backend lokal pada port 3000.

```dotenv
FLOWAQUA_API_URL=https://api.aqua.flow-app.my.id
```

Untuk backend lokal gunakan `FLOWAQUA_API_URL=http://localhost:3000`. Variabel ini server-only, bukan `NEXT_PUBLIC_*`. `.env.local` tidak disimpan di Git. Jangan masukkan URL database atau kredensial Supabase ke frontend.

## Deploy ke Vercel

1. Push project ini ke repository Git, lalu import repository di Vercel.
2. Framework preset: **Next.js**. Jika repository hanya berisi project ini, Root Directory `.`; jika repository berisi folder induk, pilih `flowaqua-dashboard`.
3. Tambahkan environment variable **FLOWAQUA_API_URL** dengan URL backend HTTPS yang dapat diakses Vercel, misalnya `https://api.aqua.flow-app.my.id`.
4. Gunakan build command default `npm run build` dan output directory default Next.js. Deploy.
5. Buka dashboard dan pastikan data muncul. Setiap perubahan environment memerlukan redeploy.

Tidak memerlukan `vercel.json`, WebSocket, koneksi database frontend, atau pengaturan CORS backend. Request browser menuju `/api/readings` pada origin dashboard; Route Handler meneruskan GET ke backend.

## Perilaku data

- Request pertama langsung saat halaman dibuka, kemudian HTTP polling setiap **3.000 ms**. Timer tab background dapat ditunda oleh browser.
- Jika request sebelumnya belum selesai, tick tersebut dilewati agar request tidak menumpuk. Timeout upstream 8 detik, timeout browser 10 detik. Unmount membatalkan request aktif.
- Semua fetch dan respons proxy menggunakan `no-store`. Data berasal dari `GET /readings?limit=100`, divalidasi dengan Zod, lalu diurutkan terbaru dahulu.
- Proxy `/api/prediction/current` dan `/api/prediction/history` mengambil endpoint publik backend `/prediction/current` dan `/prediction/history`, tanpa memakai endpoint perangkat `/prediction/latest`. Respons divalidasi dan dipoll secara independen setiap 3 detik dengan timeout yang sama.
- Prediksi aktif menampilkan TDS, interval target, dan ID siklus hanya ketika status `available`; status `unavailable` ditampilkan sebagai belum ada prediksi aktif. Riwayat terpisah memuat hingga 100 prediksi berhasil terbaru. Waktu target menggunakan zona waktu browser.
- Section ML menggunakan kartu nilai TDS utama, badge ketersediaan, interval target, dan panel penjelasan model. Riwayat menggabungkan awal/akhir target dalam satu kolom dengan penanda hasil terbaru; layout dua kolom berubah menjadi satu kolom di layar kecil.
- Gangguan tiap layanan prediksi ditampilkan secara terpisah; data terakhir dipertahankan dengan peringatan bahwa status dapat berubah.
- Grafik memakai maksimal 100 pembacaan terbaru dengan posisi berdasarkan timestamp; bukan histori lengkap atau jendela waktu tetap. Tabel menampilkan 10 data terbaru. CSV mengekspor seluruh data yang sedang dimuat.
- Waktu ditampilkan dalam zona waktu browser. `recordedAt` adalah waktu penerimaan backend, bukan timestamp pengukuran ESP32.
- Lebih dari 60 detik tanpa pembacaan baru ditandai **Data belum terbaru**. Ini indikator kesegaran, bukan ambang biologis.
- Gangguan koneksi mempertahankan data terakhir dan menampilkan pesan error; polling tetap berjalan. Data kosong ditampilkan secara eksplisit, tanpa data demo/fiktif.
- Suhu/TDS tidak cukup untuk menyimpulkan air aman. Dashboard tidak mengarang ambang ideal, salinitas, pH, atau oksigen terlarut.
- Font DM Sans/Manrope dimuat dari Google Fonts dengan fallback font sistem jika akses tidak tersedia.

## Pemeriksaan

```sh
npm run lint
npm run build
npm start -- --port 3001
```

Smoke browser yang dilakukan: data backend nyata, interval request sekitar 3 detik, pergantian grafik, ekspor CSV, desktop 1440px/mobile 390px tanpa overflow horizontal, data lama, data kosong, kegagalan API dengan retensi data, dan pemulihan otomatis. Skenario kegagalan/kosong disimulasikan hanya di browser pemeriksaan; aplikasi tidak memiliki mode mock.

## Struktur

- `src/app/page.tsx`: dashboard, siklus polling, grafik, tabel, ekspor.
- `src/app/globals.css`: desain responsif.
- `src/app/api/readings/route.ts`: proxy server-only tanpa cache.
- `src/app/predictions.tsx`: polling dan tampilan prediksi aktif serta riwayat.
- `src/app/api/prediction/`: proxy endpoint prediksi publik; `src/lib/prediction-proxy.ts` menangani akses backend.
- `src/lib/predictions.ts`: kontrak dan validasi prediksi.
- `src/lib/readings.ts`: kontrak dan validasi data sensor.

Dashboard dan endpoint GET belum memakai autentikasi; siapa pun yang memiliki URL dashboard dapat membaca data. Backend masih bertanggung jawab atas proteksi endpoint penulisan sensor.
