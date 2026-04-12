#!/usr/bin/env python3
"""Convert a GEE table export with a `.geo` column into GeoJSON."""

from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Convert a GEE CSV table export with .geo geometry into GeoJSON."
    )
    parser.add_argument("--input", required=True, help="Input CSV exported from GEE")
    parser.add_argument("--output", required=True, help="Output GeoJSON path")
    return parser.parse_args()


def normalize_value(value: str):
    if value is None:
        return None

    value = value.strip()
    if value == "":
        return None

    for caster in (int, float):
        try:
            converted = caster(value)
            if str(converted) == value or caster is float:
                return converted
        except ValueError:
            continue

    return value


def main() -> None:
    args = parse_args()
    input_path = Path(args.input)
    output_path = Path(args.output)

    features = []
    with input_path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        if reader.fieldnames is None:
            raise ValueError("The input CSV has no header row.")

        if ".geo" not in reader.fieldnames:
            raise ValueError("The input CSV must include a `.geo` column.")

        for row in reader:
            geometry_blob = row.pop(".geo", None)
            row.pop("system:index", None)
            if not geometry_blob:
                continue

            geometry = json.loads(geometry_blob)
            properties = {}
            for key, value in row.items():
                normalized = normalize_value(value)
                if normalized is None:
                    continue
                properties[key] = normalized

            features.append(
                {
                    "type": "Feature",
                    "geometry": geometry,
                    "properties": properties,
                }
            )

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output = {"type": "FeatureCollection", "features": features}
    output_path.write_text(json.dumps(output, ensure_ascii=True), encoding="utf-8")

    print(f"Wrote GeoJSON: {output_path}")
    print(f"Feature count: {len(features)}")


if __name__ == "__main__":
    main()
