# TradeAutoIndodax

Bot trading otomatis untuk market Indodax yang dijalankan melalui Google Apps Script.

> Disclaimer penting:
> Panduan ini hanya untuk keperluan edukasi dan pengaturan bot di Google Apps Script. Repo ini bukan saran investasi atau jaminan profit. API key dan secret key adalah kredensial sensitif; jangan dibagikan ke repository publik, forum, atau chat. Gunakan akun yang Anda pahami risikonya dan lakukan testing dengan nominal kecil terlebih dahulu.

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

## Jalankan bot
```javascript
runAutoSafeCalibration();
createBotTrigger30Minutes();
```

## Peringatan
- Repo ini bukan saran investasi
- Trading crypto berisiko tinggi
- Gunakan akun yang Anda pahami risikonya
- Lakukan testing dengan nominal kecil terlebih dahulu

## Lisensi
Lihat file `LICENSE` untuk informasi lisensi.
