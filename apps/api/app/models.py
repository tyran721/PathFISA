from datetime import date, datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


class Slide(BaseModel):
    id: str
    caseId: str
    name: str
    stain: str
    width: int
    height: int
    mpp: float
    objectivePower: int
    status: str
    tissueType: str
    thumbnailUrl: str
    dziUrl: str


class Annotation(BaseModel):
    id: str
    kind: Literal["polygon", "rectangle", "point"]
    labelId: str
    label: str
    color: str
    points: list[tuple[float, float]]
    confidence: float | None = None
    source: Literal["manual", "ai", "corrected"]
    visible: bool = True


class AnnotationPayload(BaseModel):
    annotations: list[Annotation] = Field(default_factory=list)


TaskStatus = Literal["pending", "in_progress", "review", "completed"]
TaskPriority = Literal["low", "medium", "high"]


class AnnotationTask(BaseModel):
    id: str
    caseId: str
    slideId: str
    slideName: str
    title: str
    taskType: str
    stain: str = "H&E"
    assignee: str
    reviewer: str = "林医生"
    priority: TaskPriority = "medium"
    status: TaskStatus = "pending"
    dueDate: date
    progress: int = Field(default=0, ge=0, le=100)
    description: str = ""
    createdAt: datetime
    updatedAt: datetime


class AnnotationTaskCreate(BaseModel):
    caseId: str
    slideId: str
    slideName: str
    title: str
    taskType: str
    stain: str = "H&E"
    assignee: str
    reviewer: str = "林医生"
    priority: TaskPriority = "medium"
    status: TaskStatus = "pending"
    dueDate: date
    progress: int = Field(default=0, ge=0, le=100)
    description: str = ""


class AnnotationTaskUpdate(BaseModel):
    caseId: str | None = None
    slideId: str | None = None
    slideName: str | None = None
    title: str | None = None
    taskType: str | None = None
    stain: str | None = None
    assignee: str | None = None
    reviewer: str | None = None
    priority: TaskPriority | None = None
    status: TaskStatus | None = None
    dueDate: date | None = None
    progress: int | None = Field(default=None, ge=0, le=100)
    description: str | None = None


ModelRunKind = Literal["evaluation", "training", "incremental"]


class ModelRun(BaseModel):
    id: str
    kind: ModelRunKind
    name: str
    algorithm: str
    architecture: str
    dataset: str
    status: Literal["queued", "running", "completed", "failed"]
    progress: int = Field(ge=0, le=100)
    config: dict[str, Any]
    metrics: dict[str, float]
    createdAt: datetime
    updatedAt: datetime


class ModelRunCreate(BaseModel):
    kind: ModelRunKind
    name: str
    algorithm: str
    architecture: str
    dataset: str
    config: dict[str, Any] = Field(default_factory=dict)


class ProjectSettings(BaseModel):
    projectName: str
    projectCode: str
    description: str
    institution: str
    owner: str
    defaultAssignee: str
    defaultReviewer: str
    reviewMode: Literal["single", "double", "expert"]
    autoSaveSeconds: int = Field(ge=5, le=300)
    aiAutoLoad: bool
    aiThreshold: float = Field(ge=0, le=1)
    defaultModel: str
    allowExport: bool
    requireExportApproval: bool
    keepAuditDays: int = Field(ge=30, le=3650)
    labels: list[dict[str, str]]
