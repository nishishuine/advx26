/* ═══════════════════════════════════════════
   AI 阅读伴侣 · 后端入口
   账号 / 云书库 / 书城 / Injective 上链存证
   ═══════════════════════════════════════════ */
import "dotenv/config";
import express from "express";
import cors from "cors";
import { migrate } from "./db.js";
import { authRouter } from "./auth.js";
import { booksRouter, storeRouter } from "./books.js";
import { chainEnabled } from "./chain.js";
import { aiRouter, aiEnabled } from "./ai.js";

const app = express();
app.disable("x-powered-by");

/* CORS：CORS_ORIGIN=* 全放行，否则按逗号分隔白名单 */
const origins = (process.env.CORS_ORIGIN || "*").split(",").map((s) => s.trim());
app.use(cors({
  origin: origins.includes("*") ? true : origins,
  credentials: false,
}));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true, chain: chainEnabled, ai: aiEnabled, time: Date.now() }));
app.use("/api/auth", authRouter);
app.use("/api/books", booksRouter);
app.use("/api/store", storeRouter);
app.use("/api/ai", aiRouter);

/* multer 超限等错误的兜底 */
app.use((err, _req, res, _next) => {
  if (err && err.code === "LIMIT_FILE_SIZE") return res.status(413).json({ error: "文件超过 60MB 限制" });
  console.error(err);
  res.status(500).json({ error: "服务器内部错误" });
});

const PORT = process.env.PORT || 8787;
migrate()
  .then(() => app.listen(PORT, () => console.log(`[server] 阅读伴侣后端已启动 http://localhost:${PORT}`)))
  .catch((e) => { console.error("[server] 数据库初始化失败:", e); process.exit(1); });
