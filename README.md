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

Workflow dev sekarang memakai `docker compose` dengan bind mount untuk `config/`, `public/`, dan `src/`, jadi perubahan file PHP, JS, dan aset statis langsung terbaca oleh container tanpa rebuild image setiap kali.

Setup awal:

```bash
npm install
npm run build:css
```

Jalankan stack pengembangan:

```bash
npm run dev:up
```

Jalankan watcher Tailwind di terminal lain:

```bash
npm run dev:css
```

Atau pakai satu perintah berikut untuk menyalakan container lalu langsung masuk ke mode watch CSS:

```bash
npm run dev
```

Selama mode pengembangan aktif:

- Ubah file di `src/`, `config/`, atau `public/`, lalu cukup refresh browser.
- Ubah file Tailwind di `resources/tailwind.css`, watcher akan memperbarui `public/styles.css`, lalu refresh browser.
- Lihat log container dengan `npm run dev:logs`.
- Hentikan stack dengan `npm run dev:stop`.

Kapan masih perlu rebuild container:

- Saat mengubah `Dockerfile`
- Saat mengubah file di folder `docker/`
- Saat mengubah `docker-entrypoint.sh`

Untuk kasus di atas, jalankan:

```bash
npm run dev:rebuild
```

Contoh:

```bash
docker run --name au7h \
  -p 28080:8080 \
  -p 28443:8443 \
  -e PUBLIC_HTTPS_PORT=28443 \
  -v au7h-data:/var/www/data \
  -v au7h-certs:/var/www/certs \
  -v au7h-mysql:/var/lib/mysql \
  au7h
```

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
