#!/usr/bin/env python3
from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


CANVAS_SIZE = 1024
SUPERSAMPLE = 3
CORNER_RATIO = 0.22
GRID_STEP = 128
ICONSET_SIZES = [
    (16, "icon_16x16.png"),
    (32, "icon_16x16@2x.png"),
    (32, "icon_32x32.png"),
    (64, "icon_32x32@2x.png"),
    (128, "icon_128x128.png"),
    (256, "icon_128x128@2x.png"),
    (256, "icon_256x256.png"),
    (512, "icon_256x256@2x.png"),
    (512, "icon_512x512.png"),
    (1024, "icon_512x512@2x.png"),
]
OUTPUT_DIR = Path("assets/icon")
ICONSET_DIR = OUTPUT_DIR / "Nexus.iconset"
PREVIEW_PATH = OUTPUT_DIR / "Nexus-1024.png"
ICNS_PATH = OUTPUT_DIR / "Nexus.icns"


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    if ICONSET_DIR.exists():
        shutil.rmtree(ICONSET_DIR)
    ICONSET_DIR.mkdir(parents=True)

    icon = draw_icon(CANVAS_SIZE * SUPERSAMPLE).resize(
        (CANVAS_SIZE, CANVAS_SIZE),
        Image.Resampling.LANCZOS,
    )
    icon.save(PREVIEW_PATH)
    for size, name in ICONSET_SIZES:
        icon.resize((size, size), Image.Resampling.LANCZOS).save(ICONSET_DIR / name)

    subprocess.run(["iconutil", "-c", "icns", str(ICONSET_DIR), "-o", str(ICNS_PATH)], check=True)
    print(ICNS_PATH)


def draw_icon(size: int) -> Image.Image:
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    mask = rounded_mask(size)
    background = gradient_background(size)
    image.alpha_composite(background)
    image.putalpha(mask)
    draw_grid(image, mask)
    draw_mark(image)
    return image


def rounded_mask(size: int) -> Image.Image:
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    inset = int(size * 0.035)
    radius = int(size * CORNER_RATIO)
    draw.rounded_rectangle([inset, inset, size - inset, size - inset], radius=radius, fill=255)
    return mask


def gradient_background(size: int) -> Image.Image:
    image = Image.new("RGBA", (size, size))
    pixels = image.load()
    for y in range(size):
        for x in range(size):
            ratio = (x + y) / (size * 2)
            red = int(8 + ratio * 28)
            green = int(10 + ratio * 34)
            blue = int(14 + ratio * 44)
            pixels[x, y] = (red, green, blue, 255)
    return image


def draw_grid(image: Image.Image, mask: Image.Image) -> None:
    overlay = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    size = image.size[0]
    step = GRID_STEP * SUPERSAMPLE
    line_color = (255, 255, 255, 18)
    for index in range(-size, size * 2, step):
        draw.line([(index, 0), (index + size, size)], fill=line_color, width=max(1, size // 260))
        draw.line([(index + size, 0), (index, size)], fill=(0, 210, 255, 16), width=max(1, size // 320))
    overlay.putalpha(Image.composite(overlay.getchannel("A"), Image.new("L", image.size, 0), mask))
    image.alpha_composite(overlay)


def draw_mark(image: Image.Image) -> None:
    size = image.size[0]
    glow = Image.new("RGBA", image.size, (0, 0, 0, 0))
    mark = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw_glow = ImageDraw.Draw(glow)
    draw_mark_layer = ImageDraw.Draw(mark)
    width = max(1, int(size * 0.105))
    cyan_width = max(1, int(width * 1.14))
    points = n_points(size)

    draw_glow.line(points, fill=(0, 210, 255, 115), width=cyan_width, joint="curve")
    glow = glow.filter(ImageFilter.GaussianBlur(radius=max(1, int(size * 0.028))))
    image.alpha_composite(glow)
    draw_mark_layer.line(points, fill=(0, 206, 255, 230), width=cyan_width, joint="curve")
    draw_mark_layer.line(points, fill=(245, 248, 255, 255), width=width, joint="curve")
    image.alpha_composite(mark)
    draw_star(image, size)


def n_points(size: int) -> list[tuple[int, int]]:
    left_x = int(size * 0.295)
    right_x = int(size * 0.705)
    top_y = int(size * 0.275)
    bottom_y = int(size * 0.735)
    return [(left_x, bottom_y), (left_x, top_y), (right_x, bottom_y), (right_x, top_y)]


def draw_star(image: Image.Image, size: int) -> None:
    overlay = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    center = (int(size * 0.5), int(size * 0.19))
    outer = int(size * 0.048)
    inner = int(size * 0.015)
    draw.ellipse(
        [center[0] - inner, center[1] - inner, center[0] + inner, center[1] + inner],
        fill=(255, 255, 255, 255),
    )
    draw.line([(center[0] - outer, center[1]), (center[0] + outer, center[1])], fill=(0, 210, 255, 220), width=inner)
    draw.line([(center[0], center[1] - outer), (center[0], center[1] + outer)], fill=(0, 210, 255, 220), width=inner)
    overlay = overlay.filter(ImageFilter.GaussianBlur(radius=max(1, int(size * 0.002))))
    image.alpha_composite(overlay)


if __name__ == "__main__":
    main()
