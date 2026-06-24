import {
  Activity,
  Bell,
  BrainCircuit,
  ChevronDown,
  ClipboardCheck,
  LayoutDashboard,
  Microscope,
  Search,
  Settings2,
  Sparkles
} from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

const navigation = [
  { to: "/", label: "总览", icon: LayoutDashboard, end: true },
  { to: "/slides", label: "病例与切片", icon: Microscope },
  { to: "/tasks", label: "标注任务", icon: ClipboardCheck },
  { to: "/models", label: "模型中心", icon: BrainCircuit }
];

export function AppShell() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <span />
            <span />
            <span />
          </div>
          <div>
            <strong>PathFISA</strong>
            <small>PATHOLOGY INTELLIGENCE</small>
          </div>
        </div>

        <div className="project-switcher">
          <div className="project-icon">LU</div>
          <div>
            <span>当前研究项目</span>
            <strong>肺腺癌组织分区</strong>
          </div>
          <ChevronDown size={16} />
        </div>

        <nav className="main-nav">
          <p>工作空间</p>
          {navigation.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}>
              <Icon size={19} strokeWidth={1.8} />
              <span>{label}</span>
              {label === "标注任务" && <em>12</em>}
            </NavLink>
          ))}
          <p>系统</p>
          <a href="#analytics">
            <Activity size={19} strokeWidth={1.8} />
            <span>数据分析</span>
          </a>
          <a href="#settings">
            <Settings2 size={19} strokeWidth={1.8} />
            <span>项目设置</span>
          </a>
        </nav>

        <div className="sidebar-insight">
          <Sparkles size={18} />
          <span>本周 AI 已节省</span>
          <strong>18.6 小时</strong>
          <small>较上周提升 12.4%</small>
        </div>

        <div className="user-card">
          <div className="avatar">林</div>
          <div>
            <strong>林医生</strong>
            <span>病理专家</span>
          </div>
          <ChevronDown size={16} />
        </div>
      </aside>

      <main className="app-main">
        <header className="topbar">
          <div className="global-search">
            <Search size={18} />
            <input placeholder="搜索病例、切片或任务..." />
            <kbd>⌘ K</kbd>
          </div>
          <div className="topbar-actions">
            <button className="icon-button" aria-label="通知">
              <Bell size={19} />
              <i />
            </button>
            <button className="soft-button">
              <Sparkles size={17} />
              智能助手
            </button>
          </div>
        </header>
        <Outlet />
      </main>
    </div>
  );
}

