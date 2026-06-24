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
import { PageHeader } from "../components/PageHeader";
import { StatusPill } from "../components/StatusPill";

export function ModelsPage() {
  return (
    <div className="page models-page">
      <PageHeader
        eyebrow="MODEL REGISTRY"
        title="模型中心"
        description="管理小样本训练、增量版本、评估门禁和生产部署。"
        actions={
          <>
            <button className="soft-button"><Play size={17} />新建评估</button>
            <button className="primary-button"><Plus size={17} />发起训练</button>
          </>
        }
      />

      <section className="model-hero">
        <div>
          <span className="eyebrow">CURRENT PRODUCTION MODEL</span>
          <div className="model-title">
            <div className="model-orb"><BrainCircuit size={27} /></div>
            <div>
              <span>组织区域分割模型</span>
              <h2>PathFISA-Seg <b>v2.4.1</b></h2>
            </div>
          </div>
          <p>基于 736 张复核切片与 182 张历史回放切片训练，当前部署于肺腺癌组织分区项目。</p>
          <div className="model-meta">
            <span><CheckCircle2 size={15} />2026-06-20 发布</span>
            <span><GitBranch size={15} />父版本 v2.3.0</span>
            <StatusPill tone="green">生产中</StatusPill>
          </div>
        </div>
        <div className="model-score">
          <span>综合评分</span>
          <strong>92.4</strong>
          <small><ArrowUpRight size={14} />较上一版本 +2.7</small>
        </div>
      </section>

      <section className="model-metrics">
        {[
          ["Dice", "0.914", "+0.018", 91],
          ["IoU", "0.862", "+0.024", 86],
          ["边界 F1", "0.887", "+0.011", 89],
          ["AI 接受率", "84.6%", "+3.1%", 85]
        ].map(([name, value, delta, score]) => (
          <article key={name}>
            <span>{name}</span>
            <strong>{value}</strong>
            <small>{delta}</small>
            <div><i style={{ width: `${score}%` }} /></div>
          </article>
        ))}
      </section>

      <section className="models-grid">
        <article className="panel version-history">
          <div className="panel-heading">
            <div><span className="eyebrow">VERSION HISTORY</span><h2>版本血缘</h2></div>
            <button className="text-button">查看全部 <ChevronRight size={16} /></button>
          </div>
          {[
            ["v2.4.1", "生产版本", "736 + 182 回放", "0.914", "green"],
            ["v2.4.0", "候选版本", "712 + 180 回放", "0.907", "blue"],
            ["v2.3.0", "历史版本", "648 + 160 回放", "0.896", "gray"]
          ].map(([version, status, data, dice, tone], index) => (
            <div className="version-row" key={version}>
              <div className="version-rail"><i className={index === 0 ? "active" : ""} />{index < 2 && <b />}</div>
              <div><strong>{version}</strong><span>{data}</span></div>
              <StatusPill tone={tone as "green" | "blue" | "gray"}>{status}</StatusPill>
              <span>Dice <b>{dice}</b></span>
              <button><ChevronRight size={17} /></button>
            </div>
          ))}
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
          <button className="primary-button">配置增量训练 <ArrowUpRight size={17} /></button>
        </article>
      </section>
    </div>
  );
}
