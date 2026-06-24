import io
import math
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from fastapi import FastAPI, File, Form, HTTPException, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from .imaging import TILE_SIZE, open_slide
from .models import Annotation, AnnotationPayload, Slide
from .storage import (
    SLIDES_DIR,
    annotations_exist,
    ensure_directories,
    load_annotations,
    load_slide_registry,
    save_annotations,
    save_slide_registry,
)


app = FastAPI(
    title="PathFISA API",
    version="0.1.0",
    description="病理小样本增量自学习智能标注平台",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ensure_directories()

DEMO_SLIDES = [
    {
        "id": "demo-luad-001",
        "caseId": "LUAD-2026-0184",
        "name": "HE-A03 · 肺叶切除标本",
        "stain": "H&E",
        "mpp": 0.25,
        "objectivePower": 40,
        "status": "ready",
        "tissueType": "肺腺癌",
        "filename": "demo-luad-001.jpg",
    },
    {
        "id": "demo-luad-002",
        "caseId": "LUAD-2026-0181",
        "name": "HE-B01 · 淋巴结切片",
        "stain": "H&E",
        "mpp": 0.25,
        "objectivePower": 40,
        "status": "ready",
        "tissueType": "转移淋巴结",
        "filename": "demo-luad-002.jpg",
    },
    {
        "id": "demo-luad-003",
        "caseId": "LUAD-2026-0179",
        "name": "PD-L1-C01 · 免疫组化",
        "stain": "PD-L1",
        "mpp": 0.5,
        "objectivePower": 20,
        "status": "ready",
        "tissueType": "肺腺癌",
        "filename": "demo-luad-003.jpg",
    },
]

SUPPORTED_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".tif",
    ".tiff",
    ".svs",
    ".ndpi",
    ".mrxs",
    ".scn",
    ".vms",
    ".vmu",
    ".bif",
}


def all_slide_records() -> list[dict]:
    return [*DEMO_SLIDES, *load_slide_registry()]


def get_slide_record(slide_id: str) -> dict:
    record = next((item for item in all_slide_records() if item["id"] == slide_id), None)
    if not record:
        raise HTTPException(status_code=404, detail="Slide not found")
    return record


def slide_path(record: dict) -> Path:
    path = SLIDES_DIR / record["filename"]
    if not path.exists():
        raise HTTPException(
            status_code=503,
            detail="Demo images have not been generated. Run scripts/generate_demo_slides.py.",
        )
    return path


def serialize_slide(record: dict) -> Slide:
    path = slide_path(record)
    reader = open_slide(str(path))
    slide_id = record["id"]
    return Slide(
        id=slide_id,
        caseId=record["caseId"],
        name=record["name"],
        stain=record["stain"],
        width=reader.width,
        height=reader.height,
        mpp=record["mpp"],
        objectivePower=record["objectivePower"],
        status=record["status"],
        tissueType=record["tissueType"],
        thumbnailUrl=f"/api/v1/slides/{slide_id}/thumbnail",
        dziUrl=f"/api/v1/slides/{slide_id}/dzi",
    )


def demo_annotations(slide: Slide) -> list[Annotation]:
    width, height = slide.width, slide.height
    return [
        Annotation(
            id="demo-manual-tumor",
            kind="polygon",
            labelId="tumor",
            label="肿瘤区域",
            color="#ff6174",
            source="manual",
            points=[
                (width * 0.21, height * 0.25),
                (width * 0.36, height * 0.20),
                (width * 0.49, height * 0.31),
                (width * 0.45, height * 0.48),
                (width * 0.29, height * 0.53),
                (width * 0.18, height * 0.40),
            ],
        ),
        Annotation(
            id="demo-manual-necrosis",
            kind="rectangle",
            labelId="necrosis",
            label="坏死区域",
            color="#ffb454",
            source="manual",
            points=[
                (width * 0.54, height * 0.23),
                (width * 0.69, height * 0.41),
            ],
        ),
        Annotation(
            id="demo-ai-stroma",
            kind="polygon",
            labelId="stroma",
            label="间质区域",
            color="#38d9a9",
            confidence=0.88,
            source="ai",
            points=[
                (width * 0.53, height * 0.48),
                (width * 0.68, height * 0.40),
                (width * 0.82, height * 0.50),
                (width * 0.76, height * 0.68),
                (width * 0.58, height * 0.65),
            ],
        ),
    ]


@app.get("/api/v1/health")
def health() -> dict:
    return {"status": "ok", "service": "pathfisa-api"}


@app.get("/api/v1/slides", response_model=list[Slide])
def list_slides() -> list[Slide]:
    return [serialize_slide(record) for record in all_slide_records()]


@app.post("/api/v1/slides/import", response_model=Slide)
async def import_slide(
    file: UploadFile = File(...),
    case_id: str = Form("IMPORTED"),
    stain: str = Form("H&E"),
    tissue_type: str = Form("待分类"),
    mpp: float = Form(0.25),
    objective_power: int = Form(40),
) -> Slide:
    original_name = Path(file.filename or "slide").name
    suffix = Path(original_name).suffix.lower()
    if suffix not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported slide format: {suffix or 'unknown'}",
        )

    slide_id = f"slide-{uuid4()}"
    stored_name = f"{slide_id}{suffix}"
    path = SLIDES_DIR / stored_name
    try:
        with path.open("wb") as target:
            while chunk := await file.read(8 * 1024 * 1024):
                target.write(chunk)
        reader = open_slide(str(path))
        if reader.width <= 0 or reader.height <= 0:
            raise ValueError("Invalid image dimensions")
    except Exception as exc:
        path.unlink(missing_ok=True)
        raise HTTPException(
            status_code=400,
            detail=f"Cannot open slide image: {exc}",
        ) from exc
    finally:
        await file.close()

    record = {
        "id": slide_id,
        "caseId": case_id.strip() or "IMPORTED",
        "name": original_name,
        "stain": stain.strip() or "H&E",
        "mpp": max(mpp, 0.0001),
        "objectivePower": max(objective_power, 1),
        "status": "ready",
        "tissueType": tissue_type.strip() or "待分类",
        "filename": stored_name,
    }
    records = load_slide_registry()
    records.append(record)
    save_slide_registry(records)
    return serialize_slide(record)


@app.get("/api/v1/slides/{slide_id}", response_model=Slide)
def get_slide(slide_id: str) -> Slide:
    return serialize_slide(get_slide_record(slide_id))


@app.get("/api/v1/slides/{slide_id}/thumbnail")
def get_thumbnail(slide_id: str) -> Response:
    reader = open_slide(str(slide_path(get_slide_record(slide_id))))
    image = reader.thumbnail((900, 620))
    buffer = io.BytesIO()
    image.save(buffer, format="JPEG", quality=88)
    return Response(buffer.getvalue(), media_type="image/jpeg")


@app.get("/api/v1/slides/{slide_id}/dzi")
def get_dzi(slide_id: str) -> Response:
    reader = open_slide(str(slide_path(get_slide_record(slide_id))))
    xml = (
        f'<?xml version="1.0" encoding="UTF-8"?>'
        f'<Image xmlns="http://schemas.microsoft.com/deepzoom/2008" '
        f'Format="jpeg" Overlap="0" TileSize="{TILE_SIZE}">'
        f'<Size Height="{reader.height}" Width="{reader.width}"/></Image>'
    )
    return Response(xml, media_type="application/xml")


@app.get("/api/v1/slides/{slide_id}/dzi_files/{level}/{tile}.jpeg")
def get_tile(slide_id: str, level: int, tile: str) -> Response:
    try:
        x_text, y_text = tile.split("_", maxsplit=1)
        x, y = int(x_text), int(y_text)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid tile coordinates") from exc

    reader = open_slide(str(slide_path(get_slide_record(slide_id))))
    if level < 0 or level > math.ceil(math.log2(max(reader.width, reader.height))):
        raise HTTPException(status_code=404, detail="Invalid level")
    image = reader.tile(level, x, y)
    buffer = io.BytesIO()
    image.save(buffer, format="JPEG", quality=86, optimize=True)
    return Response(
        buffer.getvalue(),
        media_type="image/jpeg",
        headers={"Cache-Control": "public, max-age=86400"},
    )


@app.get("/api/v1/slides/{slide_id}/annotations", response_model=list[Annotation])
def annotations(slide_id: str) -> list[Annotation]:
    slide = serialize_slide(get_slide_record(slide_id))
    if annotations_exist(slide_id):
        return load_annotations(slide_id)
    return demo_annotations(slide)


@app.put("/api/v1/slides/{slide_id}/annotations")
def update_annotations(slide_id: str, payload: AnnotationPayload) -> dict:
    get_slide_record(slide_id)
    save_annotations(slide_id, payload.annotations)
    return {
        "revision": int(datetime.now(timezone.utc).timestamp()),
        "savedAt": datetime.now(timezone.utc).isoformat(),
    }


@app.post(
    "/api/v1/slides/{slide_id}/ai-suggestions",
    response_model=list[Annotation],
)
def ai_suggestions(slide_id: str) -> list[Annotation]:
    slide = serialize_slide(get_slide_record(slide_id))
    width, height = slide.width, slide.height
    return [
        Annotation(
            id=str(uuid4()),
            kind="polygon",
            labelId="tumor",
            label="肿瘤区域",
            color="#ff6174",
            confidence=0.93,
            source="ai",
            points=[
                (width * 0.19, height * 0.24),
                (width * 0.36, height * 0.18),
                (width * 0.48, height * 0.29),
                (width * 0.44, height * 0.48),
                (width * 0.27, height * 0.52),
                (width * 0.16, height * 0.39),
            ],
        ),
        Annotation(
            id=str(uuid4()),
            kind="polygon",
            labelId="stroma",
            label="间质区域",
            color="#38d9a9",
            confidence=0.86,
            source="ai",
            points=[
                (width * 0.53, height * 0.34),
                (width * 0.73, height * 0.28),
                (width * 0.84, height * 0.43),
                (width * 0.76, height * 0.63),
                (width * 0.57, height * 0.59),
            ],
        ),
    ]
