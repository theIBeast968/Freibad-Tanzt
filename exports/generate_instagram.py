#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import time
from io import BytesIO
from pathlib import Path

from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "exports" / "instagram"
BASE_URL = os.environ.get("IG_BASE_URL", "http://127.0.0.1:8765/index.html")
WIDTH = 1080
SLIDE_HEIGHT = 1350
BG = (9, 9, 9)
MIN_TRAILING_HEIGHT = 220
MIN_SEGMENT_HEIGHT = 900
SPLIT_SEARCH_BACK = 360
GAP_BAND_HEIGHT = 28

SECTIONS = [
    {"name": "01-infos", "selector": "#infos"},
    {
        "name": "02-timetable",
        "selector": "#lineup",
        "prepare": """
          document.querySelectorAll('#sonntag, .familientag-stage').forEach((node) => {
            node.style.display = 'none';
          });
        """,
    },
    {
        "name": "03-sonntag",
        "selector": "#lineup",
        "break_before": [".family-program-grid"],
        "prepare": """
          (() => {
            const lineup = document.querySelector('#lineup');
            if (!lineup) return;
            lineup.querySelectorAll(':scope > *').forEach((node) => {
              node.style.display = 'none';
            });
            const sonntag = document.querySelector('#sonntag');
            const stage = document.querySelector('.familientag-stage');
            if (sonntag) sonntag.style.display = '';
            if (stage) stage.style.display = '';
          })();
        """,
    },
    {"name": "04-camping", "selector": "#camping", "break_before": [".camping-card--wide"]},
    {"name": "05-tickets", "selector": "#tickets"},
    {
        "name": "06-sponsoren",
        "selector": "#sponsoren",
        "prepare": """
          const details = document.querySelector('.sponsors-details');
          if (details) details.open = true;
        """,
    },
]

HIDE_UI = """
  document.querySelectorAll(
    '.site-header, .music-player, .back-to-top, .site-footer, .skip-link, .page-watermark'
  ).forEach((node) => {
    node.style.display = 'none';
  });
  document.body.style.paddingTop = '0';
"""


def resize_to_width(image: Image.Image) -> Image.Image:
    ratio = WIDTH / image.width
    resized_height = max(1, int(round(image.height * ratio)))
    return image.resize((WIDTH, resized_height), Image.Resampling.LANCZOS)


def compress_tiny_trailing_slide(image: Image.Image) -> Image.Image:
    slide_count = (image.height + SLIDE_HEIGHT - 1) // SLIDE_HEIGHT
    if slide_count <= 1:
        return image

    trailing_height = image.height - ((slide_count - 1) * SLIDE_HEIGHT)
    if trailing_height >= MIN_TRAILING_HEIGHT:
        return image

    target_height = (slide_count - 1) * SLIDE_HEIGHT
    return image.resize((WIDTH, target_height), Image.Resampling.LANCZOS)


def natural_split_y(image: Image.Image, segment_top: int) -> int:
    target = min(segment_top + SLIDE_HEIGHT, image.height)
    if target >= image.height:
        return image.height

    search_start = max(segment_top + MIN_SEGMENT_HEIGHT, target - SPLIT_SEARCH_BACK)
    search_end = target - GAP_BAND_HEIGHT
    if search_start >= search_end:
        return target

    gray = image.convert("L")
    best_y = target
    best_score = float("inf")

    def band_std(top: int) -> float:
        top = max(segment_top, min(top, image.height - GAP_BAND_HEIGHT))
        band = gray.crop((0, top, WIDTH, top + GAP_BAND_HEIGHT))
        histogram = band.histogram()
        pixels = WIDTH * GAP_BAND_HEIGHT
        mean = sum(value * count for value, count in enumerate(histogram)) / pixels
        variance = sum(((value - mean) ** 2) * count for value, count in enumerate(histogram)) / pixels
        return variance ** 0.5

    for y in range(search_start, search_end):
        current_std = band_std(y)
        previous_std = band_std(y - (GAP_BAND_HEIGHT * 2))
        next_std = band_std(y + GAP_BAND_HEIGHT)
        content_starts_after_gap = max(0.0, next_std - current_std)
        score = current_std + (previous_std * 0.7) - (content_starts_after_gap * 0.35)

        if score < best_score:
            best_score = score
            best_y = y + (GAP_BAND_HEIGHT // 2)

    return best_y


def split_segments(
    image: Image.Image,
    preferred_breaks: list[int] | None = None,
) -> list[tuple[int, int]]:
    segments: list[tuple[int, int]] = []
    breaks = sorted({point for point in preferred_breaks or [] if 0 < point < image.height})
    top = 0

    while image.height - top > SLIDE_HEIGHT:
        valid_breaks = [
            point
            for point in breaks
            if top + MIN_SEGMENT_HEIGHT <= point <= top + SLIDE_HEIGHT
        ]
        split_y = valid_breaks[-1] if valid_breaks else natural_split_y(image, top)
        segments.append((top, split_y))
        top = split_y

    segments.append((top, image.height))
    return segments


def split_to_slides(
    image: Image.Image,
    out_dir: Path,
    base_name: str,
    preferred_breaks: list[int] | None = None,
) -> list[Path]:
    resized_before_compression = resize_to_width(image)
    resized = compress_tiny_trailing_slide(resized_before_compression)
    width_ratio = WIDTH / image.width
    height_ratio = resized.height / resized_before_compression.height
    scaled_breaks = [
        int(round(point * width_ratio * height_ratio))
        for point in preferred_breaks or []
    ]
    files: list[Path] = []

    for index, (top, bottom) in enumerate(split_segments(resized, scaled_breaks)):
        crop = resized.crop((0, top, WIDTH, bottom))

        slide = Image.new("RGB", (WIDTH, SLIDE_HEIGHT), BG)
        slide.paste(crop, (0, 0))

        file_path = out_dir / f"{base_name}-slide-{index + 1:02d}.png"
        slide.save(file_path, format="PNG", optimize=True)
        files.append(file_path)

    return files


def main() -> None:
    if OUT.exists():
        for child in OUT.iterdir():
            if child.is_file():
                child.unlink()
            elif child.is_dir():
                import shutil

                shutil.rmtree(child)
    OUT.mkdir(parents=True, exist_ok=True)

    manifest: list[dict] = []

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": WIDTH, "height": 900})

        for section in SECTIONS:
            page.goto(BASE_URL, wait_until="domcontentloaded", timeout=120_000)
            page.evaluate(HIDE_UI)
            if section.get("prepare"):
                page.evaluate(section["prepare"])

            locator = page.locator(section["selector"])
            locator.scroll_into_view_if_needed()
            time.sleep(0.4)

            png_bytes = locator.screenshot(type="png")
            image = Image.open(BytesIO(png_bytes)).convert("RGB")
            preferred_breaks = locator.evaluate(
                """
                (sectionNode, selectors) => {
                  const sectionRect = sectionNode.getBoundingClientRect();
                  return selectors
                    .map((selector) => sectionNode.querySelector(selector))
                    .filter(Boolean)
                    .map((node) => Math.max(0, node.getBoundingClientRect().top - sectionRect.top));
                }
                """,
                section.get("break_before", []),
            )

            section_dir = OUT / section["name"]
            section_dir.mkdir(parents=True, exist_ok=True)
            slides = split_to_slides(image, section_dir, section["name"], preferred_breaks)

            manifest.append(
                {
                    "section": section["name"],
                    "slides": [str(path.relative_to(ROOT)) for path in slides],
                    "count": len(slides),
                }
            )
            print(f"{section['name']}: {len(slides)} slide(s)")

        browser.close()

    manifest_path = OUT / "manifest.json"
    manifest_path.write_text(
        json.dumps({"width": WIDTH, "height": SLIDE_HEIGHT, "sections": manifest}, indent=2),
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
