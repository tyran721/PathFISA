# PathFISA

PathFISA（Pathology Few-shot Incremental Self-learning Annotation）是一个面向病理小样本场景的 Web 端智能标注与受控增量学习平台。

项目已经包含可运行的第一版 Web 应用：

- [需求分析](docs/requirements-analysis.md)
- [系统设计](docs/system-design.md)

## 已实现

- 医疗科研风格的总览、切片库、任务看板和模型中心。
- 基于 OpenSeadragon 的高分辨率金字塔切片浏览。
- 缩放、平移、导航缩略图、倍率和比例尺。
- 点、矩形和多边形标注。
- 标注对象列表、标签切换、图层显隐、删除、撤销和重做。
- AI 预标注演示与人工标注来源区分。
- 标注 JSON 持久化和重新加载。
- DZI 瓦片接口，以及 JPEG、PNG、TIFF、SVS、NDPI 等图像读取能力。
- 三张 8192×5632 的内置病理演示切片。

## 快速运行

Windows PowerShell：

```powershell
.\scripts\setup.ps1
npm run dev
```

然后访问：

- Web：http://127.0.0.1:5173
- API 文档：http://127.0.0.1:8000/docs

如果依赖已安装，可直接运行 `npm run dev`。生产前端构建：

```powershell
npm run build
```

## 工程结构

```text
apps/web       React + TypeScript 前端
apps/api       FastAPI、WSI 瓦片与标注接口
scripts        环境初始化与演示切片生成
data           本地切片和标注数据（不提交到 Git）
docs           需求与系统设计
```

## 产品定位

系统服务于病理医生、标注员和算法工程师，支持全切片图像（WSI）浏览、人工标注、AI 辅助标注、复核质控、主动学习选样、增量训练、模型评估、发布与回滚。

本系统首版定位为科研与辅助标注工具，不直接输出临床诊断结论。所谓“自学习”均指在人工复核、数据版本化、离线评估和人工发布控制下进行的增量学习，不允许生产模型静默自动更新。
