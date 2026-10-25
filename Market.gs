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
      'Sign': signature,
      'Accept': 'application/json'
    },
    muteHttpExceptions: true
  };

  var response = UrlFetchApp.fetch('https://api.indodax.com/api/v2/account?' + queryString, options);
  var responseCode = Number(response.getResponseCode());
  var rawText = response.getContentText();

  if (responseCode >= 400) {
    throw new Error('Gagal mengambil saldo akun. HTTP ' + responseCode + ' :: ' + rawText);
  }

  var data = safeParseJson(rawText, 'account');
  var balances = {};

  if (data && Array.isArray(data.balances)) {
    data.balances.forEach(function (item) {
      var currency = String(item.asset || '').toLowerCase();
      if (currency) {
        balances[currency] = {
          free: Number(item.free || 0),
          locked: Number(item.locked || 0),
          total: Number(item.free || 0) + Number(item.locked || 0)
        };
      }
    });
  }

  var idrSaldo = balances['idr'] ? balances['idr'].free : 0;
  Logger.log('✅ Saldo IDR: Rp ' + idrSaldo.toLocaleString('id-ID'));
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
// Ambil Saldo IDR & Aset Sekaligus (1 Request)
// ==========================================

function getBalancesForTrade(pair) {
  var balances = getBalanceMap();
  var baseAsset = getPairBaseAsset(pair);
  
  var getVal = function(asset) {
    var entry = balances[asset] || balances[asset.toUpperCase()];
    if (!entry) return 0;
    var val = Number(entry.available || entry.free || entry.balance || entry.amount || 0);
    return isFinite(val) ? val : 0;
  };

  return {
    idr: getVal('idr'),
    asset: getVal(baseAsset)
  };
}

// ==========================================
// GET TICKER PRICE DENGAN RETRY & CACHE
// ==========================================

function getTickerPrice(pair) {
  var cache = CacheService.getScriptCache();
  var cacheKey = 'ticker_' + normalizeSymbol(pair);
  
  // Cek Cache dulu (Hemat Request! Berlaku 5 menit / 300 detik)
  var cachedPrice = cache.get(cacheKey);
  if (cachedPrice) {
    return Number(cachedPrice);
  }

  var url = 'https://indodax.com/api/ticker/' + normalizeSymbol(pair);
  var maxRetries = 3;
  var delayMs = 2000;

  for (var attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
      var responseCode = Number(response.getResponseCode());
      var rawText = response.getContentText();

      // Jika kena Rate Limit (429)
      if (responseCode === 429) {
        Logger.log('⚠️ Kena Rate Limit (429). Menunggu ' + (delayMs / 1000) + ' detik sebelum mencoba lagi (Percobaan ' + attempt + '/' + maxRetries + ')...');
        Utilities.sleep(delayMs);
        delayMs *= 2;
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

      // Simpan ke Cache selama 5 menit jika sukses
      cache.put(cacheKey, String(hargaSekarang), 300);
      return hargaSekarang;

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

// ==========================================
// Hitung Sell Qty Tanpa Nembak API
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
