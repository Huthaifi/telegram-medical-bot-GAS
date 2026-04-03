// ═══════════════════════════════════════════════════════════════════
// CacheStore.gs — CacheService wrapper (sessions, locks, admin cache)
// CacheService is ephemeral (max 6h TTL, max 100KB/key).
// PropertiesService is persistent (small config values).
// ═══════════════════════════════════════════════════════════════════

var CacheStore = (function () {

  var _cache = CacheService.getScriptCache();
  var _props = PropertiesService.getScriptProperties();

  function _get(key) {
    var v = _cache.get(key);
    return v ? JSON.parse(v) : null;
  }

  function _put(key, value, ttl) {
    _cache.put(key, JSON.stringify(value), ttl);
  }

  function _del(key) {
    _cache.remove(key);
  }

  return {

    // ── Sessions ────────────────────────────────────────────────────────────
    getSession:  function (id)       { return _get('s:' + id); },
    putSession:  function (s)        { _put('s:' + s.sessionId, s, CONFIG.TTL.SESSION); },
    delSession:  function (id)       { _del('s:' + id); },

    // ── Channel config cache (fallback before hitting Sheets) ────────────────
    getChConfig:  function (chId)     { return _get('ch:' + chId); },
    putChConfig:  function (chId, v)  { _put('ch:' + chId, v, CONFIG.TTL.CH_CONFIG); },
    delChConfig:  function (chId)     { _del('ch:' + chId); },

    // ── Admin status cache ───────────────────────────────────────────────────
    getAdmin: function (userId, chId) {
      var v = _cache.get('adm:' + userId + ':' + chId);
      return v === null ? null : (v === '1');
    },
    putAdmin: function (userId, chId, isAdmin) {
      _cache.put('adm:' + userId + ':' + chId, isAdmin ? '1' : '0', CONFIG.TTL.ADMIN);
    },

    // ── Media group deduplication (5s lock) ─────────────────────────────────
    acquireMgLock: function (mgId) {
      var key = 'mg:' + mgId;
      if (_cache.get(key)) return false;
      _cache.put(key, '1', CONFIG.TTL.MG_LOCK);
      return true;
    },

    // ── Setup wizard state ───────────────────────────────────────────────────
    getSetup:  function (uid)    { return _get('su:' + uid); },
    putSetup:  function (uid, v) { _put('su:' + uid, v, CONFIG.TTL.SETUP); },
    delSetup:  function (uid)    { _del('su:' + uid); },

    // ── Catalog dirty flag (persistent — survives restarts) ──────────────────
    markDirty:  function (chId) { _props.setProperty('dirty:' + chId, '1'); },
    clearDirty: function (chId) { _props.deleteProperty('dirty:' + chId); },
    getDirtyChannelIds: function () {
      var all  = _props.getProperties();
      var ids  = [];
      Object.keys(all).forEach(function (k) {
        if (k.indexOf('dirty:') === 0 && all[k] === '1') ids.push(k.slice(6));
      });
      return ids;
    },

    // ── PropertiesService convenience ────────────────────────────────────────
    getProp:    function (key)       { return _props.getProperty(key); },
    setProp:    function (key, val)  { _props.setProperty(key, val); },
    deleteProp: function (key)       { _props.deleteProperty(key); },
  };
})();
