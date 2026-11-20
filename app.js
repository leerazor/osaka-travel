"use strict";

const areaNames = { namba: "난바", umeda: "우메다" };
const genreNames = Object.fromEntries(genres.map(({ key, name }) => [key, name]));
const stationNames = {
  Namba: "난바역", "Osaka Namba": "오사카난바역", "JR Namba": "JR 난바역",
  Nippombashi: "닛폰바시역", "Kintetsu Nippombashi": "긴테쓰 닛폰바시역",
  Shinsaibashi: "신사이바시역", Nagahoribashi: "나가호리바시역", Yotsubashi: "요츠바시역",
  Nishinagahori: "니시나가호리역", Nishiohashi: "니시오하시역", Matsuyamachi: "마쓰야마치역",
  Hommachi: "혼마치역", "Sakaisuji Hommachi": "사카이스지혼마치역",
  "Tanimachi 9 Chome": "다니마치9초메역", Ebisucho: "에비스초역", Sakuragawa: "사쿠라가와역",
  Osaka: "오사카역", Umeda: "우메다역", "Osaka Umeda": "오사카우메다역",
  "Higashi Umeda": "히가시우메다역", "Nishi Umeda": "니시우메다역",
  Kitashinchi: "기타신치역", Nakatsu: "나카쓰역", Nakazakicho: "나카자키초역",
  Naniwabashi: "나니와바시역", Oebashi: "오에바시역", Watanabebashi: "와타나베바시역",
  Nakanoshima: "나카노시마역", Ogimachi: "오기마치역", Temma: "덴마역",
  Fukushima: "후쿠시마역", "Tenjimbashisuji Rokuchome": "덴진바시스지로쿠초메역",
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
const genreLimit = 20;
const pageSize = 24;
const yen = new Intl.NumberFormat("ja-JP");
const byId = (id) => document.getElementById(id);
const filters = byId("filters");
const cards = byId("cards");
const dialog = byId("details");
const genrePicker = byId("genre-picker");
const genreSearch = byId("genre-search");
const locationFilter = byId("location");
let selectedGenre = "all";
let visibleLimit = pageSize;

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
  if (!range) return "예산 미표기";
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
  if (price === "all") return true;
  if (!range) return false;
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

function stationName(restaurant) {
  return stationNames[restaurant.mapStation] || restaurant.mapStation;
}

function hasSeparateDistrict(restaurant) {
  return restaurant.district !== stationName(restaurant) &&
    restaurant.district !== stationName(restaurant).replace(/역$/, "");
}

const searchIndex = new Map(restaurants.map((restaurant) => [
  restaurant,
  normalize([
    restaurant.name, restaurant.english, restaurant.japanese, restaurant.district,
    restaurant.access, restaurant.mapStation, stationName(restaurant), restaurant.note, restaurant.description,
    areaNames[restaurant.area], ...restaurant.genres.map((genre) => genreNames[genre]),
  ].join(" ")),
]));

function renderLocationOptions() {
  const stations = new Map();
  const districts = new Set();
  for (const restaurant of restaurants) {
    if (restaurant.mapStation) stations.set(restaurant.mapStation, stationName(restaurant));
    if (hasSeparateDistrict(restaurant)) districts.add(restaurant.district);
  }
  for (const [label, prefix, entries] of [
    ["가까운 역", "station:", [...stations]],
    ["동네", "district:", [...districts].map((district) => [district, district])],
  ]) {
    const group = element("optgroup");
    group.label = label;
    entries.sort((a, b) => a[1].localeCompare(b[1], "ko"));
    for (const [key, name] of entries) {
      const option = element("option", "", name);
      option.value = prefix + key;
      group.append(option);
    }
    locationFilter.append(group);
  }
}

function renderGenreOptions() {
  const value = normalize(genreSearch.value);
  const matches = genres.filter(({ key, name }) =>
    [key, name].some((label) => normalize(label).includes(value)));
  const options = byId("genre-results");
  options.replaceChildren();
  if (!value) options.append(genreOption("all", "전체 장르"));
  const groups = new Map();
  for (const { key, name, group } of matches) {
    if (!groups.has(group)) {
      const section = element("section", "genre-group");
      const heading = element("h3", "", group);
      heading.id = `genre-group-${groups.size}`;
      section.setAttribute("aria-labelledby", heading.id);
      section.append(heading);
      options.append(section);
      groups.set(group, section);
    }
    groups.get(group).append(genreOption(key, name));
  }
  byId("genre-empty").hidden = matches.length > 0;
  options.scrollTop = 0;
}

function genreOption(key, name) {
  const button = element("button", "genre-option", name);
  button.type = "button";
  button.setAttribute("aria-pressed", String(key === selectedGenre));
  button.addEventListener("click", () => {
    selectedGenre = key;
    genrePicker.close();
    renderFromStart();
  });
  return button;
}

function cardFilter(label, active, apply) {
  const button = element("button", "card-filter", label);
  button.type = "button";
  button.setAttribute("aria-pressed", String(active));
  button.addEventListener("click", () => {
    apply();
    renderFromStart();
    byId("results-title").focus();
    byId("results").scrollIntoView({ block: "start" });
  });
  return button;
}

function locationTag(label, value) {
  const active = locationFilter.value === value;
  return cardFilter(label, active, () => { locationFilter.value = active ? "all" : value; });
}

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

function cardFor(restaurant, meal, genre) {
  const card = element("article", "card");
  const top = element("div", "card-top");
  const title = element("div");
  const tags = element("div", "card-zone");
  if (hasSeparateDistrict(restaurant)) {
    tags.append(locationTag(restaurant.district, "district:" + restaurant.district));
  }
  if (restaurant.mapStation) {
    tags.append(locationTag(stationName(restaurant), "station:" + restaurant.mapStation));
  }
  const cardGenre = genre === "all" ? restaurant.genres[0] : genre;
  const genreActive = selectedGenre === cardGenre;
  tags.append(cardFilter(genreNames[cardGenre], genreActive, () => {
    selectedGenre = genreActive ? "all" : cardGenre;
  }));
  title.append(tags, element("h3", "", restaurant.name));
  const rating = element("div", "rating");
  rating.setAttribute("aria-label", `타베로그 평점 ${restaurant.rating.toFixed(2)}`);
  rating.append(element("strong", "", restaurant.rating.toFixed(2)), element("small", "", "타베로그"));
  top.append(title, rating);

  const bottom = element("div", "card-bottom");
  const price = element("p", "card-budget");
  if (restaurant[meal]) price.append(element("span", "", mealNames[meal]));
  price.append(formatBudget(restaurant[meal]));
  const button = element("button", "detail-button", "상세 보기");
  button.type = "button";
  button.setAttribute("aria-label", `${restaurant.name} 상세 보기`);
  button.setAttribute("aria-haspopup", "dialog");
  button.addEventListener("click", () => openDetails(restaurant));
  bottom.append(price, button);
  card.append(top);
  if (restaurant.note) card.append(element("p", "card-note", restaurant.note));
  card.append(recognitionBadges(restaurant), bottom);
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
  names.append(english);
  if (restaurant.japanese) names.append(" · ", japanese);

  const facts = element("dl", "detail-facts");
  const mapLocation = restaurant.address || restaurant.mapStation + " Osaka";
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((restaurant.japanese || restaurant.english) + " " + mapLocation)}`;
  const addressLink = externalLink(restaurant.address || "상호와 가까운 역으로 지도 열기", mapsUrl);
  if (restaurant.address) addressLink.lang = "ja";
  const rows = [
    ["타베로그", `${restaurant.rating.toFixed(2)} / 5 · ${restaurant.tabelogGenre}`],
    ["점심 / 1인", restaurant.lunch ? formatBudget(restaurant.lunch) : "타베로그 점심 예산 미표기"],
    ["저녁 / 1인", restaurant.dinner ? formatBudget(restaurant.dinner) : "타베로그 저녁 예산 미표기"],
    ["가까운 역", restaurant.access],
    ["예약", restaurant.booking || "타베로그에서 확인"],
    [restaurant.address ? "주소" : "위치", addressLink],
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
    element("p", "detail-kicker", `${areaNames[restaurant.area]} · ${restaurant.district} · ${genreNames[restaurant.genres[0]]}`),
    title,
    names,
    recognitionBadges(restaurant, true),
    ...(restaurant.description ? [element("p", "detail-description", restaurant.description)] : []),
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
  const genre = selectedGenre;
  const location = values.get("location");
  const price = values.get("price");
  const recognition = values.get("recognition");
  const mealFilter = values.get("meal");
  const sort = values.get("sort");
  const matches = [];

  for (const restaurant of restaurants) {
    const meal = selectedMeal(restaurant, mealFilter);
    const range = restaurant[meal];
    if ((mealFilter !== "default" && !range) || !matchesPrice(range, price) || !matchesRecognition(restaurant, recognition)) continue;
    if (area !== "all" && restaurant.area !== area) continue;
    if (location !== "all" && location !== "station:" + restaurant.mapStation &&
        location !== "district:" + restaurant.district) continue;
    if (genre !== "all" && !restaurant.genres.includes(genre)) continue;
    if (!queryTerms.every((term) => searchIndex.get(restaurant).includes(term))) continue;
    matches.push({ restaurant, meal, range });
  }

  const byRating = (a, b) => b.restaurant.rating - a.restaurant.rating || a.restaurant.name.localeCompare(b.restaurant.name, "ko");
  matches.sort(byRating);
  const ranked = genre === "all" ? matches : matches.slice(0, genreLimit);
  if (sort === "price-low") ranked.sort((a, b) => (a.range?.[0] ?? Infinity) - (b.range?.[0] ?? Infinity) || byRating(a, b));
  if (sort === "price-high") ranked.sort((a, b) => (b.range?.[1] ?? -1) - (a.range?.[1] ?? -1) || byRating(a, b));
  const shown = ranked.slice(0, visibleLimit);
  cards.replaceChildren(...shown.map(({ restaurant, meal }) => cardFor(restaurant, meal, genre)));
  const headings = [];
  if (location !== "all") headings.push(locationFilter.selectedOptions[0].textContent);
  if (genre !== "all") headings.push(genreNames[genre]);
  byId("list-title").textContent = headings.join(" · ") || "맛집 목록";
  byId("open-genre").textContent = genreNames[genre] || "전체 장르";
  byId("open-genre").setAttribute("aria-label", "장르 선택 · " + (genreNames[genre] || "전체 장르"));
  byId("result-count").textContent = `${ranked.length}곳`;
  byId("empty").hidden = ranked.length > 0;
  const more = byId("load-more");
  more.hidden = shown.length >= ranked.length;
  more.textContent = `더 보기 (${shown.length} / ${ranked.length})`;
}

function renderFromStart() {
  visibleLimit = pageSize;
  render();
}

byId("total-count").textContent = restaurants.length;
byId("category-count").textContent = genres.length;
renderOptions(byId("area-options"), "area", { all: "전체", ...areaNames });
renderLocationOptions();
renderOptions(byId("price-options"), "price", priceOptions);

filters.addEventListener("submit", (event) => event.preventDefault());
filters.addEventListener("change", renderFromStart);
filters.addEventListener("reset", () => {
  selectedGenre = "all";
  setTimeout(renderFromStart, 0);
});
byId("open-genre").addEventListener("click", () => {
  genreSearch.value = "";
  renderGenreOptions();
  genrePicker.showModal();
});
genreSearch.addEventListener("input", renderGenreOptions);
genreSearch.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" || event.isComposing) return;
  const matches = byId("genre-results").querySelectorAll("button");
  if (matches.length === 1) matches[0].click();
});
byId("close-genre").addEventListener("click", () => genrePicker.close());
genrePicker.addEventListener("click", (event) => {
  if (event.target === genrePicker) genrePicker.close();
});
byId("search").addEventListener("input", renderFromStart);
byId("sort").addEventListener("change", renderFromStart);
byId("load-more").addEventListener("click", () => {
  visibleLimit += pageSize;
  render();
});
byId("close-detail").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});
render();
