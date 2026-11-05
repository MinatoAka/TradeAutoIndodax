// ==========================================
// Market.gs
// Mengambil saldo, ticker, dan menghitung qty
// ==========================================

/**
 * formatQty — Mengubah angka jadi string tanpa notasi ilmiah dan tanpa nol berlebih di belakang.
 */
function formatQty(qty) {
  if (!qty || isNaN(qty)) return "0";
  var str = Number(qty).toFixed(8);
  return str.replace(/\.?0+$/, "");
}

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
  var maxRetries = 4;
  var delayMs = 2000;

  for (var attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      var options = {
        method: 'get',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36',
          'Accept': 'application/json, application/xml'
        },
        muteHttpExceptions: true
      };
      
      var response = UrlFetchApp.fetch(url, options);
      var responseCode = Number(response.getResponseCode());
      var rawText = response.getContentText();

      // Jika kena Rate Limit (429)
      if (responseCode === 429) {
        Logger.log('⚠️ Kena Rate Limit (429). (Percobaan ' + attempt + '/' + maxRetries + ')...');
  
        if (attempt === maxRetries) {
          throw new Error('Kena Rate Limit (429) berturut-turut sebanyak ' + maxRetries + ' kali.');
        }

        // --- LOGIKA JEDA ACAK (JITTER) UNTUK SEMUA RETRY ---
        // delayMs akan terus membesar (2s, 4s, dst), ditambah waktu acak 0-2500ms
        var jedaDetik = delayMs + Math.floor(Math.random() * 2500); 
  
        Logger.log('⏳ Menunggu ' + (jedaDetik / 1000).toFixed(2) + ' detik sebelum mencoba lagi...');
  
        Utilities.sleep(jedaDetik);
        delayMs *= 2; // Gandakan delay untuk percobaan selanjutnya
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
     // 1. Kalau udah mentok percobaan terakhir, langsung lempar error total
     if (attempt === maxRetries) {
       throw new Error('Gagal total setelah ' + maxRetries + ' percobaan. Error: ' + e.message);
     }

     // 2. Logika Jeda Acak (Jitter) untuk semua retry
     var jedaDetik = delayMs + Math.floor(Math.random() * 2500); 

     // 3. Log yang udah manusiawi (nampilin detik dengan 2 angka desimal)
     Logger.log('❌ Error ambil harga: ' + e.message + '. Menunggu ' + (jedaDetik / 1000).toFixed(2) + ' detik sebelum mencoba lagi...');
  
     // 4. Eksekusi jeda dan kalikan delay untuk jaga-jaga
     Utilities.sleep(jedaDetik);
     delayMs *= 2;
   }
  }
}

function calculateBuyQty(hargaSekarang, modalPerTrade, minQty) {
  var qty = Number(modalPerTrade / hargaSekarang);
  var formatted = Number(formatQty(qty));
  
  if (!isFinite(formatted) || formatted <= 0) return 0;
  if (formatted < Number(minQty || 0.00001)) return 0;
  
  return formatted;
}

function calculateSellQty(assetBalance, hargaSekarang, modalPerTrade, buyTrigger, minQty) {
  if (assetBalance <= 0) return 0;

  var nominalTarget = Number(modalPerTrade || 0);
  var derivedQty = Number(nominalTarget / Math.max(Number(buyTrigger) || hargaSekarang, 1));
  var safeQty = Math.min(assetBalance, derivedQty);
  var formatted = Number(formatQty(safeQty));

  if (!isFinite(formatted) || formatted <= 0) return 0;
  if (formatted < Number(minQty || 0.00001)) return 0;

  return formatted;
}
