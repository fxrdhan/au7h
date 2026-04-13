# Kamsis Secure Auth PHP

Project ini sekarang memakai PHP, bukan JavaScript, dengan satu container saja: web server Apache HTTPS dan database SQLite berada di container yang sama.

## Stack

- PHP 8.4
- Apache
- SQLite
- Docker

## Fitur

- Form `register` dan `login` yang bisa diakses lewat browser.
- Landing page sukses: `Selamat datang, <username>`.
- Landing page gagal: `Anda belum terdaftar`.
- HTTPS aktif dengan sertifikat self-signed yang dibuat otomatis saat container pertama kali jalan.
- Database SQLite berada di satu container dengan web server.

## Lokasi Project

- Repo utama: `/srv/kamsis-secure-auth`
- Symlink dari workspace: `/home/fxrdhan/Documents/kamsis-secure-auth`

## Menjalankan

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
  -v kamsis-secure-auth-data:/var/www/data \
  -v kamsis-secure-auth-certs:/var/www/certs \
  kamsis-secure-auth
```

Buka di browser:

```text
https://localhost:8443
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

- `HTTPS`: Apache melayani TLS dengan minimum `TLSv1.2`.
- `Integrity form`: semua form punya CSRF token, session cookie `HttpOnly + SameSite=Strict`, dan ukuran body request dibatasi di `php.ini`.
- `Privacy database`: password disimpan dengan `password_hash(..., PASSWORD_ARGON2ID)`. Username tidak disimpan polos, tetapi dienkripsi `AES-256-GCM`.
- `Jika database dump bocor`: attacker hanya melihat `username_encrypted`, `username_lookup` hasil `HMAC-SHA256`, dan `password_hash`.
- `Buffer overflow`: logic utama memakai PHP yang memory-safe, lalu input panjang dan ukuran POST dibatasi.
- `SQL injection`: query database memakai `PDO prepared statements`.
- `XSS security`: output memakai `htmlspecialchars`, ditambah CSP dan security headers dari Apache.
- `Server hardening`: `ServerSignature Off`, `TraceEnable Off`, HSTS, CSP, `nosniff`, dan rate limit sederhana untuk endpoint auth.

## Git Workflow

Repo ini tetap memakai `commitlint` untuk pesan commit:

```bash
npm run commitlint -- --from HEAD~1 --to HEAD
```
