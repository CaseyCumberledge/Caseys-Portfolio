const GRAPH_DATA = {
  nodes: [
    { id: "casey", label: "CASEY", type: "core", desc: "IT professional. Cybersecurity, infrastructure, software. Everything on this map traces back here.", link: "#about", linkText: "read about me →", r: 26 },

    { id: "jwf", label: "JWF Industries", type: "role", desc: "Software Specialist / IT at a military-contract metal fabrication company. Infrastructure, networking, and shop-floor systems.", link: "#experience", linkText: "view experience →", r: 15 },
    { id: "qualfon", label: "Qualfon", type: "role", desc: "Technical Analyst supporting Highmark BCBS through VMware Horizon VDI infrastructure.", link: "#experience", linkText: "view experience →", r: 13 },
    { id: "nettech", label: "Network Tech", type: "role", desc: "Hands-on network support and helpdesk across multiple facilities.", link: "#experience", linkText: "view experience →", r: 12 },

    { id: "ceh", label: "CEH", type: "cert", desc: "Certified Ethical Hacker, EC-Council, 2025. Offensive security methodology and tooling.", link: "#certs", linkText: "view certifications →", r: 11 },
    { id: "secplus", label: "Security+", type: "cert", desc: "CompTIA Security+, 2025. Core security operations, threats, and architecture.", link: "#certs", linkText: "view certifications →", r: 11 },
    { id: "netplus", label: "Network+", type: "cert", desc: "CompTIA Network+, 2023. Network design, configuration, and troubleshooting.", link: "#certs", linkText: "view certifications →", r: 11 },
    { id: "bs", label: "BS Cybersecurity", type: "cert", desc: "Bachelor of Science in Cybersecurity, University of Phoenix.", link: "#certs", linkText: "view education →", r: 12 },

    { id: "python", label: "Python", type: "skill", desc: "Automation, scripting, and tooling across IT and software projects.", link: "#projects", linkText: "see it in projects →", r: 11 },
    { id: "networking", label: "Networking", type: "skill", desc: "Switch config, cabling, infrastructure management, and industrial machine networks.", link: "#experience", linkText: "view experience →", r: 12 },
    { id: "pentest", label: "Pen Testing", type: "skill", desc: "Kali, Metasploit, Wireshark, Burp Suite. Lab-built offensive security experience.", link: "#projects", linkText: "view security work →", r: 11 },
    { id: "webdev", label: "Web Dev", type: "skill", desc: "JavaScript, Next.js, TypeScript, Supabase. Full production web applications.", link: "#projects", linkText: "view projects →", r: 11 },
    { id: "vdi", label: "VDI / VMware", type: "skill", desc: "Enterprise virtual desktop infrastructure support at healthcare scale.", link: "#experience", linkText: "view experience →", r: 10 },

    { id: "replen", label: "Replen", type: "project", desc: "Purchasing intelligence Excel add-in and web app with live paying customers. codite.com", link: "#projects", linkText: "view project →", r: 13 },
    { id: "cimco", label: "CIMCO MDC-Max", type: "project", desc: "Machine data collection rollout connecting CNC equipment to live production monitoring.", link: "#projects", linkText: "view project →", r: 12 },
    { id: "frostbyte", label: "PlayFrostbyte", type: "project", desc: "Roblox esports platform: tournaments, leaderboards, match queueing. Next.js + Supabase.", link: "#projects", linkText: "view project →", r: 12 },
    { id: "labs", label: "PenTest Labs", type: "project", desc: "Built and executed offensive security labs simulating real attack vectors.", link: "#projects", linkText: "view project →", r: 11 }
  ],
  edges: [
    ["casey", "jwf"], ["casey", "qualfon"], ["casey", "nettech"], ["casey", "bs"],
    ["jwf", "cimco"], ["jwf", "networking"],
    ["qualfon", "vdi"],
    ["nettech", "networking"],
    ["bs", "secplus"], ["bs", "ceh"],
    ["ceh", "pentest"], ["secplus", "pentest"], ["netplus", "networking"],
    ["pentest", "labs"],
    ["python", "replen"], ["python", "cimco"], ["casey", "python"],
    ["webdev", "replen"], ["webdev", "frostbyte"], ["casey", "webdev"],
    ["casey", "netplus"]
  ]
};

const COLORS = {
  core: "#e9edfb",
  role: "#4d7cfe",
  skill: "#6fd4ff",
  cert: "#9d6bff",
  project: "#ff6bd6"
};

(function () {
  const canvas = document.getElementById("graph-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let W, H, dpr, nodes, edges;
  let hovered = null, dragged = null, animId = null;
  let mouse = { x: -9999, y: -9999 };

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.offsetWidth;
    H = canvas.offsetHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function init() {
    resize();
    const mobile = W < 700;
    const cx = mobile ? W / 2 : W * 0.69;
    const cy = mobile ? H * 0.26 : H * 0.52;
    const base = mobile ? Math.min(W, H) * 0.30 : Math.min(W * 0.27, H * 0.38);
    const byType = { role: [], skill: [], cert: [], project: [] };
    GRAPH_DATA.nodes.forEach(n => { if (byType[n.type]) byType[n.type].push(n); });
    const sectors = { role: -2.4, cert: -0.8, skill: 0.8, project: 2.4 };
    const anchors = {};
    for (const type in byType) {
      const group = byType[type];
      const span = 1.25;
      group.forEach((n, i) => {
        const a = sectors[type] + (group.length > 1 ? (i / (group.length - 1) - 0.5) * span : 0);
        const ring = base * (0.72 + (i % 2) * 0.34);
        anchors[n.id] = { x: cx + Math.cos(a) * ring, y: cy + Math.sin(a) * ring, a, ring };
      });
    }
    anchors.casey = { x: cx, y: cy, a: 0, ring: 0 };
    nodes = GRAPH_DATA.nodes.map(n => {
      const an = anchors[n.id];
      return {
        ...n,
        r: mobile ? n.r * 0.72 : n.r,
        x: an.x, y: an.y,
        vx: 0, vy: 0,
        ax: an.x, ay: an.y,
        phase: Math.random() * Math.PI * 2,
        drift: 4 + Math.random() * 6
      };
    });
    edges = GRAPH_DATA.edges.map(([a, b]) => [
      nodes.find(n => n.id === a),
      nodes.find(n => n.id === b)
    ]);
  }

  let tick = 0;
  function physics() {
    tick += 0.008;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        let dx = b.x - a.x, dy = b.y - a.y;
        let d2 = dx * dx + dy * dy || 1;
        const min = (a.r + b.r + 34) ** 2;
        if (d2 < min) {
          const d = Math.sqrt(d2);
          const f = (Math.sqrt(min) - d) * 0.04;
          dx /= d; dy /= d;
          a.vx -= dx * f; a.vy -= dy * f;
          b.vx += dx * f; b.vy += dy * f;
        }
      }
    }
    for (const n of nodes) {
      if (n === dragged) { n.vx = 0; n.vy = 0; continue; }
      const tx = n.ax + Math.cos(tick * 1.3 + n.phase) * n.drift;
      const ty = n.ay + Math.sin(tick + n.phase) * n.drift;
      n.vx += (tx - n.x) * 0.02;
      n.vy += (ty - n.y) * 0.02;
      n.vx *= 0.85; n.vy *= 0.85;
      n.x += n.vx; n.y += n.vy;
      const pad = n.r + 16;
      n.x = Math.max(pad, Math.min(W - pad, n.x));
      n.y = Math.max(pad + 70, Math.min(H - pad - 60, n.y));
    }
  }

  function connected(n) {
    const set = new Set([n]);
    for (const [a, b] of edges) {
      if (a === n) set.add(b);
      if (b === n) set.add(a);
    }
    return set;
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    const focus = hovered || dragged;
    const focusSet = focus ? connected(focus) : null;

    for (const [a, b] of edges) {
      const lit = focusSet && focusSet.has(a) && focusSet.has(b) && (a === focus || b === focus);
      const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
      grad.addColorStop(0, COLORS[a.type]);
      grad.addColorStop(1, COLORS[b.type]);
      ctx.strokeStyle = grad;
      ctx.globalAlpha = lit ? 0.9 : focusSet ? 0.07 : 0.26;
      ctx.lineWidth = lit ? 1.8 : 1;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    for (const n of nodes) {
      const lit = !focusSet || focusSet.has(n);
      const color = COLORS[n.type];
      ctx.globalAlpha = lit ? 1 : 0.25;

      if (n === focus || n.type === "core") {
        ctx.shadowColor = color;
        ctx.shadowBlur = 22;
      }
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fillStyle = n.type === "core" ? "#101736" : "#0c1228";
      ctx.fill();
      ctx.lineWidth = n === focus ? 2.5 : 1.6;
      ctx.strokeStyle = color;
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r * 0.35, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      if (lit && (W >= 700 || n.r > 10 || n === focus)) {
        ctx.font = `500 ${W < 700 ? 9 : 11}px "JetBrains Mono", monospace`;
        ctx.fillStyle = n === focus ? "#e9edfb" : "rgba(151, 160, 195, 0.85)";
        ctx.textAlign = "center";
        ctx.fillText(n.label, n.x, n.y + n.r + 15);
      }
    }
    ctx.globalAlpha = 1;
  }

  function loop() {
    if (!reduceMotion) physics();
    draw();
    animId = requestAnimationFrame(loop);
  }

  function nodeAt(x, y) {
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      const dx = x - n.x, dy = y - n.y;
      if (dx * dx + dy * dy < (n.r + 8) * (n.r + 8)) return n;
    }
    return null;
  }

  function pos(e) {
    const rect = canvas.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    return { x: t.clientX - rect.left, y: t.clientY - rect.top };
  }

  const panel = document.getElementById("graph-panel");

  function showPanel(n) {
    document.getElementById("panel-type").textContent = n.type === "core" ? "you found the center" : n.type;
    document.getElementById("panel-title").textContent = n.label;
    document.getElementById("panel-desc").textContent = n.desc;
    const link = document.getElementById("panel-link");
    link.href = n.link;
    link.textContent = n.linkText;
    panel.classList.add("active");
  }

  canvas.addEventListener("mousemove", e => {
    const p = pos(e);
    mouse = p;
    if (dragged) {
      dragged.x = p.x;
      dragged.y = p.y;
    } else {
      hovered = nodeAt(p.x, p.y);
      canvas.style.cursor = hovered ? "pointer" : "grab";
    }
  });

  canvas.addEventListener("mousedown", e => {
    const p = pos(e);
    const n = nodeAt(p.x, p.y);
    if (n) {
      dragged = n;
      canvas.classList.add("dragging");
    }
  });

  let downAt = null;
  canvas.addEventListener("mousedown", e => { downAt = pos(e); });

  window.addEventListener("mouseup", e => {
    if (dragged && downAt) {
      const rect = canvas.getBoundingClientRect();
      const dx = e.clientX - rect.left - downAt.x;
      const dy = e.clientY - rect.top - downAt.y;
      if (dx * dx + dy * dy < 36) showPanel(dragged);
    }
    dragged = null;
    downAt = null;
    canvas.classList.remove("dragging");
  });

  canvas.addEventListener("mouseleave", () => { hovered = null; mouse = { x: -9999, y: -9999 }; });

  canvas.addEventListener("touchstart", e => {
    const p = pos(e);
    const n = nodeAt(p.x, p.y);
    if (n) {
      dragged = n;
      downAt = p;
      e.preventDefault();
    }
  }, { passive: false });

  canvas.addEventListener("touchmove", e => {
    if (dragged) {
      const p = pos(e);
      dragged.x = p.x;
      dragged.y = p.y;
      e.preventDefault();
    }
  }, { passive: false });

  canvas.addEventListener("touchend", e => {
    if (dragged && downAt) {
      const t = e.changedTouches[0];
      const rect = canvas.getBoundingClientRect();
      const dx = t.clientX - rect.left - downAt.x;
      const dy = t.clientY - rect.top - downAt.y;
      if (dx * dx + dy * dy < 100) showPanel(dragged);
    }
    dragged = null;
    downAt = null;
  });

  document.getElementById("panel-close").addEventListener("click", () => panel.classList.remove("active"));
  document.getElementById("panel-link").addEventListener("click", () => panel.classList.remove("active"));

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(init, 200);
  });

  init();
  loop();

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      cancelAnimationFrame(animId);
    } else {
      loop();
    }
  });
})();
