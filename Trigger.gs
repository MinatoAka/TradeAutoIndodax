// ==========================================
// Trigger.gs
// Menangani trigger otomatis untuk menjalankan bot utama
// ==========================================

function createBotTriggers() {
  // Default: 30 menit untuk strategi yang lebih aman.
  return createBotTrigger30Minutes();
}

function createBotTrigger15Minutes() {
  return createBotTriggerEveryMinutes(15);
}

function createBotTrigger30Minutes() {
  return createBotTriggerEveryMinutes(30);
}

function createBotTriggerEveryMinutes(intervalMinutes) {
  if (intervalMinutes !== 15 && intervalMinutes !== 30) {
    throw new Error('Interval trigger hanya support 15 atau 30 menit.');
  }

  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    var trigger = triggers[i];
    if (trigger.getHandlerFunction() === 'jalankanBotUtama') {
      ScriptApp.deleteTrigger(trigger);
    }
  }

  ScriptApp.newTrigger('jalankanBotUtama')
    .timeBased()
    .everyMinutes(intervalMinutes)
    .create();

  Logger.log('✅ Trigger bot dibuat setiap ' + intervalMinutes + ' menit.');
  return true;
}

function deleteBotTriggers() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    var trigger = triggers[i];
    if (trigger.getHandlerFunction() === 'jalankanBotUtama') {
      ScriptApp.deleteTrigger(trigger);
    }
  }

  Logger.log('🧹 Semua trigger bot utama dihapus.');
}
