// ==========================================
// Config.gs
// Menyimpan dan membaca konfigurasi bot
// ==========================================

function getBotConfig() {
  var props = PropertiesService.getScriptProperties();
  var pair = normalizeSymbol(props.getProperty('BOT_PAIR') || 'ethidr');

  var config = {
    pair: pair,
    buyTrigger: Number(props.getProperty('BOT_BUY_TRIGGER') || 40923000),
    sellTrigger: Number(props.getProperty('BOT_SELL_TRIGGER') || 42150690),
    modalPerTrade: Number(props.getProperty('BOT_MODAL_PER_TRADE') || 15000),
    minQty: Number(props.getProperty('BOT_MIN_QTY') || 0.0001),
    cooldownMs: Number(props.getProperty('BOT_COOLDOWN_MS') || 1800000),
    maxDailyTrades: Number(props.getProperty('BOT_MAX_DAILY_TRADES') || 6),
    status: String(props.getProperty('BOT_STATUS') || 'KOSONG').toUpperCase()
  };

  logBotConfig(config);
  return config;
}

function debugConfig() {
  getBotConfig();
}

function logBotConfig(config) {
  var fBuy = Number(config.buyTrigger).toLocaleString('id-ID');
  var fSell = Number(config.sellTrigger).toLocaleString('id-ID');
  var fModal = Number(config.modalPerTrade).toLocaleString('id-ID');
  var cooldownMenit = Number(config.cooldownMs) / 60000;

  Logger.log('========================================');
  Logger.log('||       BOT CONFIG DEBUG             ||');
  Logger.log('========================================');
  Logger.log('pair            : ' + config.pair);
  Logger.log('buyTrigger      : Rp ' + fBuy);
  Logger.log('sellTrigger     : Rp ' + fSell);
  Logger.log('modalPerTrade   : Rp ' + fModal);
  Logger.log('minQty          : ' + config.minQty);
  Logger.log('cooldown.       : ' + cooldownMenit + ' Menit');
  Logger.log('maxDailyTrades  : ' + config.maxDailyTrades);
  Logger.log('status          : ' + config.status);
  Logger.log('========================================');
}

function resetStatusBot() {
  var props = PropertiesService.getScriptProperties();
  props.deleteProperty('BOT_STATUS');
  props.deleteProperty('BOT_LAST_ERROR');
  props.deleteProperty('BOT_TRADE_STATE');
  props.deleteProperty('BOT_TRADE_LOG');
  Logger.log('🔄 Status bot berhasil di-reset ke KOSONG.');
}

function setSinglePositionMode() {
  var props = PropertiesService.getScriptProperties();
  props.setProperty('BOT_COOLDOWN_MS', '1800000');
  props.setProperty('BOT_MAX_DAILY_TRADES', '2');
  Logger.log('✅ Mode single-position aktif: cooldown 30 menit, maksimal 2 trade per hari.');
}
