# 📦 Girru - Storage Audit Report
**تاريخ الفحص:** 2026-02-22
**النظام:** Girru v1.3.0

---

## 🗂️ ملخص تنفيذي

تم العثور على **مسارين رئيسيين** للتخزين في النظام:
1. **`public/`** - ملفات ثابتة يتم تقديمها عبر HTTP مباشرة
2. **`.data/`** (في packages/backend) - بيانات خاصة + ملفات مؤقتة

---

## 📍 المسار الأول: `public/` (الملفات العامة)
**الموقع:** `C:\MAMP\htdocs\agent\agent_player\public\`
**الوصول:** HTTP مباشر عبر `http://localhost:41522/<file-path>`

### الهيكل الحالي:

```
public/
├── avatars/                    ← رفع الأفتارات
│   ├── system/                 ← أفتارات النظام
│   └── user/                   ← أفتارات المستخدمين
│       └── {userId}/
│           └── {avatarId}/
│               ├── avatar.glb  ← ملف 3D
│               └── preview.png ← صورة معاينة
│
├── backgrounds/                ← خلفيات مخصصة
│   └── {userId}/
│       └── *.png, *.jpg
│
├── profile-pictures/           ← صور البروفايل
│   └── user-{id}-{hex}.{ext}
│
├── multiverse/                 ← عوالم 3D (غير موجود حالياً)
│   └── system/
│       └── *.glb
│
├── animations/                 ← أنيميشنز (مجلد فارغ)
├── avatar-cache/               ← كاش مؤقت (مجلد فارغ)
├── icons/                      ← أيقونات
└── *.svg, *.wasm, *.onnx      ← ملفات VAD + ONNX
```

### Routes التي تكتب في `public/`:

| الملف | السطر | المسار | الوصف |
|-------|------|---------|-------|
| `avatar.ts` | 728 | `public/avatars/user/{userId}/{id}/` | رفع أفتار GLB |
| `avatar.ts` | 780 | `public/avatars/user/{userId}/{id}/` | تحميل أفتار من URL |
| `avatar.ts` | 835 | `public/avatars/user/{userId}/{id}/` | تحميل أفتار + معاينة |
| `avatar.ts` | 921 | `public/backgrounds/{userId}/` | رفع خلفيات مخصصة |
| `profile.ts` | 169 | `public/profile-pictures/` | صور البروفايل |

---

## 📍 المسار الثاني: `.data/` (البيانات الخاصة)
**الموقع:** `C:\MAMP\htdocs\agent\agent_player\packages\backend\.data\`
**الوصول:** عبر API فقط (غير مباشر)

### الهيكل الحالي:

```
.data/
├── agent-player.db             ← قاعدة البيانات الرئيسية
├── agent-player.db-shm         ← SQLite shared memory
├── agent-player.db-wal         ← Write-Ahead Log
├── database.db                 ← قاعدة بيانات قديمة
├── .setup_complete             ← علامة اكتمال التثبيت
│
├── agents/                     ← ملفات الـ Agents
│   └── agent-{id}/
│       ├── PERSONALITY.md      ← شخصية الـ Agent
│       ├── MEMORY.md           ← ذاكرة الـ Agent
│       └── knowledge/          ← ملفات المعرفة
│
├── audio/                      ← ملفات صوتية مؤقتة
│   └── *.mp3                   ← TTS output
│
├── audit/                      ← سجلات المراجعة (فارغة)
│
├── backups/                    ← نسخ احتياطية للداتابيز
│   └── database_*.db
│
├── browser/                    ← سكرينشوتات المتصفح
│
├── encryption/                 ← مفاتيح التشفير
│
├── gateway/                    ← بيانات Gateway
│
├── logos/                      ← شعارات مرفوعة
│   └── *.png, *.jpg
│
├── multi-agent/                ← بيانات Multi-Agent
│
├── storage/                    ← نظام التخزين الموحد
│   ├── cache/                  ← ملفات مؤقتة
│   │   ├── audio/
│   │   ├── screenshots/
│   │   └── web/
│   │
│   └── cdn/                    ← ملفات دائمة
│       ├── avatars/
│       ├── data/
│       ├── files/              ← ملفات عامة
│       │   ├── *.glb
│       │   └── *.webm          ← تسجيلات الكاميرا
│       ├── images/
│       └── worlds/             ← عوالم World Builder
│           └── world-builder-*.json
│
├── webhooks/                   ← بيانات Webhooks
│
└── test-*.mp3                  ← ملفات اختبار صوتية
```

### Routes التي تكتب في `.data/`:

| الملف | السطر | المسار | الوصف |
|-------|------|---------|-------|
| `avatar.ts` | 310 | `.data/audio/{id}.mp3` | TTS audio |
| `avatar.ts` | 348 | `.data/audio/{id}.mp3` | STT audio |
| `avatar.ts` | 374 | `.data/logos/` | رفع شعارات |
| `agent-files.ts` | 65 | `.data/agents/{agentId}/PERSONALITY.md` | شخصية Agent |
| `agent-files.ts` | 66 | `.data/agents/{agentId}/MEMORY.md` | ذاكرة Agent |
| `storage-manager.ts` | 114 | `.data/storage/{cache,cdn}/` | نظام التخزين |
| `database.ts` | 16 | `.data/backups/` | نسخ احتياطية |

---

## 🔍 المشاكل المكتشفة

### ⚠️ مشكلة 1: تشتت مسارات التخزين
- **الأفتارات:** `public/avatars/` ✓
- **الخلفيات:** `public/backgrounds/` ✓
- **الشعارات:** `.data/logos/` ⚠️ (يجب أن تكون في public/)
- **الصور الشخصية:** `public/profile-pictures/` ✓
- **الصوتيات:** `.data/audio/` ✓ (صحيح - مؤقتة)
- **عوالم JSON:** `.data/storage/cdn/worlds/` ⚠️
- **ملفات GLB مرفوعة:** `.data/storage/cdn/files/` ⚠️

### ⚠️ مشكلة 2: نظامان للتخزين متوازيان
- **النظام القديم:** مسارات مباشرة في `public/` و `.data/`
- **النظام الجديد:** `storage-manager` → `.data/storage/`
- **النتيجة:** عدم توحيد + تعقيد

### ⚠️ مشكلة 3: ملفات في `.data/` يجب أن تكون في `public/`
- الشعارات (logos) - يتم عرضها في الواجهة
- ملفات CDN - يجب أن تكون قابلة للوصول مباشرة

---

## 💡 الحل المقترح: توحيد التخزين

### الهيكل المثالي المقترح:

```
public/
└── storage/                    ← 🆕 مجلد موحد للتخزين
    ├── avatars/                ← نقل من public/avatars/
    │   ├── system/
    │   └── user/{userId}/{id}/
    │
    ├── backgrounds/            ← نقل من public/backgrounds/
    │
    ├── profiles/               ← نقل من public/profile-pictures/
    │
    ├── logos/                  ← 🆕 نقل من .data/logos/
    │
    ├── worlds/                 ← 🆕 نقل من .data/storage/cdn/worlds/
    │   ├── system/             ← عوالم النظام (GLB)
    │   └── user/{userId}/      ← عوالم المستخدمين
    │
    ├── files/                  ← 🆕 ملفات عامة
    │   └── {category}/
    │
    └── temp/                   ← 🆕 ملفات مؤقتة
        ├── audio/              ← نقل من .data/audio/
        └── screenshots/

.data/                          ← يبقى للبيانات الخاصة فقط
├── agent-player.db
├── agents/                     ← PERSONALITY.md, MEMORY.md
├── backups/
├── encryption/
├── audit/
└── [بيانات داخلية أخرى]
```

---

## 📊 إحصائيات

| نوع الملف | المسار الحالي | العدد التقريبي |
|-----------|---------------|----------------|
| **Avatars (GLB)** | `public/avatars/user/` | متغير |
| **Backgrounds** | `public/backgrounds/` | قليل |
| **Profile Pictures** | `public/profile-pictures/` | 1 لكل مستخدم |
| **Logos** | `.data/logos/` | متغير |
| **Audio (TTS)** | `.data/audio/` | مؤقت |
| **Worlds (JSON)** | `.data/storage/cdn/worlds/` | 4 حالياً |
| **Files (GLB, WebM)** | `.data/storage/cdn/files/` | 2 حالياً |
| **Agent Files** | `.data/agents/{id}/` | 5 agents |
| **DB Backups** | `.data/backups/` | متغير |

---

## ✅ التوصيات

### 1. **توحيد فوري:**
- نقل جميع الملفات القابلة للوصول عبر HTTP إلى `public/storage/`
- إبقاء `.data/` للبيانات الحساسة + المؤقتة فقط

### 2. **تنظيف:**
- حذف `public/avatar-cache/` (فارغ)
- حذف `public/animations/` (فارغ)
- دمج `.data/storage/` مع `public/storage/`

### 3. **توثيق:**
- إنشاء `STORAGE.md` يوضح هيكل التخزين
- تحديث API docs

### 4. **Migration Script:**
- سكريبت لنقل الملفات الموجودة تلقائياً
- تحديث مسارات قاعدة البيانات

---

## 🎯 الخطوات التالية

1. ✅ توثيق المسارات الحالية (تم)
2. ⏭️ إنشاء هيكل `public/storage/` الموحد
3. ⏭️ كتابة Migration Script
4. ⏭️ تحديث جميع Routes لاستخدام المسار الموحد
5. ⏭️ اختبار شامل
6. ⏭️ نقل الملفات الموجودة

---

**تم إنشاء هذا التقرير بواسطة:** Claude Sonnet 4.5
**للاستفسارات:** راجع الكود المصدري في الملفات المذكورة أعلاه
