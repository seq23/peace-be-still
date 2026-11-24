"""Scripture text for the library fill: the 66 books, the verse-per-line stores, the words spoken
and the words a transcript is scored against. Pure stdlib; no audio here.

The stored text is never rewritten. What Kokoro is given differs only in ways a listener cannot
see on a page: the KJV's [italic brackets] and RV1909's (parentheses) are dropped (the words inside
stay), ALL-CAPS words are said as ordinary words (LORD -> Lord), and the names in
audio/pronunciations.json are respelled so the engine says them right (QUALITY.md A03/A04).
"""
from __future__ import annotations

import gzip
import json
import re
import unicodedata
from pathlib import Path

AUDIO = Path(__file__).resolve().parent.parent

# The 66-book Protestant canon in order, shared with the app and the import script
# (content/bible/books.json: eBible file code, USFM code, English and Spanish names).
# The KJV file also carries the Apocrypha (1ES, TOB, ...), which is never voiced or imported.
BOOKS = json.loads((AUDIO.parent / "content/bible/books.json").read_text("utf-8"))
CODES = [b["code"] for b in BOOKS]
NAME = {b["code"]: {"en": b["en"], "es": b["es"]} for b in BOOKS}

# The one stored text: the committed eBible verse-per-line files, also read by the app's import
# (scripts/import-bibles.py) and the Worker. TRANSLATION[lang][0] names the audio files.
SCRIPTURE = AUDIO.parent / "content/bible"
TRANSLATION = {"en": ("kjv", "kjv_vpl.txt.gz"), "es": ("rv1909", "rv1909_vpl.txt.gz")}

VPL = re.compile(r"^([1-4A-Z]{3}) (\d+):(\d+) (.*)$")


def parse_vpl(lines) -> dict:
    """{book: {chapter: [(verse, text), ...]}} for the 66 books only, in file order."""
    out: dict = {}
    for raw in lines:
        m = VPL.match(raw.rstrip("\n").lstrip("﻿"))
        if not m or m.group(1) not in NAME:
            continue
        b, c, v, t = m.group(1), int(m.group(2)), int(m.group(3)), m.group(4).strip()
        out.setdefault(b, {}).setdefault(c, []).append((v, t))
    return out


def load_bible(lang: str, scripture_dir: Path = SCRIPTURE) -> dict:
    with gzip.open(scripture_dir / TRANSLATION[lang][1], "rt", encoding="utf-8") as f:
        return parse_vpl(f)


def load_pronunciations(path: Path | None = None) -> dict:
    return json.loads((path or AUDIO / "pronunciations.json").read_text("utf-8"))


_PLAIN = {"á": "a", "é": "e", "ó": "o", "ú": "u", "Á": "A", "É": "E", "Ó": "O", "Ú": "U"}
_CAPS = re.compile(r"\b([A-ZÁÉÍÓÚÑ]{2,})\b")


def speech_text(text: str, lang: str, pron: dict) -> str:
    """The words Kokoro is given for one stored verse (see the module note)."""
    # The KJV's paragraph mark is a mark on the page, never a word: the engine said "paragraph" aloud
    # (23 Nov 2026: Genesis 1 as published says "...the first day, paragraph, and God said").
    s = text.replace("¶", " ").replace("[", "").replace("]", "").replace("(", "").replace(")", "")
    s = s.replace("’", "'").replace("‘", "'")
    s = _CAPS.sub(lambda m: m.group(1).capitalize(), s)
    if lang == "es":
        # RV1909's old one-letter words (á, é, ó, ú) are said plainly: the engine reads a lone "á"
        # as "a acentuada" (Salmo 23, 18 Nov 2026).
        s = re.sub(r"(?<!\w)([áéóúÁÉÓÚ])(?!\w)", lambda m: _PLAIN[m.group(1)], s)
    for word, said in (pron.get(lang, {}).get("engine") or {}).items():
        s = re.sub(rf"\b{re.escape(word)}\b", said, s)
    return re.sub(r"\s+", " ", s).strip()


def heading(book: str, chapter: int, lang: str) -> str:
    """The spoken title said before the first verse."""
    if book == "PSA":
        return f"Psalm {chapter}." if lang == "en" else f"Salmo {chapter}."
    if lang == "en":
        return f"{NAME[book]['en']}, chapter {chapter}."
    return f"{NAME[book]['es']}, capítulo {chapter}."


# ------------------------------------------------------------------ scoring words
_ONES_EN = "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen".split()
_TENS_EN = "_ _ twenty thirty forty fifty sixty seventy eighty ninety".split()
_ONES_ES = "cero uno dos tres cuatro cinco seis siete ocho nueve diez once doce trece catorce quince dieciseis diecisiete dieciocho diecinueve".split()
_TENS_ES = "_ _ veinte treinta cuarenta cincuenta sesenta setenta ochenta noventa".split()
_HUND_ES = "_ ciento doscientos trescientos cuatrocientos quinientos seiscientos setecientos ochocientos novecientos".split()


def number_words(n: int, lang: str) -> str:
    """Digits a transcript writes, as words, so "Psalm 23" and "Psalm twenty three" score alike."""
    if lang == "es":
        if n < 20:
            return _ONES_ES[n]
        if n < 100:
            return _TENS_ES[n // 10] + ("" if n % 10 == 0 else " y " + _ONES_ES[n % 10])
        if n < 1000:
            return ("cien" if n == 100 else _HUND_ES[n // 100]) + ("" if n % 100 == 0 else " " + number_words(n % 100, lang))
        if n < 1_000_000:
            k = "mil" if n // 1000 == 1 else number_words(n // 1000, lang) + " mil"
            return k + ("" if n % 1000 == 0 else " " + number_words(n % 1000, lang))
        return str(n)
    if n < 20:
        return _ONES_EN[n]
    if n < 100:
        return _TENS_EN[n // 10] + ("" if n % 10 == 0 else " " + _ONES_EN[n % 10])
    if n < 1000:
        return _ONES_EN[n // 100] + " hundred" + ("" if n % 100 == 0 else " " + number_words(n % 100, lang))
    if n < 1_000_000:
        return number_words(n // 1000, lang) + " thousand" + ("" if n % 1000 == 0 else " " + number_words(n % 1000, lang))
    return str(n)


def score_words(text: str, lang: str) -> list[str]:
    """Lower-case words without accents or punctuation; digits as words. Used on the script AND
    the transcript, so both are read the same way (RV1909's old "á" and today's "a" match)."""
    # The KJV's ligatures are two letters ("Cæsar", "Judæa"): NFD keeps æ as one letter that the
    # filter below drops, which split "Cæsar" into "c sar" and failed Acts 26 on its last word (A07).
    s = unicodedata.normalize("NFD", text.lower().replace("æ", "ae").replace("œ", "oe"))
    s = "".join(ch for ch in s if unicodedata.category(ch) != "Mn")
    s = re.sub(r"(\d),(\d)", r"\1\2", s)
    s = re.sub(r"\d+", lambda m: " " + number_words(int(m.group()), lang) + " ", s)
    s = re.sub(r"[^a-z0-9 ]+", " ", s.replace("-", " "))
    s = re.sub(r"\bfor ever\b", "forever", s)
    s = re.sub(r"\bto (day|morrow)\b", r"to\1", s)   # KJV "to day" / "to morrow" are heard as one word
    s = re.sub(r"\bcheek bone\b", "cheekbone", s)
    return [SAME_WORD.get(w, w) for w in s.split()]


_WORD = re.compile(r"[^\W\d_]+")


def names(text: str, lang: str) -> dict:
    """{score word: the word as written} for the script's names, in order: words written with a capital
    inside a sentence (never the first word after . ? ! or the start) that the script never writes in
    lower case, three letters or more. The judge is told them, and may hear them a letter off. Pure."""
    caps, low = {}, set()
    for m in _WORD.finditer(text):
        w = m.group()
        before = text[:m.start()].rstrip()
        starts = not before or before[-1] in ".?!¶" or before.endswith(("[", "(")) and before[:-1].rstrip()[-1:] in ".?!"
        if w.islower():
            low.update(score_words(w, lang))
        elif w[0].isupper() and not w.isupper() and not starts and len(w) >= 3:
            key = "".join(score_words(w, lang))
            caps.setdefault(key, w)
    return {k: v for k, v in caps.items() if k not in low}


# Old spellings a transcript writes the modern way, and "Selah" however it is heard. Applied to
# the script AND the transcript, so only the spelling is forgiven, never a missing word
# (Psalm 9, 18 Nov 2026: whisper small wrote hast -> haste x5, shew -> show, Selah -> sila).
SAME_WORD = {"haste": "hast", "shew": "show", "shewed": "showed", "shewn": "shown", "sheweth": "showeth",
             "marvellous": "marvelous", "alway": "always", "sila": "selah", "sheila": "selah", "sela": "selah",
             "seela": "selah", "seelah": "selah", "sayla": "selah", "cela": "selah",
             # British spellings in the story scripts that a transcript writes the American way
             "honoured": "honored", "honour": "honor", "armour": "armor", "colour": "color", "neighbour": "neighbor",
             "labour": "labor", "favour": "favor", "saviour": "savior", "behaviour": "behavior"}
