/* ═══════════════════════════════════════════
   后端 API 客户端
   登录态存 localStorage（rc-token / rc-user）
   bookshelf.html / store.html / auth.html / app.js 共用
   ═══════════════════════════════════════════ */
window.API = (function () {
  "use strict";
  const BASE = (window.RC_CONFIG && window.RC_CONFIG.API_BASE) || "http://localhost:8787";
  const TKEY = "rc-token", UKEY = "rc-user";

  function token() { return localStorage.getItem(TKEY) || ""; }
  function user() {
    try { return JSON.parse(localStorage.getItem(UKEY) || "null"); } catch (e) { return null; }
  }
  function setSession(t, u) {
    localStorage.setItem(TKEY, t);
    localStorage.setItem(UKEY, JSON.stringify(u));
  }
  function logout() { localStorage.removeItem(TKEY); localStorage.removeItem(UKEY); }

  async function req(path, opts) {
    opts = opts || {};
    const headers = Object.assign({}, opts.headers);
    if (token()) headers["Authorization"] = "Bearer " + token();
    if (opts.json) {
      headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(opts.json);
    }
    let res;
    try {
      res = await fetch(BASE + path, Object.assign({}, opts, { headers }));
    } catch (e) {
      throw new Error("无法连接服务器，请稍后再试");
    }
    if (opts.raw) {
      if (!res.ok) {
        let msg = "请求失败 (" + res.status + ")";
        try { msg = (await res.json()).error || msg; } catch (e) {}
        throw new Error(msg);
      }
      return res;
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (res.status === 401) logout();
      throw new Error(data.error || "请求失败 (" + res.status + ")");
    }
    return data;
  }

  return {
    BASE, token, user, logout,
    /* 账号 */
    async register(username, password) {
      const d = await req("/api/auth/register", { method: "POST", json: { username, password } });
      setSession(d.token, d.user); return d.user;
    },
    async login(username, password) {
      const d = await req("/api/auth/login", { method: "POST", json: { username, password } });
      setSession(d.token, d.user); return d.user;
    },
    /* 我的书库 */
    myBooks: () => req("/api/books").then(d => d.books),
    uploadBook(file, isPublic, onDone) {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("is_public", isPublic ? "1" : "0");
      return req("/api/books", { method: "POST", body: fd }).then(d => d.book);
    },
    setPublic: (id, isPublic) => req("/api/books/" + id, { method: "PATCH", json: { is_public: isPublic } }),
    deleteBook: (id) => req("/api/books/" + id, { method: "DELETE" }),
    /* 下载书包二进制（阅读器用） */
    fetchPack: (id) => req("/api/books/" + id + "/file", { raw: true }).then(r => r.arrayBuffer()),
    coverURL: (id) => BASE + "/api/books/" + id + "/cover" + (token() ? "?token=" + encodeURIComponent(token()) : ""),
    /* 书城 */
    store: (q, sort) => req("/api/store?q=" + encodeURIComponent(q || "") + "&sort=" + (sort || "new")).then(d => d.books),
    /* 链上存证 */
    chainProof: (id) => req("/api/books/" + id + "/chain"),
    chainInfo: () => req("/api/books/chain/info"),
    backfillChain: (id) => req("/api/books/" + id + "/chain", { method: "POST" }),
  };
})();
