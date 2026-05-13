# Au7h

Autentikasi berbasis PHP dengan Apache HTTPS, MySQL, dan Tailwind CSS.

## Prasyarat

- Docker
- Bun

Install:

- Docker Desktop: https://www.docker.com/products/docker-desktop/
- Docker Engine + Docker Compose plugin: https://docs.docker.com/engine/install/
- Bun: https://bun.sh/docs/installation

One-line install:

```bash
# Debian / Ubuntu
curl -fsSL https://get.docker.com | sh && curl -fsSL https://bun.sh/install | bash

# macOS (Homebrew)
brew install --cask docker && brew install bun
```

```powershell
# Windows PowerShell
winget install -e --id Docker.DockerDesktop; powershell -c "irm bun.sh/install.ps1 | iex"
```

Catatan:

- di macOS dan Windows, buka Docker Desktop sekali setelah install agar daemon aktif
- di Debian atau Ubuntu, mungkin perlu login ulang setelah instalasi Docker sebelum perintah `docker` bisa dipakai tanpa `sudo`

Pastikan perintah ini sudah tersedia:

```bash
docker --version
docker compose version
bun --version
```

## Development

```bash
bun install
bun run dev
```

`bun run dev` akan:

- menyalakan container via `docker compose`
- menyalakan Snort IDS sidecar untuk memonitor traffic ke container aplikasi
- menjalankan watcher Tailwind
- menampilkan log aplikasi

Akses aplikasi di:

- `http://localhost:10080`
- `https://localhost:10443`

Script tambahan:

- `bun run dev:up`
- `bun run dev:watch`
- `bun run dev:css`
- `bun run dev:logs`
- `bun run snort:logs`
- `bun run snort:test-rules`
- `bun run snort:update-rules`
- `bun run acl:status`
- `bun run dev:rebuild`
- `bun run dev:stop`
- `bun run build:css`
- `bun run vendor:motion`
- `bun run commitlint`
- `bun run commitlint:install-hook`

`bun run commitlint:install-hook` akan mengaktifkan hook Git agar `commit` secara otomatis divalidasi oleh Commitlint dengan konvensi conventional commit.

`bun run vendor:motion` menyalin bundle browser terbaru dari paket `motion` ke `public/vendor/motion.js`, berguna setelah upgrade dependensi animasi frontend.

Perubahan di `src/`, `config/`, dan `public/` cukup di-refresh di browser. Perubahan di `resources/tailwind.css` akan memperbarui `public/styles.css`.

Port dev default sengaja memakai `10080` dan `10443` agar tidak bentrok dengan service lokal lain. Kalau ingin ganti:

```bash
HOST_HTTP_PORT=11080 HOST_HTTPS_PORT=11443 bun run dev
```

Sertifikat dev dibaca dari folder `certs/` di host. Jika ingin browser benar-benar menganggap `https://localhost:10443` aman, isi `certs/server.crt` dan `certs/server.key` dengan sertifikat `localhost` dari `mkcert`. Jika file itu belum ada, container akan membuat self-signed cert biasa dan browser akan tetap memberi peringatan.

## Production

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

Catatan:

- HTTP akan diarahkan ke HTTPS
- contoh di atas memakai volume `au7h-certs`; jika mount `/var/www/certs` belum menyediakan `server.crt` dan `server.key`, container akan membuat sertifikat self-signed otomatis
- jika ingin memakai sertifikat sendiri, mount folder host yang berisi `server.crt` dan `server.key` ke `/var/www/certs`
- jika port HTTPS host diubah, sesuaikan `PUBLIC_HTTPS_PORT`

## Security

- HTTPS aktif secara default
- Snort IDS aktif di `compose.dev.yaml` dengan rule lokal untuk ICMP, HTTP/HTTPS, MySQL, dan SSH
- ACL container aktif di development: port HTTP/HTTPS dibuka, port MySQL dan SSH diblokir dari luar container
- CSRF token dan cookie session aman
- session ID diregenerasi setelah login
- password disimpan dengan `Argon2id` + pepper
- username dienkripsi dengan `AES-256-GCM`
- lookup username memakai `HMAC-SHA256`
- throttling auth aktif:
  - login dibatasi `5` percobaan gagal / `15` menit per kombinasi username + IP
  - register dibatasi `3` percobaan gagal / `15` menit per IP
  - request yang melewati batas ditolak dengan status `429`
- image default dan profile development menjalankan MySQL pada `127.0.0.1`; database hanya diakses aplikasi dari dalam container

## Snort + ACL

Konfigurasi tambahan sesuai kebutuhan tugas ada di:

- `security/snort/snort.lua`
- `security/snort/rules/local.rules`
- `security/snort/rules/community.rules`
- `docker/acl.sh`

Rule lokal Snort mendeteksi:

- ICMP/ping ke server
- akses HTTP/HTTPS ke web server
- percobaan akses langsung ke port MySQL `3306`
- percobaan akses SSH port `22`

Perintah cek:

```bash
bun run snort:logs
bun run snort:test-rules
bun run acl:status
```

Untuk memperbarui rule komunitas Snort:

```bash
bun run snort:update-rules
```
