# TTS Tools

Text-to-Speech integration scripts for Dpro Bot.

## Supported Providers

### 1. Edge TTS (Free, Local)
- **Script**: `tts.py`
- **Provider**: Microsoft Edge TTS
- **Installation**: `pip install edge-tts`
- **Voices**: 100+ voices, 50+ languages including Arabic
- **Speed**: Very fast, no API key needed

### 2. Qwen3-TTS (Free, Open-Source, Voice Cloning) ⭐ NEW!
- **Script**: `qwen-tts.py`
- **Provider**: Alibaba Qwen3-TTS
- **Installation**: `pip install -U qwen-tts`
- **Voices**: 10 languages + unlimited voice cloning
- **Speed**: Fast (GPU recommended)
- **Features**:
  - Voice cloning from 3 seconds of audio
  - Emotional control via natural language
  - Professional quality, 100% free

## Quick Install

```bash
# Edge TTS (current default)
pip install edge-tts

# Qwen3-TTS (recommended for professional use)
pip install -U qwen-tts

# Qwen3-TTS with GPU support
pip install -U qwen-tts[gpu]

# Optional: FlashAttention 2 (reduces memory)
pip install flash-attn --no-build-isolation
```

## Usage

All TTS generation is handled automatically by the backend service.
Configure your preferred provider in: **Settings → Voice**

For detailed Qwen3-TTS setup and features, see: `docs/QWEN3_TTS_SETUP.md`
