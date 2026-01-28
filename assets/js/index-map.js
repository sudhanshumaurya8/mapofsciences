console.log("index-map.js loaded");

window.SEARCH_INDEX = [];

fetch("data/tree-textile.json")
  .then(res => res.json())
  .then(tree => {
    buildSearchIndex(tree);
    console.log("Search index size:", SEARCH_INDEX.length);
  })
  .catch(err => console.error(err));

function buildSearchIndex(node, path = []) {
  const currentPath = [...path, node.title];

  SEARCH_INDEX.push({
    id: node.id,
    title: node.title,
    path: currentPath.join(" → ")
  });

  (node.children || []).forEach(child =>
    buildSearchIndex(child, currentPath)
  );
}

const searchBox = document.getElementById("global-search");
const searchResults = document.getElementById("search-results");

if (searchBox && searchResults) {
  searchBox.addEventListener("input", () => {
    const q = searchBox.value.toLowerCase().trim();
    searchResults.innerHTML = "";

    if (q.length < 2) return;

    SEARCH_INDEX
      .filter(item => item.title.toLowerCase().includes(q))
      .slice(0, 12)
      .forEach(item => {
        const div = document.createElement("div");
        div.className = "search-item";
        div.innerHTML = `
          <strong>${item.title}</strong><br>
          <small>${item.path}</small>
        `;
        div.onclick = () => {
          window.location.href = `topic.html?id=${item.id}`;
        };
        searchResults.appendChild(div);
      });
  });
}
