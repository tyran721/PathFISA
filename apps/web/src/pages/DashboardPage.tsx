import {
  ArrowRight,
  BrainCircuit,
  Check,
  ChevronRight,
  Clock3,
  FileImage,
  Plus,
  ScanSearch,
  Sparkles,
  TrendingUp,
  Users
} from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { StatusPill } from "../components/StatusPill";

const metrics = [
  {
    label: "切片总数",
    value: "1,284",
    delta: "+86 本月",
    icon: FileImage,
    tone: "mint"
  },
  {
    label: "已完成标注",
    value: "73.8%",
    delta: "+5.2%",
    icon: Check,
    tone: "blue"
  },
  {
    label: "待复核任务",
    value: "28",
    delta: "8 项高优先",
    icon: Clock3,
    tone: "amber"
  },
  {
    label: "AI 标注接受率",
    value: "84.6%",
    delta: "+3.1%",
    icon: Sparkles,
    tone: "purple"
  }
];

export function DashboardPage() {
  return (
    <div className="page dashboard-page">
      <PageHeader
        eyebrow="2026 年 6 月 23 日 · 星期二"
        title="晚上好，林医生"
        description="肺腺癌组织分区项目进展顺利，今天有 12 个新任务等待处理。"
        actions={
          <>
            <button className="soft-button">
              <Users size={17} />
              邀请成员
            </button>
            <Link className="primary-button" to="/slides">
              <Plus size={17} />
              导入切片
            </Link>
          </>
        }
      />

      <section className="metric-grid">
        {metrics.map(({ label, value, delta, icon: Icon, tone }) => (
          <article className="metric-card" key={label}>
            <div className={`metric-icon ${tone}`}>
              <Icon size={22} strokeWidth={1.8} />
            </div>
            <span>{label}</span>
            <strong>{value}</strong>
            <small>
              <TrendingUp size={14} />
              {delta}
            </small>
          </article>
        ))}
      </section>

      <section className="dashboard-grid">
        <article className="panel progress-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">PROJECT PROGRESS</span>
              <h2>标注进度</h2>
            </div>
            <button className="text-button">
              查看详情 <ChevronRight size={16} />
            </button>
          </div>
          <div className="progress-hero">
            <div className="progress-ring" style={{ "--progress": 74 } as React.CSSProperties}>
              <div>
                <strong>74%</strong>
                <span>总完成度</span>
              </div>
            </div>
            <div className="progress-list">
              {[
                ["肿瘤区域", 648, 780, "#3ddc97"],
                ["间质区域", 512, 780, "#6f9dff"],
                ["坏死区域", 389, 780, "#b990ff"],
                ["淋巴细胞", 304, 780, "#ffb866"]
              ].map(([label, done, total, color]) => (
                <div className="progress-item" key={label as string}>
                  <div>
                    <span>
                      <i style={{ background: color as string }} />
                      {label}
                    </span>
                    <b>
                      {done as number}/{total as number}
                    </b>
                  </div>
                  <div className="progress-track">
                    <i
                      style={{
                        width: `${((done as number) / (total as number)) * 100}%`,
                        background: color as string
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </article>

        <article className="panel ai-panel">
          <div className="ai-glow" />
          <div className="panel-heading">
            <div>
              <span className="eyebrow">AI INSIGHT</span>
              <h2>主动学习建议</h2>
            </div>
            <BrainCircuit size={23} />
          </div>
          <p>
            模型发现 <strong>36 个高价值区域</strong>，集中在低分化肿瘤与炎症交界处。
            优先标注这些区域可显著提升下一轮模型效果。
          </p>
          <div className="ai-stats">
            <div>
              <span>候选区域</span>
              <strong>36</strong>
            </div>
            <div>
              <span>平均不确定性</span>
              <strong>0.42</strong>
            </div>
            <div>
              <span>预计耗时</span>
              <strong>42 min</strong>
            </div>
          </div>
          <button className="ai-button">
            开始高价值标注 <ArrowRight size={17} />
          </button>
        </article>
      </section>

      <section className="panel recent-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">RECENT TASKS</span>
            <h2>最近任务</h2>
          </div>
          <Link className="text-button" to="/tasks">
            全部任务 <ChevronRight size={16} />
          </Link>
        </div>
        <div className="task-table">
          <div className="table-head">
            <span>病例 / 切片</span>
            <span>任务类型</span>
            <span>负责人</span>
            <span>进度</span>
            <span>状态</span>
            <span />
          </div>
          {[
            ["LUAD-2026-0184", "HE · A-03", "肿瘤区域分割", "张敏", 82, "标注中", "blue"],
            ["LUAD-2026-0181", "HE · B-01", "多区域复核", "林医生", 100, "待复核", "amber"],
            ["LUAD-2026-0179", "IHC · PD-L1", "阳性细胞计数", "王冉", 100, "已完成", "green"],
            ["LUAD-2026-0176", "HE · A-01", "组织区域分割", "李夏", 46, "标注中", "blue"]
          ].map(([id, slide, type, owner, progress, status, tone]) => (
            <div className="table-row" key={id as string}>
              <span className="case-cell">
                <i><ScanSearch size={18} /></i>
                <span><strong>{id}</strong><small>{slide}</small></span>
              </span>
              <span>{type}</span>
              <span className="owner-cell"><i>{(owner as string).slice(0, 1)}</i>{owner}</span>
              <span className="mini-progress">
                <i><b style={{ width: `${progress}%` }} /></i>{progress}%
              </span>
              <span><StatusPill tone={tone as "green" | "amber" | "blue"}>{status}</StatusPill></span>
              <span><button className="row-button"><ChevronRight size={17} /></button></span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

