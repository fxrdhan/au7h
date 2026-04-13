# Kamsis Secure Auth

## Deskripsi

Kamsis Secure Auth adalah aplikasi autentikasi berbasis PHP yang menyediakan proses registrasi dan login melalui Apache HTTPS. Aplikasi dijalankan dalam satu container Docker yang juga memuat MySQL untuk penyimpanan data pengguna.

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
- Tailwind CSS untuk aset antarmuka statis

## Menjalankan Aplikasi

Prasyarat:

- Docker
- Node.js dan npm hanya diperlukan jika ingin membangun ulang file CSS

Build image:

```bash
docker build -t kamsis-secure-auth .
```

Jalankan container:

```bash
docker run --name kamsis-secure-auth \
  -p 8080:8080 \
  -p 8443:8443 \
  -v kamsis-secure-auth-data:/var/www/data \
  -v kamsis-secure-auth-certs:/var/www/certs \
  -v kamsis-secure-auth-mysql:/var/lib/mysql \
  kamsis-secure-auth
```

Akses aplikasi:

- `http://localhost:8080`
- `https://localhost:8443`

Catatan:

- Seluruh akses HTTP dialihkan ke HTTPS.
- Sertifikat TLS self-signed dibuat otomatis saat container pertama kali dijalankan.
- Jika port HTTPS pada host diubah, atur `PUBLIC_HTTPS_PORT` agar pengalihan tetap sesuai.

Contoh:

```bash
docker run --name kamsis-secure-auth \
  -p 28080:8080 \
  -p 28443:8443 \
  -e PUBLIC_HTTPS_PORT=28443 \
  -v kamsis-secure-auth-data:/var/www/data \
  -v kamsis-secure-auth-certs:/var/www/certs \
  -v kamsis-secure-auth-mysql:/var/lib/mysql \
  kamsis-secure-auth
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

## Kontrol Keamanan

- HTTPS aktif secara default
- CSRF token pada form autentikasi
- Session cookie dengan atribut `Secure`, `HttpOnly`, dan `SameSite=Strict`
- Regenerasi session ID setelah login berhasil
- Password disimpan menggunakan `Argon2id` dengan tambahan pepper
- Username disimpan dalam bentuk terenkripsi `AES-256-GCM`
- Pencarian username menggunakan `HMAC-SHA256`
- Query database menggunakan `PDO prepared statements`
- Pembatasan percobaan autentikasi berbasis rate limit
- MySQL hanya mendengarkan pada `127.0.0.1` di dalam container
