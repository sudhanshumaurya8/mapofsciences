console.log("topic-map.js loaded");

const svg = document.getElementById("mindmap");
const NS = "http://www.w3.org/2000/svg";

// SVG group for zoom/pan
const g = document.createElementNS(NS, "g");
svg.appendChild(g);

// Read topic id from URL
const params = new URLSearchParams(window.location.search);
const topicId = params.get("id");

console.log("URL id:", topicId);

// Load Textile Tree
fetch("data/tree-textile.json")
  .then(res => res.json())
  .then(tree => {
    console.log("Tree loaded");

    const path = findNodePath(tree, topicId || tree.id);
    console.log("Found path:", path);

    if (!path) {
      alert("Topic not found: " + topicId);
      return;
    }

    const node = path[path.length - 1];
    const parentNode = path.length > 1 ? path[path.length - 2] : null;

    clearSVG();
    renderBreadcrumb(path);
    renderContext(node);
    renderTopic(node, parentNode);
  })
  .catch(err => {
    console.error("Failed to load tree-textile.json", err);
  });

/* =============================
   CONTEXT PANEL
============================= */

function renderContext(node) {
  const container = document.getElementById("context");

  if (!node.context) {
    container.innerHTML = `<h2>${node.title}</h2><p>No context available yet.</p>`;
    return;
  }

  let html = `<h2>${node.title}</h2>`;

  if (node.context.definition) {
    html += `<p><strong>Definition:</strong> ${node.context.definition}</p>`;
  }

  if (node.context.role) {
    html += `<p><strong>Role:</strong> ${node.context.role}</p>`;
  }

  if (node.context.references?.length) {
    html += `<h3>References</h3><ul>`;
    node.context.references.forEach(ref => {
      html += `<li><a href="${ref.url}" target="_blank">${ref.title}</a></li>`;
    });
    html += `</ul>`;
  }

  container.innerHTML = html;
}

/* =============================
   TOPIC RENDERING
============================= */

function renderTopic(node, parentNode) {
  const width = svg.clientWidth;
  const height = svg.clientHeight;

  const centerX = width * 0.3;
  const centerY = height / 2;

  // CENTER NODE
  drawNode(centerX, centerY, node, true, parentNode);

  if (!node.children) return;

  const GAP = 90;
  const startY = centerY - ((node.children.length - 1) * GAP) / 2;
  const rightX = width * 0.7;

  node.children.forEach((child, i) => {
    const y = startY + i * GAP;
    drawLink(centerX, centerY, rightX, y);
    drawNode(rightX, y, child, false, node);
  });

  enableZoomPan(svg, g);
}

/* =============================
   NODE DRAWING
============================= */

function drawNode(x, y, node, isCenter, parentNode) {
  const paddingX = 20;
  const paddingY = 12;

  const group = document.createElementNS(NS, "g");
  group.setAttribute("transform", `translate(${x}, ${y})`);
  g.appendChild(group);

  const text = document.createElementNS(NS, "text");
  text.setAttribute("text-anchor", "middle");
  text.setAttribute("dominant-baseline", "middle");
  text.setAttribute("font-size", "14");
  text.setAttribute("font-family", "Arial");
  text.textContent = node.title;

  group.appendChild(text);

  const bbox = text.getBBox();
  const w = bbox.width + paddingX * 2;
  const h = bbox.height + paddingY * 2;

  const rect = document.createElementNS(NS, "rect");
  rect.setAttribute("x", -w / 2);
  rect.setAttribute("y", -h / 2);
  rect.setAttribute("width", w);
  rect.setAttribute("height", h);
  rect.setAttribute("rx", 10);
  rect.setAttribute("ry", 10);
  rect.setAttribute("fill", "#f8fafc");
  rect.setAttribute("stroke", "#64748b");
  rect.setAttribute("stroke-width", "2");

  group.insertBefore(rect, text);

  group.style.cursor = "pointer";

  group.addEventListener("click", () => {
    // GO UP
    if (isCenter && parentNode) {
      window.location.href =
        parentNode.id === "textile-engineering"
          ? "index.html"
          : `topic.html?id=${parentNode.id}`;
      return;
    }

    // GO DOWN
    if (!isCenter && node.children?.length) {
      window.location.href = `topic.html?id=${node.id}`;
    }
  });
}

/* =============================
   LINKS
============================= */

function drawLink(x1, y1, x2, y2) {
  const path = document.createElementNS(NS, "path");
  path.setAttribute(
    "d",
    `M ${x1} ${y1}
     C ${x1 + 80} ${y1},
       ${x2 - 80} ${y2},
       ${x2} ${y2}`
  );
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "#9ca3af");
  path.setAttribute("stroke-width", "2");
  path.setAttribute("stroke-linecap", "round");
  g.appendChild(path);
}

/* =============================
   BREADCRUMB
============================= */

function renderBreadcrumb(path) {
  const bc = document.getElementById("breadcrumb");
  bc.innerHTML = "";

  path.forEach((node, i) => {
    const span = document.createElement("span");
    span.textContent = node.title;

    if (i < path.length - 1) {
      span.style.cursor = "pointer";
      span.style.color = "#2563eb";
      span.onclick = () => {
        window.location.href =
          i === 0 ? "index.html" : `topic.html?id=${node.id}`;
      };
    } else {
      span.style.fontWeight = "bold";
    }

    bc.appendChild(span);
    if (i < path.length - 1) bc.append(" → ");
  });
}

/* =============================
   TREE TRAVERSAL
============================= */

function findNodePath(node, targetId, path = []) {
  const newPath = [...path, node];
  if (node.id === targetId) return newPath;
  if (!node.children) return null;

  for (const child of node.children) {
    const result = findNodePath(child, targetId, newPath);
    if (result) return result;
  }
  return null;
}

/* =============================
   SVG HELPERS
============================= */

function clearSVG() {
  while (g.firstChild) g.removeChild(g.firstChild);
}

/* =============================
   ZOOM & PAN
============================= */

function enableZoomPan(svg, group) {
  let scale = 1, tx = 0, ty = 0;
  let dragging = false, sx = 0, sy = 0;

  function update() {
    group.setAttribute("transform", `translate(${tx},${ty}) scale(${scale})`);
  }

  svg.addEventListener("wheel", e => {
    e.preventDefault();
    scale += e.deltaY > 0 ? -0.1 : 0.1;
    scale = Math.min(Math.max(scale, 0.4), 3);
    update();
  });

  svg.addEventListener("mousedown", e => {
    dragging = true;
    sx = e.clientX - tx;
    sy = e.clientY - ty;
  });

  svg.addEventListener("mousemove", e => {
    if (!dragging) return;
    tx = e.clientX - sx;
    ty = e.clientY - sy;
    update();
  });

  svg.addEventListener("mouseup", () => dragging = false);
  svg.addEventListener("mouseleave", () => dragging = false);
}
