import type {
  AnalyticsData,
  Annotation,
  AppNotification,
  AnnotationTask,
  AnnotationTaskInput,
  ModelRun,
  ModelRunKind,
  ProjectSettings,
  SlideImage
} from "./types";

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

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    throw new Error(detail?.detail ?? `请求失败：${response.status}`);
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}

export function getTasks(): Promise<AnnotationTask[]> {
  return requestJson("/api/v1/tasks");
}

export function createTask(
  task: AnnotationTaskInput
): Promise<AnnotationTask> {
  return requestJson("/api/v1/tasks", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify(task)
  });
}

export function updateTask(
  id: string,
  task: Partial<AnnotationTaskInput>
): Promise<AnnotationTask> {
  return requestJson(`/api/v1/tasks/${id}`, {
    method: "PATCH",
    headers: jsonHeaders,
    body: JSON.stringify(task)
  });
}

export function deleteTask(id: string): Promise<void> {
  return requestJson(`/api/v1/tasks/${id}`, { method: "DELETE" });
}

export function getModelRuns(): Promise<ModelRun[]> {
  return requestJson("/api/v1/model-runs");
}

export function createModelRun(payload: {
  kind: ModelRunKind;
  name: string;
  algorithm: string;
  architecture: string;
  dataset: string;
  config: Record<string, string | number | boolean>;
}): Promise<ModelRun> {
  return requestJson("/api/v1/model-runs", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify(payload)
  });
}

export function simulateModelRun(id: string): Promise<ModelRun> {
  return requestJson(`/api/v1/model-runs/${id}/simulate`, {
    method: "POST"
  });
}

export function getProjectSettings(): Promise<ProjectSettings> {
  return requestJson("/api/v1/project-settings");
}

export function saveProjectSettings(
  settings: ProjectSettings
): Promise<ProjectSettings> {
  return requestJson("/api/v1/project-settings", {
    method: "PUT",
    headers: jsonHeaders,
    body: JSON.stringify(settings)
  });
}

export function getAnalytics(): Promise<AnalyticsData> {
  return requestJson("/api/v1/analytics");
}

export function getNotifications(): Promise<AppNotification[]> {
  return requestJson("/api/v1/notifications");
}

export function askAssistant(
  message: string,
  context?: string
): Promise<{ answer: string; suggestions: string[] }> {
  return requestJson("/api/v1/assistant/chat", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ message, context })
  });
}
