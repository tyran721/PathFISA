import type { Annotation, SlideImage } from "./types";

const jsonHeaders = { "Content-Type": "application/json" };

export async function getSlides(): Promise<SlideImage[]> {
  const response = await fetch("/api/v1/slides");
  if (!response.ok) throw new Error("切片列表加载失败");
  return response.json();
}

export async function getSlide(id: string): Promise<SlideImage> {
  const response = await fetch(`/api/v1/slides/${id}`);
  if (!response.ok) throw new Error("切片信息加载失败");
  return response.json();
}

export async function getAnnotations(id: string): Promise<Annotation[]> {
  const response = await fetch(`/api/v1/slides/${id}/annotations`);
  if (!response.ok) throw new Error("标注加载失败");
  return response.json();
}

export async function saveAnnotations(
  id: string,
  annotations: Annotation[]
): Promise<{ revision: number; savedAt: string }> {
  const response = await fetch(`/api/v1/slides/${id}/annotations`, {
    method: "PUT",
    headers: jsonHeaders,
    body: JSON.stringify({ annotations })
  });
  if (!response.ok) throw new Error("标注保存失败");
  return response.json();
}

export async function runAiSuggestion(id: string): Promise<Annotation[]> {
  const response = await fetch(`/api/v1/slides/${id}/ai-suggestions`, {
    method: "POST"
  });
  if (!response.ok) throw new Error("AI 预标注失败");
  return response.json();
}

export async function uploadSlide(file: File): Promise<SlideImage> {
  const body = new FormData();
  body.append("file", file);
  body.append("case_id", `IMPORT-${new Date().toISOString().slice(0, 10)}`);
  body.append("stain", "H&E");
  body.append("tissue_type", "待分类");
  const response = await fetch("/api/v1/slides/import", {
    method: "POST",
    body
  });
  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    throw new Error(detail?.detail ?? "切片导入失败");
  }
  return response.json();
}
