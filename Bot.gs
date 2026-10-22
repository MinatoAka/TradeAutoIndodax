// ==========================================
// Bot.gs
// Logika utama trading dan eksekusi order
// ==========================================

function kirimOrder(symbol, side, type, price, qty) {
  var credentials = requireApiCredentials();
  var normalizedSymbol = normalizeSymbol(symbol);
  var normalizedSide = String(side || '').toUpperCase();
  var normalizedType = String(type || '').toUpperCase();

  if (!normalizedSymbol) {
    throw new Error('Symbol tidak boleh kosong.');
  }

  if (normalizedSide !== 'BUY' && normalizedSide !== 'SELL') {
    throw new Error('Side order harus BUY atau SELL.');
  }

  if (normalizedType !== 'LIMIT' && normalizedType !== 'MARKET') {
    throw new Error('Type order harus LIMIT atau MARKET.');
  }

  var priceNumber = Number(price);
  var qtyNumber = Number(qty);

  if (!isFinite(priceNumber) || priceNumber <= 0) {
    throw new Error('Harga order tidak valid: ' + price);
  }

  if (!isFinite(qtyNumber) || qtyNumber <= 0) {
    throw new Error('Kuantitas order tidak valid: ' + qty);
  }

  var params = {
    symbol: normalizedSymbol,
    side: normalizedSide,
    type: normalizedType,
    timestamp: String(new Date().getTime()),
    recvWindow: '5000'
  };

  if (normalizedType === 'LIMIT') {
    params.price = String(priceNumber);
    params.quantity = String(qtyNumber);
  }

  var queryString = buildQueryString(params);
  var signature = getIndodaxSignatureV2(queryString, credentials.secretKey);

  var options = {
    method: 'post',
    contentType: 'application/x-www-form-urlencoded',
    headers: {
      'X-APIKEY': credentials.apiKey,
      'Sign': signature
    },
    payload: queryString,
    muteHttpExceptions: true
  };

  try {
    var response = UrlFetchApp.fetch('https://api.indodax.com/api/v2/order', options);
    var responseCode = Number(response.getResponseCode());
    var rawText = response.getContentText();
    var resData = safeParseJson(rawText, 'order');

    if (responseCode >= 400) {
      Logger.log('❌ Order gagal, HTTP ' + responseCode + ': ' + rawText);
      return false;
    }

    var orderId = resData && (resData.orderId || (resData.result && resData.result.orderId));
    if (orderId) {
      Logger.log('✅ Order ' + normalizedSide + ' berhasil! ID: ' + orderId);
      return true;
    }

    Logger.log('❌ Order gagal: ' + JSON.stringify(resData));
    return false;
  } catch (e) {
    Logger.log('❌ Error sistem saat kirim order: ' + e.toString());
    return false;
  }
}

function validateTradeOpportunity(config, hargaSekarang, side) {
  var idrBalance = getAvailableBalance('idr');
  var assetBalance = getAvailableBalance(getPairBaseAsset(config.pair));

  Logger.log('📝 Log validasi peluang: side=' + side + ', harga=' + hargaSekarang + ', status=' + (config.status || 'UNKNOWN'));

  if (side === 'BUY') {
    if (String(config.status || '').toUpperCase() === 'PEGANG') {
      Logger.log('🛡️ Pengaman ekstra: posisi masih terbuka, beli dibatalkan.');
      return false;
    }

    Logger.log('📝 Log saldo BUY: idrBalance=' + idrBalance + ', required=' + config.modalPerTrade);

    if (idrBalance < config.modalPerTrade) {
      Logger.log('⚠️ Saldo IDR tidak cukup: ' + idrBalance + ' < ' + config.modalPerTrade);
      return false;
    }
    return true;
  }

  if (side === 'SELL') {
    Logger.log('📝 Log saldo SELL: assetBalance=' + assetBalance + ', pair=' + config.pair);

    if (assetBalance <= 0) {
      Logger.log('⚠️ Saldo aset tidak cukup untuk sell.');
      return false;
    }
    return true;
  }

  return true;
}

function hasOpenPositionGuard(config) {
  var cfg = config || getBotConfig();
  var currentStatus = String(cfg.status || 'KOSONG').toUpperCase();
  var state = getTradeState();
  var lastTradeAt = Number(state.lastTradeAt || 0);
  var cooldownMs = Number(cfg.cooldownMs || 600000);
  var now = Date.now();

  Logger.log('📝 Log guard posisi: status=' + currentStatus + ', lastTradeAt=' + lastTradeAt + ', cooldownMs=' + cooldownMs + ', now=' + now);

  if (currentStatus === 'PEGANG') {
    Logger.log('🛡️ Single-position guard aktif: status PEGANG, transaksi beli diblokir.');
    return false;
  }

  if (lastTradeAt && (now - lastTradeAt) < cooldownMs) {
    Logger.log('🛡️ Single-position guard aktif: cooldown belum selesai. Sisa=' + (cooldownMs - (now - lastTradeAt)) + ' ms');
    return false;
  }

  Logger.log('📝 Log guard posisi: aman untuk transaksi baru.');
  return true;
}

function jalankanBotUtama() {
  var config = getBotConfig();
  var props = PropertiesService.getScriptProperties();

  try {
    var hargaSekarang = getTickerPrice(config.pair);
    var state = getTradeState();

    Logger.log('📝 Log eksekusi bot: pair=' + config.pair.toUpperCase() + ', harga=' + hargaSekarang + ', status=' + config.status + ', buyTrigger=' + config.buyTrigger + ', sellTrigger=' + config.sellTrigger);

    if (config.status === 'KOSONG' && hargaSekarang <= config.buyTrigger) {
      if (!hasOpenPositionGuard(config)) {
        Logger.log('📝 Log: beli dibatalkan karena guard posisi aktif.');
        return;
      }

      Logger.log('🟢 Sinyal BELI terdeteksi! Mengecek kelayakan...');

      if (!validateTradeOpportunity(config, hargaSekarang, 'BUY')) {
        return;
      }

      if (!canExecuteNewTrade(config, state)) {
        return;
      }

      var qty = calculateBuyQty(hargaSekarang, config.modalPerTrade, config.minQty);
      Logger.log('📝 Log qty beli: qty=' + qty + ', modal=' + config.modalPerTrade + ', minQty=' + config.minQty);
      if (qty <= 0) {
        Logger.log('⚠️ Kuantitas beli invalid, dilewati.');
        return;
      }

      var sukses = kirimOrder(config.pair, 'BUY', 'LIMIT', hargaSekarang, qty);
      if (sukses) {
        setBotStatus('PEGANG');
        registerTradeExecution();
        appendTradeLog({
          timestamp: new Date().toISOString(),
          type: 'BUY',
          pair: config.pair,
          price: hargaSekarang,
          qty: qty,
          status: 'PEGANG'
        });
        Logger.log('📝 Log: status bot diubah menjadi PEGANG setelah BUY sukses.');
      }

      return;
    }

    if (config.status === 'PEGANG' && hargaSekarang >= config.sellTrigger) {
      Logger.log('🔴 Sinyal JUAL terdeteksi! Mengecek saldo aset...');

      if (!validateTradeOpportunity(config, hargaSekarang, 'SELL')) {
        return;
      }

      if (!canExecuteNewTrade(config, state)) {
        return;
      }

      var qtyToSell = calculateSellQty(config.pair, hargaSekarang, config.modalPerTrade, config.buyTrigger, config.minQty);
      Logger.log('📝 Log qty jual: qtyToSell=' + qtyToSell + ', modal=' + config.modalPerTrade + ', buyTrigger=' + config.buyTrigger + ', minQty=' + config.minQty);
      if (qtyToSell <= 0) {
        Logger.log('⚠️ Tidak ada saldo aset yang cukup untuk dijual.');
        return;
      }

      var sukses = kirimOrder(config.pair, 'SELL', 'LIMIT', hargaSekarang, qtyToSell);
      if (sukses) {
        setBotStatus('KOSONG');
        registerTradeExecution();
        appendTradeLog({
          timestamp: new Date().toISOString(),
          type: 'SELL',
          pair: config.pair,
          price: hargaSekarang,
          qty: qtyToSell,
          status: 'KOSONG'
        });
        Logger.log('📝 Log: status bot diubah menjadi KOSONG setelah SELL sukses.');
      }

      return;
    }

    Logger.log('🟡 Menunggu momen yang pas... (Harga belum nyentuh target)');
  } catch (e) {
    Logger.log('Error Sistem di Bot Utama: ' + e.toString());
    props.setProperty('BOT_LAST_ERROR', new Date().toISOString() + ' :: ' + e.toString());
  }
}
