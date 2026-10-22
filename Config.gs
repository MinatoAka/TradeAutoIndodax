// ==========================================
// Config.gs
// Menyimpan dan membaca konfigurasi bot
// ==========================================

function getBotConfig() {
  var props = PropertiesService.getScriptProperties();
  var pair = normalizeSymbol(props.getProperty('BOT_PAIR') || 'ethidr');

  return {
    pair: pair,
    buyTrigger: Number(props.getProperty('BOT_BUY_TRIGGER') || 42500000),
    sellTrigger: Number(props.getProperty('BOT_SELL_TRIGGER') || 44500000),
    modalPerTrade: Number(props.getProperty('BOT_MODAL_PER_TRADE') || 15000),
    minQty: Number(props.getProperty('BOT_MIN_QTY') || 0.000001),
    cooldownMs: Number(props.getProperty('BOT_COOLDOWN_MS') || 1800000),
    maxDailyTrades: Number(props.getProperty('BOT_MAX_DAILY_TRADES') || 1),
    status: String(props.getProperty('STATUS_BOT_ETH') || 'KOSONG').toUpperCase()
  };
}

function setBotStatus(status) {
  var props = PropertiesService.getScriptProperties();
  var normalizedStatus = String(status || '').toUpperCase();

  if (normalizedStatus !== 'KOSONG' && normalizedStatus !== 'PEGANG') {
    throw new Error('Status bot tidak valid: ' + status);
  }

  props.setProperty('STATUS_BOT_ETH', normalizedStatus);
  return normalizedStatus;
}

function setBotConfigManual(config) {
  if (!config) {
    throw new Error('Config bot tidak boleh kosong.');
  }

  var props = PropertiesService.getScriptProperties();

  if (config.pair) {
    props.setProperty('BOT_PAIR', String(config.pair).toLowerCase());
  }

  if (config.buyTrigger !== undefined && config.buyTrigger !== null) {
    props.setProperty('BOT_BUY_TRIGGER', String(Number(config.buyTrigger)));
  }

  if (config.sellTrigger !== undefined && config.sellTrigger !== null) {
    props.setProperty('BOT_SELL_TRIGGER', String(Number(config.sellTrigger)));
  }

  if (config.modalPerTrade !== undefined && config.modalPerTrade !== null) {
    props.setProperty('BOT_MODAL_PER_TRADE', String(Number(config.modalPerTrade)));
  }

  if (config.minQty !== undefined && config.minQty !== null) {
    props.setProperty('BOT_MIN_QTY', String(Number(config.minQty)));
  }

  if (config.cooldownMs !== undefined && config.cooldownMs !== null) {
    props.setProperty('BOT_COOLDOWN_MS', String(Number(config.cooldownMs)));
  }

  if (config.maxDailyTrades !== undefined && config.maxDailyTrades !== null) {
    props.setProperty('BOT_MAX_DAILY_TRADES', String(Number(config.maxDailyTrades)));
  }

  Logger.log('✅ Konfigurasi bot berhasil disimpan.');
}

function resetStatusBot() {
  var props = PropertiesService.getScriptProperties();
  props.deleteProperty('STATUS_BOT_ETH');
  props.deleteProperty('BOT_LAST_ERROR');
  props.deleteProperty('BOT_TRADE_STATE');
  props.deleteProperty('BOT_TRADE_LOG');
  Logger.log('🔄 Status bot berhasil di-reset ke KOSONG.');
}

function setSinglePositionMode() {
  var props = PropertiesService.getScriptProperties();
  props.setProperty('BOT_COOLDOWN_MS', '1800000');
  props.setProperty('BOT_MAX_DAILY_TRADES', '1');
  Logger.log('✅ Mode single-position aktif: cooldown 30 menit, maksimal 1 trade per hari.');
}

function setConservativeSafeStrategy() {
  var props = PropertiesService.getScriptProperties();
  props.setProperty('BOT_BUY_TRIGGER', '42500000');
  props.setProperty('BOT_SELL_TRIGGER', '44500000');
  props.setProperty('BOT_COOLDOWN_MS', '1800000');
  props.setProperty('BOT_MAX_DAILY_TRADES', '1');
  Logger.log('✅ Strategi aman aktif: buyTrigger=42500000, sellTrigger=44500000, cooldown=30 menit, maxDailyTrades=1');
}

function calculateSafeTriggersFromPrice(currentPrice, buyDropPercent, sellRisePercent) {
  if (!isFinite(Number(currentPrice)) || Number(currentPrice) <= 0) {
    throw new Error('Harga saat ini tidak valid: ' + currentPrice);
  }

  var buyPercent = Number(buyDropPercent || 2);
  var sellPercent = Number(sellRisePercent || 5);
  var price = Number(currentPrice);

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

function updateSafeTriggersFromCurrentPrice() {
  var currentPrice = getTickerPrice('ethidr');
  var result = calculateSafeTriggersFromPrice(currentPrice, 2, 5);

  setBotConfigManual({
    buyTrigger: result.buyTrigger,
    sellTrigger: result.sellTrigger,
    cooldownMs: 1800000,
    maxDailyTrades: 1
  });

  Logger.log('✅ Trigger otomatis disesuaikan:');
  Logger.log('Current price: ' + result.currentPrice);
  Logger.log('Buy trigger: ' + result.buyTrigger);
  Logger.log('Sell trigger: ' + result.sellTrigger);

  return result;
}
