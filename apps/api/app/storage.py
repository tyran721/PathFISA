import json
from pathlib import Path
from threading import Lock

from .models import Annotation


ROOT = Path(__file__).resolve().parents[3]
DATA_DIR = ROOT / "data"
SLIDES_DIR = DATA_DIR / "slides"
ANNOTATIONS_DIR = DATA_DIR / "annotations"
SLIDE_REGISTRY = SLIDES_DIR / "registry.json"
TASKS_FILE = DATA_DIR / "tasks.json"
MODEL_RUNS_FILE = DATA_DIR / "model-runs.json"
SETTINGS_FILE = DATA_DIR / "project-settings.json"
LOCK = Lock()


def ensure_directories() -> None:
    SLIDES_DIR.mkdir(parents=True, exist_ok=True)
    ANNOTATIONS_DIR.mkdir(parents=True, exist_ok=True)


def annotation_path(slide_id: str) -> Path:
    return ANNOTATIONS_DIR / f"{slide_id}.json"


def annotations_exist(slide_id: str) -> bool:
    return annotation_path(slide_id).exists()


def load_annotations(slide_id: str) -> list[Annotation]:
    path = annotation_path(slide_id)
    if not path.exists():
        return []
    with LOCK:
        payload = json.loads(path.read_text(encoding="utf-8"))
    return [Annotation.model_validate(item) for item in payload]


def save_annotations(slide_id: str, annotations: list[Annotation]) -> None:
    path = annotation_path(slide_id)
    temp_path = path.with_suffix(".tmp")
    payload = [annotation.model_dump() for annotation in annotations]
    with LOCK:
        temp_path.write_text(
            json.dumps(payload, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        temp_path.replace(path)


def load_slide_registry() -> list[dict]:
    if not SLIDE_REGISTRY.exists():
        return []
    with LOCK:
        return json.loads(SLIDE_REGISTRY.read_text(encoding="utf-8"))


def save_slide_registry(records: list[dict]) -> None:
    temp_path = SLIDE_REGISTRY.with_suffix(".tmp")
    with LOCK:
        temp_path.write_text(
            json.dumps(records, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        temp_path.replace(SLIDE_REGISTRY)


def load_json_records(path: Path, default: list[dict] | dict) -> list[dict] | dict:
    if not path.exists():
        return default
    with LOCK:
        return json.loads(path.read_text(encoding="utf-8"))


def save_json_records(path: Path, records: list[dict] | dict) -> None:
    temp_path = path.with_suffix(".tmp")
    with LOCK:
        temp_path.write_text(
            json.dumps(records, ensure_ascii=False, indent=2, default=str),
            encoding="utf-8",
        )
        temp_path.replace(path)
