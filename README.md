# Au7h

Autentikasi berbasis PHP dengan Apache HTTPS, MySQL, dan Tailwind CSS.

## Prasyarat

- Docker
- Bun

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

- `http://localhost:8080`
- `https://localhost:8443`

Script tambahan:

- `bun run dev:up`
- `bun run dev:watch`
- `bun run dev:css`
- `bun run dev:logs`
- `bun run dev:rebuild`
- `bun run dev:stop`

Perubahan di `src/`, `config/`, dan `public/` cukup di-refresh di browser. Perubahan di `resources/tailwind.css` akan memperbarui `public/styles.css`.

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
- sertifikat self-signed dibuat otomatis
- jika port HTTPS host diubah, sesuaikan `PUBLIC_HTTPS_PORT`

## Security

- HTTPS aktif secara default
- CSRF token dan cookie session aman
- session ID diregenerasi setelah login
- password disimpan dengan `Argon2id` + pepper
- username dienkripsi dengan `AES-256-GCM`
- lookup username memakai `HMAC-SHA256`
- rate limit login aktif dan MySQL hanya listen di `127.0.0.1`
