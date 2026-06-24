import { CheckCircle2, Clock3, Filter, MoreHorizontal, Plus, UserRound } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { StatusPill } from "../components/StatusPill";

const columns = [
  {
    title: "待开始",
    count: 4,
    tone: "gray",
    tasks: [
      ["LUAD-0192 · A-02", "肿瘤区域精细分割", "高", "今天"],
      ["LUAD-0191 · C-01", "坏死区域标注", "中", "明天"]
    ]
  },
  {
    title: "标注中",
    count: 5,
    tone: "blue",
    tasks: [
      ["LUAD-0184 · A-03", "多组织区域分割", "高", "2 小时"],
      ["LUAD-0182 · B-04", "炎症细胞热点标记", "中", "今天"],
      ["LUAD-0176 · A-01", "组织区域分割", "低", "周四"]
    ]
  },
  {
    title: "待复核",
    count: 3,
    tone: "amber",
    tasks: [
      ["LUAD-0181 · B-01", "多区域复核", "高", "1 小时"],
      ["LUAD-0178 · A-06", "肿瘤边界复核", "中", "今天"]
    ]
  },
  {
    title: "已完成",
    count: 18,
    tone: "green",
    tasks: [
      ["LUAD-0179 · PD-L1", "阳性细胞计数", "完成", "昨天"],
      ["LUAD-0174 · A-02", "肿瘤区域分割", "完成", "昨天"]
    ]
  }
];

export function TasksPage() {
  return (
    <div className="page tasks-page">
      <PageHeader
        eyebrow="ANNOTATION WORKFLOW"
        title="标注任务"
        description="分派、跟踪和复核所有标注工作，确保每一份金标准都有迹可循。"
        actions={
          <>
            <button className="soft-button"><Filter size={17} />筛选</button>
            <button className="primary-button"><Plus size={17} />创建任务</button>
          </>
        }
      />
      <div className="kanban">
        {columns.map((column) => (
          <section className="kanban-column" key={column.title}>
            <header>
              <span><i className={column.tone} />{column.title}</span>
              <b>{column.count}</b>
              <button><Plus size={16} /></button>
            </header>
            <div className="kanban-stack">
              {column.tasks.map(([id, title, priority, due], index) => (
                <article className="task-card" key={id}>
                  <div className="task-card-top">
                    <span>{id}</span>
                    <button><MoreHorizontal size={17} /></button>
                  </div>
                  <h3>{title}</h3>
                  <div className="task-tags">
                    <StatusPill tone={priority === "高" ? "amber" : priority === "完成" ? "green" : "gray"}>
                      {priority === "完成" ? <><CheckCircle2 size={12} /> 已完成</> : `${priority}优先级`}
                    </StatusPill>
                    <span>HE</span>
                  </div>
                  <div className="task-card-footer">
                    <span><Clock3 size={14} />{due}</span>
                    <div className="task-avatar">{index % 2 ? "王" : "林"}</div>
                  </div>
                </article>
              ))}
              <button className="add-task"><Plus size={16} />添加任务</button>
            </div>
          </section>
        ))}
      </div>
      <div className="workload-strip">
        <UserRound size={19} />
        <span>团队本周已完成 <strong>46</strong> 个任务，平均首次复核通过率 <strong>91.8%</strong></span>
      </div>
    </div>
  );
}

