/* ============================================================
   MANIFOLD — main.js
   ============================================================ */

/* ------------------------------------------------------------
   ⚙️ 产品外链配置 —— 拿到链接后替换下面的 URL 即可
   ------------------------------------------------------------ */
const PRODUCT_LINKS = {
  reader:      "https://reader-lovat-seven.vercel.app/bookshelf.html", // 读书 · AI 阅读伴侣（藏书阁）
  deconstruct: "https://manifold-deconstruct.vercel.app",             // 拆解 · 8bit 拆开世界，再重建
};

document.addEventListener("DOMContentLoaded", () => {
  // 绑定外链（未配置的产品保持 # 占位）
  document.querySelectorAll("[data-product-link]").forEach((el) => {
    const key = el.getAttribute("data-product-link");
    if (PRODUCT_LINKS[key]) el.setAttribute("href", PRODUCT_LINKS[key]);
  });

  initCursor();
  initCanvas();
  initReveal();
  initMarquee();
  if (window.MF_I18N) MF_I18N.init();   // 中英切换（须在描边字渲染前应用语言）
  initSvgStroke();
});

/* ---------- SVG 描边字 ----------
   -webkit-text-stroke 在移动端受合成粗体/内核差异影响会出现重影接缝，
   运行时把 .stroke 文字替换成 SVG <text fill=none stroke>，矢量描边一次成型 */
function initSvgStroke() {
  const SEL = ".hero-title .stroke, .sec-title .stroke, .foot-title .stroke";
  const NS = "http://www.w3.org/2000/svg";

  function render(el) {
    if (!el.dataset.strokeText) el.dataset.strokeText = el.textContent.trim();
    const probe = el.dataset.strokeText;
    el.textContent = probe;                       // 先还原文本，取当前断点下的真实计算样式
    const cs = getComputedStyle(el);
    const sw = parseFloat(cs.webkitTextStrokeWidth) || 1.5;
    const color = cs.webkitTextStrokeColor && cs.webkitTextStrokeColor !== "rgba(0, 0, 0, 0)"
      ? cs.webkitTextStrokeColor : "#f2f2f2";

    const svg = document.createElementNS(NS, "svg");
    const t = document.createElementNS(NS, "text");
    t.setAttribute("x", "0");
    t.setAttribute("y", "0");
    t.setAttribute("fill", "none");
    t.setAttribute("stroke", color);
    t.setAttribute("stroke-width", sw);
    t.setAttribute("stroke-linejoin", "round");
    t.style.fontFamily = cs.fontFamily;
    t.style.fontSize = cs.fontSize;
    t.style.fontWeight = cs.fontWeight;
    t.style.letterSpacing = cs.letterSpacing;
    t.textContent = probe;
    svg.appendChild(t);
    svg.setAttribute("aria-label", probe);
    svg.style.display = "inline-block";
    svg.style.overflow = "visible";

    el.textContent = "";
    el.appendChild(svg);
    const bb = t.getBBox();
    const pad = sw;                               // 给描边外扩留边
    svg.setAttribute("viewBox", `${bb.x - pad} ${bb.y - pad} ${bb.width + pad * 2} ${bb.height + pad * 2}`);
    svg.style.width = (bb.width + pad * 2) + "px";
    svg.style.height = (bb.height + pad * 2) + "px";
    // 把 SVG 内部基线（y=0）对齐到行内文字基线
    svg.style.verticalAlign = -(bb.y + bb.height + pad) + "px";
  }

  /* 每次重查询：i18n 切换语言会用 innerHTML 重建 .stroke 节点 */
  const renderAll = () => document.querySelectorAll(SEL).forEach(render);
  window.__mfStrokeRender = renderAll;
  renderAll();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(renderAll);
  let tm;
  window.addEventListener("resize", () => { clearTimeout(tm); tm = setTimeout(renderAll, 150); });
}

/* ---------- custom cursor ---------- */
function initCursor() {
  if (window.matchMedia("(hover: none)").matches) return;
  const dot = document.createElement("div");
  const ring = document.createElement("div");
  const label = document.createElement("div");
  dot.className = "cursor-dot";
  ring.className = "cursor-ring";
  label.className = "cursor-label";
  document.body.append(dot, ring, label);

  let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
  addEventListener("mousemove", (e) => {
    mx = e.clientX; my = e.clientY;
    dot.style.transform = `translate(${mx}px,${my}px) translate(-50%,-50%)`;
    label.style.left = mx + "px";
    label.style.top = my + "px";
  });
  (function loop() {
    rx += (mx - rx) * 0.16;
    ry += (my - ry) * 0.16;
    ring.style.transform = `translate(${rx}px,${ry}px) translate(-50%,-50%)`;
    requestAnimationFrame(loop);
  })();

  document.querySelectorAll("a, .anno, [data-cursor]").forEach((el) => {
    el.addEventListener("mouseenter", () => {
      ring.classList.add("is-hover");
      const t = el.getAttribute("data-cursor");
      if (t) { label.textContent = t; label.classList.add("show"); }
    });
    el.addEventListener("mouseleave", () => {
      ring.classList.remove("is-hover");
      label.classList.remove("show");
    });
  });
}

/* ---------- manifold wireframe canvas ---------- */
function initCanvas() {
  const cv = document.getElementById("manifold-canvas");
  if (!cv) return;
  const ctx = cv.getContext("2d");
  let w, h, t = 0;
  let mouseX = 0.5, mouseY = 0.5;

  const resize = () => {
    w = cv.width = innerWidth * devicePixelRatio;
    h = cv.height = innerHeight * devicePixelRatio;
    cv.style.width = innerWidth + "px";
    cv.style.height = innerHeight + "px";
  };
  resize();
  addEventListener("resize", resize);
  addEventListener("mousemove", (e) => {
    mouseX = e.clientX / innerWidth;
    mouseY = e.clientY / innerHeight;
  });

  const COLS = 46, ROWS = 26;

  function surface(x, y, t) {
    // 流形曲面：多层正弦叠加的数学曲面
    return (
      Math.sin(x * 0.32 + t * 0.7) * Math.cos(y * 0.28 + t * 0.5) * 34 +
      Math.sin(x * 0.11 - t * 0.35 + y * 0.14) * 52 +
      Math.sin((x + mouseX * 8) * 0.55 + t) * Math.cos((y - mouseY * 6) * 0.5) * 12
    );
  }

  function draw() {
    t += 0.008;
    ctx.clearRect(0, 0, w, h);
    const dpr = devicePixelRatio;
    const gw = w * 1.3, gh = h * 1.3;
    const ox = (w - gw) / 2, oy = (h - gh) / 2 - h * 0.05;
    const dx = gw / COLS, dy = gh / ROWS;

    ctx.lineWidth = 0.6 * dpr;

    // 横向线
    for (let j = 0; j <= ROWS; j++) {
      ctx.beginPath();
      for (let i = 0; i <= COLS; i++) {
        const z = surface(i, j, t);
        const px = ox + i * dx;
        const py = oy + j * dy + z * dpr;
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      const alpha = 0.05 + 0.10 * (j / ROWS);
      ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
      ctx.stroke();
    }
    // 纵向线（更淡）
    for (let i = 0; i <= COLS; i += 2) {
      ctx.beginPath();
      for (let j = 0; j <= ROWS; j++) {
        const z = surface(i, j, t);
        const px = ox + i * dx;
        const py = oy + j * dy + z * dpr;
        j === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.strokeStyle = "rgba(255,255,255,0.035)";
      ctx.stroke();
    }

    // 交点节点（稀疏）
    for (let j = 0; j <= ROWS; j += 4) {
      for (let i = 0; i <= COLS; i += 4) {
        const z = surface(i, j, t);
        const px = ox + i * dx;
        const py = oy + j * dy + z * dpr;
        ctx.beginPath();
        ctx.arc(px, py, 1.1 * dpr, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        ctx.fill();
      }
    }
    requestAnimationFrame(draw);
  }
  draw();
}

/* ---------- scroll reveal ---------- */
function initReveal() {
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add("in")),
    { threshold: 0.12 }
  );
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
}

/* ---------- marquee duplicate ---------- */
function initMarquee() {
  const track = document.querySelector(".marquee-track");
  if (!track) return;
  track.innerHTML += track.innerHTML;
}
