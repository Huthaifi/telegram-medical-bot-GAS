// ═══════════════════════════════════════════════════════════════════
// TelegramAPI.gs — Telegram Bot API wrapper with retry + rate-limit
// ═══════════════════════════════════════════════════════════════════

var TelegramAPI = (function () {

  function _token() {
    return PropertiesService.getScriptProperties().getProperty('BOT_TOKEN') || '';
  }

  function _call(method, payload) {
    var url = 'https://api.telegram.org/bot' + _token() + '/' + method;
    for (var attempt = 0; attempt < CONFIG.MAX_RETRIES; attempt++) {
      try {
        var res = UrlFetchApp.fetch(url, {
          method: 'post',
          contentType: 'application/json',
          payload: JSON.stringify(payload),
          muteHttpExceptions: true,
        });
        var data = JSON.parse(res.getContentText());
        if (data.ok) return data.result !== undefined ? data.result : true;
        if (data.error_code === 429) {
          var wait = ((data.parameters && data.parameters.retry_after) ? data.parameters.retry_after : 5) * 1000;
          Utilities.sleep(wait + Math.floor(Math.random() * 1000));
          continue;
        }
        if (data.error_code === 400) {
          Logger.log('[TG 400] ' + method + ': ' + data.description);
          return null;
        }
        Logger.log('[TG ERR] ' + method + ' ' + data.error_code + ': ' + data.description);
        return null;
      } catch (e) {
        if (attempt === CONFIG.MAX_RETRIES - 1) { Logger.log('[TG FETCH] ' + e.toString()); return null; }
        Utilities.sleep(1000 * Math.pow(2, attempt));
      }
    }
    return null;
  }

  return {

    sendMessage: function (chatId, text, opts) {
      return _call('sendMessage', Object.assign({ chat_id: chatId, text: text, disable_notification: true }, opts || {}));
    },

    editMessageText: function (chatId, messageId, text, opts) {
      var p = Object.assign({ chat_id: chatId, message_id: messageId, text: text }, opts || {});
      return _call('editMessageText', p);
    },

    editMessageCaption: function (chatId, messageId, caption) {
      return _call('editMessageCaption', { chat_id: chatId, message_id: messageId, caption: caption });
    },

    editMessageReplyMarkup: function (chatId, messageId, markup) {
      return _call('editMessageReplyMarkup', { chat_id: chatId, message_id: messageId, reply_markup: markup || {} });
    },

    deleteMessage: function (chatId, messageId) {
      return _call('deleteMessage', { chat_id: chatId, message_id: messageId });
    },

    answerCallbackQuery: function (queryId, text, showAlert) {
      return _call('answerCallbackQuery', { callback_query_id: queryId, text: text || '', show_alert: !!showAlert });
    },

    getChatMember: function (chatId, userId) {
      return _call('getChatMember', { chat_id: chatId, user_id: userId });
    },

    getChat: function (chatId) {
      return _call('getChat', { chat_id: chatId });
    },

    pinChatMessage: function (chatId, messageId) {
      return _call('pinChatMessage', { chat_id: chatId, message_id: messageId, disable_notification: true });
    },

    sendDocument: function (chatId, csvText, filename, caption) {
      var boundary = 'GAS_BOUNDARY_' + Date.now();
      var body = '--' + boundary + '\r\n' +
        'Content-Disposition: form-data; name="chat_id"\r\n\r\n' + chatId + '\r\n' +
        '--' + boundary + '\r\n' +
        'Content-Disposition: form-data; name="disable_notification"\r\n\r\ntrue\r\n' +
        (caption ? '--' + boundary + '\r\nContent-Disposition: form-data; name="caption"\r\n\r\n' + caption + '\r\n' : '') +
        '--' + boundary + '\r\n' +
        'Content-Disposition: form-data; name="document"; filename="' + filename + '"\r\n' +
        'Content-Type: text/csv\r\n\r\n' + csvText + '\r\n' +
        '--' + boundary + '--';
      try {
        var res = UrlFetchApp.fetch('https://api.telegram.org/bot' + _token() + '/sendDocument', {
          method: 'post',
          contentType: 'multipart/form-data; boundary=' + boundary,
          payload: body,
          muteHttpExceptions: true,
        });
        var data = JSON.parse(res.getContentText());
        return data.ok ? data.result : null;
      } catch (e) { return null; }
    },
  };
})();
