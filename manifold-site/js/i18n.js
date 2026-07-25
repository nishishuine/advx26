/* ============================================================
   MANIFOLD — i18n.js  中英双语切换
   零改动 HTML：以「CSS 选择器 → 英文 HTML」集中维护译文，
   首次应用前把中文原文备份进 data-mf-zh，切换时双向替换。
   描边字为 SVG 渲染，切换后由 main.js 的 __mfStrokeRender 重绘。
   ============================================================ */
window.MF_I18N = (function () {
  const KEY = "mf_lang";
  const PAGE = (location.pathname.split("/").pop() || "index.html") || "index.html";

  /* ---------- 页面标题 ---------- */
  const TITLES = {
    "index.html":     "MANIFOLD — A Semantic Skeleton for AI Output",
    "game.html":      "Game Guide — MANIFOLD",
    "history.html":   "History Timeline — MANIFOLD",
    "recipe.html":    "Recipes — MANIFOLD",
    "knowledge.html": "Knowledge — MANIFOLD",
  };

  /* ---------- index.html ---------- */
  const MARQUEE_EN =
    "<span>[[c:char]]</span><span><b>INLINE ANNOTATION</b></span>" +
    "<span>[[p:part]]</span><span><b>SEMANTIC SKELETON</b></span>" +
    "<span>[[e:event]]</span><span><b>NEW COORDINATE · NEW STANDARD</b></span>" +
    "<span>[[boss:BOSS]]</span><span><b>3RD-GEN OUTPUT FORMAT</b></span>" +
    "<span>[[t:time]]</span><span><b>ONE ENGINE, SIX VERTICALS</b></span>";

  const INDEX = [
    [".hero-meta span:nth-child(2)", "TRACK / XYZ · NEW COORDINATE, NEW STANDARD"],
    [".hero-cn", "SEMANTIC SKELETON"],
    [".hero-sub",
      "Today's AI is smart, but it speaks in a primitive way — dumping paragraph after paragraph of plain text. " +
      "<strong>Manifold defines the third generation of AI output</strong>: text stays text, " +
      "but behind every sentence and every noun sits machine-parsable, structured semantics. " +
      "Markdown gave text style; Manifold gives text <strong>meaning</strong>."],
    [".marquee-track", MARQUEE_EN + MARQUEE_EN],

    ["#solution .sec-note",
      "Everyone is fixing the \"pipes\" (model capability),<br>no one fixes the \"faucet\" (output format).<br>" +
      "Manifold is the first project that seriously asks:<br>\"What format should AI use to talk to humans?\""],
    [".gen-cell:nth-child(1) .gen-tag", "Plain text / human-readable"],
    [".gen-cell:nth-child(1) .gen-desc",
      "The first generation of AI output. It styled text, but machines can't understand it — " +
      "\"José is Úrsula's husband\" is just a string of characters."],
    [".gen-cell:nth-child(2) .gen-tag", "Renderable / no semantics"],
    [".gen-cell:nth-child(2) .gen-desc",
      "The second generation. It can render interfaces, but with no semantic skeleton the output is unstable — " +
      "every generation is a gacha pull that never settles into a standard."],
    [".gen-cell:nth-child(3) .gen-tag", "Inline annotation / semantic skeleton"],
    [".gen-cell:nth-child(3) .gen-desc",
      "The third generation. AI embeds structured marks right inside the text: humans can read it, " +
      "machines can parse it, and renderers make it interactive — click, query, expand, rebuild."],

    ["#syntax .sec-note",
      "Degrades to plain readable text · machine-parsable<br>extensible per vertical · process once, use forever"],
    ["#syntax .code-panel code",
      "[[c:jose_arcadio]]José Arcadio Buendía[[/]]\n" +
      "is the [[r:spouse]]husband[[/]] of [[c:ursula]]Úrsula[[/]];\n" +
      "together they [[e:founding_macondo]]founded Macondo[[/]].\n\n" +
      "[[p:sensor_01]]distance sensor[[/]] connects to the\n" +
      "[[l:2]]control system[[/]] via [[rt:signal]]signal[[/]],\n" +
      "enabling [[f:detect]]hand-proximity detection[[/]]."],
    [".syntax-item:nth-child(1) .mean", "Character mark — literature: characters, relations, events, spoiler-free tiers"],
    [".syntax-item:nth-child(2) .mean", "Part mark — system: parts, layers, signals, rebuild steps"],
    [".syntax-item:nth-child(3) .mean", "Game mark — bosses, phases, skills, drops, choices"],
    [".syntax-item:nth-child(4) .mean", "Time mark — history: moments, causal chains, factions"],
    [".syntax-item:nth-child(5) .mean", "Ingredient mark — recipes: step dependencies, substitutions, heat &amp; timing"],
    [".syntax-item:nth-child(6) .mean",
      "One shared base syntax; every vertical defines its own annotation set — that's the \"manifold\": " +
      "each chart has its own local coordinates, together they form one whole."],

    ["#products .sec-note", "One Manifold engine,<br>six completely different verticals.<br>02 live · 04 on the way"],
    [".product:nth-child(1) .p-name", "Reading"],
    [".product:nth-child(1) .p-desc",
      "For long books and complex narratives — an AI reading companion that remembers \"who is who\" for you. " +
      "Click a name for a character card; the relationship graph unfolds with your reading progress — zero spoilers. " +
      "17 Josés in One Hundred Years of Solitude, no more meltdowns."],
    [".product:nth-child(1) .p-tags", "[[c]] [[r]] [[e]] [[sp]] — literary set"],
    [".product:nth-child(2) .p-name", "Deconstruct"],
    [".product:nth-child(2) .p-desc",
      "When you want to know how something works and how it's made, AI takes it apart layer by layer. " +
      "Switch freely between structure / signal / energy / causality views, then enter rebuild mode: " +
      "parts list → connections → step-by-step guide → acceptance checks."],
    [".product:nth-child(2) .p-tags", "[[p]] [[l]] [[f]] [[rt]] — system set"],
    [".product:nth-child(3) .p-name", "Game Guide"],
    [".product:nth-child(3) .p-desc",
      "How many phases, how to dodge, where the gear drops — turns wall-of-text guides into skill timelines, " +
      "decision trees and loot networks. Branching narrative + numbers, born for structured display."],
    [".product:nth-child(4) .p-name", "History Timeline"],
    [".product:nth-child(4) .p-desc",
      "History is causal chains + timelines + parallel narratives. Manifold recovers everything the text loses — " +
      "interactive timelines, causal force-graphs, rise-and-fall charts. Properly epic."],
    [".product:nth-child(5) .p-name", "Recipes"],
    [".product:nth-child(5) .p-desc",
      "Written recipes lose the key information: step dependencies, ingredient substitutions, failure diagnosis. " +
      "Manifold renders flow charts, ingredient networks, dependency trees — everyone eats, zero threshold."],
    [".product:nth-child(6) .p-name", "Knowledge"],
    [".product:nth-child(6) .p-desc",
      "Any knowledge system deconstructs into a concept network: prerequisites, hierarchy, association paths. " +
      "AI output goes from \"handout\" to \"navigable knowledge map\" — signposts, not a wall of text."],

    ["#chain .sec-note",
      "Good content deserves permanence.<br>Built on the Injective blockchain —<br>" +
      "on-chain means ownership; every share is traceable."],
    [".chain-cell:nth-child(1) .chain-name", "Notarize"],
    [".chain-cell:nth-child(1) .chain-desc",
      "The .manifest content pack is hashed on-chain: content fingerprint + creator address + timestamp. " +
      "Immutable — on-chain means ownership."],
    [".chain-cell:nth-child(2) .chain-name", "Distribute"],
    [".chain-cell:nth-child(2) .chain-desc",
      "Content packs live on IPFS / Arweave decentralized storage; the on-chain hash points to the address. " +
      "Verifiable, permanently accessible."],
    [".chain-cell:nth-child(3) .chain-name", "Trade"],
    [".chain-cell:nth-child(3) .chain-desc",
      "Packs can be minted as NFTs and traded. Creators earn royalties on every resale, automatically — no middlemen."],
    [".chain-cell:nth-child(4) .chain-name", "Discover"],
    [".chain-cell:nth-child(4) .chain-desc",
      "On-chain content indexed by vertical, popularity and creator. Your One Hundred Years of Solitude graph " +
      "or Black Myth guide pack can be discovered by the world."],

    [".foot-title", "MANIFOLD<br><span class=\"stroke\">NEW COORDINATE</span><br><span class=\"stroke\">NEW STANDARD</span>"],
    [".foot-grid div:nth-child(2)", "<b>SOLUTION</b><br>3rd-gen format for AI output<br>Inline annotation · semantic skeleton"],
    [".foot-grid div:nth-child(3)", "<b>PRODUCTS</b><br>Reading / Deconstruct — LIVE<br>Game / History / Recipe / Knowledge — SOON"],
  ];

  /* ---------- 子页公共 ---------- */
  const SUB_COMMON = [
    ["main section:nth-of-type(1) .sec-title", "ANNOTATION <span class=\"stroke\">&amp; RENDERING</span>"],
    [".spec-grid .spec-cell:nth-child(1) h3", "ANNOTATION SET"],
    [".spec-grid .spec-cell:nth-child(2) h3", "RENDERING IMPACT"],
    [".spec-grid .spec-cell:nth-child(4) h3", "TYPICAL SCENE"],
    ["main section:nth-of-type(3) .sec-title", "EXPLORE OTHER <span class=\"stroke\">VERTICALS</span>"],
    [".next-item[href='game.html'] .ni-name", "Game Guide"],
    [".next-item[href='game.html'] .ni-en", "游戏攻略"],
    [".next-item[href='history.html'] .ni-name", "History Timeline"],
    [".next-item[href='history.html'] .ni-en", "历史时间线"],
    [".next-item[href='recipe.html'] .ni-name", "Recipes"],
    [".next-item[href='recipe.html'] .ni-en", "菜谱烹饪"],
    [".next-item[href='knowledge.html'] .ni-name", "Knowledge"],
    [".next-item[href='knowledge.html'] .ni-en", "知识学习"],
    [".foot-grid div:nth-child(1)", "<b>MANIFOLD</b><br>A semantic skeleton for AI output"],
  ];

  /* ---------- game.html ---------- */
  const GAME = SUB_COMMON.concat([
    [".detail-meta span:nth-child(2)", "STATUS / SOON · NEXT UP"],
    [".detail-title", "Game Guide"],
    [".detail-title-en", "游戏攻略"],
    [".detail-lead",
      "AI guides are walls of text — how many phases does the boss have, how do I dodge, where does the gear drop? " +
      "Players end up building the fight flow and decision tree in their heads. " +
      "<strong>Manifold turns a guide into an interactive battle blueprint</strong>: " +
      "boss skill timelines, decision trees, loot networks, map interaction — born for games."],
    [".spec-grid .spec-cell:nth-child(1) ul",
      "<li><code>[[boss:BOSS-ID]]</code> — boss mark</li>" +
      "<li><code>[[skill:name]]</code> — skill mark</li>" +
      "<li><code>[[phase:N]]</code> — fight phase</li>" +
      "<li><code>[[drop:item]]</code> — drops / gear</li>" +
      "<li><code>[[choice:branch]]</code> — decision branch</li>" +
      "<li><code>[[map:place]]</code> — map / location</li>"],
    [".spec-grid .spec-cell:nth-child(2) p",
      "Boss skill timelines, decision trees, loot networks, map interaction. Novels are linear narrative; " +
      "games are branching narrative + numbers — perfectly complementary to the literature and system modes."],
    [".spec-grid .spec-cell:nth-child(3) h3", "WHY IT'S NEXT"],
    [".spec-grid .spec-cell:nth-child(3) p",
      "Info loss ★★★★★ / rendering impact ★★★★★ / resonance ★★★★★ / complementarity ★★★★★ — " +
      "20/20, the top-priority vertical on our roadmap."],
    [".spec-grid .spec-cell:nth-child(4) p",
      "A player builds a full boss-guide pack for Black Myth: Wukong with Manifold → notarizes it on-chain → " +
      "other players discover and grab it on-chain → open it in the Manifold reader and learn each fight interactively."],
    ["main section:nth-of-type(2) .sec-title", "ONE SENTENCE, <span class=\"stroke\">TWO READINGS</span>"],
    ["main section:nth-of-type(2) .demo-panel",
      "<span class=\"hl\">Raw text:</span> \"Radagon, the final boss of Elden Ring: in phase one he slams the\n" +
      "ground with a golden hammer — roll left to dodge. In phase two he becomes\n" +
      "the Elden Beast and casts a golden ring — run to the edge of the arena.\"\n\n" +
      "<span class=\"hl\">With Manifold annotations:</span>\n" +
      "[[boss:radagon]]Radagon[[/]] | [[phase:1]]Phase 1[[/]] [[skill:hammer_slam]]Golden Hammer Slam[[/]]\n" +
      "  → [[choice:roll_left]]roll left to dodge[[/]]\n" +
      "  → [[phase:2]]Phase 2[[/]] → [[boss:elden_beast]]Elden Beast[[/]]\n" +
      "  → [[skill:golden_ring]]Golden Ring[[/]] → [[choice:run_to_edge]]run to the arena edge[[/]]\n\n" +
      "<span class=\"hl\">Rendered:</span>\n" +
      "┌─────────────────────────────────────┐\n" +
      "│ RADAGON          progress: ██████░░ │\n" +
      "│ ┌────────┐   ┌────────┐             │\n" +
      "│ │ phase1 │ → │ phase2 │             │\n" +
      "│ │ hammer │   │ ring   │             │\n" +
      "│ │ slam   │   │ AOE    │             │\n" +
      "│ │ ↓      │   │ ↓      │             │\n" +
      "│ │ roll L │   │ to edge│             │\n" +
      "│ └────────┘   └────────┘             │\n" +
      "│ [gear] [drops] [lore]               │\n" +
      "└─────────────────────────────────────┘"],
  ]);

  /* ---------- history.html ---------- */
  const HISTORY = SUB_COMMON.concat([
    [".detail-title", "History Timeline"],
    [".detail-title-en", "历史时间线"],
    [".detail-lead",
      "History is causal chains + timelines + parallel narratives. Told as plain text, " +
      "<strong>the temporal relations, causality and interplay of forces are all lost</strong>. " +
      "Manifold brings them all back: interactive timelines, causal force-graphs, rise-and-fall charts — properly epic."],
    [".spec-grid .spec-cell:nth-child(1) ul",
      "<li><code>[[t:time]]</code> — time mark</li>" +
      "<li><code>[[event:event]]</code> — event mark</li>" +
      "<li><code>[[cau:causal]]</code> — causal chain</li>" +
      "<li><code>[[per:person]]</code> — historical figure</li>" +
      "<li><code>[[loc:place]]</code> — location</li>" +
      "<li><code>[[force:faction]]</code> — force / faction</li>"],
    [".spec-grid .spec-cell:nth-child(2) p",
      "Interactive timelines, causal force-directed graphs, rise-and-fall charts. Adds two whole new dimensions — " +
      "time and causality — and connects naturally with literature mode: history books are books too."],
    [".spec-grid .spec-cell:nth-child(3) h3", "WHY — PRIORITY"],
    [".spec-grid .spec-cell:nth-child(3) p",
      "Info loss ★★★★★ / rendering impact ★★★★★ / resonance ★★★★☆ / complementarity ★★★★★ — " +
      "19/20, second on the roadmap. Visualized causality is instantly readable and epic."],
    [".spec-grid .spec-cell:nth-child(4) p",
      "Reading about the Chu–Han contention: tap \"Gaixia\" to see the moment, the forces involved and the causal " +
      "chain around it; drag the timeline to watch territories rise and fall — history is no longer a memorized list of dates."],
    ["main section:nth-of-type(2) .sec-title", "CAUSALITY, <span class=\"stroke\">MADE VISIBLE</span>"],
    ["main section:nth-of-type(2) .demo-panel",
      "<span class=\"hl\">Manifold annotation:</span>\n\n" +
      "[[t:209BC]]209 BC[[/]] [[event:daze_uprising]]Dazexiang Uprising[[/]] breaks out\n" +
      "  → [[cau:trigger]]directly triggers[[/]] [[force:chu]]Chu[[/]] to rise\n" +
      "  → [[per:xiangyu]]Xiang Yu[[/]] [[event:julu_battle]]burns the boats[[/]] at [[loc:ju_lu]]Julu[[/]]\n" +
      "  → [[cau:lead_to]]ultimately leads to[[/]] the fall of [[force:qin]]Qin[[/]]\n\n" +
      "<span class=\"hl\">Rendered:</span>\n" +
      "  timeline ──●────────●──────────●──────►\n" +
      "            209BC     208BC      207BC\n" +
      "            Dazexiang  Julu      Qin falls\n" +
      "              │cause    │cause\n" +
      "  forces   Qin ██████░ → ███░░░ → ░\n" +
      "           Chu ░░░░░░░ → ████░░ → ██████"],
  ]);

  /* ---------- recipe.html ---------- */
  const RECIPE = SUB_COMMON.concat([
    [".detail-title", "Recipes"],
    [".detail-title-en", "菜谱烹饪"],
    [".detail-lead",
      "A written recipe loses critical information — <strong>step dependencies, ingredient substitutions, " +
      "failure diagnosis</strong>. Manifold renders flow charts, ingredient networks and step dependency trees: " +
      "useful and beautiful. Everyone eats — this is the zero-threshold vertical."],
    [".spec-grid .spec-cell:nth-child(1) ul",
      "<li><code>[[ing:item]]</code> — ingredient</li>" +
      "<li><code>[[step:N]]</code> — step mark</li>" +
      "<li><code>[[tool:tool]]</code> — tool mark</li>" +
      "<li><code>[[dep:need]]</code> — step dependency</li>" +
      "<li><code>[[alt:swap]]</code> — substitution</li>" +
      "<li><code>[[temp:heat]]</code> / <code>[[time:duration]]</code> — heat &amp; timing</li>"],
    [".spec-grid .spec-cell:nth-child(2) p",
      "Flow charts, ingredient networks, step dependency trees. Deconstruct a dish → understand the relations → " +
      "rebuild / cook — the same \"take apart, put back together\" logic as Deconstruct mode."],
    [".spec-grid .spec-cell:nth-child(3) h3", "WHY — PRIORITY"],
    [".spec-grid .spec-cell:nth-child(3) p",
      "Info loss ★★★★★ / rendering impact ★★★★☆ / resonance ★★★★★ / complementarity ★★★☆☆ — " +
      "17/20. Everyone eats; zero threshold to understand; the most shareable vertical."],
    [".spec-grid .spec-cell:nth-child(4) p",
      "\"No cooking wine?\" Tap the ingredient → a substitution network pops up. \"Why is my pork tough?\" " +
      "Trace back along the dependency tree → locate the failed step → get a fix path."],
    ["main section:nth-of-type(2) .sec-title", "STEPS HAVE <span class=\"stroke\">DEPENDENCIES</span>"],
    ["main section:nth-of-type(2) .demo-panel",
      "<span class=\"hl\">Manifold annotation:</span>\n\n" +
      "[[step:1]]Marinate[[/]] [[ing:pork]]pork belly[[/]] — [[time:30min]]30 min[[/]]\n" +
      "  → [[dep:marinate_first]] or the flavor won't sink in[[/]]\n" +
      "[[step:2]] [[tool:wok]]hot wok[[/]], cold oil, [[temp:mid]]medium heat[[/]] to render the fat\n" +
      "  → [[alt:no_wine]]beer works as a substitute[[/]]\n\n" +
      "<span class=\"hl\">Rendered:</span>\n" +
      "  step dependency tree\n" +
      "   ┌────────┐   ┌────────┐   ┌────────┐\n" +
      "   │Marinate│ → │ Render │ → │ Reduce │\n" +
      "   │ 30min  │   │ medium │   │ high   │\n" +
      "   └────────┘   └────────┘   └────────┘\n" +
      "        │troubleshoot: tough meat? ← trace back to \"Render\": heat too high"],
  ]);

  /* ---------- knowledge.html ---------- */
  const KNOWLEDGE = SUB_COMMON.concat([
    [".detail-title", "Knowledge"],
    [".detail-title-en", "知识学习"],
    [".detail-lead",
      "Any body of knowledge can be deconstructed into a concept network: <strong>prerequisites, hierarchy, " +
      "association paths</strong>. Manifold turns AI output from a lecture handout into a navigable knowledge map — " +
      "signposts for learning, not a wall of text."],
    [".spec-grid .spec-cell:nth-child(1) ul",
      "<li><code>[[concept:idea]]</code> — concept mark</li>" +
      "<li><code>[[prereq:need]]</code> — prerequisite</li>" +
      "<li><code>[[rel:link]]</code> — concept relation</li>" +
      "<li><code>[[path:route]]</code> — learning path</li>" +
      "<li><code>[[ex:sample]]</code> — example mark</li>" +
      "<li><code>[[quiz:check]]</code> — mastery check</li>"],
    [".spec-grid .spec-cell:nth-child(2) p",
      "Concept graphs, prerequisite trees, personalized learning paths. \"I don't get it\" becomes locatable — " +
      "it's not that you aren't trying; you're missing one prerequisite piece."],
    [".spec-grid .spec-cell:nth-child(3) h3", "WHY — PRIORITY"],
    [".spec-grid .spec-cell:nth-child(3) p",
      "Info loss ★★★★★ / rendering impact ★★★☆☆ / resonance ★★★★☆ / complementarity ★★★☆☆ — " +
      "15/20. The widest-audience vertical, and the long-term direction of Manifold's open annotation-set ecosystem."],
    [".spec-grid .spec-cell:nth-child(4) p",
      "\"I can't understand the Fourier transform\" → Manifold walks the prerequisite tree: complex numbers → " +
      "integrals → trigonometry; finds your gap → generates a remedial path just for you, each step checkable and askable."],
    ["main section:nth-of-type(2) .sec-title", "NOT A WALL — <span class=\"stroke\">A MAP</span>"],
    ["main section:nth-of-type(2) .demo-panel",
      "<span class=\"hl\">Manifold annotation:</span>\n\n" +
      "[[concept:fourier]]Fourier Transform[[/]]\n" +
      "  [[prereq:complex]]prereq: complex numbers[[/]]\n" +
      "  [[prereq:integral]]prereq: integrals[[/]]\n" +
      "  [[rel:signal]]related: signal processing[[/]]\n\n" +
      "<span class=\"hl\">Rendered:</span>\n" +
      "  prerequisite tree\n" +
      "              ┌───────────────┐\n" +
      "              │ Fourier Xform │\n" +
      "              └──────┬────────┘\n" +
      "        ┌────────────┼────────────┐\n" +
      "   ┌────┴────┐  ┌────┴────┐  ┌────┴────┐\n" +
      "   │ complex │  │ integral│  │  trig   │\n" +
      "   │ ✓ known │  │ ✗ gap   │  │ ✓ known │\n" +
      "   └─────────┘  └─────────┘  └─────────┘\n" +
      "        path replanned: integrals → Fourier Transform"],
  ]);

  const PAGES = {
    "index.html": INDEX,
    "game.html": GAME,
    "history.html": HISTORY,
    "recipe.html": RECIPE,
    "knowledge.html": KNOWLEDGE,
  };

  /* ---------- 应用与切换 ---------- */
  let zhTitle = "";
  let btn = null;

  function entries() { return PAGES[PAGE] || PAGES["index.html"]; }

  function apply(lang) {
    entries().forEach(([sel, en]) => {
      document.querySelectorAll(sel).forEach((el) => {
        if (el.dataset.mfZh === undefined) el.dataset.mfZh = el.innerHTML;
        el.innerHTML = lang === "en" ? en : el.dataset.mfZh;
      });
    });
    document.documentElement.lang = lang === "en" ? "en" : "zh-CN";
    document.title = lang === "en" ? (TITLES[PAGE] || zhTitle) : zhTitle;
    if (btn) btn.textContent = lang === "en" ? "中文" : "EN";
    /* 描边字文本可能已变，交给 main.js 重绘 SVG */
    if (window.__mfStrokeRender) window.__mfStrokeRender();
  }

  function setLang(lang) {
    try { localStorage.setItem(KEY, lang); } catch (e) {}
    apply(lang);
  }

  function current() {
    try { return localStorage.getItem(KEY) === "en" ? "en" : "zh"; } catch (e) { return "zh"; }
  }

  function init() {
    zhTitle = document.title;
    btn = document.createElement("button");
    btn.type = "button";
    btn.className = "lang-btn";
    btn.setAttribute("aria-label", "Switch language");
    btn.addEventListener("click", () => setLang(current() === "en" ? "zh" : "en"));
    document.body.appendChild(btn);
    const lang = current();
    if (lang === "en") apply("en");
    else btn.textContent = "EN";
  }

  return { init, setLang, current };
})();
