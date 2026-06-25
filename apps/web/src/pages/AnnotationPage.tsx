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
import { Modal } from "../components/Modal";
import { SlideViewer } from "../components/SlideViewer";
import type { Annotation, SlideImage } from "../types";

export function AnnotationPage() {
  const { slideId = "" } = useParams();
  const [slide, setSlide] = useState<SlideImage | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [error, setError] = useState("");
  const [dialog, setDialog] = useState<"shortcuts" | "comments" | "help" | null>(null);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [notice, setNotice] = useState("");
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState(["林医生：请重点复核肿瘤与间质交界区域。"]);

  const flash = (text: string) => {
    setNotice(text);
    window.setTimeout(() => setNotice(""), 2200);
  };

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      flash("当前切片链接已复制");
    } catch {
      flash("请从浏览器地址栏复制当前链接");
    }
  };

  const fullscreen = async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
      flash("已进入全屏模式");
    } else {
      await document.exitFullscreen();
    }
  };

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
          <div className="mini-brand">
            <i><span /><span /><span /></i>
            <div>
              <strong>PathFISA</strong>
              <small>病理小样本增量自学习智能标注软件</small>
            </div>
          </div>
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
          <button onClick={() => setDialog("shortcuts")}><Command size={17} />快捷键</button>
          <button className="icon-button" title="评论" onClick={() => setDialog("comments")}><MessageSquareText size={18} /></button>
          <button className="icon-button" title="帮助" onClick={() => setDialog("help")}><HelpCircle size={18} /></button>
          <button className="icon-button" title="分享" onClick={share}><Share2 size={18} /></button>
          <button className="icon-button" title="收起侧栏" onClick={() => setPanelCollapsed(!panelCollapsed)}><PanelRightClose size={18} /></button>
          <button className="icon-button" title="全屏" onClick={fullscreen}><MoreHorizontal size={19} /></button>
          <button className="submit-button" onClick={() => flash("已提交复核，任务状态更新为待复核")}><CheckCircle2 size={17} />提交复核</button>
        </div>
      </header>
      {notice && <div className="viewer-notice">{notice}</div>}
      <SlideViewer slide={slide} initialAnnotations={annotations} panelCollapsed={panelCollapsed} />

      <Modal open={dialog === "shortcuts"} title="标注快捷键" description="熟练使用快捷键可以明显降低高密度标注的操作成本。" onClose={() => setDialog(null)}>
        <div className="shortcut-grid">
          {[["V","选择对象"],["H","平移切片"],["P","多边形"],["R","矩形"],["D","点标注"],["M","距离测量"],["1–4","切换标签"],["Ctrl + S","保存标注"],["Ctrl + Z","撤销"],["Delete","删除选中"],["Esc","取消绘制"]].map(([key,label])=><div key={key}><kbd>{key}</kbd><span>{label}</span></div>)}
        </div>
      </Modal>

      <Modal
        open={dialog === "comments"}
        title="切片协作评论"
        description="评论会跟随当前切片，后续可扩展为绑定具体坐标。"
        onClose={() => setDialog(null)}
        footer={<button className="primary-button" onClick={() => { if (comment.trim()) { setComments([...comments, `林医生：${comment}`]); setComment(""); } }}>添加评论</button>}
      >
        <div className="comment-list">{comments.map((item,index)=><div key={index}><i>林</i><p>{item}</p></div>)}</div>
        <textarea className="comment-input" rows={3} value={comment} onChange={e=>setComment(e.target.value)} placeholder="输入复核意见或标注说明..." />
      </Modal>

      <Modal open={dialog === "help"} title="标注工作台帮助" description="当前版本支持高分辨率切片浏览、矢量标注和 AI 辅助。" onClose={() => setDialog(null)}>
        <div className="help-list">
          <div><strong>浏览切片</strong><p>滚轮缩放，拖动画布平移；右下角导航图可以快速跳转。</p></div>
          <div><strong>创建标注</strong><p>选择左侧点、矩形或多边形工具。多边形双击完成。</p></div>
          <div><strong>智能预标注</strong><p>点击智能框选或右侧“分析当前切片”，结果会进入独立 AI 图层。</p></div>
          <div><strong>显示与测量</strong><p>可调亮度、对比度、饱和度，并使用 M 工具测量实际微米距离。</p></div>
        </div>
      </Modal>
    </div>
  );
}
