# Python Scripts — Dpro Bot Tools

أدوات Python مجانية 100% للصوت والفيديو.

```
python-scripts/
├── tools/               ← كل أداة في ملف منفصل
│   ├── tts.py           ← Text-to-Speech  (edge-tts)
│   ├── stt.py           ← Speech-to-Text  (faster-whisper)
│   ├── audio_edit.py    ← دمج/قطع/تحويل صوت  (pydub)
│   └── video_edit.py    ← دمج/قطع/استخراج صوت من فيديو  (moviepy)
├── utils/
│   └── common.py        ← وظائف مشتركة (detect_language, load_args_file...)
├── requirements.txt     ← pip install -r requirements.txt
└── README.md
```

## التثبيت

### 1. تثبيت Python 3.10+

```bash
# تحقق من الإصدار
python --version
# يجب أن يكون 3.10 أو أحدث
```

### 2. تثبيت المكتبات

```bash
cd packages/backend/python-scripts

# إنشاء بيئة افتراضية (اختياري لكن موصى به)
python -m venv venv

# تفعيل البيئة
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# تثبيت المكتبات
pip install -r requirements.txt
```

---

## Speech-to-Text (STT)

### faster-whisper

**الميزات:**
- ✅ مجاني 100%
- ✅ أسرع بـ 4× من Whisper الأصلي
- ✅ يشتغل على CPU (لا يحتاج GPU)
- ✅ دقة عالية جداً
- ✅ يدعم 99+ لغة (عربي، إنجليزي، إلخ)

**الاستخدام:**
```bash
python tools/stt.py recording.mp3
```

**Output:**
```json
{
  "text": "مرحبا، كيف حالك؟",
  "language": "ar",
  "duration": 2.5
}
```

**Models المتاحة:**
- `tiny` - أسرع (39M params)
- `base` - سريع (74M params)
- `small` - متوازن (244M params)
- `medium` - دقيق (769M params) ⭐ موصى به
- `large-v3` - الأدق (1550M params)

**GPU Support (اختياري):**
```python
# في stt.py، غير:
model = WhisperModel(
    "medium",
    device="cuda",  # بدل "cpu"
    compute_type="float16"  # بدل "int8"
)
```

---

## Text-to-Speech (TTS)

### Coqui TTS

**الميزات:**
- ✅ مجاني 100%
- ✅ جودة عالية (أحسن من OpenAI في بعض الأحيان)
- ✅ يدعم العربي والإنجليزي
- ✅ أصوات طبيعية جداً

**الاستخدام:**
```bash
python tools/tts.py "Hello!" alloy output.mp3 en
python tools/tts.py "مرحبا!" alloy output.mp3 ar
```

**Arabic Models:**
- `tts_models/ar/css10/vits` ⭐ موصى به
- صوت طبيعي وواضح

**English Models:**
- `tts_models/en/ljspeech/tacotron2-DDC` - جودة عالية
- `tts_models/en/ljspeech/vits` - أسرع
- `tts_models/en/ljspeech/fast_pitch` - أسرع جداً

---

## البدائل (أقوى لكن أثقل)

### GPT-SoVITS (الأفضل)

**الميزات:**
- ✅ أفضل جودة (صوت طبيعي 100%)
- ✅ يتعلم من صوتك (Voice Cloning)
- ✅ يدعم العربي والإنجليزي
- ❌ يحتاج GPU (8GB+ VRAM)

**التثبيت:**
```bash
# Clone repo
git clone https://github.com/RVC-Boss/GPT-SoVITS
cd GPT-SoVITS

# Install
pip install -r requirements.txt

# Run
python webui.py
```

**استخدام:**
- افتح `http://localhost:9880`
- ارفع ملف صوتي (3-10 ثواني)
- اكتب النص
- اضغط "Generate"

---

### CosyVoice 2 (أسرع)

**الميزات:**
- ✅ سريع جداً
- ✅ جودة ممتازة
- ✅ يدعم 25+ لغة
- ❌ يحتاج GPU (6GB+ VRAM)

**Repo:** https://github.com/FunAudioLLM/CosyVoice

---

### Qwen2-Audio (الأذكى)

**الميزات:**
- ✅ Voice-to-Voice (يرد بالصوت مباشرة)
- ✅ فهم عميق للسياق
- ❌ يحتاج GPU قوي (12GB+ VRAM)

**Repo:** https://github.com/QwenLM/Qwen2-Audio

---

## المقارنة

| الميزة | faster-whisper | Coqui TTS | OpenAI API |
|--------|---------------|-----------|------------|
| **التكلفة** | مجاني | مجاني | $0.006/دقيقة (STT)<br>$0.015/1000 حرف (TTS) |
| **السرعة** | سريع | متوسط | سريع جداً |
| **الجودة** | ممتاز | جيد جداً | ممتاز |
| **اللغات** | 99+ | 16+ | 57+ |
| **GPU** | اختياري | اختياري | N/A (Cloud) |
| **الخصوصية** | ✅ 100% محلي | ✅ 100% محلي | ❌ Cloud |

---

## Performance Tips

### للسرعة:
```bash
# STT: استخدم model أصغر
python stt.py --model small audio.mp3

# TTS: استخدم fast_pitch
# غير model_name في tts.py إلى:
# "tts_models/en/ljspeech/fast_pitch"
```

### للجودة:
```bash
# STT: استخدم large model
python stt.py --model large-v3 audio.mp3

# TTS: استخدم VITS models
# "tts_models/ar/css10/vits" (Arabic)
# "tts_models/en/ljspeech/vits" (English)
```

### GPU Acceleration:
```bash
# تحقق من توفر CUDA
python -c "import torch; print(torch.cuda.is_available())"

# إذا True، غير device="cuda" في السكريبتات
```

---

## Troubleshooting

**Q: "ModuleNotFoundError: No module named 'faster_whisper'"**
A: شغل `pip install -r requirements.txt`

**Q: STT بطيء جداً**
A: استخدم model أصغر (`small` أو `base`) أو فعّل GPU

**Q: TTS ما يطلع صوت**
A: تحقق من تثبيت ffmpeg:
```bash
# Windows (Chocolatey)
choco install ffmpeg

# Mac
brew install ffmpeg

# Linux
sudo apt install ffmpeg
```

**Q: الصوت مو واضح**
A: استخدم model أقوى (`medium` أو `large-v3` للـ STT)

---

## Cost Comparison

**10,000 messages شهرياً:**

| النظام | التكلفة |
|--------|---------|
| **OpenAI API** | $45/شهر |
| **Local (CPU)** | $0 (كهرباء فقط) |
| **Local (GPU)** | $0 (كهرباء أعلى) |

**استهلاك الكهرباء (تقريبي):**
- CPU: ~50W × 8h/يوم = 0.4 kWh/يوم → $3/شهر
- GPU: ~200W × 8h/يوم = 1.6 kWh/يوم → $12/شهر

**💡 الخلاصة:** Local أرخص بكثير حتى مع GPU!

---

**الخيار الموصى به:**
- **للبداية:** faster-whisper + Coqui TTS (مجاني، CPU فقط)
- **للإنتاج:** faster-whisper + GPT-SoVITS (أفضل جودة، يحتاج GPU)
