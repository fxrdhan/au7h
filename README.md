# Kamsis Secure Auth

Project ini memenuhi kebutuhan tugas dengan satu container saja: web server HTTPS dan database SQLite berada di dalam container yang sama.

## Fitur

- Form `register` dan `login` yang bisa diakses lewat browser.
- Landing page sukses: `Selamat datang, <username>`.
- Landing page gagal: `Anda belum terdaftar`.
- HTTPS aktif dengan sertifikat self-signed yang dibuat otomatis saat container pertama kali jalan.
- Satu database file SQLite di dalam container, tanpa service database terpisah.

## Cara Menjalankan

Project ini sengaja ditaruh di partisi root agar ruangnya lebih longgar dan tetap rapi untuk deployment:

- Lokasi project: `/srv/kamsis-secure-auth`

Build image:

```bash
cd /srv/kamsis-secure-auth
docker build -t kamsis-secure-auth .
```

Jalankan container:

```bash
docker run --name kamsis-secure-auth \
  -p 8080:8080 \
  -p 8443:8443 \
  -v kamsis-secure-auth-data:/app/data \
  -v kamsis-secure-auth-certs:/app/certs \
  kamsis-secure-auth
```

Buka di browser:

```text
https://localhost:8443
```

Karena sertifikatnya self-signed, browser akan menampilkan warning sekali di awal. Itu normal untuk demo lokal.

## Git Workflow

Repo ini memakai `commitlint` dengan aturan conventional commits. Contoh cek manual:

```bash
npm run commitlint -- --from HEAD~1 --to HEAD
```

Kalau port host HTTPS ingin diganti, misalnya ke `28443`, pakai env `PUBLIC_HTTPS_PORT` agar redirect dari HTTP tetap benar:

```bash
docker run --name kamsis-secure-auth \
  -p 28080:8080 \
  -p 28443:8443 \
  -e PUBLIC_HTTPS_PORT=28443 \
  kamsis-secure-auth
```

## Mapping Keamanan

- `HTTPS`: server jalan di `8443` dengan TLS minimum `1.2` dan cipher default dari OpenSSL/Node.
- `Integrity form`: semua form punya CSRF token, cookie session `HttpOnly + SameSite=Strict`, dan body request dibatasi `8kb`.
- `Privacy database`: password tidak disimpan polos, tetapi di-hash dengan `scrypt + salt + pepper`. Username juga tidak disimpan polos, tetapi dienkripsi dengan `AES-256-GCM`.
- `Jika database dump bocor`: attacker hanya melihat `username_encrypted`, `username_lookup` hasil `HMAC-SHA256`, dan `password_hash`, bukan data asli.
- `Buffer overflow`: aplikasi memakai Node.js/JavaScript yang memory-safe untuk logic utama, lalu input dibatasi ukuran dan panjangnya.
- `SQL injection`: semua query ke SQLite memakai prepared statement.
- `XSS security`: output username di-escape, CSP aktif via `helmet`, dan tidak ada raw HTML dari input user.
- `Server hardening`: `helmet`, `Cache-Control: no-store`, `x-powered-by` dimatikan, rate limiting sederhana untuk login/register, dan session timeout 30 menit.

## Struktur Data

Tabel `users` menyimpan:

- `username_lookup`: HMAC untuk pencarian login tanpa menyimpan username asli.
- `username_encrypted`: username terenkripsi `AES-256-GCM`.
- `password_hash`: hash `scrypt`.

## Catatan

- Kalau ingin menjalankan tanpa Docker, pastikan sertifikat ada di folder `certs/` lalu jalankan `npm start`.
- Secret runtime pertama kali dibuat otomatis ke file `/app/data/runtime-secrets.env` agar tidak ikut tersimpan di database.
