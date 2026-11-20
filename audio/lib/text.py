"""Scripture text for the library fill: the 66 books, the verse-per-line stores, the words spoken
and the words a transcript is scored against. Pure stdlib; no audio here.

The stored text is never rewritten. What Kokoro is given differs only in ways a listener cannot
see on a page: the KJV's [italic brackets] and RV1909's (parentheses) are dropped (the words inside
stay), ALL-CAPS words are said as ordinary words (LORD -> Lord), and the names in
audio/pronunciations.json are respelled so the engine says them right (QUALITY.md A03/A04).
"""
from __future__ import annotations

import json
import re
import unicodedata
import zipfile
from pathlib import Path

AUDIO = Path(__file__).resolve().parent.parent

# (code in the eBible vpl files, English name, Spanish name). The 66-book Protestant canon in order;
# the KJV file also carries the Apocrypha (1ES, TOB, ...), which is never voiced.
BOOKS = [
    ("GEN", "Genesis", "Génesis"), ("EXO", "Exodus", "Éxodo"), ("LEV", "Leviticus", "Levítico"),
    ("NUM", "Numbers", "Números"), ("DEU", "Deuteronomy", "Deuteronomio"), ("JOS", "Joshua", "Josué"),
    ("JDG", "Judges", "Jueces"), ("RUT", "Ruth", "Rut"), ("1SA", "First Samuel", "Primera de Samuel"),
    ("2SA", "Second Samuel", "Segunda de Samuel"), ("1KI", "First Kings", "Primera de Reyes"),
    ("2KI", "Second Kings", "Segunda de Reyes"), ("1CH", "First Chronicles", "Primera de Crónicas"),
    ("2CH", "Second Chronicles", "Segunda de Crónicas"), ("EZR", "Ezra", "Esdras"),
    ("NEH", "Nehemiah", "Nehemías"), ("EST", "Esther", "Ester"), ("JOB", "Job", "Job"),
    ("PSA", "Psalms", "Salmos"), ("PRO", "Proverbs", "Proverbios"), ("ECC", "Ecclesiastes", "Eclesiastés"),
    ("SOL", "Song of Solomon", "Cantares"), ("ISA", "Isaiah", "Isaías"), ("JER", "Jeremiah", "Jeremías"),
    ("LAM", "Lamentations", "Lamentaciones"), ("EZE", "Ezekiel", "Ezequiel"), ("DAN", "Daniel", "Daniel"),
    ("HOS", "Hosea", "Oseas"), ("JOE", "Joel", "Joel"), ("AMO", "Amos", "Amós"), ("OBA", "Obadiah", "Abdías"),
    ("JON", "Jonah", "Jonás"), ("MIC", "Micah", "Miqueas"), ("NAH", "Nahum", "Nahúm"),
    ("HAB", "Habakkuk", "Habacuc"), ("ZEP", "Zephaniah", "Sofonías"), ("HAG", "Haggai", "Hageo"),
    ("ZEC", "Zechariah", "Zacarías"), ("MAL", "Malachi", "Malaquías"), ("MAT", "Matthew", "Mateo"),
    ("MAR", "Mark", "Marcos"), ("LUK", "Luke", "Lucas"), ("JOH", "John", "Juan"), ("ACT", "Acts", "Hechos"),
    ("ROM", "Romans", "Romanos"), ("1CO", "First Corinthians", "Primera de Corintios"),
    ("2CO", "Second Corinthians", "Segunda de Corintios"), ("GAL", "Galatians", "Gálatas"),
    ("EPH", "Ephesians", "Efesios"), ("PHI", "Philippians", "Filipenses"), ("COL", "Colossians", "Colosenses"),
    ("1TH", "First Thessalonians", "Primera de Tesalonicenses"),
    ("2TH", "Second Thessalonians", "Segunda de Tesalonicenses"), ("1TI", "First Timothy", "Primera de Timoteo"),
    ("2TI", "Second Timothy", "Segunda de Timoteo"), ("TIT", "Titus", "Tito"), ("PHM", "Philemon", "Filemón"),
    ("HEB", "Hebrews", "Hebreos"), ("JAM", "James", "Santiago"), ("1PE", "First Peter", "Primera de Pedro"),
    ("2PE", "Second Peter", "Segunda de Pedro"), ("1JO", "First John", "Primera de Juan"),
    ("2JO", "Second John", "Segunda de Juan"), ("3JO", "Third John", "Tercera de Juan"), ("JUD", "Jude", "Judas"),
    ("REV", "Revelation", "Apocalipsis"),
]
CODES = [b[0] for b in BOOKS]
NAME = {b[0]: {"en": b[1], "es": b[2]} for b in BOOKS}

# Where the stored text lives (the brief folder; override with PBS_SCRIPTURE_DIR).
TRANSLATION = {"en": ("kjv", "kjv/kjv_vpl.zip", "eng-kjv_vpl.txt"),
               "es": ("rv1909", "rv1909/spaRV1909_vpl.zip", "spaRV1909_vpl.txt")}

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


def load_bible(lang: str, scripture_dir: Path) -> dict:
    _, rel, member = TRANSLATION[lang]
    with zipfile.ZipFile(scripture_dir / rel) as z:
        return parse_vpl(z.read(member).decode("utf-8").splitlines())


def load_pronunciations(path: Path | None = None) -> dict:
    return json.loads((path or AUDIO / "pronunciations.json").read_text("utf-8"))


_PLAIN = {"á": "a", "é": "e", "ó": "o", "ú": "u", "Á": "A", "É": "E", "Ó": "O", "Ú": "U"}
_CAPS = re.compile(r"\b([A-ZÁÉÍÓÚÑ]{2,})\b")


def speech_text(text: str, lang: str, pron: dict) -> str:
    """The words Kokoro is given for one stored verse (see the module note)."""
    s = text.replace("[", "").replace("]", "").replace("(", "").replace(")", "")
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
    s = unicodedata.normalize("NFD", text.lower())
    s = "".join(ch for ch in s if unicodedata.category(ch) != "Mn")
    s = re.sub(r"(\d),(\d)", r"\1\2", s)
    s = re.sub(r"\d+", lambda m: " " + number_words(int(m.group()), lang) + " ", s)
    s = re.sub(r"[^a-z0-9 ]+", " ", s.replace("-", " "))
    s = re.sub(r"\bfor ever\b", "forever", s)
    s = re.sub(r"\bto (day|morrow)\b", r"to\1", s)   # KJV "to day" / "to morrow" are heard as one word
    s = re.sub(r"\bcheek bone\b", "cheekbone", s)
    return [SAME_WORD.get(w, w) for w in s.split()]


# Old spellings a transcript writes the modern way, and "Selah" however it is heard. Applied to
# the script AND the transcript, so only the spelling is forgiven, never a missing word
# (Psalm 9, 18 Nov 2026: whisper small wrote hast -> haste x5, shew -> show, Selah -> sila).
SAME_WORD = {"haste": "hast", "shew": "show", "shewed": "showed", "shewn": "shown", "sheweth": "showeth",
             "marvellous": "marvelous", "alway": "always", "sila": "selah", "sheila": "selah", "sela": "selah",
             "seela": "selah", "seelah": "selah", "sayla": "selah", "cela": "selah",
             # British spellings in the story scripts that a transcript writes the American way
             "honoured": "honored", "honour": "honor", "armour": "armor", "colour": "color", "neighbour": "neighbor",
             "labour": "labor", "favour": "favor", "saviour": "savior", "behaviour": "behavior"}
