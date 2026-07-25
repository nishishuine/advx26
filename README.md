# manifold — 拆开世界，再重建

AdventureX 2026 的静态交互 MVP。它按照理解目标把现实对象拆成所需的有意义单元，不设固定数量上限，并用关系图展示结构、信号、能量或物质如何流动。当前版本完全由本地 JSON 驱动，不接入 AI、后端和数据库。

## 本地运行

需要 Node.js 20 或更高版本。

```powershell
npm install
npm run dev
```

默认地址为 `http://127.0.0.1:4173`。

```powershell
npm run test
npm run build
```

## MVP 路由

- `/`：极简对话入口，支持文字、图片点击/拖放/粘贴和浏览器语音转文字。
- `/explore/:caseId/:nodeId?view=structure`：星图式分层关系网、视图切换、面包屑与节点详情。
- `/rebuild/:caseId`：经过人工整理的低压安全重建指南。

案例、当前层和关系视图都写入 URL，刷新后可以恢复。

当前仍是静态 MVP：所有输入都会进入 Orange Pi 3B 案例；图片只在浏览器本地预览，不执行真实识图。

## 项目结构

```text
src/
├─ components/           通用 UI、关系图节点和详情栏
├─ data/
│  ├─ cases/             Orange Pi 3B 静态案例
│  └─ build-guides/      Orange Pi 3B 首次启动指南
├─ domain/
│  ├─ types.ts           数据类型
│  ├─ relations.ts       物体/生命关系白名单和视图
│  ├─ graph.ts           层级、关系与数据校验
│  └─ repository.ts      可替换的静态仓库实现
├─ pages/                首页、探索页、重建页
└─ store/                临时界面状态
```

页面组件不包含案例节点和关系；它们只从 `GraphRepository` 读取数据。

## 核心数据格式

案例使用 `WorldCase`：

```ts
type WorldCase = {
  id: string;
  domain: "object" | "life";
  rootNodeId: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
};
```

每个节点必须记录父级、层级、功能、资料状态和来源。每条边必须具有合法 `relation`、非空 `explanation` 以及所属 `views`。领域层会在以下情况立即报错：

- 节点父级、层级或可展开状态与实际结构不一致；
- 案例使用了关系白名单之外的类型；
- 边引用不存在的节点或缺少解释；
- 重建步骤缺少前置条件、验收标准或排错路径。

## 新增案例

1. 在 `src/data/cases/` 新建符合 `WorldCase` 的 JSON。
2. 按当前理解目标组织直接子节点，不设固定数量上限。
3. 在 `src/domain/repository.ts` 导入 JSON 并加入 `worldCases`。
4. 如为安全、人工整理的物体案例，可在 `src/data/build-guides/` 增加 `BuildGuide` 并加入 `guides`。
5. 运行 `npm run test && npm run build`。

未来接入 API 时，可新增 `GraphRepository` 实现；页面和领域规则无需改写。
