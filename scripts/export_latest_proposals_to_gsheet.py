#!/usr/bin/env -S uv run
# /// script
# requires-python = ">=3.11"
# dependencies = ["requests>=2.32.0"]
# ///
"""Build the initial Google Sheets export for active GDC26 proposals.

This script reads Airtable and writes a JSON matrix suitable for:

    gog sheets update <sheetId> "'Sessions received '!A2:L90" \
      --values-json "$(cat /tmp/gdc_latest_proposals_values.json)" \
      --input USER_ENTERED
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from dataclasses import dataclass
from datetime import datetime
from typing import Any

import requests


BASE_ID = "appConzgqW3vehv4S"
TABLE_ID = "tblilHeWSOIQ0cs4C"
API_URL = f"https://api.airtable.com/v0/{BASE_ID}/{TABLE_ID}"

FIELDS = [
    "Contact Name",
    "Contact Email",
    "Session Title",
    "Co-Organizers",
    "Submission ID",
    "Estimated Room Capacity",
    "Proposed Speakers and Moderators",
    "Short Summary",
    "Public/Private Balance",
    "parent_submission_id",
    "superseded",
    "new_update_url",
    "Submitted At",
]

HEADERS = [
    "Contact Name",
    "Contact Email",
    "Session Title",
    "Co-Organizers",
    "Submission ID",
    "Estimated Room Capacity",
    "Proposed Speakers and Moderators",
    "Short Summary",
    "update_url",
    "Public/Private Balance",
    "Root Submission ID",
    "Superseded",
]


@dataclass(frozen=True)
class Record:
    id: str
    fields: dict[str, Any]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default="/tmp/gdc_latest_proposals_values.json")
    parser.add_argument("--include-tests", action="store_true")
    args = parser.parse_args()

    token = os.environ.get("AIRTABLE_API_TOKEN")
    if not token:
        print("AIRTABLE_API_TOKEN is not set", file=sys.stderr)
        return 2

    records = fetch_records(token)
    by_id = {record.id: record for record in records}

    active_records = [
        record
        for record in records
        if not truthy(record.fields.get("superseded"))
        and (args.include_tests or not is_test_record(record))
    ]

    rows = [HEADERS]
    for record in sorted(active_records, key=submitted_at):
        rows.append(record_to_row(record, by_id))

    with open(args.output, "w", encoding="utf-8") as file:
        json.dump(rows, file, ensure_ascii=False)

    print(
        json.dumps(
            {
                "output": args.output,
                "total_records": len(records),
                "active_exported": len(active_records),
                "test_records_excluded": len(
                    [
                        record
                        for record in records
                        if not truthy(record.fields.get("superseded"))
                        and is_test_record(record)
                    ]
                ),
                "rows_including_header": len(rows),
            },
            indent=2,
        )
    )
    return 0


def fetch_records(token: str) -> list[Record]:
    headers = {"Authorization": f"Bearer {token}"}
    params: list[tuple[str, str]] = [("pageSize", "100")]
    for field in FIELDS:
        params.append(("fields[]", field))

    records: list[Record] = []
    offset = None

    while True:
        request_params = list(params)
        if offset:
            request_params.append(("offset", offset))

        response = requests.get(API_URL, headers=headers, params=request_params, timeout=30)
        response.raise_for_status()
        data = response.json()
        records.extend(Record(item["id"], item.get("fields", {})) for item in data["records"])

        offset = data.get("offset")
        if not offset:
            return records


def record_to_row(record: Record, by_id: dict[str, Record]) -> list[str]:
    fields = record.fields
    return [
        cell_text(fields.get("Contact Name")),
        cell_text(fields.get("Contact Email")),
        cell_text(fields.get("Session Title")),
        cell_text(fields.get("Co-Organizers")),
        record.id,
        cell_text(fields.get("Estimated Room Capacity")),
        cell_text(fields.get("Proposed Speakers and Moderators")),
        cell_text(fields.get("Short Summary")),
        cell_text(fields.get("new_update_url")),
        cell_text(fields.get("Public/Private Balance")),
        root_submission_id(record, by_id),
        "TRUE" if truthy(fields.get("superseded")) else "",
    ]


def root_submission_id(record: Record, by_id: dict[str, Record]) -> str:
    current = record
    seen: set[str] = set()

    while current.id not in seen:
        seen.add(current.id)
        parent_id = str(current.fields.get("parent_submission_id") or "").strip()
        if not parent_id or parent_id not in by_id:
            return current.id
        current = by_id[parent_id]

    return record.id


def submitted_at(record: Record) -> datetime:
    value = record.fields.get("Submitted At")
    if not value:
        return datetime.min
    return datetime.fromisoformat(str(value).replace("Z", "+00:00"))


def cell_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, list):
        return ", ".join(cell_text(item) for item in value)
    if isinstance(value, dict):
        return str(value.get("name") or value.get("id") or "")
    return str(value)


def truthy(value: Any) -> bool:
    return value is True or str(value).lower() == "true"


def is_test_record(record: Record) -> bool:
    title = cell_text(record.fields.get("Session Title")).lower()
    email = cell_text(record.fields.get("Contact Email")).lower()
    return title.startswith("test - ignore") or email == "gaitan@gmail.com"


if __name__ == "__main__":
    raise SystemExit(main())
