// ═══════════════════════════════════════════════════════════════════
// Router.gs — Dispatches all incoming Telegram updates
// ═══════════════════════════════════════════════════════════════════

function routeUpdate(update) {

  // ── Bot added to a channel as admin ────────────────────────────────────────
  if (update.my_chat_member) {
    var mcm = update.my_chat_member;
    var newM = mcm.new_chat_member;
    if (newM && newM.user && newM.user.is_bot && newM.status === 'administrator') {
      handleNewBotAdmin(String(mcm.chat.id), mcm.chat.title || 'القناة', mcm.from.id);
    }
    return;
  }

  // ── Inline button click ────────────────────────────────────────────────────
  if (update.callback_query) {
    handleCallbackQuery(update.callback_query);
    return;
  }

  // ── New file/media posted to a channel ─────────────────────────────────────
  if (update.channel_post) {
    handleChannelPost(update.channel_post);
    return;
  }

  // ── Regular message (DM or group) ─────────────────────────────────────────
  if (update.message) {
    var msg = update.message;

    // Slash commands
    if (msg.text && msg.text.charAt(0) === '/' && msg.from) {
      var parts   = msg.text.split(/\s+/);
      var rawCmd  = parts[0] || '';
      var command = rawCmd.split('@')[0]; // strip @botusername
      var args    = parts.slice(1);
      handleCommand(msg, command, args);
      return;
    }

    // DM text input during setup wizard
    if (msg.chat && msg.chat.type === 'private' && msg.from) {
      handleSetupDmMessage(msg);
    }
  }
}
