# TradeAutoIndodax

[![GitHub repo stars](https://img.shields.io/github/stars/MinatoAka/TradeAutoIndodax?style=social)](https://github.com/MinatoAka/TradeAutoIndodax/stargazers)
[![Issues](https://img.shields.io/github/issues/MinatoAka/TradeAutoIndodax)](https://github.com/MinatoAka/TradeAutoIndodax/issues)
[![License](https://img.shields.io/github/license/MinatoAka/TradeAutoIndodax)](LICENSE)
[![JavaScript](https://img.shields.io/badge/Language-JavaScript-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)

Bot trading otomatis untuk market Indodax yang berjalan di Google Apps Script (GAS). Bot membaca harga ticker, memeriksa saldo saat ada sinyal, lalu mengirim order **LIMIT** sesuai konfigurasi.

> **Peringatan:** Dokumentasi ini untuk edukasi dan eksplorasi teknis, bukan saran investasi atau jaminan keuntungan. Trading aset kripto berisiko. Uji dengan nominal kecil dan pahami kode sebelum mengaktifkannya. Jaga API key dan secret key; jangan pernah membagikannya atau menyimpannya di repositori.

## ✨ Fitur

- **Market Order Execution:** Mengeksekusi order dengan tipe `MARKET` agar pasti langsung terbeli/terjual tanpa menggantung.
- **Anti-Bentrok (LockService):** Mencegah bot mengeksekusi order ganda saat trigger berjalan bersamaan.
- **Circuit Breaker:** Otomatis mematikan bot jika saldo tidak cukup atau terjadi ketidaksesuaian status (desync).
- **Dynamic Limits:** Menarik batas minimum pembelian (`minQty`) langsung dari API Indodax.
- **Anti Rate-Limit:** Dilengkapi *retry* otomatis dengan jeda acak jika terkena limit (HTTP 429).
- **Single-Position:** Hanya membuka satu posisi per waktu untuk mencegah *overtrading*.

## ⚙️ Cara Kerja

1. Bot mengecek harga secara berkala (menggunakan cache untuk menghemat request).
2. Jika harga menyentuh `BUY_TRIGGER` dan status `KOSONG`, bot akan mengecek saldo lalu mengirim `MARKET BUY`.
3. Status berubah menjadi `PEGANG`.
4. Jika harga menyentuh `SELL_TRIGGER` dan status `PEGANG`, bot akan mengirim `MARKET SELL`.
5. Status kembali menjadi `KOSONG`.

## Persyaratan

- Akun Google dan akses ke Google Apps Script.
- Akun Indodax dan API key/secret key dengan izin yang diperlukan untuk membaca saldo dan melakukan trading. **Jangan aktifkan izin penarikan dana** untuk API key bot.
- Pair Indodax yang valid.

## Memasang kode ke Google Apps Script

1. Buat project di [Google Apps Script](https://script.google.com/).
2. Salin isi file `.gs` dari repositori ke file-file di project GAS: `Bot.gs`, `Config.gs`, `Helper.gs`, `Market.gs`, `TradeState.gs`, `Trigger.gs`, dan `Utils.gs`. Nama file boleh disesuaikan; fungsi-fungsi dalam satu project dapat saling memanggil.
3. Simpan project, lalu isi Script Properties seperti dijelaskan di bawah.
4. Jalankan `debugConfig()` untuk memeriksa konfigurasi. Saat diminta, tinjau dan berikan izin yang diperlukan kepada project.
5. Jalankan `runAutoSafeCalibration()` untuk menghitung trigger otomatis, atau atur trigger beli/jual sendiri.
6. Setelah konfigurasi dan nominal diperiksa, jalankan `createBotTriggers()` untuk memasang trigger otomatis 30 menit. Alternatif: `createBotTrigger15Minutes()` atau `createBotTrigger30Minutes()`.

Pemanggilan pertama fungsi yang mengakses API atau membuat trigger dapat meminta otorisasi Google. Periksa log eksekusi di editor GAS untuk hasil dan pesan error.

## Mengisi Script Properties di GAS

Script Properties adalah penyimpanan konfigurasi untuk seluruh project Apps Script. Cara paling mudah:

1. Buka project GAS.
2. Klik **Project Settings** (ikon roda gigi) di panel kiri.
3. Cari bagian **Script properties**, lalu klik **Add script property**.
4. Isi **Property** sebagai nama key dan **Value** sebagai nilainya. Tambahkan baris sesuai tabel di bawah, lalu simpan.
5. Untuk memperbarui nilai, edit property yang bersangkutan. Nilai angka disimpan sebagai teks oleh GAS dan dibaca sebagai angka oleh kode.

### Properties yang perlu diisi

| Property | Contoh nilai | Keterangan |
| --- | --- | --- |
| `INDO_API_KEY` | `API_KEY_INDOMU` | API key Indodax. Simpan sebagai Script Property, jangan ditulis di file kode. |
| `INDO_SECRET_KEY` | `SECRET_KEY_INDOMU` | Secret key Indodax. Perlakukan sebagai rahasia. |

### Properties konfigurasi bot

Ini adalah nilai awal yang digunakan kode saat property belum diisi. Atur nilainya sesuai pair dan strategi Anda sebelum menjalankan bot.

| Property | Default kode | Keterangan |
| --- | --- | --- |
| `BOT_PAIR` | `ethidr` | Pair dalam format yang digunakan Indodax, huruf kecil disarankan. |
| `BOT_BUY_TRIGGER` | `40923000` | Harga beli: sinyal muncul ketika harga sama dengan atau lebih rendah. |
| `BOT_SELL_TRIGGER` | `42150690` | Harga jual: sinyal muncul ketika harga sama dengan atau lebih tinggi dan status `PEGANG`. |
| `BOT_MODAL_PER_TRADE` | `15000` | Nominal IDR yang digunakan untuk menghitung jumlah aset per trade. |
| `BOT_MIN_QTY` | `0.0001` | Kuantitas aset minimum; perhatikan minimum order pair di Indodax. |
| `BOT_COOLDOWN_MS` | `1800000` | Cooldown dalam milidetik; `1800000` = 30 menit. |
| `BOT_MAX_DAILY_TRADES` | `6` | Batas trade harian. Satu order beli atau jual yang berhasil dihitung sebagai satu trade. |
| `BOT_STATUS` | `KOSONG` | Mulai dengan `KOSONG`; status lain yang digunakan adalah `PEGANG`. Status diperbarui setelah order berhasil. |

Contoh isi: masukkan `BOT_PAIR` di kolom **Property** dan `ethidr` di kolom **Value**. Jangan menyalin tanda kutip pada contoh nilai. Jangan masukkan pemisah ribuan pada angka, misalnya gunakan `40923000`, bukan `40.923.000`.

`BOT_TRADE_STATE`, `BOT_TRADE_LOG`, dan `BOT_LAST_ERROR` adalah property runtime yang dibuat/diperbarui oleh kode; biasanya tidak perlu diisi manual.

## Kalibrasi otomatis dan konfigurasi manual

`runAutoSafeCalibration()` mengambil harga ticker saat ini dan menghitung trigger berdasarkan harga tersebut. Kode saat ini menggunakan penurunan 2,5% untuk trigger beli dan kenaikan 3% dari trigger beli untuk trigger jual. Fungsi ini juga menetapkan modal trade `15000`, minimum kuantitas `0.00001`, cooldown 30 menit, dan batas 6 trade per hari. Kalibrasi dibatalkan bila status bot `PEGANG`; status pair tidak diganti.

Untuk kalibrasi, jalankan `runAutoSafeCalibration()` dari editor GAS. Periksa hasil di log eksekusi, lalu tinjau kembali nilai yang tersimpan sebelum mengaktifkan trigger. Kalibrasi otomatis **mengganti** konfigurasi trigger dan beberapa pengaturan trade yang disebutkan di atas.

Untuk mengubah konfigurasi secara manual, edit Script Properties. Alternatifnya, helper `setBotConfigManual({...})` dapat menyimpan konfigurasi dari fungsi di project; `setBotStatus('KOSONG')` atau `setBotStatus('PEGANG')` mengatur status yang valid.

## Menjalankan, memeriksa, dan menghentikan bot

- `debugConfig()` — menampilkan konfigurasi yang sedang dibaca bot di log.
- `debugBalances()` — mengambil dan menampilkan saldo akun; gunakan dengan hati-hati.
- `debugBotState()` — menampilkan state cooldown dan penghitung trade.
- `jalankanBotUtama()` — menjalankan satu siklus bot secara manual.
- `createBotTriggers()` — membuat trigger otomatis setiap 30 menit.
- `createBotTrigger15Minutes()` / `createBotTrigger30Minutes()` — memilih interval yang tersedia. Fungsi ini menghapus trigger `jalankanBotUtama` sebelumnya sebelum membuat yang baru.
- `deleteBotTriggers()` — menghapus trigger otomatis bot.
- `resetStatusBot()` — menghapus status, state trade, log, dan error tersimpan sehingga bot kembali ke status default `KOSONG`. Gunakan hanya jika Anda memahami dampaknya dan status akun sesuai.

Sebelum mengaktifkan trigger, pastikan API key, pair, trigger harga, nominal, kuantitas minimum, dan status sudah benar. Kode ini mengirim order sungguhan ke akun Indodax ketika kondisi sinyal dan pengaman terpenuhi.

## Dukungan

Jika ingin mendukung pengembangan project ini, silakan melalui Saweria: <https://saweria.co/AKaAturDompet>
