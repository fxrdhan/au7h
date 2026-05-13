# Laporan Cakupan Implementasi Requirement Tugas

## Tujuan Dokumen

Dokumen ini menjelaskan **cakupan implementasi** dari requirement tugas pada proyek ini. Fokusnya bukan menyalin seluruh isi file, tetapi memetakan:

1. requirement tugas,
2. implementasi teknis yang dipakai,
3. file yang relevan,
4. cuplikan kode yang benar-benar penting sebagai bukti.

Dengan pendekatan ini, isi laporan tetap ringkas, relevan, dan mudah dipakai saat presentasi atau pengecekan.

## Ringkasan Sistem

Proyek ini adalah aplikasi autentikasi berbasis **PHP + Apache + MySQL dalam satu container**. Yang dimaksud satu container adalah container aplikasi `app`, yaitu tempat Apache, PHP, MySQL, dan OpenSSL berjalan bersama. Service `snort` pada `compose.dev.yaml` adalah sidecar IDS tambahan untuk monitoring jaringan, bukan pemisahan web server atau database ke container lain.

Aplikasi dapat diakses lewat browser, menyediakan form **register** dan **login**, lalu menampilkan:

1. halaman welcome jika login berhasil,
2. halaman "belum terdaftar" jika login gagal.

Selain flow utama tersebut, implementasi juga menutup kebutuhan keamanan yang diminta pada tugas:

1. HTTPS,
2. integritas form,
3. privasi data di database,
4. mitigasi buffer overflow,
5. proteksi SQL injection,
6. proteksi XSS,
7. Snort IDS dan ACL jaringan.

## Pemetaan Requirement Tugas ke Implementasi

| Requirement tugas | Implementasi pada proyek |
| --- | --- |
| Satu container berisi server dan database | Apache, PHP, MySQL, dan OpenSSL dijalankan dalam satu image/container |
| Webserver bisa diakses via browser | Port HTTP/HTTPS dipublish, Apache melayani halaman auth |
| Isi webserver adalah form login dan register | Halaman `/` menampilkan form register/login |
| Login sukses masuk landing page selamat datang username | `welcome.php` mengambil user login dan menampilkan username yang didekripsi |
| Kalau tidak cocok masuk landing page belum terdaftar | `login.php` mengarahkan gagal login ke `not-registered.php` |
| Minimal harus bisa login | Flow register -> login -> welcome sudah tersedia |
| Server dilindungi HTTPS | Apache memaksa redirect HTTP ke HTTPS dan mengaktifkan TLS |
| Algoritma enkripsi webserver boleh default | TLS memakai stack Apache + OpenSSL, dibatasi ke TLS 1.2/1.3 |
| Form dilindungi dari serangan integrity | CSRF token, `POST`-only endpoint, cookie `SameSite=Strict` |
| Data username/password di database tidak boleh terbaca asli | Password di-hash `Argon2id + pepper`, username dienkripsi `AES-256-GCM`, lookup memakai HMAC |
| Lindungi dari buffer overflow | Runtime PHP userland, pembatasan ukuran input/request di `php.ini`, upload dimatikan |
| Lindungi SQL injection | Seluruh query auth memakai PDO prepared statements |
| XSS security | Output di-escape dengan `htmlspecialchars`, CSP dikirim oleh Apache |
| Tambahan Jaringan 3: Snort + ACL | Snort IDS sidecar memonitor traffic container, ACL `iptables` membatasi port masuk |
| Config Snort | `security/snort/snort.lua` mengatur `HOME_NET`, `HTTP_PORTS`, rule path, dan output alert |
| Rule lokal dan update komunitas | `au7h.rules` memuat `local.rules` dan `community.rules`; `local.rules` berisi rule ICMP/port, `community.rules` dapat diperbarui lewat `bun run snort:update-rules` |
| ACL ICMP dan port | HTTP/HTTPS diizinkan, MySQL `3306` dan SSH `22` ditolak dari luar container, ICMP ping bisa dibuka/tutup lewat env |

## File Inti yang Paling Relevan

| File | Peran |
| --- | --- |
| `Dockerfile` | Menyatukan Apache, PHP, MySQL, dan OpenSSL dalam satu container |
| `docker-entrypoint.sh` | Bootstrap secret runtime, sertifikat, MySQL, dan startup service |
| `docker/acl.sh` | ACL jaringan container dengan `iptables` |
| `security/snort/snort.lua` | Konfigurasi Snort 3 untuk IDS |
| `security/snort/rules/au7h.rules` | Aggregator rule Snort yang memuat rule lokal dan rule komunitas |
| `security/snort/rules/local.rules` | Rule lokal Snort untuk ICMP, HTTP/HTTPS, MySQL, dan SSH |
| `docker/apache-http.conf.template` | Redirect HTTP ke HTTPS |
| `docker/apache-ssl.conf.template` | TLS dan security headers |
| `docker/php.ini` | Hardening runtime dan pembatasan input |
| `public/index.php` | Halaman awal login/register |
| `public/register.php` | Proses registrasi akun |
| `public/login.php` | Proses login dan redirect gagal/sukses |
| `public/welcome.php` | Landing page login sukses |
| `public/not-registered.php` | Landing page login gagal |
| `src/Infrastructure/Database.php` | Koneksi database, schema, query prepared statement, rate limit store |
| `src/Security/Auth.php` | Validasi input, CSRF, hashing, enkripsi, XSS escaping |
| `src/Support/Http.php` | Session aman, header dasar, `POST` enforcement |
| `src/Presentation/Views.php` | Aggregator renderer presentasi |
| `src/Presentation/AuthViews.php` | Render form login/register |
| `src/Presentation/ResultViews.php` | Render halaman welcome, gagal login, dan error |
| `src/Presentation/Components.php` | Komponen HTML reusable dan output escaping |

## Cakupan Implementasi per Requirement Tugas

### 1. Satu container untuk server dan database

Requirement tugas memperbolehkan server dan database berada dalam satu container. Implementasi proyek mengikuti itu secara langsung: Apache, PHP, MySQL, dan OpenSSL dipasang di image yang sama, lalu dijalankan lewat `docker-entrypoint.sh`.

Cuplikan relevan:

```dockerfile
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    apache2 \
    libapache2-mod-php8.4 \
    mysql-server \
    openssl

ENTRYPOINT ["docker-entrypoint-custom.sh"]
CMD ["apache2ctl", "-D", "FOREGROUND"]
```

Maknanya:

1. satu image memuat web server sekaligus database,
2. tidak ada pemisahan container,
3. sesuai dengan requirement minimal tugas.

### 2. Webserver bisa diakses user melalui browser

Aplikasi disiapkan agar browser dapat membuka halaman auth, dan request HTTP otomatis diarahkan ke HTTPS.

Cuplikan relevan:

```apacheconf
RewriteEngine On
RewriteCond %{HTTP_HOST} ^([^:]+)(?::\d+)?$ [NC]
RewriteRule ^ https://%1${PUBLIC_HTTPS_SUFFIX}%{REQUEST_URI} [R=301,L,NE]
```

Cuplikan ini menunjukkan bahwa akses biasa lewat HTTP tidak dibiarkan terbuka, tetapi langsung dialihkan ke kanal HTTPS.

### 3. Form register, login, dan landing page sesuai kebutuhan tugas

Halaman awal memuat form register/login. Setelah itu:

1. akun baru bisa dibuat lewat `register.php`,
2. login yang valid menuju `welcome.php`,
3. login yang gagal menuju `not-registered.php`.

Cuplikan relevan dari alur login:

```php
if ($user === null || !verify_stored_password((string) $passwordValidation['value'], (string) $user['password_hash'])) {
    record_auth_rate_limit_failure('login', $submittedUsername);
    unset($_SESSION['user_id']);
    redirect_to('/not-registered.php');
}

session_regenerate_id(true);
$_SESSION['user_id'] = (int) $user['id'];
redirect_to('/welcome.php');
```

Cuplikan relevan dari landing page sukses:

```php
$user = require_login();
render_page_response(200, render_welcome_page(decrypt_username((string) $user['username_encrypted'])));
```

Artinya requirement berikut sudah tertutup:

1. ada form login/register,
2. login sukses menampilkan username,
3. login gagal menampilkan halaman belum terdaftar.

### 4. HTTPS untuk melindungi server

Transport security diaktifkan lewat Apache SSL virtual host. Requirement tugas menyebut algoritma default webserver boleh dipakai; implementasi ini menggunakan stack default Apache + OpenSSL dan membatasi protokol ke TLS modern.

Cuplikan relevan:

```apacheconf
SSLEngine on
SSLCertificateFile ${TLS_CERT_PATH}
SSLCertificateKeyFile ${TLS_KEY_PATH}
SSLProtocol -all +TLSv1.2 +TLSv1.3
```

Maknanya:

1. server benar-benar berjalan dalam mode HTTPS,
2. sertifikat dimuat saat container boot,
3. protokol lama dimatikan.

### 5. Integritas form

Kebutuhan untuk melindungi input form dari serangan integrity diterjemahkan menjadi:

1. semua aksi sensitif hanya boleh `POST`,
2. setiap form membawa CSRF token,
3. token diverifikasi di server,
4. session cookie memakai `SameSite=Strict`.

Cuplikan relevan:

```php
function verify_csrf_or_fail(?string $submittedToken): void
{
    $storedToken = $_SESSION['csrf_token'] ?? '';
    if (!is_string($submittedToken) || !is_string($storedToken) || !hash_equals($storedToken, $submittedToken)) {
        render_page_response(403, render_error_page('Form ditolak', 'Token integritas form tidak valid atau sudah kedaluwarsa.'));
    }
}
```

Dan endpoint dipaksa `POST`:

```php
function require_post_method(): void
{
    if (!request_method_is('POST')) {
        render_page_response(405, render_error_page('Metode tidak diizinkan', 'Gunakan request POST untuk aksi ini.'));
    }
}
```

### 6. Privasi data username dan password di database

Requirement tugas meminta agar jika database bocor, attacker tidak bisa langsung melihat data asli. Implementasinya dibagi dua:

1. **password** tidak disimpan plaintext, tetapi di-hash dengan `Argon2id + pepper`,
2. **username** tidak disimpan plaintext, tetapi dienkripsi dengan `AES-256-GCM`,
3. pencarian user tetap bisa dilakukan memakai `username_lookup` berbasis `HMAC-SHA256`.

Cuplikan relevan:

```php
function username_lookup(string $username): string
{
    return hash_hmac('sha256', normalize_username($username), app_config()['pepper_secret']);
}

function encrypt_username(string $username): string
{
    $cipherText = openssl_encrypt($username, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $iv, $tag);
    return implode('.', [base64url_encode($iv), base64url_encode($tag), base64url_encode($cipherText)]);
}

function hash_password_for_storage(string $password): string
{
    return password_hash($password . '|' . app_config()['pepper_secret'], PASSWORD_ARGON2ID);
}
```

Dengan cara ini:

1. password asli tidak bisa dibalik dari database,
2. username tidak tersimpan polos,
3. username tetap bisa ditampilkan lagi di halaman welcome setelah didekripsi.

### 7. Proteksi SQL injection

SQL injection ditangani dengan PDO native prepared statements dan validasi input sebelum query dijalankan.

Cuplikan relevan:

```php
$pdo = new PDO($dsn, $config['db_user'], $config['db_password'], [
    PDO::ATTR_EMULATE_PREPARES => false,
]);

$statement = db_connection()->prepare(
    'SELECT id, username_lookup, username_encrypted, password_hash, created_at
     FROM users
     WHERE username_lookup = :username_lookup'
);
```

Maknanya:

1. input user diperlakukan sebagai data, bukan bagian dari sintaks SQL,
2. emulasi prepare dimatikan agar mekanisme prepared statement tetap native,
3. serangan seperti `' OR 1=1 --` tidak bisa mengubah arti query.

### 8. Proteksi XSS

XSS ditangani di dua lapisan:

1. output encoding pada sisi PHP,
2. Content Security Policy pada sisi Apache.

Cuplikan relevan:

```php
function escape_html(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}
```

```apacheconf
Header always set Content-Security-Policy "default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; img-src 'self' data:; object-src 'none'; script-src 'self'; style-src 'self'; upgrade-insecure-requests"
Header always set X-Content-Type-Options "nosniff"
```

Artinya:

1. data dari user tidak langsung dirender sebagai HTML mentah,
2. browser dibatasi agar hanya menjalankan resource dari origin sendiri,
3. injeksi script jadi jauh lebih sulit dieksekusi.

### 9. Mitigasi buffer overflow

Karena aplikasi ditulis di PHP userland, risiko buffer overflow klasik lebih kecil dibanding implementasi manual di bahasa non-memory-safe. Namun requirement tugas tetap ditutup dengan pembatasan input dan request di runtime.

Cuplikan relevan:

```ini
file_uploads = Off
max_input_time = 15
max_input_vars = 20
memory_limit = 128M
post_max_size = 8K
upload_max_filesize = 1K
```

Interpretasinya:

1. aplikasi tidak membuka jalur upload yang tidak diperlukan,
2. ukuran request dibatasi,
3. jumlah field input dibatasi,
4. abuse melalui input yang terlalu besar dipersempit.

### 10. Snort IDS dan ACL jaringan

Tambahan dari catatan "Snort + ACL" diterapkan pada level jaringan container development:

1. `snort` berjalan sebagai sidecar di `compose.dev.yaml`,
2. Snort berbagi network namespace dengan container aplikasi sehingga dapat memonitor traffic menuju web server dan database,
3. rule lokal mendeteksi ICMP/ping, akses HTTP/HTTPS, percobaan akses MySQL `3306`, dan percobaan akses SSH `22`,
4. ACL `iptables` membuka HTTP `8080` dan HTTPS `8443`,
5. ACL menolak akses langsung ke MySQL dan SSH dari luar container,
6. MySQL tetap bind ke `127.0.0.1` sehingga hanya aplikasi di dalam container yang memakainya.

Catatan batas cakupan: sidecar Snort tidak mengubah pemenuhan requirement tugas tentang satu container untuk server dan database, karena Apache, PHP, dan MySQL tetap berjalan bersama di container `app`.

Cuplikan rule lokal Snort:

```conf
alert icmp any any -> $HOME_NET any (msg:"AU7H ICMP ping attempt to protected server"; itype:8; sid:1000001; rev:2; classtype:icmp-event;)
alert tcp any any -> $HOME_NET 3306 (msg:"AU7H direct MySQL port access attempt"; sid:1000003; rev:3; classtype:attempted-recon;)
```

Cuplikan ACL:

```sh
iptables -w -A "${ACL_CHAIN}" -p tcp -s "${ACL_WEB_CIDR}" -m multiport --dports "${APP_PORT_HTTP},${APP_PORT_HTTPS}" -j ACCEPT
iptables -w -A "${ACL_CHAIN}" -p tcp --dport "${MYSQL_PORT}" -j REJECT
iptables -w -A "${ACL_CHAIN}" -p tcp --dport 22 -j REJECT
```

Maknanya:

1. user tetap bisa membuka aplikasi lewat browser,
2. database tidak terbuka langsung ke user,
3. percobaan ping atau akses port sensitif tetap tercatat oleh Snort untuk kebutuhan demo IDS.

## Alur Demo yang Menjawab Penilaian Minimum

Untuk menunjukkan bahwa konfigurasi dan implementasi benar, alur demo yang paling relevan adalah:

1. jalankan container,
2. buka aplikasi lewat browser,
3. pastikan halaman awal menampilkan form register/login,
4. buat akun baru,
5. login dengan akun tersebut,
6. pastikan tampil landing page welcome berisi username,
7. logout,
8. login dengan data yang salah,
9. pastikan diarahkan ke halaman "belum terdaftar".

Contoh perintah yang dipakai saat pengujian:

```bash
bun run build:css
docker compose -f compose.dev.yaml up -d --build
curl -I http://localhost:18080
curl -k -I https://localhost:10443
```

## Catatan Implementasi

Ada tiga catatan penting supaya penjelasan implementasi tetap jujur dan jelas:

1. penggunaan satu container adalah keputusan yang sengaja mengikuti requirement tugas, bukan pola deployment produksi yang paling ideal,
2. Snort berjalan sebagai sidecar IDS untuk kebutuhan tambahan monitoring jaringan, bukan sebagai pemisahan web server atau database,
3. halaman gagal login dibuat khusus ke "belum terdaftar" karena itu yang diminta di soal, walaupun pada sistem produksi biasanya pesan gagal dibuat lebih generik.

## Kesimpulan

Secara cakupan, proyek ini sudah mengimplementasikan inti requirement tugas:

1. satu container berisi server dan database,
2. webserver bisa diakses via browser,
3. tersedia form register dan login,
4. login sukses menuju landing page welcome dengan username,
5. login gagal menuju landing page belum terdaftar,
6. HTTPS aktif,
7. integritas form dilindungi,
8. data akun di database tidak disimpan dalam bentuk asli,
9. ada mitigasi untuk buffer overflow, SQL injection, dan XSS,
10. Snort IDS dan ACL jaringan sudah dicakup sebagai tambahan requirement jaringan.

Jadi isi laporan ini sekarang berfungsi sebagai **dokumen cakupan implementasi requirement tugas**, bukan sebagai dump seluruh source code.
