#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import shutil
import time
from functools import lru_cache
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "exports" / "instagram"
LOGO = Path(os.environ.get("IG_WATERMARK_LOGO", ROOT / "Freibad Tanzt Logo Original.png"))
BASE_URL = os.environ.get("IG_BASE_URL", "http://127.0.0.1:8765/index.html")

WIDTH = 1080
HEIGHT = 1350
CONTENT_WIDTH = 960
MAX_CONTENT_WIDTH = 1010
HEADER_WIDTH = 1000
ELEMENT_GAP = 36
HEADER_TOP = 52
CONTENT_TOP_GAP = 40
CONTENT_BOTTOM = 56
WATERMARK_WIDTH = 1010
WATERMARK_ALPHA = 0.22

SECTIONS = [
    {
        "name": "01-infos",
        "label": "Infos",
        "title": "Wir tanzen den Sommer an.",
        "slides": [
            [".feature-grid-stack > article:nth-of-type(1)"],
            [".feature-grid-stack > article:nth-of-type(2)"],
            ["#zeltplatz"],
            [".feature-card--schirmbar"],
        ],
    },
    {
        "name": "02-timetable",
        "label": "Timetable",
        "title": "Wer wann den Pool zum Beben bringt.",
        "slides": [
            [".timetable-grid > article:nth-of-type(1)"],
            [".timetable-grid > article:nth-of-type(2)"],
        ],
    },
    {
        "name": "03-sonntag",
        "label": "Sonntag, 19. Juli",
        "title": "Familientag im Freibad Langenburg.",
        "slides": [
            {
                "selectors": [
                    ".family-flyer-card",
                    ".family-band-card",
                    ".family-attraction-card",
                ],
                "prepare": "document.body.classList.add('ig-sunday-combined');",
            },
            {
                "selectors": [
                    ".family-info-card--wide",
                    ".family-program-grid > article:nth-of-type(2)",
                ],
                "prepare": "document.body.classList.add('ig-sunday-large');",
            },
            {
                "selectors": [
                    ".family-program-grid > article:nth-of-type(3)",
                    ".family-program-grid > article:nth-of-type(4)",
                    ".family-program-grid > article:nth-of-type(5)",
                ],
                "prepare": "document.body.classList.add('ig-sunday-large');",
            },
        ],
    },
    {
        "name": "04-camping",
        "label": "Camping",
        "title": "Bleib über Nacht – direkt am Freibad.",
        "slides": [
            {
                "selectors": [".camping-notice-card"],
                "prepare": "document.body.classList.add('ig-camping-large');",
            },
            {
                "selectors": [
                    ".camping-grid > article:nth-of-type(1)",
                    ".camping-grid > article:nth-of-type(2)",
                ],
                "prepare": "document.body.classList.add('ig-camping-large');",
            },
            {
                "selectors": [".camping-grid > article:nth-of-type(3)"],
                "prepare": "document.body.classList.add('ig-camping-large');",
            },
            {
                "selectors": [".camping-grid > article:nth-of-type(4)", ".camping-cta"],
                "prepare": "document.body.classList.add('ig-camping-large');",
            },
        ],
    },
    {
        "name": "05-tickets",
        "label": "Tickets",
        "title": "Tickets für Freitag & Samstag.",
        "slides": [
            [".ticket-poster-card", ".ticket-facts", ".ticket-qr-wrap"],
            [".ticket-info-body > .ticket-info-block:nth-of-type(1)"],
            {
                "selectors": ["#ig-ticket-slide-03-wrap"],
                "prepare": """
                  document.body.classList.add('ig-ticket-slide-03');
                  const body = document.querySelector('.ticket-info-body');
                  const wrap = document.createElement('div');
                  wrap.id = 'ig-ticket-slide-03-wrap';
                  body.querySelectorAll('.ticket-info-block:nth-of-type(2), .ticket-info-block:nth-of-type(3)')
                    .forEach((block) => wrap.appendChild(block));
                  document.querySelector('#tickets')?.style.setProperty('display', 'none');
                  document.body.appendChild(wrap);
                """,
            },
        ],
    },
    {
        "name": "06-sponsoren",
        "label": "Sponsoren",
        "title": "Unsere Partner.",
        "prepare": "document.querySelector('.sponsors-details').open = true;",
        "slides": [
            {
                "selectors": [".sponsors-grid"],
                "prepare": "document.body.classList.add('ig-sponsors-large');",
            },
        ],
    },
]

HIDE_UI = """
  document.querySelectorAll(
    '.site-header, .music-player, .back-to-top, .site-footer, .skip-link, .page-watermark'
  ).forEach((node) => {
    node.style.display = 'none';
  });
  document.body.style.paddingTop = '0';
  document.documentElement.style.background = 'transparent';
  document.body.style.background = 'transparent';
"""

RENDER_STYLE = """
  const style = document.createElement('style');
  style.id = 'ig-render-style';
  style.textContent = `
    body,
    body button,
    body input,
    body textarea,
    body select,
    body .feature-card *,
    body .lineup-card *,
    body .info-card *,
    body .ticket-story *,
    body .ticket-info *,
    body .family-flyer-card *,
    body .family-band-card *,
    body .family-attraction-card *,
    body .family-info-card *,
    body .sponsors-grid * {
      font-family: "Gin Test", Impact, sans-serif !important;
    }

    .feature-card,
    .lineup-card,
    .info-card,
    .ticket-story,
    .ticket-info,
    .family-flyer-card,
    .family-band-card,
    .family-attraction-card,
    .family-info-card {
      background:
        linear-gradient(135deg, rgba(255, 183, 3, 0.06), rgba(255, 73, 70, 0.035)),
        rgba(10, 10, 10, 0.36) !important;
      border-color: rgba(255, 183, 3, 0.34) !important;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.34) !important;
    }

    .feature-card p,
    .feature-card li,
    .lineup-card p,
    .lineup-card li,
    .info-card p,
    .info-card li,
    .ticket-story p,
    .ticket-story li,
    .ticket-info p,
    .ticket-info li,
    .family-flyer-card p,
    .family-band-card p,
    .family-attraction-card p,
    .family-info-card p,
    .family-info-card li {
      font-size: 1.1em !important;
      line-height: 1.55 !important;
    }

    .family-flyer-card,
    .family-band-card,
    .family-attraction-card {
      min-height: 500px !important;
      padding: 1.7rem !important;
      align-items: center !important;
    }

    .ig-sunday-large .family-program-grid {
      display: block !important;
    }

    .ig-sunday-large .family-info-card,
    .ig-sunday-large .family-info-card--wide {
      width: 660px !important;
      max-width: 660px !important;
      min-height: 0 !important;
      margin: 0 auto !important;
      padding: 1.7rem !important;
    }

    .ig-sunday-large .family-info-card span {
      font-size: 0.95rem !important;
    }

    .ig-sunday-large .family-info-card p,
    .ig-sunday-large .family-info-card ul {
      font-size: 1.06rem !important;
      line-height: 1.55 !important;
    }

    .feature-card--schirmbar {
      display: block !important;
      width: 720px !important;
      max-width: 720px !important;
      min-height: 0 !important;
      margin: 0 auto !important;
      padding: 2rem 2.2rem !important;
      columns: auto !important;
      font-size: 1.35em !important;
    }

    .feature-card--schirmbar > h3 {
      margin: 0 0 0.9rem !important;
      font-size: 1.5em !important;
    }

    .feature-card--schirmbar > p {
      margin: 0 0 1rem !important;
    }

    .feature-card--schirmbar > p:last-child {
      margin-bottom: 0 !important;
    }

    .ig-sunday-combined .family-flyer-card,
    .ig-sunday-combined .family-band-card,
    .ig-sunday-combined .family-attraction-card {
      min-height: 0 !important;
      padding: 1rem !important;
      font-size: 1.08em !important;
    }

    .ig-sunday-combined .family-band-logo-link {
      width: 17rem !important;
    }

    .ig-sunday-combined .family-band-logo {
      max-height: 72px !important;
      object-fit: contain !important;
    }

    .ig-camping-large .camping-grid {
      display: block !important;
    }

    .ig-camping-large .info-card {
      width: 720px !important;
      max-width: 720px !important;
      min-height: 0 !important;
      margin: 0 auto !important;
      padding: 1.9rem !important;
    }

    .ig-camping-large .info-card h3 {
      font-size: 1.7rem !important;
    }

    .ig-camping-large .info-card p,
    .ig-camping-large .info-card li {
      font-size: 1.12rem !important;
      line-height: 1.55 !important;
    }

    .ig-camping-large .camping-cta {
      width: 720px !important;
      margin: 0 auto !important;
      display: flex !important;
      align-items: center !important;
      padding: 1.4rem 1.7rem !important;
      border: 1px solid rgba(255, 183, 3, 0.34) !important;
      border-radius: 1rem !important;
      background: rgba(10, 10, 10, 0.36) !important;
    }

    .ig-camping-large .camping-cta p {
      font-size: 1.35rem !important;
      line-height: 1.4 !important;
    }

    .ig-sponsors-large .sponsors-grid {
      width: 900px !important;
      grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
      gap: 1.1rem !important;
    }

    .ig-sponsors-large .sponsor-logo-link {
      min-height: 180px !important;
      max-height: 180px !important;
      height: 180px !important;
      padding: 1.4rem !important;
    }

    .ig-sponsors-large .sponsor-logo-link img {
      max-height: 96px !important;
      max-width: 100% !important;
    }

    .ticket-info-block {
      padding: 1.4rem !important;
      border: 1px solid rgba(255, 183, 3, 0.34) !important;
      border-radius: 1.15rem !important;
      background:
        linear-gradient(135deg, rgba(255, 183, 3, 0.06), rgba(255, 73, 70, 0.035)),
        rgba(10, 10, 10, 0.36) !important;
    }

    .ig-ticket-slide-03 #ig-ticket-slide-03-wrap {
      width: 1000px !important;
      max-width: 1000px !important;
      display: grid !important;
      gap: 1.1rem !important;
    }

    .ig-ticket-slide-03 .ticket-info-block {
      width: 100% !important;
      max-width: 100% !important;
      margin: 0 !important;
      padding: 1.75rem 2.1rem !important;
      border-top: 1px solid rgba(255, 183, 3, 0.34) !important;
    }

    .ig-ticket-slide-03 .ticket-info-block h3 {
      font-size: 1.35rem !important;
    }

    .ig-ticket-slide-03 .ticket-info-block--transparency h3 {
      font-size: 2.1rem !important;
      line-height: 1.12 !important;
    }

    .ig-ticket-slide-03 .ticket-price-label,
    .ig-ticket-slide-03 .ticket-info-prices li,
    .ig-ticket-slide-03 .ticket-price-free,
    .ig-ticket-slide-03 .ticket-price-link {
      font-size: 1.45rem !important;
      line-height: 1.48 !important;
    }

    .ig-ticket-slide-03 .ticket-transparency-lead {
      font-size: 1.55rem !important;
      line-height: 1.45 !important;
    }

    .ig-ticket-slide-03 .ticket-info-block--transparency p {
      font-size: 1.35rem !important;
      line-height: 1.52 !important;
    }

    .family-flyer-card img,
    .family-band-photo,
    .family-attraction-card img {
      border: 2px solid rgba(255, 183, 3, 0.48) !important;
    }

    .sponsor-logo-link {
      background: rgba(8, 8, 8, 0.4) !important;
      border-color: rgba(255, 183, 3, 0.26) !important;
    }
  `;
  document.getElementById('ig-render-style')?.remove();
  document.head.append(style);
"""

INJECT_HEADER = """
  ([label, title]) => {
    let node = document.getElementById('ig-header');
    if (!node) {
      node = document.createElement('div');
      node.id = 'ig-header';
      document.body.prepend(node);
    }
    node.style.cssText = [
      'width:1000px',
      'padding:18px 10px 28px',
      'background:transparent',
      'text-align:center',
      'display:block',
      'overflow:visible',
    ].join(';');
    node.innerHTML = `
      <p style="margin:0 0 14px;font-family:'Barlow',Arial,sans-serif;font-weight:800;
                font-size:30px;letter-spacing:0.14em;text-transform:uppercase;color:#ffb703;">
        ${label}
      </p>
      <h2 style="margin:0;padding:5px 0 12px;font-family:'Gin Test',Impact,sans-serif;font-size:68px;line-height:1.12;
                 letter-spacing:0.03em;text-transform:uppercase;color:#fff7ea;">
        ${title}
      </h2>`;
  }
"""


@lru_cache(maxsize=1)
def load_watermark() -> Image.Image:
    logo = Image.open(LOGO).convert("RGBA")
    if abs(logo.width - logo.height) > 4:
        crop_size = round(min(logo.width, logo.height) * 0.9)
        left = (logo.width - crop_size) // 2
        top = (logo.height - crop_size) // 2
        logo = logo.crop((left, top, left + crop_size, top + crop_size))

    ratio = WATERMARK_WIDTH / logo.width
    logo = logo.resize(
        (WATERMARK_WIDTH, max(1, round(logo.height * ratio))),
        Image.Resampling.LANCZOS,
    )
    circle_mask = Image.new("L", logo.size, 0)
    ImageDraw.Draw(circle_mask).ellipse(
        (2, 2, logo.width - 2, logo.height - 2),
        fill=255,
    )
    alpha = Image.composite(logo.split()[3], Image.new("L", logo.size, 0), circle_mask)
    alpha = alpha.point(lambda value: round(value * WATERMARK_ALPHA))
    logo.putalpha(alpha)
    return logo


@lru_cache(maxsize=1)
def homepage_background() -> Image.Image:
    background = Image.new("RGB", (WIDTH, HEIGHT))
    draw = ImageDraw.Draw(background)
    top = (18, 7, 7)
    bottom = (9, 9, 9)

    for y in range(HEIGHT):
        progress = y / max(1, HEIGHT - 1)
        color = tuple(
            round(start + ((end - start) * progress))
            for start, end in zip(top, bottom)
        )
        draw.line((0, y, WIDTH, y), fill=color)

    glow = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    glow_draw.ellipse((-260, -280, 520, 500), fill=(255, 183, 3, 48))
    glow_draw.ellipse((650, 900, 1320, 1570), fill=(255, 73, 70, 38))
    glow = glow.filter(ImageFilter.GaussianBlur(150))
    background.paste(glow, (0, 0), glow)
    return background


def shoot(page, selector: str) -> Image.Image:
    locator = page.locator(selector).first
    locator.scroll_into_view_if_needed()
    page.wait_for_timeout(120)
    png_bytes = locator.screenshot(type="png", omit_background=True)
    return Image.open(BytesIO(png_bytes)).convert("RGBA")


def scale_to_width(image: Image.Image, width: int) -> Image.Image:
    ratio = width / image.width
    return image.resize(
        (width, max(1, round(image.height * ratio))),
        Image.Resampling.LANCZOS,
    )


def compose_slide(header: Image.Image, elements: list[Image.Image]) -> Image.Image:
    canvas = homepage_background().copy()
    watermark = load_watermark()
    canvas.paste(
        watermark,
        ((WIDTH - watermark.width) // 2, (HEIGHT - watermark.height) // 2),
        watermark,
    )

    header_img = scale_to_width(header, HEADER_WIDTH)
    canvas.paste(header_img, ((WIDTH - header_img.width) // 2, HEADER_TOP), header_img)

    content_top = HEADER_TOP + header_img.height + CONTENT_TOP_GAP
    max_content_height = HEIGHT - content_top - CONTENT_BOTTOM

    gap = ELEMENT_GAP
    gaps_total = gap * (len(elements) - 1)
    widest = max(element.width for element in elements)
    stack_height = sum(element.height for element in elements)

    width_factor = MAX_CONTENT_WIDTH / widest
    height_factor = (max_content_height - gaps_total) / stack_height
    factor = min(width_factor, height_factor)

    scaled = [
        element.resize(
            (max(1, round(element.width * factor)), max(1, round(element.height * factor))),
            Image.Resampling.LANCZOS,
        )
        for element in elements
    ]
    total = sum(item.height for item in scaled) + gaps_total

    y = content_top + (max_content_height - total) // 2
    for item in scaled:
        canvas.paste(item, ((WIDTH - item.width) // 2, y), item)
        y += item.height + gap

    return canvas


def main() -> None:
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True, exist_ok=True)

    manifest: list[dict] = []

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": WIDTH, "height": 900}, device_scale_factor=3)

        for section in SECTIONS:
            page.goto(BASE_URL, wait_until="networkidle", timeout=120_000)
            page.evaluate(HIDE_UI)
            page.evaluate(RENDER_STYLE)
            if section.get("prepare"):
                page.evaluate(section["prepare"])
            page.evaluate("document.fonts.ready")
            time.sleep(0.5)

            page.evaluate(INJECT_HEADER, [section["label"], section["title"]])
            header = shoot(page, "#ig-header")

            section_dir = OUT / section["name"]
            section_dir.mkdir(parents=True, exist_ok=True)
            slide_paths: list[Path] = []

            for index, slide_spec in enumerate(section["slides"]):
                if isinstance(slide_spec, dict):
                    page.goto(BASE_URL, wait_until="networkidle", timeout=120_000)
                    page.evaluate(HIDE_UI)
                    page.evaluate(RENDER_STYLE)
                    if section.get("prepare"):
                        page.evaluate(section["prepare"])
                    page.evaluate("document.fonts.ready")
                    page.evaluate(INJECT_HEADER, [section["label"], section["title"]])
                    header = shoot(page, "#ig-header")
                    if slide_spec.get("prepare"):
                        page.evaluate(slide_spec["prepare"])
                    selectors = slide_spec["selectors"]
                else:
                    selectors = slide_spec
                elements = [shoot(page, selector) for selector in selectors]
                slide = compose_slide(header, elements)
                file_path = section_dir / f"{section['name']}-slide-{index + 1:02d}.png"
                slide.save(file_path, format="PNG", optimize=True)
                slide_paths.append(file_path)

            manifest.append(
                {
                    "section": section["name"],
                    "slides": [str(path.relative_to(ROOT)) for path in slide_paths],
                    "count": len(slide_paths),
                }
            )
            print(f"{section['name']}: {len(slide_paths)} slide(s)")

        browser.close()

    manifest_path = OUT / "manifest.json"
    manifest_path.write_text(
        json.dumps({"width": WIDTH, "height": HEIGHT, "sections": manifest}, indent=2),
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
