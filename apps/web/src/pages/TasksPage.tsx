import {
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Edit3,
  Eye,
  Filter,
  ListFilter,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
  UserRound
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { createTask, deleteTask, getTasks, updateTask } from "../api";
import { Modal } from "../components/Modal";
import { PageHeader } from "../components/PageHeader";
import { StatusPill } from "../components/StatusPill";
import type {
  AnnotationTask,
  AnnotationTaskInput,
  TaskPriority,
  TaskStatus
} from "../types";

const STATUS_META: Record<
  TaskStatus,
  { title: string; tone: "gray" | "blue" | "amber" | "green" }
> = {
  pending: { title: "待开始", tone: "gray" },
  in_progress: { title: "标注中", tone: "blue" },
  review: { title: "待复核", tone: "amber" },
  completed: { title: "已完成", tone: "green" }
};

const EMPTY_TASK: AnnotationTaskInput = {
  caseId: "",
  slideId: "kidney-23766he",
  slideName: "23766he.svs",
  title: "",
  taskType: "区域分割",
  stain: "H&E",
  assignee: "张敏",
  reviewer: "林医生",
  priority: "medium",
  status: "pending",
  dueDate: new Date().toISOString().slice(0, 10),
  progress: 0,
  description: ""
};

function TaskForm({
  value,
  onChange
}: {
  value: AnnotationTaskInput;
  onChange: (value: AnnotationTaskInput) => void;
}) {
  const field = <K extends keyof AnnotationTaskInput>(
    key: K,
    next: AnnotationTaskInput[K]
  ) => onChange({ ...value, [key]: next });
  return (
    <div className="form-grid task-form">
      <label className="span-2">
        <span>任务名称</span>
        <input
          value={value.title}
          onChange={(event) => field("title", event.target.value)}
          placeholder="例如：肿瘤区域精细分割"
        />
      </label>
      <label>
        <span>病例编号</span>
        <input
          value={value.caseId}
          onChange={(event) => field("caseId", event.target.value)}
          placeholder="例如：23766HE"
        />
      </label>
      <label>
        <span>切片名称</span>
        <input
          value={value.slideName}
          onChange={(event) => field("slideName", event.target.value)}
        />
      </label>
      <label>
        <span>关联切片</span>
        <select
          value={value.slideId}
          onChange={(event) => field("slideId", event.target.value)}
        >
          <option value="kidney-23766he">23766he.svs · 肾脏 HE</option>
          <option value="kidney-23871he">23871he.svs · 肾脏 HE</option>
          <option value="wsi-b20028048-1">B20028048-1.svs</option>
          <option value="wsi-cmu-1-jp2k-33005">CMU-1-JP2K-33005.svs</option>
        </select>
      </label>
      <label>
        <span>任务类型</span>
        <select
          value={value.taskType}
          onChange={(event) => field("taskType", event.target.value)}
        >
          <option>区域分割</option>
          <option>图像分类</option>
          <option>细胞计数</option>
          <option>专家复核</option>
          <option>主动学习候选</option>
        </select>
      </label>
      <label>
        <span>负责人</span>
        <select
          value={value.assignee}
          onChange={(event) => field("assignee", event.target.value)}
        >
          <option>张敏</option><option>王冉</option><option>李夏</option><option>林医生</option>
        </select>
      </label>
      <label>
        <span>复核人</span>
        <select
          value={value.reviewer}
          onChange={(event) => field("reviewer", event.target.value)}
        >
          <option>林医生</option><option>王主任</option><option>赵教授</option>
        </select>
      </label>
      <label>
        <span>优先级</span>
        <select
          value={value.priority}
          onChange={(event) => field("priority", event.target.value as TaskPriority)}
        >
          <option value="low">低</option>
          <option value="medium">中</option>
          <option value="high">高</option>
        </select>
      </label>
      <label>
        <span>任务状态</span>
        <select
          value={value.status}
          onChange={(event) => field("status", event.target.value as TaskStatus)}
        >
          {Object.entries(STATUS_META).map(([key, item]) => (
            <option key={key} value={key}>{item.title}</option>
          ))}
        </select>
      </label>
      <label>
        <span>截止日期</span>
        <input
          type="date"
          value={value.dueDate}
          onChange={(event) => field("dueDate", event.target.value)}
        />
      </label>
      <label>
        <span>当前进度</span>
        <div className="range-field">
          <input
            type="range"
            min="0"
            max="100"
            value={value.progress}
            onChange={(event) => field("progress", Number(event.target.value))}
          />
          <b>{value.progress}%</b>
        </div>
      </label>
      <label className="span-2">
        <span>任务说明</span>
        <textarea
          value={value.description}
          onChange={(event) => field("description", event.target.value)}
          placeholder="填写标注范围、排除条件和复核注意事项"
          rows={3}
        />
      </label>
    </div>
  );
}

export function TasksPage() {
  const [tasks, setTasks] = useState<AnnotationTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AnnotationTask | null>(null);
  const [form, setForm] = useState<AnnotationTaskInput>(EMPTY_TASK);
  const [detail, setDetail] = useState<AnnotationTask | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const refresh = () => {
    setLoading(true);
    getTasks()
      .then(setTasks)
      .finally(() => setLoading(false));
  };

  useEffect(refresh, []);

  const filtered = useMemo(
    () =>
      tasks.filter((task) => {
        const matchesStatus = statusFilter === "all" || task.status === statusFilter;
        const text = `${task.caseId} ${task.slideName} ${task.title} ${task.assignee}`.toLowerCase();
        return matchesStatus && text.includes(query.toLowerCase());
      }),
    [query, statusFilter, tasks]
  );

  const openCreate = (status: TaskStatus = "pending") => {
    setEditing(null);
    setForm({ ...EMPTY_TASK, status, progress: status === "completed" ? 100 : 0 });
    setFormOpen(true);
  };

  const openEdit = (task: AnnotationTask) => {
    setEditing(task);
    const { id: _id, createdAt: _created, updatedAt: _updated, ...input } = task;
    setForm(input);
    setFormOpen(true);
    setMenuId(null);
  };

  const submit = async () => {
    if (!form.title.trim() || !form.caseId.trim()) {
      setMessage("请填写任务名称和病例编号");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const updated = await updateTask(editing.id, form);
        setTasks((items) => items.map((item) => item.id === updated.id ? updated : item));
        setMessage("任务已更新");
      } else {
        const created = await createTask(form);
        setTasks((items) => [...items, created]);
        setMessage("任务已创建");
      }
      setFormOpen(false);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (task: AnnotationTask) => {
    if (!window.confirm(`确定删除“${task.title}”吗？此操作不可撤销。`)) return;
    await deleteTask(task.id);
    setTasks((items) => items.filter((item) => item.id !== task.id));
    setMenuId(null);
    setDetail(null);
    setMessage("任务已删除");
  };

  const advance = async (task: AnnotationTask) => {
    const next: Record<TaskStatus, TaskStatus> = {
      pending: "in_progress",
      in_progress: "review",
      review: "completed",
      completed: "completed"
    };
    const status = next[task.status];
    const updated = await updateTask(task.id, {
      status,
      progress: status === "completed" ? 100 : task.progress
    });
    setTasks((items) => items.map((item) => item.id === task.id ? updated : item));
  };

  return (
    <div className="page tasks-page">
      <PageHeader
        eyebrow="ANNOTATION WORKFLOW"
        title="标注任务"
        description="创建、分派、跟踪和复核所有标注工作，任务数据会实时持久化。"
        actions={
          <button className="primary-button" onClick={() => openCreate()}>
            <Plus size={17} />创建任务
          </button>
        }
      />

      <div className="task-toolbar panel">
        <div className="library-search">
          <Search size={17} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索病例、任务或负责人"
          />
        </div>
        <div className="task-filter-tabs">
          <button className={statusFilter === "all" ? "active" : ""} onClick={() => setStatusFilter("all")}>
            <ListFilter size={15} />全部 <b>{tasks.length}</b>
          </button>
          {(Object.keys(STATUS_META) as TaskStatus[]).map((status) => (
            <button
              key={status}
              className={statusFilter === status ? "active" : ""}
              onClick={() => setStatusFilter(status)}
            >
              {STATUS_META[status].title}
              <b>{tasks.filter((task) => task.status === status).length}</b>
            </button>
          ))}
        </div>
        <button className="filter-button"><Filter size={16} />高级筛选</button>
      </div>

      {message && <div className="inline-message" onClick={() => setMessage("")}>{message}</div>}

      <div className="kanban">
        {(Object.keys(STATUS_META) as TaskStatus[]).map((status) => {
          const columnTasks = filtered.filter((task) => task.status === status);
          const meta = STATUS_META[status];
          return (
            <section className="kanban-column" key={status}>
              <header>
                <span><i className={meta.tone} />{meta.title}</span>
                <b>{columnTasks.length}</b>
                <button onClick={() => openCreate(status)}><Plus size={16} /></button>
              </header>
              <div className="kanban-stack">
                {columnTasks.map((task) => (
                  <article className="task-card" key={task.id}>
                    <div className="task-card-top">
                      <span>{task.caseId} · {task.slideName}</span>
                      <div className="task-menu-wrap">
                        <button onClick={() => setMenuId(menuId === task.id ? null : task.id)}>
                          <MoreHorizontal size={17} />
                        </button>
                        {menuId === task.id && (
                          <div className="task-context-menu">
                            <button onClick={() => setDetail(task)}><Eye size={14} />查看详情</button>
                            <button onClick={() => openEdit(task)}><Edit3 size={14} />编辑任务</button>
                            <button className="danger" onClick={() => remove(task)}><Trash2 size={14} />删除任务</button>
                          </div>
                        )}
                      </div>
                    </div>
                    <h3>{task.title}</h3>
                    <p>{task.description || "暂无任务说明"}</p>
                    <div className="task-tags">
                      <StatusPill tone={task.priority === "high" ? "amber" : task.priority === "low" ? "gray" : "blue"}>
                        {task.priority === "high" ? "高" : task.priority === "medium" ? "中" : "低"}优先级
                      </StatusPill>
                      <span>{task.taskType}</span><span>{task.stain}</span>
                    </div>
                    <div className="task-progress-line">
                      <i><b style={{ width: `${task.progress}%` }} /></i><span>{task.progress}%</span>
                    </div>
                    <div className="task-card-footer">
                      <span><CalendarDays size={14} />{task.dueDate}</span>
                      <span className="assignee-name"><i>{task.assignee.slice(0, 1)}</i>{task.assignee}</span>
                    </div>
                    <div className="task-card-actions">
                      <button onClick={() => setDetail(task)}>详情</button>
                      {task.status !== "completed" && (
                        <button className="primary" onClick={() => advance(task)}>
                          {task.status === "pending" ? "开始标注" : task.status === "in_progress" ? "提交复核" : "完成任务"}
                          <ChevronRight size={14} />
                        </button>
                      )}
                      {task.status === "completed" && <Link to={`/annotate/${task.slideId}`}>查看标注</Link>}
                    </div>
                  </article>
                ))}
                {!loading && !columnTasks.length && <div className="kanban-empty">暂无任务</div>}
                <button className="add-task" onClick={() => openCreate(status)}><Plus size={16} />添加任务</button>
              </div>
            </section>
          );
        })}
      </div>

      <div className="workload-strip">
        <UserRound size={19} />
        <span>当前共 <strong>{tasks.length}</strong> 个任务，已完成 <strong>{tasks.filter((item) => item.status === "completed").length}</strong> 个。</span>
      </div>

      <Modal
        open={formOpen}
        title={editing ? "编辑标注任务" : "创建标注任务"}
        description="配置任务对象、人员、流程状态和截止时间。"
        onClose={() => setFormOpen(false)}
        footer={
          <>
            <button className="soft-button" onClick={() => setFormOpen(false)}>取消</button>
            <button className="primary-button" onClick={submit} disabled={saving}>
              {saving ? "保存中..." : editing ? "保存修改" : "创建任务"}
            </button>
          </>
        }
      >
        <TaskForm value={form} onChange={setForm} />
      </Modal>

      <Modal
        open={Boolean(detail)}
        title={detail?.title ?? "任务详情"}
        description={`${detail?.caseId ?? ""} · ${detail?.slideName ?? ""}`}
        onClose={() => setDetail(null)}
        footer={detail && (
          <>
            <button className="soft-button danger-text" onClick={() => remove(detail)}><Trash2 size={15} />删除</button>
            <button className="soft-button" onClick={() => openEdit(detail)}><Edit3 size={15} />编辑</button>
            <Link className="primary-button" to={`/annotate/${detail.slideId}`}>打开标注平台</Link>
          </>
        )}
      >
        {detail && (
          <div className="task-detail-grid">
            <div><span>状态</span><StatusPill tone={STATUS_META[detail.status].tone}>{STATUS_META[detail.status].title}</StatusPill></div>
            <div><span>优先级</span><strong>{detail.priority === "high" ? "高" : detail.priority === "medium" ? "中" : "低"}</strong></div>
            <div><span>负责人</span><strong>{detail.assignee}</strong></div>
            <div><span>复核人</span><strong>{detail.reviewer}</strong></div>
            <div><span>任务类型</span><strong>{detail.taskType}</strong></div>
            <div><span>截止日期</span><strong>{detail.dueDate}</strong></div>
            <div className="span-2"><span>任务说明</span><p>{detail.description || "暂无说明"}</p></div>
            <div className="span-2">
              <span>完成进度</span>
              <div className="detail-progress"><i><b style={{ width: `${detail.progress}%` }} /></i><strong>{detail.progress}%</strong></div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
