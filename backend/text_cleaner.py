"""
CLARIO Clinical Input Text Cleaner
Derived from MEDI-KIOSK1 extraction module.
Cleans raw patient intake strings, medical notes, and pasted history
by normalizing whitespace, removing control characters, and cleaning noise.
"""
import re


def clean_clinical_text(raw_text: str) -> str:
    """
    Normalizes and cleans raw patient-entered or pasted medical text.
    - Normalizes line endings
    - Removes non-printable / control characters while preserving standard Unicode
    - Collapses 3+ line breaks down to double line break
    - Collapses consecutive spaces/tabs
    - Trims trailing spaces per line
    - Removes noise-only lines (e.g. sequences of dashes, pipes, tildes)
    """
    if not raw_text or not isinstance(raw_text, str):
        return ""

    text = raw_text

    # Normalize line endings
    text = text.replace("\r\n", "\n").replace("\r", "\n")

    # Remove non-printable / control characters
    text = "".join(ch for ch in text if ch.isprintable() or ch == "\n")

    # Collapse 3+ blank lines down to a double blank line
    text = re.sub(r"\n{3,}", "\n\n", text)

    # Collapse runs of spaces/tabs into a single space
    text = re.sub(r"[ \t]{2,}", " ", text)

    # Strip trailing whitespace on each line
    lines = [line.rstrip() for line in text.split("\n")]

    # Drop empty lines that are only stray punctuation/noise (e.g., "---", "___", "|")
    cleaned_lines = []
    for line in lines:
        stripped = line.strip()
        if stripped and re.fullmatch(r"[\-\_\.\|=~`*]+", stripped):
            continue
        cleaned_lines.append(line)

    text = "\n".join(cleaned_lines)
    return text.strip()
