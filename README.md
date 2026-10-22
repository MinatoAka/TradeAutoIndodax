# TradeAutoIndodax

[![GitHub repo stars](https://img.shields.io/github/stars/MinatoAka/TradeAutoIndodax?style=social)](https://github.com/MinatoAka/TradeAutoIndodax/stargazers)
[![Issues](https://img.shields.io/github/issues/MinatoAka/TradeAutoIndodax)](https://github.com/MinatoAka/TradeAutoIndodax/issues)
[![License](https://img.shields.io/github/license/MinatoAka/TradeAutoIndodax)](LICENSE)
[![JavaScript](https://img.shields.io/badge/Language-JavaScript-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Saweria](https://img.shields.io/badge/Support%20Me-Saweria-FF5C8A?logo=buy-me-a-coffee&logoColor=white)](https://saweria.co/AKaAturDompet)

Bot trading otomatis untuk market Indodax yang dijalankan melalui Google Apps Script.

> Disclaimer penting:
> Panduan ini hanya untuk keperluan edukasi dan pengaturan bot di Google Apps Script. Repo ini bukan saran investasi atau jaminan profit. API key dan secret key adalah kredensial sensitif; jangan dibagikan ke siapapun.

## Fitur utama
- Trading otomatis pada pair ETH/IDR atau pair lain yang Anda atur
- Mode single-position
- Cooldown 30 menit antar trade
- Maksimal 1 trade per hari
- Trigger buy/sell otomatis berdasarkan harga pasar
- Log state trade dan cooldown disimpan di Script Properties

## Cara kerja
1. Harga market diambil dari ticker Indodax
2. `runAutoSafeCalibration()` menghitung trigger aman
3. Trigger disimpan di Script Properties
4. Bot mengecek kondisi:
    - beli saat `KOSONG` dan harga <= buyTrigger
    - jual saat `PEGANG` dan harga >= sellTrigger
5. Cooldown dan limit harian mencegah overtrading

## Setup API Key Indodax
Repo ini memakai Script Properties di Google Apps Script:

- `INDO_API_KEY`
- `INDO_SECRET_KEY`

Contoh:

```javascript
function setIndodaxCredentials() {
  var props = PropertiesService.getScriptProperties();

  props.setProperty('INDO_API_KEY', 'PASTE_API_KEY_DISINI');
  props.setProperty('INDO_SECRET_KEY', 'PASTE_SECRET_KEY_DISINI');
}
```

Jalankan function `setIndodaxCredentials()` sekali.

Untuk validasi:

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
Default konfigurasi yang dipakai:

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

## Konfigurasi manual yang tidak di-set otomatis oleh helper
`runAutoSafeCalibration()` hanya otomatis mengisi trigger `BOT_BUY_TRIGGER` dan `BOT_SELL_TRIGGER` berdasarkan harga pasar saat ini. Helper ini tidak sekaligus mengatur setting lain yang sering diubah manual, seperti:

- `BOT_PAIR`
- `BOT_MODAL_PER_TRADE`
- `BOT_MIN_QTY`
- `BOT_COOLDOWN_MS`
- `BOT_MAX_DAILY_TRADES`
- `STATUS_BOT_ETH`

Jadi, kalau Anda ingin custom strategi yang lebih presisi, atur setting manual seperti contoh berikut:

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

Atau gunakan helper yang sudah disediakan di repo untuk konfigurasi yang lebih rapi:

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

Catatan penting:
- `runAutoSafeCalibration()` hanya aman dipakai saat status bot masih `KOSONG`.
- Jika bot sedang `PEGANG`, helper akan membatalkan auto calibration agar tidak mengubah target saat posisi aktif.
- Untuk mengecek konfigurasi yang sedang aktif, panggil `getBotConfig()` atau `debugConfig()`:

```javascript
function debugConfig() {
  getBotConfig();
}
```

`getBotConfig()` akan otomatis menampilkan log yang lebih rapi di Apps Script Logger.

## Jalankan bot
```javascript
runAutoSafeCalibration();
createBotTrigger30Minutes();
```

## Dukungan & Donasi
Jika Anda ingin mendukung pengembangan project ini, silakan dukung melalui Saweria:

[![Saweria](https://img.shields.io/badge/Donate%20via-Saweria-FF5C8A?logo=coffee&logoColor=white)](https://saweria.co/AKaAturDompet)

https://saweria.co/AKaAturDompet

## Peringatan
- Repo ini bukan saran investasi
- Trading crypto berisiko tinggi
- Gunakan akun yang Anda pahami risikonya
- Lakukan testing dengan nominal kecil terlebih dahulu

## Lisensi
Lihat file `LICENSE` untuk informasi lisensi.
