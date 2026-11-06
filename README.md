# TradeAutoIndodax

[![GitHub repo stars](https://img.shields.io/github/stars/MinatoAka/TradeAutoIndodax?style=social)](https://github.com/MinatoAka/TradeAutoIndodax/stargazers)
[![Issues](https://img.shields.io/github/issues/MinatoAka/TradeAutoIndodax)](https://github.com/MinatoAka/TradeAutoIndodax/issues)
[![License](https://img.shields.io/github/license/MinatoAka/TradeAutoIndodax)](LICENSE)
[![JavaScript](https://img.shields.io/badge/Language-JavaScript-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)

Bot trading otomatis untuk market Indodax yang dijalankan melalui Google Apps Script (GAS). Bot memantau harga ticker, mengecek status posisi, dan mengeksekusi order `MARKET` saat sinyal beli atau jual terpenuhi.

> Peringatan: Dokumentasi ini untuk edukasi dan eksplorasi teknis, bukan saran investasi atau jaminan keuntungan. Trading aset kripto berisiko. Uji dengan nominal kecil, pahami kode sebelum menggunakannya, dan pastikan API key Anda aman.

## ✨ Fitur utama

- `MARKET` order execution untuk beli/jual agar eksekusi lebih stabil dan tidak menggantung seperti order limit yang kadang gagal.
- `LockService` untuk mencegah trigger berjalan ganda di saat yang sama.
- `Single-position guard` agar bot hanya membuka satu posisi dalam satu periode tertentu.
- `Cooldown` dan `maxDailyTrades` untuk membatasi frekuensi trading.
- `Circuit breaker` ketika saldo tidak cukup atau status bot tidak konsisten.
- `Auto calibration` berdasarkan harga saat ini untuk menghitung trigger beli/jual secara cepat.
- `Script Properties`-based configuration agar pengaturan mudah diubah tanpa edit kode.

## ⚙️ Cara kerja

1. Bot membaca harga market dari API Indodax.
2. Jika harga turun sampai `BOT_BUY_TRIGGER` dan status bot `KOSONG`, bot mengecek saldo lalu mengirim order beli.
3. Status berubah menjadi `PEGANG` setelah pembelian berhasil.
4. Jika harga naik sampai `BOT_SELL_TRIGGER` dan status bot `PEGANG`, bot mengecek saldo aset lalu mengirim order jual.
5. Status kembali menjadi `KOSONG` setelah penjualan berhasil.
6. Bot juga memeriksa cooldown, saldo, dan batas harian sebelum mengeksekusi trade.

## Persyaratan

- Akun Google dan akses ke Google Apps Script.
- Akun Indodax dengan API Key dan Secret Key yang memiliki izin untuk membaca saldo dan melakukan order.
- Pair Indodax yang valid, misalnya `ethidr`, `btcidr`, `xrpidr`.
- Pemahaman dasar bahwa bot ini mengeksekusi order sungguhan ke akun Anda.

## Menyiapkan project di Google Apps Script

1. Buka [Google Apps Script](https://script.google.com/).
2. Buat project baru.
3. Salin file `.gs` dari repositori ini ke project GAS: `Bot.gs`, `Config.gs`, `Helper.gs`, `Market.gs`, `TradeState.gs`, `Trigger.gs`, dan `Utils.gs`.
4. Simpan project.
5. Isi `Script Properties` sesuai panduan di bawah.
6. Jalankan `debugConfig()` untuk memeriksa konfigurasi.
7. Jalankan `runAutoSafeCalibration()` untuk menghitung trigger otomatis atau atur trigger secara manual.
8. Setelah konfigurasi dan nominal benar, jalankan `createBotTriggers()` atau `createBotTrigger15Minutes()` / `createBotTrigger30Minutes()`.

Catatan: ekstensi `Google Apps Script` mungkin meminta izin saat fungsi pertama kali mengakses API atau membuat trigger.

## Mengisi Script Properties

Script Properties adalah penyimpanan konfigurasi untuk project GAS. Untuk menambahkannya:

1. Buka project GAS.
2. Klik `Project Settings`.
3. Pilih `Script properties`.
4. Tambahkan key-value sesuai tabel di bawah.
5. Simpan hasilnya.

### Properti utama

| Property | Contoh nilai | Keterangan |
| --- | --- | --- |
| `INDO_API_KEY` | `API_KEY_INDOMU` | API key Indodax. Simpan sebagai Script Property, jangan ditulis di file kode. |
| `INDO_SECRET_KEY` | `SECRET_KEY_INDOMU` | Secret key Indodax. Perlakukan sebagai rahasia. |

### Properti konfigurasi bot

| Property | Default kode | Keterangan |
| --- | --- | --- |
| `BOT_PAIR` | `ethidr` | Pair market Indodax. Gunakan huruf kecil untuk konsistensi. |
| `BOT_BUY_TRIGGER` | `40923000` | Harga beli: sinyal aktif ketika harga sama dengan atau lebih rendah dari nilai ini. |
| `BOT_SELL_TRIGGER` | `42150690` | Harga jual: sinyal aktif ketika harga sama dengan atau lebih tinggi dari nilai ini dan status bot `PEGANG`. |
| `BOT_MODAL_PER_TRADE` | `15000` | Nominal IDR yang dipakai untuk menghitung kuantitas aset per trade. |
| `BOT_MIN_QTY` | `0.0001` | Kuantitas minimum aset per order sesuai aturan pair Indodax. |
| `BOT_COOLDOWN_MS` | `1800000` | Cooldown dalam milidetik. `1800000` = 30 menit. |
| `BOT_MAX_DAILY_TRADES` | `6` | Batas jumlah trade harian. |
| `BOT_STATUS` | `KOSONG` | Status awal bot. Nilai yang umum digunakan: `KOSONG` dan `PEGANG`. |

Properti runtime seperti `BOT_TRADE_STATE`, `BOT_TRADE_LOG`, dan `BOT_LAST_ERROR` dibuat/diupdate oleh kode secara otomatis.

## Kalibrasi otomatis dan konfigurasi manual

Fungsi `runAutoSafeCalibration()` mengambil harga ticker saat ini dan menghitung trigger beli/jual berdasarkan kondisi pasar. Pada kode saat ini, pendekatan umum adalah:

- trigger beli menggunakan penurunan sekitar 2,5%
- trigger jual menggunakan kenaikan sekitar 3%

Setelah kalibrasi, selalu cek log dan pastikan nilai yang tersimpan masuk akal sebelum mengaktifkan trigger.

Untuk mengatur manual, Anda bisa:

- edit Script Properties secara langsung
- atau memanggil helper seperti `setBotConfigManual({...})` dari project GAS
- lalu set status awal lewat `setBotStatus('KOSONG')`

## Perintah penting

- `debugConfig()` — menampilkan konfigurasi aktif di log.
- `debugBalances()` — menampilkan saldo akun dari Indodax.
- `debugBotState()` — menampilkan state cooldown dan hitungan trade.
- `jalankanBotUtama()` — mengeksekusi satu siklus bot secara manual.
- `createBotTriggers()` — membuat trigger otomatis setiap 30 menit.
- `createBotTrigger15Minutes()` — membuat trigger setiap 15 menit.
- `createBotTrigger30Minutes()` — membuat trigger setiap 30 menit.
- `deleteBotTriggers()` — menghapus trigger otomatis.
- `resetStatusBot()` — menghapus status, state trade, log, dan error yang tersimpan.

## Catatan keamanan

- Jangan pernah membagikan `INDO_SECRET_KEY`.
- Gunakan API key dengan izin yang dibutuhkan saja.
- Hindari menjalankan bot pada nominal besar sebelum melakukan uji coba kecil.
- Pastikan konfigurasi `BOT_PAIR`, `BOT_BUY_TRIGGER`, dan `BOT_SELL_TRIGGER` sudah benar sebelum aktifkan trigger.

## Dukungan

Jika ingin mendukung pengembangan project ini, silakan melalui:

- Saweria: <https://saweria.co/AKaAturDompet>

---

Repository ini dibuat untuk kebutuhan otomatisasi trading di Indodax dengan pendekatan sederhana, aman, dan mudah ditelusuri di Google Apps Script.
