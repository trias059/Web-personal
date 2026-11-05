# Rumah Digital · Trias Aji Lomanto

Website pribadi yang jadi pusat belajar (bahasa, backend, AI) dan tempat menyimpan kehidupan digital. Isinya beberapa *room* dengan hak akses berlapis sesuai peran tamu, ditambah fitur AI: tutor, generator kuis, teman curhat, dan analisis sentimen untuk mood tracking.

| Room | Isi |
|---|---|
| **Biodata** (Ruang Tamu) | Profil, foto, keahlian, dan detail/kontak yang masing-masing punya visibility. |
| **Learning Room** (Ruang Belajar) | Materi per jalur Bahasa, Backend, dan AI: catatan, progres, AI tutor, kuis AI, flashcard dengan spaced repetition. |
| **Daily Vlog** (Teras) | Jurnal harian dengan foto/video (URL) dan komentar. |
| **Curhat Room** (Kamar) | Jurnal pribadi, analisis mood setiap entri, grafik mood, teman curhat AI. |
| **Kenangan** (Loteng) | Galeri foto dan catatan kenangan bertanggal, dengan komentar. |
| **Data Management** (Ruang Kendali) | Statistik, kelola pengguna dan role, moderasi komentar. |

## Peran & hak akses

| Role | Room yang bisa dibuka | Data yang terlihat | Komentar |
|---|---|---|---|
| `super_admin` (pemilik) | Semua room, CRUD penuh, kelola user | Semua | Ya |
| `keluarga` | Biodata, Vlog, Kenangan | Semua (private, shared, public) | Ya |
| `teman_dekat` | Biodata, Vlog, Kenangan | `shared` dan `public` | Ya |
| `teman` | Biodata, Vlog | `public` | Tidak |
| `umum` (tanpa login) | Landing + Biodata | Detail biodata `public` | Tidak |

- Setiap data di room bersama (detail Biodata, Vlog, Kenangan) punya field `visibility`: `private` / `shared` / `public`.
- Aturan ini ada di satu tempat, [`backend/internal/access/access.go`](backend/internal/access/access.go), dan diterapkan lewat middleware Gin (`requireRoom`, `ownerOnly`). Frontend memakai daftar room yang dikirim backend untuk navigasi dan route guard; backend tetap memeriksa ulang setiap request.
- Konten yang tidak boleh dilihat dijawab `404`, bukan `403`, supaya keberadaannya tidak bocor.

## Tech stack

- **Backend**: Go 1.26, Gin, sqlx, migrasi [goose](https://github.com/pressly/goose), PostgreSQL (pgx) atau SQLite (modernc, pure Go), JWT (HS256) + bcrypt.
- **Frontend**: React 19 + Vite + TypeScript, Tailwind CSS v4, React Router, Zustand (sesi), TanStack Query (data server).
- **AI**: service layer `backend/internal/ai`: klien untuk endpoint chat completions yang kompatibel dengan OpenAI, serta analisis sentimen berbasis leksikon (Indonesia + Inggris) yang berjalan lokal.

```
backend/
  cmd/server/            entry point (config, migrasi, seed pemilik, HTTP server)
  internal/access/       tabel role, room, visibility
  internal/ai/           klien LLM, prompt, kuis, analisis sentimen
  internal/api/          router Gin, middleware, handler per room, tes integrasi
  internal/auth/         bcrypt + JWT
  internal/config/       pembacaan env
  internal/srs/          penjadwalan flashcard (spaced repetition)
  internal/store/        query database + migrasi (postgres/ dan sqlite3/)
  Dockerfile
frontend/
  src/components/        layout, guard, UI kecil, chat AI, grafik mood
  src/lib/               API client, tipe, metadata room, helper
  src/pages/             satu file per room/halaman
  vercel.json
```

## Menjalankan secara lokal

Prasyarat: Go 1.26+, Node.js 22.22+ (npm). PostgreSQL opsional; tanpa PostgreSQL backend memakai SQLite.

### 1. Backend (SQLite, paling cepat)

```bash
cd backend
cp .env.example .env
```

Isi minimal `JWT_SECRET` (buat dengan `openssl rand -hex 32`), `OWNER_EMAIL`, dan `OWNER_PASSWORD` di `.env`, lalu:

```bash
go run ./cmd/server
```

Server berjalan di `http://localhost:8080`, database tersimpan di `backend/data/rumah.db`, dan akun pemilik dibuat otomatis saat start pertama. Cek dengan `curl http://localhost:8080/api/health`.

### 2. Backend dengan PostgreSQL (opsional)

Jalankan PostgreSQL (lokal atau lewat Docker), lalu ganti `DATABASE_URL` di `.env`:

```bash
docker run -d --name rumah-pg -e POSTGRES_USER=rumah -e POSTGRES_PASSWORD=rumah -e POSTGRES_DB=rumah -p 5432:5432 postgres:16
```

```
DATABASE_URL=postgres://rumah:rumah@localhost:5432/rumah?sslmode=disable
```

Migrasi dijalankan otomatis setiap server start.

### 3. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Buka `http://localhost:5173` dan masuk dengan `OWNER_EMAIL`/`OWNER_PASSWORD`.

### 4. Mengaktifkan AI

Isi tiga variabel ini di `backend/.env` lalu restart backend. Tanpa variabel ini, tutor/kuis/teman curhat menampilkan pesan "belum dikonfigurasi", sedangkan analisis sentimen tetap jalan karena tidak memakai LLM.

| Provider | `AI_BASE_URL` | `AI_MODEL` (contoh) | `AI_API_KEY` |
|---|---|---|---|
| OpenAI | `https://api.openai.com/v1` | model chat yang tersedia di akunmu | API key OpenAI |
| Anthropic | `https://api.anthropic.com/v1` | `claude-haiku-5-5` | API key Anthropic |
| Ollama (lokal) | `http://localhost:11434/v1` | `llama3.2` | boleh kosong |

Backend hanya mengirim `model` dan `messages` agar cocok untuk semua provider di atas. Anthropic menyebut lapisan kompatibilitas OpenAI-nya terutama untuk uji coba; untuk pemakaian jangka panjang cek dokumentasi provider.

## Environment variables

**Backend** (`backend/.env`, atau dashboard Railway/Render)

| Variabel | Wajib | Keterangan |
|---|---|---|
| `JWT_SECRET` | ya | Minimal 32 karakter. Server menolak start tanpa ini. |
| `DATABASE_URL` | tidak | `postgres://...` atau `postgresql://...` = PostgreSQL; selain itu dianggap path file SQLite. Default `data/rumah.db`. |
| `OWNER_EMAIL`, `OWNER_PASSWORD` | saat pertama | Membuat akun `super_admin` jika belum ada. Password minimal 8 karakter. |
| `OWNER_NAME` | tidak | Default `Trias Aji Lomanto`. |
| `CORS_ORIGINS` | tidak | Origin frontend, pisahkan dengan koma. Mendukung wildcard, mis. `https://web-personal-*.vercel.app`. Default `http://localhost:5173`. |
| `JWT_TTL` | tidak | Masa berlaku token, default `72h`. |
| `PORT` | tidak | Default `8080`; Railway/Render mengisinya otomatis. |
| `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL` | tidak | Lihat bagian AI di atas. |

**Frontend** (`frontend/.env`, atau Environment Variables di Vercel)

| Variabel | Keterangan |
|---|---|
| `VITE_API_URL` | URL backend tanpa `/api`, mis. `https://rumah-digital.up.railway.app`. Nilainya ditanam saat build, jadi frontend harus di-build ulang setiap kali nilainya berubah. |

## Testing

```bash
cd backend
go vet ./...
go test ./...
```

Tes integrasi API (`internal/api/api_test.go`) memeriksa seluruh matriks role: siapa melihat apa di tiap room, komentar, Curhat yang khusus pemilik, kuis dan chat AI (dengan server LLM tiruan), serta pengelolaan user. Secara default tes memakai SQLite. Untuk menjalankan skenario yang sama di PostgreSQL, arahkan ke database **khusus tes**, karena schema `public`-nya dikosongkan di setiap tes:

```bash
TEST_DATABASE_URL='postgres://rumah:rumah@localhost:5432/rumah_test?sslmode=disable' go test ./internal/api/
```

```bash
cd frontend
npm run lint
npm run build
```

## API

Semua endpoint ada di bawah `/api`. Header `Authorization: Bearer <token>` dipakai untuk pengguna yang login. Error selalu berbentuk `{"error": "pesan"}`.

| Endpoint | Akses |
|---|---|
| `GET /health` | publik |
| `POST /auth/register`, `POST /auth/login`, `GET /auth/me` | publik / login |
| `GET /profile`; `PUT /profile`; `POST\|PUT\|DELETE /profile/details[/:id]` | semua (detail difilter visibility); tulis: pemilik |
| `GET /vlogs[/:id]`; `POST\|PUT\|DELETE /vlogs[/:id]` | keluarga, teman dekat, teman (difilter); tulis: pemilik |
| `GET /memories[/:id]`; `POST\|PUT\|DELETE /memories[/:id]` | keluarga, teman dekat (difilter); tulis: pemilik |
| `GET /comments?target_type=vlog\|memory&target_id=`; `POST /comments`; `DELETE /comments/:id` | yang bisa melihat kontennya; tulis: keluarga, teman dekat, pemilik |
| `GET\|POST /learning`, `GET\|PUT\|DELETE /learning/:id`, `GET\|POST /learning/:id/flashcards` | pemilik |
| `GET /flashcards/due?track=`, `POST /flashcards/:id/review`, `DELETE /flashcards/:id` | pemilik |
| `GET\|POST /curhat`, `PUT\|DELETE /curhat/:id`, `POST /curhat/:id/reply` | pemilik |
| `POST /ai/chat` (`mode`: `tutor`/`curhat`), `POST /ai/quiz`, `POST /ai/sentiment` | pemilik |
| `GET /admin/stats`, `GET /admin/users`, `PATCH\|DELETE /admin/users/:id`, `GET /admin/comments` | pemilik |

## Deploy

Frontend di-deploy ke **Vercel**. Backend Go berjalan sebagai server yang hidup terus dan butuh database, jadi tidak cocok sebagai fungsi serverless Vercel; backend di-deploy ke **Railway** atau **Render** memakai `backend/Dockerfile`.

> Kode ada di branch kerja. Gabungkan (merge) PR ke `main` dulu, atau pilih branch tersebut saat menghubungkan repo di Railway/Render/Vercel.

### 1. Backend ke Railway (disarankan)

1. Di [railway.com](https://railway.com): **New Project → Deploy from GitHub repo**, pilih `trias059/Web-personal`.
2. Buka service tersebut → **Settings → Root Directory**: `backend`. Railway otomatis memakai `Dockerfile` di folder itu.
3. **+ New → Database → PostgreSQL** di project yang sama.
4. Di service backend → **Variables**, tambahkan:
   - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}` (referensi ke database tadi)
   - `JWT_SECRET`, `OWNER_EMAIL`, `OWNER_PASSWORD`
   - `CORS_ORIGINS` = URL Vercel (diisi setelah langkah frontend)
   - opsional: `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL`
5. **Settings → Networking → Generate Domain** untuk mendapat URL publik, lalu di bagian **Deploy** isi **Healthcheck Path** dengan `/api/health`.
6. Cek `https://<domain-railway>/api/health` mengembalikan `{"status":"ok"}`.

### Alternatif: Render

1. **New → Web Service**, hubungkan repo, **Root Directory** `backend`, **Runtime** Docker.
2. **Health Check Path** `/api/health`; isi environment variables yang sama.
3. Database: buat Render PostgreSQL (atau Neon/Supabase) dan isi `DATABASE_URL` dengan connection string-nya. Cek batas paket gratis masing-masing; web service gratis Render tertidur saat tidak dipakai, jadi request pertama setelahnya lambat.

Jangan memakai SQLite di Railway/Render tanpa volume: disk container hilang setiap redeploy.

### 2. Frontend ke Vercel

1. Di [vercel.com](https://vercel.com): **Add New → Project**, import `trias059/Web-personal`.
2. **Root Directory**: `frontend`. Framework terdeteksi sebagai Vite (build `npm run build`, output `dist`).
3. **Environment Variables**: `VITE_API_URL` = URL backend dari langkah sebelumnya (tanpa `/api`).
4. Deploy. `vercel.json` sudah mengarahkan semua path ke `index.html` supaya refresh di `/vlog/12` tidak 404.

Lewat CLI juga bisa: `npm i -g vercel`, lalu `vercel` di folder `frontend` (akan diminta login).

### 3. Sambungkan keduanya

1. Isi `CORS_ORIGINS` di backend dengan domain Vercel, mis. `https://web-personal.vercel.app,https://web-personal-*.vercel.app` (pola kedua untuk preview deployment), lalu redeploy backend.
2. Jika URL backend berubah, ubah `VITE_API_URL` di Vercel lalu **redeploy** frontend.
3. Masuk dengan akun pemilik, isi Biodata, lalu atur peran tamu di Data Management.

## Keputusan desain

- **Satu repo, dua folder** (`backend/`, `frontend/`): di-deploy terpisah lewat pengaturan Root Directory masing-masing platform.
- **Visibility hanya di room bersama.** Learning dan Curhat hanya bisa dibuka pemilik, jadi field visibility di sana tidak punya efek dan sengaja tidak dibuat.
- **"Keluarga melihat semua"** diartikan termasuk konten `private`. Konten yang benar-benar hanya untuk diri sendiri tempatnya di Curhat.
- **Vlog dan Kenangan berbagi satu implementasi CRUD** karena bentuk datanya sama (judul, isi, media, tanggal, visibility). Tabelnya tetap terpisah sesuai model data; konsekuensinya kolom catatan Kenangan bernama `body`, bukan `note`.
- **Pendaftar baru berperan `teman`.** Pemilik menaikkan peran lewat Data Management. Role dibaca ulang dari database di setiap request, jadi perubahan role langsung berlaku tanpa login ulang.
- **Hanya ada satu `super_admin`.** Akun ini dibuat dari env, dijaga unique index di database, dan tidak bisa diubah atau dihapus lewat API supaya pemilik tidak terkunci dari rumahnya sendiri.
- **Media berupa URL, bukan upload.** Disk Railway/Render tidak permanen; simpan foto/video di layanan seperti Google Photos, Cloudinary, atau YouTube, lalu tempel tautannya.
- **Riwayat chat AI tidak disimpan.** Frontend mengirim riwayat utuh setiap giliran. Yang disimpan hanya balasan AI untuk entri Curhat (`ai_reply`).
- **Analisis sentimen memakai leksikon lokal**, bukan LLM: gratis, deterministik, tetap jalan tanpa API key, dan bisa diuji. Aturannya mencakup negasi ("tidak senang"), penguat ("senang banget"), pelunak ("agak capek"), kontras ("capek tapi senang"), bahasa gaul, dan emoji. Leksikon sederhana tentu tidak menangkap sarkasme.
- **Token disimpan di localStorage.** Paling sederhana untuk frontend dan backend yang beda domain. Risikonya XSS; React meng-escape semua konten, dan URL media dibatasi ke `http(s)`.

## Keamanan

Password di-hash dengan bcrypt (cost 12). Login tetap menjalankan bcrypt walau email tidak terdaftar, supaya email yang ada tidak bisa ditebak dari lama respons. JWT HS256 punya masa berlaku, dan algoritmanya dikunci saat verifikasi. Semua input divalidasi (panjang, format email/URL/tanggal, enum), body request dibatasi 1 MB, CORS hanya untuk origin yang didaftarkan, dan semua rahasia dibaca dari env (`.env` tidak di-commit). Endpoint AI hanya untuk pemilik supaya kuota API tidak bisa dipakai tamu.

Yang belum ada: rate limiting pada login dan endpoint AI. Untuk situs publik, tambahkan ini di reverse proxy atau sebagai middleware.

## Menambah room baru

1. Tambah konstanta room dan aturan aksesnya di `backend/internal/access/access.go`.
2. Tambah migrasi baru di `backend/internal/store/migrations/postgres/` **dan** `sqlite3/`, misalnya `00002_...sql`.
3. Tulis query di `internal/store`, handler di `internal/api`, lalu daftarkan route di `server.go`.
   - Jika bentuknya sama dengan Vlog/Kenangan, cukup buat tabelnya, tambahkan `ContentKind` di `store/content.go` dan satu entri di `contentRooms` (`api/content.go`), lalu buat `ContentConfig` baru di frontend.
4. Frontend: tambahkan entri di `ROOMS` (`src/lib/rooms.ts`) dan route-nya di `src/App.tsx` (dibungkus `RoomGuard`).
