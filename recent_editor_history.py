#!/usr/bin/env python3
"""
recent_editor_history.py

Extract recently opened folders/workspaces from VS Code's state.vscdb and Cursor's state.vscdb,
check whether paths exist, and sort by filesystem last-modified time.

Usage:
  python recent_editor_history.py          # auto-detects common DB location
  python recent_editor_history.py --db /path/to/state.vscdb
  python recent_editor_history.py --json   # output JSON

"""
import argparse
import sqlite3
import json
import os
import shutil
import sys
import tempfile
import time
import subprocess
from urllib.parse import urlparse, unquote


def default_db_paths():
    home = os.path.expanduser("~")
    paths = []
    if sys.platform.startswith("darwin"):
        paths += [
            os.path.join(home, "Library", "Application Support", "Code", "User", "globalStorage", "state.vscdb"),
            os.path.join(home, "Library", "Application Support", "Code - Insiders", "User", "globalStorage", "state.vscdb"),
        ]
    elif os.name == "nt":
        appdata = os.environ.get("APPDATA", "")
        paths += [
            os.path.join(appdata, "Code", "User", "globalStorage", "state.vscdb"),
            os.path.join(appdata, "Code - Insiders", "User", "globalStorage", "state.vscdb"),
        ]
    else:
        paths += [
            os.path.join(home, ".config", "Code", "User", "globalStorage", "state.vscdb"),
            os.path.join(home, ".config", "Code - Insiders", "User", "globalStorage", "state.vscdb"),
        ]
    return [p for p in paths if os.path.exists(p)]


def copy_db(src):
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".vscdb")
    tmp.close()
    shutil.copy2(src, tmp.name)
    return tmp.name


def uri_to_path(uri):
    if not uri:
        return None
    # Some entries may be plain workspace objects or strings
    if isinstance(uri, dict):
        # try common keys
        v = uri.get("configPath") or uri.get("id") or None
        if not v:
            return None
        uri = v
    if not isinstance(uri, str):
        return None
    # handle file:// URIs
    if uri.startswith("file://"):
        p = unquote(urlparse(uri).path)
        # On Windows, path may start with /C:/...
        if os.name == "nt" and p.startswith("/") and len(p) > 2 and p[2] == ":":
            p = p.lstrip("/")
        return p
    # sometimes workspaces are stored as plain paths already
    return uri


def query_history(db_path):
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    try:
        cur.execute("SELECT value FROM ItemTable WHERE key = 'history.recentlyOpenedPathsList'")
    except sqlite3.OperationalError:
        # Try different table name or column layout if DB schema differs
        try:
            cur.execute("SELECT value FROM item_table WHERE key = 'history.recentlyOpenedPathsList'")
        except Exception:
            conn.close()
            raise
    row = cur.fetchone()
    conn.close()
    if not row:
        return None
    raw = row[0]
    if isinstance(raw, (bytes, bytearray)):
        raw = raw.decode("utf-8", errors="replace")
    return json.loads(raw)


def collect_entries(data):
    out = []
    for entry in data.get("entries", []):
        uri = None
        if isinstance(entry, dict):
            uri = entry.get("folderUri") or entry.get("fileUri") or entry.get("workspace")
        else:
            uri = entry
        path = uri_to_path(uri)
        if not path:
            continue
        exists = os.path.exists(path)
        mtime = None
        try:
            if exists:
                mtime = os.path.getmtime(path)
        except Exception:
            mtime = None
        out.append({"path": path, "exists": exists, "mtime": mtime, "source": "vscode"})
    return out


def print_human(entries):
    for e in entries:
        m = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(e["mtime"])) if e["mtime"] else "N/A"
        flag = "exists" if e["exists"] else "missing"
        src = e.get("source", "-")
        print(f"{m}  [{flag}]  ({src}) {e['path']}")


def collect_entries_from_data(data, source="vscode"):
    out = []
    for entry in data.get("entries", []):
        uri = None
        if isinstance(entry, dict):
            uri = entry.get("folderUri") or entry.get("fileUri") or entry.get("workspace")
        else:
            uri = entry
        path = uri_to_path(uri)
        if not path:
            continue
        exists = os.path.exists(path)
        mtime = None
        try:
            if exists:
                mtime = os.path.getmtime(path)
        except Exception:
            mtime = None
        out.append({"path": path, "exists": exists, "mtime": mtime, "source": source})
    return out


def main():
    ap = argparse.ArgumentParser(description="Extract VS Code recently opened folders/workspaces.")
    ap.add_argument("--db", "-d", help="Path to state.vscdb (will auto-detect if omitted).")
    ap.add_argument("--json", "-j", action="store_true", help="Output JSON instead of human-readable lines.")
    ap.add_argument("--detect-editors", action="store_true", help="Detect VS Code and Cursor installs (CLI and app bundles) and print them then exit.")
    ap.add_argument("--include-cursor", action="store_true", help="Also find and parse Cursor's recent projects and include them in the output.")
    args = ap.parse_args()

    if args.detect_editors:
        info = detect_editors()
        if args.json:
            print(json.dumps(info, indent=2, ensure_ascii=False))
        else:
            print_editors(info)
        sys.exit(0)

    db_candidates = [args.db] if args.db else default_db_paths()
    if not db_candidates:
        print("state.vscdb not found in default locations. Use --db to specify its path.", file=sys.stderr)
        sys.exit(2)

    db_src = db_candidates[0]
    if not os.path.exists(db_src):
        print(f"Database not found: {db_src}", file=sys.stderr)
        sys.exit(2)

    try:
        db_copy = copy_db(db_src)
    except Exception as ex:
        print(f"Failed to copy DB: {ex}", file=sys.stderr)
        sys.exit(1)

    try:
        data = query_history(db_copy)
    except Exception as ex:
        print(f"Failed to read DB: {ex}", file=sys.stderr)
        os.unlink(db_copy)
        sys.exit(1)
    finally:
        try:
            os.unlink(db_copy)
        except Exception:
            pass

    if not data:
        print("No 'history.recentlyOpenedPathsList' entry found.", file=sys.stderr)
        sys.exit(0)

    entries = collect_entries(data)
    # Sort by mtime descending; treat None as 0 so they go last
    entries.sort(key=lambda x: x["mtime"] or 0, reverse=True)

    # Optionally include Cursor projects
    if getattr(args, "include_cursor", False):
        cursor_dbs = find_cursor_db_candidates()
        for db in cursor_dbs:
            try:
                cdata = query_history(db)
            except Exception:
                cdata = None
            if cdata:
                centries = collect_entries_from_data(cdata, source="cursor")
                entries.extend(centries)

    # Sort combined entries by mtime descending
    entries.sort(key=lambda x: x["mtime"] or 0, reverse=True)

    if args.json:
        print(json.dumps(entries, indent=2, ensure_ascii=False))
    else:
        print_human(entries)


def which(name):
    """Cross-platform wrapper around shutil.which"""
    return shutil.which(name)


def detect_editors():
    """Detect VS Code and Cursor installations (CLI and .app bundles on macOS)."""
    out = {"vscode": {"cli": None, "apps": []}, "cursor": {"cli": None, "apps": []}}

    # CLI
    out["vscode"]["cli"] = which("code")
    out["cursor"]["cli"] = which("cursor")

    # Common app bundle locations (macOS)
    home = os.path.expanduser("~")
    if sys.platform.startswith("darwin"):
        candidates = [
            "/Applications/Visual Studio Code.app",
            os.path.join(home, "Applications", "Visual Studio Code.app"),
            "/Applications/Visual Studio Code - Insiders.app",
            os.path.join(home, "Applications", "Visual Studio Code - Insiders.app"),
        ]
        for p in candidates:
            if os.path.exists(p):
                out["vscode"]["apps"].append(p)

        cands = [
            "/Applications/Cursor.app",
            os.path.join(home, "Applications", "Cursor.app"),
        ]
        for p in cands:
            if os.path.exists(p):
                out["cursor"]["apps"].append(p)

        # If nothing found for vscode, try Spotlight (mdfind)
        if not out["vscode"]["apps"]:
            try:
                r = subprocess.run(["mdfind", "kMDItemFSName == 'Visual Studio Code.app'"], capture_output=True, text=True)
                for line in r.stdout.splitlines():
                    if line and os.path.exists(line):
                        out["vscode"]["apps"].append(line)
            except Exception:
                pass

        if not out["cursor"]["apps"]:
            try:
                r = subprocess.run(["mdfind", "kMDItemFSName == 'Cursor.app'"], capture_output=True, text=True)
                for line in r.stdout.splitlines():
                    if line and os.path.exists(line):
                        out["cursor"]["apps"].append(line)
            except Exception:
                pass

    else:
        # Linux / Windows heuristics
        if os.name == "nt":
            pf = os.environ.get("ProgramFiles", "C:\\Program Files")
            pf_x86 = os.environ.get("ProgramFiles(x86)", os.path.join(os.environ.get("SystemDrive", "C:"), "Program Files (x86)"))
            cands = [
                os.path.join(pf, "Microsoft VS Code", "Code.exe"),
                os.path.join(pf_x86, "Microsoft VS Code", "Code.exe"),
            ]
            for p in cands:
                if os.path.exists(p):
                    out["vscode"]["apps"].append(p)
            # Cursor may be installed under Program Files as well
            for root in (pf, pf_x86):
                p = os.path.join(root, "Cursor", "cursor.exe")
                if os.path.exists(p):
                    out["cursor"]["apps"].append(p)
        else:
            # Linux
            linux_cands = [
                "/usr/share/code",
                "/usr/share/visual-studio-code",
                "/opt/visual-studio-code",
                "/snap/bin/code",
            ]
            for p in linux_cands:
                if os.path.exists(p):
                    out["vscode"]["apps"].append(p)

    return out


def print_editors(info):
    def p(name, data):
        print(f"{name} CLI: {data.get('cli') or 'not found'}")
        apps = data.get('apps') or []
        if apps:
            print(f"{name} apps:")
            for a in apps:
                print(f"  {a}")
        else:
            print(f"{name} apps: none found")
        print()

    p('VS Code', info.get('vscode', {}))
    p('Cursor', info.get('cursor', {}))


def find_cursor_db_candidates():
    """Return list of possible Cursor state DB paths (macOS/Linux/Windows heuristics)."""
    home = os.path.expanduser("~")
    cands = []
    if sys.platform.startswith("darwin"):
        cands += [
            os.path.join(home, "Library", "Application Support", "Cursor", "User", "globalStorage", "state.vscdb"),
            os.path.join(home, "Library", "Application Support", "Cursor", "globalStorage", "state.vscdb"),
            os.path.join(home, "Library", "Application Support", "Cursor", "state.vscdb"),
        ]
    elif os.name == "nt":
        appdata = os.environ.get("APPDATA", "")
        cands += [os.path.join(appdata, "Cursor", "User", "globalStorage", "state.vscdb"), os.path.join(appdata, "Cursor", "globalStorage", "state.vscdb")]
    else:
        cands += [
            os.path.join(home, ".config", "Cursor", "User", "globalStorage", "state.vscdb"),
            os.path.join(home, ".config", "Cursor", "globalStorage", "state.vscdb"),
        ]
    return [p for p in cands if os.path.exists(p)]


if __name__ == "__main__":
    main()
