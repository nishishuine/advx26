# 项目长期记忆 — AI 阅读伴侣（advx26项目）

## 项目概况
AI 阅读伴侣：读长篇小说时替用户记住"谁是谁"的工具。MVP 为网页版阅读器，解析预处理好的 `.bookpack` 包。

## 数据规范
- `.bookpack` = zip，内含：manifest.json / book.json / chapters/chNN.json（已内联标注 `[[c:cID]]名字[[/]]`）/ characters.json / graph.json / alias_mapping.json / theme.json / portraits/*.svg / cover.svg
- 防剧透靠数据分层：identity（安全）/ full_description（剧透）/ key_events（带 chapter）/ relations.based_on_chapters
- 保真校验：剥标记后须 == 清洗版原文

## 技术栈
- 前端：vanilla HTML/CSS/JS + JSZip（解包）+ vis-network（关系图）+ Web Speech API（TTS）
- 无后端，全部前端运行，离线可用
- 本地服务：`python3 -m http.server 8765` in `reader/`

## 关键文件
- PRD：`PRD-AI阅读伴侣-产品概念设计.md`
- 预处理规范：`阅读伴侣-预处理包规范.md`
- 预处理产物：`百年孤独.bookpack` / `百年孤独.bookpack_build/`
- 清洗版原文：`百年孤独cleaned/`
- 阅读器前端：`reader/`（index.html / styles.css / app.js / vendor/）

## 当前状态（2026-07-23）
- 网页版阅读器已完成，包含 PRD 中 P0+P1+P2 全部功能
- AI 追问为本地规则引擎（可接 LLM API 升级）
