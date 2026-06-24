import {
  Bot,
  BoxSelect,
  Check,
  ChevronDown,
  CircleDot,
  Contrast,
  Eye,
  EyeOff,
  Focus,
  Hand,
  Layers3,
  MousePointer2,
  Pencil,
  Plus,
  Redo2,
  Ruler,
  Save,
  Scan,
  Sparkles,
  Square,
  Trash2,
  Undo2,
  ZoomIn,
  ZoomOut
} from "lucide-react";
import OpenSeadragon from "openseadragon";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { runAiSuggestion, saveAnnotations } from "../api";
import type { Annotation, LabelOption, SlideImage } from "../types";

type Tool = "pan" | "select" | "polygon" | "rectangle" | "point";

const LABELS: LabelOption[] = [
  { id: "tumor", name: "肿瘤区域", color: "#ff6174", hotkey: "1" },
  { id: "stroma", name: "间质区域", color: "#38d9a9", hotkey: "2" },
  { id: "necrosis", name: "坏死区域", color: "#ffb454", hotkey: "3" },
  { id: "lymphocyte", name: "淋巴细胞", color: "#8f7cff", hotkey: "4" }
];

interface SlideViewerProps {
  slide: SlideImage;
  initialAnnotations: Annotation[];
}

function pointsToString(points: Array<[number, number]>) {
  return points.map(([x, y]) => `${x},${y}`).join(" ");
}

function AnnotationShape({
  annotation,
  selected,
  onSelect
}: {
  annotation: Annotation;
  selected: boolean;
  onSelect: () => void;
}) {
  if (!annotation.visible) return null;
  const common = {
    stroke: annotation.color,
    strokeWidth: selected ? 22 : 14,
    vectorEffect: "non-scaling-stroke" as const,
    fill: `${annotation.color}${selected ? "43" : "2d"}`,
    className: `annotation-shape ${selected ? "selected" : ""}`,
    onPointerDown: (event: React.PointerEvent) => {
      event.stopPropagation();
      onSelect();
    }
  };
  if (annotation.kind === "point") {
    const [point] = annotation.points;
    return (
      <g className="annotation-point">
        <circle cx={point[0]} cy={point[1]} r={90} {...common} />
        <circle
          cx={point[0]}
          cy={point[1]}
          r={24}
          fill={annotation.color}
          vectorEffect="non-scaling-stroke"
        />
      </g>
    );
  }
  if (annotation.kind === "rectangle" && annotation.points.length === 2) {
    const [start, end] = annotation.points;
    return (
      <rect
        x={Math.min(start[0], end[0])}
        y={Math.min(start[1], end[1])}
        width={Math.abs(end[0] - start[0])}
        height={Math.abs(end[1] - start[1])}
        rx={18}
        {...common}
      />
    );
  }
  return <polygon points={pointsToString(annotation.points)} {...common} />;
}

export function SlideViewer({
  slide,
  initialAnnotations
}: SlideViewerProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const viewerRef = useRef<OpenSeadragon.Viewer | null>(null);
  const [tool, setTool] = useState<Tool>("pan");
  const [activeLabel, setActiveLabel] = useState(LABELS[0]);
  const [annotations, setAnnotations] = useState(initialAnnotations);
  const [history, setHistory] = useState<Annotation[][]>([]);
  const [future, setFuture] = useState<Annotation[][]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Array<[number, number]>>([]);
  const [rectangleStart, setRectangleStart] = useState<[number, number] | null>(
    null
  );
  const [cursorPoint, setCursorPoint] = useState<[number, number] | null>(null);
  const [zoom, setZoom] = useState(1);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState("刚刚");
  const [aiLoading, setAiLoading] = useState(false);
  const [rightTab, setRightTab] = useState<"objects" | "info">("objects");
  const [showAi, setShowAi] = useState(true);

  const visibleAnnotations = useMemo(
    () => annotations.filter((item) => showAi || item.source !== "ai"),
    [annotations, showAi]
  );

  const updateViewBox = useCallback(() => {
    const viewer = viewerRef.current;
    const svg = svgRef.current;
    const item = viewer?.world.getItemAt(0);
    if (!viewer || !svg || !item) return;
    const bounds = viewer.viewport.getBounds(true);
    const imageBounds = item.viewportToImageRectangle(bounds);
    svg.setAttribute(
      "viewBox",
      `${imageBounds.x} ${imageBounds.y} ${imageBounds.width} ${imageBounds.height}`
    );
    const imageZoom = item.viewportToImageZoom(viewer.viewport.getZoom(true));
    setZoom(imageZoom);
  }, []);

  useEffect(() => {
    if (!hostRef.current) return;
    const viewer = OpenSeadragon({
      element: hostRef.current,
      tileSources: slide.dziUrl,
      showNavigator: true,
      navigatorPosition: "BOTTOM_RIGHT",
      navigatorSizeRatio: 0.16,
      showNavigationControl: false,
      animationTime: 0.65,
      blendTime: 0.15,
      maxZoomPixelRatio: 3,
      minZoomImageRatio: 0.68,
      visibilityRatio: 0.85,
      constrainDuringPan: true,
      preserveViewport: true,
      immediateRender: false,
      placeholderFillStyle: "#13201d",
      crossOriginPolicy: false,
      gestureSettingsMouse: {
        clickToZoom: false,
        dblClickToZoom: true,
        pinchToZoom: true,
        scrollToZoom: true,
        flickEnabled: true
      }
    });
    viewerRef.current = viewer;
    viewer.addHandler("open", updateViewBox);
    viewer.addHandler("animation", updateViewBox);
    viewer.addHandler("resize", updateViewBox);
    return () => {
      viewer.destroy();
      viewerRef.current = null;
    };
  }, [slide.dziUrl, updateViewBox]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    viewer.setMouseNavEnabled(tool === "pan" || tool === "select");
  }, [tool]);

  useEffect(() => {
    setAnnotations(initialAnnotations);
  }, [initialAnnotations]);

  const snapshot = useCallback(() => {
    setHistory((items) => [...items.slice(-29), annotations]);
    setFuture([]);
  }, [annotations]);

  const pointFromEvent = useCallback(
    (event: React.PointerEvent<SVGSVGElement>): [number, number] | null => {
      const viewer = viewerRef.current;
      const host = hostRef.current;
      const item = viewer?.world.getItemAt(0);
      if (!viewer || !host || !item) return null;
      const rect = host.getBoundingClientRect();
      const pixel = new OpenSeadragon.Point(
        event.clientX - rect.left,
        event.clientY - rect.top
      );
      const viewportPoint = viewer.viewport.pointFromPixel(pixel, true);
      const imagePoint = item.viewportToImageCoordinates(viewportPoint);
      return [
        Math.max(0, Math.min(slide.width, imagePoint.x)),
        Math.max(0, Math.min(slide.height, imagePoint.y))
      ];
    },
    [slide.height, slide.width]
  );

  const makeAnnotation = useCallback(
    (
      kind: Annotation["kind"],
      points: Array<[number, number]>
    ): Annotation => ({
      id: crypto.randomUUID(),
      kind,
      labelId: activeLabel.id,
      label: activeLabel.name,
      color: activeLabel.color,
      points,
      source: "manual",
      visible: true
    }),
    [activeLabel]
  );

  const handlePointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    const point = pointFromEvent(event);
    if (!point) return;
    if (tool === "select") {
      setSelectedId(null);
      return;
    }
    if (tool === "point") {
      snapshot();
      const annotation = makeAnnotation("point", [point]);
      setAnnotations((items) => [...items, annotation]);
      setSelectedId(annotation.id);
      return;
    }
    if (tool === "polygon") {
      setDraft((items) => [...items, point]);
      return;
    }
    if (tool === "rectangle") {
      setRectangleStart(point);
      setCursorPoint(point);
    }
  };

  const handlePointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (tool !== "rectangle" && tool !== "polygon") return;
    setCursorPoint(pointFromEvent(event));
  };

  const handlePointerUp = (event: React.PointerEvent<SVGSVGElement>) => {
    if (tool !== "rectangle" || !rectangleStart) return;
    const point = pointFromEvent(event);
    if (!point) return;
    const distance =
      Math.abs(point[0] - rectangleStart[0]) +
      Math.abs(point[1] - rectangleStart[1]);
    if (distance > 30) {
      snapshot();
      const annotation = makeAnnotation("rectangle", [rectangleStart, point]);
      setAnnotations((items) => [...items, annotation]);
      setSelectedId(annotation.id);
    }
    setRectangleStart(null);
    setCursorPoint(null);
  };

  const finishPolygon = () => {
    if (draft.length < 3) return;
    snapshot();
    const annotation = makeAnnotation("polygon", draft);
    setAnnotations((items) => [...items, annotation]);
    setSelectedId(annotation.id);
    setDraft([]);
    setCursorPoint(null);
  };

  const undo = () => {
    const previous = history.at(-1);
    if (!previous) return;
    setFuture((items) => [annotations, ...items]);
    setAnnotations(previous);
    setHistory((items) => items.slice(0, -1));
  };

  const redo = () => {
    const next = future[0];
    if (!next) return;
    setHistory((items) => [...items, annotations]);
    setAnnotations(next);
    setFuture((items) => items.slice(1));
  };

  const removeSelected = () => {
    if (!selectedId) return;
    snapshot();
    setAnnotations((items) => items.filter((item) => item.id !== selectedId));
    setSelectedId(null);
  };

  const toggleVisibility = (id: string) => {
    setAnnotations((items) =>
      items.map((item) =>
        item.id === id ? { ...item, visible: !item.visible } : item
      )
    );
  };

  const save = async () => {
    setSaving(true);
    try {
      const result = await saveAnnotations(slide.id, annotations);
      setSavedAt(
        new Date(result.savedAt).toLocaleTimeString("zh-CN", {
          hour: "2-digit",
          minute: "2-digit"
        })
      );
    } finally {
      setSaving(false);
    }
  };

  const runAi = async () => {
    setAiLoading(true);
    try {
      const suggestions = await runAiSuggestion(slide.id);
      snapshot();
      setAnnotations((items) => [
        ...items.filter((item) => item.source !== "ai"),
        ...suggestions
      ]);
      setShowAi(true);
    } finally {
      setAiLoading(false);
    }
  };

  const zoomBy = (factor: number) => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    viewer.viewport.zoomBy(factor);
    viewer.viewport.applyConstraints();
  };

  return (
    <div className="viewer-workspace">
      <aside className="tool-rail">
        <div className="tool-group">
          <button
            className={tool === "select" ? "active" : ""}
            onClick={() => setTool("select")}
            title="选择 V"
          >
            <MousePointer2 size={20} />
          </button>
          <button
            className={tool === "pan" ? "active" : ""}
            onClick={() => setTool("pan")}
            title="平移 H"
          >
            <Hand size={20} />
          </button>
        </div>
        <div className="tool-group">
          <button
            className={tool === "polygon" ? "active" : ""}
            onClick={() => setTool("polygon")}
            title="多边形 P"
          >
            <Pencil size={20} />
          </button>
          <button
            className={tool === "rectangle" ? "active" : ""}
            onClick={() => setTool("rectangle")}
            title="矩形 R"
          >
            <Square size={20} />
          </button>
          <button
            className={tool === "point" ? "active" : ""}
            onClick={() => setTool("point")}
            title="点标注 D"
          >
            <CircleDot size={20} />
          </button>
          <button title="智能框选"><BoxSelect size={20} /></button>
        </div>
        <div className="tool-group">
          <button title="测量"><Ruler size={20} /></button>
          <button title="视野聚焦"><Focus size={20} /></button>
          <button title="显示设置"><Contrast size={20} /></button>
        </div>
        <div className="tool-group">
          <button onClick={undo} disabled={!history.length} title="撤销">
            <Undo2 size={20} />
          </button>
          <button onClick={redo} disabled={!future.length} title="重做">
            <Redo2 size={20} />
          </button>
          <button
            onClick={removeSelected}
            disabled={!selectedId}
            className="danger"
            title="删除"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </aside>

      <section className={`slide-stage tool-${tool}`}>
        <div className="stage-floating label-picker">
          <span style={{ background: activeLabel.color }} />
          <div>
            <small>当前标签</small>
            <strong>{activeLabel.name}</strong>
          </div>
          <ChevronDown size={15} />
          <div className="label-menu">
            {LABELS.map((label) => (
              <button
                key={label.id}
                onClick={() => setActiveLabel(label)}
                className={label.id === activeLabel.id ? "selected" : ""}
              >
                <i style={{ background: label.color }} />
                <span>{label.name}</span>
                <kbd>{label.hotkey}</kbd>
              </button>
            ))}
          </div>
        </div>

        <div className="stage-floating ai-status">
          <Sparkles size={15} />
          <span>AI 辅助已开启</span>
          <i />
        </div>

        <div ref={hostRef} className="osd-viewer" />
        <svg
          ref={svgRef}
          className="annotation-overlay"
          preserveAspectRatio="none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onDoubleClick={finishPolygon}
        >
          {visibleAnnotations.map((annotation) => (
            <AnnotationShape
              key={annotation.id}
              annotation={annotation}
              selected={selectedId === annotation.id}
              onSelect={() => tool === "select" && setSelectedId(annotation.id)}
            />
          ))}
          {draft.length > 0 && (
            <g>
              <polyline
                points={pointsToString(
                  cursorPoint ? [...draft, cursorPoint] : draft
                )}
                fill={`${activeLabel.color}20`}
                stroke={activeLabel.color}
                strokeWidth={12}
                vectorEffect="non-scaling-stroke"
                strokeDasharray="30 18"
              />
              {draft.map(([x, y], index) => (
                <circle
                  key={index}
                  cx={x}
                  cy={y}
                  r={22}
                  fill="#fff"
                  stroke={activeLabel.color}
                  strokeWidth={10}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </g>
          )}
          {rectangleStart && cursorPoint && (
            <rect
              x={Math.min(rectangleStart[0], cursorPoint[0])}
              y={Math.min(rectangleStart[1], cursorPoint[1])}
              width={Math.abs(cursorPoint[0] - rectangleStart[0])}
              height={Math.abs(cursorPoint[1] - rectangleStart[1])}
              fill={`${activeLabel.color}25`}
              stroke={activeLabel.color}
              strokeWidth={12}
              vectorEffect="non-scaling-stroke"
              strokeDasharray="28 16"
            />
          )}
        </svg>

        {tool === "polygon" && draft.length > 0 && (
          <div className="drawing-hint">
            <span>{draft.length} 个节点</span>
            双击闭合，Esc 取消
            <button onClick={finishPolygon}><Check size={14} />完成</button>
          </div>
        )}

        <div className="zoom-control">
          <button onClick={() => zoomBy(0.8)}><ZoomOut size={17} /></button>
          <span>{zoom < 1 ? zoom.toFixed(2) : zoom.toFixed(1)}×</span>
          <button onClick={() => zoomBy(1.25)}><ZoomIn size={17} /></button>
          <i />
          <button onClick={() => viewerRef.current?.viewport.goHome()}>
            <Scan size={17} />
          </button>
        </div>

        <div className="scale-indicator">
          <span>200 μm</span>
          <i />
        </div>
      </section>

      <aside className="annotation-panel">
        <div className="annotation-tabs">
          <button
            className={rightTab === "objects" ? "active" : ""}
            onClick={() => setRightTab("objects")}
          >
            标注对象
          </button>
          <button
            className={rightTab === "info" ? "active" : ""}
            onClick={() => setRightTab("info")}
          >
            切片信息
          </button>
        </div>

        {rightTab === "objects" ? (
          <>
            <div className="panel-section layer-section">
              <div className="section-title">
                <span><Layers3 size={16} />图层</span>
                <button><Plus size={15} /></button>
              </div>
              <button className="layer-row active">
                <i className="layer-thumb"><Pencil size={14} /></i>
                <span><strong>人工标注</strong><small>{annotations.filter((a) => a.source !== "ai").length} 个对象</small></span>
                <Eye size={16} />
              </button>
              <button className="layer-row" onClick={() => setShowAi(!showAi)}>
                <i className="layer-thumb ai"><Bot size={14} /></i>
                <span><strong>AI 预标注</strong><small>{annotations.filter((a) => a.source === "ai").length} 个建议</small></span>
                {showAi ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>
            </div>

            <div className="panel-section object-section">
              <div className="section-title">
                <span>对象列表</span>
                <small>{annotations.length}</small>
              </div>
              <div className="object-list">
                {annotations.map((annotation, index) => (
                  <button
                    key={annotation.id}
                    className={`object-row ${
                      selectedId === annotation.id ? "selected" : ""
                    }`}
                    onClick={() => setSelectedId(annotation.id)}
                  >
                    <i
                      className="object-color"
                      style={{
                        color: annotation.color,
                        borderColor: annotation.color,
                        background: `${annotation.color}20`
                      }}
                    >
                      {annotation.kind === "point" ? (
                        <CircleDot size={14} />
                      ) : annotation.kind === "rectangle" ? (
                        <Square size={14} />
                      ) : (
                        <Pencil size={14} />
                      )}
                    </i>
                    <span>
                      <strong>{annotation.label}</strong>
                      <small>
                        #{String(index + 1).padStart(2, "0")} ·{" "}
                        {annotation.source === "ai"
                          ? `AI ${(annotation.confidence ?? 0) * 100}%`
                          : "人工"}
                      </small>
                    </span>
                    <i
                      className="visibility"
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleVisibility(annotation.id);
                      }}
                    >
                      {annotation.visible ? <Eye size={15} /> : <EyeOff size={15} />}
                    </i>
                  </button>
                ))}
                {!annotations.length && (
                  <div className="empty-objects">
                    <Pencil size={24} />
                    <strong>还没有标注</strong>
                    <span>从左侧选择工具开始绘制</span>
                  </div>
                )}
              </div>
            </div>

            <div className="ai-action-card">
              <div><Sparkles size={18} /><span><strong>AI 智能预标注</strong><small>PathFISA-Seg v2.4.1</small></span></div>
              <button onClick={runAi} disabled={aiLoading}>
                {aiLoading ? "分析中..." : "分析当前切片"}
              </button>
            </div>
          </>
        ) : (
          <div className="slide-info-panel">
            <div className="info-thumbnail"><img src={slide.thumbnailUrl} alt="" /></div>
            <dl>
              <div><dt>病例编号</dt><dd>{slide.caseId}</dd></div>
              <div><dt>染色方法</dt><dd>{slide.stain}</dd></div>
              <div><dt>组织类型</dt><dd>{slide.tissueType}</dd></div>
              <div><dt>扫描倍率</dt><dd>{slide.objectivePower}×</dd></div>
              <div><dt>物理分辨率</dt><dd>{slide.mpp} μm/px</dd></div>
              <div><dt>图像尺寸</dt><dd>{slide.width.toLocaleString()} × {slide.height.toLocaleString()}</dd></div>
            </dl>
          </div>
        )}

        <div className="save-bar">
          <div>
            <span className={saving ? "saving" : ""} />
            {saving ? "正在保存..." : `已保存于 ${savedAt}`}
          </div>
          <button onClick={save} disabled={saving}><Save size={16} />保存</button>
        </div>
      </aside>
    </div>
  );
}

