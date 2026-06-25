import {
  ArrowUpRight,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  GitBranch,
  Play,
  Plus,
  RotateCcw,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getModelRuns } from "../api";
import { PageHeader } from "../components/PageHeader";
import { StatusPill } from "../components/StatusPill";
import type { ModelRun } from "../types";

export function ModelsPage() {
  const [runs, setRuns] = useState<ModelRun[]>([]);
  useEffect(() => { getModelRuns().then(setRuns).catch(console.error); }, []);

  return (
    <div className="page models-page">
      <PageHeader
        eyebrow="MODEL REGISTRY"
        title="模型中心"
        description="管理小样本训练、独立评估、增量学习、评估门禁和生产部署。"
        actions={
          <>
            <Link className="soft-button" to="/models/evaluate/new"><Play size={17} />新建评估</Link>
            <Link className="primary-button" to="/models/train/new"><Plus size={17} />发起训练</Link>
          </>
        }
      />

      <section className="model-hero">
        <div>
          <span className="eyebrow">CURRENT PRODUCTION MODEL</span>
          <div className="model-title">
            <div className="model-orb"><BrainCircuit size={27} /></div>
            <div><span>组织区域分割模型</span><h2>PathFISA-Seg <b>v2.4.1</b></h2></div>
          </div>
          <p>用于真实高分辨率病理切片的区域分割与智能预标注，当前处于算法接口模拟阶段。</p>
          <div className="model-meta">
            <span><CheckCircle2 size={15} />2026-06-20 发布</span>
            <span><GitBranch size={15} />父版本 v2.3.0</span>
            <StatusPill tone="green">生产中</StatusPill>
          </div>
        </div>
        <div className="model-score"><span>综合评分</span><strong>92.4</strong><small><ArrowUpRight size={14} />较上一版本 +2.7</small></div>
      </section>

      <section className="model-metrics">
        {[
          ["Dice", "0.914", "+0.018", 91],
          ["IoU", "0.862", "+0.024", 86],
          ["边界 F1", "0.887", "+0.011", 89],
          ["AI 接受率", "84.6%", "+3.1%", 85]
        ].map(([name, value, delta, score]) => (
          <article key={name}>
            <span>{name}</span><strong>{value}</strong><small>{delta}</small>
            <div><i style={{ width: `${score}%` }} /></div>
          </article>
        ))}
      </section>

      <section className="models-grid">
        <article className="panel version-history">
          <div className="panel-heading">
            <div><span className="eyebrow">EXPERIMENT RUNS</span><h2>最近算法作业</h2></div>
            <span className="run-count">{runs.length} 项</span>
          </div>
          {runs.slice(0, 4).map((run, index) => (
            <div className="version-row" key={run.id}>
              <div className="version-rail"><i className={index === 0 ? "active" : ""} />{index < Math.min(3, runs.length - 1) && <b />}</div>
              <div><strong>{run.name}</strong><span>{run.architecture}</span></div>
              <StatusPill tone={run.status === "completed" ? "green" : run.status === "failed" ? "amber" : "blue"}>
                {run.status === "completed" ? "已完成" : run.status === "queued" ? "排队中" : "运行中"}
              </StatusPill>
              <span>{run.kind === "evaluation" ? "评估" : run.kind === "training" ? "训练" : "增量"}</span>
              <button><ChevronRight size={17} /></button>
            </div>
          ))}
          {!runs.length && <div className="empty-run">暂无算法作业</div>}
        </article>
        <article className="panel training-suggestion">
          <div className="suggestion-icon"><Sparkles size={23} /></div>
          <span className="eyebrow">INCREMENTAL LEARNING</span>
          <h2>可以开始新一轮增量学习</h2>
          <p>自上次训练后，已有 <strong>64 张</strong> 新切片通过专家复核，其中 21 张为主动学习高价值样本。</p>
          <div className="gate-list">
            <span><ShieldCheck size={16} />金标准数据完整</span>
            <span><ShieldCheck size={16} />历史回放集已就绪</span>
            <span><RotateCcw size={16} />旧任务回归门禁已配置</span>
          </div>
          <Link className="primary-button" to="/models/incremental/new">配置增量训练 <ArrowUpRight size={17} /></Link>
        </article>
      </section>
    </div>
  );
}
