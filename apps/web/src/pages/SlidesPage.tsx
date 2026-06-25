import { useEffect, useMemo, useState } from "react";
import {
  ChevronRight,
  Filter,
  Grid2X2,
  List,
  Plus,
  Search,
  SlidersHorizontal,
  Upload
} from "lucide-react";
import { Link } from "react-router-dom";
import { getSlides, uploadSlide } from "../api";
import { PageHeader } from "../components/PageHeader";
import { StatusPill } from "../components/StatusPill";
import type { SlideImage } from "../types";

export function SlidesPage() {
  const [slides, setSlides] = useState<SlideImage[]>([]);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");

  useEffect(() => {
    getSlides().then(setSlides).catch(console.error);
  }, []);

  const filtered = useMemo(
    () =>
      slides.filter((slide) =>
        `${slide.caseId} ${slide.name} ${slide.tissueType}`
          .toLowerCase()
          .includes(query.toLowerCase())
      ),
    [slides, query]
  );

  const chooseFile = () => {
    document.getElementById("slide-file-input")?.click();
  };

  const handleUpload = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    setUploadMessage(`正在导入 ${file.name}...`);
    try {
      const slide = await uploadSlide(file);
      setSlides((items) => [...items, slide]);
      setUploadMessage(`${file.name} 已导入，可以开始标注`);
    } catch (reason) {
      setUploadMessage(reason instanceof Error ? reason.message : "切片导入失败");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="page slides-page">
      <PageHeader
        eyebrow="DATA LIBRARY"
        title="病例与切片"
        description="管理项目中的全切片图像、病例信息与质量状态。"
        actions={
          <>
            <input
              id="slide-file-input"
              className="visually-hidden"
              type="file"
              accept=".svs,.ndpi,.mrxs,.scn,.vms,.vmu,.bif,.tif,.tiff,.jpg,.jpeg,.png"
              onChange={(event) => handleUpload(event.target.files?.[0])}
            />
            <button className="soft-button" onClick={chooseFile} disabled={uploading}>
              <Upload size={17} />{uploading ? "正在导入" : "批量导入"}
            </button>
            <button className="primary-button" onClick={chooseFile} disabled={uploading}>
              <Plus size={17} />添加切片
            </button>
          </>
        }
      />

      {uploadMessage && (
        <div className={`upload-notice ${uploading ? "loading" : ""}`}>
          <span />
          {uploadMessage}
        </div>
      )}

      <div className="library-toolbar">
        <div className="library-search">
          <Search size={18} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索病例号、切片名或组织类型"
          />
        </div>
        <button className="filter-button"><Filter size={17} />染色类型</button>
        <button className="filter-button"><SlidersHorizontal size={17} />更多筛选</button>
        <div className="view-toggle">
          <button className={view === "grid" ? "active" : ""} onClick={() => setView("grid")}><Grid2X2 size={17} /></button>
          <button className={view === "list" ? "active" : ""} onClick={() => setView("list")}><List size={18} /></button>
        </div>
      </div>

      <div className="library-summary">
        <span>全部切片 <strong>{filtered.length}</strong></span>
        <span>已标注 <strong>0</strong></span>
        <span>待处理 <strong>{filtered.length}</strong></span>
      </div>

      {view === "grid" ? (
        <div className="slide-grid">
          {filtered.map((slide) => (
            <Link to={`/annotate/${slide.id}`} className="slide-card" key={slide.id}>
              <div className="slide-preview">
                <img src={slide.thumbnailUrl} alt={slide.name} />
                <div className="slide-topline">
                  <StatusPill tone="gray">待标注</StatusPill>
                  <span>{slide.objectivePower}×</span>
                </div>
                <div className="open-hint">打开标注工作台 <ChevronRight size={16} /></div>
              </div>
              <div className="slide-card-body">
                <div>
                  <span>{slide.caseId}</span>
                  <h3>{slide.name}</h3>
                </div>
                <dl>
                  <div><dt>染色</dt><dd>{slide.stain}</dd></div>
                  <div><dt>组织</dt><dd>{slide.tissueType}</dd></div>
                  <div><dt>尺寸</dt><dd>{Math.round(slide.width / 1000)}k × {Math.round(slide.height / 1000)}k</dd></div>
                </dl>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="slide-list panel">
          {filtered.map((slide) => (
            <Link to={`/annotate/${slide.id}`} key={slide.id}>
              <img src={slide.thumbnailUrl} alt="" />
              <div><strong>{slide.caseId}</strong><span>{slide.name}</span></div>
              <span>{slide.stain}</span>
              <span>{slide.tissueType}</span>
              <span>{slide.width.toLocaleString()} × {slide.height.toLocaleString()}</span>
              <ChevronRight size={18} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
