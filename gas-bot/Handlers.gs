// ═══════════════════════════════════════════════════════════════════
// MediaHandler.gs — Triggers classification menu on new channel media
// ═══════════════════════════════════════════════════════════════════

function handleChannelPost(msg) {
  var hasMedia = !!(msg.document || msg.photo || msg.video || msg.audio || msg.voice);
  if (!hasMedia) return;

  // Media group deduplication
  if (msg.media_group_id) {
    if (!CacheStore.acquireMgLock(msg.media_group_id)) return;
  }

  var channelId = String(msg.chat.id);

  // Resolve channel config: cache → Sheets
  var cfg = CacheStore.getChConfig(channelId);
  if (!cfg) {
    cfg = Database.findChannel(channelId);
    if (!cfg || !cfg.setup_complete) return;
    CacheStore.putChConfig(channelId, cfg);
  }

  var subjects = Database.findActiveSubjects(channelId, cfg.level, cfg.semester);
  if (!subjects.length) {
    Logger.log('[Media] No subjects for ' + channelId);
    return;
  }

  var session = SessionSvc.create(channelId, msg.message_id, msg.media_group_id || null);

  var menuMsg = TelegramAPI.sendMessage(channelId, S.CL_SELECT_SUBJ, {
    reply_to_message_id: msg.message_id,
    reply_markup: Keyboards.subjects(subjects, session.sessionId),
  });

  if (menuMsg) {
    session.menuMsgId = menuMsg.message_id;
    SessionSvc.save(session);
  }
}


// ═══════════════════════════════════════════════════════════════════
// CallbackHandler.gs — Classification state machine for button clicks
// ═══════════════════════════════════════════════════════════════════

function handleCallbackQuery(cq) {
  if (!cq.data) { TelegramAPI.answerCallbackQuery(cq.id); return; }

  var decoded = Utils.decCb(cq.data);

  if (decoded.kind === 'setup') { handleSetupCallback(cq); return; }

  if (decoded.kind === 'cmd') {
    _handleCmdCallback(cq, decoded);
    return;
  }

  if (decoded.kind !== 'class') { TelegramAPI.answerCallbackQuery(cq.id); return; }

  var action  = decoded.action;
  var sid     = decoded.sid;
  var payload = decoded.payload;

  var session = SessionSvc.get(sid);
  if (!session) {
    TelegramAPI.answerCallbackQuery(cq.id, S.ERR_EXPIRED);
    return;
  }

  var channelId = session.channelId;
  var userId    = String(cq.from.id);
  var chatId    = cq.message ? cq.message.chat.id : channelId;
  var menuId    = session.menuMsgId;

  // Admin check
  if (!AdminSvc.isAdmin(cq.from.id, channelId)) {
    TelegramAPI.answerCallbackQuery(cq.id, S.ERR_NOT_ADMIN);
    return;
  }

  // Cancel
  if (action === 'x') {
    TelegramAPI.answerCallbackQuery(cq.id, S.CL_CANCELLED);
    if (menuId) TelegramAPI.deleteMessage(chatId, menuId);
    SessionSvc.destroy(sid);
    return;
  }

  // Lock
  if (!SessionSvc.tryLock(session, userId)) {
    TelegramAPI.answerCallbackQuery(cq.id, S.ERR_LOCKED);
    return;
  }
  session = SessionSvc.get(sid); // re-read after lock write

  // Resolve channel config for keyboards
  var cfg = CacheStore.getChConfig(channelId) || Database.findChannel(channelId) || {};

  // ── Back ─────────────────────────────────────────────────────────────────
  if (action === 'b') {
    var target = Number(payload);
    if (target === 5) {
      session.layer = 5;
      session.sel   = {};
      var subjects  = Database.findActiveSubjects(channelId, cfg.level, cfg.semester);
      TelegramAPI.editMessageText(chatId, menuId, S.CL_SELECT_SUBJ, {
        reply_markup: Keyboards.subjects(subjects, sid),
      });
    } else {
      session.layer = 6;
      delete session.sel.contentType;
      TelegramAPI.editMessageText(chatId, menuId, S.CL_SELECT_MODE, {
        reply_markup: Keyboards.mode(sid),
      });
    }
    SessionSvc.save(session);
    TelegramAPI.answerCallbackQuery(cq.id);
    return;
  }

  // ── Layer 5: Subject ──────────────────────────────────────────────────────
  if (action === 's') {
    var subject = Database.findSubjectByCode(channelId, payload);
    if (!subject) { TelegramAPI.answerCallbackQuery(cq.id, '⚠️ المادة غير موجودة'); return; }
    session.sel.subject = subject;
    session.layer       = 6;
    SessionSvc.save(session);
    TelegramAPI.editMessageText(chatId, menuId, S.CL_SELECT_MODE, { reply_markup: Keyboards.mode(sid) });
    TelegramAPI.answerCallbackQuery(cq.id);
    return;
  }

  // ── Layer 6: Mode ─────────────────────────────────────────────────────────
  if (action === 'm') {
    session.sel.mode = payload === '0' ? 'Theo' : 'Prac';
    session.layer    = 7;
    var types        = (cfg.content_types && cfg.content_types.length) ? cfg.content_types : CONFIG.DEFAULT_CONTENT_TYPES;
    SessionSvc.save(session);
    TelegramAPI.editMessageText(chatId, menuId, S.CL_SELECT_TYPE, {
      reply_markup: Keyboards.contentType(types, sid),
    });
    TelegramAPI.answerCallbackQuery(cq.id);
    return;
  }

  // ── Layer 7: Content Type — final ─────────────────────────────────────────
  if (action === 't') {
    var types2      = (cfg.content_types && cfg.content_types.length) ? cfg.content_types : CONFIG.DEFAULT_CONTENT_TYPES;
    var contentType = types2[Number(payload)];
    if (!contentType) { TelegramAPI.answerCallbackQuery(cq.id); return; }

    session.sel.contentType = contentType;
    if (!SessionSvc.isComplete(session)) { TelegramAPI.answerCallbackQuery(cq.id); return; }

    var subj    = session.sel.subject;
    var mode    = session.sel.mode;
    var type    = session.sel.contentType;
    var hashtag = ClassificationSvc.buildHashtag(subj.hashtag_token, mode, type);

    var existingCaption = (cq.message && cq.message.reply_to_message)
      ? cq.message.reply_to_message.caption
      : undefined;

    var applyResult = ClassificationSvc.applyHashtag(channelId, session.messageId, existingCaption, hashtag);

    if (menuId) TelegramAPI.deleteMessage(chatId, menuId);

    TelegramAPI.answerCallbackQuery(cq.id, S.CL_DONE(hashtag));

    // Write to Sheets
    Database.appendLog({
      channel_id:        channelId,
      message_id:        session.messageId,
      user_id:           userId,
      action:            'classified',
      selected_subject:  subj.subject_code,
      selected_mode:     mode,
      selected_type:     type,
      hashtag_generated: hashtag,
      status:            applyResult === 'deleted' ? 'error' : applyResult === 'fallback' ? 'fallback' : 'success',
      error_message:     applyResult === 'deleted' ? 'source_deleted' : null,
    });

    Database.upsertHashtagIndex(channelId, session.messageId, {
      hashtag:               hashtag,
      subject_code:          subj.subject_code,
      subject_display:       subj.display_name,
      mode:                  mode,
      content_type:          type,
      classified_by_user_id: userId,
      reclassified:          false,
      previous_hashtag:      null,
    });

    Database.updateChannelField(channelId, 'catalog_dirty', true);
    CacheStore.markDirty(channelId);

    SessionSvc.destroy(sid);
    Logger.log('[Classify] ' + channelId + ' ' + hashtag + ' (' + applyResult + ')');
  }
}

// ── Command keyboard callbacks (level / semester) ─────────────────────────────

function _handleCmdCallback(cq, decoded) {
  var action    = decoded.action;
  var channelId = decoded.channelId;
  var value     = decoded.payload;
  var chatId    = cq.message ? cq.message.chat.id : null;
  var msgId     = cq.message ? cq.message.message_id : null;

  if (!AdminSvc.isAdmin(cq.from.id, channelId)) {
    TelegramAPI.answerCallbackQuery(cq.id, S.ERR_NOT_ADMIN);
    return;
  }

  if (action === 'level') {
    Database.updateChannelField(channelId, 'level', value);
    CacheStore.delChConfig(channelId);
    TelegramAPI.answerCallbackQuery(cq.id, '✅ ' + (S.LEVEL_DISP[value] || value));
    if (chatId && msgId) {
      TelegramAPI.editMessageText(chatId, msgId,
        '✅ تم تحديث المستوى إلى *' + (S.LEVEL_DISP[value] || value) + '*',
        { parse_mode: 'Markdown', reply_markup: {} });
    }
    return;
  }

  if (action === 'sem') {
    Database.updateChannelField(channelId, 'semester', value);
    CacheStore.delChConfig(channelId);
    TelegramAPI.answerCallbackQuery(cq.id, '✅ ' + S.SEM_DISP[value]);
    if (chatId && msgId) {
      TelegramAPI.editMessageText(chatId, msgId,
        '✅ تم تحديث الفصل إلى *' + S.SEM_DISP[value] + '*',
        { parse_mode: 'Markdown', reply_markup: {} });
    }
    return;
  }

  TelegramAPI.answerCallbackQuery(cq.id);
}
