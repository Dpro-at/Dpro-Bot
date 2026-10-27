#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Common utilities shared across all Girru Python tools.
"""

import json
import sys
import os
from pathlib import Path


# ─── Language detection ───────────────────────────────────────────────────────

def detect_language(text: str) -> str:
    """
    Detect the primary language of text.
    Returns a BCP-47 language code: 'ar', 'de', 'fr', 'es', 'it',
    'ru', 'zh', 'ja', 'ko', or 'en' (default).
    """
    if not text:
        return 'en'

    # Arabic script
    arabic = sum(1 for c in text if '\u0600' <= c <= '\u06FF')
    if arabic > len(text) * 0.15:
        return 'ar'

    # Cyrillic (Russian, Ukrainian, etc.)
    cyrillic = sum(1 for c in text if '\u0400' <= c <= '\u04FF')
    if cyrillic > len(text) * 0.15:
        return 'ru'

    # CJK unified (Chinese)
    cjk = sum(1 for c in text if '\u4E00' <= c <= '\u9FFF' or '\u3400' <= c <= '\u4DBF')
    if cjk > len(text) * 0.1:
        return 'zh'

    # Japanese (hiragana / katakana)
    japanese = sum(1 for c in text if '\u3040' <= c <= '\u30FF')
    if japanese > len(text) * 0.1:
        return 'ja'

    # Korean (hangul syllables)
    korean = sum(1 for c in text if '\uAC00' <= c <= '\uD7AF')
    if korean > len(text) * 0.1:
        return 'ko'

    # Latin-script heuristics (character + word-frequency based)
    lower = text.lower()

    # German: ä ö ü ß or common function words
    german_chars = sum(1 for c in text if c in 'äöüÄÖÜß')
    german_words = sum(1 for w in lower.split()
                       if w in {'der', 'die', 'das', 'und', 'nicht', 'ich', 'du',
                                 'ist', 'sein', 'haben', 'aber', 'auch', 'mit',
                                 'bei', 'von', 'zu', 'sie', 'wir', 'ihr'})
    if german_chars > 2 or german_words > 1:
        return 'de'

    # French: é è ê à ç or common function words
    french_chars = sum(1 for c in text if c in 'éèêëàâùûîïç')
    french_words = sum(1 for w in lower.split()
                       if w in {'le', 'la', 'les', 'un', 'une', 'des', 'est',
                                 'dans', 'avec', 'pour', 'que', 'qui', 'pas',
                                 'je', 'tu', 'il', 'elle', 'nous', 'vous'})
    if french_chars > 2 or french_words > 1:
        return 'fr'

    # Spanish: ñ ¡ ¿ or common function words
    spanish_chars = sum(1 for c in text if c in 'ñÑ¡¿')
    spanish_words = sum(1 for w in lower.split()
                        if w in {'el', 'los', 'las', 'una', 'es', 'en', 'de',
                                  'que', 'con', 'por', 'para', 'pero', 'como',
                                  'hola', 'gracias', 'estoy'})
    if spanish_chars > 0 or spanish_words > 1:
        return 'es'

    # Italian: common function words
    italian_words = sum(1 for w in lower.split()
                        if w in {'il', 'lo', 'la', 'gli', 'le', 'un', 'una',
                                  'sono', 'con', 'per', 'che', 'del', 'della',
                                  'ciao', 'grazie', 'questo', 'quello'})
    if italian_words > 1:
        return 'it'

    return 'en'


# ─── Args-file helper (avoids Windows CLI Unicode encoding issues) ────────────

def load_args_file(path: str) -> dict:
    """
    Load arguments from a UTF-8 JSON file.
    Used by tools that receive Unicode text (e.g. Arabic) from Node.js.
    """
    with open(path, encoding='utf-8') as f:
        return json.load(f)


# ─── Structured output helpers ────────────────────────────────────────────────

def ok(data: dict | None = None) -> None:
    """Print JSON success result to stdout."""
    payload = {'success': True}
    if data:
        payload.update(data)
    print(json.dumps(payload, ensure_ascii=False))


def fail(message: str, code: int = 1) -> None:
    """Print JSON error to stderr and exit."""
    print(json.dumps({'success': False, 'error': message}, ensure_ascii=False),
          file=sys.stderr)
    sys.exit(code)


# ─── Path helpers ─────────────────────────────────────────────────────────────

def ensure_dir(path: str) -> str:
    """Create directory if it doesn't exist, return path."""
    os.makedirs(path, exist_ok=True)
    return path


def scripts_root() -> Path:
    """Return the python-scripts directory root."""
    return Path(__file__).parent.parent
