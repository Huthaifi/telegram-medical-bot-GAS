// ═══════════════════════════════════════════════════════════════════
// Code.gs — Entry point for Telegram webhook and time-based triggers
//
// INITIAL SETUP (run once from the GAS editor):
//   1. Run initBot()   → creates all Sheets tabs + headers
//   2. Run setWebhook() → registers this script as Telegram webhook
//   3. Run installTriggers() → creates the 5-minute catalog flush trigger
// ═══════════════════════════════════════════════════════════════════

// Called by Telegram for every incoming update
function doPost(e) {
  var update;
  try {
    update = JSON.parse(e.postData.contents);
  } catch (err) {
    return ContentService.createTextOutput('OK');
  }
  try {
    routeUpdate(update);
  } catch (err) {
    Logger.log('[FATAL] ' + err.toString() + '\n' + (err.stack || ''));
  }
  return ContentService.createTextOutput('OK');
}

// Simple health check
function doGet() {
  return ContentService.createTextOutput('Telegram Medical Bot — Running ✓');
}

// ── One-time initialization ────────────────────────────────────────────────────

// Step 1: Run this ONCE after pasting all .gs files
function initBot() {
  Database.initSheets();
  Logger.log('✅ Sheets initialized. Now run setWebhook() then installTriggers().');
}

// Step 2: Run this ONCE after deploying as Web App.
// The webhook URL is the Web App URL you get after deployment.
function setWebhook() {
  var props      = PropertiesService.getScriptProperties();
  var token      = props.getProperty('BOT_TOKEN');
  var webhookUrl = props.getProperty('WEBHOOK_URL');

  if (!token || !webhookUrl) {
    Logger.log('ERROR: Set BOT_TOKEN and WEBHOOK_URL in File → Project Properties → Script properties first.');
    return;
  }

  var res = UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/setWebhook', {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      url: webhookUrl,
      allowed_updates: ['message', 'callback_query', 'channel_post', 'my_chat_member'],
      drop_pending_updates: true,
    }),
    muteHttpExceptions: true,
  });
  Logger.log(res.getContentText());
}

// Step 3: Run this ONCE to install the catalog-flush cron
function installTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'catalogFlushTrigger' ||
        t.getHandlerFunction() === 'cleanupTrigger') {
      ScriptApp.deleteTrigger(t);
    }
  });
  ScriptApp.newTrigger('catalogFlushTrigger').timeBased().everyMinutes(5).create();
  Logger.log('✅ Triggers installed. Catalog will flush every 5 minutes.');
}

// ── Scheduled trigger functions ────────────────────────────────────────────────

// Runs every 5 minutes — flushes dirty catalogs
function catalogFlushTrigger() {
  CatalogSvc.flushAllDirty();
}

// ── Helpers for re-running webhook info check ──────────────────────────────────

function getWebhookInfo() {
  var token = PropertiesService.getScriptProperties().getProperty('BOT_TOKEN');
  var res   = UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/getWebhookInfo', {
    muteHttpExceptions: true,
  });
  Logger.log(res.getContentText());
}

function deleteWebhook() {
  var token = PropertiesService.getScriptProperties().getProperty('BOT_TOKEN');
  var res   = UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/deleteWebhook', {
    muteHttpExceptions: true,
  });
  Logger.log(res.getContentText());
}
