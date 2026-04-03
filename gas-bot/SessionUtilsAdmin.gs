// ═══════════════════════════════════════════════════════════════════
// Session.gs — Session lifecycle management
// ═══════════════════════════════════════════════════════════════════

var SessionSvc = (function () {
  return {

    create: function (channelId, messageId, mgId) {
      var s = {
        sessionId:  Utils.genSid(channelId + ':' + messageId + ':' + Date.now()),
        channelId:  String(channelId),
        messageId:  messageId,
        mgId:       mgId || null,
        startedAt:  Date.now(),
        layer:      5,
        lockedBy:   null,
        lockedAt:   null,
        sel:        {},   // { subject, mode, contentType }
        menuMsgId:  null,
      };
      CacheStore.putSession(s);
      return s;
    },

    get:     function (id)  { return CacheStore.getSession(id); },
    save:    function (s)   { CacheStore.putSession(s); },
    destroy: function (id)  { CacheStore.delSession(id); },

    tryLock: function (s, userId) {
      if (s.lockedBy && s.lockedBy !== userId) {
        if (Date.now() - (s.lockedAt || 0) < CONFIG.LOCK_TIMEOUT_MS) return false;
      }
      s.lockedBy = userId;
      s.lockedAt = Date.now();
      CacheStore.putSession(s);
      return true;
    },

    isComplete: function (s) {
      return !!(s.sel.subject && s.sel.mode && s.sel.contentType);
    },
  };
})();


// ═══════════════════════════════════════════════════════════════════
// Utils.gs — ID generator, callback encoder/decoder, subject codes
// ═══════════════════════════════════════════════════════════════════

var Utils = (function () {

  function _hash(str) {
    var h = 0;
    for (var i = 0; i < str.length; i++) {
      h = Math.imul(31, h) + str.charCodeAt(i) | 0;
    }
    return h;
  }

  return {

    genSid: function (seed) {
      var base = (Math.abs(_hash(seed)) >>> 0).toString(36);
      var ts   = (Date.now() % 46656).toString(36).padStart(3, '0');
      return (base + ts).slice(-6).padStart(6, '0');
    },

    encCb: function (action, sid, payload) {
      var prefix = 'v:' + action + ':' + sid + ':';
      return prefix + String(payload || '').slice(0, 64 - prefix.length);
    },

    decCb: function (data) {
      if (!data) return { kind: 'unknown', action: '', sid: '', payload: '' };
      if (data.indexOf('v:') === 0) {
        var p = data.split(':');
        return { kind: 'class', action: p[1] || '', sid: p[2] || '', payload: p.slice(3).join(':') };
      }
      if (data.indexOf('su:') === 0) {
        var p = data.split(':');
        return { kind: 'setup', action: p[1] || '', uid: p[2] || '', payload: p.slice(3).join(':') };
      }
      if (data.indexOf('cmd:') === 0) {
        var p = data.split(':');
        return { kind: 'cmd', action: p[1] || '', channelId: p[2] || '', payload: p.slice(3).join(':') };
      }
      return { kind: 'unknown', action: '', sid: '', payload: data };
    },

    makeSubjectCode: function (channelId, level, semester, token) {
      var h = (Math.abs(_hash(String(channelId))) % 1296).toString(36).padStart(2, '0');
      return token.toLowerCase().replace(/\s+/g, '_') + '_' + level + '_' + semester.toLowerCase() + '_' + h;
    },

    now: function () { return new Date().toISOString(); },
  };
})();


// ═══════════════════════════════════════════════════════════════════
// AdminSvc.gs — Admin verification with 5-min cache
// ═══════════════════════════════════════════════════════════════════

var AdminSvc = (function () {
  return {

    isAdmin: function (userId, channelId) {
      var cached = CacheStore.getAdmin(String(userId), String(channelId));
      if (cached !== null) return cached;
      var member = TelegramAPI.getChatMember(String(channelId), userId);
      var result = !!(member && (member.status === 'creator' || member.status === 'administrator'));
      CacheStore.putAdmin(String(userId), String(channelId), result);
      return result;
    },
  };
})();
