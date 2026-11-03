// ==========================================
// Helper.gs (Audited & Dynamic)
// Fungsi bantu untuk strategi aman dan pengaturan trigger otomatis
// ==========================================

function runAutoSafeCalibration() {
  var config = getBotConfig(true);
  var currentStatus = config.status;
  var pair = config.pair;

  Logger.log('📝 Menjalankan auto calibration untuk pair [' + pair.toUpperCase() + ']. Status bot saat ini: ' + currentStatus);

  if (currentStatus === 'PEGANG') {
    Logger.log('🛡️ Bot masih dalam posisi terbuka. Auto calibration dibatalkan agar tidak mengubah target saat posisi aktif.');
    return {
      skipped: true,
      status: currentStatus,
      reason: 'Posisi PEGANG masih aktif.'
    };
  }

  // Mengambil harga pasar riil berdasarkan pair aktif
  var currentPrice = getTickerPrice(pair);
  
  // --- SETTINGAN KALIBRASI CONFIG ---
  var buyPercent = 2.5;         
  var sellPercent = 3;        
  var cooldownMs = 1800000;   // 30 Menit
  var maxDaily = 6;

  // 🟢 TARIK BATASAN DARI API INDODAX SECARA DINAMIS
  var limits = getIndodaxPairLimits(pair);
  
  // 🟢 GUNAKAN HASILNYA (Bukan hardcode lagi)
  var modalTrade = limits.minBase;    // Dapet Buffer + 5000
  var min_Qty = limits.minTraded;     // Dapet Rem - 10%

  // Hitung trigger harga
  var result = calculateSafeTriggersFromPrice(currentPrice, buyPercent, sellPercent);

  // Simpan konfigurasi baru via Helper Config
  setBotConfigManual({
    pair: pair,
    buyTrigger: result.buyTrigger,
    sellTrigger: result.sellTrigger,
    modalPerTrade: modalTrade,
    minQty: min_Qty,
    cooldownMs: cooldownMs, 
    maxDailyTrades: maxDaily 
  });

  // ==========================================
  // FORMAT LOG BARU (Manusiawi & Presisi)
  // ==========================================
  var fPrice = Number(result.currentPrice).toLocaleString('id-ID');
  var fBuy = Number(result.buyTrigger).toLocaleString('id-ID');
  var fSell = Number(result.sellTrigger).toLocaleString('id-ID');
  var cooldownMenit = cooldownMs / 60000;

  Logger.log('✅ Trigger otomatis disesuaikan berdasarkan harga market.');
  Logger.log('----------------------------------------');
  Logger.log('Pair          : ' + pair.toUpperCase());
  Logger.log('Harga Pasar   : Rp ' + fPrice);
  Logger.log('Buy Trigger   : Rp ' + fBuy + ' (Turun ' + buyPercent + '%)');
  Logger.log('Sell Trigger  : Rp ' + fSell + ' (Naik ' + sellPercent + '% dari harga beli)');
  
  // 🟢 TAMBAHAN LOG BIAR LO TAU BATASANNYA BERUBAH ATAU ENGGAK
  Logger.log('Modal Trade   : Rp ' + modalTrade.toLocaleString('id-ID'));
  Logger.log('Min Qty Rem   : ' + min_Qty);
  
  Logger.log('Cooldown      : ' + cooldownMenit + ' Menit'); 
  Logger.log('Max Daily     : ' + maxDaily + ' kali');
  Logger.log('Status Bot    : ' + currentStatus);
  Logger.log('----------------------------------------');

  return {
    pair: pair,
    currentPrice: result.currentPrice,
    buyTrigger: result.buyTrigger,
    sellTrigger: result.sellTrigger,
    buyDropPercent: result.buyDropPercent,
    sellRisePercent: result.sellRisePercent,
    cooldownMs: cooldownMs,
    maxDailyTrades: maxDaily,
    status: currentStatus,
    skipped: false
  };
}
