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

