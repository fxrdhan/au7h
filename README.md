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
- `bun run dev:rebuild`
- `bun run dev:stop`

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
- jika `certs/server.crt` dan `certs/server.key` tidak tersedia, sertifikat self-signed dibuat otomatis
- jika port HTTPS host diubah, sesuaikan `PUBLIC_HTTPS_PORT`

## Security

- HTTPS aktif secara default
- CSRF token dan cookie session aman
- session ID diregenerasi setelah login
- password disimpan dengan `Argon2id` + pepper
- username dienkripsi dengan `AES-256-GCM`
- lookup username memakai `HMAC-SHA256`
- rate limit login aktif dan MySQL hanya listen di `127.0.0.1`
