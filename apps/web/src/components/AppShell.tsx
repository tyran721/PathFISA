import {
  Activity,
  Bell,
  BrainCircuit,
  CheckCheck,
  ChevronDown,
  ClipboardCheck,
  Clock3,
  LayoutDashboard,
  MessageCircle,
  Microscope,
  Send,
  Search,
  Settings2,
  Sparkles,
  X
} from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { askAssistant, getNotifications } from "../api";
import type { AppNotification, AssistantMessage } from "../types";

const navigation = [
  { to: "/", label: "总览", icon: LayoutDashboard, end: true },
  { to: "/slides", label: "病例与切片", icon: Microscope },
  { to: "/tasks", label: "标注任务", icon: ClipboardCheck },
  { to: "/models", label: "模型中心", icon: BrainCircuit }
];

const systemNavigation = [
  { to: "/analytics", label: "数据分析", icon: Activity },
  { to: "/settings", label: "项目设置", icon: Settings2 }
];

export function AppShell() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantInput, setAssistantInput] = useState("");
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "你好，我是 PathFISA 智能助手。可以问我如何标注、查看真实 SVS、管理任务或配置模型流程。",
      createdAt: new Date().toISOString()
    }
  ]);

  useEffect(() => {
    getNotifications().then(setNotifications).catch(console.error);
  }, []);

  const unreadCount = notifications.filter((item) => item.unread).length;

  const openNotification = (notification: AppNotification) => {
    setNotifications((items) =>
      items.map((item) => item.id === notification.id ? { ...item, unread: false } : item)
    );
    if (notification.link) navigate(notification.link);
    setNotificationOpen(false);
  };

  const sendAssistant = async (preset?: string) => {
    const text = (preset ?? assistantInput).trim();
    if (!text || assistantLoading) return;
    setAssistantInput("");
    setMessages((items) => [...items, {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      createdAt: new Date().toISOString()
    }]);
    setAssistantLoading(true);
    try {
      const result = await askAssistant(text, window.location.pathname);
      setMessages((items) => [...items, {
        id: crypto.randomUUID(),
        role: "assistant",
        content: result.answer,
        createdAt: new Date().toISOString()
      }]);
    } catch {
      setMessages((items) => [...items, {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "助手暂时无法连接，请确认后端 API 已启动。",
        createdAt: new Date().toISOString()
      }]);
    } finally {
      setAssistantLoading(false);
    }
  };

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
            <small>病理小样本增量自学习智能标注软件</small>
          </div>
        </div>

        <div className="project-switcher">
          <div className="project-icon">LU</div>
          <div>
            <span>当前研究项目</span>
            <strong>病理小样本增量学习</strong>
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
          {systemNavigation.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to}>
              <Icon size={19} strokeWidth={1.8} />
              <span>{label}</span>
            </NavLink>
          ))}
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
          <div className="software-title">
            <strong>PathFISA病理小样本增量自学习智能标注软件</strong>
            <span>PATHOLOGY FEW-SHOT INCREMENTAL SELF-LEARNING ANNOTATION</span>
          </div>
          <div className="topbar-actions">
            <button className="icon-button" aria-label="通知" onClick={() => { setNotificationOpen(true); setAssistantOpen(false); }}>
              <Bell size={19} />
              {unreadCount > 0 && <i />}
            </button>
            <button className="soft-button" onClick={() => { setAssistantOpen(true); setNotificationOpen(false); }}>
              <Sparkles size={17} />
              智能助手
            </button>
          </div>
        </header>
        <Outlet />
      </main>

      {(notificationOpen || assistantOpen) && (
        <div className="app-drawer-backdrop" onClick={() => { setNotificationOpen(false); setAssistantOpen(false); }} />
      )}

      <aside className={`app-drawer notification-drawer ${notificationOpen ? "open" : ""}`}>
        <header>
          <div><Bell size={19} /><span><strong>通知中心</strong><small>{unreadCount} 条未读消息</small></span></div>
          <button onClick={() => setNotificationOpen(false)}><X size={18} /></button>
        </header>
        <div className="drawer-toolbar">
          <span>近期通知</span>
          <button onClick={() => setNotifications((items) => items.map((item) => ({ ...item, unread: false })))}>
            <CheckCheck size={14} />全部已读
          </button>
        </div>
        <div className="notification-list">
          {notifications.map((notification) => (
            <button
              key={notification.id}
              className={notification.unread ? "unread" : ""}
              onClick={() => openNotification(notification)}
            >
              <i className={notification.type}>
                {notification.type === "model" ? <BrainCircuit size={16} /> : notification.type === "task" ? <ClipboardCheck size={16} /> : notification.type === "review" ? <CheckCheck size={16} /> : <Bell size={16} />}
              </i>
              <span>
                <strong>{notification.title}</strong>
                <p>{notification.message}</p>
                <small><Clock3 size={11} />{notification.time}</small>
              </span>
              {notification.unread && <em />}
            </button>
          ))}
        </div>
      </aside>

      <aside className={`app-drawer assistant-drawer ${assistantOpen ? "open" : ""}`}>
        <header>
          <div><Sparkles size={19} /><span><strong>PathFISA 智能助手</strong><small>标注、切片与模型工作流助手</small></span></div>
          <button onClick={() => setAssistantOpen(false)}><X size={18} /></button>
        </header>
        <div className="assistant-context">
          <MessageCircle size={15} />
          当前页面：{window.location.pathname}
        </div>
        <div className="assistant-messages">
          {messages.map((message) => (
            <div className={`assistant-message ${message.role}`} key={message.id}>
              {message.role === "assistant" && <i><Sparkles size={14} /></i>}
              <p>{message.content}</p>
            </div>
          ))}
          {assistantLoading && <div className="assistant-message assistant loading"><i><Sparkles size={14} /></i><p><span /><span /><span /></p></div>}
        </div>
        <div className="assistant-suggestions">
          {["如何区分人工与 AI 标注？", "当前有哪些真实切片？", "如何创建标注任务？"].map((item) => (
            <button key={item} onClick={() => sendAssistant(item)}>{item}</button>
          ))}
        </div>
        <div className="assistant-input">
          <textarea
            rows={2}
            value={assistantInput}
            onChange={(event) => setAssistantInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void sendAssistant();
              }
            }}
            placeholder="输入问题，Enter 发送..."
          />
          <button onClick={() => sendAssistant()} disabled={!assistantInput.trim() || assistantLoading}><Send size={17} /></button>
        </div>
      </aside>
    </div>
  );
}
