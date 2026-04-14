# Au7h

## Deskripsi

Au7h adalah aplikasi autentikasi berbasis PHP yang menyediakan proses registrasi dan login melalui Apache HTTPS. Aplikasi ini dirancang dengan 7 lapis keamanan yang saling melengkapi, lalu dijalankan dalam satu container Docker yang juga memuat MySQL untuk penyimpanan data pengguna.

## Ruang Lingkup

- Registrasi akun pengguna
- Login pengguna
- Halaman sambutan setelah autentikasi berhasil
- Halaman informasi saat kredensial tidak valid

## Teknologi

- PHP 8.4
- Apache
- MySQL
- Docker
- Tailwind CSS

## Menjalankan Aplikasi

Prasyarat:

- Docker
- Node.js dan npm

Build image:

```bash
docker build -t au7h .
```

Jalankan container:

```bash
docker run --name au7h \
  -p 8080:8080 \
  -p 8443:8443 \
  -v au7h-data:/var/www/data \
  -v au7h-certs:/var/www/certs \
  -v au7h-mysql:/var/lib/mysql \
  au7h
```

Akses aplikasi:

- `http://localhost:8080`
- `https://localhost:8443`

Catatan:

- Seluruh akses HTTP dialihkan ke HTTPS.
- Sertifikat TLS self-signed dibuat otomatis saat container pertama kali dijalankan.
- Jika port HTTPS pada host diubah, atur `PUBLIC_HTTPS_PORT` agar pengalihan tetap sesuai.

## Mode Pengembangan

Pakai `docker compose` untuk container, lalu jalankan Tailwind watcher di terminal lain.

```bash
npm install
npm run build:css
npm run dev:up
npm run dev:css
```

Atau jalankan keduanya sekaligus:

```bash
npm run dev
```

Perubahan di `src/`, `config/`, dan `public/` cukup di-refresh di browser. Perubahan di `resources/tailwind.css` akan memperbarui `public/styles.css`.

Pakai `npm run dev:logs` untuk log, `npm run dev:stop` untuk berhenti, dan `npm run dev:rebuild` kalau mengubah `Dockerfile`, `docker/`, atau `docker-entrypoint.sh`.

## Penyimpanan Persisten

- `/var/www/data` untuk rahasia runtime aplikasi
- `/var/www/certs` untuk sertifikat TLS
- `/var/lib/mysql` untuk data MySQL

## Build CSS

Langkah ini hanya diperlukan jika aset antarmuka diubah.

```bash
npm install
npm run build:css
```

## 7 Lapis Keamanan

1. HTTPS aktif secara default untuk mengamankan lalu lintas sejak awal.
2. CSRF token dipakai di form autentikasi, dengan session cookie `Secure`, `HttpOnly`, dan `SameSite=Strict`.
3. Session ID diregenerasi setelah login berhasil untuk mencegah session fixation.
4. Password disimpan memakai `Argon2id` dengan tambahan pepper.
5. Username disimpan dalam bentuk terenkripsi `AES-256-GCM`.
6. Pencarian username menggunakan `HMAC-SHA256`, lalu query database tetap memakai `PDO prepared statements`.
7. Percobaan autentikasi dibatasi dengan rate limit, sementara MySQL hanya mendengarkan pada `127.0.0.1` di dalam container.
