// ==========================================
// Trigger.gs
// Menangani trigger otomatis untuk menjalankan bot utama
// ==========================================
function createBotTrigger4Hours() {
  return createBotTriggerEveryHours(4);
}

function createBotTrigger2Hours() {
  return createBotTriggerEveryHours(2);
}

function createBotTrigger1Hour() {
  return createBotTriggerEveryHours(1);
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

  deleteBotTriggers();

  ScriptApp.newTrigger('jalankanBotUtama')
    .timeBased()
    .everyMinutes(intervalMinutes)
    .create();

  Logger.log('✅ Trigger bot dibuat setiap ' + intervalMinutes + ' menit.');
  return true;
}

function createBotTriggerEveryHours(intervalHours) {

  deleteBotTriggers();

  ScriptApp.newTrigger('jalankanBotUtama')
    .timeBased()
    .everyHours(intervalHours)
    .create();

  Logger.log('✅ Trigger bot dibuat setiap ' + intervalHours + ' menit.');
  return true;
}

function deleteBotTriggers() {
  var triggers = ScriptApp.getProjectTriggers();
  var deleted = 0;

  for (var i = 0; i < triggers.length; i++) {
    var trigger = triggers[i];
    if (trigger.getHandlerFunction() === 'jalankanBotUtama') {
      ScriptApp.deleteTrigger(trigger);
      deleted++;
    }
  }

  if (deleted > 0) {
    Logger.log('🧹 ' + deleted + ' trigger bot utama dihapus.');
  }
}
