# TradeAutoIndodax

Bot trading otomatis untuk market Indodax yang dijalankan melalui Google Apps Script.

Project ini dirancang untuk mode yang lebih aman dan konservatif: satu posisi saja, cooldown 30 menit, maksimal 1 trade per hari, dan trigger yang dihitung otomatis berdasarkan harga pasar saat ini.

## Fitur utama

- Trading otomatis pada pair ETH/IDR (atau pair yang Anda atur)
- Mode single-position only
- Cooldown 30 menit antar trade
- Maksimal 1 trade per hari
- Trigger buy dan sell dihitung otomatis berdasarkan harga live
- Proteksi agar tidak mengubah target saat posisi masih terbuka
- Log aktivitas dan state trade tersimpan di Script Properties
- Trigger timer 15/30 menit untuk eksekusi otomatis

## Strategi default yang aman

Strategi yang dipakai saat ini adalah:

- Buy trigger = harga pasar saat ini - 2%
- Sell trigger = harga pasar saat ini + 5%
- Cooldown = 30 menit
- Max daily trades = 1
- Status bot hanya ada dalam 2 kondisi:
  - KOSONG
  - PEGANG

Artinya:
- bot hanya bisa beli saat status KOSONG
- bot hanya bisa jual saat status PEGANG
- target akan dibatalkan jika status bot masih PEGANG

## Struktur file

- `Bot.gs` : logika utama order, validasi peluang, eksekusi buy/sell, guard status
- `Config.gs` : konfigurasi dasar bot dan properti Script Properties
- `Helper.gs` : fungsi kalkulasi trigger aman dan auto calibration
- `Trigger.gs` : pembuatan dan penghapusan trigger otomatis
- `TradeState.gs` : state trade, cooldown, log trade, reset harian

## Cara kerja bot

1. Harga market diambil dari fungsi ticker
2. `runAutoSafeCalibration()` menghitung trigger aman
3. Trigger disimpan ke properti bot
4. `jalankanBotUtama()` mengecek kondisi:
   - beli saat KOSONG dan harga <= buyTrigger
   - jual saat PEGANG dan harga >= sellTrigger
5. Setelah trade sukses, status bot diubah antara KOSONG dan PEGANG
6. Cooldown dan limit harian mencegah overtrading

## Fungsi penting

### Auto calibration

Gunakan fungsi berikut untuk menghitung trigger baru secara aman:

```javascript
runAutoSafeCalibration();
```

Fungsi ini akan:
- mengecek status bot
- jika status saat ini PEGANG, maka otomatis skip
- jika status KOSONG, hitung target baru berdasarkan harga pasar
- simpan hasil ke Script Properties

### Trigger otomatis

Untuk membuat trigger setiap 30 menit:

```javascript
createBotTrigger30Minutes();
```

Untuk 15 menit:

```javascript
createBotTrigger15Minutes();
```

Untuk menghapus semua trigger:

```javascript
deleteBotTriggers();
```

## Konfigurasi penting

Properti yang dipakai bot biasanya berada di Script Properties Apps Script:

- `BOT_PAIR`
- `BOT_BUY_TRIGGER`
- `BOT_SELL_TRIGGER`
- `BOT_MODAL_PER_TRADE`
- `BOT_MIN_QTY`
- `BOT_COOLDOWN_MS`
- `BOT_MAX_DAILY_TRADES`
- `STATUS_BOT_ETH`
- `BOT_TRADE_STATE`
- `BOT_TRADE_LOG`

Nilai default saat ini:

- pair: `ethidr`
- buyTrigger: `42500000`
- sellTrigger: `44500000`
- cooldown: `1800000` ms (30 menit)
- maxDailyTrades: `1`

## Persiapan awal

1. Salin project ini ke Google Apps Script
2. Pastikan semua fungsi pendukung tersedia di project, seperti:
   - `requireApiCredentials()`
   - `normalizeSymbol()`
   - `getTickerPrice()`
   - `getAvailableBalance()`
   - `getPairBaseAsset()`
   - `calculateBuyQty()`
   - `calculateSellQty()`
   - `getIndodaxSignatureV2()`
   - `buildQueryString()`
   - `safeParseJson()`
3. Isi API key dan secret key Indodax di fungsi `requireApiCredentials()`
4. Jalankan `runAutoSafeCalibration()` untuk mengisi trigger awal
5. Jalankan `createBotTrigger30Minutes()` untuk aktifkan scheduler

## Peringatan penting

- Repo ini bukan saran investasi atau sinyal finansial
- Trading crypto memiliki risiko tinggi
- Gunakan akun yang Anda pahami risikonya
- Sebaiknya lakukan testing di akun demo / volume kecil terlebih dahulu
- Pastikan Anda memahami logika status, cooldown, serta limit harian sebelum memakai live trading

## Catatan teknis

Project ini menggunakan Google Apps Script dan memanfaatkan Script Properties untuk menyimpan state lokal bot. Karena trigger Apps Script tidak tersimpan di GitHub repo itu sendiri, trigger harus dibuat langsung pada project Apps Script yang sedang dibuka di Google Apps Script.

## Quick start

```javascript
runAutoSafeCalibration();
createBotTrigger30Minutes();
```

Setelah itu, bot akan memakai trigger yang dihitung otomatis dan berjalan setiap 30 menit.

## Lisensi

Lihat file `LICENSE` untuk informasi lisensi.
