# FlowAqua Dashboard

Dashboard Next.js App Router + TypeScript untuk pemantauan suhu dan TDS air perawatan kepiting. UI Bahasa Indonesia, responsif desktop/mobile, grafik suhu/TDS, riwayat pembacaan, dan ekspor CSV. Backend tidak diubah.

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
- `src/lib/readings.ts`: kontrak dan validasi data sensor.

Dashboard dan endpoint GET belum memakai autentikasi; siapa pun yang memiliki URL dashboard dapat membaca data. Backend masih bertanggung jawab atas proteksi endpoint penulisan sensor.
