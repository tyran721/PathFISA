import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Cloud,
  Command,
  HelpCircle,
  MessageSquareText,
  MoreHorizontal,
  PanelRightClose,
  Share2
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { getAnnotations, getSlide } from "../api";
import { SlideViewer } from "../components/SlideViewer";
import type { Annotation, SlideImage } from "../types";

export function AnnotationPage() {
  const { slideId = "" } = useParams();
  const [slide, setSlide] = useState<SlideImage | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([getSlide(slideId), getAnnotations(slideId)])
      .then(([slideData, annotationData]) => {
        setSlide(slideData);
        setAnnotations(annotationData);
      })
      .catch((reason: Error) => setError(reason.message));
  }, [slideId]);

  if (error) {
    return (
      <div className="viewer-loading">
        <strong>切片无法打开</strong>
        <span>{error}</span>
        <Link to="/slides">返回切片库</Link>
      </div>
    );
  }
  if (!slide) {
    return (
      <div className="viewer-loading">
        <i />
        <strong>正在准备高分辨率切片</strong>
        <span>读取金字塔层级和标注数据...</span>
      </div>
    );
  }

  return (
    <div className="annotation-page">
      <header className="annotation-header">
        <div className="annotation-header-left">
          <Link to="/slides" className="back-button"><ArrowLeft size={19} /></Link>
          <div className="mini-brand"><i><span /><span /><span /></i>PathFISA</div>
          <div className="header-divider" />
          <div className="slide-title">
            <span>{slide.caseId}</span>
            <strong>{slide.name}</strong>
          </div>
          <button className="header-chevron"><ChevronDown size={15} /></button>
        </div>
        <div className="annotation-header-center">
          <span><Cloud size={14} />云端草稿已同步</span>
          <i />
          <span>HE</span>
          <i />
          <span>{slide.objectivePower}× · {slide.mpp} μm/px</span>
        </div>
        <div className="annotation-header-actions">
          <button><Command size={17} />快捷键</button>
          <button className="icon-button"><MessageSquareText size={18} /></button>
          <button className="icon-button"><HelpCircle size={18} /></button>
          <button className="icon-button"><Share2 size={18} /></button>
          <button className="icon-button"><PanelRightClose size={18} /></button>
          <button className="icon-button"><MoreHorizontal size={19} /></button>
          <button className="submit-button"><CheckCircle2 size={17} />提交复核</button>
        </div>
      </header>
      <SlideViewer slide={slide} initialAnnotations={annotations} />
    </div>
  );
}

