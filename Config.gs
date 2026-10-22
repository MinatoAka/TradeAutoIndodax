// ==========================================
// Config.gs
// Menyimpan dan membaca konfigurasi bot
// ==========================================

function getBotConfig() {
  var props = PropertiesService.getScriptProperties();
  var pair = normalizeSymbol(props.getProperty('BOT_PAIR') || 'ethidr');

  return {
    pair: pair,
    buyTrigger: Number(props.getProperty('BOT_BUY_TRIGGER') || 42000000),
    sellTrigger: Number(props.getProperty('BOT_SELL_TRIGGER') || 43000000),
    modalPerTrade: Number(props.getProperty('BOT_MODAL_PER_TRADE') || 15000),
    minQty: Number(props.getProperty('BOT_MIN_QTY') || 0.000001),
    cooldownMs: Number(props.getProperty('BOT_COOLDOWN_MS') || 600000),
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
  props.setProperty('BOT_COOLDOWN_MS', '600000');
  props.setProperty('BOT_MAX_DAILY_TRADES', '1');
  Logger.log('✅ Mode single-position aktif: cooldown 10 menit, maksimal 1 trade per hari.');
}
