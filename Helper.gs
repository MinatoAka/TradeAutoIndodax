// ==========================================
// Helper.gs
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

  props.setProperty('BOT_BUY_TRIGGER', String(Number(opts.buyTrigger || 42500000)));
  props.setProperty('BOT_SELL_TRIGGER', String(Number(opts.sellTrigger || 44500000)));
  props.setProperty('BOT_COOLDOWN_MS', String(Number(opts.cooldownMs || 1800000)));
  props.setProperty('BOT_MAX_DAILY_TRADES', String(Number(opts.maxDailyTrades || 1)));

  Logger.log('✅ Default aman tersimpan: buy=' + (opts.buyTrigger || 42500000) + ', sell=' + (opts.sellTrigger || 44500000) + ', cooldown=' + (opts.cooldownMs || 1800000) + ', maxDailyTrades=' + (opts.maxDailyTrades || 1));
  return true;
}

function updateSafeTriggersFromCurrentPrice(options) {
  var opts = options || {};
  var pair = String(opts.pair || 'ethidr').toLowerCase();
  var currentPrice = getTickerPrice(pair);

  var buyDrop = Number(opts.buyDropPercent || 2);
  var sellRise = Number(opts.sellRisePercent || 5);
  var cooldownMs = Number(opts.cooldownMs || 1800000);
  var maxDailyTrades = Number(opts.maxDailyTrades || 1);

  var result = calculateSafeTriggersFromPrice(currentPrice, buyDrop, sellRise);

  setBotConfigManual({
    pair: pair,
    buyTrigger: result.buyTrigger,
    sellTrigger: result.sellTrigger,
    cooldownMs: cooldownMs,
    maxDailyTrades: maxDailyTrades
  });

  var status = String(PropertiesService.getScriptProperties().getProperty('STATUS_BOT_ETH') || 'KOSONG').toUpperCase();

  Logger.log('✅ Trigger otomatis disesuaikan berdasarkan harga market.');
  Logger.log('Pair: ' + pair + ', price: ' + result.currentPrice + ', buyTrigger: ' + result.buyTrigger + ', sellTrigger: ' + result.sellTrigger);
  Logger.log('Status bot saat ini: ' + status + ', cooldownMs: ' + cooldownMs + ', maxDailyTrades: ' + maxDailyTrades);

  return {
    pair: pair,
    currentPrice: result.currentPrice,
    buyTrigger: result.buyTrigger,
    sellTrigger: result.sellTrigger,
    buyDropPercent: result.buyDropPercent,
    sellRisePercent: result.sellRisePercent,
    cooldownMs: cooldownMs,
    maxDailyTrades: maxDailyTrades,
    status: status
  };
}

function runAutoSafeCalibration() {
  var props = PropertiesService.getScriptProperties();
  var currentStatus = String(props.getProperty('STATUS_BOT_ETH') || 'KOSONG').toUpperCase();

  Logger.log('📝 Menjalankan auto calibration. Status bot saat ini: ' + currentStatus);

  if (currentStatus === 'PEGANG') {
    Logger.log('🛡️ Bot masih dalam posisi terbuka. Auto calibration dibatalkan agar tidak mengubah target saat posisi aktif.');
    return {
      skipped: true,
      status: currentStatus,
      reason: 'Posisi PEGANG masih aktif.'
    };
  }

  var result = updateSafeTriggersFromCurrentPrice({
    pair: 'ethidr',
    buyDropPercent: 2,
    sellRisePercent: 5,
    cooldownMs: 1800000,
    maxDailyTrades: 1
  });

  result.skipped = false;
  return result;
}
