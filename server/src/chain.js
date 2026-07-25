/* ═══════════════════════════════════════════
   Injective EVM 上链存证服务
   - 把书包 SHA-256 指纹 + 元信息写入 BookRegistry 合约
   - 未配置 CHAIN_PRIVATE_KEY / BOOK_REGISTRY_ADDRESS 时自动禁用，
     其余功能不受影响
   ═══════════════════════════════════════════ */
import { ethers } from "ethers";
import { db } from "./db.js";

const RPC_URL = process.env.INJ_RPC_URL || "https://k8s.testnet.json-rpc.injective.network/";
const PRIVATE_KEY = process.env.CHAIN_PRIVATE_KEY || "";
export const REGISTRY_ADDR = process.env.BOOK_REGISTRY_ADDRESS || "";
export const EXPLORER = (process.env.CHAIN_EXPLORER || "https://testnet.blockscout.injective.network").replace(/\/$/, "");

export const chainEnabled = !!(PRIVATE_KEY && REGISTRY_ADDR);

const ABI = [
  "function register(bytes32 hash, string title, string author, string uploader) returns (uint256)",
  "function getByHash(bytes32 hash) view returns (tuple(bytes32 hash, string title, string author, string uploader, uint256 timestamp))",
  "function isRegistered(bytes32 hash) view returns (bool)",
  "function count() view returns (uint256)",
];

let contract = null;
let signerAddr = "";
if (chainEnabled) {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  signerAddr = wallet.address;
  contract = new ethers.Contract(REGISTRY_ADDR, ABI, wallet);
  console.log(`[chain] 上链存证已启用 signer=${signerAddr} registry=${REGISTRY_ADDR}`);
} else {
  console.log("[chain] 未配置 CHAIN_PRIVATE_KEY / BOOK_REGISTRY_ADDRESS，上链存证已禁用");
}

/* 串行队列，避免并发上传时 nonce 冲突 */
let queue = Promise.resolve();

/* 异步上链：不阻塞上传响应，结果回写 books 表 */
export function registerOnChain(bookId, sha256hex, title, author, uploader) {
  if (!chainEnabled) return;
  queue = queue
    .then(() => doRegister(bookId, sha256hex, title, author, uploader))
    .catch((e) => console.error(`[chain] book#${bookId} 上链失败:`, e.message || e));
}

async function doRegister(bookId, sha256hex, title, author, uploader) {
  const hash = "0x" + sha256hex;
  await db("books").where({ id: bookId }).update({ chain_status: "pending" });
  try {
    // 同一指纹已有人存证过：直接标记为 confirmed（复用已有存证）
    if (await contract.isRegistered(hash)) {
      const existed = await db("books").where({ sha256: sha256hex }).whereNotNull("chain_tx").first();
      await db("books").where({ id: bookId }).update({
        chain_status: "confirmed",
        chain_tx: existed ? existed.chain_tx : null,
      });
      console.log(`[chain] book#${bookId} 指纹已在链上，复用存证`);
      return;
    }
    // Injective EVM 用 legacy 交易类型
    const fee = await contract.runner.provider.getFeeData();
    const tx = await contract.register(hash, title.slice(0, 100), (author || "").slice(0, 60), uploader.slice(0, 30), {
      type: 0,
      gasPrice: fee.gasPrice || 160000000n,
      gasLimit: 500000n,
    });
    console.log(`[chain] book#${bookId} 已提交 tx=${tx.hash}`);
    await db("books").where({ id: bookId }).update({ chain_tx: tx.hash });
    // 负载均衡 RPC 查回执可能滞后，tx.wait 会长时间挂起——改用回执 + isRegistered 双通道轮询
    const ok = await waitForConfirm(tx.hash, hash);
    await db("books").where({ id: bookId }).update({
      chain_status: ok ? "confirmed" : "failed",
      chain_error: ok ? null : "交易确认超时或执行失败",
    });
    console.log(`[chain] book#${bookId} ${ok ? "已确认" : "确认失败"}`);
  } catch (e) {
    await db("books").where({ id: bookId }).update({
      chain_status: "failed",
      chain_error: String(e.message || e).slice(0, 250),
    });
    throw e;
  }
}

/* 轮询确认：回执或链上 isRegistered 任一命中即算确认 */
async function waitForConfirm(txHash, hash, timeoutMs = 90000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const receipt = await contract.runner.provider.getTransactionReceipt(txHash);
      if (receipt) return receipt.status === 1;
      if (await contract.isRegistered(hash)) return true;
    } catch { /* 单次查询失败继续重试 */ }
    await new Promise((r) => setTimeout(r, 3000));
  }
  return false;
}

/* 启动对账：修复历史遗留的 pending 记录（如进程重启导致确认中断） */
async function reconcilePending() {
  try {
    const rows = await db("books").where({ chain_status: "pending" }).whereNotNull("chain_tx");
    for (const b of rows) {
      if (await contract.isRegistered("0x" + b.sha256)) {
        await db("books").where({ id: b.id }).update({ chain_status: "confirmed", chain_error: null });
        console.log(`[chain] 对账修复 book#${b.id} → confirmed`);
      }
    }
  } catch (e) {
    console.error("[chain] 启动对账失败:", e.message || e);
  }
}
if (chainEnabled) setTimeout(reconcilePending, 5000);

/* 查询链上存证详情（给前端展示证书） */
export async function queryProof(sha256hex) {
  if (!chainEnabled) return null;
  const hash = "0x" + sha256hex;
  if (!(await contract.isRegistered(hash))) return null;
  const r = await contract.getByHash(hash);
  return {
    hash,
    title: r.title,
    author: r.author,
    uploader: r.uploader,
    timestamp: Number(r.timestamp),
    registry: REGISTRY_ADDR,
    network: "Injective EVM Testnet (1439)",
    explorer: `${EXPLORER}/address/${REGISTRY_ADDR}`,
  };
}
