import math
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]


def render_icon(size):
    scale = size / 512
    image = Image.new("RGBA", (size, size), (255, 113, 140, 255))
    draw = ImageDraw.Draw(image)

    for y in range(size):
        ratio = y / max(size - 1, 1)
        color = (255, int(179 - 66 * ratio), int(107 + 13 * ratio), 255)
        draw.line((0, y, size, y), fill=color)

    radius = round(112 * scale)
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size - 1, size - 1), radius, fill=255)
    image.putalpha(mask)
    draw = ImageDraw.Draw(image)

    points = []
    for step in range(361):
        angle = step * math.pi / 180
        x = 16 * math.sin(angle) ** 3
        y = -(13 * math.cos(angle) - 5 * math.cos(2 * angle) - 2 * math.cos(3 * angle) - math.cos(4 * angle))
        points.append((round((256 + x * 9.5) * scale), round((245 + y * 7.8) * scale)))
    draw.polygon(points, fill=(255, 250, 245, 255))
    draw.line((round(256 * scale), round(402 * scale), round(256 * scale), round(315 * scale)), fill=(189, 62, 106, 255), width=max(2, round(20 * scale)))

    for side in (-1, 1):
        ribbon = [
            (round(256 * scale), round(360 * scale)),
            (round((256 + side * 65) * scale), round(329 * scale)),
            (round((256 + side * 70) * scale), round(365 * scale)),
            (round((256 + side * 21) * scale), round(389 * scale)),
        ]
        draw.polygon(ribbon, fill=(255, 230, 232, 255), outline=(189, 62, 106, 255), width=max(2, round(10 * scale)))
    return image


for size, filename in ((180, "apple-touch-icon.png"), (192, "icon-192.png"), (512, "icon-512.png")):
    render_icon(size).save(ROOT / "icons" / filename, optimize=True)
