/* 封面替换后同步云端：原位更新 books 表的 data/size/sha256/cover，并用新指纹重新上链 */
import "dotenv/config";
import fs from "node:fs";
import crypto from "node:crypto";
import JSZip from "jszip";
import { db } from "../src/db.js";
import { registerOnChain } from "../src/chain.js";

const ROOT = "/Users/larkinli/Downloads/advx26项目";
const PACKS = {
  "茶花女": `${ROOT}/茶花女_work/output/茶花女.bookpack`,
  "红楼梦": `${ROOT}/红楼梦.bookpack`,
  "霍乱时期的爱情": `${ROOT}/霍乱时期的爱情.bookpack`,
  "了不起的盖茨比": `${ROOT}/reader/了不起的盖茨比.bookpack`,
  "水浒传": `${ROOT}/水浒传.bookpack`,
  "月亮和六便士": `${ROOT}/月亮和六便士_work/output/月亮和六便士.bookpack`,
  "长日将尽": `${ROOT}/长日将尽.bookpack`,
  "生命中不能承受之轻": `${ROOT}/reader/生命中不能承受之轻.bookpack`,
};
const MIME = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", svg: "image/svg+xml" };

const ids = [];
for (const [title, path] of Object.entries(PACKS)) {
  const b = await db("books").where({ title }).first();
  if (!b) { console.log(`✗ 云端无记录: ${title}`); continue; }
  const buf = fs.readFileSync(path);
  const sha256 = crypto.createHash("sha256").update(buf).digest("hex");
  const zip = await JSZip.loadAsync(buf);
  const bj = JSON.parse(await zip.file("book.json").async("string"));
  const cf = zip.file(bj.cover);
  const cover = Buffer.from(await cf.async("nodebuffer"));
  const cover_mime = MIME[bj.cover.split(".").pop().toLowerCase()];
  const owner = await db("users").where({ id: b.owner_id }).first();
  await db("books").where({ id: b.id }).update({
    data: buf, size: buf.length, sha256, cover, cover_mime,
    chain_status: "pending", chain_tx: null, chain_error: null,
  });
  registerOnChain(b.id, sha256, b.title, b.author, owner.username);
  ids.push(b.id);
  console.log(`✓ book#${b.id} ${title} 封面=${bj.cover} 新指纹=${sha256.slice(0, 12)}… 重新上链中`);
}

/* 等待全部确认 */
for (let i = 0; i < 80; i++) {
  await new Promise((r) => setTimeout(r, 5000));
  const rows = await db("books").whereIn("id", ids).select("id", "title", "chain_status");
  const left = rows.filter((r) => r.chain_status === "pending");
  if (!left.length) {
    rows.forEach((r) => console.log(` #${r.id} ${r.title}: ${r.chain_status}`));
    process.exit(rows.every((r) => r.chain_status === "confirmed") ? 0 : 1);
  }
}
console.log("等待超时");
process.exit(1);
