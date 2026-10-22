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
