#!/usr/bin/env python3
from __future__ import annotations

import json
from io import BytesIO
from pathlib import Path

from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
TEMPLATE = ROOT / "exports" / "gewinnspiel-template.html"
OUT = ROOT / "exports" / "gewinnspiel"
BASE_URL = "http://127.0.0.1:8899/exports/gewinnspiel-template.html"

EXPORTS = [
    ("carousel", "07-gewinnspiel-slide-01.png", "#carousel-01", 1080, 1350),
    ("carousel", "07-gewinnspiel-slide-02.png", "#carousel-02", 1080, 1350),
    ("carousel", "07-gewinnspiel-slide-03.png", "#carousel-03", 1080, 1350),
    ("carousel", "07-gewinnspiel-slide-04.png", "#carousel-04", 1080, 1350),
    ("carousel", "07-gewinnspiel-slide-05.png", "#carousel-05", 1080, 1350),
    ("carousel", "07-gewinnspiel-slide-06.png", "#carousel-06", 1080, 1350),
    ("carousel", "07-gewinnspiel-slide-07.png", "#carousel-07", 1080, 1350),
    ("reel", "gewinnspiel-reel-01.png", "#reel-01", 1080, 1920),
    ("reel", "gewinnspiel-reel-02.png", "#reel-02", 1080, 1920),
    ("reel", "gewinnspiel-reel-03.png", "#reel-03", 1080, 1920),
    ("story", "gewinnspiel-story-01.png", "#story-01", 1080, 1920),
    ("story", "gewinnspiel-story-02.png", "#story-02", 1080, 1920),
]

HIDE_OTHERS = """
  (activeId) => {
    document.querySelectorAll('.frame').forEach((node) => {
      node.style.display = node.id === activeId ? 'block' : 'none';
    });
    document.body.style.margin = '0';
    document.body.style.background = '#000';
  }
"""


def shoot(page, selector: str, width: int, height: int) -> Image.Image:
    active_id = selector.lstrip("#")
    page.evaluate(HIDE_OTHERS, active_id)
    page.set_viewport_size({"width": width, "height": height})
    page.wait_for_timeout(200)
    locator = page.locator(selector)
    png_bytes = locator.screenshot(type="png")
    return Image.open(BytesIO(png_bytes)).convert("RGBA")


def main() -> None:
    if OUT.exists():
        for sub in OUT.iterdir():
            if sub.is_dir():
                for file in sub.glob("*.png"):
                    file.unlink()
            elif sub.suffix == ".png":
                sub.unlink()

    carousel_dir = OUT / "carousel"
    reel_dir = OUT / "reel"
    story_dir = OUT / "story"
    for directory in (carousel_dir, reel_dir, story_dir):
        directory.mkdir(parents=True, exist_ok=True)

    manifest: list[dict] = []

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page(
            viewport={"width": 1080, "height": 1350},
            device_scale_factor=2,
        )
        page.goto(BASE_URL, wait_until="networkidle", timeout=120_000)
        page.evaluate("document.fonts.ready")
        page.wait_for_timeout(800)

        for folder, filename, selector, width, height in EXPORTS:
            image = shoot(page, selector, width, height)
            target_dir = OUT / folder
            path = target_dir / filename
            image.save(path, format="PNG", optimize=True)
            manifest.append(
                {
                    "folder": folder,
                    "file": str(path.relative_to(ROOT)),
                    "width": width,
                    "height": height,
                }
            )
            print(f"{folder}/{filename}")

        browser.close()

    (OUT / "manifest.json").write_text(
        json.dumps({"exports": manifest}, indent=2),
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
