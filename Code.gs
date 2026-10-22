// ==========================================
// 1. FUNGSI DASAR (JANGAN DIUBAH)
// ==========================================
function getIndodaxSignatureV2(payloadString, secretKey) {
  var signatureBytes = Utilities.computeHmacSha256Signature(payloadString, secretKey);
  var hexSignature = signatureBytes.map(function(byte) {
    var v = (byte < 0 ? byte + 256 : byte).toString(16);
    return v.length === 1 ? '0' + v : v;
  }).join('');
  return hexSignature;
}

// ==========================================
// 2. FUNGSI EKSEKUTOR (BELI / JUAL)
// ==========================================
function kirimOrder(symbol, side, type, price, qty) {
  var apiKey = PropertiesService.getScriptProperties().getProperty('INDO_API_KEY');
  var secretKey = PropertiesService.getScriptProperties().getProperty('INDO_SECRET_KEY');
  
  var params = {
    "symbol": symbol.toUpperCase(),
    "side": side.toUpperCase(),
    "type": type.toUpperCase(),
    "timestamp": new Date().getTime().toString(),
    "recvWindow": "5000"
  };

  if (type.toUpperCase() === 'LIMIT') {
    params.price = price.toString();
    params.quantity = qty.toString();
  }

  var queryString = Object.keys(params).map(function(k) {
    return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
  }).join('&');

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
    var resData = JSON.parse(response.getContentText());
    
    if (resData.orderId) {
      Logger.log("✅ Order " + side + " Berhasil! ID: " + resData.orderId);
      return true;
    } else {
      Logger.log("❌ Order Gagal: " + JSON.stringify(resData));
      return false;
    }
  } catch (e) {
    Logger.log("❌ Error Sistem: " + e.toString());
    return false;
  }
}

// ==========================================
// 3. OTAK BOT UTAMA (INI YANG DI-TRIGGER)
// ==========================================
function jalankanBotUtama() {
  var props = PropertiesService.getScriptProperties();
  var status = props.getProperty('STATUS_BOT_ETH') || 'KOSONG'; // Ingatan bot
  
  var pair = "ethidr"; 
  var targetBeli = 42000000; // Contoh: Beli kalau ETH <= 40 Juta (Sesuaikan!)
  var targetJual = 43000000; // Contoh: Jual kalau ETH >= 43 Juta (Sesuaikan!)
  var modalPerTrade = 15000; // Beli pakai Rp 15.000 (biar aman di atas minimal Rp 10.000)
  
  try {
    // 1. Ambil Harga Live
    var response = UrlFetchApp.fetch("https://indodax.com/api/ticker/" + pair, {muteHttpExceptions: true});
    var hargaSekarang = parseFloat(JSON.parse(response.getContentText()).ticker.last);
    
    Logger.log("Harga " + pair.toUpperCase() + ": Rp " + hargaSekarang.toLocaleString('id-ID') + " | Status: " + status);

    // 2. Logika KOSONG (Cari Beli)
    if (status === 'KOSONG' && hargaSekarang <= targetBeli) {
      Logger.log("🟢 Sinyal BELI terdeteksi! Mencoba eksekusi...");
      
      // Hitung kuantitas koin (Modal / Harga)
      var qty = modalPerTrade / hargaSekarang; 
      
      // Pembulatan quantity (Indodax kadang butuh format desimal tertentu)
      // Kita pakai 6 desimal (0.000000) untuk aman
      qty = parseFloat(qty.toFixed(6));
      
      // Eksekusi Beli
      var sukses = kirimOrder(pair, 'BUY', 'LIMIT', hargaSekarang, qty);
      if (sukses) {
        props.setProperty('STATUS_BOT_ETH', 'PEGANG'); // Kunci jadi PEGANG
      }
    } 
    // 3. Logika PEGANG (Cari Jual)
    else if (status === 'PEGANG' && hargaSekarang >= targetJual) {
      Logger.log("🔴 Sinyal JUAL terdeteksi! Mencoba eksekusi...");
      
      // Catatan: Di bot beneran, lo harus ngecek saldo ETH beneran di akun lo.
      // Untuk simplifikasi, kita anggap quantity-nya sama dengan saat beli.
      // (Nanti bisa dikembangkan pakai getSaldo)
      var qtyToSell = parseFloat((modalPerTrade / targetBeli).toFixed(6)); 
      
      // Eksekusi Jual
      var sukses = kirimOrder(pair, 'SELL', 'LIMIT', hargaSekarang, qtyToSell);
      if (sukses) {
        props.setProperty('STATUS_BOT_ETH', 'KOSONG'); // Buka kunci jadi KOSONG
      }
    } 
    // 4. Nunggu
    else {
      Logger.log("🟡 Nunggu momen yang pas... (Harga belum nyentuh target)");
    }
  } catch (e) {
    Logger.log("Error Sistem di Bot Utama: " + e.toString());
  }
}

// ==========================================
// 4. FUNGSI RESET DARURAT (KALAU NYANGKUT)
// ==========================================
function resetStatusBot() {
  PropertiesService.getScriptProperties().deleteProperty('STATUS_BOT_ETH');
  Logger.log("🔄 Status bot berhasil di-reset ke KOSONG.");
}
