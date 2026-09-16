"""
Turn a marked-up landmarks-review.txt (made by landmarks_to_text.py) back
into public/landmarks.json.

    python tools/text_to_landmarks.py                    -> reads landmarks-review.txt
    python tools/text_to_landmarks.py edited.txt         -> reads edited.txt
    python tools/text_to_landmarks.py edited.txt --check -> report only, write nothing

A site with no LATITUDE or LONGITUDE is reported and left out, since the
game cannot score a guess against it. Everything else is written in the
order it appears in the file.
"""
import io
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TARGET = ROOT / "public" / "landmarks.json"
DEFAULT_IN = ROOT / "landmarks-review.txt"

RULE_RE = re.compile(r"^#{8,}\s*$")
LABEL_RE = re.compile(r"^([A-Z][A-Z /]+?):\s?(.*)$")

# label in the text file -> (json field, kind)
SINGLE = {
    "TITLE": "title",
    "SHORT TITLE": "shortTitle",
    "PHOTO YEAR": "photoYear",
    "NOW PHOTO YEAR": "nowYear",
    "HINT": "hint",
    "HISTORIC LABEL": "historicLabel",
    "MODERN LABEL": "modernLabel",
    "LATITUDE": "lat",
    "LONGITUDE": "lng",
    "THEN PHOTO": "thenImage",
    "NOW PHOTO": "nowImage",
    "ARCHIVE LINK LABEL": "_linkLabel",
    "ARCHIVE LINK URL": "_linkUrl",
}
MULTI = {"HISTORY": "history", "FULL HISTORY": "fullHistory"}
INTEGER = {"photoYear", "nowYear"}
FLOAT = {"lat", "lng"}


def clean(text):
    """Normalise a multi-paragraph field: trim, collapse runs of blank lines."""
    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", text.strip())]
    return "\n\n".join(p for p in paragraphs if p)


def parse_block(lines, where):
    site = {}
    links = []
    pending_link = {}
    current_multi = None
    buffer = []

    def flush_multi():
        nonlocal current_multi, buffer
        if current_multi:
            site[current_multi] = clean("\n".join(buffer))
        current_multi, buffer = None, []

    for raw in lines:
        line = raw.rstrip("\r\n")
        m = LABEL_RE.match(line)
        label = m.group(1).strip() if m else None

        if label in MULTI:
            flush_multi()
            current_multi = MULTI[label]
            # anything typed on the same line as the label counts too
            if m.group(2).strip():
                buffer.append(m.group(2))
            continue

        if label in SINGLE:
            flush_multi()
            field, value = SINGLE[label], m.group(2).strip()
            if field == "_linkLabel":
                if pending_link:
                    links.append(pending_link)
                pending_link = {"label": value}
            elif field == "_linkUrl":
                pending_link["url"] = value
                links.append(pending_link)
                pending_link = {}
            else:
                site[field] = value
            continue

        if current_multi is not None:
            buffer.append(line)
        # otherwise: the "SITE n" line, a parenthesised note, or blank filler

    flush_multi()
    if pending_link:
        links.append(pending_link)
    site["archiveLinks"] = [
        l for l in links if l.get("label", "").strip() and l.get("url", "").strip()
    ]

    # Blank means "unknown"; numbers become numbers.
    for field in list(site):
        value = site[field]
        if isinstance(value, str) and value.strip() == "":
            site[field] = None
        if field in INTEGER and site[field] is not None:
            try:
                site[field] = int(str(site[field]).strip())
            except ValueError:
                raise SystemExit(f"{where}: {field} must be a whole year, got {value!r}")
        if field in FLOAT and site[field] is not None:
            try:
                site[field] = float(str(site[field]).strip())
            except ValueError:
                raise SystemExit(f"{where}: {field} must be a number, got {value!r}")
    return site


def to_json_site(site, ident):
    """Reproduce the field order the app has always used, dropping empties."""
    out = {
        "id": ident,
        "title": site.get("title") or "",
        "shortTitle": site.get("shortTitle") or site.get("title") or "",
        "photoYear": site.get("photoYear"),
        "nowYear": site.get("nowYear"),
        "lat": site["lat"],
        "lng": site["lng"],
        "hint": site.get("hint") or "",
        "history": site.get("history") or "",
        "historicLabel": site.get("historicLabel") or site.get("title") or "",
        "modernLabel": site.get("modernLabel") or "",
        "thenImage": site.get("thenImage"),
    }
    if site.get("nowImage"):
        out["nowImage"] = site["nowImage"]
    if site.get("fullHistory"):
        out["fullHistory"] = site["fullHistory"]
    out["archiveLinks"] = site.get("archiveLinks", [])
    if not out["thenImage"]:
        del out["thenImage"]
    return out


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    check_only = "--check" in sys.argv
    in_path = Path(args[0]) if args else DEFAULT_IN

    text = io.open(in_path, encoding="utf-8-sig").read()
    lines = text.splitlines()

    # Split into blocks on the ##### rules; the header before the first rule is dropped.
    blocks, current = [], None
    for line in lines:
        if RULE_RE.match(line):
            if current is not None and any(l.strip() for l in current):
                blocks.append(current)
            current = []
        elif current is not None:
            current.append(line)
    if current is not None and any(l.strip() for l in current):
        blocks.append(current)

    live, skipped = [], []
    for n, blk in enumerate(blocks, 1):
        site = parse_block(blk, f"site {n}")
        if not any(k for k in site if k != "archiveLinks") and not site["archiveLinks"]:
            continue  # just a "SITE n" banner between two rules
        name = site.get("title") or site.get("shortTitle") or f"site {n}"
        if site.get("lat") is None or site.get("lng") is None:
            skipped.append(name)
            continue
        live.append(to_json_site(site, len(live) + 1))

    print(f"read {in_path.name}: {len(live) + len(skipped)} sites in file")
    for s in live:
        flags = []
        if s["photoYear"] is None: flags.append("no photo year")
        if not s["hint"]: flags.append("no hint")
        if not s["history"]: flags.append("no history")
        if "nowImage" not in s: flags.append("no now photo")
        print(f"  in game : {s['shortTitle']:<18} {', '.join(flags) or 'complete'}")
    for name in skipped:
        print(f"  left out: {name:<18} no coordinates")

    if check_only:
        print("(--check: nothing written)")
        return
    io.open(TARGET, "w", encoding="utf-8").write(
        json.dumps(live, ensure_ascii=False, indent=2) + "\n"
    )
    print(f"wrote {TARGET.relative_to(ROOT)} with {len(live)} sites")


if __name__ == "__main__":
    main()
