# Python Environment

Dpro Bot uses Python scripts for audio processing (TTS/STT), desktop control, and media editing. The project includes an automated setup system that downloads and configures a **portable Python** — no pre-installed Python required.

---

## Quick Start

```bash
cd packages/backend
npm run setup:python
```

This single command handles everything:
- Downloads Python 3.12.8 (embeddable, ~10 MB)
- Installs pip
- Installs all required packages (edge-tts, gTTS, faster-whisper, etc.)

After setup, run the backend normally:

```bash
npm run dev
```

---

## How It Works

### Architecture

```
Node.js Backend (Fastify)
    │
    ├── python-env.ts          ← Finds the correct Python executable
    ├── python-setup.ts        ← Downloads & configures portable Python
    │
    └── child_process.spawn()  ← Runs Python scripts
            │
            ├── tools/tts/tts.py         (Text-to-Speech)
            ├── tools/stt/stt.py         (Speech-to-Text)
            ├── tools/desktop/desktop.py (Desktop control)
            ├── tools/audio/audio_edit.py
            └── tools/video/video_edit.py
```

The backend spawns Python scripts as child processes. Arguments are passed via temporary JSON files (to handle Unicode safely on Windows). Results come back as JSON on stdout.

### Python Resolution Priority

`python-env.ts` finds Python in this order:

1. **Embedded Python** (`.data/python/win32/python-*/python.exe` on Windows)
2. **Project venv** (`.data/python/{linux|darwin}/venv/bin/python3`)
3. **System Python** (full paths like `%LOCALAPPDATA%\Programs\Python\...`)
4. **Fallback** (`python3` on Unix, `python` on Windows)

The embedded Python always takes priority, ensuring consistent behavior across machines.

---

## Platform Support

### Windows

Downloads the official [Python embeddable ZIP](https://www.python.org/downloads/windows/) from python.org. This is a minimal, portable Python distribution (~10 MB) that:
- Requires **no installation** — just extract and run
- Requires **no admin privileges**
- Does **not** modify the registry or system PATH
- Is completely isolated from any system Python

Supports both `x64` and `arm64` architectures (auto-detected).

### Linux

Creates a virtual environment from the system `python3`:

```bash
# System Python 3.10+ required. Install if missing:
sudo apt install python3 python3-venv python3-pip   # Debian/Ubuntu
sudo dnf install python3                             # Fedora
```

### macOS

Same as Linux — creates a venv from system Python:

```bash
# Install Python if needed:
brew install python3
```

---

## Directory Structure

After running `npm run setup:python`:

```
packages/backend/.data/python/           ← gitignored
├── win32/                               ← Windows only
│   ├── python-3.12.8-embed-amd64/
│   │   ├── python.exe                   ← the Python executable
│   │   ├── python312._pth              ← configured for pip
│   │   ├── Lib/site-packages/          ← installed packages
│   │   └── Scripts/pip.exe
│   └── get-pip.py
├── linux/                               ← Linux only
│   └── venv/
│       ├── bin/python3
│       └── lib/python3.x/site-packages/
├── darwin/                              ← macOS only
│   └── venv/
│       └── bin/python3
└── .setup-complete                      ← JSON flag with metadata
```

---

## Python Scripts

All Python tools are in `packages/backend/python-scripts/`:

```
python-scripts/
├── requirements.txt           ← all dependencies
├── utils/
│   └── common.py              ← shared: language detection, args loader, output helpers
└── tools/
    ├── tts/
    │   ├── tts.py             ← Text-to-Speech (edge-tts / gTTS)
    │   └── qwen-tts.py        ← Qwen3-TTS (voice cloning, emotion)
    ├── stt/
    │   └── stt.py             ← Speech-to-Text (faster-whisper)
    ├── desktop/
    │   └── desktop.py         ← Mouse, keyboard, screenshot (pyautogui)
    ├── audio/
    │   └── audio_edit.py      ← Audio merge/trim/convert (pydub)
    └── video/
        └── video_edit.py      ← Video merge/trim/extract (moviepy)
```

### Dependencies

| Package | Purpose | Size |
|---------|---------|------|
| `edge-tts` | Microsoft neural TTS (free, no API key) | Light |
| `gTTS` | Google TTS fallback | Light |
| `faster-whisper` | Local speech-to-text (Whisper) | ~80 MB |
| `pydub` | Audio editing (requires ffmpeg) | Light |
| `moviepy` | Video editing | ~50 MB |
| `Pillow` | Image processing, screenshots | ~10 MB |
| `pyautogui` | Desktop automation | Light |
| `pywin32` | Windows-specific desktop control | Windows only |

---

## Key Files

| File | Purpose |
|------|---------|
| `src/services/python-env.ts` | Finds Python executable, provides `spawnPython()` |
| `src/services/python-setup.ts` | Downloads & configures portable Python |
| `src/services/python-setup-cli.ts` | CLI entry point (`npm run setup:python`) |
| `src/services/audio-service.ts` | Uses `spawnPython()` for TTS/STT |
| `src/tools/desktop/desktop.ts` | Uses `spawnPython()` for desktop control |

---

## Troubleshooting

### "Neither gTTS nor edge-tts is installed"

Python packages are missing. Run:

```bash
cd packages/backend
npm run setup:python
```

### "Python not found"

The setup hasn't been run, or the `.data/python/` directory was deleted. Run `npm run setup:python`.

### Setup fails with network error

The setup downloads files from python.org and pypi.org. Check your internet connection. If you're behind a proxy, set `HTTP_PROXY` and `HTTPS_PROXY` environment variables.

### Setup already done but TTS still fails

Delete the Python environment and re-run setup:

```bash
# Windows
rmdir /s /q packages\backend\.data\python

# Linux/Mac
rm -rf packages/backend/.data/python

# Then re-run
cd packages/backend
npm run setup:python
```

### Wrong Python version being used

The embedded Python (3.12.8) always takes priority. Check which Python is active:

```bash
cd packages/backend
npx tsx -e "import { getStatus } from './src/services/python-env.js'; console.log(getStatus())"
```

### Linux: "python3-venv not installed"

```bash
sudo apt install python3-venv python3-pip
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PYTHON_EMBED_VERSION` | `3.12.8` | Python version to download (Windows) |
| `PYTHONIOENCODING` | `utf-8` | Set automatically when spawning scripts |

---

## Adding a New Python Tool

1. Create your script in `python-scripts/tools/your-tool/your-tool.py`
2. Follow the standard pattern:

```python
#!/usr/bin/env python3
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))
from utils.common import load_args_file, ok, fail

def main():
    if len(sys.argv) == 3 and sys.argv[1] == '--args-file':
        args = load_args_file(sys.argv[2])
    else:
        fail('Usage: python your-tool.py --args-file <json>')

    # Your logic here
    result = do_something(args)
    ok({'result': result})

if __name__ == '__main__':
    main()
```

3. Add any new dependencies to `requirements.txt`
4. Call from TypeScript using `spawnPython()`:

```typescript
import { spawnPython } from '../../services/python-env.js';

const child = spawnPython(
  path.join(process.cwd(), 'python-scripts', 'tools', 'your-tool', 'your-tool.py'),
  ['--args-file', argsFile]
);
```
