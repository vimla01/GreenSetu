#!/usr/bin/env python3
"""Clean a GEE urban growth export into a final 2020-2025 CSV."""

from __future__ import annotations

import argparse
import csv
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Normalize a GEE urban growth export and round key fields."
    )
    parser.add_argument("--input", required=True, help="Input CSV exported from GEE")
    parser.add_argument("--output", required=True, help="Output cleaned CSV")
    return parser.parse_args()


def round_float(value: float) -> str:
    return f"{value:.4f}"


def main() -> None:
    args = parse_args()
    input_path = Path(args.input)
    output_path = Path(args.output)

    required_fields = [
        "year",
        "builtup_area_sq_km",
        "new_builtup_sq_km",
        "urban_growth_sq_km",
        "urban_growth_percent",
    ]

    with input_path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        if reader.fieldnames is None:
            raise ValueError("The input CSV has no header row.")

        missing = [field for field in required_fields if field not in reader.fieldnames]
        if missing:
            raise ValueError(f"Missing required field(s): {', '.join(missing)}")

        rows = []
        for row in reader:
            year = int(float(row["year"]))
            if year < 2020 or year > 2025:
                continue

            rows.append(
                {
                    "year": str(year),
                    "builtup_area_sq_km": round_float(float(row["builtup_area_sq_km"])),
                    "new_builtup_sq_km": round_float(float(row["new_builtup_sq_km"])),
                    "urban_growth_sq_km": round_float(float(row["urban_growth_sq_km"])),
                    "urban_growth_percent": round_float(float(row["urban_growth_percent"])),
                }
            )

    if not rows:
        raise ValueError("No rows found for years 2020-2025.")

    rows.sort(key=lambda item: int(item["year"]))

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=required_fields)
        writer.writeheader()
        writer.writerows(rows)

    print(f"Wrote cleaned CSV: {output_path}")


if __name__ == "__main__":
    main()
