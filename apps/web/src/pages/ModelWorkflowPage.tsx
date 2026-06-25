import {
  ArrowLeft,
  Boxes,
  BrainCircuit,
  Check,
  ChevronRight,
  Cpu,
  Database,
  FlaskConical,
  Gauge,
  GitCompare,
  Layers3,
  Play,
  RotateCcw,
  Save,
  ShieldCheck,
  Sparkles,
  Workflow
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { createModelRun, simulateModelRun } from "../api";
import type { ModelRunKind } from "../types";

const MODES = {
  evaluate: {
    kind: "evaluation" as ModelRunKind,
    eyebrow: "MODEL EVALUATION",
    title: "新建模型评估",
    description: "在冻结测试集和关键亚组上验证候选模型，生成可追溯评估报告。",
    icon: FlaskConical,
    action: "启动评估"
  },
  train: {
    kind: "training" as ModelRunKind,
    eyebrow: "FEW-SHOT TRAINING",
    title: "发起小样本训练",
    description: "选择病理预训练骨干、任务头和增强策略，创建可复现训练实验。",
    icon: BrainCircuit,
    action: "提交训练"
  },
  incremental: {
    kind: "incremental" as ModelRunKind,
    eyebrow: "INCREMENTAL LEARNING",
    title: "配置增量训练",
    description: "融合新增金标准与历史回放集，并通过旧任务回归门禁控制发布风险。",
    icon: RotateCcw,
    action: "启动增量训练"
  }
};

const ARCHITECTURES = [
  { id: "convnext-unet", name: "ConvNeXt-Tiny U-Net", tag: "推荐", detail: "兼顾病理纹理与区域边界，适合组织分割。" },
  { id: "swin-unetr", name: "Swin-UNETR", tag: "Transformer", detail: "长程上下文强，显存占用相对较高。" },
  { id: "resnet-fpn", name: "ResNet50 + FPN", tag: "经典", detail: "训练稳定，适合检测和多尺度任务。" }
];

export function ModelWorkflowPage() {
  const { mode = "train" } = useParams();
  const meta = MODES[mode as keyof typeof MODES] ?? MODES.train;
  const Icon = meta.icon;
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    name: `${meta.title} · ${new Date().toLocaleDateString("zh-CN")}`,
    dataset: meta.kind === "incremental" ? "LUAD-Increment-v12" : "LUAD-Gold-v12",
    model: "PathFISA-Seg v2.4.1",
    architecture: "ConvNeXt-Tiny U-Net",
    algorithm: meta.kind === "evaluation" ? "多尺度滑窗评估" : meta.kind === "incremental" ? "经验回放 + 知识蒸馏" : "预训练骨干参数高效微调",
    patchSize: 1024,
    batchSize: 8,
    epochs: 80,
    learningRate: 0.0001,
    augmentation: true,
    replayRatio: 30,
    threshold: 0.5,
    gateDice: 0.8,
    gateRegression: -0.02,
    gpu: "NVIDIA RTX 4090 · GPU 0"
  });

  const pipeline = useMemo(() => {
    if (meta.kind === "evaluation") return ["冻结测试集", "多倍率切块", "模型推理", "亚组评估", "生成报告"];
    if (meta.kind === "incremental") return ["新增金标准", "历史回放", "蒸馏约束", "联合训练", "回归门禁"];
    return ["病例级划分", "组织采样", "颜色增强", "小样本微调", "验证早停"];
  }, [meta.kind]);
  const workflowSteps: Array<[number, string, string, LucideIcon]> = [
    [1, "基础配置", "数据与基础模型", Database],
    [2, "算法架构", "网络和学习策略", Layers3],
    [3, "运行参数", "超参数与资源", Cpu],
    [4, "质量门禁", "指标与风险约束", ShieldCheck]
  ];

  const submit = async () => {
    setSubmitting(true);
    try {
      const run = await createModelRun({
        kind: meta.kind,
        name: form.name,
        algorithm: form.algorithm,
        architecture: form.architecture,
        dataset: form.dataset,
        config: {
          baseModel: form.model,
          patchSize: form.patchSize,
          batchSize: form.batchSize,
          epochs: form.epochs,
          learningRate: form.learningRate,
          augmentation: form.augmentation,
          replayRatio: form.replayRatio,
          threshold: form.threshold,
          gateDice: form.gateDice,
          gateRegression: form.gateRegression,
          gpu: form.gpu
        }
      });
      await simulateModelRun(run.id);
      setDone(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="algorithm-page result-page">
        <div className="result-orb"><Check size={34} /></div>
        <span className="eyebrow">{meta.eyebrow}</span>
        <h1>{meta.kind === "evaluation" ? "评估作业已完成" : "模拟作业已创建"}</h1>
        <p>配置、数据集、算法参数和模拟指标已经记录到模型作业中心。</p>
        <div className="result-metrics">
          <div><span>配置校验</span><strong>通过</strong></div>
          <div><span>数据版本</span><strong>{form.dataset}</strong></div>
          <div><span>运行状态</span><strong>Completed</strong></div>
        </div>
        <div className="result-actions">
          <button className="soft-button" onClick={() => setDone(false)}>复制配置再运行</button>
          <button className="primary-button" onClick={() => navigate("/models")}>返回模型中心</button>
        </div>
      </div>
    );
  }

  return (
    <div className="algorithm-page">
      <header className="algorithm-header">
        <Link to="/models"><ArrowLeft size={18} /></Link>
        <div className="algorithm-icon"><Icon size={23} /></div>
        <div><span className="eyebrow">{meta.eyebrow}</span><h1>{meta.title}</h1><p>{meta.description}</p></div>
        <button className="soft-button"><Save size={16} />保存草稿</button>
      </header>

      <div className="algorithm-layout">
        <aside className="workflow-steps">
          {workflowSteps.map(([number, title, detail, StepIcon]) => (
            <button className={step === number ? "active" : step > number ? "done" : ""} onClick={() => setStep(number)} key={number}>
              <i>{step > number ? <Check size={14} /> : <StepIcon size={15} />}</i>
              <span><strong>{title}</strong><small>{detail}</small></span>
              <ChevronRight size={15} />
            </button>
          ))}
          <div className="compute-card">
            <Gauge size={18} /><span>预计资源</span><strong>{meta.kind === "evaluation" ? "18 分钟" : "2.8 GPU 小时"}</strong><small>基于当前配置估算</small>
          </div>
        </aside>

        <main className="workflow-main">
          <section className="pipeline-card">
            <div className="pipeline-title"><Workflow size={17} /><span>算法数据流</span></div>
            <div className="pipeline-flow">
              {pipeline.map((item, index) => (
                <div key={item}><i>{index + 1}</i><span>{item}</span>{index < pipeline.length - 1 && <ChevronRight size={16} />}</div>
              ))}
            </div>
          </section>

          {step === 1 && (
            <section className="config-panel">
              <div className="config-heading"><div><h2>基础配置</h2><p>明确实验身份、数据版本和基线模型。</p></div><Database size={24} /></div>
              <div className="form-grid">
                <label className="span-2"><span>作业名称</span><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
                <label><span>数据集版本</span><select value={form.dataset} onChange={(e) => setForm({ ...form, dataset: e.target.value })}><option>LUAD-Gold-v12</option><option>LUAD-Increment-v12</option><option>LUAD-Test-v3</option></select></label>
                <label><span>基础模型</span><select value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })}><option>PathFISA-Seg v2.4.1</option><option>PathFISA-Seg v2.3.0</option><option>病理预训练基础模型</option></select></label>
                <label className="span-2"><span>算法策略</span><select value={form.algorithm} onChange={(e) => setForm({ ...form, algorithm: e.target.value })}>
                  {meta.kind === "evaluation" ? <><option>多尺度滑窗评估</option><option>单倍率快速评估</option></> : meta.kind === "incremental" ? <><option>经验回放 + 知识蒸馏</option><option>仅经验回放</option><option>正则化持续学习</option></> : <><option>预训练骨干参数高效微调</option><option>冻结骨干训练任务头</option><option>全量微调</option></>}
                </select></label>
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="config-panel">
              <div className="config-heading"><div><h2>模型算法与架构</h2><p>选择适合组织纹理、尺度和标注类型的网络结构。</p></div><Boxes size={24} /></div>
              <div className="architecture-grid">
                {ARCHITECTURES.map((item) => (
                  <button className={form.architecture === item.name ? "active" : ""} onClick={() => setForm({ ...form, architecture: item.name })} key={item.id}>
                    <div><BrainCircuit size={22} /><span>{item.tag}</span></div><h3>{item.name}</h3><p>{item.detail}</p>
                    <dl><div><dt>编码器</dt><dd>ImageNet/病理预训练</dd></div><div><dt>输入</dt><dd>{form.patchSize} px</dd></div></dl>
                  </button>
                ))}
              </div>
              <div className="toggle-row"><div><Sparkles size={18} /><span><strong>病理数据增强</strong><small>颜色扰动、旋转、尺度和组织形态增强</small></span></div><button className={`switch ${form.augmentation ? "on" : ""}`} onClick={() => setForm({ ...form, augmentation: !form.augmentation })}><i /></button></div>
            </section>
          )}

          {step === 3 && (
            <section className="config-panel">
              <div className="config-heading"><div><h2>超参数与计算资源</h2><p>这些参数会写入运行清单，保证实验可复现。</p></div><Cpu size={24} /></div>
              <div className="form-grid">
                <label><span>Patch 尺寸</span><select value={form.patchSize} onChange={(e) => setForm({ ...form, patchSize: Number(e.target.value) })}><option value={512}>512 × 512</option><option value={1024}>1024 × 1024</option><option value={2048}>2048 × 2048</option></select></label>
                <label><span>Batch Size</span><input type="number" value={form.batchSize} onChange={(e) => setForm({ ...form, batchSize: Number(e.target.value) })} /></label>
                <label><span>Epochs</span><input type="number" value={form.epochs} onChange={(e) => setForm({ ...form, epochs: Number(e.target.value) })} /></label>
                <label><span>学习率</span><input type="number" step="0.00001" value={form.learningRate} onChange={(e) => setForm({ ...form, learningRate: Number(e.target.value) })} /></label>
                <label className="span-2"><span>计算设备</span><select value={form.gpu} onChange={(e) => setForm({ ...form, gpu: e.target.value })}><option>NVIDIA RTX 4090 · GPU 0</option><option>NVIDIA A100 80GB · GPU 1</option><option>CPU 模拟队列</option></select></label>
                {meta.kind === "incremental" && <label className="span-2"><span>历史回放占比：{form.replayRatio}%</span><input type="range" min="10" max="70" value={form.replayRatio} onChange={(e) => setForm({ ...form, replayRatio: Number(e.target.value) })} /></label>}
                {meta.kind === "evaluation" && <label className="span-2"><span>推理阈值：{form.threshold.toFixed(2)}</span><input type="range" min="0.1" max="0.9" step="0.05" value={form.threshold} onChange={(e) => setForm({ ...form, threshold: Number(e.target.value) })} /></label>}
              </div>
            </section>
          )}

          {step === 4 && (
            <section className="config-panel">
              <div className="config-heading"><div><h2>模型质量门禁</h2><p>候选模型只有满足关键指标和旧任务回归约束才可进入审批。</p></div><ShieldCheck size={24} /></div>
              <div className="gate-config">
                <div><span><Check size={16} />新测试集 Dice</span><input type="number" step=".01" value={form.gateDice} onChange={(e) => setForm({ ...form, gateDice: Number(e.target.value) })} /><b>最低值</b></div>
                <div><span><GitCompare size={16} />旧任务 Dice 变化</span><input type="number" step=".005" value={form.gateRegression} onChange={(e) => setForm({ ...form, gateRegression: Number(e.target.value) })} /><b>允许下限</b></div>
                <div><span><ShieldCheck size={16} />病例级数据隔离</span><strong>强制启用</strong><b>防止数据泄漏</b></div>
              </div>
              <div className="review-summary">
                <h3>运行摘要</h3>
                <div><span>作业类型</span><strong>{meta.title}</strong></div><div><span>算法</span><strong>{form.algorithm}</strong></div><div><span>架构</span><strong>{form.architecture}</strong></div><div><span>数据集</span><strong>{form.dataset}</strong></div>
              </div>
            </section>
          )}

          <footer className="workflow-footer">
            <button className="soft-button" onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1}>上一步</button>
            {step < 4 ? <button className="primary-button" onClick={() => setStep(step + 1)}>下一步 <ChevronRight size={16} /></button> : <button className="primary-button" onClick={submit} disabled={submitting}><Play size={16} />{submitting ? "正在创建..." : meta.action}</button>}
          </footer>
        </main>
      </div>
    </div>
  );
}
