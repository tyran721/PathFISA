export type AnnotationKind = "polygon" | "rectangle" | "point";

export interface Annotation {
  id: string;
  kind: AnnotationKind;
  labelId: string;
  label: string;
  color: string;
  points: Array<[number, number]>;
  confidence?: number;
  source: "manual" | "ai" | "corrected";
  visible: boolean;
}

export interface SlideImage {
  id: string;
  caseId: string;
  name: string;
  stain: string;
  width: number;
  height: number;
  mpp: number;
  objectivePower: number;
  status: string;
  tissueType: string;
  thumbnailUrl: string;
  dziUrl: string;
}

export interface LabelOption {
  id: string;
  name: string;
  color: string;
  hotkey: string;
}

export type TaskStatus = "pending" | "in_progress" | "review" | "completed";
export type TaskPriority = "low" | "medium" | "high";

export interface AnnotationTask {
  id: string;
  caseId: string;
  slideId: string;
  slideName: string;
  title: string;
  taskType: string;
  stain: string;
  assignee: string;
  reviewer: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string;
  progress: number;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export type AnnotationTaskInput = Omit<
  AnnotationTask,
  "id" | "createdAt" | "updatedAt"
>;

export type ModelRunKind = "evaluation" | "training" | "incremental";

export interface ModelRun {
  id: string;
  kind: ModelRunKind;
  name: string;
  algorithm: string;
  architecture: string;
  dataset: string;
  status: "queued" | "running" | "completed" | "failed";
  progress: number;
  config: Record<string, string | number | boolean>;
  metrics: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectSettings {
  projectName: string;
  projectCode: string;
  description: string;
  institution: string;
  owner: string;
  defaultAssignee: string;
  defaultReviewer: string;
  reviewMode: "single" | "double" | "expert";
  autoSaveSeconds: number;
  aiAutoLoad: boolean;
  aiThreshold: number;
  defaultModel: string;
  allowExport: boolean;
  requireExportApproval: boolean;
  keepAuditDays: number;
  labels: Array<{ id: string; name: string; color: string }>;
}

export interface AnalyticsData {
  summary: {
    slides: number;
    annotations: number;
    completedTasks: number;
    aiAcceptance: number;
    medianMinutes: number;
  };
  weeklyThroughput: number[];
  labelDistribution: Array<{ name: string; value: number; color: string }>;
  modelTrend: Array<{ version: string; dice: number }>;
  members: Array<{
    name: string;
    tasks: number;
    hours: number;
    passRate: number;
  }>;
}
