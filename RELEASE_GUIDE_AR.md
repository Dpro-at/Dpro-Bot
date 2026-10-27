# 🚀 دليل الإصدارات التلقائية - Girru

## نظام تلقائي 100% ✨

**كل شي صار تلقائي!** ما تحتاج تسوي شي يدوي. فقط:

```bash
git tag v1.3.0
git push origin v1.3.0
```

**وخلاص!** 🎉 GitHub Actions راح يسوي كل شي تلقائياً:

1. ✅ يضغط ملفات البرنامج → `agent-player-files.zip` (~90 MB)
2. ✅ يبني installer لـ Windows → `.msi` (~3 MB)
3. ✅ يبني installer لـ Linux → `.AppImage` (~80 MB)
4. ✅ يبني installer لـ macOS → `.dmg` (~3 MB)
5. ✅ يسوي checksums → `checksums.txt`
6. ✅ ينشئ GitHub Release
7. ✅ يرفع كل الملفات تلقائياً

**صفر شغل يدوي** - مثل VSCode وChrome وFirefox تماماً! 💯

---

## 📋 كيف تسوي إصدار جديد؟

### الخطوة 1: حدّث رقم الإصدار

غيّر الإصدار في هذه الملفات:
- `package.json` → `"version": "1.3.0"`
- `packages/backend/package.json` → `"version": "1.3.0"`
- `installer/Cargo.toml` → `version = "1.3.0"`
- `installer/ui/dist/index.html` → `version: '1.3.0'`

أو استخدم هذا السكريبت السريع:
```powershell
$version = "1.3.0"
(Get-Content package.json) -replace '"version": ".*"', "`"version`": `"$version`"" | Set-Content package.json
(Get-Content packages/backend/package.json) -replace '"version": ".*"', "`"version`": `"$version`"" | Set-Content packages/backend/package.json
(Get-Content installer/Cargo.toml) -replace 'version = ".*"', "version = `"$version`"" | Set-Content installer/Cargo.toml
```

### الخطوة 2: سوّي commit
```bash
git add -A
git commit -m "chore: bump version to 1.3.0"
git push origin main
```

### الخطوة 3: ارفع الـ tag
```bash
git tag -a v1.3.0 -m "Release v1.3.0"
git push origin v1.3.0
```

### الخطوة 4: شوف السحر يصير ✨

روح على: https://github.com/Dpro-at/Girru/actions

راح تشوف 5 jobs يشتغلون بنفس الوقت:
- 🗜️ ضغط الملفات (وندوز) - دقيقتين
- 🪟 بناء installer لـ Windows - 5 دقايق
- 🐧 بناء installer لـ Linux - 8 دقايق
- 🍎 بناء installer لـ macOS - 7 دقايق
- 📦 إنشاء GitHub Release - دقيقة واحدة

**الوقت الكلي**: 10-12 دقيقة وكل شي يخلص! ⚡

### الخطوة 5: تحقق من الإصدار

بعد ما يخلص، روح على: https://github.com/Dpro-at/Girru/releases/tag/v1.3.0

راح تلاقي:
- ✅ `agent-player-installer-1.3.0-win-x64.msi` (~3 ميجا)
- ✅ `agent-player-installer-1.3.0-linux-x86_64.AppImage` (~80 ميجا)
- ✅ `agent-player-installer-1.3.0-macos-x64.dmg` (~3 ميجا)
- ✅ `agent-player-files.zip` (~90 ميجا)
- ✅ `checksums.txt`

**مرفوعين تلقائياً وجاهزين للتحميل!** 🎊

---

## 🎯 مثال سريع

```bash
# 1. غيّر الإصدار
code package.json  # غيّر الرقم

# 2. سوّي commit
git add -A
git commit -m "chore: version 1.3.0"
git push

# 3. ارفع الـ tag
git tag v1.3.0
git push origin v1.3.0

# 4. انتظر 10 دقايق
# 5. الإصدار جاهز!
```

---

## 💡 مقارنة: قبل وبعد

### قبل (يدوي - ساعة ونص) ❌
```
1. شغّل compress-for-release.ps1 يدوياً
2. انتظر الضغط (~5 دقايق)
3. build الـ installer لـ Windows يدوياً
4. انتظر البناء (~10 دقايق)
5. روح لـ VM أو Docker
6. build لـ Linux يدوياً (~15 دقيقة)
7. build لـ macOS يدوياً (~15 دقيقة)
8. سوّي checksums يدوياً
9. روح GitHub → Releases → New
10. املا كل التفاصيل
11. ارفع 5 ملفات واحد واحد
12. اضغط Publish

المجموع: ~1.5 ساعة + جهد كبير
```

### بعد (تلقائي - 30 ثانية!) ✅
```
1. git tag v1.3.0
2. git push origin v1.3.0
3. انتظر 10 دقايق
4. الإصدار جاهز! 🎉

المجموع: 30 ثانية شغلك + 10 دقايق انتظار
```

**التوفير**: 95% من الوقت والجهد! 🚀

---

## 🔧 لو صار مشكلة

### المشكلة: CI/CD ما اشتغل

**الحل:**
1. روح على: https://github.com/Dpro-at/Girru/actions
2. اضغط على الـ workflow اللي فشل
3. شوف الـ logs - راح يقلك وين المشكلة
4. صلّح المشكلة
5. امسح الـ tag وارفعه من جديد:
   ```bash
   git tag -d v1.3.0
   git push origin :refs/tags/v1.3.0
   git tag -a v1.3.0 -m "Release v1.3.0"
   git push origin v1.3.0
   ```

### المشكلة: الـ installer ما يحمّل الملفات

**الحل:**
1. تأكد إن الملف موجود في الإصدار:
   `https://github.com/Dpro-at/Girru/releases/download/v1.3.0/agent-player-files.zip`
2. شيك النت - لازم يكون مفتوح
3. لو ما نفع، زوّد الـ timeout في `bundler.rs` (حالياً 5 دقايق)

---

## ✅ Checklist قبل الإصدار

- [ ] البرنامج يشتغل عندك محلياً
- [ ] غيّرت رقم الإصدار في كل الملفات
- [ ] سويت commit ورفعته
- [ ] سويت tag ورفعته
- [ ] CI/CD خلص بنجاح
- [ ] الإصدار موجود على GitHub
- [ ] حمّلت الـ installer وجرّبته
- [ ] التنصيب اشتغل صح
- [ ] البرنامج يشتغل بعد التنصيب

---

## 🎊 خلاصة

**الآن عندك نظام احترافي 100% تلقائي!**

- ✅ تلقائي بالكامل مثل Chrome وVSCode
- ✅ يشتغل على 3 أنظمة بنفس الوقت
- ✅ يوفر 95% من وقتك
- ✅ صفر أخطاء بشرية
- ✅ جاهز للإنتاج

**فقط:**
```bash
git tag v1.3.0 && git push origin v1.3.0
```

**وخلاص!** 🚀✨🎉

---

**آخر تحديث**: 2026-03-21
**الإصدار**: 1.3.0
**الحالة**: تلقائي بالكامل ✅
