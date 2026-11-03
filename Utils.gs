// ==========================================
// Utils.gs
// Helper umum untuk format & keamanan
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

function normalizeSymbol(symbol) {
  return String(symbol || '').toLowerCase();
}

function getPairBaseAsset(pair) {
  var normalized = normalizeSymbol(pair);
  if (normalized.indexOf('idr') !== -1) {
    return normalized.replace(/idr$/, '');
  }
  return normalized;
}

function requireApiCredentials() {
  var props = PropertiesService.getScriptProperties();
  var apiKey = props.getProperty('INDO_API_KEY');
  var secretKey = props.getProperty('INDO_SECRET_KEY');

  if (!apiKey || !secretKey) {
    throw new Error('INDO_API_KEY atau INDO_SECRET_KEY belum di-set.');
  }

  return {
    apiKey: apiKey,
    secretKey: secretKey
  };
}

function calculateSafeTriggersFromPrice(currentPrice, buyDropPercent, sellRisePercent) {
  if (!isFinite(Number(currentPrice)) || Number(currentPrice) <= 0) {
    throw new Error('Harga saat ini tidak valid: ' + currentPrice);
  }

  var price = Number(currentPrice);
  var buyPercent = Number(buyDropPercent || 2);
  var sellPercent = Number(sellRisePercent || 5);

  if (buyPercent <= 0 || sellPercent <= 0) {
    throw new Error('Persentase buy/sell harus lebih besar dari 0.');
  }

  var buyTrigger = price * (1 - (buyPercent / 100));
  var sellTrigger = buyTrigger * (1 + (sellPercent / 100));

  return {
    currentPrice: price,
    buyTrigger: Math.round(buyTrigger),
    sellTrigger: Math.round(sellTrigger),
    buyDropPercent: buyPercent,
    sellRisePercent: sellPercent
  };
}

function setBotStatus(status) {
  var props = PropertiesService.getScriptProperties();
  var normalizedStatus = String(status || '').toUpperCase();

  if (normalizedStatus !== 'KOSONG' && normalizedStatus !== 'PEGANG') {
    throw new Error('Status bot tidak valid: ' + status);
  }

  props.setProperty('BOT_STATUS', normalizedStatus);
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

// ==========================================
// API Fetcher: Ambil Batasan Trade dari Indodax
// ==========================================
function getIndodaxPairLimits(targetPair) {
  var cache = CacheService.getScriptCache();
  var cacheKey = 'indodax_limits_' + targetPair.toLowerCase();
  
  // Cek Cache dulu (Hemat Request API)
  var cachedData = cache.get(cacheKey);
  if (cachedData) {
    return JSON.parse(cachedData);
  }
  
  try {
    var options = {
        method: 'get',
        headers: {
          'User-Agent': 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Googlebot/2.1; +http://www.google.com/bot.html) Chrome/154.0.0.0 Safari/537.36',
          'Accept': 'application/json, application/xml',
          'Accept-Language': 'en-US, en;q=0.9',
          'Accept-Encoding': 'gzip, deflate'
        },
        muteHttpExceptions: true
    };
    
    var response = UrlFetchApp.fetch('https://indodax.com/api/pairs', options);
    
    if (response.getResponseCode() === 200) {
      var allPairs = JSON.parse(response.getContentText());
      
      var foundPair = allPairs.find(function(p) {
        return p.id === targetPair.toLowerCase();
      });
      
      if (foundPair) {
        var rawMinBase = Number(foundPair.trade_min_base_currency);
        var rawMinTraded = Number(foundPair.trade_min_traded_currency);
        
        var result = {
          // Buffer IDR 5.000 biar nggak mepet pas order
          minBase: rawMinBase + 5000,
          // Rem 5% dari minQty asli Indodax (Sesuai instruksi Jenderal)
          minTraded: Number((rawMinTraded * 0.95).toFixed(8)) 
        };
        
        // Simpan ke cache 6 jam (21600 detik)
        cache.put(cacheKey, JSON.stringify(result), 21600); 
        return result;
      }
    }
  } catch (e) {
    Logger.log('❌ Gagal narik API pairs: ' + e.message);
  }
  
  // Fallback darurat kalau API down
  return { minBase: 15000, minTraded: 0.0001 };
}
