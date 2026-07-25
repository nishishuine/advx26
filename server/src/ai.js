/* ═══════════════════════════════════════════
   AI 问书：代理阶跃星辰 Step 3.7 Flash
   前端不持有 API Key，统一走本路由（SSE 流式透传）
   ═══════════════════════════════════════════ */
import { Router } from "express";

const STEP_API_KEY = process.env.STEP_API_KEY || "";
const STEP_API_URL = process.env.STEP_API_URL || "https://api.stepfun.com/v1/chat/completions";
const STEP_MODEL = process.env.STEP_MODEL || "step-3.7-flash";

export const aiEnabled = !!STEP_API_KEY;
export const aiRouter = Router();

aiRouter.post("/ask", async (req, res) => {
  if (!aiEnabled) return res.status(503).json({ error: "AI 服务未配置（缺少 STEP_API_KEY）" });
  const { messages } = req.body || {};
  if (!Array.isArray(messages) || !messages.length) return res.status(400).json({ error: "messages 不能为空" });
  // 只接受 role/content 纯文本消息，并限制总长，防滥用
  const clean = messages
    .filter((m) => m && ["system", "user", "assistant"].includes(m.role) && typeof m.content === "string")
    .map((m) => ({ role: m.role, content: m.content }));
  const totalLen = clean.reduce((n, m) => n + m.content.length, 0);
  if (!clean.length || totalLen > 200_000) return res.status(400).json({ error: "消息格式不正确或内容过长" });

  try {
    const upstream = await fetch(STEP_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${STEP_API_KEY}`,
      },
      body: JSON.stringify({
        model: STEP_MODEL,
        messages: clean,
        stream: true,
        temperature: 0.6,
        max_tokens: 4096,
        reasoning_effort: process.env.STEP_REASONING || "low", // 问答场景优先响应速度
      }),
    });
    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => "");
      console.error("[ai] 上游错误", upstream.status, detail.slice(0, 500));
      return res.status(502).json({ error: `AI 上游返回 ${upstream.status}` });
    }
    // SSE 透传
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();
    const abort = () => upstream.body?.cancel?.().catch(() => {});
    req.on("close", abort);
    for await (const chunk of upstream.body) res.write(chunk);
    res.end();
  } catch (e) {
    console.error("[ai] 请求失败:", e);
    if (!res.headersSent) res.status(502).json({ error: "AI 服务请求失败" });
    else res.end();
  }
});
