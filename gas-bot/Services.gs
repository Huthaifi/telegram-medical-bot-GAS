// ═══════════════════════════════════════════════════════════════════
// ClassificationSvc.gs — Hashtag builder and caption editor
// ═══════════════════════════════════════════════════════════════════

var ClassificationSvc = (function () {

  return {

    buildHashtag: function (token, mode, type) {
      return '#' + token + '_' + mode + '_' + type;
    },

    applyHashtag: function (channelId, messageId, existingCaption, hashtag) {
      var stripped = (existingCaption || '')
        .replace(new RegExp(CONFIG.HT_REGEX_STR, 'g'), '')
        .trimRight();
      var newCaption = stripped ? stripped + '\n' + hashtag : hashtag;

      var edited = TelegramAPI.editMessageCaption(String(channelId), messageId, newCaption);
      if (edited) return 'edited';

      // Fallback: send as reply
      var reply = TelegramAPI.sendMessage(String(channelId), hashtag, {
        reply_to_message_id: messageId,
        disable_notification: true,
      });
      return reply ? 'fallback' : 'deleted';
    },
  };
})();


// ═══════════════════════════════════════════════════════════════════
// CatalogSvc.gs — Pinned hashtag catalog generator
// ═══════════════════════════════════════════════════════════════════

var CatalogSvc = (function () {

  function _buildText(channelName, groups) {
    if (!groups || groups.length === 0) {
      return S.CAT_HEADER(channelName) + S.CAT_EMPTY + S.CAT_FOOTER;
    }
    var bySubj = {};
    groups.forEach(function (g) {
      if (!bySubj[g.display]) bySubj[g.display] = { Theo: [], Prac: [] };
      bySubj[g.display][g.mode] = g.types.sort();
    });
    var text = S.CAT_HEADER(channelName);
    Object.keys(bySubj).sort().forEach(function (subj) {
      text += '*' + subj + '*\n';
      bySubj[subj].Theo.forEach(function (t) { text += '  ├ #' + subj + '_Theo_' + t + '\n'; });
      bySubj[subj].Prac.forEach(function (t) { text += '  ├ #' + subj + '_Prac_' + t + '\n'; });
      text += '\n';
    });
    return text + S.CAT_FOOTER;
  }

  return {

    regenerate: function (channelId, channelName, existingMsgId) {
      var groups = Database.getCatalogGroups(channelId);
      var text   = _buildText(channelName, groups);

      if (existingMsgId) {
        var edited = TelegramAPI.editMessageText(String(channelId), Number(existingMsgId), text, {
          parse_mode: 'Markdown',
        });
        if (edited) return existingMsgId;
      }

      var msg = TelegramAPI.sendMessage(String(channelId), text, { parse_mode: 'Markdown' });
      if (!msg) return existingMsgId;
      TelegramAPI.pinChatMessage(String(channelId), msg.message_id);
      return String(msg.message_id);
    },

    flushAllDirty: function () {
      var ids = CacheStore.getDirtyChannelIds();
      ids.forEach(function (channelId) {
        try {
          var ch = Database.findChannel(channelId);
          if (!ch || !ch.setup_complete) { CacheStore.clearDirty(channelId); return; }
          var chatInfo    = TelegramAPI.getChat(channelId);
          var channelName = (chatInfo && chatInfo.title) ? chatInfo.title : 'القناة';
          var newMsgId    = CatalogSvc.regenerate(channelId, channelName, ch.catalog_message_id);
          if (newMsgId) {
            Database.updateChannelField(channelId, 'catalog_message_id', newMsgId);
            Database.updateChannelField(channelId, 'catalog_dirty', false);
          }
          CacheStore.clearDirty(channelId);
          CacheStore.delChConfig(channelId);
          Logger.log('[Catalog] Flushed: ' + channelId);
        } catch (e) {
          Logger.log('[Catalog] Error for ' + channelId + ': ' + e.toString());
        }
      });
    },
  };
})();
