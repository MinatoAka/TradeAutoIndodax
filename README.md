# TradeAutoIndodax

[![GitHub repo stars](https://img.shields.io/github/stars/MinatoAka/TradeAutoIndodax?style=social)](https://github.com/MinatoAka/TradeAutoIndodax/stargazers)
[![Issues](https://img.shields.io/github/issues/MinatoAka/TradeAutoIndodax)](https://github.com/MinatoAka/TradeAutoIndodax/issues)
[![License](https://img.shields.io/github/license/MinatoAka/TradeAutoIndodax)](LICENSE)
[![JavaScript](https://img.shields.io/badge/Language-JavaScript-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)

Bot trading otomatis untuk market Indodax yang berjalan di Google Apps Script.

Repositori ini dirancang untuk membantu Anda menjalankan strategi trading sederhana dengan trigger otomatis berdasarkan harga pasar, status bot, cooldown, dan batas transaksi harian.

> Disclaimer:<br />
> Dokumentasi ini hanya untuk keperluan edukasi dan eksplorasi teknis. Repo ini bukan saran investasi dan bukan jaminan profit. API key dan secret key adalah kredensial sensitif; jangan dibagikan ke siapapun.

## Fitur utama

- Trading otomatis pada pair ETH/IDR atau pair lain yang Anda tentukan
- Mode single-position
- Cooldown 30 menit antar trade
- Maksimal 1 trade per hari
- Trigger beli/jual otomatis berdasarkan harga pasar
- Penyimpanan status dan log di Script Properties
- Konfigurasi manual maupun otomatis dengan helper function

## Cara kerja

1. Harga pasar diambil dari ticker Indodax
2. `runAutoSafeCalibration()` menghitung trigger aman
3. Trigger disimpan ke Script Properties
4. Bot mengecek kondisi:
   - beli saat status `KOSONG` dan harga <= `buyTrigger`
   - jual saat status `PEGANG` dan harga >= `sellTrigger`
5. Cooldown dan batas harian mencegah overtrading

## Persyaratan

- Akun Google dengan akses ke Google Apps Script
- API Key dan Secret Key Indodax
- Pair market yang ingin Anda tradingkan

## Setup API Key Indodax

Simpan credential di Script Properties:

```javascript
function setIndodaxCredentials() {
  var props = PropertiesService.getScriptProperties();

  props.setProperty('INDO_API_KEY', 'PASTE_API_KEY_DISINI');
  props.setProperty('INDO_SECRET_KEY', 'PASTE_SECRET_KEY_DISINI');
}
```

Jalankan `setIndodaxCredentials()` sekali untuk menyimpan credential.

Cek apakah credential berhasil dibaca:

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

## Konfigurasi bot

Contoh konfigurasi default yang digunakan oleh sistem:

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

## Konfigurasi manual

Beberapa parameter dapat diatur secara manual sesuai kebutuhan strategi Anda:

```javascript
function setBotSettingsManual() {
  var props = PropertiesService.getScriptProperties();

  props.setProperty('BOT_PAIR', 'ethidr');
  props.setProperty('BOT_BUY_TRIGGER', '42000000');
  props.setProperty('BOT_SELL_TRIGGER', '45000000');
  props.setProperty('BOT_MODAL_PER_TRADE', '15000');
  props.setProperty('BOT_MIN_QTY', '0.000001');
  props.setProperty('BOT_COOLDOWN_MS', '1800000');
  props.setProperty('BOT_MAX_DAILY_TRADES', '1');
  props.setProperty('STATUS_BOT_ETH', 'KOSONG');
}
```

Atau gunakan helper yang tersedia di repo:

```javascript
function setConfigManualDenganHelper() {
  setBotConfigManual({
    pair: 'ethidr',
    buyTrigger: 42000000,
    sellTrigger: 45000000,
    modalPerTrade: 15000,
    minQty: 0.000001,
    cooldownMs: 1800000,
    maxDailyTrades: 1
  });

  setBotStatus('KOSONG');
}
```

## Debug dan pengecekan konfigurasi

Untuk melihat status konfigurasi aktif, gunakan fungsi berikut:

```javascript
function debugConfig() {
  getBotConfig();
}
```

Fungsi `getBotConfig()` akan menampilkan log konfigurasi dalam format yang lebih rapi di Apps Script Logger.

## Auto calibration

`runAutoSafeCalibration()` akan menghitung trigger beli dan jual secara otomatis berdasarkan harga pasar saat ini. Fungsi ini aman dipakai ketika bot masih dalam status `KOSONG`.

Jika bot sedang `PEGANG`, fungsi ini akan dibatalkan agar tidak merubah target saat posisi masih aktif.

```javascript
function runAutoSafeCalibration() {
  // dipanggil dari Apps Script
}
```

## Jalankan bot

```javascript
runAutoSafeCalibration();
createBotTrigger30Minutes();
```

## Catatan penting

- `runAutoSafeCalibration()` hanya aman dipakai saat status bot masih `KOSONG`
- Jika bot sedang `PEGANG`, auto calibration dibatalkan
- Gunakan nominal kecil saat melakukan testing awal
- Pastikan Anda memahami risiko trading crypto sebelum menjalankan bot secara real

## Dukungan

Jika Anda ingin mendukung pengembangan project ini, silakan dukung melalui Saweria:

https://saweria.co/AKaAturDompet

## Peringatan

- Repo ini bukan saran investasi
- Trading crypto berisiko tinggi
- Gunakan akun yang Anda pahami risikonya
- Lakukan testing dengan nominal kecil terlebih dahulu

## Lisensi

Lihat file `LICENSE` untuk informasi lisensi.
