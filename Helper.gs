// ==========================================
// Helper.gs (Audited & Dynamic)
// Fungsi bantu untuk strategi aman dan pengaturan trigger otomatis
// ==========================================

function calculateSafeTriggersFromPrice(currentPrice, buyDropPercent, sellRisePercent) {
  if (!isFinite(Number(currentPrice)) || Number(currentPrice) <= 0) {
    throw new Error('Harga saat ini tidak valid: ' + currentPrice);
  }

  var price = Number(currentPrice);
  var buyPercent = Number(buyDropPercent || 2);
  var sellPercent = Number(sellRisePercent || 5);

  if (buyPercent <= 0 || sellPercent <= 0) {
    throw new Error('Persentase buy/sell harus lebih besar dari 0.');
  }

  var buyTrigger = price * (1 - (buyPercent / 100));
  var sellTrigger = price * (1 + (sellPercent / 100));

  return {
    currentPrice: price,
    buyTrigger: Math.round(buyTrigger),
    sellTrigger: Math.round(sellTrigger),
    buyDropPercent: buyPercent,
    sellRisePercent: sellPercent
  };
}

function setSafeTradingDefaults(options) {
  var opts = options || {};
  var props = PropertiesService.getScriptProperties();

  var currentConfig = getBotConfig(true);

  var buyTrigger = String(Number(opts.buyTrigger || currentConfig.buyTrigger));
  var sellTrigger = String(Number(opts.sellTrigger || currentConfig.sellTrigger));
  var cooldownMs = String(Number(opts.cooldownMs || currentConfig.cooldownMs));
  var maxDailyTrades = String(Number(opts.maxDailyTrades || currentConfig.maxDailyTrades));

  props.setProperty('BOT_BUY_TRIGGER', buyTrigger);
  props.setProperty('BOT_SELL_TRIGGER', sellTrigger);
  props.setProperty('BOT_COOLDOWN_MS', cooldownMs);
  props.setProperty('BOT_MAX_DAILY_TRADES', maxDailyTrades);

  Logger.log('✅ Default aman tersimpan: buy=' + buyTrigger + ', sell=' + sellTrigger + ', cooldown=' + cooldownMs + ', maxDailyTrades=' + maxDailyTrades);
  return true;
}

function runAutoSafeCalibration() {
  var config = getBotConfig(true);
  var currentStatus = config.status;
  var pair = config.pair;

  Logger.log('📝 Menjalankan auto calibration untuk pair [' + pair.toUpperCase() + ']. Status bot saat ini: ' + currentStatus);

  if (currentStatus === 'PEGANG') {
    Logger.log('🛡️ Bot masih dalam posisi terbuka. Auto calibration dibatalkan agar tidak mengubah target saat posisi aktif.');
    return {
      skipped: true,
      status: currentStatus,
      reason: 'Posisi PEGANG masih aktif.'
    };
  }

  // Mengambil harga pasar riil berdasarkan pair aktif
  var currentPrice = getTickerPrice(pair);
  var result = calculateSafeTriggersFromPrice(currentPrice, 2, 5);

  // Simpan konfigurasi baru via Helper Config
  setBotConfigManual({
    pair: pair,
    buyTrigger: result.buyTrigger,
    sellTrigger: result.sellTrigger,
    cooldownMs: 1800000,
    maxDailyTrades: 6
  });

  Logger.log('✅ Trigger otomatis disesuaikan berdasarkan harga market.');
  Logger.log('Pair: ' + pair + ', price: ' + result.currentPrice + ', buyTrigger: ' + result.buyTrigger + ', sellTrigger: ' + result.sellTrigger);
  Logger.log('Status bot saat ini: ' + currentStatus + ', cooldownMs: 1800000, maxDailyTrades: 2');

  return {
    pair: pair,
    currentPrice: result.currentPrice,
    buyTrigger: result.buyTrigger,
    sellTrigger: result.sellTrigger,
    buyDropPercent: result.buyDropPercent,
    sellRisePercent: result.sellRisePercent,
    cooldownMs: 1800000,
    maxDailyTrades: 6,
    status: currentStatus,
    skipped: false
  };
}
