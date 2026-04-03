# دليل تشغيل البوت الطبي — مجاني 100% بلا بطاقة ائتمان

**المطلوب فقط: حساب Google (Gmail) عادي + حساب Telegram**
لا سيرفرات، لا اشتراكات، لا بطاقة ائتمان، لا أي تكلفة.

---

## كيف يعمل؟

- **Google Apps Script** = السيرفر الذي يشغّل البوت (مجاني مع حساب Google)
- **Google Sheets** = قاعدة البيانات (مجاني مع حساب Google)
- **Telegram Bot API** = واجهة البوت (مجاني دائماً)

---

## الخطوة 1 — إنشاء بوت تيليغرام

1. افتح تيليغرام وابحث عن **@BotFather**
2. أرسل: `/newbot`
3. اختر اسماً للبوت (مثال: Medical Files Bot)
4. اختر username ينتهي بـ `bot` (مثال: `MedFilesBot`)
5. **انسخ التوكن** — يبدو هكذا: `123456789:ABCxyz...`
   ⚠️ احتفظ به، ستحتاجه لاحقاً
6. أرسل لـ BotFather: `/setprivacy` → اختر بوتك → اضغط **Disable**
   (مهم لكي يرى البوت رسائل القنوات)

---

## الخطوة 2 — إنشاء Google Sheet

1. اذهب إلى [sheets.google.com](https://sheets.google.com)
2. اضغط **+** لإنشاء جدول جديد
3. سمّه: `Medical Bot Database`
4. انسخ **معرّف الجدول (Spreadsheet ID)** من الرابط:
   ```
   https://docs.google.com/spreadsheets/d/[هذا_هو_المعرف]/edit
   ```
   المعرّف هو النص الطويل بين `/d/` و `/edit`

---

## الخطوة 3 — إنشاء مشروع Google Apps Script

1. اذهب إلى [script.google.com](https://script.google.com)
2. اضغط **New project** (مشروع جديد)
3. سمّ المشروع: `Medical Bot`
4. **احذف** كل ما في الملف الافتراضي (Code.gs)
5. أنشئ ملفات النصوص البرمجية:
   - اضغط على **+** بجانب "Files"
   - اختر **Script**
   - أنشئ ملفاً لكل ملف من الملفات التالية:

---

## الخطوة 4 — نسخ الكود

أنشئ الملفات التالية **بالترتيب** وانسخ محتوى كل ملف:

| الملف | المحتوى |
|-------|---------|
| `Code` | محتوى Code.gs |
| `Config` | محتوى Config.gs |
| `TelegramAPI` | محتوى TelegramAPI.gs |
| `Database` | محتوى Database.gs |
| `CacheStore` | محتوى CacheStore.gs |
| `SessionUtilsAdmin` | محتوى SessionUtilsAdmin.gs |
| `Keyboards` | محتوى Keyboards.gs |
| `Services` | محتوى Services.gs |
| `SetupHandler` | محتوى SetupHandler.gs |
| `Handlers` | محتوى Handlers.gs |
| `CommandHandler` | محتوى CommandHandler.gs |
| `Router` | محتوى Router.gs |

> **ملاحظة**: ملف `appsscript.json` يتم تعديله بشكل مختلف — انظر الخطوة 5.

---

## الخطوة 5 — إعداد ملف appsscript.json

1. في محرر GAS، اضغط على **Project Settings** (أيقونة الترس ⚙️)
2. فعّل خيار: **Show "appsscript.json" manifest file in editor**
3. ارجع للمحرر، افتح ملف `appsscript.json`
4. **استبدل** كل محتواه بمحتوى الملف المرفق

---

## الخطوة 6 — إضافة معلومات البوت (Script Properties)

1. في محرر GAS، اضغط **Project Settings** (⚙️)
2. انزل إلى قسم **Script Properties**
3. اضغط **Add property** وأضف هذين:

| Property | Value |
|----------|-------|
| `BOT_TOKEN` | التوكن من الخطوة 1 |
| `SPREADSHEET_ID` | معرّف الجدول من الخطوة 2 |
| `WEBHOOK_URL` | اتركه فارغاً الآن — ستملأه بعد النشر |

---

## الخطوة 7 — نشر البوت كـ Web App

1. في محرر GAS، اضغط **Deploy** → **New deployment**
2. اضغط على ⚙️ بجانب "Select type" واختر **Web app**
3. اضبط الإعدادات:
   - **Description**: Medical Bot v1
   - **Execute as**: Me (اسمك)
   - **Who has access**: Anyone
4. اضغط **Deploy**
5. وافق على صلاحيات الوصول (اضغط Allow)
6. **انسخ رابط Web App** — يبدو هكذا:
   ```
   https://script.google.com/macros/s/AKfy.../exec
   ```

---

## الخطوة 8 — ربط الـ Webhook

1. ارجع لـ **Script Properties** وأضف:
   - `WEBHOOK_URL` = رابط Web App من الخطوة 7
2. في محرر GAS، من القائمة العلوية اختر الدالة `initBot` ثم اضغط **▶ Run**
   - هذا ينشئ جداول قاعدة البيانات تلقائياً
3. اختر الدالة `setWebhook` ثم اضغط **▶ Run**
   - تحقق من Logs أن النتيجة: `"ok":true`
4. اختر الدالة `installTriggers` ثم اضغط **▶ Run**
   - هذا ينشئ مؤقتاً يحدث الفهرس كل 5 دقائق

---

## الخطوة 9 — تجربة البوت 🎉

1. أضف البوت كـ **مشرف (Admin)** في أي قناة تيليغرام
   - اذهب لإعدادات القناة → Administrators → Add Administrator → ابحث عن بوتك
   - أعطه صلاحية: Post Messages, Edit Messages, Delete Messages
2. ستصلك **رسالة خاصة** من البوت تطلب منك إعداد القناة
3. اتبع خطوات الإعداد التفاعلي
4. انشر أي ملف في القناة — ستظهر قائمة التصنيف فوراً! ✅

---

## أوامر الإدارة

اكتب هذه الأوامر في القناة أو في رسالة خاصة مع البوت:

| الأمر | الوظيفة |
|-------|---------|
| `/help` | عرض قائمة جميع الأوامر |
| `/setup` | إعادة إعداد القناة من البداية |
| `/set_level` | تغيير المستوى الدراسي |
| `/set_semester` | التبديل بين S1 و S2 |
| `/set_subjects` | إعادة تحديد مواد الفصل الحالي |
| `/add_subject biochem Biochem Biochem` | إضافة مادة |
| `/remove_subject biochem` | إيقاف مادة |
| `/set_content_types Book Exam HW Slides` | تخصيص أنواع المحتوى |
| `/catalog` | تحديث الفهرس المثبت فوراً |
| `/stats` | إحصائيات التصنيف |
| `/export` | تصدير الفهرس CSV |

---

## إضافة قناة جديدة

فقط أضف البوت كمشرف في القناة الجديدة — سيبدأ الإعداد تلقائياً.

---

## الصيانة

### بداية كل فصل دراسي
```
/set_semester
```
اختر S1 أو S2.

### بداية كل عام دراسي
```
/set_level
```
اختر المستوى الجديد.

### إضافة مادة جديدة
```
/add_subject [رمز] [اسم_مختصر] [رمز_الهاشتاق]
```
مثال:
```
/add_subject molbio MolBio MolBio
```

---

## حل المشكلات الشائعة

| المشكلة | الحل |
|---------|------|
| البوت لا يرد على الملفات | تأكد أن البوت مشرف وأن Privacy mode معطّل (خطوة 1-6) |
| قائمة التصنيف لا تظهر | أعد الإعداد بـ /setup |
| خطأ في الـ Webhook | أعد تشغيل `setWebhook()` من GAS editor |
| البوت توقف فجأة | تحقق من Logs في GAS: View → Logs |
| الفهرس لا يتحدث | شغّل `/catalog` يدوياً، أو أعد تشغيل `installTriggers()` |
| رسالة "انتهت الجلسة" | أعد نشر الملف — ستظهر قائمة جديدة |

---

## ملاحظات مهمة

- ✅ **مجاني 100%** — لا بطاقة ائتمان، لا اشتراكات
- ✅ يعمل طالما حسابك على Google نشط
- ✅ لا حاجة لتجديد أي شيء
- ✅ Google Apps Script: 6 دقائق حد أقصى لكل طلب (كافٍ جداً للبوت)
- ✅ حد مجاني: 20,000 طلب HTTP يومياً (أكثر من كافٍ)
- ✅ Google Sheets: غير محدود تقريباً للملفات النصية
- ⚠️ عند تحديث الكود: يجب إعادة النشر (Deploy → Manage deployments → جديد) ثم إعادة `setWebhook()`
