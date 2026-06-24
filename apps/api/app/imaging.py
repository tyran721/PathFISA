import math
from functools import lru_cache
from pathlib import Path
from threading import RLock

from PIL import Image

try:
    import openslide  # type: ignore
except ImportError:
    openslide = None


TILE_SIZE = 512
WSI_EXTENSIONS = {
    ".svs",
    ".ndpi",
    ".mrxs",
    ".scn",
    ".vms",
    ".vmu",
    ".bif",
    ".tif",
    ".tiff",
}


class SlideReader:
    def __init__(self, path: Path):
        self.path = path
        self.lock = RLock()
        self.is_openslide = False
        if openslide is not None and path.suffix.lower() in WSI_EXTENSIONS:
            try:
                self.reader = openslide.OpenSlide(str(path))
                self.is_openslide = True
            except openslide.OpenSlideError:
                self.reader = Image.open(path)
        else:
            self.reader = Image.open(path)
        if self.is_openslide:
            self.width, self.height = self.reader.dimensions
        else:
            self.width, self.height = self.reader.size
        self.max_level = math.ceil(math.log2(max(self.width, self.height)))

    def close(self) -> None:
        self.reader.close()

    def thumbnail(self, max_size: tuple[int, int]) -> Image.Image:
        with self.lock:
            if self.is_openslide:
                return self.reader.get_thumbnail(max_size).convert("RGB")
            image = self.reader.copy()
            image.thumbnail(max_size, Image.Resampling.LANCZOS)
            return image.convert("RGB")

    def tile(self, level: int, x: int, y: int) -> Image.Image:
        level = max(0, min(level, self.max_level))
        scale = 2 ** (self.max_level - level)
        source_x = x * TILE_SIZE * scale
        source_y = y * TILE_SIZE * scale
        source_w = min(TILE_SIZE * scale, max(0, self.width - source_x))
        source_h = min(TILE_SIZE * scale, max(0, self.height - source_y))
        if source_w <= 0 or source_h <= 0:
            return Image.new("RGB", (TILE_SIZE, TILE_SIZE), "white")

        with self.lock:
            if self.is_openslide:
                best_level = self.reader.get_best_level_for_downsample(scale)
                downsample = float(self.reader.level_downsamples[best_level])
                read_w = max(1, math.ceil(source_w / downsample))
                read_h = max(1, math.ceil(source_h / downsample))
                region = self.reader.read_region(
                    (source_x, source_y),
                    best_level,
                    (read_w, read_h),
                ).convert("RGB")
            else:
                region = self.reader.crop(
                    (source_x, source_y, source_x + source_w, source_y + source_h)
                ).convert("RGB")

        target_w = max(1, math.ceil(source_w / scale))
        target_h = max(1, math.ceil(source_h / scale))
        if region.size != (target_w, target_h):
            region = region.resize((target_w, target_h), Image.Resampling.LANCZOS)
        return region


@lru_cache(maxsize=8)
def open_slide(path: str) -> SlideReader:
    return SlideReader(Path(path))
