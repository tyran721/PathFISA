import { Bell, Database, KeyRound, Plus, Save, ShieldCheck, SlidersHorizontal, Trash2, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { getProjectSettings, saveProjectSettings } from "../api";
import { PageHeader } from "../components/PageHeader";
import type { ProjectSettings } from "../types";

export function SettingsPage() {
  const [tab, setTab] = useState("general");
  const [settings, setSettings] = useState<ProjectSettings | null>(null);
  const [saved, setSaved] = useState("");
  useEffect(() => { getProjectSettings().then(setSettings).catch(console.error); }, []);
  if (!settings) return <div className="page page-loading">正在读取项目设置...</div>;

  const change = <K extends keyof ProjectSettings>(key: K, value: ProjectSettings[K]) => setSettings({ ...settings, [key]: value });
  const save = async () => {
    setSettings(await saveProjectSettings(settings));
    setSaved("设置已保存");
    window.setTimeout(() => setSaved(""), 2200);
  };
  const tabs: Array<[string, string, LucideIcon]> = [
    ["general", "基本信息", SlidersHorizontal],
    ["workflow", "标注流程", Users],
    ["ai", "AI 与模型", Database],
    ["security", "权限与审计", ShieldCheck],
    ["notifications", "通知", Bell]
  ];

  return (
    <div className="page settings-page">
      <PageHeader eyebrow="PROJECT SETTINGS" title="项目设置" description="管理项目元数据、标签体系、标注流程、模型策略和安全边界。" actions={<button className="primary-button" onClick={save}><Save size={16} />保存设置</button>} />
      {saved && <div className="save-toast"><ShieldCheck size={16} />{saved}</div>}
      <div className="settings-layout">
        <aside className="settings-nav panel">
          {tabs.map(([id,label,Icon]) => <button key={id} className={tab===id ? "active":""} onClick={()=>setTab(id)}><Icon size={17}/>{label}</button>)}
        </aside>
        <main className="settings-content panel">
          {tab === "general" && <>
            <div className="settings-heading"><h2>项目基本信息</h2><p>这些信息会展示在项目切换器、导出清单和审计记录中。</p></div>
            <div className="form-grid">
              <label><span>项目名称</span><input value={settings.projectName} onChange={e=>change("projectName",e.target.value)} /></label>
              <label><span>项目编码</span><input value={settings.projectCode} onChange={e=>change("projectCode",e.target.value)} /></label>
              <label><span>所属机构</span><input value={settings.institution} onChange={e=>change("institution",e.target.value)} /></label>
              <label><span>项目负责人</span><input value={settings.owner} onChange={e=>change("owner",e.target.value)} /></label>
              <label className="span-2"><span>项目说明</span><textarea rows={4} value={settings.description} onChange={e=>change("description",e.target.value)} /></label>
            </div>
            <div className="settings-subheading"><div><h3>标签体系</h3><p>标注工作台会读取以下标签颜色和名称。</p></div><button className="soft-button" onClick={()=>change("labels",[...settings.labels,{id:`label-${Date.now()}`,name:"新标签",color:"#4f86ff"}])}><Plus size={15}/>添加标签</button></div>
            <div className="label-settings">{settings.labels.map((label,index)=><div key={label.id}><input type="color" value={label.color} onChange={e=>change("labels",settings.labels.map((item,i)=>i===index?{...item,color:e.target.value}:item))}/><input value={label.name} onChange={e=>change("labels",settings.labels.map((item,i)=>i===index?{...item,name:e.target.value}:item))}/><code>{label.id}</code><button onClick={()=>change("labels",settings.labels.filter((_,i)=>i!==index))}><Trash2 size={15}/></button></div>)}</div>
          </>}
          {tab === "workflow" && <>
            <div className="settings-heading"><h2>标注与复核流程</h2><p>配置新任务的默认人员、自动保存和金标准审核规则。</p></div>
            <div className="form-grid">
              <label><span>默认标注员</span><select value={settings.defaultAssignee} onChange={e=>change("defaultAssignee",e.target.value)}><option>张敏</option><option>王冉</option><option>李夏</option></select></label>
              <label><span>默认复核人</span><select value={settings.defaultReviewer} onChange={e=>change("defaultReviewer",e.target.value)}><option>林医生</option><option>王主任</option></select></label>
              <label><span>复核模式</span><select value={settings.reviewMode} onChange={e=>change("reviewMode",e.target.value as ProjectSettings["reviewMode"])}><option value="single">单人复核</option><option value="double">双人复核</option><option value="expert">专家仲裁</option></select></label>
              <label><span>自动保存间隔（秒）</span><input type="number" value={settings.autoSaveSeconds} onChange={e=>change("autoSaveSeconds",Number(e.target.value))}/></label>
            </div>
          </>}
          {tab === "ai" && <>
            <div className="settings-heading"><h2>AI 与模型策略</h2><p>控制标注工作台默认模型、预标注阈值和加载行为。</p></div>
            <div className="form-grid">
              <label className="span-2"><span>默认辅助模型</span><select value={settings.defaultModel} onChange={e=>change("defaultModel",e.target.value)}><option>PathFISA-Seg v2.4.1</option><option>PathFISA-Seg v2.3.0</option></select></label>
              <label className="span-2"><span>AI 置信度阈值：{settings.aiThreshold.toFixed(2)}</span><input type="range" min=".1" max=".95" step=".05" value={settings.aiThreshold} onChange={e=>change("aiThreshold",Number(e.target.value))}/></label>
            </div>
            <div className="settings-switch-list"><div><span><strong>打开切片时自动加载 AI 预标注</strong><small>不会自动写入金标准，只作为建议图层。</small></span><button className={`switch ${settings.aiAutoLoad?"on":""}`} onClick={()=>change("aiAutoLoad",!settings.aiAutoLoad)}><i/></button></div></div>
          </>}
          {tab === "security" && <>
            <div className="settings-heading"><h2>权限与审计</h2><p>控制数据导出和审计日志保留策略。</p></div>
            <div className="settings-switch-list">
              <div><span><strong>允许项目成员导出数据</strong><small>可导出有权限的切片和标注版本。</small></span><button className={`switch ${settings.allowExport?"on":""}`} onClick={()=>change("allowExport",!settings.allowExport)}><i/></button></div>
              <div><span><strong>导出必须经过管理员审批</strong><small>大批量导出会生成审计和审批记录。</small></span><button className={`switch ${settings.requireExportApproval?"on":""}`} onClick={()=>change("requireExportApproval",!settings.requireExportApproval)}><i/></button></div>
            </div>
            <label className="single-setting"><span>审计日志保留天数</span><input type="number" value={settings.keepAuditDays} onChange={e=>change("keepAuditDays",Number(e.target.value))}/></label>
            <div className="security-note"><KeyRound size={18}/><div><strong>机构身份服务</strong><span>OIDC / LDAP 尚未配置，当前使用本地演示身份。</span></div><button className="soft-button">配置</button></div>
          </>}
          {tab === "notifications" && <>
            <div className="settings-heading"><h2>通知偏好</h2><p>选择需要在站内收到的业务提醒。</p></div>
            <div className="settings-switch-list">
              {["新任务分派","任务即将逾期","标注被驳回","模型作业完成","候选模型通过门禁"].map((item,index)=><div key={item}><span><strong>{item}</strong><small>{index<3?"标注工作流通知":"算法与模型通知"}</small></span><button className="switch on"><i/></button></div>)}
            </div>
          </>}
        </main>
      </div>
    </div>
  );
}
