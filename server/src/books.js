/* ═══════════════════════════════════════════
   书库 API
   /api/books        我的书库（上传/列表/共享开关/删除/下载）
   /api/store        书城（搜索共享书）
   ═══════════════════════════════════════════ */
import { Router } from "express";
import multer from "multer";
import crypto from "node:crypto";
import JSZip from "jszip";
import { db, toBuffer } from "./db.js";
import { requireAuth, optionalAuth } from "./auth.js";
import { registerOnChain, queryProof, chainEnabled, EXPLORER, REGISTRY_ADDR } from "./chain.js";

const MAX_SIZE = 60 * 1024 * 1024; // 60MB
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_SIZE } });

export const booksRouter = Router();
export const storeRouter = Router();

/* ── 元信息序列化（不带 blob） ── */
function bookMeta(b, viewer) {
  return {
    id: b.id,
    title: b.title,
    author: b.author,
    total_chapters: b.total_chapters,
    filename: b.filename,
    size: b.size,
    sha256: b.sha256,
    is_public: !!b.is_public,
    downloads: b.downloads,
    owner: b.owner_name || undefined,
    mine: viewer ? b.owner_id === viewer.id : false,
    created_at: b.created_at,
    chain: {
      enabled: chainEnabled,
      status: b.chain_status,
      tx: b.chain_tx || null,
      tx_url: b.chain_tx ? `${EXPLORER}/tx/${b.chain_tx}` : null,
    },
  };
}

/* ── 解析 .bookpack：抽 book.json 元数据 + 封面 ── */
async function parsePack(buf) {
  const zip = await JSZip.loadAsync(buf);
  const bf = zip.file("book.json");
  if (!bf) throw new Error("不是有效的 .bookpack：缺少 book.json");
  const bj = JSON.parse(await bf.async("string"));
  const meta = {
    title: String(bj.title || "").slice(0, 250) || "未命名",
    author: String(bj.author || "").slice(0, 120),
    total_chapters: bj.total_chapters || (Array.isArray(bj.chapters) ? bj.chapters.length : 0),
    cover: null,
    cover_mime: null,
  };
  const coverPath = bj.cover || "cover.svg";
  const cf = zip.file(coverPath) || zip.file("cover.jpg") || zip.file("cover.png") || zip.file("cover.svg");
  if (cf) {
    const ext = cf.name.split(".").pop().toLowerCase();
    meta.cover_mime = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", svg: "image/svg+xml", webp: "image/webp" }[ext] || "image/jpeg";
    meta.cover = Buffer.from(await cf.async("nodebuffer"));
  }
  return meta;
}

/* ═══════ 我的书库 ═══════ */

booksRouter.get("/", requireAuth, async (req, res) => {
  const rows = await db("books")
    .where({ owner_id: req.user.id })
    .orderBy("created_at", "desc")
    .select("id", "owner_id", "title", "author", "total_chapters", "filename", "size", "sha256",
            "is_public", "downloads", "chain_status", "chain_tx", "created_at");
  res.json({ books: rows.map((b) => bookMeta(b, req.user)) });
});

booksRouter.post("/", requireAuth, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "请上传 .bookpack 文件" });
    // multer 把文件名按 latin1 解码，中文需转回 utf8
    const filename = Buffer.from(req.file.originalname, "latin1").toString("utf8");
    if (!/\.(bookpack|zip)$/i.test(filename)) return res.status(400).json({ error: "仅支持 .bookpack 文件" });
    const buf = req.file.buffer;
    const sha256 = crypto.createHash("sha256").update(buf).digest("hex");
    const dup = await db("books").where({ owner_id: req.user.id, sha256 }).first();
    if (dup) return res.status(409).json({ error: `书架上已有同一本《${dup.title}》` });

    const meta = await parsePack(buf);
    const isPublic = req.body.is_public === "1" || req.body.is_public === "true";
    const [row] = await db("books").insert({
      owner_id: req.user.id,
      title: meta.title,
      author: meta.author,
      total_chapters: meta.total_chapters,
      filename,
      size: buf.length,
      sha256,
      is_public: isPublic,
      data: buf,
      cover: meta.cover,
      cover_mime: meta.cover_mime,
      chain_status: chainEnabled ? "pending" : "none",
    }).returning("id");
    const id = typeof row === "object" ? row.id : row;

    // 异步上链，不阻塞响应
    registerOnChain(id, sha256, meta.title, meta.author, req.user.username);

    const saved = await db("books").where({ id }).first();
    res.json({ book: bookMeta(saved, req.user) });
  } catch (e) {
    res.status(400).json({ error: String(e.message || e) });
  }
});

/* 共享开关 */
booksRouter.patch("/:id", requireAuth, async (req, res) => {
  const b = await db("books").where({ id: +req.params.id, owner_id: req.user.id }).first();
  if (!b) return res.status(404).json({ error: "书不存在" });
  const is_public = !!req.body.is_public;
  await db("books").where({ id: b.id }).update({ is_public });
  res.json({ ok: true, is_public });
});

booksRouter.delete("/:id", requireAuth, async (req, res) => {
  const n = await db("books").where({ id: +req.params.id, owner_id: req.user.id }).del();
  if (!n) return res.status(404).json({ error: "书不存在" });
  res.json({ ok: true });
});

/* 下载书包：本人 或 共享书 可下载 */
booksRouter.get("/:id/file", optionalAuth, async (req, res) => {
  const b = await db("books").where({ id: +req.params.id }).first();
  if (!b) return res.status(404).json({ error: "书不存在" });
  const mine = req.user && b.owner_id === req.user.id;
  if (!mine && !b.is_public) return res.status(403).json({ error: "这本书未共享" });
  if (!mine) await db("books").where({ id: b.id }).increment("downloads", 1);
  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(b.filename)}`);
  res.setHeader("Cache-Control", "private, max-age=3600");
  res.send(toBuffer(b.data));
});

/* 封面 */
booksRouter.get("/:id/cover", optionalAuth, async (req, res) => {
  const b = await db("books").where({ id: +req.params.id }).select("owner_id", "is_public", "cover", "cover_mime").first();
  if (!b || !b.cover) return res.status(404).end();
  const mine = req.user && b.owner_id === req.user.id;
  if (!mine && !b.is_public) return res.status(403).end();
  res.setHeader("Content-Type", b.cover_mime || "image/jpeg");
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.send(toBuffer(b.cover));
});

/* 链上存证证书 */
booksRouter.get("/:id/chain", optionalAuth, async (req, res) => {
  const b = await db("books").where({ id: +req.params.id }).first();
  if (!b) return res.status(404).json({ error: "书不存在" });
  const mine = req.user && b.owner_id === req.user.id;
  if (!mine && !b.is_public) return res.status(403).json({ error: "这本书未共享" });
  let proof = null;
  try { proof = await queryProof(b.sha256); } catch { /* RPC 抖动时降级为本地记录 */ }
  res.json({
    sha256: b.sha256,
    status: b.chain_status,
    tx: b.chain_tx || null,
    tx_url: b.chain_tx ? `${EXPLORER}/tx/${b.chain_tx}` : null,
    error: b.chain_error || null,
    proof,
  });
});

/* 补链：给上链功能启用前上传的书补存证（仅本人） */
booksRouter.post("/:id/chain", requireAuth, async (req, res) => {
  if (!chainEnabled) return res.status(400).json({ error: "上链存证未启用" });
  const b = await db("books").where({ id: +req.params.id, owner_id: req.user.id }).first();
  if (!b) return res.status(404).json({ error: "书不存在" });
  if (b.chain_status === "confirmed") return res.json({ ok: true, status: "confirmed" });
  if (b.chain_status === "pending") return res.json({ ok: true, status: "pending" });
  await db("books").where({ id: b.id }).update({ chain_status: "pending", chain_error: null });
  registerOnChain(b.id, b.sha256, b.title, b.author, req.user.username);
  res.json({ ok: true, status: "pending" });
});

/* 合约信息：前端“存证合约”直达按钮用 */
booksRouter.get("/chain/info", (_req, res) => {
  res.json({
    enabled: chainEnabled,
    network: "Injective EVM Testnet (1439)",
    registry: REGISTRY_ADDR || null,
    contract_url: REGISTRY_ADDR ? `${EXPLORER}/address/${REGISTRY_ADDR}` : null,
  });
});

/* ═══════ 书城 ═══════ */

storeRouter.get("/", optionalAuth, async (req, res) => {
  const q = String(req.query.q || "").trim().slice(0, 60);
  const sort = req.query.sort === "hot" ? "hot" : "new";
  let query = db("books")
    .join("users", "users.id", "books.owner_id")
    .where("books.is_public", true)
    .select("books.id", "books.owner_id", "books.title", "books.author", "books.total_chapters",
            "books.filename", "books.size", "books.sha256", "books.is_public", "books.downloads",
            "books.chain_status", "books.chain_tx", "books.created_at",
            "users.username as owner_name")
    .limit(100);
  if (q) {
    query = query.andWhere((w) =>
      w.whereILike("books.title", `%${q}%`)
       .orWhereILike("books.author", `%${q}%`)
       .orWhereILike("users.username", `%${q}%`));
  }
  query = sort === "hot"
    ? query.orderBy("books.downloads", "desc")
    : query.orderBy("books.created_at", "desc");
  const rows = await query;
  res.json({ books: rows.map((b) => bookMeta(b, req.user)) });
});
