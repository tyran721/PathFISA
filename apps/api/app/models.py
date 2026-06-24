from typing import Literal

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

