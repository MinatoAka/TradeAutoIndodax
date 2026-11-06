# TradeAutoIndodax

[![GitHub Stars](https://img.shields.io/github/stars/MinatoAka/TradeAutoIndodax?style=for-the-badge&logo=github&logoColor=white)](https://github.com/MinatoAka/TradeAutoIndodax/stargazers)
[![GitHub Issues](https://img.shields.io/github/issues/MinatoAka/TradeAutoIndodax?style=for-the-badge&logo=github&logoColor=white)](https://github.com/MinatoAka/TradeAutoIndodax/issues)
[![License](https://img.shields.io/github/license/MinatoAka/TradeAutoIndodax?style=for-the-badge)](LICENSE)
[![JavaScript](https://img.shields.io/badge/JavaScript-Google%20Apps%20Script-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developers.google.com/apps-script)
[![Dukung via Saweria](https://img.shields.io/badge/Saweria-Dukung%20Project-FF5E5B?style=for-the-badge)](https://saweria.co/AKaAturDompet)

Bot trading otomatis untuk market Indodax yang dijalankan melalui Google Apps Script (GAS). Bot memantau harga ticker, mengecek status posisi, dan mengeksekusi order type `MARKET` bukan `LIMIT` saat sinyal `BUY` atau `SELL` terpenuhi.

> **Peringatan:** Dokumentasi ini untuk edukasi dan eksplorasi teknis, bukan saran investasi atau jaminan keuntungan. Trading aset kripto berisiko. Uji dengan nominal kecil dan pahami kode sebelum menggunakannya. Bot dapat mengeksekusi order sungguhan pada akun Indodax Anda.

## ✨ Fitur utama

- Eksekusi order `MARKET` untuk beli/jual.
- `LockService` untuk mencegah trigger berjalan ganda di saat yang sama.
- `Single-position guard` agar bot hanya membuka satu posisi dalam satu periode tertentu.
- `Cooldown` dan `maxDailyTrades` untuk membatasi frekuensi trading.
- `Circuit breaker` ketika saldo tidak cukup atau status bot tidak konsisten.
- Kalibrasi otomatis berdasarkan harga dan batas minimum pair yang diambil dari Indodax.
- Konfigurasi berbasis `Script Properties` agar pengaturan mudah diubah tanpa mengedit kode.

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
- Pair Indodax yang valid, misalnya `ethidr`, `btcidr`, atau `xrpidr`.
- Pemahaman bahwa bot ini dapat mengeksekusi order sungguhan ke akun Anda.

## Menyiapkan project di Google Apps Script

1. Buka [Google Apps Script](https://script.google.com/).
2. Buat project baru.
3. Salin file `.gs` dari repositori ini ke project GAS: `Bot.gs`, `Config.gs`, `Helper.gs`, `Market.gs`, `TradeState.gs`, `Trigger.gs`, dan `Utils.gs`.
4. Simpan project.
5. Isi `Script Properties` sesuai panduan di bawah.
6. Jalankan `debugConfig()` untuk memeriksa konfigurasi.
7. Jalankan `runAutoSafeCalibration()` untuk menghitung trigger otomatis, atau atur trigger secara manual.
8. Setelah memeriksa konfigurasi dan nominal trade, pilih dan jalankan **satu** fungsi trigger: `createBotTrigger15Minutes()`, `createBotTrigger30Minutes()`, `createBotTrigger1Hour()`, `createBotTrigger2Hours()`, atau `createBotTrigger4Hours()`.

> Fungsi trigger akan menghapus trigger `jalankanBotUtama` yang sudah ada sebelum membuat yang baru. Jangan jalankan beberapa fungsi trigger berturut-turut kecuali memang ingin mengganti interval.
>
> Google Apps Script mungkin meminta izin saat fungsi pertama kali mengakses API atau membuat trigger.

## Mengisi Script Properties

Script Properties adalah penyimpanan konfigurasi untuk project GAS. Untuk menambahkannya:

1. Buka project GAS.
2. Klik **Project Settings**.
3. Pilih **Script properties**.
4. Tambahkan key-value sesuai tabel di bawah.
5. Simpan hasilnya.

### Properti utama

| Property | Contoh nilai | Keterangan |
| --- | --- | --- |
| `INDO_API_KEY` | `API_KEY_INDOMU` | API key Indodax. Simpan sebagai Script Property, jangan ditulis di file kode. |
| `INDO_SECRET_KEY` | `SECRET_KEY_INDOMU` | Secret key Indodax. Perlakukan sebagai rahasia. |

### Properti konfigurasi bot

| Property | Contoh nilai | Keterangan |
| --- | --- | --- |
| `BOT_PAIR` | `ethidr` | Pair market Indodax. Gunakan huruf kecil untuk konsistensi. Wajib diisi. |
| `BOT_BUY_TRIGGER` | `40923000` | Harga beli: sinyal aktif ketika harga sama dengan atau lebih rendah dari nilai ini. Wajib diisi. |
| `BOT_SELL_TRIGGER` | `42150690` | Harga jual: sinyal aktif ketika harga sama dengan atau lebih tinggi dari nilai ini dan status bot `PEGANG`. Wajib diisi. |
| `BOT_MODAL_PER_TRADE` | `15000` | Nominal IDR yang dipakai untuk menghitung kuantitas aset per trade. |
| `BOT_MIN_QTY` | `0.0001` | Kuantitas minimum aset per order sesuai aturan pair Indodax. |
| `BOT_COOLDOWN_MS` | `1800000` | Cooldown dalam milidetik. `1800000` = 30 menit. |
| `BOT_MAX_DAILY_TRADES` | `6` | Batas jumlah trade harian. |
| `BOT_STATUS` | `KOSONG` | Status awal bot. Nilai yang digunakan: `KOSONG` atau `PEGANG`. |

Properti runtime seperti `BOT_TRADE_STATE`, `BOT_TRADE_LOG`, dan `BOT_LAST_ERROR` dibuat atau diperbarui oleh kode secara otomatis.

## Kalibrasi otomatis dan konfigurasi manual

Fungsi `runAutoSafeCalibration()` mengambil harga ticker saat ini dan menghitung trigger beli/jual. Kode saat ini menggunakan penurunan beli sekitar **2,5%** dari harga saat ini dan kenaikan jual **3%** dari trigger beli. Fungsi ini juga mengambil batas pair dari API Indodax untuk menentukan modal dan kuantitas minimum. Kalibrasi dibatalkan jika status bot `PEGANG`.

Setelah kalibrasi, cek log dan pastikan nilai yang tersimpan masuk akal sebelum mengaktifkan trigger.

Untuk mengatur manual, Anda bisa:

- edit Script Properties secara langsung;
- memanggil helper seperti `setBotConfigManual({...})` dari project GAS;
- mengatur status awal dengan `setBotStatus('KOSONG')`.

## Perintah penting

Jalankan fungsi berikut dari editor Google Apps Script sesuai kebutuhan:

### Pemeriksaan dan kalibrasi

- `debugConfig()` — memeriksa dan menampilkan konfigurasi aktif di log.
- `debugBalances()` — mengambil dan menampilkan saldo akun Indodax.
- `debugBotState()` — menampilkan state cooldown dan hitungan trade.
- `runAutoSafeCalibration()` — menghitung dan menyimpan konfigurasi trigger otomatis. Tidak berjalan jika status bot `PEGANG`.

### Menjalankan bot dan mengatur jadwal

- `jalankanBotUtama()` — menjalankan satu siklus bot secara manual.
- Pilih **satu** fungsi untuk membuat trigger otomatis:
  * `createBotTrigger15Minutes()` bot dijalankan setiap 15 menit,
  * `createBotTrigger30Minutes()` bot dijalankan setiap 30 menit,
  * `createBotTrigger1Hour()` bot dijalankan setiap 1 jam,
  * `createBotTrigger2Hours()` bot dijalankan setiap 2 jam,
  * `createBotTrigger4Hours()` bot dijalankan setiap 4 jam.

### Pengaturan dan reset

- `setSinglePositionMode()` — menerapkan cooldown 30 menit dan batas maksimal 2 trade per hari.
- `resetStatusBot()` — menghapus status, state trade, log, dan error tersimpan. Setelah reset, status default menjadi `KOSONG`.

## Catatan keamanan

- Jangan pernah membagikan `INDO_SECRET_KEY`.
- Gunakan API key dengan izin yang dibutuhkan saja.
- Hindari menjalankan bot pada nominal besar sebelum melakukan uji coba kecil.
- Pastikan konfigurasi `BOT_PAIR`, `BOT_BUY_TRIGGER`, dan `BOT_SELL_TRIGGER` sudah benar sebelum mengaktifkan trigger.
- Order `MARKET` dapat segera menggunakan saldo sungguhan. Pahami risikonya sebelum menjalankan bot.

## Dukungan

Jika ingin mendukung pengembangan project ini, silakan melalui [Saweria](https://saweria.co/AKaAturDompet).

---

Repository ini dibuat untuk kebutuhan otomatisasi trading di Indodax dengan pendekatan sederhana dan mudah ditelusuri di Google Apps Script.
