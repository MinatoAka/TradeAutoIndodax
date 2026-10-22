# TradeAutoIndodax

[![GitHub repo stars](https://img.shields.io/github/stars/MinatoAka/TradeAutoIndodax?style=social)](https://github.com/MinatoAka/TradeAutoIndodax/stargazers)
[![Issues](https://img.shields.io/github/issues/MinatoAka/TradeAutoIndodax)](https://github.com/MinatoAka/TradeAutoIndodax/issues)
[![License](https://img.shields.io/github/license/MinatoAka/TradeAutoIndodax)](LICENSE)
[![JavaScript](https://img.shields.io/badge/Language-JavaScript-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Saweria](https://img.shields.io/badge/Support%20Me-Saweria-FF5C8A?logo=buy-me-a-coffee&logoColor=white)](https://saweria.co/AKaAturDompet)

Bot trading otomatis untuk market Indodax yang dijalankan melalui Google Apps Script.

> Disclaimer penting:
> Panduan ini dibuat untuk keperluan edukasi dan konfigurasi bot di Google Apps Script. Repo ini bukan saran investasi atau jaminan profit. API key dan secret key adalah kredensial sensitif; jangan dibagikan ke repository publik, forum, atau chat. Gunakan akun yang Anda pahami risikonya dan lakukan testing dengan nominal kecil terlebih dahulu.

Project ini dirancang untuk mode yang lebih aman dan konservatif: satu posisi saja, cooldown 30 menit, maksimal 1 trade per hari, dan trigger yang dihitung otomatis berdasarkan harga pasar saat ini.

## Panduan lengkap setup API key Indodax

### 1. Pahami cara repo ini membaca API key
Repo ini tidak memakai file `.env` atau file konfigurasi publik. Kredensial disimpan di Google Apps Script `Script Properties` dengan nama:

- `INDO_API_KEY`
- `INDO_SECRET_KEY`

Ini sesuai dengan fungsi yang ada di `Utils.gs`:

```javascript
function requireApiCredentials() {
  var props = PropertiesService.getScriptProperties();
  var apiKey = props.getProperty('INDO_API_KEY');
  var secretKey = props.getProperty('INDO_SECRET_KEY');

  if (!apiKey || !secretKey) {
    throw new Error('INDO_API_KEY atau INDO_SECRET_KEY belum di-set.');
  }

  return {
    apiKey: apiKey,
    secretKey: secretKey
  };
}
```

### 2. Buka project Google Apps Script

1. Buka https://script.google.com/
2. Klik `New project`
3. Beri nama misalnya `TradeAutoIndodax`
4. Salin semua file dari repo ini ke project tersebut, mulai dari:
   - `Bot.gs`
   - `Config.gs`
   - `Helper.gs`
   - `Market.gs`
   - `TradeState.gs`
   - `Trigger.gs`
   - `Utils.gs`

### 3. Ambil API key dan secret key dari Indodax

Langkah umum:

1. Login ke akun Indodax Anda
2. Masuk ke menu akun / API / Key Management / Manage API (nama menunya bisa sedikit berbeda)
3. Klik tombol `Create`, `Generate`, atau `New API`
4. Aktifkan izin yang diperlukan untuk trading otomatis
5. Copy nilai:
   - `API Key`
   - `Secret Key`

Catatan penting:

- Secret key bersifat sensitif dan tidak boleh dibagikan ke repo publik atau teman
- Gunakan akun yang Anda kuasai dan siap Anda tanggung risikonya
- Sebaiknya gunakan volume kecil saat testing terlebih dahulu

### 4. Simpan key di Script Properties Apps Script

Cara paling praktis adalah dengan kode berikut:

```javascript
function setIndodaxCredentials() {
  var props = PropertiesService.getScriptProperties();

  props.setProperty('INDO_API_KEY', 'PASTE_API_KEY_DISINI');
  props.setProperty('INDO_SECRET_KEY', 'PASTE_SECRET_KEY_DISINI');
}
```

Setelah itu:

1. Pilih fungsi `setIndodaxCredentials`
2. Klik tombol `Run`
3. Izinkan permission yang diminta oleh Google Apps Script

Alternatif lain: gunakan menu Script Properties di Apps Script dan tambahkan property secara manual:

- key: `INDO_API_KEY`
- value: API key Anda
- key: `INDO_SECRET_KEY`
- value: secret key Anda

### 5. Validasi apakah credential sudah masuk
Jalankan fungsi berikut untuk mengecek apakah key sudah di-set:

```javascript
function checkApiCredentials() {
  try {
    var credentials = requireApiCredentials();
    Logger.log('API key terdeteksi: ' + credentials.apiKey.substring(0, 8) + '...');
    Logger.log('Secret key terdeteksi: ' + !!credentials.secretKey);
  } catch (e) {
    Logger.log('ERROR: ' + e.message);
  }
}
```

Jika muncul error:

```text
INDO_API_KEY atau INDO_SECRET_KEY belum di-set.
```

maka key belum disimpan dengan benar.

### 6. Cek saldo akun untuk memastikan koneksi API aktif
Repo ini memiliki fungsi `getBalanceMap()` yang memanggil API Indodax untuk mengambil saldo akun. Anda bisa test seperti berikut:

```javascript
function testGetBalance() {
  try {
    var balances = getBalanceMap();
    Logger.log(JSON.stringify(balances, null, 2));
  } catch (e) {
    Logger.log('Gagal ambil saldo: ' + e.message);
  }
}
```

Jika fungsi ini berhasil, berarti koneksi API sudah aktif.

### 7. Atur konfigurasi bot
Repo ini juga membaca konfigurasi seperti:

- `BOT_PAIR`
- `BOT_BUY_TRIGGER`
- `BOT_SELL_TRIGGER`
- `BOT_MODAL_PER_TRADE`
- `BOT_MIN_QTY`
- `BOT_COOLDOWN_MS`
- `BOT_MAX_DAILY_TRADES`

Contoh setup cepat:

```javascript
function setConfigAwal() {
  var props = PropertiesService.getScriptProperties();
  props.setProperty('BOT_PAIR', 'ethidr');
  props.setProperty('BOT_BUY_TRIGGER', '42500000');
  props.setProperty('BOT_SELL_TRIGGER', '44500000');
  props.setProperty('BOT_MODAL_PER_TRADE', '15000');
  props.setProperty('BOT_MIN_QTY', '0.000001');
  props.setProperty('BOT_COOLDOWN_MS', '1800000');
  props.setProperty('BOT_MAX_DAILY_TRADES', '1');
}
```

### 8. Jalankan auto calibration
README repo menyarankan menjalankan:

```javascript
runAutoSafeCalibration();
```

Fungsi ini menghitung trigger buy dan sell berdasarkan harga pasar saat ini dan menyimpannya ke Script Properties.

### 9. Buat trigger otomatis
Untuk aktifkan scheduler otomatis, jalankan salah satu fungsi berikut:

```javascript
createBotTrigger30Minutes();
```

atau

```javascript
createBotTrigger15Minutes();
```

Untuk menghapus trigger yang sudah dibuat:

```javascript
deleteBotTriggers();
```

### 10. Ringkasan setup paling umum
Kode setup cepat yang sering dipakai:

```javascript
function setupBot() {
  var props = PropertiesService.getScriptProperties();

  props.setProperty('INDO_API_KEY', 'API_KEY_ANDA');
  props.setProperty('INDO_SECRET_KEY', 'SECRET_KEY_ANDA');

  props.setProperty('BOT_PAIR', 'ethidr');
  props.setProperty('BOT_BUY_TRIGGER', '42500000');
  props.setProperty('BOT_SELL_TRIGGER', '44500000');
  props.setProperty('BOT_MODAL_PER_TRADE', '15000');
  props.setProperty('BOT_MIN_QTY', '0.000001');
  props.setProperty('BOT_COOLDOWN_MS', '1800000');
  props.setProperty('BOT_MAX_DAILY_TRADES', '1');
}
```

Lalu jalankan:

```javascript
runAutoSafeCalibration();
createBotTrigger30Minutes();
```

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

## Dukungan & Donasi

Jika Anda ingin mendukung pengembangan project ini, silakan dukung melalui Saweria:

[![Saweria](https://img.shields.io/badge/Donate%20via-Saweria-FF5C8A?logo=coffee&logoColor=white)](https://saweria.co/AKaAturDompet)

https://saweria.co/AKaAturDompet

## Peringatan penting

- Repo ini bukan saran investasi atau sinyal finansial
- Trading crypto memiliki risiko tinggi
- Gunakan akun yang Anda pahami risikonya
- Sebaiknya lakukan testing di akun demo / volume kecil terlebih dahulu
- Pastikan Anda memahami logika status, cooldown, serta limit harian sebelum memakai live trading

## Catatan teknis

Project ini menggunakan Google Apps Script dan memanfaatkan Script Properties untuk menyimpan state lokal bot. Karena trigger Apps Script tidak tersimpan di GitHub repo itu sendiri, trigger harus dibuat ulang di Apps Script setiap kali project di-load ulang atau ketika bucket trigger diputus.

## Quick start

```javascript
runAutoSafeCalibration();
createBotTrigger30Minutes();
```

Setelah itu, bot akan memakai trigger yang dihitung otomatis dan berjalan setiap 30 menit.

## Lisensi

Lihat file `LICENSE` untuk informasi lisensi.
