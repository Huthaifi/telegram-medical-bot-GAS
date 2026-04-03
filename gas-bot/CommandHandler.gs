// ═══════════════════════════════════════════════════════════════════
// CommandHandler.gs — All /command handlers
// ═══════════════════════════════════════════════════════════════════

function handleCommand(msg, command, args) {
  var channelId = String(msg.chat.id);
  var isPrivate = msg.chat.type === 'private';
  var replyId   = isPrivate ? msg.chat.id : msg.chat.id;
  var userId    = String(msg.from ? msg.from.id : 0);

  // Gate admin check for channel commands
  if (!isPrivate && msg.from) {
    if (!AdminSvc.isAdmin(msg.from.id, channelId)) return;
  }

  function reply(text, opts) {
    TelegramAPI.sendMessage(replyId, text, Object.assign({ parse_mode: 'Markdown' }, opts || {}));
  }

  switch (command) {

    case '/help':
      reply(S.CMD_HELP);
      break;

    case '/setup':
      if (msg.from) {
        CacheStore.delSetup(userId);
        var chatInfo = TelegramAPI.getChat(channelId);
        var name     = (chatInfo && chatInfo.title) ? chatInfo.title : 'القناة';
        handleNewBotAdmin(channelId, name, msg.from.id);
      }
      break;

    case '/set_level': {
      var ch = Database.findChannel(channelId);
      if (!ch) { reply(S.ERR_NOT_SETUP); break; }
      reply(S.SETUP_LEVEL, { reply_markup: Keyboards.levels_cmd(channelId, CONFIG.LEVELS_BY_DEPT[ch.department]) });
      break;
    }

    case '/set_semester':
      reply(S.SETUP_SEMESTER, { reply_markup: Keyboards.semester_cmd(channelId) });
      break;

    case '/add_subject': {
      if (args.length < 2) {
        reply('⚠️ الصيغة الصحيحة:\n`/add_subject رمز اسم_مختصر رمز_هاشتاق`\nمثال: `/add_subject molbio MolBio MolBio`');
        break;
      }
      var ch2  = Database.findChannel(channelId);
      if (!ch2) { reply(S.ERR_NOT_SETUP); break; }
      var code  = args[0];
      var disp  = args[1];
      var token = args[2] || disp;
      var pos   = Database.maxSubjectPosition(channelId, ch2.level, ch2.semester) + 1;
      var full  = Utils.makeSubjectCode(channelId, ch2.level, ch2.semester, code);
      Database.insertSubject({
        channel_id: channelId, level: ch2.level, semester: ch2.semester,
        subject_code: full, display_name: disp, full_name: disp,
        hashtag_token: token, position: pos,
      });
      reply('✅ تمت الإضافة: *' + disp + '* (#' + token + ')');
      break;
    }

    case '/remove_subject': {
      if (!args[0]) { reply('⚠️ الصيغة: `/remove_subject رمز_المادة`'); break; }
      var ch3 = Database.findChannel(channelId);
      if (!ch3) { reply(S.ERR_NOT_SETUP); break; }
      var full2 = Utils.makeSubjectCode(channelId, ch3.level, ch3.semester, args[0]);
      Database.deactivateSubject(channelId, full2);
      reply('✅ تم إيقاف المادة: ' + args[0]);
      break;
    }

    case '/set_subjects': {
      var ch4 = Database.findChannel(channelId);
      if (!ch4) { reply(S.ERR_NOT_SETUP); break; }
      // Reset setup state to subjects step so admin can re-pick
      var state = {
        channelId: channelId, channelName: ch4.channel_name,
        step: 5, department: ch4.department, batch: ch4.batch,
        level: ch4.level, semester: ch4.semester,
        subjects: [], selectedCodes: [], awaitingText: null, pendingCode: null,
      };
      CacheStore.putSetup(userId, state);
      reply(S.SETUP_SUBJECTS(ch4.level, ch4.semester), {
        reply_markup: Keyboards.subjects_setup(userId, CONFIG.COMMON_SUBJECTS, []),
      });
      break;
    }

    case '/set_content_types': {
      if (!args.length) {
        reply('⚠️ أرسل أنواع المحتوى مفصولة بمسافات:\n`/set_content_types Book Summary Exam HW Slides`');
        break;
      }
      var types = args.slice(0, 15).filter(function (t) { return t; });
      Database.updateChannelField(channelId, 'content_types', types);
      CacheStore.delChConfig(channelId);
      reply('✅ تم تحديث أنواع المحتوى:\n' + types.map(function (t) { return '• ' + t; }).join('\n'));
      break;
    }

    case '/catalog': {
      var ch5 = Database.findChannel(channelId);
      if (!ch5) { reply(S.ERR_NOT_SETUP); break; }
      var chatInfo2 = TelegramAPI.getChat(channelId);
      var name2     = (chatInfo2 && chatInfo2.title) ? chatInfo2.title : 'القناة';
      var newId     = CatalogSvc.regenerate(channelId, name2, ch5.catalog_message_id);
      if (newId) Database.updateChannelField(channelId, 'catalog_message_id', newId);
      reply('✅ تم تحديث الفهرس');
      break;
    }

    case '/stats': {
      var ch6 = Database.findChannel(channelId);
      if (!ch6) { reply(S.ERR_NOT_SETUP); break; }
      var total = Database.countSuccessLogs(channelId);
      reply(
        '📊 *إحصائيات القناة:*\n\n' +
        '📌 إجمالي الملفات المصنّفة: *' + total + '*\n' +
        '📚 المستوى: ' + (S.LEVEL_DISP[ch6.level] || ch6.level) + '\n' +
        '📅 الفصل: ' + S.SEM_DISP[ch6.semester] + '\n' +
        '🏫 القسم: ' + ch6.department + '\n' +
        '👥 الدفعة: ' + ch6.batch
      );
      break;
    }

    case '/export': {
      var ch7  = Database.findChannel(channelId);
      if (!ch7) { reply(S.ERR_NOT_SETUP); break; }
      var rows = Database.exportHashtagIndex(channelId);
      if (!rows.length) { reply('📭 لا يوجد بيانات للتصدير'); break; }
      var C    = CONFIG.COLS.HI;
      var csv  = 'hashtag,message_id,subject,mode,content_type,classified_at,classified_by\n' +
        rows.map(function (r) {
          return [r[C.HASHTAG], r[C.MSG_ID], r[C.DISPLAY], r[C.MODE], r[C.TYPE], r[C.AT], r[C.BY]].join(',');
        }).join('\n');
      var target = isPrivate ? replyId : (msg.from ? msg.from.id : replyId);
      TelegramAPI.sendDocument(target, csv, 'hashtag_export_' + Date.now() + '.csv', '📊 تصدير فهرس الهاشتاق');
      break;
    }

    case '/cancel':
      reply('ℹ️ تنتهي قوائم التصنيف المعلقة تلقائياً خلال 10 دقائق.\nيمكنك الضغط على ✖ إلغاء في أي قائمة نشطة.');
      break;

    default:
      break;
  }
}
