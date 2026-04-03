// ═══════════════════════════════════════════════════════════════════
// Config.gs — Central configuration and Arabic UI strings
// All customizable values live here. Nothing is hardcoded elsewhere.
// ═══════════════════════════════════════════════════════════════════

var CONFIG = {

  DEPARTMENTS: ['Medical Labs', 'Nutrition', 'Dentistry', 'Human Medicine'],

  LEVELS_BY_DEPT: {
    'Medical Labs':   ['1', '2', '3', '4', 'Internship'],
    'Nutrition':      ['1', '2', '3', '4', 'Internship'],
    'Dentistry':      ['1', '2', '3', '4', 'Internship'],
    'Human Medicine': ['1', '2', '3', '4', '5', '6', 'Internship'],
  },

  DEFAULT_CONTENT_TYPES: ['Book', 'Summary', 'Sheet', 'Exam', 'Report', 'HW', 'Slides', 'Other'],

  COMMON_SUBJECTS: [
    { code: 'biochem',   display: 'Biochem',   full: 'Biochemistry' },
    { code: 'anatomy',   display: 'Anatomy',   full: 'Anatomy' },
    { code: 'histo',     display: 'Histo',     full: 'Histology' },
    { code: 'physio',    display: 'Physio',    full: 'Physiology' },
    { code: 'micro',     display: 'Micro',     full: 'Microbiology' },
    { code: 'path',      display: 'Path',      full: 'Pathology' },
    { code: 'pharma',    display: 'Pharma',    full: 'Pharmacology' },
    { code: 'parasit',   display: 'Parasit',   full: 'Parasitology' },
    { code: 'immuno',    display: 'Immuno',    full: 'Immunology' },
    { code: 'genetics',  display: 'Genetics',  full: 'Genetics' },
    { code: 'embryo',    display: 'Embryo',    full: 'Embryology' },
    { code: 'neuro',     display: 'Neuro',     full: 'Neuroscience' },
    { code: 'surgery',   display: 'Surgery',   full: 'Surgery' },
    { code: 'internal',  display: 'Internal',  full: 'Internal Medicine' },
    { code: 'community', display: 'Community', full: 'Community Medicine' },
    { code: 'forensic',  display: 'Forensic',  full: 'Forensic Medicine' },
  ],

  SHEETS: {
    CHANNELS:  'Channels',
    SUBJECTS:  'Subjects',
    OPS_LOG:   'Operations_Log',
    HT_INDEX:  'Hashtag_Index',
  },

  // Column indices — 0-based. Update here if you add columns.
  COLS: {
    CH: { ID:0, NAME:1, DEPT:2, BATCH:3, LEVEL:4, SEM:5, SETUP:6,
          ADDED_BY:7, CREATED:8, UPDATED:9, CTYPES:10, CAT_MSG:11, DIRTY:12 },
    SU: { CHAN_ID:0, LEVEL:1, SEM:2, CODE:3, DISPLAY:4, FULL:5,
          TOKEN:6, POS:7, ACTIVE:8, CREATED:9 },
    OL: { TS:0, CHAN_ID:1, MSG_ID:2, USER_ID:3, ACTION:4, SUBJECT:5,
          MODE:6, TYPE:7, HASHTAG:8, STATUS:9, ERROR:10, VER:11 },
    HI: { CHAN_ID:0, HASHTAG:1, MSG_ID:2, CODE:3, DISPLAY:4, MODE:5,
          TYPE:6, AT:7, BY:8, RECLASSIFIED:9, PREV:10 },
  },

  // CacheService TTLs in seconds
  TTL: {
    SESSION:   600,
    CH_CONFIG: 300,
    ADMIN:     300,
    MG_LOCK:   5,
    SETUP:     1800,
  },

  LOCK_TIMEOUT_MS: 180000,
  MAX_RETRIES:     3,
  HT_VERSION:      'v2',
  HT_REGEX_STR:    '#[A-Za-z]+_(?:Theo|Prac)_[A-Za-z]+',
};

// ── Arabic UI strings ─────────────────────────────────────────────────────────

var S = {
  SETUP_WELCOME:    function(n) { return 'مرحباً! 👋 تمت إضافتي إلى *' + n + '*.\nدعنا نضبط إعداداتي الآن حتى أبدأ العمل فوراً.'; },
  SETUP_START_BTN:  '⚙️ إعداد القناة الآن',
  SETUP_DEPT:       '🏫 *الخطوة 1/5* — اختر القسم:',
  SETUP_BATCH:      '📋 *الخطوة 2/5* — أرسل رقم الدفعة (مثال: 5):',
  SETUP_LEVEL:      '📚 *الخطوة 3/5* — اختر المستوى الدراسي الحالي:',
  SETUP_SEMESTER:   '📅 *الخطوة 4/5* — اختر الفصل الدراسي الحالي:',
  SETUP_SUBJECTS:   function(l, s) { return '📖 *الخطوة 5/5* — المستوى ' + l + ' / ' + s + '\nاضغط على المواد لتحديدها (✅ = محدد):'; },
  SETUP_ADD_CUSTOM: '➕ إضافة مادة مخصصة',
  SETUP_CONFIRM_S:  '✅ تأكيد المواد المحددة',
  SETUP_ASK_CODE:   '✏️ أرسل رمز المادة بالإنجليزية (مثال: Biochem):',
  SETUP_ASK_NAME:   '✏️ أرسل الاسم الكامل للمادة (مثال: Biochemistry):',
  SETUP_CONFIRM:    function(dept, batch, level, sem, subjects) {
    return '✅ *ملخص الإعداد:*\n\n🏫 القسم: ' + dept + '\n👥 الدفعة: ' + batch +
           '\n📚 المستوى: ' + level + '\n📅 الفصل: ' + sem +
           '\n\n📖 *المواد:*\n' + subjects.map(function(s) { return '• ' + s; }).join('\n') +
           '\n\nهل هذه الإعدادات صحيحة؟';
  },
  SETUP_BTN_SAVE:   '✅ حفظ والبدء',
  SETUP_BTN_EDIT:   '✏️ تعديل',
  SETUP_DONE:       function(n) { return '✅ تم الإعداد! البوت جاهز للعمل في *' + n + '*'; },
  SETUP_BAD_BATCH:  '⚠️ أرسل رقماً صحيحاً (مثال: 5)',
  SETUP_NO_SUBJ:    '⚠️ اختر مادة واحدة على الأقل قبل التأكيد',
  SETUP_EXPIRED:    '⌛ انتهت صلاحية جلسة الإعداد. اكتب /setup لإعادة البدء',

  CL_SELECT_SUBJ:   '📚 اختر المادة:',
  CL_SELECT_MODE:   '🔬 اختر نوع الدراسة:',
  CL_SELECT_TYPE:   '📄 اختر نوع المحتوى:',
  CL_BACK:          '← رجوع',
  CL_CANCEL:        '✖ إلغاء',
  CL_THEO:          'نظري — Theo',
  CL_PRAC:          'عملي — Prac',
  CL_DONE:          function(h) { return '✅ ' + h; },
  CL_CANCELLED:     '❌ تم إلغاء التصنيف',

  ERR_NOT_ADMIN:    '⛔ هذه الأزرار للمشرفين فقط',
  ERR_LOCKED:       '⏳ يتم تصنيف هذا الملف حالياً من قِبل مشرف آخر',
  ERR_EXPIRED:      '⌛ انتهت صلاحية هذه القائمة. انشر الملف مجدداً لتصنيفه',
  ERR_NOT_SETUP:    '⚠️ لم يتم إعداد هذه القناة بعد. استخدم /setup',
  ERR_NO_SUBJ:      '⚠️ لا توجد مواد محددة لهذا المستوى والفصل. استخدم /set_subjects',

  CMD_HELP: '*أوامر البوت:*\n\n' +
    '/setup — إعادة تشغيل معالج الإعداد الكامل\n' +
    '/set_level — تغيير المستوى الدراسي الحالي\n' +
    '/set_semester — التبديل بين الفصل الأول والثاني\n' +
    '/set_subjects — إعادة تعريف مواد الفصل الحالي\n' +
    '/add_subject [رمز] [اسم] — إضافة مادة واحدة\n' +
    '/remove_subject [رمز] — إيقاف مادة\n' +
    '/set_content_types — تخصيص أنواع المحتوى\n' +
    '/catalog — تحديث الفهرس المثبت الآن\n' +
    '/stats — إحصائيات التصنيف\n' +
    '/export — تصدير الفهرس كملف CSV\n' +
    '/cancel — إلغاء قوائم التصنيف المعلقة\n' +
    '/help — عرض هذه القائمة',

  CAT_HEADER: function(n) { return '📚 *فهرس ' + n + '*\n\n'; },
  CAT_EMPTY:  '📭 لا يوجد محتوى مصنّف بعد.',
  CAT_FOOTER: '\n\n🔄 _يتحدث تلقائياً بعد كل تصنيف_',

  LEVEL_DISP: {
    '1':'المستوى الأول','2':'المستوى الثاني','3':'المستوى الثالث',
    '4':'المستوى الرابع','5':'المستوى الخامس','6':'المستوى السادس',
    'Internship':'الامتياز',
  },
  SEM_DISP: { S1:'الفصل الأول', S2:'الفصل الثاني' },
};
