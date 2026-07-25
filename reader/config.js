/* ═══════════════════════════════════════════
   后端地址配置
   本地开发默认 http://localhost:8787
   部署到 Vercel 后，把 PROD_API 改成你的 Render 地址，
   例如 https://reading-buddy-api.onrender.com
   ═══════════════════════════════════════════ */
window.RC_CONFIG = (function () {
  const PROD_API = "https://reading-buddy-api.onrender.com"; // ← 部署后改这里
  const isLocal = /^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/.test(location.hostname);
  return {
    API_BASE: localStorage.getItem("rc-api-base") || (isLocal ? "http://localhost:8787" : PROD_API),
  };
})();
