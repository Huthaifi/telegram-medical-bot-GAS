// ═══════════════════════════════════════════════════════════════════
// Database.gs — Google Sheets data layer
// Reads are batched (one getValues() per sheet per execution).
// Writes use appendRow or targeted setValues for speed.
// ═══════════════════════════════════════════════════════════════════

var Database = (function () {

  var _ss = null;
  var _dataCache = {}; // in-memory within a single execution

  function _getSpreadsheet() {
    if (!_ss) {
      var id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      _ss = SpreadsheetApp.openById(id);
    }
    return _ss;
  }

  function _getSheet(name) {
    return _getSpreadsheet().getSheetByName(name);
  }

  function _getData(sheetName) {
    if (_dataCache[sheetName]) return _dataCache[sheetName];
    var sheet = _getSheet(sheetName);
    if (!sheet || sheet.getLastRow() < 2) { _dataCache[sheetName] = []; return []; }
    var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
    _dataCache[sheetName] = data;
    return data;
  }

  function _invalidate(sheetName) {
    delete _dataCache[sheetName];
  }

  // ── Row converters ──────────────────────────────────────────────────────────

  function _rowToChannel(row) {
    var C = CONFIG.COLS.CH;
    var ct;
    try { ct = JSON.parse(String(row[C.CTYPES])); } catch (e) { ct = CONFIG.DEFAULT_CONTENT_TYPES.slice(); }
    return {
      channel_id:         String(row[C.ID]),
      channel_name:       String(row[C.NAME]),
      department:         String(row[C.DEPT]),
      batch:              Number(row[C.BATCH]),
      level:              String(row[C.LEVEL]),
      semester:           String(row[C.SEM]),
      setup_complete:     String(row[C.SETUP]) === 'TRUE',
      added_by_user_id:   String(row[C.ADDED_BY]),
      created_at:         row[C.CREATED],
      content_types:      ct,
      catalog_message_id: row[C.CAT_MSG] ? String(row[C.CAT_MSG]) : null,
      catalog_dirty:      String(row[C.DIRTY]) === 'TRUE',
    };
  }

  function _rowToSubject(row) {
    var C = CONFIG.COLS.SU;
    return {
      channel_id:    String(row[C.CHAN_ID]),
      level:         String(row[C.LEVEL]),
      semester:      String(row[C.SEM]),
      subject_code:  String(row[C.CODE]),
      display_name:  String(row[C.DISPLAY]),
      full_name:     String(row[C.FULL]),
      hashtag_token: String(row[C.TOKEN]),
      position:      Number(row[C.POS]),
      active:        String(row[C.ACTIVE]) === 'TRUE',
    };
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  return {

    initSheets: function () {
      var ss = _getSpreadsheet();
      var defs = [
        {
          name: CONFIG.SHEETS.CHANNELS,
          h: ['channel_id','channel_name','department','batch','level','semester',
              'setup_complete','added_by_user_id','created_at','updated_at',
              'content_types_json','catalog_message_id','catalog_dirty'],
        },
        {
          name: CONFIG.SHEETS.SUBJECTS,
          h: ['channel_id','level','semester','subject_code','display_name',
              'full_name','hashtag_token','position','active','created_at'],
        },
        {
          name: CONFIG.SHEETS.OPS_LOG,
          h: ['timestamp','channel_id','message_id','user_id','action',
              'selected_subject','selected_mode','selected_type',
              'hashtag_generated','status','error_message','hashtag_version'],
        },
        {
          name: CONFIG.SHEETS.HT_INDEX,
          h: ['channel_id','hashtag','message_id','subject_code','subject_display',
              'mode','content_type','classified_at','classified_by_user_id',
              'reclassified','previous_hashtag'],
        },
      ];
      defs.forEach(function (d) {
        var s = ss.getSheetByName(d.name);
        if (!s) {
          s = ss.insertSheet(d.name);
          var r = s.getRange(1, 1, 1, d.h.length);
          r.setValues([d.h]);
          r.setFontWeight('bold');
          r.setBackground('#4a90d9');
          r.setFontColor('#ffffff');
        }
      });
      Logger.log('Sheets initialized');
    },

    // ── Channels ──────────────────────────────────────────────────────────────

    findChannel: function (channelId) {
      var C = CONFIG.COLS.CH;
      var data = _getData(CONFIG.SHEETS.CHANNELS);
      for (var i = 0; i < data.length; i++) {
        if (String(data[i][C.ID]) === String(channelId)) return _rowToChannel(data[i]);
      }
      return null;
    },

    upsertChannel: function (ch) {
      var sheet = _getSheet(CONFIG.SHEETS.CHANNELS);
      var data  = _getData(CONFIG.SHEETS.CHANNELS);
      var C     = CONFIG.COLS.CH;
      var now   = new Date().toISOString();
      var row   = [
        ch.channel_id, ch.channel_name, ch.department, ch.batch,
        ch.level, ch.semester, ch.setup_complete ? 'TRUE' : 'FALSE',
        ch.added_by_user_id, ch.created_at || now, now,
        JSON.stringify(ch.content_types || CONFIG.DEFAULT_CONTENT_TYPES),
        ch.catalog_message_id || '', ch.catalog_dirty ? 'TRUE' : 'FALSE',
      ];
      var rowIdx = -1;
      for (var i = 0; i < data.length; i++) {
        if (String(data[i][C.ID]) === String(ch.channel_id)) { rowIdx = i + 2; break; }
      }
      if (rowIdx > 0) sheet.getRange(rowIdx, 1, 1, row.length).setValues([row]);
      else            sheet.appendRow(row);
      _invalidate(CONFIG.SHEETS.CHANNELS);
    },

    updateChannelField: function (channelId, field, value) {
      var sheet = _getSheet(CONFIG.SHEETS.CHANNELS);
      var data  = _getData(CONFIG.SHEETS.CHANNELS);
      var C     = CONFIG.COLS.CH;
      var MAP   = { level: C.LEVEL+1, semester: C.SEM+1, catalog_message_id: C.CAT_MSG+1,
                    catalog_dirty: C.DIRTY+1, content_types: C.CTYPES+1, updated_at: C.UPDATED+1 };
      var col   = MAP[field];
      if (!col) return;
      for (var i = 0; i < data.length; i++) {
        if (String(data[i][C.ID]) === String(channelId)) {
          var v = (typeof value === 'boolean') ? (value ? 'TRUE' : 'FALSE')
                : (field === 'content_types' ? JSON.stringify(value) : value);
          sheet.getRange(i + 2, col).setValue(v);
          sheet.getRange(i + 2, C.UPDATED + 1).setValue(new Date().toISOString());
          _invalidate(CONFIG.SHEETS.CHANNELS);
          return;
        }
      }
    },

    findDirtyChannels: function () {
      var C    = CONFIG.COLS.CH;
      var data = _getData(CONFIG.SHEETS.CHANNELS);
      return data.filter(function (r) {
        return String(r[C.DIRTY]) === 'TRUE' && String(r[C.SETUP]) === 'TRUE';
      }).map(_rowToChannel);
    },

    // ── Subjects ──────────────────────────────────────────────────────────────

    findActiveSubjects: function (channelId, level, semester) {
      var C    = CONFIG.COLS.SU;
      var data = _getData(CONFIG.SHEETS.SUBJECTS);
      return data
        .filter(function (r) {
          return String(r[C.CHAN_ID]) === String(channelId) &&
                 String(r[C.LEVEL])   === String(level) &&
                 String(r[C.SEM])     === String(semester) &&
                 String(r[C.ACTIVE])  === 'TRUE';
        })
        .sort(function (a, b) { return Number(a[C.POS]) - Number(b[C.POS]); })
        .map(_rowToSubject);
    },

    findSubjectByCode: function (channelId, code) {
      var C    = CONFIG.COLS.SU;
      var data = _getData(CONFIG.SHEETS.SUBJECTS);
      for (var i = 0; i < data.length; i++) {
        if (String(data[i][C.CHAN_ID]) === String(channelId) && data[i][C.CODE] === code)
          return _rowToSubject(data[i]);
      }
      return null;
    },

    insertSubjects: function (subjects) {
      var sheet = _getSheet(CONFIG.SHEETS.SUBJECTS);
      var now   = new Date().toISOString();
      subjects.forEach(function (s) {
        sheet.appendRow([s.channel_id, s.level, s.semester, s.subject_code,
                         s.display_name, s.full_name, s.hashtag_token, s.position, 'TRUE', now]);
      });
      _invalidate(CONFIG.SHEETS.SUBJECTS);
    },

    insertSubject: function (s) {
      _getSheet(CONFIG.SHEETS.SUBJECTS).appendRow([
        s.channel_id, s.level, s.semester, s.subject_code,
        s.display_name, s.full_name, s.hashtag_token, s.position, 'TRUE', new Date().toISOString(),
      ]);
      _invalidate(CONFIG.SHEETS.SUBJECTS);
    },

    deactivateSubject: function (channelId, code) {
      var sheet = _getSheet(CONFIG.SHEETS.SUBJECTS);
      var data  = _getData(CONFIG.SHEETS.SUBJECTS);
      var C     = CONFIG.COLS.SU;
      for (var i = 0; i < data.length; i++) {
        if (String(data[i][C.CHAN_ID]) === String(channelId) && data[i][C.CODE] === code) {
          sheet.getRange(i + 2, C.ACTIVE + 1).setValue('FALSE');
          _invalidate(CONFIG.SHEETS.SUBJECTS);
          return;
        }
      }
    },

    maxSubjectPosition: function (channelId, level, semester) {
      var C    = CONFIG.COLS.SU;
      var data = _getData(CONFIG.SHEETS.SUBJECTS);
      var max  = -1;
      data.forEach(function (r) {
        if (String(r[C.CHAN_ID]) === String(channelId) &&
            String(r[C.LEVEL]) === String(level) &&
            String(r[C.SEM]) === String(semester) &&
            String(r[C.ACTIVE]) === 'TRUE') {
          if (Number(r[C.POS]) > max) max = Number(r[C.POS]);
        }
      });
      return max;
    },

    // ── Operations Log ────────────────────────────────────────────────────────

    appendLog: function (entry) {
      _getSheet(CONFIG.SHEETS.OPS_LOG).appendRow([
        new Date().toISOString(),
        entry.channel_id, entry.message_id, entry.user_id, entry.action,
        entry.selected_subject || '', entry.selected_mode || '', entry.selected_type || '',
        entry.hashtag_generated || '', entry.status, entry.error_message || '', CONFIG.HT_VERSION,
      ]);
    },

    countSuccessLogs: function (channelId) {
      var C    = CONFIG.COLS.OL;
      var data = _getData(CONFIG.SHEETS.OPS_LOG);
      return data.filter(function (r) {
        return String(r[C.CHAN_ID]) === String(channelId) && r[C.STATUS] === 'success';
      }).length;
    },

    // ── Hashtag Index ─────────────────────────────────────────────────────────

    upsertHashtagIndex: function (channelId, messageId, entry) {
      var sheet = _getSheet(CONFIG.SHEETS.HT_INDEX);
      var data  = _getData(CONFIG.SHEETS.HT_INDEX);
      var C     = CONFIG.COLS.HI;
      var now   = new Date().toISOString();
      var row   = [channelId, entry.hashtag, messageId, entry.subject_code,
                   entry.subject_display, entry.mode, entry.content_type, now,
                   entry.classified_by_user_id, entry.reclassified ? 'TRUE' : 'FALSE',
                   entry.previous_hashtag || ''];
      var rowIdx = -1;
      for (var i = 0; i < data.length; i++) {
        if (String(data[i][C.CHAN_ID]) === String(channelId) &&
            String(data[i][C.MSG_ID]) === String(messageId)) { rowIdx = i + 2; break; }
      }
      if (rowIdx > 0) sheet.getRange(rowIdx, 1, 1, row.length).setValues([row]);
      else            sheet.appendRow(row);
      _invalidate(CONFIG.SHEETS.HT_INDEX);
    },

    exportHashtagIndex: function (channelId) {
      var C    = CONFIG.COLS.HI;
      var data = _getData(CONFIG.SHEETS.HT_INDEX);
      return data.filter(function (r) { return String(r[C.CHAN_ID]) === String(channelId); });
    },

    getCatalogGroups: function (channelId) {
      var C       = CONFIG.COLS.HI;
      var data    = _getData(CONFIG.SHEETS.HT_INDEX);
      var grouped = {};
      data.filter(function (r) { return String(r[C.CHAN_ID]) === String(channelId); })
          .forEach(function (r) {
            var key = r[C.DISPLAY] + '|' + r[C.MODE];
            if (!grouped[key]) grouped[key] = { display: r[C.DISPLAY], mode: r[C.MODE], types: [] };
            if (grouped[key].types.indexOf(r[C.TYPE]) === -1) grouped[key].types.push(r[C.TYPE]);
          });
      return Object.keys(grouped).sort().map(function (k) { return grouped[k]; });
    },
  };
})();
