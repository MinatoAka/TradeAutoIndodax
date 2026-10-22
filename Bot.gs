// ==========================================
// Bot.gs
// Logika utama trading dan eksekusi order
// ==========================================

function kirimOrder(symbol, side, type, price, qty) {
  // ... (Fungsi kirimOrder lo udah sempurna, biarin aja sama persis) ...
  var credentials = requireApiCredentials();
  var normalizedSymbol = normalizeSymbol(symbol);
  var normalizedSide = String(side || '').toUpperCase();
  var normalizedType = String(type || '').toUpperCase();

  if (!normalizedSymbol) throw new Error('Symbol tidak boleh kosong.');
  if (normalizedSide !== 'BUY' && normalizedSide !== 'SELL') throw new Error('Side order harus BUY atau SELL.');
  if (normalizedType !== 'LIMIT' && normalizedType !== 'MARKET') throw new Error('Type order harus LIMIT atau MARKET.');

  var priceNumber = Number(price);
  var qtyNumber = Number(qty);

  if (!isFinite(priceNumber) || priceNumber <= 0) throw new Error('Harga order tidak valid: ' + price);
  if (!isFinite(qtyNumber) || qtyNumber <= 0) throw new Error('Kuantitas order tidak valid: ' + qty);

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

function hasOpenPositionGuard(config) {
  // ... (Fungsi guard lo udah sempurna) ...
  var cfg = config || getBotConfig();
  var currentStatus = String(cfg.status || 'KOSONG').toUpperCase();
  var state = getTradeState();
  var lastTradeAt = Number(state.lastTradeAt || 0);
  var cooldownMs = Number(cfg.cooldownMs || 600000);
  var now = Date.now();

  if (currentStatus === 'PEGANG') {
    Logger.log('🛡️ Single-position guard aktif: status PEGANG, transaksi beli diblokir.');
    return false;
  }

  if (lastTradeAt && (now - lastTradeAt) < cooldownMs) {
    Logger.log('🛡️ Single-position guard aktif: cooldown belum selesai. Sisa=' + (cooldownMs - (now - lastTradeAt)) + ' ms');
    return false;
  }

  return true;
}

// ==========================================
// UPDATE: Fungsi Validasi Terima Saldo dari Luar
// ==========================================
function validateTradeOpportunity(config, idrBalance, assetBalance, side) {
  if (side === 'BUY') {
    if (String(config.status || '').toUpperCase() === 'PEGANG') {
      Logger.log('🛡️ Pengaman ekstra: posisi masih terbuka, beli dibatalkan.');
      return false;
    }
    if (idrBalance < config.modalPerTrade) {
      Logger.log('⚠️ Saldo IDR tidak cukup: ' + idrBalance + ' < ' + config.modalPerTrade);
      return false;
    }
    return true;
  }

  if (side === 'SELL') {
    if (assetBalance <= 0) {
      Logger.log('⚠️ Saldo aset tidak cukup untuk sell.');
      return false;
    }
    return true;
  }
  return true;
}

// ==========================================
// UPDATE: Hitung Sell Qty Tanpa Nembak API
// ==========================================
function calculateSellQty(assetBalance, hargaSekarang, modalPerTrade, buyTrigger, minQty) {
  if (assetBalance <= 0) return 0;

  var nominalTarget = Number(modalPerTrade || 0);
  var derivedQty = Number((nominalTarget / Math.max(Number(buyTrigger) || hargaSekarang, 1)).toFixed(6));
  var safeQty = Math.min(assetBalance, derivedQty);

  if (!isFinite(safeQty) || safeQty <= 0) return 0;
  if (safeQty < Number(minQty || 0.000001)) return 0;

  return safeQty;
}

function jalankanBotUtama() {
  var config = getBotConfig();
  var props = PropertiesService.getScriptProperties();

  try {
    // 1. Ambil Harga (Ini udah otomatis pakai CACHE dari update Market.gs)
    var hargaSekarang = getTickerPrice(config.pair);
    
    Logger.log('📝 Log eksekusi bot: pair=' + config.pair.toUpperCase() + ', harga=' + hargaSekarang + ', status=' + config.status);

    // 2. Cek Sinyal DULU (Early Exit kalau nggak ada sinyal)
    var isBuySignal = (config.status === 'KOSONG' && hargaSekarang <= config.buyTrigger);
    var isSellSignal = (config.status === 'PEGANG' && hargaSekarang >= config.sellTrigger);

    if (!isBuySignal && !isSellSignal) {
      Logger.log('🟡 Menunggu momen yang pas... (Hemat API)');
      return; 
    }

    // 3. KALAU ADA SINYAL, BARU TARIK SALDO (1 Request doang!)
    Logger.log('🔔 Sinyal terdeteksi! Mengecek saldo & guard...');
    var saldo = getBalancesForTrade(config.pair); 
    var state = getTradeState();

    // --- EKSEKUSI BELI ---
    if (isBuySignal) {
      if (!hasOpenPositionGuard(config)) return;
      if (!validateTradeOpportunity(config, saldo.idr, saldo.asset, 'BUY')) return;
      if (!canExecuteNewTrade(config, state)) return;

      var qty = calculateBuyQty(hargaSekarang, config.modalPerTrade, config.minQty);
      if (qty <= 0) return;

      var sukses = kirimOrder(config.pair, 'BUY', 'LIMIT', hargaSekarang, qty);
      if (sukses) {
        setBotStatus('PEGANG');
        registerTradeExecution();
        appendTradeLog({ timestamp: new Date().toISOString(), type: 'BUY', pair: config.pair, price: hargaSekarang, qty: qty, status: 'PEGANG' });
        Logger.log('📝 Status bot diubah menjadi PEGANG.');
      }
      return;
    }

    // --- EKSEKUSI JUAL ---
    if (isSellSignal) {
      if (!validateTradeOpportunity(config, saldo.idr, saldo.asset, 'SELL')) return;
      if (!canExecuteNewTrade(config, state)) return;

      // Panggil calculateSellQty pakai saldo yang udah ditarik di atas
      var qtyToSell = calculateSellQty(saldo.asset, hargaSekarang, config.modalPerTrade, config.buyTrigger, config.minQty);
      if (qtyToSell <= 0) return;

      var sukses = kirimOrder(config.pair, 'SELL', 'LIMIT', hargaSekarang, qtyToSell);
      if (sukses) {
        setBotStatus('KOSONG');
        registerTradeExecution();
        appendTradeLog({ timestamp: new Date().toISOString(), type: 'SELL', pair: config.pair, price: hargaSekarang, qty: qtyToSell, status: 'KOSONG' });
        Logger.log('📝 Status bot diubah menjadi KOSONG.');
      }
      return;
    }

  } catch (e) {
    Logger.log('Error Sistem di Bot Utama: ' + e.toString());
    props.setProperty('BOT_LAST_ERROR', new Date().toISOString() + ' :: ' + e.toString());
  }
}
