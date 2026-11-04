#!/usr/bin/env python3
"""Fetch UTD grade distributions for one course from the Nebula Labs API."""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


API_ROOT = "https://api.utdnebula.com"
class NebulaAPI:
    def __init__(self, api_key: str, base_url: str = API_ROOT) -> None:
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key

    def get(self, path: str, params: dict[str, str] | None = None):
        url = f"{self.base_url}/{path.lstrip('/')}"
        if params:
            url += "?" + urlencode(params)
        req = Request(url, headers={
            "x-api-key": self.api_key,
            "Accept": "application/json",
            "User-Agent": "nebula-course-grades-ingestor/1.0",
        })
        try:
            with urlopen(req, timeout=30) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"Nebula API returned HTTP {exc.code} for {path}: {detail[:500]}") from exc
        except (URLError, TimeoutError) as exc:
            raise RuntimeError(f"Could not connect to Nebula API: {exc}") from exc
        if isinstance(payload, dict) and "data" in payload:
            return payload["data"]
        return payload


def as_list(value):
    if isinstance(value, list):
        return value
    if value is None:
        return []
    return [value]


def item_id(item) -> str | None:
    value = item.get("_id", item.get("id")) if isinstance(item, dict) else item
    return str(value) if value is not None else None


def grade_payload(api: NebulaAPI, params: dict[str, str]):
    return api.get("grades/overall", params)


def main() -> int:
    parser = argparse.ArgumentParser(description="Download one course's overall, professor, and section grade distributions.")
    parser.add_argument("course", nargs="?", default="CS3345", help="Course code, e.g. CS3345 (default: CS3345)")
    parser.add_argument("-o", "--output", default=None, help="Output JSON path (default: <course>_grades.json)")
    parser.add_argument("--base-url", default=os.getenv("NEBULA_API_BASE_URL", API_ROOT), help=argparse.SUPPRESS)
    args = parser.parse_args()

    match = re.fullmatch(r"\s*([A-Za-z]+)\s*[- ]?\s*(\d+[A-Za-z]?)\s*", args.course)
    if not match:
        parser.error("course must look like CS3345 or CS 3345")
    prefix, number = match.group(1).upper(), match.group(2).upper()
    # Keep credentials out of source files; supply them through the process environment.
    key = os.getenv("NEBULA_API_KEY")
    if not key:
        print("Set NEBULA_API_KEY in your environment before running this script.", file=sys.stderr)
        return 2

    api = NebulaAPI(key, args.base_url)
    query = {"subject_prefix": prefix, "course_number": number}
    grade_query = {"prefix": prefix, "number": number}
    try:
        courses = as_list(api.get("course", query))
        courses = [c for c in courses if isinstance(c, dict)
                   and str(c.get("subject_prefix", "")).upper() == prefix
                   and str(c.get("course_number", "")).upper() == number]
        if not courses:
            raise RuntimeError(f"No exact course match found for {prefix} {number}.")
        course = courses[0]
        cid = item_id(course)
        if not cid:
            raise RuntimeError("Course record did not include an ID.")

        sections = as_list(api.get(f"course/{cid}/sections"))
        professors = as_list(api.get(f"course/{cid}/professors"))
        # Some API versions return section IDs; hydrate those to read section numbers.
        hydrated_sections = []
        for section in sections:
            if isinstance(section, dict) and (section.get("section_number") or section.get("_id")):
                hydrated_sections.append(section)
            else:
                sid = item_id(section)
                if sid:
                    hydrated_sections.extend(as_list(api.get(f"section/{sid}")))

        result = {
            "fetched_at": datetime.now(timezone.utc).isoformat(),
            "course": {"id": cid, "code": f"{prefix} {number}", "title": course.get("title")},
            "overall_grade_distribution": grade_payload(api, grade_query),
            "professors": [],
            "sections": [],
        }

        for professor in professors:
            if not isinstance(professor, dict):
                continue
            first = professor.get("first_name", "")
            last = professor.get("last_name", "")
            params = {**grade_query, "first_name": first, "last_name": last}
            result["professors"].append({
                "id": item_id(professor), "name": " ".join(p for p in (first, last) if p),
                "grade_distribution": grade_payload(api, params),
            })
            time.sleep(0.05)

        for section in hydrated_sections:
            if not isinstance(section, dict):
                continue
            section_number = str(section.get("section_number", ""))
            params = {**grade_query, "section_number": section_number} if section_number else None
            result["sections"].append({
                "id": item_id(section), "section_number": section_number or None,
                "academic_session": section.get("academic_session"),
                "grade_distribution": grade_payload(api, params) if params else section.get("grade_distribution"),
            })
            time.sleep(0.05)

        output = Path(args.output or f"{prefix.lower()}{number}_grades.json")
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"Saved {len(result['professors'])} professor and {len(result['sections'])} section records to {output}")
        return 0
    except (RuntimeError, KeyError, TypeError, ValueError) as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
