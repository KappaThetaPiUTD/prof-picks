"""Pull UTD grade distributions for a single course from the Nebula Labs API.

Usage:
    python ingest/nebula_grades.py cs3345
    python ingest/nebula_grades.py "CS 3345" --out data/cs3345.json

Requires NEBULA_API_KEY in the environment or in a .env file at the repo root.
"""

import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict
from pathlib import Path

BASE_URL = "https://api.utdnebula.com"
REPO_ROOT = Path(__file__).resolve().parent.parent

# Index order of Section.grade_distribution, per UTDNebula/api-tools parser/gradeLoader.go.
# Older records may be shorter (no P/CR/NC/I), so always zip rather than index blindly.
GRADE_LABELS = ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-",
                "D+", "D", "D-", "F", "W", "P", "CR", "NC", "I"]
GPA_POINTS = {"A+": 4.0, "A": 4.0, "A-": 3.67, "B+": 3.33, "B": 3.0, "B-": 2.67,
              "C+": 2.33, "C": 2.0, "C-": 1.67, "D+": 1.33, "D": 1.0, "D-": 0.67, "F": 0.0}


def load_api_key():
    key = os.environ.get("NEBULA_API_KEY")
    if key:
        return key
    env_file = REPO_ROOT / ".env"
    if env_file.exists():
        for line in env_file.read_text().splitlines():
            name, _, value = line.partition("=")
            if name.strip() == "NEBULA_API_KEY":
                return value.strip().strip("'\"")
    sys.exit("NEBULA_API_KEY not set (export it or add it to .env)")


def parse_course(course):
    match = re.fullmatch(r"\s*([A-Za-z]{2,4})\s*(\d{4})\s*", course)
    if not match:
        sys.exit(f"Could not parse course '{course}', expected something like cs3345")
    return match.group(1).upper(), match.group(2)


class NebulaClient:
    def __init__(self, api_key):
        self.api_key = api_key
        self._professor_cache = {}

    def get(self, path, **params):
        url = f"{BASE_URL}{path}"
        if params:
            url += "?" + urllib.parse.urlencode(params)
        # Cloudflare in front of the API rejects the default Python-urllib user agent.
        headers = {"x-api-key": self.api_key, "Accept": "application/json", "User-Agent": "prof-picks/0.1"}
        req = urllib.request.Request(url, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                body = json.load(resp)
        except urllib.error.HTTPError as e:
            sys.exit(f"GET {url} failed: {e.code} {e.read().decode(errors='replace')}")
        return body.get("data")

    def course_sections(self, prefix, number):
        """Every section ever offered for the course, with professor data embedded."""
        return self.get("/course/sections/trends", subject_prefix=prefix, course_number=number) or []

    def professor(self, professor_id):
        if professor_id not in self._professor_cache:
            self._professor_cache[professor_id] = self.get(f"/professor/{professor_id}")
        return self._professor_cache[professor_id]


def label_distribution(raw):
    return {label: count for label, count in zip(GRADE_LABELS, raw or [])}


def summarize(dist):
    graded = sum(dist.get(g, 0) for g in GPA_POINTS)
    total = sum(dist.values())
    gpa = sum(GPA_POINTS[g] * dist.get(g, 0) for g in GPA_POINTS) / graded if graded else None
    a_count = sum(dist.get(g, 0) for g in ("A+", "A", "A-"))
    return {
        "total_students": total,
        "avg_gpa": round(gpa, 3) if gpa is not None else None,
        "pct_a": round(100 * a_count / graded, 1) if graded else None,
        "pct_w": round(100 * dist.get("W", 0) / total, 1) if total else None,
    }


def section_professors(client, section):
    details = section.get("professor_details")
    if not details:
        # Fall back to looking each professor up by id if the endpoint didn't embed them.
        details = [p for p in (client.professor(pid) for pid in section.get("professors") or []) if p]
    return [{"id": p.get("_id"), "name": f"{p.get('first_name', '')} {p.get('last_name', '')}".strip()}
            for p in details]


def build_dataset(client, prefix, number):
    sections = client.course_sections(prefix, number)

    section_rows = []
    by_professor = defaultdict(lambda: {"name": None, "sections": [], "grades": defaultdict(int)})

    for s in sections:
        dist = label_distribution(s.get("grade_distribution"))
        professors = section_professors(client, s)
        row = {
            "section_id": s.get("_id"),
            "section_number": s.get("section_number"),
            "semester": (s.get("academic_session") or {}).get("name"),
            "professors": [p["name"] for p in professors],
            "grade_distribution": dist,
            **summarize(dist),
        }
        section_rows.append(row)

        if not dist:
            continue  # no grades yet (e.g. current semester); still listed under sections
        for p in professors:
            agg = by_professor[p["id"] or p["name"]]
            agg["name"] = p["name"]
            agg["sections"].append(f"{row['semester']}.{row['section_number']}")
            for label, count in dist.items():
                agg["grades"][label] += count

    professors = []
    for pid, agg in by_professor.items():
        dist = {label: agg["grades"].get(label, 0) for label in GRADE_LABELS}
        professors.append({
            "professor_id": pid,
            "name": agg["name"],
            "num_sections": len(agg["sections"]),
            "sections": sorted(agg["sections"]),
            "grade_distribution": dist,
            **summarize(dist),
        })

    professors.sort(key=lambda p: p["total_students"], reverse=True)
    section_rows.sort(key=lambda r: (r["semester"] or "", r["section_number"] or ""))
    return {"course": f"{prefix} {number}", "professors": professors, "sections": section_rows}


def print_summary(data):
    print(f"\n{data['course']}: {len(data['sections'])} sections, {len(data['professors'])} professors with grade data\n")
    print(f"{'Professor':<28}{'Secs':>5}{'Students':>10}{'GPA':>7}{'%A':>7}{'%W':>7}")
    for p in data["professors"]:
        fmt = lambda v: "-" if v is None else v
        print(f"{p['name'][:27]:<28}{p['num_sections']:>5}{p['total_students']:>10}"
              f"{fmt(p['avg_gpa']):>7}{fmt(p['pct_a']):>7}{fmt(p['pct_w']):>7}")


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("course", help="Course code, e.g. cs3345")
    parser.add_argument("--out", type=Path, help="Output JSON path (default: data/<course>.json)")
    args = parser.parse_args()

    prefix, number = parse_course(args.course)
    data = build_dataset(NebulaClient(load_api_key()), prefix, number)

    out = args.out or REPO_ROOT / "data" / f"{prefix.lower()}{number}.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(data, indent=2))

    print_summary(data)
    print(f"\nWrote {out}")


if __name__ == "__main__":
    main()
