// ═══════════════════════════════════════════════════════════════════
// Keyboards.gs — Inline keyboard builders for all UI states
// ═══════════════════════════════════════════════════════════════════

var Keyboards = (function () {

  function _enc(action, sid, payload) { return Utils.encCb(action, sid, payload); }

  function _grid2(items) {
    var rows = [];
    for (var i = 0; i < items.length; i += 2) {
      var row = [items[i]];
      if (items[i + 1]) row.push(items[i + 1]);
      rows.push(row);
    }
    return rows;
  }

  return {

    // ── Classification ────────────────────────────────────────────────────────

    subjects: function (subjectList, sid) {
      var btns = subjectList.map(function (s) {
        return { text: s.display_name, callback_data: _enc('s', sid, s.subject_code) };
      });
      var rows = _grid2(btns);
      rows.push([{ text: S.CL_CANCEL, callback_data: _enc('x', sid, '') }]);
      return { inline_keyboard: rows };
    },

    mode: function (sid) {
      return {
        inline_keyboard: [
          [
            { text: S.CL_THEO, callback_data: _enc('m', sid, '0') },
            { text: S.CL_PRAC, callback_data: _enc('m', sid, '1') },
          ],
          [
            { text: S.CL_BACK,   callback_data: _enc('b', sid, '5') },
            { text: S.CL_CANCEL, callback_data: _enc('x', sid, '') },
          ],
        ],
      };
    },

    contentType: function (types, sid) {
      var btns = types.map(function (t, i) {
        return { text: t, callback_data: _enc('t', sid, String(i)) };
      });
      var rows = _grid2(btns);
      rows.push([
        { text: S.CL_BACK,   callback_data: _enc('b', sid, '6') },
        { text: S.CL_CANCEL, callback_data: _enc('x', sid, '') },
      ]);
      return { inline_keyboard: rows };
    },

    // ── Setup wizard ──────────────────────────────────────────────────────────

    setupStart: function (uid) {
      return { inline_keyboard: [[{ text: S.SETUP_START_BTN, callback_data: 'su:start:' + uid + ':go' }]] };
    },

    dept: function (uid) {
      return {
        inline_keyboard: [
          [{ text: 'Medical Labs',   callback_data: 'su:dept:' + uid + ':Medical Labs' },
           { text: 'Nutrition',      callback_data: 'su:dept:' + uid + ':Nutrition' }],
          [{ text: 'Dentistry',      callback_data: 'su:dept:' + uid + ':Dentistry' },
           { text: 'Human Medicine', callback_data: 'su:dept:' + uid + ':Human Medicine' }],
        ],
      };
    },

    levels: function (uid, levels) {
      var btns = levels.map(function (l) {
        return { text: S.LEVEL_DISP[l] || l, callback_data: 'su:level:' + uid + ':' + l };
      });
      return { inline_keyboard: _grid2(btns) };
    },

    semester: function (uid) {
      return {
        inline_keyboard: [[
          { text: 'S1 — ' + S.SEM_DISP.S1, callback_data: 'su:sem:' + uid + ':S1' },
          { text: 'S2 — ' + S.SEM_DISP.S2, callback_data: 'su:sem:' + uid + ':S2' },
        ]],
      };
    },

    subjects_setup: function (uid, available, selected) {
      var btns = available.map(function (s) {
        var checked = selected.indexOf(s.code) !== -1;
        return { text: (checked ? '✅ ' : '') + s.display, callback_data: 'su:subj:' + uid + ':' + s.code };
      });
      var rows = _grid2(btns);
      rows.push([{ text: S.SETUP_ADD_CUSTOM, callback_data: 'su:custom:' + uid + ':add' }]);
      rows.push([{ text: S.SETUP_CONFIRM_S,  callback_data: 'su:subjdone:' + uid + ':done' }]);
      return { inline_keyboard: rows };
    },

    setupConfirm: function (uid) {
      return {
        inline_keyboard: [[
          { text: S.SETUP_BTN_SAVE, callback_data: 'su:confirm:' + uid + ':yes' },
          { text: S.SETUP_BTN_EDIT, callback_data: 'su:confirm:' + uid + ':no' },
        ]],
      };
    },

    // ── Admin commands ────────────────────────────────────────────────────────

    levels_cmd: function (channelId, levels) {
      var btns = levels.map(function (l) {
        return { text: S.LEVEL_DISP[l] || l, callback_data: 'cmd:level:' + channelId + ':' + l };
      });
      return { inline_keyboard: _grid2(btns) };
    },

    semester_cmd: function (channelId) {
      return {
        inline_keyboard: [[
          { text: 'S1 — ' + S.SEM_DISP.S1, callback_data: 'cmd:sem:' + channelId + ':S1' },
          { text: 'S2 — ' + S.SEM_DISP.S2, callback_data: 'cmd:sem:' + channelId + ':S2' },
        ]],
      };
    },
  };
})();
