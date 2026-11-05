// ==========================================
// TradeState.gs
// State trade, cooldown, logging, debug
// ==========================================

function getTradeState() {
  var props = PropertiesService.getScriptProperties();
  var raw = props.getProperty('BOT_TRADE_STATE') || '{}';

  try {
    var parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return { dailyTrades: 0, lastTradeAt: 0, lastTradeDate: '' };
    }

    return {
      dailyTrades: Number(parsed.dailyTrades || 0),
      lastTradeAt: Number(parsed.lastTradeAt || 0),
      lastTradeDate: String(parsed.lastTradeDate || '')
    };
  } catch (e) {
    return { dailyTrades: 0, lastTradeAt: 0, lastTradeDate: '' };
  }
}

function saveTradeState(state) {
  PropertiesService.getScriptProperties().setProperty('BOT_TRADE_STATE', JSON.stringify(state));
}

function getTradingDate() {
  var now = new Date();
  // Kurangi 7 jam dari waktu sekarang agar pergantian hari terjadi jam 07:00 WIB
  var tradingTime = new Date(now.getTime() - (7 * 60 * 60 * 1000));
  return Utilities.formatDate(tradingTime, "Asia/Jakarta", "yyyy-MM-dd");
}

function resetDailyTradeCounterIfNeeded() {
  var state = getTradeState();
  var today = getTradingDate();

  if (state.lastTradeDate !== today) {
    state.dailyTrades = 0;
    state.lastTradeDate = today;
    saveTradeState(state);
    Logger.log('🔄 Hari trading baru terdeteksi (' + today + '). Counter harian di-reset ke 0.');
  }
  
  return state;
}

function canExecuteNewTrade(config, state) {
  if (!state) {
    state = getTradeState();
  }

  var now = Date.now();
  var elapsed = now - Number(state.lastTradeAt || 0);
  var cooldownMs = Number(config.cooldownMs || 60000);

  // 1. Cek Cooldown
  if (elapsed < cooldownMs) {
    Logger.log('⏳ Cooldown aktif. Sisa: ' + (cooldownMs - elapsed) + ' ms');
    return false;
  }

  // 2. Cek & Reset Harian (Langsung timpa variabel 'state' dengan hasil return)
  state = resetDailyTradeCounterIfNeeded();

  // 3. Cek Batas Harian
  if (Number(state.dailyTrades || 0) >= Number(config.maxDailyTrades || 2)) {
    Logger.log('⚠️ Batas harian trade tercapai: ' + state.dailyTrades + '/' + config.maxDailyTrades);
    return false;
  }

  return true;
}

function registerTradeExecution() {
  var state = getTradeState();
  var today = getTradingDate(); // Pakai tanggal candle

  state.lastTradeAt = Date.now();
  state.lastTradeDate = today;
  state.dailyTrades = Number(state.dailyTrades || 0) + 1;

  saveTradeState(state);
}

function appendTradeLog(entry) {
  var props = PropertiesService.getScriptProperties();
  var raw = props.getProperty('BOT_TRADE_LOG') || '[]';

  try {
    var log = JSON.parse(raw);
    if (!Array.isArray(log)) {
      log = [];
    }
  } catch (e) {
    log = [];
  }

  log.push(entry);

  if (log.length > 50) {
    log = log.slice(log.length - 50);
  }

  props.setProperty('BOT_TRADE_LOG', JSON.stringify(log));
}

function getTradeLog() {
  var raw = PropertiesService.getScriptProperties().getProperty('BOT_TRADE_LOG') || '[]';
  try {
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

function debugBalances() {
  try {
    var balances = getBalanceMap();
    Logger.log('Saldo akun: ' + JSON.stringify(balances));
    return balances;
  } catch (e) {
    Logger.log('Gagal debug saldo: ' + e.toString());
    return {};
  }
}

function debugBotState() {
  var state = getTradeState();
  Logger.log('BOT_TRADE_STATE: ' + JSON.stringify(state));
  return state;
}
