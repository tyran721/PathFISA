from pathlib import Path
from random import Random

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "data" / "slides"
OUTPUT.mkdir(parents=True, exist_ok=True)


PALETTES = [
    {
        "background": (245, 224, 229),
        "tissue": (226, 146, 174),
        "dark": (102, 48, 120),
        "light": (252, 188, 201),
        "accent": (132, 61, 145),
    },
    {
        "background": (242, 229, 231),
        "tissue": (212, 143, 164),
        "dark": (91, 48, 107),
        "light": (242, 181, 194),
        "accent": (116, 57, 135),
    },
    {
        "background": (243, 233, 218),
        "tissue": (206, 157, 121),
        "dark": (89, 62, 82),
        "light": (232, 193, 148),
        "accent": (133, 85, 64),
    },
]


def make_slide(index: int, width: int = 8192, height: int = 5632) -> None:
    random = Random(4200 + index)
    palette = PALETTES[index]
    image = Image.new("RGB", (width, height), palette["background"])
    draw = ImageDraw.Draw(image, "RGBA")

    tissue_points = []
    center_x, center_y = width * 0.5, height * 0.5
    for step in range(180):
        angle = step / 180 * 6.28318
        radius_x = width * (0.39 + random.uniform(-0.035, 0.035))
        radius_y = height * (0.38 + random.uniform(-0.05, 0.05))
        x = center_x + radius_x * __import__("math").cos(angle)
        y = center_y + radius_y * __import__("math").sin(angle)
        tissue_points.append((x, y))
    draw.polygon(tissue_points, fill=(*palette["tissue"], 255))

    for _ in range(950):
        x = random.randint(int(width * 0.12), int(width * 0.88))
        y = random.randint(int(height * 0.1), int(height * 0.9))
        rx = random.randint(18, 110)
        ry = random.randint(12, 85)
        color = palette["light"] if random.random() > 0.35 else palette["accent"]
        alpha = random.randint(20, 95)
        draw.ellipse((x - rx, y - ry, x + rx, y + ry), fill=(*color, alpha))

    for _ in range(13500):
        x = random.randint(int(width * 0.11), int(width * 0.89))
        y = random.randint(int(height * 0.09), int(height * 0.91))
        normalized = ((x - center_x) / (width * 0.42)) ** 2 + (
            (y - center_y) / (height * 0.43)
        ) ** 2
        if normalized > 1:
            continue
        radius = random.choice([2, 3, 4, 5, 7, 9])
        color = palette["dark"] if random.random() > 0.16 else palette["accent"]
        alpha = random.randint(85, 205)
        draw.ellipse(
            (x - radius, y - radius * 0.65, x + radius, y + radius * 0.65),
            fill=(*color, alpha),
        )

    for _ in range(38):
        x = random.randint(int(width * 0.18), int(width * 0.82))
        y = random.randint(int(height * 0.18), int(height * 0.82))
        rx = random.randint(70, 240)
        ry = random.randint(40, 160)
        draw.ellipse(
            (x - rx, y - ry, x + rx, y + ry),
            fill=(*palette["background"], 190),
            outline=(*palette["accent"], 80),
            width=8,
        )

    image = image.filter(ImageFilter.GaussianBlur(radius=0.35))
    path = OUTPUT / f"demo-luad-00{index + 1}.jpg"
    image.save(path, quality=88, optimize=True, progressive=True)
    print(f"generated {path} ({path.stat().st_size / 1024 / 1024:.1f} MB)")


if __name__ == "__main__":
    for slide_index in range(3):
        make_slide(slide_index)

