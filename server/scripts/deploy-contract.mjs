/* ═══════════════════════════════════════════
   BookRegistry 合约部署脚本（Injective EVM Testnet）
   用法：
     1. .env 里配置 CHAIN_PRIVATE_KEY（水龙头领测试币：
        https://testnet.faucet.injective.network/）
     2. npm run deploy:contract
     3. 把输出的合约地址填到 .env / Render 的 BOOK_REGISTRY_ADDRESS
   ═══════════════════════════════════════════ */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { ethers } from "ethers";

const require = createRequire(import.meta.url);
const solc = require("solc");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RPC_URL = process.env.INJ_RPC_URL || "https://k8s.testnet.json-rpc.injective.network/";
const PRIVATE_KEY = process.env.CHAIN_PRIVATE_KEY;
const EXPLORER = (process.env.CHAIN_EXPLORER || "https://testnet.blockscout.injective.network").replace(/\/$/, "");

if (!PRIVATE_KEY) {
  console.error("✗ 请先在 server/.env 配置 CHAIN_PRIVATE_KEY（0x 开头的私钥）");
  process.exit(1);
}

/* ── 编译 ── */
const source = fs.readFileSync(path.join(__dirname, "..", "contracts", "BookRegistry.sol"), "utf8");
const input = {
  language: "Solidity",
  sources: { "BookRegistry.sol": { content: source } },
  settings: {
    optimizer: { enabled: true, runs: 200 },
    outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } },
  },
};
console.log("• 编译 BookRegistry.sol …");
const out = JSON.parse(solc.compile(JSON.stringify(input)));
const errors = (out.errors || []).filter((e) => e.severity === "error");
if (errors.length) {
  errors.forEach((e) => console.error(e.formattedMessage));
  process.exit(1);
}
const artifact = out.contracts["BookRegistry.sol"].BookRegistry;

/* ── 部署 ── */
const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
const net = await provider.getNetwork();
const balance = await provider.getBalance(wallet.address);
console.log(`• 网络 chainId=${net.chainId}  部署账户=${wallet.address}`);
console.log(`• 余额 ${ethers.formatEther(balance)} INJ`);
if (balance === 0n) {
  console.error("✗ 账户余额为 0，请先到水龙头领取测试币：https://testnet.faucet.injective.network/");
  process.exit(1);
}

const fee = await provider.getFeeData();
const factory = new ethers.ContractFactory(artifact.abi, artifact.evm.bytecode.object, wallet);
console.log("• 部署中 …");
const contract = await factory.deploy({
  type: 0, // Injective EVM 使用 legacy 交易
  gasPrice: fee.gasPrice || 160000000n,
  gasLimit: 2000000n,
});
const tx = contract.deploymentTransaction();
console.log(`• 部署交易 ${EXPLORER}/tx/${tx.hash}`);
await contract.waitForDeployment();
const addr = await contract.getAddress();

console.log("\n✓ BookRegistry 部署成功！");
console.log(`  合约地址: ${addr}`);
console.log(`  浏览器:   ${EXPLORER}/address/${addr}`);
console.log("\n下一步：把下面这行加入 server/.env（Render 上加到环境变量）：");
console.log(`  BOOK_REGISTRY_ADDRESS=${addr}`);
