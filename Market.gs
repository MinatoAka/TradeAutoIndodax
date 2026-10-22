// ==========================================
// Market.gs
// Mengambil saldo, ticker, dan menghitung qty
// ==========================================

function getBalanceMap() {
  var credentials = requireApiCredentials();

  var params = {
    timestamp: String(new Date().getTime()),
    recvWindow: '5000'
  };

  var queryString = buildQueryString(params);
  var signature = getIndodaxSignatureV2(queryString, credentials.secretKey);

  var options = {
    method: 'get',
    headers: {
      'X-APIKEY': credentials.apiKey,
      'Sign': signature
    },
    muteHttpExceptions: true
  };

  var response = UrlFetchApp.fetch('https://api.indodax.com/api/v2/balances?' + queryString, options);
  var responseCode = Number(response.getResponseCode());
  var rawText = response.getContentText();

  if (responseCode >= 400) {
    throw new Error('Gagal mengambil saldo akun. HTTP ' + responseCode + ' :: ' + rawText);
  }

  var data = safeParseJson(rawText, 'balances');
  var balances = {};

  if (Array.isArray(data)) {
    data.forEach(function (item) {
      var currency = String(item.currency || item.asset || '').toLowerCase();
      if (currency) {
        balances[currency] = item;
      }
    });
  } else if (data && typeof data === 'object') {
    Object.keys(data).forEach(function (key) {
      var item = data[key];
      if (item && typeof item === 'object') {
        balances[String(key).toLowerCase()] = item;
      }
    });
  }

  return balances;
}

function getAvailableBalance(currency) {
  var symbol = normalizeSymbol(currency);
  var balances = getBalanceMap();
  var entry = balances[symbol] || balances[symbol.toUpperCase()];

  if (!entry) {
    return 0;
  }

  var available = Number(entry.available || entry.free || entry.balance || entry.amount || 0);
  return isFinite(available) ? available : 0;
}

// ==========================================
// UPDATE: GET TICKER PRICE DENGAN RETRY LOGIC
// ==========================================

function getTickerPrice(pair) {
  var url = 'https://indodax.com/api/ticker/' + normalizeSymbol(pair);
  var maxRetries = 3;
  var delayMs = 2000; // Mulai jeda dari 2 detik

  for (var attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
      var responseCode = Number(response.getResponseCode());
      var rawText = response.getContentText();

      // Jika kena Rate Limit (429), tunggu dan coba lagi
      if (responseCode === 429) {
        Logger.log('⚠️ Kena Rate Limit (429). Menunggu ' + (delayMs / 1000) + ' detik sebelum mencoba lagi (Percobaan ' + attempt + '/' + maxRetries + ')...');
        Utilities.sleep(delayMs);
        delayMs *= 2; // Exponential backoff: 2s -> 4s -> 8s
        continue; 
      }

      if (responseCode >= 400 || !rawText) {
        throw new Error('Gagal mengambil ticker untuk pair ' + pair + '. HTTP: ' + responseCode);
      }

      var data = safeParseJson(rawText, 'ticker');
      var hargaSekarang = parseFloat(data && data.ticker && data.ticker.last);

      if (!isFinite(hargaSekarang) || hargaSekarang <= 0) {
        throw new Error('Harga ticker tidak valid: ' + rawText);
      }

      return hargaSekarang; // Sukses! Keluar dari loop.

    } catch (e) {
      if (attempt === maxRetries) {
        throw new Error('Gagal total setelah ' + maxRetries + ' percobaan. Error: ' + e.message);
      }
      Logger.log('❌ Error ambil harga: ' + e.message + '. Mencoba lagi...');
      Utilities.sleep(delayMs);
      delayMs *= 2;
    }
  }
}

function calculateBuyQty(hargaSekarang, modalPerTrade, minQty) {
  var qty = Number((modalPerTrade / hargaSekarang).toFixed(6));
  if (!isFinite(qty) || qty <= 0) {
    return 0;
  }
  if (qty < Number(minQty || 0.000001)) {
    return 0;
  }
  return qty;
}

function calculateSellQty(pair, hargaSekarang, modalPerTrade, buyTrigger, minQty) {
  var baseAsset = getPairBaseAsset(pair);
  var assetBalance = getAvailableBalance(baseAsset);

  if (assetBalance <= 0) {
    return 0;
  }

  var nominalTarget = Number(modalPerTrade || 0);
  var derivedQty = Number((nominalTarget / Math.max(Number(buyTrigger) || hargaSekarang, 1)).toFixed(6));
  var safeQty = Math.min(assetBalance, derivedQty);

  if (!isFinite(safeQty) || safeQty <= 0) {
    return 0;
  }

  if (safeQty < Number(minQty || 0.000001)) {
    return 0;
  }

  return safeQty;
}
