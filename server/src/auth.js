/* ═══════════════════════════════════════════
   账号：注册 / 登录 / JWT 鉴权中间件
   ═══════════════════════════════════════════ */
import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "./db.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-do-not-use-in-prod";
const TOKEN_TTL = "30d";

export function signToken(user) {
  return jwt.sign({ uid: user.id, username: user.username }, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

/* 必须登录 */
export function requireAuth(req, res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : (req.query.token || "");
  if (!token) return res.status(401).json({ error: "未登录" });
  try {
    const p = jwt.verify(token, JWT_SECRET);
    req.user = { id: p.uid, username: p.username };
    next();
  } catch {
    return res.status(401).json({ error: "登录已过期，请重新登录" });
  }
}

/* 登录可选（书城详情等场景） */
export function optionalAuth(req, _res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : (req.query.token || "");
  if (token) {
    try {
      const p = jwt.verify(token, JWT_SECRET);
      req.user = { id: p.uid, username: p.username };
    } catch { /* 忽略无效 token */ }
  }
  next();
}

export const authRouter = Router();

const USERNAME_RE = /^[\w\u4e00-\u9fa5]{2,20}$/;

authRouter.post("/register", async (req, res) => {
  const { username, password } = req.body || {};
  if (!USERNAME_RE.test(username || "")) return res.status(400).json({ error: "用户名需 2-20 位，仅限中英文、数字、下划线" });
  if (!password || password.length < 6) return res.status(400).json({ error: "密码至少 6 位" });
  const exists = await db("users").where({ username }).first();
  if (exists) return res.status(409).json({ error: "用户名已被占用" });
  const password_hash = await bcrypt.hash(password, 10);
  const [row] = await db("users").insert({ username, password_hash }).returning(["id", "username"]);
  const user = typeof row === "object" ? row : { id: row, username };
  res.json({ token: signToken(user), user: { id: user.id, username: user.username } });
});

authRouter.post("/login", async (req, res) => {
  const { username, password } = req.body || {};
  const user = await db("users").where({ username: username || "" }).first();
  if (!user || !(await bcrypt.compare(password || "", user.password_hash))) {
    return res.status(401).json({ error: "用户名或密码错误" });
  }
  res.json({ token: signToken(user), user: { id: user.id, username: user.username } });
});

authRouter.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});
