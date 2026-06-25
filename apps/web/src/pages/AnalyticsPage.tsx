import {
  Activity,
  BrainCircuit,
  Clock3,
  Download,
  FileImage,
  MousePointerClick,
  TrendingUp,
  Users
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getAnalytics } from "../api";
import { PageHeader } from "../components/PageHeader";
import type { AnalyticsData } from "../types";

export function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  useEffect(() => { getAnalytics().then(setData).catch(console.error); }, []);
  const maxWeekly = Math.max(...(data?.weeklyThroughput ?? [1]));
  const linePoints = useMemo(() => {
    if (!data) return "";
    return data.modelTrend.map((item, index) => `${20 + index * 120},${150 - (item.dice - 0.78) * 650}`).join(" ");
  }, [data]);
  if (!data) return <div className="page page-loading">正在汇总分析数据...</div>;
  const summaryCards: Array<[string, string | number, string, LucideIcon, string]> = [
    ["切片数据", data.summary.slides, "张", FileImage, "#28a67b"],
    ["标注对象", data.summary.annotations.toLocaleString(), "个", MousePointerClick, "#6689ec"],
    ["已完成任务", data.summary.completedTasks, "项", Activity, "#b37af0"],
    ["AI 接受率", data.summary.aiAcceptance, "%", BrainCircuit, "#e9a24c"],
    ["中位标注耗时", data.summary.medianMinutes, "分钟", Clock3, "#e76878"]
  ];

  return (
    <div className="page analytics-page">
      <PageHeader
        eyebrow="PROJECT ANALYTICS"
        title="数据分析"
        description="从数据生产、人员效率和模型收益三个维度观察项目运行质量。"
        actions={<button className="soft-button"><Download size={16} />导出分析报告</button>}
      />
      <section className="analytics-metrics">
        {summaryCards.map(([label, value, unit, Icon, color]) => (
          <article key={label}><i style={{ color, background: `${color}18` }}><Icon size={20} /></i><span>{label}</span><strong>{value}<small>{unit}</small></strong><em><TrendingUp size={12} />本月稳定</em></article>
        ))}
      </section>

      <section className="analytics-grid">
        <article className="panel chart-panel throughput-chart">
          <div className="panel-heading"><div><span className="eyebrow">ANNOTATION THROUGHPUT</span><h2>近七日标注产能</h2></div><span>总计 {data.weeklyThroughput.reduce((a, b) => a + b, 0)} 项</span></div>
          <div className="bar-chart">
            {data.weeklyThroughput.map((value, index) => <div key={index}><span>{value}</span><i style={{ height: `${(value / maxWeekly) * 150}px` }} /><small>{["周一","周二","周三","周四","周五","周六","周日"][index]}</small></div>)}
          </div>
        </article>
        <article className="panel chart-panel distribution-chart">
          <div className="panel-heading"><div><span className="eyebrow">LABEL DISTRIBUTION</span><h2>标签分布</h2></div></div>
          <div className="donut-wrap">
            <div className="analytics-donut" style={{ background: `conic-gradient(${data.labelDistribution.map((item, index) => `${item.color} ${data.labelDistribution.slice(0,index).reduce((s,x)=>s+x.value,0)}% ${data.labelDistribution.slice(0,index+1).reduce((s,x)=>s+x.value,0)}%`).join(",")})` }}><div><strong>18.4k</strong><span>对象</span></div></div>
            <div className="legend-list">{data.labelDistribution.map((item) => <div key={item.name}><i style={{ background: item.color }} /><span>{item.name}</span><strong>{item.value}%</strong></div>)}</div>
          </div>
        </article>
        <article className="panel chart-panel trend-chart">
          <div className="panel-heading"><div><span className="eyebrow">MODEL IMPROVEMENT</span><h2>模型版本趋势</h2></div><span>Dice +9.3%</span></div>
          <svg viewBox="0 0 520 185" role="img">
            {[40,80,120,160].map((y) => <line key={y} x1="20" y1={y} x2="500" y2={y} />)}
            <polyline points={linePoints} />
            {data.modelTrend.map((item,index) => <g key={item.version}><circle cx={20+index*120} cy={150-(item.dice-.78)*650} r="5" /><text x={20+index*120} y="177">{item.version}</text><text x={20+index*120} y={140-(item.dice-.78)*650}>{item.dice}</text></g>)}
          </svg>
        </article>
        <article className="panel member-panel">
          <div className="panel-heading"><div><span className="eyebrow">TEAM QUALITY</span><h2>成员效率与质量</h2></div><Users size={19} /></div>
          <div className="member-table">
            <div className="member-head"><span>成员</span><span>任务</span><span>工时</span><span>通过率</span></div>
            {data.members.map((member) => <div key={member.name}><span><i>{member.name.slice(0,1)}</i><strong>{member.name}</strong></span><span>{member.tasks}</span><span>{member.hours}h</span><span><b style={{ width: `${member.passRate*100}%` }} />{Math.round(member.passRate*100)}%</span></div>)}
          </div>
        </article>
      </section>
    </div>
  );
}
