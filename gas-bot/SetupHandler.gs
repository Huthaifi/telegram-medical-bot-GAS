// ═══════════════════════════════════════════════════════════════════
// SetupHandler.gs — Channel auto-setup wizard (DM-based)
// ═══════════════════════════════════════════════════════════════════

function handleNewBotAdmin(channelId, channelName, addedByUserId) {
  var state = {
    channelId: String(channelId),
    channelName: channelName,
    step: 1,
    department: null, batch: null, level: null, semester: null,
    subjects: [],         // [{ code, displayName, hashtagToken, position }]
    awaitingText: null,   // 'batch' | 'subject_code' | 'subject_name'
    pendingCode: null,
    selectedCodes: [],    // codes of common subjects selected
  };
  CacheStore.putSetup(String(addedByUserId), state);

  TelegramAPI.sendMessage(addedByUserId, S.SETUP_WELCOME(channelName), {
    parse_mode: 'Markdown',
    reply_markup: Keyboards.setupStart(String(addedByUserId)),
  });
}

// Called for every DM message during setup when awaitingText is set
function handleSetupDmMessage(msg) {
  var uid   = String(msg.from.id);
  var state = CacheStore.getSetup(uid);
  if (!state || !state.awaitingText) return false;

  var text = (msg.text || '').trim();

  if (state.awaitingText === 'batch') {
    var n = parseInt(text, 10);
    if (isNaN(n) || n < 1 || n > 200) {
      TelegramAPI.sendMessage(msg.chat.id, S.SETUP_BAD_BATCH);
      return true;
    }
    state.batch = n;
    state.awaitingText = null;
    state.step = 3;
    CacheStore.putSetup(uid, state);
    TelegramAPI.sendMessage(msg.chat.id, S.SETUP_LEVEL, {
      parse_mode: 'Markdown',
      reply_markup: Keyboards.levels(uid, CONFIG.LEVELS_BY_DEPT[state.department]),
    });
    return true;
  }

  if (state.awaitingText === 'subject_code') {
    state.pendingCode  = text.replace(/\s+/g, '').slice(0, 20);
    state.awaitingText = 'subject_name';
    CacheStore.putSetup(uid, state);
    TelegramAPI.sendMessage(msg.chat.id, S.SETUP_ASK_NAME);
    return true;
  }

  if (state.awaitingText === 'subject_name') {
    var token   = state.pendingCode || text.toLowerCase().replace(/\s+/g, '_');
    var display = text.trim().slice(0, 30);
    var code    = Utils.makeSubjectCode(state.channelId, state.level, state.semester, token);
    if (state.subjects.filter(function (s) { return s.code === code; }).length === 0) {
      state.subjects.push({ code: code, displayName: display, hashtagToken: display, position: state.subjects.length });
      if (state.selectedCodes.indexOf(code) === -1) state.selectedCodes.push(code);
    }
    state.awaitingText = null;
    state.pendingCode  = null;
    CacheStore.putSetup(uid, state);
    TelegramAPI.sendMessage(msg.chat.id, S.SETUP_SUBJECTS(state.level, state.semester), {
      parse_mode: 'Markdown',
      reply_markup: Keyboards.subjects_setup(uid, CONFIG.COMMON_SUBJECTS, state.selectedCodes),
    });
    return true;
  }

  return false;
}

// Called for all callback_query events with kind === 'setup'
function handleSetupCallback(cq) {
  var data    = cq.data || '';
  var parts   = data.split(':');
  var action  = parts[1] || '';
  var uid     = parts[2] || '';
  var payload = parts.slice(3).join(':');
  var chatId  = cq.message ? cq.message.chat.id : cq.from.id;
  var msgId   = cq.message ? cq.message.message_id : null;

  if (action === 'start') {
    var state = CacheStore.getSetup(uid);
    if (!state) { TelegramAPI.answerCallbackQuery(cq.id, S.SETUP_EXPIRED); return; }
    TelegramAPI.answerCallbackQuery(cq.id);
    TelegramAPI.editMessageText(chatId, msgId, S.SETUP_DEPT, {
      parse_mode: 'Markdown',
      reply_markup: Keyboards.dept(uid),
    });
    return;
  }

  var state = CacheStore.getSetup(uid);
  if (!state) { TelegramAPI.answerCallbackQuery(cq.id, S.SETUP_EXPIRED); return; }

  if (action === 'dept') {
    state.department   = payload;
    state.step         = 2;
    state.awaitingText = 'batch';
    CacheStore.putSetup(uid, state);
    TelegramAPI.answerCallbackQuery(cq.id);
    TelegramAPI.editMessageText(chatId, msgId, S.SETUP_BATCH, {
      parse_mode: 'Markdown',
      reply_markup: null,
    });
    return;
  }

  if (action === 'level') {
    state.level = payload;
    state.step  = 4;
    CacheStore.putSetup(uid, state);
    TelegramAPI.answerCallbackQuery(cq.id);
    TelegramAPI.editMessageText(chatId, msgId, S.SETUP_SEMESTER, {
      parse_mode: 'Markdown',
      reply_markup: Keyboards.semester(uid),
    });
    return;
  }

  if (action === 'sem') {
    state.semester = payload;
    state.step     = 5;
    CacheStore.putSetup(uid, state);
    TelegramAPI.answerCallbackQuery(cq.id);
    TelegramAPI.editMessageText(chatId, msgId, S.SETUP_SUBJECTS(state.level, state.semester), {
      parse_mode: 'Markdown',
      reply_markup: Keyboards.subjects_setup(uid, CONFIG.COMMON_SUBJECTS, state.selectedCodes),
    });
    return;
  }

  if (action === 'subj') {
    // Toggle a common subject
    var code = Utils.makeSubjectCode(state.channelId, state.level, state.semester, payload);
    var idx  = state.selectedCodes.indexOf(code);
    if (idx >= 0) {
      state.selectedCodes.splice(idx, 1);
      state.subjects = state.subjects.filter(function (s) { return s.code !== code; });
    } else {
      var common = null;
      CONFIG.COMMON_SUBJECTS.forEach(function (s) { if (s.code === payload) common = s; });
      if (common) {
        state.subjects.push({ code: code, displayName: common.display, hashtagToken: common.display, position: state.subjects.length });
        state.selectedCodes.push(code);
      }
    }
    // Re-number positions
    state.subjects.forEach(function (s, i) { s.position = i; });
    CacheStore.putSetup(uid, state);
    TelegramAPI.answerCallbackQuery(cq.id);
    TelegramAPI.editMessageReplyMarkup(chatId, msgId,
      Keyboards.subjects_setup(uid, CONFIG.COMMON_SUBJECTS, state.selectedCodes));
    return;
  }

  if (action === 'custom') {
    state.awaitingText = 'subject_code';
    CacheStore.putSetup(uid, state);
    TelegramAPI.answerCallbackQuery(cq.id);
    TelegramAPI.sendMessage(chatId, S.SETUP_ASK_CODE);
    return;
  }

  if (action === 'subjdone') {
    if (state.subjects.length === 0) {
      TelegramAPI.answerCallbackQuery(cq.id, S.SETUP_NO_SUBJ, true);
      return;
    }
    state.step = 6;
    CacheStore.putSetup(uid, state);
    TelegramAPI.answerCallbackQuery(cq.id);
    var summary = S.SETUP_CONFIRM(
      state.department, state.batch, state.level, state.semester,
      state.subjects.map(function (s) { return s.displayName + ' (#' + s.hashtagToken + ')'; })
    );
    TelegramAPI.editMessageText(chatId, msgId, summary, {
      parse_mode: 'Markdown',
      reply_markup: Keyboards.setupConfirm(uid),
    });
    return;
  }

  if (action === 'confirm') {
    if (payload === 'no') {
      state.step = 1;
      CacheStore.putSetup(uid, state);
      TelegramAPI.answerCallbackQuery(cq.id);
      TelegramAPI.editMessageText(chatId, msgId, S.SETUP_DEPT, {
        parse_mode: 'Markdown',
        reply_markup: Keyboards.dept(uid),
      });
      return;
    }

    TelegramAPI.answerCallbackQuery(cq.id, '⏳ جاري الحفظ...');
    var now = Utils.now();

    Database.upsertChannel({
      channel_id:         state.channelId,
      channel_name:       state.channelName,
      department:         state.department,
      batch:              state.batch,
      level:              state.level,
      semester:           state.semester,
      setup_complete:     true,
      added_by_user_id:   uid,
      created_at:         now,
      content_types:      CONFIG.DEFAULT_CONTENT_TYPES.slice(),
      catalog_message_id: null,
      catalog_dirty:      false,
    });

    if (state.subjects.length > 0) {
      Database.insertSubjects(state.subjects.map(function (s) {
        return {
          channel_id:    state.channelId,
          level:         state.level,
          semester:      state.semester,
          subject_code:  s.code,
          display_name:  s.displayName,
          full_name:     s.displayName,
          hashtag_token: s.hashtagToken,
          position:      s.position,
        };
      }));
    }

    CacheStore.delSetup(uid);
    CacheStore.delChConfig(state.channelId);

    TelegramAPI.editMessageText(chatId, msgId, S.SETUP_DONE(state.channelName), {
      parse_mode: 'Markdown',
    });
    Logger.log('[Setup] Complete: ' + state.channelId);
    return;
  }

  TelegramAPI.answerCallbackQuery(cq.id);
}
