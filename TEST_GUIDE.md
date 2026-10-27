# 🧪 دليل التجربة - Girru Stub Installer

## الخطوات للتجربة المحلية

### 1️⃣ الضغط (قيد التشغيل)
```powershell
# هذا يشتغل الآن في الخلفية
cd C:\MAMP\htdocs\agent\agent_player
.\scripts\compress-fast.ps1
```

**النتيجة**: `agent-player-files.zip` (~90 MB)

---

### 2️⃣ بناء الـ Installer

افتح PowerShell جديد وشغّل:

```powershell
cd C:\MAMP\htdocs\agent\agent_player\installer
cargo tauri build
```

**الوقت**: ~5-10 دقائق

**النتيجة**:
```
installer\target\release\bundle\msi\Girru_1.3.0_x64_en-US.msi
```

---

### 3️⃣ رفع الـ ZIP على GitHub (للتجربة)

```powershell
# خيار 1: رفع يدوي على GitHub Releases
# روح على: https://github.com/Dpro-at/Girru/releases/new
# Tag: v1.3.0-test
# Upload: agent-player-files.zip

# خيار 2: استخدم الـ GitHub CLI
gh release create v1.3.0-test agent-player-files.zip --title "Test Release" --notes "Testing stub installer"
```

---

### 4️⃣ تجربة الـ Installer

```powershell
# شغّل الـ MSI installer
cd C:\MAMP\htdocs\agent\agent_player\installer\target\release\bundle\msi
.\Girru_1.3.0_x64_en-US.msi
```

**ما راح يصير**:
1. ✅ يفتح wizard 8 خطوات
2. ✅ تختار مجلد التنصيب
3. ✅ Step 7: "Downloading from GitHub..."
4. ✅ يحمل `agent-player-files.zip` من GitHub
5. ✅ يستخرج الملفات
6. ✅ يسوي `pnpm install`
7. ✅ يخلص التنصيب
8. ✅ يفتح Dashboard

---

## 🐛 لو صارت مشكلة

### المشكلة: الـ installer ما يقدر يحمل

**الحل المؤقت (للتجربة المحلية فقط)**:

نغيّر الكود مؤقتاً ليحمل من مسار محلي بدل GitHub:

```rust
// في bundler.rs - مؤقت للتجربة
let url = format!("file:///C:/MAMP/htdocs/agent/agent_player/agent-player-files.zip");
// بدل:
// let url = format!("https://github.com/Dpro-at/Girru/releases/download/{}/agent-player-files.zip", version);
```

ثم:
1. `cargo tauri build` من جديد
2. شغّل الـ MSI الجديد
3. راح يحمل من الملف المحلي

---

## ✅ الاختبارات المطلوبة

- [ ] الـ MSI installer يفتح ويظهر الـ wizard
- [ ] System check يمر بنجاح (disk/RAM/ports)
- [ ] تختار مجلد التنصيب
- [ ] Step 7: التحميل من GitHub يشتغل
- [ ] الملفات تستخرج صح
- [ ] pnpm install يشتغل
- [ ] Backend يبدأ على port 41522
- [ ] Frontend يبدأ على port 41521
- [ ] Dashboard يفتح ويشتغل
- [ ] قاعدة البيانات تنشأ في .data/database.db
- [ ] Admin account ينشأ صح

---

## 🚀 بعد التجربة الناجحة

لو كل شي اشتغل صح:

```bash
# 1. ارجع الكود للوضع الأصلي (لو غيّرته للتجربة المحلية)
git checkout installer/src/setup/bundler.rs

# 2. ارفع على GitHub
git add -A
git commit -m "feat: stub installer with GitHub download"
git push

# 3. سوّي release تلقائي
git tag v1.3.0
git push origin v1.3.0

# 4. راقب GitHub Actions
# https://github.com/Dpro-at/Girru/actions

# 5. بعد 10 دقائق - الإصدار جاهز!
# https://github.com/Dpro-at/Girru/releases
```

---

## 📝 ملاحظات

1. **أول تجربة**: ممكن تستغرق أطول (بناء Rust + تحميل dependencies)
2. **حجم الـ MSI**: ~3 MB بدل ~100 MB (97% تحسين!)
3. **التحديثات**: بعد كذا فقط ترفع zip جديد - ما تحتاج rebuild الـ installer
4. **CI/CD**: بعد التجربة اليدوية، كل شي يصير تلقائي

---

**جاهز للتجربة!** 🎉

