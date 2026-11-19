"use strict";

const areaNames = { namba: "난바", umeda: "우메다" };
const genreNames = {
  sushi: "스시",
  ramen: "라멘",
  udon: "우동",
  kaiseki: "가이세키·갓포",
  okonomiyaki: "오코노미야키",
  kushiage: "쿠시카츠",
  tempura: "덴푸라",
  yakitori: "야키토리",
};
const mealNames = { lunch: "점심", dinner: "저녁" };
const priceOptions = { all: "전체", under: "1만 엔 이하", over: "1만 엔 이상" };
const michelinNames = {
  star1: "미쉐린 1스타",
  star2: "미쉐린 2스타",
  star3: "미쉐린 3스타",
  bib: "미쉐린 빕 구르망",
  selected: "미쉐린 셀렉티드",
};
const budgetThreshold = 10000;
const yen = new Intl.NumberFormat("ja-JP");
const byId = (id) => document.getElementById(id);
const filters = byId("filters");
const cards = byId("cards");
const dialog = byId("details");

function element(tag, className, content) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (content !== undefined) node.textContent = content;
  return node;
}

function externalLink(label, url, className) {
  const link = element("a", className, label);
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener";
  return link;
}

function renderOptions(container, name, values) {
  for (const [value, label] of Object.entries(values)) {
    const option = element("label", "option");
    const input = element("input");
    input.type = "radio";
    input.name = name;
    input.value = value;
    input.defaultChecked = value === "all";
    option.append(input, element("span", "", label));
    container.append(option);
  }
}

function formatBudget(range) {
  const [min, max] = range;
  if (min === 0) return `¥${yen.format(max)} 이하`;
  if (min === max) return `¥${yen.format(min)}`;
  return `¥${yen.format(min)}–${yen.format(max)}`;
}

function selectedMeal(restaurant, meal) {
  if (meal !== "default") return meal;
  return restaurant.dinner ? "dinner" : "lunch";
}

function matchesPrice(range, price) {
  if (price === "under") return range[0] <= budgetThreshold;
  if (price === "over") return range[1] >= budgetThreshold;
  return true;
}

function matchesRecognition(restaurant, recognition) {
  switch (recognition) {
    case "award": return Boolean(restaurant.award);
    case "top100": return Boolean(restaurant.top100);
    case "michelin": return Boolean(restaurant.michelin);
    case "star": return Boolean(restaurant.michelin?.distinction.startsWith("star"));
    case "bib":
    case "selected": return restaurant.michelin?.distinction === recognition;
    default: return true;
  }
}

function normalize(text) {
  return text.toLowerCase().normalize("NFKC").replace(/[^\p{L}\p{N}]/gu, "");
}

const searchIndex = new Map(restaurants.map((restaurant) => [
  restaurant,
  normalize([
    restaurant.name, restaurant.english, restaurant.japanese, restaurant.district,
    restaurant.access, restaurant.note, restaurant.description,
    areaNames[restaurant.area], genreNames[restaurant.genre],
  ].join(" ")),
]));

function recognitionBadges(restaurant, full = false) {
  const badges = element("div", "badges");
  if (restaurant.award) {
    const title = full ? `추천 · 타베로그 어워드 ${restaurant.award.year} ${restaurant.award.level}` : `추천 · ${restaurant.award.level}`;
    badges.append(element("span", "badge badge-award", title));
  }
  if (restaurant.top100) {
    badges.append(element("span", "badge badge-top100", `백명점 ${restaurant.top100}`));
  }
  if (restaurant.michelin) {
    const title = michelinNames[restaurant.michelin.distinction];
    const label = full ? `${title} ${restaurant.michelin.year}` : title;
    badges.append(element("span", "badge badge-michelin", label));
  }
  return badges;
}

function cardFor(restaurant, meal) {
  const card = element("article", "card");
  const top = element("div", "card-top");
  const title = element("div");
  title.append(
    element("p", "card-zone", `${restaurant.district} · ${genreNames[restaurant.genre]}`),
    element("h3", "", restaurant.name),
  );
  const rating = element("div", "rating");
  rating.setAttribute("aria-label", `타베로그 평점 ${restaurant.rating.toFixed(2)}`);
  rating.append(element("strong", "", restaurant.rating.toFixed(2)), element("small", "", "타베로그"));
  top.append(title, rating);

  const bottom = element("div", "card-bottom");
  const price = element("p", "card-budget");
  price.append(element("span", "", mealNames[meal]), document.createTextNode(formatBudget(restaurant[meal])));
  const button = element("button", "detail-button", "상세 보기");
  button.type = "button";
  button.setAttribute("aria-label", `${restaurant.name} 상세 보기`);
  button.setAttribute("aria-haspopup", "dialog");
  button.addEventListener("click", () => openDetails(restaurant));
  bottom.append(price, button);
  card.append(top, element("p", "card-note", restaurant.note), recognitionBadges(restaurant), bottom);
  return card;
}

function openDetails(restaurant) {
  const content = byId("detail-content");
  const title = element("h2", "", restaurant.name);
  title.id = "detail-title";
  const names = element("p", "detail-names");
  const english = element("span", "", restaurant.english);
  english.lang = "en";
  const japanese = element("span", "", restaurant.japanese);
  japanese.lang = "ja";
  names.append(english, document.createTextNode(" · "), japanese);

  const facts = element("dl", "detail-facts");
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.japanese + " " + restaurant.address)}`;
  const addressLink = externalLink(restaurant.address, mapsUrl);
  addressLink.lang = "ja";
  const rows = [
    ["타베로그", `${restaurant.rating.toFixed(2)} / 5 · ${restaurant.tabelogGenre}`],
    ["점심 / 1인", restaurant.lunch ? formatBudget(restaurant.lunch) : "타베로그 점심 예산 미표기"],
    ["저녁 / 1인", restaurant.dinner ? formatBudget(restaurant.dinner) : "타베로그 저녁 예산 미표기"],
    ["가까운 역", restaurant.access],
    ["예약", restaurant.booking],
    ["주소", addressLink],
  ];
  for (const [label, value] of rows) {
    const description = element("dd");
    description.append(value);
    facts.append(element("dt", "", label), description);
  }

  const links = element("div", "detail-links");
  links.append(externalLink("Google 지도", mapsUrl, "map"), externalLink("타베로그", restaurant.tabelog));
  if (restaurant.michelin) links.append(externalLink("미쉐린 가이드", restaurant.michelin.url));

  content.replaceChildren(
    element("p", "detail-kicker", `${areaNames[restaurant.area]} · ${restaurant.district} · ${genreNames[restaurant.genre]}`),
    title,
    names,
    recognitionBadges(restaurant, true),
    element("p", "detail-description", restaurant.description),
    facts,
    links,
  );
  dialog.showModal();
  dialog.scrollTop = 0;
}

function render() {
  const values = new FormData(filters);
  const queryTerms = values.get("search").trim().split(/\s+/).map(normalize).filter(Boolean);
  const area = values.get("area");
  const genre = values.get("genre");
  const price = values.get("price");
  const recognition = values.get("recognition");
  const mealFilter = values.get("meal");
  const sort = values.get("sort");
  const matches = [];

  for (const restaurant of restaurants) {
    const meal = selectedMeal(restaurant, mealFilter);
    const range = restaurant[meal];
    if (!range || !matchesPrice(range, price) || !matchesRecognition(restaurant, recognition)) continue;
    if (area !== "all" && restaurant.area !== area) continue;
    if (genre !== "all" && restaurant.genre !== genre) continue;
    if (!queryTerms.every((term) => searchIndex.get(restaurant).includes(term))) continue;
    matches.push({ restaurant, meal, range });
  }

  matches.sort((a, b) => {
    if (sort === "price-low" && a.range[0] !== b.range[0]) return a.range[0] - b.range[0];
    if (sort === "price-high" && a.range[1] !== b.range[1]) return b.range[1] - a.range[1];
    return b.restaurant.rating - a.restaurant.rating || a.restaurant.name.localeCompare(b.restaurant.name, "ko");
  });

  cards.replaceChildren(...matches.map(({ restaurant, meal }) => cardFor(restaurant, meal)));
  byId("result-count").textContent = `${matches.length}곳`;
  byId("empty").hidden = matches.length > 0;
}

byId("total-count").textContent = restaurants.length;
byId("category-count").textContent = new Set(restaurants.map(({ genre }) => genre)).size;
renderOptions(byId("area-options"), "area", { all: "전체", ...areaNames });
renderOptions(byId("genre-options"), "genre", { all: "전체", ...genreNames });
renderOptions(byId("price-options"), "price", priceOptions);

filters.addEventListener("submit", (event) => event.preventDefault());
filters.addEventListener("change", render);
filters.addEventListener("reset", () => requestAnimationFrame(render));
byId("search").addEventListener("input", render);
byId("sort").addEventListener("change", render);
byId("close-detail").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});
render();
