// ==========================================
// Config.gs
// Menyimpan dan membaca konfigurasi bot
// ==========================================
const optHeaders = {
  method: 'get',
  muteHttpExceptions: true,
  headers: {
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'id-ID,id;q=0.9, en-US;q=0.8, en;q=0.7',
    'User-Agent': 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Googlebot/2.1; +http://www.google.com/bot.html) Chrome/122.0.0.0 Safari/537.36'
  }
};

/**
 * safeNumber — Membersihkan input string menjadi angka murni.
 * Mengembalikan defaultVal jika hasilnya tidak valid.
 */
function safeNumber(val, defaultVal) {
  if (val === null || val === undefined || val === '') return defaultVal;
  // Hapus semua karakter selain angka, titik desimal, dan minus
  var cleanVal = String(val).replace(/[^0-9.-]+/g, '');
  var num = Number(cleanVal);
  return isFinite(num) && num >= 0 ? num : defaultVal;
}

function getBotConfig() {
  var props = PropertiesService.getScriptProperties();

  // 🛡️ PENGAMAN 1: Pair WAJIB Di-set
  var rawPair = props.getProperty('BOT_PAIR');
  if (!rawPair) {
    throw new Error('🛑 [CONFIG ERROR] BOT_PAIR wajib di-set di Script Properties!');
  }
  var pair = normalizeSymbol(rawPair);
  if (!pair) {
    throw new Error('🛑 [CONFIG ERROR] Format BOT_PAIR tidak valid. Contoh: ethidr, btcidr.');
  }

  // 🛡️ PENGAMAN 2: Trigger Harga WAJIB Di-set
  var rawBuyTrigger = props.getProperty('BOT_BUY_TRIGGER');
  var rawSellTrigger = props.getProperty('BOT_SELL_TRIGGER');

  if (!rawBuyTrigger || !rawSellTrigger) {
    throw new Error('🛑 [CONFIG ERROR] BOT_BUY_TRIGGER dan BOT_SELL_TRIGGER wajib di-set di Script Properties!');
  }

  var buyTrigger = safeNumber(rawBuyTrigger, 0);
  var sellTrigger = safeNumber(rawSellTrigger, 0);

  if (buyTrigger <= 0 || sellTrigger <= 0) {
    throw new Error('🛑 [CONFIG ERROR] Nilai BOT_BUY_TRIGGER atau BOT_SELL_TRIGGER tidak valid (harus berupa angka > 0).');
  }

  // 🛡️ PENGAMAN 3: Parameter lain dibersihkan dengan safeNumber
  var config = {
    pair: pair,
    buyTrigger: buyTrigger,
    sellTrigger: sellTrigger,
    modalPerTrade: safeNumber(props.getProperty('BOT_MODAL_PER_TRADE'), 15000),
    minQty: safeNumber(props.getProperty('BOT_MIN_QTY'), 0.0001),
    cooldownMs: safeNumber(props.getProperty('BOT_COOLDOWN_MS'), 1800000),
    maxDailyTrades: safeNumber(props.getProperty('BOT_MAX_DAILY_TRADES'), 6),
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
