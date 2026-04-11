#!/usr/bin/env python3
"""Clean a GEE mangrove export into a final 2020-2025 CSV."""

from __future__ import annotations

import argparse
import csv
from pathlib import Path
from typing import Iterable


PREFERRED_AREA_COLUMNS = (
    "mangrove_area_sq_km",
    "area_sq_km",
    "area_km2",
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Normalize a GEE mangrove export and compute reduction vs 2020."
    )
    parser.add_argument("--input", required=True, help="Input CSV exported from GEE")
    parser.add_argument("--output", required=True, help="Output cleaned CSV")
    return parser.parse_args()


def find_area_column(fieldnames: Iterable[str]) -> str:
    for column in PREFERRED_AREA_COLUMNS:
        if column in fieldnames:
            return column
    raise ValueError(
        "Could not find an area column. Expected one of: "
        + ", ".join(PREFERRED_AREA_COLUMNS)
    )


def round_float(value: float) -> str:
    return f"{value:.4f}"


def main() -> None:
    args = parse_args()
    input_path = Path(args.input)
    output_path = Path(args.output)

    with input_path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        if reader.fieldnames is None:
            raise ValueError("The input CSV has no header row.")

        area_column = find_area_column(reader.fieldnames)
        rows = []
        for row in reader:
            year_raw = row.get("year")
            if not year_raw:
                continue

            year = int(float(year_raw))
            if year < 2020 or year > 2025:
                continue

            area = float(row[area_column])
            rows.append({"year": year, "mangrove_area_sq_km": area})

    if not rows:
        raise ValueError("No rows found for years 2020-2025.")

    rows.sort(key=lambda item: item["year"])

    if rows[0]["year"] != 2020:
        raise ValueError("The input must include year 2020 so reduction can use it as the baseline.")

    baseline_area = rows[0]["mangrove_area_sq_km"]
    cleaned_rows = []
    warnings = []

    for row in rows:
        area = row["mangrove_area_sq_km"]
        reduction_sq_km = baseline_area - area
        reduction_percent = 0.0 if baseline_area == 0 else (reduction_sq_km / baseline_area) * 100

        if area > baseline_area + 1e-9:
            warnings.append(
                f"Year {row['year']} area ({area:.4f}) is greater than the 2020 baseline "
                f"({baseline_area:.4f}). This usually means the extraction method is unstable."
            )

        cleaned_rows.append(
            {
                "year": str(row["year"]),
                "mangrove_area_sq_km": round_float(area),
                "reduction_sq_km": round_float(reduction_sq_km),
                "reduction_percent": round_float(reduction_percent),
            }
        )

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "year",
                "mangrove_area_sq_km",
                "reduction_sq_km",
                "reduction_percent",
            ],
        )
        writer.writeheader()
        writer.writerows(cleaned_rows)

    print(f"Wrote cleaned CSV: {output_path}")
    if warnings:
        print("Warnings:")
        for warning in warnings:
            print(f"- {warning}")
    else:
        print("No baseline consistency warnings.")


if __name__ == "__main__":
    main()
