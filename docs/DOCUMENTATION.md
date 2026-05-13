# Dokumentasi

## 1. Ringkasan

**Au7h** adalah aplikasi autentikasi berbasis PHP yang dirancang untuk berjalan di atas **Apache HTTPS**, **MySQL**, dan **Tailwind CSS**. .

Di level operasional, aplikasi dikemas sebagai satu container yang menjalankan:

- Apache sebagai web server HTTPS
- PHP 8.4 sebagai runtime aplikasi
- MySQL sebagai penyimpanan data pengguna dan rate limit

## 2. Tujuan dan Karakteristik Utama

Proyek ini dibangun untuk menyediakan fondasi autentikasi yang:

- memiliki alur **registrasi**, **login**, **logout**, dan **halaman welcome**
- mendukung **HTTPS secara default**
- menyimpan password dengan **Argon2id + pepper**
- melindungi username dengan **AES-256-GCM**
- menggunakan **lookup username berbasis HMAC-SHA256**
- menerapkan **CSRF protection**, **secure session cookie**, dan **rate limiting**
- mudah dijalankan secara lokal lewat **Docker Compose** dan **Bun**

## 3. Stack Teknologi

| Area | Teknologi |
| --- | --- |
| Runtime backend | PHP 8.4 |
| Web server | Apache 2 dengan SSL |
| Database | MySQL |
| Frontend styling | Tailwind CSS |
| Frontend motion | Motion (`public/vendor/motion.js`, disinkronkan dari npm `motion`) |
| Visual effect | Matrix animation (`public/vendor/matrix-animation.js`) |
| Tooling JS | Bun |
| Containerization | Docker + Docker Compose |
| CI | GitHub Actions |

## 4. Arsitektur Singkat

Secara struktur, proyek ini memisahkan tanggung jawab menjadi beberapa layer sederhana:

- `public/` sebagai entrypoint HTTP dan aset frontend
- `config/` sebagai bootstrap aplikasi
- `src/Support/` untuk konfigurasi, session, helper request/response
- `src/Security/` untuk validasi, CSRF, enkripsi, hashing, dan proteksi autentikasi
- `src/Infrastructure/` untuk akses database dan penyimpanan data autentikasi
- `src/Presentation/` untuk komposisi HTML halaman
- `docker/` dan `docker-entrypoint.sh` untuk runtime container dan konfigurasi web server

Alur dasarnya:

1. Request masuk ke file di `public/`.
2. File tersebut memanggil `config/bootstrap.php`.
3. Bootstrap memuat seluruh helper inti dan menjalankan `ensure_app_booted()`.
4. Aplikasi membuka session aman, mengirim security headers, dan memastikan tabel database tersedia.
5. Handler halaman atau aksi melakukan validasi, autentikasi, lalu merender HTML atau redirect.

## 5. Struktur Direktori

```text
au7h/
├── config/
│   └── bootstrap.php
├── docker/
│   ├── apache-global.conf
│   ├── apache-http.conf.template
│   ├── apache-ssl.conf.template
│   └── php.ini
├── public/
│   ├── index.php
│   ├── register.php
│   ├── login.php
│   ├── logout.php
│   ├── welcome.php
│   ├── not-registered.php
│   ├── styles.css
│   ├── matrix-rain.js
│   ├── page-shell.js
│   ├── assets/
│   └── vendor/
├── resources/
│   └── tailwind.css
├── src/
│   ├── Infrastructure/
│   │   └── Database.php
│   ├── Presentation/
│   │   └── Views.php
│   ├── Security/
│   │   └── Auth.php
│   └── Support/
│       ├── Config.php
│       └── Http.php
├── .github/workflows/ci.yml
├── compose.dev.yaml
├── Dockerfile
├── docker-entrypoint.sh
├── package.json
└── README.md
```

## 6. Modul Inti

### 6.1 `config/bootstrap.php`

File bootstrap utama aplikasi. Tugasnya:

- mendefinisikan `APP_ROOT`
- memuat file PHP inti dari `src/`
- menjalankan `ensure_app_booted()`

### 6.2 `src/Support/Config.php`

Menyediakan konfigurasi aplikasi dari environment variable dan fallback default.

Konfigurasi penting yang dihasilkan:

- koneksi database: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- `PEPPER_SECRET` untuk password pepper dan lookup username
- `ENCRYPTION_KEY` untuk enkripsi username
- konfigurasi session
- batas rate limit autentikasi

Catatan:

- `ENCRYPTION_KEY` diubah menjadi key biner 32 byte memakai `hash('sha256', ..., true)`
- `APP_DATA_DIR` fallback ke `APP_ROOT . '/data'` bila environment variable tidak ada
- fallback `DB_PASSWORD`, `PEPPER_SECRET`, dan `ENCRYPTION_KEY` di file ini adalah nilai aman-minimum untuk menjalankan app langsung dari PHP; saat container boot, nilainya biasanya dioverride oleh runtime secret dari `docker-entrypoint.sh`

### 6.3 `src/Support/Http.php`

Berisi utilitas request/response dan lifecycle aplikasi, antara lain:

- `start_secure_session()` untuk session cookie aman
- `send_security_headers()` untuk header dasar seperti `Cache-Control: no-store`
- `ensure_app_booted()` untuk inisialisasi session, header, dan database
- helper redirect, flash message, current user, dan guard POST/login

### 6.4 `src/Security/Auth.php`

Modul keamanan utama. Fungsinya mencakup:

- sanitasi output HTML
- pembangkitan dan verifikasi CSRF token
- validasi username dan password
- normalisasi username
- pembuatan lookup username memakai `HMAC-SHA256`
- enkripsi/dekripsi username dengan `AES-256-GCM`
- hashing password memakai `Argon2id`
- verifikasi password tersimpan
- enforcement rate limit autentikasi

Aturan validasi yang berlaku:

- username: 3 sampai 32 karakter
- karakter username yang diizinkan: huruf, angka, spasi, titik, strip, underscore
- password: 10 sampai 72 karakter
- password wajib memuat huruf kecil, huruf besar, dan angka

### 6.5 `src/Infrastructure/Database.php`

Layer database berbasis PDO. Fungsi utamanya:

- membuka koneksi PDO ke MySQL
- membuat tabel jika belum ada
- mengelola data pengguna
- mengelola data rate limit autentikasi

Tabel yang dibuat:

#### `users`

Menyimpan:

- `id`
- `username_lookup`
- `username_encrypted`
- `password_hash`
- `created_at`

#### `auth_rate_limits`

Menyimpan:

- `rate_key`
- `attempts`
- `window_start`

### 6.6 `src/Presentation/Views.php`

Modul presentasi HTML untuk halaman:

- halaman auth gabungan login/register
- halaman welcome
- halaman not registered
- halaman error

Karakter antarmuka yang terlihat dari implementasi:

- layout auth split-screen pada viewport besar
- efek transisi panel login/register
- animasi background bergaya matrix
- penggunaan Tailwind CSS dan variabel tema

## 7. Entry Point Aplikasi

### `public/index.php`

Halaman utama. Fungsi utamanya:

- mengecek apakah user sudah login
- mengarahkan user login ke `/welcome.php`
- menampilkan form auth dalam mode `register` atau `login`

### `public/register.php`

Endpoint POST untuk registrasi. Alurnya:

1. memverifikasi method POST
2. memverifikasi CSRF token
3. menerapkan rate limit bucket `register`
4. memvalidasi username, password, dan konfirmasi password
5. mengecek apakah username sudah terdaftar
6. menyimpan user baru
7. membersihkan rate limit jika sukses
8. menyimpan flash message dan redirect ke mode login

### `public/login.php`

Endpoint POST untuk login. Alurnya:

1. memverifikasi method POST
2. memverifikasi CSRF token
3. menerapkan rate limit bucket `login`
4. memvalidasi format username dan password
5. mencari user berdasarkan `username_lookup`
6. memverifikasi password hash
7. membersihkan rate limit
8. melakukan `session_regenerate_id(true)`
9. menyimpan `user_id` ke session
10. menghasilkan CSRF token baru
11. redirect ke `/welcome.php`

Jika autentikasi gagal, user diarahkan ke `/not-registered.php`.

### `public/logout.php`

Endpoint POST untuk logout. Langkahnya:

- memverifikasi method POST dan CSRF token
- menghapus isi session
- menghapus cookie session
- menghancurkan session
- redirect ke halaman utama

### `public/welcome.php`

Halaman terlindungi yang hanya bisa diakses setelah login. Di sini username didekripsi kembali dari `username_encrypted` sebelum ditampilkan.

### `public/not-registered.php`

Halaman 401 sederhana untuk kondisi login gagal.

## 8. Alur Data Autentikasi

### Registrasi

1. Pengguna mengirim username dan password.
2. Username dinormalisasi.
3. Sistem membuat `username_lookup` memakai `HMAC-SHA256`.
4. Username asli dienkripsi dengan `AES-256-GCM`.
5. Password digabung dengan pepper lalu di-hash menggunakan `Argon2id`.
6. Data disimpan ke tabel `users`.

### Login

1. Username input dinormalisasi.
2. Sistem menghitung `username_lookup`.
3. User dicari tanpa perlu menyimpan username plaintext.
4. Password input diverifikasi terhadap hash tersimpan yang sudah dipadukan dengan pepper.
5. Jika valid, session baru dibuat dan user dianggap terautentikasi.

## 9. Keamanan yang Diimplementasikan

Berikut kontrol keamanan yang terlihat langsung dari kode dan konfigurasi:

- **HTTPS by default** melalui virtual host SSL Apache
- **HTTP redirect ke HTTPS**
- **session cookie aman**:
  - `Secure`
  - `HttpOnly`
  - `SameSite=Strict`
- **session fixation mitigation** lewat `session_regenerate_id(true)` setelah login
- **CSRF token** untuk semua aksi form penting
- **password hashing** dengan `PASSWORD_ARGON2ID`
- **password peppering** lewat `PEPPER_SECRET`
- **username confidentiality** lewat `AES-256-GCM`
- **username lookup tanpa plaintext** lewat `HMAC-SHA256`
- **rate limiting** untuk bucket `login` dan `register`
- **CSP dan security headers** di Apache, termasuk:
  - `Content-Security-Policy`
  - `Referrer-Policy`
  - `X-Content-Type-Options`
  - `Permissions-Policy`
  - `Strict-Transport-Security` untuk host non-localhost
- **MySQL bind ke `127.0.0.1`** di dalam container
- **ACL container** lewat `iptables`: HTTP/HTTPS boleh masuk, MySQL dan SSH ditolak dari luar container
- **Snort IDS** sebagai sidecar di Compose dengan rule lokal untuk ICMP, HTTP/HTTPS, MySQL, dan SSH
- **PHP hardening** di `docker/php.ini`, termasuk menonaktifkan upload dan membatasi input

## 10. Konfigurasi Environment Penting

Konfigurasi repo ini datang dari dua lapis:

- runtime container di `Dockerfile` dan `docker-entrypoint.sh`
- fallback aplikasi PHP di `src/Support/Config.php` jika app dijalankan tanpa environment variable dari container

### 10.1 Runtime container

| Variabel | Fungsi | Default runtime |
| --- | --- | --- |
| `APP_PORT_HTTP` | Port HTTP di dalam container | `8080` |
| `APP_PORT_HTTPS` | Port HTTPS di dalam container | `8443` |
| `PUBLIC_HTTPS_PORT` | Port HTTPS publik untuk redirect | `8443` |
| `APP_DATA_DIR` | Direktori data runtime aplikasi | `/var/www/data` |
| `CERT_DIR` | Lokasi direktori sertifikat TLS | `/var/www/certs` |
| `DB_HOST` | Host database aplikasi | `127.0.0.1` |
| `DB_PORT` | Port database aplikasi | `3306` |
| `DB_NAME` | Nama database aplikasi | `au7h_auth` |
| `DB_USER` | User database aplikasi | `au7h_app` |
| `MYSQL_DATA_DIR` | Lokasi data directory MySQL | `/var/lib/mysql` |
| `MYSQL_DATABASE` | Database bootstrap MySQL | `au7h_auth` |
| `MYSQL_APP_USER` | User aplikasi di MySQL | `au7h_app` |
| `MYSQL_PORT` | Port MySQL internal | `3306` |
| `MYSQL_ROOT_CLIENT_CONFIG` | File opsi client sementara untuk akses root MySQL dari entrypoint | `/var/run/mysqld/root-client.cnf` |
| `ACL_ENABLED` | Mengaktifkan ACL `iptables` di container | `0` runtime, `1` di `compose.dev.yaml` |
| `ACL_WEB_CIDR` | CIDR yang boleh mengakses HTTP/HTTPS | `0.0.0.0/0` |
| `ACL_DB_CIDR` | CIDR khusus yang boleh mengakses MySQL langsung | kosong, berarti tidak ada akses DB eksternal |
| `ACL_ALLOW_ICMP` | Mengizinkan ping masuk jika perlu demo khusus | `0` |

Catatan:

- `docker-entrypoint.sh` membuat file secret runtime di `${APP_DATA_DIR}/runtime-secrets.env`
- file secret itu berisi `PEPPER_SECRET`, `ENCRYPTION_KEY`, `MYSQL_ROOT_PASSWORD`, dan `MYSQL_APP_PASSWORD`
- setelah secret dimuat, entrypoint membuat file opsi client root MySQL di `${MYSQL_ROOT_CLIENT_CONFIG}` dengan permission `600`; file ini dipakai agar password root tidak dikirim lewat argumen command line
- `DB_PASSWORD` akan memakai `MYSQL_APP_PASSWORD` jika `DB_PASSWORD` tidak di-set eksplisit
- jika sertifikat `server.crt` dan `server.key` tidak tersedia di `${CERT_DIR}`, container membuat self-signed certificate otomatis

### 10.2 Fallback konfigurasi PHP aplikasi

Nilai berikut dipakai oleh `app_config()` hanya jika environment variable yang relevan tidak tersedia:

| Variabel/logika | Fungsi | Fallback di aplikasi |
| --- | --- | --- |
| `APP_DATA_DIR` | Direktori data lokal aplikasi | `APP_ROOT . '/data'` |
| `DB_HOST` | Host database | `127.0.0.1` |
| `DB_PORT` | Port database | `3306` |
| `DB_NAME` | Nama database | `au7h_auth` |
| `DB_USER` | User database | `au7h_app` |
| `DB_PASSWORD` | Password database | `change-me` |
| `PEPPER_SECRET` | Pepper password dan lookup | `replace-me-demo-pepper` |
| `ENCRYPTION_KEY` | Sumber key enkripsi username | `replace-me-demo-key` lalu di-hash ke 32 byte |
| `rate_limit_max_attempts` | Maksimum percobaan auth | `10` |
| `rate_limit_window_seconds` | Window rate limit | `600` |
| `session_name` | Nama cookie session | `au7h_sid` |
| `session_ttl` | Lifetime session cookie | `1800` |

## 11. Menjalankan Proyek

### Development

Prasyarat:

- Docker
- Docker Compose plugin
- Bun

Langkah umum:

```bash
bun install
bun run dev
```

Perintah `bun run dev` akan:

- membangun dan menyalakan container development
- menyalakan Snort IDS sidecar
- menjalankan Tailwind watcher
- menampilkan log aplikasi secara live

Perintah keamanan jaringan yang tersedia:

```bash
bun run snort:logs
bun run snort:test-rules
bun run snort:update-rules
bun run acl:status
```

Endpoint default saat development:

- `http://localhost:10080`
- `https://localhost:10443`

Script yang tersedia:

```bash
bun run dev
bun run dev:up
bun run dev:watch
bun run dev:css
bun run dev:logs
bun run dev:rebuild
bun run dev:stop
bun run build:css
bun run vendor:motion
bun run commitlint
```

### Production

Container production dapat dibangun langsung dengan Docker:

```bash
docker build -t au7h .
docker run --name au7h \
  -p 8080:8080 \
  -p 8443:8443 \
  -v au7h-data:/var/www/data \
  -v au7h-certs:/var/www/certs \
  -v au7h-mysql:/var/lib/mysql \
  au7h
```

## 12. Pipeline Frontend

Sumber styling utama ada di `resources/tailwind.css`, lalu dikompilasi menjadi `public/styles.css`.

Konfigurasi Tailwind:

- memindai file PHP di `config/`, `public/`, dan `src/`
- menggunakan CSS variables untuk warna, radius, dan tema dasar
- memuat font kustom `Backwards` dari `public/assets/Backwards.ttf`

Elemen frontend tambahan:

- `public/page-shell.js`
  - menangani klik link internal dan submit form internal via partial page swap
  - memberi animasi perpindahan mode login/register
  - memberi morph transition antara panel auth dan result card
- `public/matrix-rain.js`
  - menginisialisasi animasi matrix di background
  - menghormati `prefers-reduced-motion`
- `public/theme.js`
  - menyimpan preferensi tema di `localStorage`
  - menyinkronkan toggle tema dan perubahan system theme
- `public/vendor/motion.js`
  - bundle browser Motion yang disinkronkan dari paket npm `motion`
- `public/vendor/matrix-animation.js`
  - library efek matrix rain

## 13. Container dan Runtime

### `Dockerfile`

Image dibangun dari `ubuntu:25.10` dan memasang:

- Apache
- PHP 8.4
- modul `php8.4-mysql`
- MySQL server
- OpenSSL

Source aplikasi disalin ke:

- `config` -> `/var/www/html/config`
- `public` -> `/var/www/html/public`
- `src` -> `/var/www/html/src`

### `docker-entrypoint.sh`

Saat container boot, script ini akan:

1. menyiapkan direktori runtime
2. menghasilkan secret acak jika belum ada
3. menulis file opsi client root MySQL sementara dengan permission ketat
4. menghasilkan sertifikat self-signed jika belum ada
5. merender konfigurasi Apache dari template
6. menginisialisasi MySQL jika data directory masih kosong
7. membuat database dan user aplikasi
8. menjalankan MySQL dan Apache sekaligus
9. menangani shutdown keduanya dengan graceful cleanup

## 14. CI dan Quality Check

Workflow CI ada di `.github/workflows/ci.yml`. Saat `push` ke `main` atau `pull_request`, pipeline akan:

1. checkout repository
2. setup Bun `1.3.6`
3. setup PHP `8.4`
4. install dependency JavaScript dengan `bun install --frozen-lockfile`
5. build asset CSS dengan `bun run build:css`
6. lint seluruh file PHP menggunakan `php -l`
7. build image Docker untuk memastikan container tetap valid

Selain itu tersedia script lokal `bun run commitlint` dengan konfigurasi `@commitlint/config-conventional`.
