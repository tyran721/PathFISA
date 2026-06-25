import io
import math
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from uuid import uuid4

from fastapi import FastAPI, File, Form, HTTPException, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from .imaging import TILE_SIZE, open_slide
from .models import (
    Annotation,
    AnnotationPayload,
    AnnotationTask,
    AnnotationTaskCreate,
    AnnotationTaskUpdate,
    ModelRun,
    ModelRunCreate,
    ProjectSettings,
    Slide,
)
from .storage import (
    MODEL_RUNS_FILE,
    SETTINGS_FILE,
    SLIDES_DIR,
    TASKS_FILE,
    annotations_exist,
    ensure_directories,
    load_annotations,
    load_json_records,
    load_slide_registry,
    save_annotations,
    save_json_records,
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

BUILTIN_SLIDES = [
    {
        "id": "kidney-23766he",
        "caseId": "23766HE",
        "name": "23766he.svs",
        "stain": "H&E",
        "mpp": 0.247806,
        "objectivePower": 40,
        "status": "ready",
        "tissueType": "肾脏组织",
        "sourcePath": r"E:\pathology\ISICDM2025\kidney_wsi_he_test\test\23766he.svs",
    },
    {
        "id": "kidney-23871he",
        "caseId": "23871HE",
        "name": "23871he.svs",
        "stain": "H&E",
        "mpp": 0.247806,
        "objectivePower": 40,
        "status": "ready",
        "tissueType": "肾脏组织",
        "sourcePath": r"E:\pathology\ISICDM2025\kidney_wsi_he_test\test\23871he.svs",
    },
    {
        "id": "wsi-b20028048-1",
        "caseId": "B20028048-1",
        "name": "B20028048-1.svs",
        "stain": "H&E",
        "mpp": 0.205543,
        "objectivePower": 40,
        "status": "ready",
        "tissueType": "病理组织",
        "sourcePath": r"E:\pathology\swift\ruslan\test\B20028048-1.svs",
    },
    {
        "id": "wsi-cmu-1-jp2k-33005",
        "caseId": "CMU-1-JP2K-33005",
        "name": "CMU-1-JP2K-33005.svs",
        "stain": "H&E",
        "mpp": 0.499,
        "objectivePower": 20,
        "status": "ready",
        "tissueType": "病理组织",
        "sourcePath": r"E:\pathology\swift\ruslan\test\CMU-1-JP2K-33005.svs",
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

DEFAULT_TASKS = [
    {
        "id": "task-001",
        "caseId": "23766HE",
        "slideId": "kidney-23766he",
        "slideName": "23766he.svs",
        "title": "肾脏组织区域精细标注",
        "taskType": "区域分割",
        "stain": "H&E",
        "assignee": "张敏",
        "reviewer": "林医生",
        "priority": "high",
        "status": "pending",
        "dueDate": str(date.today()),
        "progress": 0,
        "description": "在真实肾脏 HE 全切片上标注目标组织区域，避开折叠和染色伪影。",
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "updatedAt": datetime.now(timezone.utc).isoformat(),
    },
    {
        "id": "task-002",
        "caseId": "23871HE",
        "slideId": "kidney-23871he",
        "slideName": "23871he.svs",
        "title": "肾脏多区域分割",
        "taskType": "区域分割",
        "stain": "H&E",
        "assignee": "林医生",
        "reviewer": "王主任",
        "priority": "high",
        "status": "in_progress",
        "dueDate": str(date.today() + timedelta(days=1)),
        "progress": 68,
        "description": "标注切片中的主要组织结构与异常区域。",
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "updatedAt": datetime.now(timezone.utc).isoformat(),
    },
    {
        "id": "task-003",
        "caseId": "B20028048-1",
        "slideId": "wsi-b20028048-1",
        "slideName": "B20028048-1.svs",
        "title": "病理区域专家复核",
        "taskType": "专家复核",
        "stain": "H&E",
        "assignee": "王冉",
        "reviewer": "林医生",
        "priority": "medium",
        "status": "review",
        "dueDate": str(date.today()),
        "progress": 100,
        "description": "复核标注区域的边界和标签一致性。",
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "updatedAt": datetime.now(timezone.utc).isoformat(),
    },
    {
        "id": "task-004",
        "caseId": "CMU-1-JP2K-33005",
        "slideId": "wsi-cmu-1-jp2k-33005",
        "slideName": "CMU-1-JP2K-33005.svs",
        "title": "教学切片组织标注",
        "taskType": "区域分割",
        "stain": "H&E",
        "assignee": "李夏",
        "reviewer": "林医生",
        "priority": "low",
        "status": "completed",
        "dueDate": str(date.today() - timedelta(days=1)),
        "progress": 100,
        "description": "完成真实 SVS 切片的组织区域标注与复核。",
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "updatedAt": datetime.now(timezone.utc).isoformat(),
    },
]

DEFAULT_MODEL_RUNS = [
    {
        "id": "run-eval-001",
        "kind": "evaluation",
        "name": "v2.4.1 固定测试集评估",
        "algorithm": "多尺度滑窗评估",
        "architecture": "PathFISA-Seg / ConvNeXt-Tiny U-Net",
        "dataset": "LUAD-Test-v3",
        "status": "completed",
        "progress": 100,
        "config": {"threshold": 0.5, "patchSize": 1024, "overlap": 0.25},
        "metrics": {"dice": 0.914, "iou": 0.862, "sensitivity": 0.931},
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "updatedAt": datetime.now(timezone.utc).isoformat(),
    }
]

DEFAULT_SETTINGS = {
    "projectName": "病理小样本增量自学习智能标注",
    "projectCode": "PATHFISA-2026",
    "description": "面向真实高分辨率病理全切片的小样本智能标注、主动学习和受控增量学习项目。",
    "institution": "数字病理研究中心",
    "owner": "林医生",
    "defaultAssignee": "张敏",
    "defaultReviewer": "林医生",
    "reviewMode": "single",
    "autoSaveSeconds": 20,
    "aiAutoLoad": True,
    "aiThreshold": 0.65,
    "defaultModel": "PathFISA-Seg v2.4.1",
    "allowExport": True,
    "requireExportApproval": True,
    "keepAuditDays": 365,
    "labels": [
        {"id": "tumor", "name": "肿瘤区域", "color": "#ff6174"},
        {"id": "stroma", "name": "间质区域", "color": "#38d9a9"},
        {"id": "necrosis", "name": "坏死区域", "color": "#ffb454"},
        {"id": "lymphocyte", "name": "淋巴细胞", "color": "#8f7cff"},
    ],
}


def all_slide_records() -> list[dict]:
    return [*BUILTIN_SLIDES, *load_slide_registry()]


def get_slide_record(slide_id: str) -> dict:
    record = next((item for item in all_slide_records() if item["id"] == slide_id), None)
    if not record:
        raise HTTPException(status_code=404, detail="Slide not found")
    return record


def slide_path(record: dict) -> Path:
    path = (
        Path(record["sourcePath"])
        if record.get("sourcePath")
        else SLIDES_DIR / record["filename"]
    )
    if not path.exists():
        raise HTTPException(
            status_code=503,
            detail=f"Slide file does not exist: {path}",
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
    return []


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


def task_records() -> list[dict]:
    return list(load_json_records(TASKS_FILE, DEFAULT_TASKS))


@app.get("/api/v1/tasks", response_model=list[AnnotationTask])
def list_tasks() -> list[dict]:
    return task_records()


@app.get("/api/v1/tasks/{task_id}", response_model=AnnotationTask)
def get_task(task_id: str) -> dict:
    task = next((item for item in task_records() if item["id"] == task_id), None)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@app.post("/api/v1/tasks", response_model=AnnotationTask, status_code=201)
def create_task(payload: AnnotationTaskCreate) -> dict:
    now = datetime.now(timezone.utc).isoformat()
    record = {
        "id": f"task-{uuid4()}",
        **payload.model_dump(mode="json"),
        "createdAt": now,
        "updatedAt": now,
    }
    records = task_records()
    records.append(record)
    save_json_records(TASKS_FILE, records)
    return record


@app.patch("/api/v1/tasks/{task_id}", response_model=AnnotationTask)
def update_task(task_id: str, payload: AnnotationTaskUpdate) -> dict:
    records = task_records()
    index = next((i for i, item in enumerate(records) if item["id"] == task_id), -1)
    if index < 0:
        raise HTTPException(status_code=404, detail="Task not found")
    updates = payload.model_dump(exclude_none=True, mode="json")
    records[index] = {
        **records[index],
        **updates,
        "updatedAt": datetime.now(timezone.utc).isoformat(),
    }
    save_json_records(TASKS_FILE, records)
    return records[index]


@app.delete("/api/v1/tasks/{task_id}", status_code=204)
def delete_task(task_id: str) -> Response:
    records = task_records()
    remaining = [item for item in records if item["id"] != task_id]
    if len(remaining) == len(records):
        raise HTTPException(status_code=404, detail="Task not found")
    save_json_records(TASKS_FILE, remaining)
    return Response(status_code=204)


def model_run_records() -> list[dict]:
    return list(load_json_records(MODEL_RUNS_FILE, DEFAULT_MODEL_RUNS))


@app.get("/api/v1/model-runs", response_model=list[ModelRun])
def list_model_runs() -> list[dict]:
    return model_run_records()


@app.get("/api/v1/model-runs/{run_id}", response_model=ModelRun)
def get_model_run(run_id: str) -> dict:
    run = next((item for item in model_run_records() if item["id"] == run_id), None)
    if not run:
        raise HTTPException(status_code=404, detail="Model run not found")
    return run


@app.post("/api/v1/model-runs", response_model=ModelRun, status_code=201)
def create_model_run(payload: ModelRunCreate) -> dict:
    now = datetime.now(timezone.utc).isoformat()
    metric_seed = {
        "evaluation": {"dice": 0.906, "iou": 0.851, "sensitivity": 0.923},
        "training": {"trainLoss": 0.184, "valDice": 0.897, "valIou": 0.842},
        "incremental": {"newDice": 0.918, "oldDiceDelta": -0.006, "gatePass": 1.0},
    }[payload.kind]
    record = {
        "id": f"run-{uuid4()}",
        **payload.model_dump(mode="json"),
        "status": "queued",
        "progress": 0,
        "metrics": metric_seed,
        "createdAt": now,
        "updatedAt": now,
    }
    records = model_run_records()
    records.insert(0, record)
    save_json_records(MODEL_RUNS_FILE, records)
    return record


@app.post("/api/v1/model-runs/{run_id}/simulate", response_model=ModelRun)
def simulate_model_run(run_id: str) -> dict:
    records = model_run_records()
    index = next((i for i, item in enumerate(records) if item["id"] == run_id), -1)
    if index < 0:
        raise HTTPException(status_code=404, detail="Model run not found")
    records[index] = {
        **records[index],
        "status": "completed",
        "progress": 100,
        "updatedAt": datetime.now(timezone.utc).isoformat(),
    }
    save_json_records(MODEL_RUNS_FILE, records)
    return records[index]


@app.get("/api/v1/project-settings", response_model=ProjectSettings)
def get_project_settings() -> dict:
    return dict(load_json_records(SETTINGS_FILE, DEFAULT_SETTINGS))


@app.put("/api/v1/project-settings", response_model=ProjectSettings)
def update_project_settings(payload: ProjectSettings) -> dict:
    record = payload.model_dump(mode="json")
    save_json_records(SETTINGS_FILE, record)
    return record


@app.get("/api/v1/analytics")
def analytics() -> dict:
    tasks = task_records()
    return {
        "summary": {
            "slides": len(all_slide_records()),
            "annotations": 18426,
            "completedTasks": sum(item["status"] == "completed" for item in tasks),
            "aiAcceptance": 84.6,
            "medianMinutes": 18.4,
        },
        "weeklyThroughput": [18, 25, 31, 28, 42, 46, 39],
        "labelDistribution": [
            {"name": "肿瘤区域", "value": 38, "color": "#ff6174"},
            {"name": "间质区域", "value": 29, "color": "#38d9a9"},
            {"name": "坏死区域", "value": 18, "color": "#ffb454"},
            {"name": "淋巴细胞", "value": 15, "color": "#8f7cff"},
        ],
        "modelTrend": [
            {"version": "v2.0", "dice": 0.821},
            {"version": "v2.1", "dice": 0.854},
            {"version": "v2.2", "dice": 0.872},
            {"version": "v2.3", "dice": 0.896},
            {"version": "v2.4", "dice": 0.914},
        ],
        "members": [
            {"name": "张敏", "tasks": 32, "hours": 18.2, "passRate": 0.93},
            {"name": "王冉", "tasks": 27, "hours": 15.6, "passRate": 0.89},
            {"name": "李夏", "tasks": 24, "hours": 14.1, "passRate": 0.91},
            {"name": "林医生", "tasks": 19, "hours": 12.8, "passRate": 0.98},
        ],
    }
