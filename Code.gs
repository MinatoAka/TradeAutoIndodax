// ==========================================
// 1. FUNGSI DASAR (JANGAN DIUBAH)
// ==========================================
function getIndodaxSignatureV2(payloadString, secretKey) {
  if (!payloadString || !secretKey) {
    throw new Error('Payload atau secretKey tidak boleh kosong.');
  }

  var signatureBytes = Utilities.computeHmacSha256Signature(payloadString, secretKey);
  var hexSignature = signatureBytes.map(function (byte) {
    var value = (byte < 0 ? byte + 256 : byte);
    return (value < 16 ? '0' : '') + value.toString(16);
  }).join('');

  return hexSignature;
}

function buildQueryString(params) {
  return Object.keys(params)
    .sort()
    .map(function (key) {
      var value = params[key];
      if (value === null || value === undefined) {
        return '';
      }
      return encodeURIComponent(key) + '=' + encodeURIComponent(String(value));
    })
    .filter(function (part) {
      return part !== '';
    })
    .join('&');
}

function safeParseJson(responseText, contextLabel) {
  if (!responseText) {
    throw new Error('Respons kosong saat parsing JSON (' + contextLabel + ').');
  }

  try {
    return JSON.parse(responseText);
  } catch (e) {
    throw new Error('Gagal parse JSON dari ' + contextLabel + ': ' + responseText);
  }
}

function getBotConfig() {
  var props = PropertiesService.getScriptProperties();
  var pair = (props.getProperty('BOT_PAIR') || 'ethidr').toLowerCase();
    
  return {
    pair: pair,
    buyTrigger: Number(props.getProperty('BOT_BUY_TRIGGER') || 42000000),
    sellTrigger: Number(props.getProperty('BOT_SELL_TRIGGER') || 43000000),
    modalPerTrade: Number(props.getProperty('BOT_MODAL_PER_TRADE') || 15000),
    status: props.getProperty('STATUS_BOT_ETH') || 'KOSONG'
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

// ==========================================
// 2. FUNGSI EKSEKUTOR (BELI / JUAL)
// ==========================================
function kirimOrder(symbol, side, type, price, qty) {
  var props = PropertiesService.getScriptProperties();
  var apiKey = props.getProperty('INDO_API_KEY');
  var secretKey = props.getProperty('INDO_SECRET_KEY');

  if (!apiKey || !secretKey) {
    throw new Error('INDO_API_KEY atau INDO_SECRET_KEY belum di-set.');
  }

  var normalizedSymbol = String(symbol || '').toLowerCase();
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
  var signature = getIndodaxSignatureV2(queryString, secretKey);

  var options = {
    method: 'post',
    contentType: 'application/x-www-form-urlencoded',
    headers: {
      'X-APIKEY': apiKey,
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

// ==========================================
// 3. OTAK BOT UTAMA (INI YANG DI-TRIGGER)
// ==========================================
function getTickerPrice(pair) {
  var url = 'https://indodax.com/api/ticker/' + String(pair || '').toLowerCase();
  var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  var responseCode = Number(response.getResponseCode());
  var rawText = response.getContentText();

  if (responseCode >= 400 || !rawText) {
    throw new Error('Gagal mengambil ticker untuk pair ' + pair + '. HTTP: ' + responseCode);
  }

  var data = safeParseJson(rawText, 'ticker');
  var hargaSekarang = parseFloat(data && data.ticker && data.ticker.last);

  if (!isFinite(hargaSekarang) || hargaSekarang <= 0) {
    throw new Error('Harga ticker tidak valid: ' + rawText);
  }

  return hargaSekarang;
}

function jalankanBotUtama() {
  var config = getBotConfig();
  var props = PropertiesService.getScriptProperties();

  try {
    var hargaSekarang = getTickerPrice(config.pair);
    Logger.log('Harga ' + config.pair.toUpperCase() + ': Rp ' + hargaSekarang.toLocaleString('id-ID') + ' | Status: ' + config.status);

    if (config.status === 'KOSONG' && hargaSekarang <= config.buyTrigger) {
      Logger.log('🟢 Sinyal BELI terdeteksi! Mencoba eksekusi...');

      var qty = Number((config.modalPerTrade / hargaSekarang).toFixed(6));
      if (!isFinite(qty) || qty <= 0) {
        Logger.log('⚠️ Kuantitas beli invalid, dilewati.');
        return;
      }

      var sukses = kirimOrder(config.pair, 'BUY', 'LIMIT', hargaSekarang, qty);
      if (sukses) {
        setBotStatus('PEGANG');
      }
    } else if (config.status === 'PEGANG' && hargaSekarang >= config.sellTrigger) {
      Logger.log('🔴 Sinyal JUAL terdeteksi! Mencoba eksekusi...');

      // Catatan: untuk produksi, hitung qty dari saldo ETH aktual bukan asumsi.
      var qtyToSell = Number((config.modalPerTrade / Math.max(config.buyTrigger, 1)).toFixed(6));
      if (!isFinite(qtyToSell) || qtyToSell <= 0) {
        Logger.log('⚠️ Kuantitas jual invalid, dilewati.');
        return;
      }

      var sukses = kirimOrder(config.pair, 'SELL', 'LIMIT', hargaSekarang, qtyToSell);
      if (sukses) {
        setBotStatus('KOSONG');
      }
    } else {
      Logger.log('🟡 Menunggu momen yang pas... (Harga belum nyentuh target)');
    }
  } catch (e) {
    Logger.log('Error Sistem di Bot Utama: ' + e.toString());
    props.setProperty('BOT_LAST_ERROR', new Date().toISOString() + ' :: ' + e.toString());
  }
}

// ==========================================
// 4. FUNGSI RESET DARURAT (KALAU NYANGKUT)
// ==========================================
function resetStatusBot() {
  var props = PropertiesService.getScriptProperties();
  props.deleteProperty('STATUS_BOT_ETH');
  props.deleteProperty('BOT_LAST_ERROR');
  Logger.log('🔄 Status bot berhasil di-reset ke KOSONG.');
}

// ==========================================
// 5. FUNGSI PENUNJANG (OPSIONAL)
// ==========================================
function setBotConfigManual(config) {
  var props = PropertiesService.getScriptProperties();

  if (!config) {
    throw new Error('Config bot tidak boleh kosong.');
  }

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

  Logger.log('✅ Konfigurasi bot berhasil disimpan.');
}
