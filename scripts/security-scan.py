#!/usr/bin/env python3
"""
Security scanner for the blood donor platform.

Checks the mechanical subset of the ten non-negotiable rules in
CLAUDE.md/AGENTS.md. This is the portable half of Claude Code's
"security-review" skill - the skill also has a judgment checklist
(phone-number exposure, region scoping, donation-confirmation authority,
etc.) that this script cannot check and a human/agent must still read the
diff for. Run this before every milestone review gate (Units 06, 15, 32,
45, 54, 58) regardless of which coding tool is in use - it has no
Claude-specific dependencies, just the standard library.

Usage:
    python3 scripts/security-scan.py [path] [--json]

Exits 1 if any BLOCKER is found, 0 otherwise.
Standard library only.
"""

import json
import os
import re
import sys

SKIP_DIRS = {
    "node_modules", ".next", ".git", "dist", "build", "coverage",
    ".vercel", ".turbo", "out", "__pycache__", ".claude",
}
CODE_EXT = {".ts", ".tsx", ".js", ".jsx", ".mjs"}
SQL_EXT = {".sql"}

findings = []
_seen = set()


def add(severity, rule, path, line, message, fix):
    key = (rule, path, line, message)
    if key in _seen:
        return
    _seen.add(key)
    findings.append({
        "severity": severity,
        "rule": rule,
        "file": path,
        "line": line,
        "message": message,
        "fix": fix,
    })


def walk(root):
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for name in filenames:
            yield os.path.join(dirpath, name)


def rel(root, path):
    try:
        return os.path.relpath(path, root)
    except ValueError:
        return path


def line_of(text, index):
    return text.count("\n", 0, index) + 1


def is_client_component(text):
    head = text[:400]
    return bool(re.search(r"""^\s*['"]use client['"]""", head, re.M))


# --------------------------------------------------------------------------
# Checks
# --------------------------------------------------------------------------

def check_client_server_leak(root, path, text):
    """Rule 1 — the browser never touches the database."""
    if not is_client_component(text):
        return
    patterns = [
        (r"SUPABASE_SERVICE_ROLE\w*", "service role key referenced in a client component"),
        (r"service_role", "service_role referenced in a client component"),
        (r"""from\s+['"][^'"]*lib/db[^'"]*['"]""", "client component imports from lib/db"),
        (r"createClient\s*\(", "Supabase client constructed inside a client component"),
        (r"""from\s+['"]@supabase/supabase-js['"]""", "client component imports supabase-js directly"),
    ]
    for pat, msg in patterns:
        for m in re.finditer(pat, text):
            add("BLOCKER", 1, rel(root, path), line_of(text, m.start()), msg,
                "Move this to a server route or server action. The browser must never hold DB access.")


def check_secrets(root, path, text):
    """Committed credentials."""
    for m in re.finditer(r"eyJ[A-Za-z0-9_\-]{20,}\.[A-Za-z0-9_\-]{10,}", text):
        add("BLOCKER", 1, rel(root, path), line_of(text, m.start()),
            "what looks like a JWT is committed to the repo",
            "Rotate the key immediately and move it to server-only env.")
    for m in re.finditer(r"(SERVICE_ROLE|SECRET|PRIVATE_KEY)\w*\s*=\s*['\"][^'\"\s]{12,}", text):
        add("BLOCKER", 1, rel(root, path), line_of(text, m.start()),
            "hardcoded secret assignment",
            "Move to env; never commit.")


def check_client_supplied_id(root, path, text):
    """Rule 2 — never accept a client-supplied primary key."""
    for m in re.finditer(r"\.insert\s*\(", text):
        window = text[m.start(): m.start() + 500]
        idm = re.search(r"\bid\s*:", window)
        if idm:
            add("WARNING", 2, rel(root, path), line_of(text, m.start()),
                "insert payload sets an `id` field",
                "Confirm this UUID is generated server-side, not taken from the request body.")
    for m in re.finditer(r"\bid\s*:\s*(?:body|req|request|input|payload|params|searchParams)\.", text):
        add("BLOCKER", 2, rel(root, path), line_of(text, m.start()),
            "primary key taken from client input",
            "Generate the UUID server-side. This is how the previous codebase got stored XSS.")


def check_unpaginated(root, path, text):
    """Rule 4 — never fetch a whole table."""
    for m in re.finditer(r"\.select\s*\(", text):
        window = text[m.start(): m.start() + 400]
        if re.search(r"\.(limit|range|single|maybeSingle)\s*\(", window):
            continue
        if re.search(r"count\s*:\s*['\"]exact['\"]", window):
            continue
        add("WARNING", 4, rel(root, path), line_of(text, m.start()),
            "select without limit, range, or single",
            "Add pagination. At district scale an unbounded select is a multi-MB payload on a 3G phone.")


def check_phone_exposure(root, path, text):
    """Rule 3 — phone numbers pass through one serialisation layer."""
    normalised = rel(root, path).replace("\\", "/")
    if "lib/serialise" in normalised or "lib/serialize" in normalised:
        return
    for m in re.finditer(r"\.select\s*\(\s*[`'\"]([^`'\"]*)[`'\"]", text):
        cols = m.group(1)
        if re.search(r"\bphone\b", cols) or cols.strip() == "*":
            what = "select('*') may include phone" if cols.strip() == "*" else "phone selected outside lib/serialise"
            add("WARNING", 3, rel(root, path), line_of(text, m.start()), what,
                "Route donor output through lib/serialise. The phone rule must live in exactly one place.")


def check_browser_storage(root, path, text):
    """Session material in browser storage."""
    for m in re.finditer(r"(localStorage|sessionStorage)\s*\.\s*setItem\s*\(\s*['\"]([^'\"]+)", text):
        key = m.group(2).lower()
        if any(w in key for w in ("token", "auth", "session", "jwt", "key", "otp", "phone")):
            add("BLOCKER", 1, rel(root, path), line_of(text, m.start()),
                f"credential-like value written to {m.group(1)} (key: {m.group(2)})",
                "Use httpOnly cookies for session material.")


def check_forbidden_fields(root, path, text):
    """Rule 7 — never store diagnosis, hospital record numbers, or doctor names."""
    banned = [
        (r"\bdiagnosis\b", "diagnosis"),
        (r"\bdoctor_?name\b", "doctor name"),
        (r"\bdoctor\b\s*:", "doctor field"),
        (r"\bhospital_?record\b", "hospital record number"),
        (r"\bmedical_?notes?\b", "medical notes"),
        (r"\bpatient_?condition\b", "patient condition"),
    ]
    for pat, label in banned:
        for m in re.finditer(pat, text, re.I):
            add("BLOCKER", 7, rel(root, path), line_of(text, m.start()),
                f"forbidden field: {label}",
                "Store blood group, units, contact phone and patient first name only.")


def check_hardcoded_timings(root, path, text):
    """Timing parameters belong in app_settings."""
    pat = r"\b(escalat\w*|expiry|expires?_\w*|cooldown|timeout_\w*|notification_cap|freshness\w*)\s*[:=]\s*\d+"
    for m in re.finditer(pat, text, re.I):
        add("WARNING", 10, rel(root, path), line_of(text, m.start()),
            "timing parameter appears hardcoded",
            "Move to the app_settings table — these are tuned by non-developers.")


def check_pii_in_url(root, path, text):
    for m in re.finditer(r"searchParams\.set\s*\(\s*['\"](phone|mobile|name|patient\w*|dob)['\"]", text, re.I):
        add("BLOCKER", 3, rel(root, path), line_of(text, m.start()),
            "personal data placed in a URL query string",
            "Pass it in the request body. URLs end up in logs and referrers.")


def check_sql(root, path, text):
    """Migration-level checks."""
    if re.search(r"create\s+table", text, re.I):
        if re.search(r"\bid\s+text\s+primary\s+key", text, re.I):
            m = re.search(r"\bid\s+text\s+primary\s+key", text, re.I)
            add("BLOCKER", 2, rel(root, path), line_of(text, m.start()),
                "text primary key — client-supplied IDs were the XSS vector in the old codebase",
                "Use uuid primary key default gen_random_uuid().")
        for m in re.finditer(r"create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?(\w+)", text, re.I):
            table = m.group(1)
            if not re.search(rf"alter\s+table\s+(?:public\.)?{table}\s+enable\s+row\s+level\s+security",
                             text, re.I):
                add("WARNING", 1, rel(root, path), line_of(text, m.start()),
                    f"table `{table}` created without RLS enabled in the same migration",
                    "Enable RLS as defence in depth even though access is server-side.")
    for m in re.finditer(r"with\s+check\s*\(\s*true\s*\)", text, re.I):
        add("BLOCKER", 1, rel(root, path), line_of(text, m.start()),
            "policy with check (true) — unrestricted write",
            "This is exactly what allowed forged donation records in the prototype.")
    check_forbidden_fields(root, path, text)


def check_i18n_parity(root):
    """Rule 8 — every string exists in both languages."""
    en_files, kn_files = [], []
    for path in walk(root):
        base = os.path.basename(path).lower()
        if base in ("en.json", "english.json"):
            en_files.append(path)
        elif base in ("kn.json", "kannada.json"):
            kn_files.append(path)
    if not en_files or not kn_files:
        return

    def keys(obj, prefix=""):
        out = set()
        if isinstance(obj, dict):
            for k, v in obj.items():
                out |= keys(v, f"{prefix}{k}.")
        else:
            out.add(prefix.rstrip("."))
        return out

    def load(p):
        try:
            with open(p, encoding="utf-8") as fh:
                return keys(json.load(fh))
        except Exception:
            return set()

    en = set().union(*(load(p) for p in en_files))
    kn = set().union(*(load(p) for p in kn_files))
    missing = sorted(en - kn)
    if missing:
        shown = ", ".join(missing[:8]) + (f" (+{len(missing) - 8} more)" if len(missing) > 8 else "")
        add("BLOCKER", 8, rel(root, kn_files[0]), 0,
            f"{len(missing)} key(s) missing from Kannada: {shown}",
            "Every user-facing string needs both en and kn.")
    extra = sorted(kn - en)
    if extra:
        add("INFO", 8, rel(root, en_files[0]), 0,
            f"{len(extra)} key(s) in Kannada but not English",
            "Probably stale. Remove or add the English counterpart.")


def check_public_search_auth(root, path, text):
    """Rule 6 — search stays public."""
    normalised = rel(root, path).replace("\\", "/")
    if "(public)" not in normalised:
        return
    for pat, msg in [
        (r"redirect\s*\(\s*['\"][^'\"]*(login|signin|register)", "redirect to login in a public route"),
        (r"requireAuth|requireUser|getSessionOrThrow", "auth guard in a public route"),
    ]:
        for m in re.finditer(pat, text, re.I):
            add("BLOCKER", 6, rel(root, path), line_of(text, m.start()), msg,
                "Search must work logged out. Only raising a request requires OTP.")


# --------------------------------------------------------------------------

def main():
    # Windows' default console codepage (cp1252) can't encode the → used
    # below, which crashes the whole scan with a UnicodeEncodeError before
    # any findings print. Force UTF-8 out; safe no-op on platforms where
    # stdout is already UTF-8.
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    as_json = "--json" in sys.argv
    root = os.path.abspath(args[0]) if args else os.getcwd()

    if not os.path.isdir(root):
        print(f"Not a directory: {root}")
        return 2

    scanned = 0
    for path in walk(root):
        ext = os.path.splitext(path)[1].lower()
        if ext not in CODE_EXT and ext not in SQL_EXT:
            continue
        try:
            with open(path, encoding="utf-8", errors="ignore") as fh:
                text = fh.read()
        except OSError:
            continue
        scanned += 1

        if ext in SQL_EXT:
            check_sql(root, path, text)
            continue

        check_client_server_leak(root, path, text)
        check_secrets(root, path, text)
        check_client_supplied_id(root, path, text)
        check_unpaginated(root, path, text)
        check_phone_exposure(root, path, text)
        check_browser_storage(root, path, text)
        check_forbidden_fields(root, path, text)
        check_hardcoded_timings(root, path, text)
        check_pii_in_url(root, path, text)
        check_public_search_auth(root, path, text)

    check_i18n_parity(root)

    if as_json:
        print(json.dumps({"scanned": scanned, "findings": findings}, indent=2))
        return 1 if any(f["severity"] == "BLOCKER" for f in findings) else 0

    order = {"BLOCKER": 0, "WARNING": 1, "INFO": 2}
    findings.sort(key=lambda f: (order[f["severity"]], f["rule"], f["file"], f["line"]))

    print(f"\nScanned {scanned} file(s) under {root}\n")
    if not findings:
        print("No mechanical violations found.")
        print("Now complete the judgment checks in SKILL.md — the script cannot check those.\n")
        return 0

    current = None
    for f in findings:
        if f["severity"] != current:
            current = f["severity"]
            counts = sum(1 for x in findings if x["severity"] == current)
            print(f"\n{current}S ({counts})" if current != "INFO" else f"\nINFO ({counts})")
            print("-" * 60)
        loc = f"{f['file']}:{f['line']}" if f["line"] else f["file"]
        print(f"  [rule {f['rule']}] {loc}")
        print(f"      {f['message']}")
        print(f"      → {f['fix']}")

    blockers = sum(1 for f in findings if f["severity"] == "BLOCKER")
    print(f"\n{blockers} blocker(s). Judgment checks in SKILL.md still required.\n")
    return 1 if blockers else 0


if __name__ == "__main__":
    sys.exit(main())