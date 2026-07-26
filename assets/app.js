const provinces = DATA.provinces,
  cityOverrides = DATA.cityOverrides,
  trends = DATA.trends,
  taxonomy = DATA.taxonomy,
  provinceFocus = DATA.focus,
  sources = DATA.sources,
  cityStats = DATA.cityStats || {},
  cityIndustryEvidence = DATA.cityIndustryEvidence || {},
  cityProfiles = globalThis.CITY_PROFILES || {},
  cityProfileMeta = globalThis.CITY_PROFILE_META || {},
  manualEnterprises = DATA.enterprises || [],
  listedEnterprises = globalThis.A_SHARE_ENTERPRISES || [],
  neeqEnterprises = globalThis.NEEQ_ENTERPRISES || [],
  twseEnterprises = globalThis.TWSE_ENTERPRISES || [],
  curatedEnterprises = globalThis.CURATED_CITY_ENTERPRISES || [],
  generatedEnterpriseMeta = {
    aShare: globalThis.A_SHARE_META || {},
    neeq: globalThis.NEEQ_META || {},
    twse: globalThis.TWSE_META || {},
    curated: globalThis.CURATED_CITY_META || {},
  },
  enterpriseMeta = {
    ...(DATA.enterpriseMeta || {}),
    listedSnapshot: generatedEnterpriseMeta,
  };
const enterpriseKeys = new Set();
const enterprises = [
  ...manualEnterprises,
  ...listedEnterprises,
  ...neeqEnterprises,
  ...twseEnterprises,
  ...curatedEnterprises,
].filter((enterprise) => {
    const key = enterprise.ticker
      ? `${enterprise.city}::${enterprise.ticker}`
      : `${enterprise.city}::${enterprise.name}`;
    if (enterpriseKeys.has(key)) return false;
    enterpriseKeys.add(key);
    return true;
});
const byName = Object.fromEntries(provinces.map((p) => [p.name, p]));
const byMapName = Object.fromEntries(provinces.map((p) => [p.mapName, p]));
const metrics = [
  ["investment", "综合投资观察"],
  ["innovation", "科技创新"],
  ["manufacturing", "先进制造"],
  ["digital", "数字经济"],
  ["green", "绿色转型"],
  ["openness", "开放枢纽"],
];
const metricLabel = Object.fromEntries(metrics);
let activeMetric = "investment",
  activeIndustry = "all",
  selected = byName["广东"] || provinces[0],
  activeTab = "overview",
  mapLevel = "china",
  provinceNavActive = false,
  mapChart,
  compareChart,
  gdpChart,
  sectorChart,
  futureChart,
  signalChart,
  currentGeoNames = [],
  showLabels = true,
  selectedFeatureName = null;
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (m) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        m
      ],
  );
const allText = (x) =>
  [
    ...(x.base || []),
    ...(x.emerging || []),
    ...(x.future || []),
    x.role || "",
    x.outlook || "",
    x.policy || "",
  ].join(" ");
const totalCities = provinces.reduce((n, p) => n + p.cities.length, 0);
document.getElementById("cityCount").textContent = totalCities;
const enterpriseCities = new Set(
  enterprises.map((x) => x.city).filter(Boolean),
);
document.getElementById("provinceCount").textContent = provinces.length;
document.getElementById("enterpriseCountStat").textContent = enterprises.length;
document.getElementById("enterpriseCityCoverage").textContent =
  `${enterpriseCities.size} 个城市全覆盖`;

const mobileMedia = window.matchMedia("(max-width: 900px)");
document.body.dataset.mobileView = "map";

function setMobileView(view, shouldScroll = false) {
  const nextView = view === "detail" ? "detail" : "map";
  document.body.dataset.mobileView = nextView;
  document
    .querySelectorAll(".mobileWorkspaceTabs [data-mobile-view]")
    .forEach((button) => {
      const isActive = button.dataset.mobileView === nextView;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
  if (nextView === "map" && mapChart) {
    window.setTimeout(() => mapChart.resize(), 40);
  }
  if (shouldScroll && mobileMedia.matches) {
    document
      .querySelector(".mobileWorkspaceTabs")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function openFeaturedCity(city) {
  const province = provinces.find((p) => p.cities.includes(city));
  if (!province) return;
  drillProvince(province, city);
  if (mobileMedia.matches) setMobileView("detail", true);
  else
    document
      .getElementById("atlas")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function sectorById(id) {
  return taxonomy.find((x) => x.id === id);
}
function keywordHits(text, sector) {
  return sector.keywords.reduce((n, k) => n + (text.includes(k) ? 1 : 0), 0);
}
function provinceSectorScore(p, sector) {
  const order = (provinceFocus[p.name] || []).indexOf(sector.id);
  let s = order >= 0 ? 92 - order * 6 : 38;
  const base = (p.base || []).join(" "),
    em = (p.emerging || []).join(" "),
    fu = (p.future || []).join(" ");
  s +=
    Math.min(12, keywordHits(base, sector) * 5) +
    Math.min(8, keywordHits(em, sector) * 3) +
    Math.min(5, keywordHits(fu, sector) * 2);
  return Math.max(25, Math.min(100, s));
}
function cityData(city, p) {
  const profile = cityProfiles[city];
  if (profile)
    return {
      name: city,
      level: profile.level,
      grade: profile.grade,
      base: profile.mature.join("、"),
      emerging: [...profile.emerging, ...profile.future].join("、"),
      angle: profile.thesis,
      text: [
        profile.position,
        ...profile.mature,
        ...profile.emerging,
        ...profile.future,
        ...profile.leaders,
      ].join(" "),
      profile,
    };
  const raw =
    cityOverrides[city] || cityOverrides[city.replace(/市$/, "")] || null;
  if (raw)
    return {
      name: city,
      level: "A · 城市独立画像",
      grade: "A",
      base: raw[0],
      emerging: raw[1],
      angle: raw[2],
      text: raw.join(" "),
    };
  const exact =
    p.cities.includes(city) ||
    p.cities.some(
      (x) => city.includes(x.slice(0, 2)) || x.includes(city.slice(0, 2)),
    );
  return {
    name: city,
    level: exact ? "B · 省域基线+城市类型" : "C · 行政边界派生画像",
    grade: exact ? "B" : "C",
    base: (p.base || []).join("、"),
    emerging: [...(p.emerging || []), ...(p.future || [])]
      .slice(0, 7)
      .join("、"),
    angle: p.outlook,
    text: allText(p) + " " + city,
  };
}
function citySectorScores(city, p) {
  const c = cityData(city, p);
  return taxonomy
    .map((s, i) => {
      let score = provinceSectorScore(p, s) - 8;
      score += Math.min(18, keywordHits(c.text, s) * 7);
      const profileRank = c.profile?.industryEvidence.findIndex(
        (item) => item.id === s.id,
      );
      if (profileRank >= 0) {
        const proof = c.profile.industryEvidence[profileRank];
        score += Math.max(3, 18 - profileRank * 3);
        score += Math.min(8, proof.localEnterpriseCount * 2);
      }
      if ((provinceFocus[p.name] || []).slice(0, 3).includes(s.id)) score += 3;
      return { ...s, score: Math.max(22, Math.min(100, score)) };
    })
    .sort((a, b) => b.score - a.score);
}
function maturityFor(p, s) {
  const b = keywordHits((p.base || []).join(" "), s),
    e = keywordHits((p.emerging || []).join(" "), s),
    f = keywordHits((p.future || []).join(" "), s);
  if (b >= 1) return "成熟集群 · 适合升级/并购/国产替代";
  if (e >= 1) return "扩张赛道 · 适合产能与链条补位";
  if (f >= 1) return "孵化赛道 · 适合早期技术与示范场景";
  return "关联赛道 · 需项目级验证";
}
function nodeOn(p, s, idx) {
  const txt = allText(p);
  if (idx === 0)
    return p.innovation >= 82 || /科研|设计|软件|AI|量子|实验室/.test(txt);
  if (idx === 1) return /材料|零部件|元器件|稀土|化工|电池|装备/.test(txt);
  if (idx === 2) return p.manufacturing >= 75;
  if (idx === 3)
    return p.manufacturing >= 85 || /整车|整机|制造|集成/.test(txt);
  if (idx === 4) return p.digital >= 78 || p.green >= 88;
  if (idx === 5)
    return p.openness >= 78 || /服务|平台|物流|贸易|金融|文旅/.test(txt);
  return false;
}
function metricValue(p) {
  if (activeIndustry === "all") return p[activeMetric];
  const s = sectorById(activeIndustry);
  return Math.round(provinceSectorScore(p, s) * 0.72 + p[activeMetric] * 0.28);
}
function cityMetricValue(city, p) {
  if (activeIndustry === "all")
    return Math.max(
      25,
      Math.min(100, p[activeMetric] + (cityOverrides[city] ? 5 : -4)),
    );
  const top = citySectorScores(city, p).find((x) => x.id === activeIndustry);
  return top ? top.score : 45;
}
function formatName(n) {
  return n.replace(
    /省|市|特别行政区|壮族自治区|回族自治区|维吾尔自治区|自治区$/g,
    "",
  );
}
function matchCityName(featureName, p) {
  const f = formatName(featureName);
  return (
    p.cities.find((c) => {
      const x = formatName(c).replace(/自治州|地区|盟|新区|州$/g, "");
      return f.includes(x.slice(0, 2)) || x.includes(f.slice(0, 2));
    }) || featureName
  );
}
function renderControls() {
  document.getElementById("metricList").innerHTML = metrics
    .map(
      ([id, l]) =>
        `<button class="filterBtn ${activeMetric === id ? "active" : ""}" data-metric="${id}"><span>${l}</span><i></i></button>`,
    )
    .join("");
  document.querySelectorAll("[data-metric]").forEach(
    (b) =>
      (b.onclick = () => {
        activeMetric = b.dataset.metric;
        renderControls();
        renderMap();
      }),
  );
  document.getElementById("industryList").innerHTML =
    `<button class="filterBtn ${activeIndustry === "all" ? "active" : ""}" data-ind="all"><span>全部产业</span><i></i></button>` +
    taxonomy
      .map(
        (s) =>
          `<button class="filterBtn ${activeIndustry === s.id ? "active" : ""}" data-ind="${s.id}"><span>${s.label}</span><i></i></button>`,
      )
      .join("");
  document.getElementById("activeIndustryLabel").textContent =
    activeIndustry === "all" ? "全部产业" : sectorById(activeIndustry).label;
  document.querySelectorAll("[data-ind]").forEach(
    (b) =>
      (b.onclick = () => {
        activeIndustry = b.dataset.ind;
        renderControls();
        renderMap();
        renderDetail();
      }),
  );
}
function setLoading(v) {
  document.getElementById("mapLoading").style.display = v ? "grid" : "none";
}
async function fetchGeo(urls) {
  let err;
  for (const u of urls) {
    try {
      const r = await fetch(u);
      if (!r.ok) throw Error(r.status);
      return await r.json();
    } catch (e) {
      err = e;
    }
  }
  throw err || Error("GeoJSON failed");
}
async function initNational() {
  provinceNavActive = false;
  focusedCity = null;
  activeTab = "overview";
  renderDetail();
  setMobileView("map");
  setLoading(true);
  try {
    const geo = await fetchGeo([
      "assets/maps/china.json",
      "https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json",
      "https://cdn.jsdelivr.net/gh/zhChuXiao/ChinaGeoJson@master/china.json",
    ]);
    echarts.registerMap("chinaAtlasV2", geo);
    mapLevel = "china";
    currentGeoNames = [];
    selectedFeatureName = null;
    document.getElementById("backBtn").style.display = "none";
    document.getElementById("breadcrumb").innerHTML =
      "<strong>全国</strong> · 省级边界";
    document.getElementById("boundaryStatus").textContent = "省界已开启";
    document.getElementById("selectionDock").classList.remove("show");
    updateNavigator();
    renderQuickRail();
    renderMap();
  } catch (e) {
    document.getElementById("mapFallback").style.display = "block";
    renderFallback();
  } finally {
    setLoading(false);
  }
}
async function drillProvince(p, cityToFocus = null) {
  provinceNavActive = true;
  selected = p;
  currentGeoNames = [];
  selectedFeatureName = null;
  if (cityToFocus) focusedCity = cityToFocus;
  else focusedCity = null;
  activeTab = "overview";
  renderDetail();
  updateNavigator();
  if (cityToFocus && mobileMedia.matches) setMobileView("detail", true);
  else if (mobileMedia.matches) setMobileView("map");
  setLoading(true);
  try {
    const code = p.adcode;
    const geo = await fetchGeo([
      `assets/maps/provinces/${encodeURIComponent(p.mapName)}.json`,
      `https://geo.datav.aliyun.com/areas_v3/bound/${code}_full.json`,
      `https://cdn.jsdelivr.net/gh/zhChuXiao/ChinaGeoJson@master/province/${encodeURIComponent(p.mapName)}.json`,
    ]);
    const key = "province_" + code;
    echarts.registerMap(key, geo);
    mapLevel = key;
    currentGeoNames = (geo.features || [])
      .map((f) => f.properties?.name)
      .filter(Boolean);
    document.getElementById("backBtn").style.display = "inline-block";
    document.getElementById("breadcrumb").innerHTML =
      `<strong>全国</strong> / ${esc(p.name)} · 市级边界`;
    document.getElementById("boundaryStatus").textContent =
      `${currentGeoNames.length || p.cities.length} 个市/州/区边界`;
    updateNavigator();
    renderQuickRail();
    renderMap();
    if (cityToFocus)
      setTimeout(() => selectCityFocus(cityToFocus, p, true), 120);
  } catch (e) {
    mapLevel = "china";
    updateNavigator();
    renderQuickRail();
    renderMap();
    document.getElementById("breadcrumb").innerHTML =
      `<strong>全国</strong> / ${esc(p.name)} · 边界离线`;
    document.getElementById("boundaryStatus").textContent =
      "市界加载失败 · 导航仍可用";
  } finally {
    setLoading(false);
  }
}
function renderMap() {
  if (!mapChart || !window.echarts) return;
  if (mapLevel === "china") {
    if (!echarts.getMap("chinaAtlasV2")) return;
    mapChart.setOption(
      {
        backgroundColor: "transparent",
        animationDurationUpdate: 420,
        tooltip: tooltipConfig(),
        visualMap: {
          min: 25,
          max: 100,
          show: false,
          inRange: {
            color: [
              "#071832",
              "#153b76",
              "#205ba2",
              "#2c91ba",
              "#4ed7b0",
              "#ffe18c",
            ],
          },
        },
        series: [
          {
            type: "map",
            map: "chinaAtlasV2",
            roam: true,
            zoom: 1.08,
            layoutCenter: ["50%", "53%"],
            layoutSize: "95%",
            data: provinces.map((p) => ({
              name: p.mapName,
              value: metricValue(p),
            })),
            label: {
              show: showLabels,
              color: "rgba(225,248,255,.82)",
              fontSize: 8,
              textBorderColor: "rgba(3,10,20,.75)",
              textBorderWidth: 2,
            },
            itemStyle: {
              areaColor: "#12284a",
              borderColor: "rgba(128,229,255,.95)",
              borderWidth: 1.35,
              shadowBlur: 10,
              shadowColor: "rgba(39,154,255,.15)",
            },
            emphasis: {
              label: {
                show: true,
                color: "#fff",
                fontSize: 11,
                fontWeight: "bold",
                textBorderColor: "#173459",
                textBorderWidth: 3,
              },
              itemStyle: {
                areaColor: "#3776d2",
                borderColor: "#fff",
                borderWidth: 2,
                shadowBlur: 28,
                shadowColor: "rgba(99,232,255,.48)",
              },
            },
            select: {
              itemStyle: {
                areaColor: "#40bdb6",
                borderColor: "#fff",
                borderWidth: 2,
              },
            },
            selectedMode: "single",
          },
        ],
      },
      true,
    );
    mapChart.off("click");
    mapChart.on("click", (e) => {
      const p = byMapName[e.name] || byName[formatName(e.name)];
      if (p) drillProvince(p);
    });
  } else {
    const p = selected;
    if (!echarts.getMap(mapLevel)) return;
    const names = currentGeoNames.length ? currentGeoNames : p.cities;
    const values = names.map((n) => {
      const city = matchCityName(n, p);
      return { name: n, value: cityMetricValue(city, p), city };
    });
    mapChart.setOption(
      {
        backgroundColor: "transparent",
        animationDurationUpdate: 420,
        tooltip: tooltipConfig(),
        visualMap: {
          min: 25,
          max: 100,
          show: false,
          inRange: {
            color: [
              "#081a33",
              "#174379",
              "#1e6ba1",
              "#2aa1b2",
              "#4ed5a9",
              "#ffdd82",
            ],
          },
        },
        series: [
          {
            type: "map",
            map: mapLevel,
            roam: true,
            zoom: 1.0,
            layoutCenter: ["50%", "54%"],
            layoutSize: "92%",
            data: values,
            label: {
              show: showLabels,
              color: "rgba(232,251,255,.94)",
              fontSize: 9,
              textBorderColor: "rgba(3,10,20,.78)",
              textBorderWidth: 2,
            },
            itemStyle: {
              areaColor: "#102746",
              borderColor: "rgba(174,242,255,.96)",
              borderWidth: 1.2,
              shadowBlur: 8,
              shadowColor: "rgba(38,166,255,.14)",
            },
            emphasis: {
              label: {
                show: true,
                color: "#fff",
                fontSize: 11,
                fontWeight: "bold",
                textBorderColor: "#173459",
                textBorderWidth: 3,
              },
              itemStyle: {
                areaColor: "#3d7fd3",
                borderColor: "#fff",
                borderWidth: 2,
                shadowBlur: 24,
                shadowColor: "rgba(99,232,255,.45)",
              },
            },
            select: {
              itemStyle: {
                areaColor: "#46c7b5",
                borderColor: "#fff",
                borderWidth: 2,
              },
            },
            selectedMode: "single",
          },
        ],
      },
      true,
    );
    mapChart.off("click");
    mapChart.on("click", (e) => {
      const city = matchCityName(e.name, p);
      selectCityFocus(city, p, true, e.name);
    });
  }
}
function tooltipConfig() {
  return {
    trigger: "item",
    renderMode: "html",
    appendToBody: true,
    confine: false,
    enterable: true,
    className: "mapTooltip",
    backgroundColor: "rgba(4,14,29,.97)",
    borderColor: "rgba(99,232,255,.4)",
    padding: [11, 13],
    textStyle: { color: "#eaffff", fontSize: 10 },
    extraCssText:
      "max-width:360px;white-space:normal;overflow:visible;line-height:1.62;border-radius:12px;box-shadow:0 20px 48px rgba(0,0,0,.45);z-index:99999;",
    formatter: (x) => {
      if (mapLevel === "china") {
        const p = byMapName[x.name];
        if (!p) return x.name;
        const ind =
          activeIndustry === "all"
            ? metricLabel[activeMetric]
            : sectorById(activeIndustry).label;
        return `<b>${p.name}</b><span class="ttRole">${esc(p.role)}</span><div class="ttTags"><i>${esc(ind)} ${metricValue(p)}</i><i>${esc(p.region)}</i><i>${p.cities.length} 个城市索引</i></div><span class="ttAction">点击进入市级边界 →</span>`;
      }
      const c = matchCityName(x.name, selected),
        d = cityData(c, selected),
        top = citySectorScores(c, selected)
          .slice(0, 3)
          .map((s) => s.label);
      return `<b>${esc(c)}</b><span class="ttRole">${esc(d.level)}</span><div class="ttTags">${top.map((t) => `<i>${esc(t)}</i>`).join("")}</div><span class="ttRole">${esc(d.angle)}</span><span class="ttAction">点击查看完整城市画像 →</span>`;
    },
  };
}
function renderFallback() {
  const g = document.getElementById("fallbackGrid");
  g.innerHTML = provinces.map((p) => `<button>${p.name}</button>`).join("");
  [...g.children].forEach(
    (b, i) => (b.onclick = () => drillProvince(provinces[i])),
  );
}
function renderTabs() {
  document.querySelectorAll(".tabBtn").forEach((button) => {
    const isActive = button.dataset.tab === activeTab;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", String(isActive));
    button.tabIndex = isActive ? 0 : -1;
  });
}
let focusedCity = null;
function renderCityFocus(city, p) {
  focusedCity = city;
  selected = p;
}
function renderNationalIntro() {
  const featuredCities = [
    ["南通", "制造业密度与海洋装备样板"],
    ["深圳", "科技硬件与创新生态"],
    ["苏州", "先进制造与外向型产业集群"],
    ["上海", "总部、金融与高端制造"],
    ["成都", "电子信息与西部消费中心"],
    ["武汉", "光电子、汽车与科教资源"],
  ];
  document.getElementById("detailBody").innerHTML =
    `<div class="nationalIntro"><div class="nationalIntroTop"><span class="sectionEyebrow">START HERE</span><h3>从一座城市开始研究</h3><p>选择省份与城市后，这里会依次显示城市定位、经济指标、产业证据、代表企业和省域背景。也可以直接搜索企业名称、股票代码或产业关键词。</p></div><div class="nationalSteps"><div><span>01</span><b>选城市</b><p>省份下钻后，点击地图或顶部城市选择器。</p></div><div><span>02</span><b>看证据</b><p>优先看城市级统计、产业主体与企业样本。</p></div><div><span>03</span><b>查缺口</b><p>留意集团口径、估值日期和待补本地样本。</p></div></div><div class="nationalFeatured"><div class="nationalFeaturedHead"><b>推荐入口</b><span>南通为当前最完整的城市深度样板</span></div>${featuredCities
      .map(
        ([city, note]) =>
          `<button data-featured-city="${esc(city)}" type="button"><b>${esc(city)}</b><span>${esc(note)}</span><i>→</i></button>`,
      )
      .join(
        "",
      )}</div><div class="nationalScope"><span>${provinces.length} 省级地区</span><span>${totalCities} 城市索引</span><span>${enterprises.length} 企业记录</span><span>${taxonomy.length} 产业链</span></div></div>`;
  document
    .querySelectorAll("[data-featured-city]")
    .forEach(
      (button) =>
        (button.onclick = () => openFeaturedCity(button.dataset.featuredCity)),
    );
}
function renderDetail() {
  if (!provinceNavActive && !focusedCity) {
    activeTab = "overview";
    renderTabs();
    renderNationalIntro();
    return;
  }
  renderTabs();
  const p = selected;
  if (activeTab === "overview") renderOverview(p);
  if (activeTab === "enterprises") renderEnterprises(p);
  if (activeTab === "chains") renderChains(p);
  if (activeTab === "cities") renderCities(p);
  if (activeTab === "evidence") renderEvidence(p);
}
function activeCityList(p) {
  return [
    ...new Set([
      ...(p.cities || []),
      ...currentGeoNames.map((n) => matchCityName(n, p)),
    ]),
  ].filter(Boolean);
}
function renderOverview(p) {
  const validCity =
    focusedCity && activeCityList(p).includes(focusedCity) ? focusedCity : null;
  if (validCity) {
    renderCityFirstOverview(validCity, p);
    return;
  }
  const city = p.capital || p.cities[0],
    c = cityData(city, p),
    tags = [
      ...p.base.slice(0, 3),
      ...p.emerging.slice(0, 3),
      ...p.future.slice(0, 2),
    ];
  document.getElementById("detailBody").innerHTML =
    `<div class="provinceTitle"><div><h3>${p.name}</h3><small>${p.region} · 当前为省域总览</small><p class="detailIntro">${esc(p.role)}</p></div><div class="scoreRing" style="--score:${p.investment * 3.6}deg"><div><b>${p.investment}</b><span>投资观察</span></div></div></div><div class="cityPrimaryNote">点击地图中的城市，或使用下方选择器，右侧会立即切换为“城市优先”视图；省域信息将移动到页面下方。</div><div class="citySwitchBar"><select id="citySelect">${activeCityList(
      p,
    )
      .map((x) => `<option>${esc(x)}</option>`)
      .join(
        "",
      )}</select><button id="cityOpenBtn">打开城市画像</button></div><div class="tagRow heroTags">${tags.map((x, i) => `<span class="tag ${i >= 6 ? "hot" : ""}">${esc(x)}</span>`).join("")}</div><div class="miniGrid"><div class="mini"><b>${p.gdp}</b><span>省域GDP研究基线·万亿元</span></div><div class="mini"><b>${p.growth}%</b><span>省域增速研究基线</span></div><div class="mini"><b>${p.cities.length}</b><span>城市/地区索引</span></div></div>${provinceOverviewHtml(p)}<button class="actionBtn" id="compareBtn">加入省域对比 →</button>`;
  document.getElementById("cityOpenBtn").onclick = () =>
    selectCityFocus(document.getElementById("citySelect").value, p, true);
  document.getElementById("citySelect").onchange = (e) =>
    selectCityFocus(e.target.value, p, true);
  document.getElementById("compareBtn").onclick = () => openCompare(p.name);
}
function cityCardHtml(c, p) {
  const top = citySectorScores(c.name, p).slice(0, 4),
    recs = enterpriseCityCatalog(c.name, p),
    profile = c.profile;
  return `<h5>${esc(c.name)}</h5><small>${c.level}</small><dl><dt>成熟产业</dt><dd>${esc(c.base)}</dd><dt>新兴与未来方向</dt><dd>${esc(c.emerging)}</dd><dt>细分产业链 Top 4</dt><dd><div class="scorePills">${top.map((s) => `<span class="scorePill">${s.label} · ${s.score}</span>`).join("")}</div></dd><dt>投资观察</dt><dd>${esc(c.angle)}</dd><dt>企业证据</dt><dd>已收录 ${recs.length} 家本地代表企业；其中上市/挂牌 ${recs.filter((x) => x.ticker).length} 家。${profile?.leaders?.length ? ` 入口样本：${esc(profile.leaders.slice(0, 4).join("、"))}。` : ""}</dd>${profile?.risks?.length ? `<dt>尽调缺口</dt><dd>${profile.risks.map(esc).join("；")}</dd>` : ""}</dl><button class="actionBtn" id="openEnterpriseFromCard">查看全部已收录企业 →</button>`;
}
function renderChains(p) {
  const city =
    focusedCity && activeCityList(p).includes(focusedCity) ? focusedCity : null;
  const sectors = (
    city
      ? citySectorScores(city, p)
          .slice(0, 7)
          .map((x) => sectorById(x.id))
      : (provinceFocus[p.name] || []).map(sectorById)
  ).filter(Boolean);
  document.getElementById("detailBody").innerHTML =
    `<div class="provinceTitle"><div><h3>${city ? esc(city) : p.name}产业链</h3><small>${city ? "城市产业适配度 + 企业样本" : "省域成熟—扩张—孵化三层结构"}；节点高亮为结构性识别</small></div></div><div class="tagRow"><span class="tag">上游材料/部件</span><span class="tag">中游制造/集成</span><span class="tag">下游场景/服务</span></div><div class="chainGrid">${sectors
      .map((s) => {
        const sc = city
            ? citySectorScores(city, p).find((x) => x.id === s.id)?.score || 45
            : provinceSectorScore(p, s),
          cs = city
            ? companiesForSector(city, p, s.id)
            : enterprises
                .filter(
                  (x) =>
                    p.cities.includes(x.city) && companyMatchesSector(x, s.id),
                )
                .slice(0, 5);
        return `<div class="chainCard"><div class="chainTop"><b>${s.label}</b><span>${sc}/100</span></div><div class="maturity">${maturityFor(p, s)}</div><div class="chainNodes">${s.segments.map((n, i) => `<div class="chainNode ${nodeOn(p, s, i) ? "on" : ""}">${esc(n)}</div>`).join("")}</div><div class="chainFoot"><span>本地强项：${esc(
          city
            ? cityData(city, p).base || "需项目级核验"
            : [...p.base, ...p.emerging]
                .filter((x) => keywordHits(x, s))
                .slice(0, 3)
                .join("、") || "需项目级核验",
        )}</span><strong>${s.group}</strong></div>${
          cs.length
            ? `<div class="chainCompanies">${cs
                .slice(0, 6)
                .map(
                  (x) =>
                    `<button class="chainCompany" data-company="${esc(x.name)}">${esc(x.name)}</button>`,
                )
                .join("")}</div>`
            : `<div class="maturity">暂无城市级企业记录，需进一步查园区名录与工商数据。</div>`
        }</div>`;
      })
      .join("")}</div>`;
  document.querySelectorAll("[data-company]").forEach(
    (b) =>
      (b.onclick = () => {
        activeEnterpriseQuery = b.dataset.company;
        activeTab = "enterprises";
        renderDetail();
      }),
  );
}

function companySectorIds(x) {
  return [...new Set([x.sector, ...(x.sectors || [])].filter(Boolean))];
}
function companyMatchesSector(x, id) {
  return companySectorIds(x).includes(id);
}
function sectorLabel(id) {
  const s = sectorById(id);
  return s ? s.label : id;
}
function enterpriseCityCatalog(city, p) {
  return enterprises.filter((x) => x.city === city);
}
function companyByName(name) {
  return enterprises.find((x) => x.name === name);
}
function companiesForSector(city, p, sector) {
  return enterpriseCityCatalog(city, p).filter((x) =>
    companyMatchesSector(x, sector),
  );
}
function cityInvestmentScore(city, p) {
  const scores = citySectorScores(city, p).slice(0, 4);
  return Math.round(
    scores.reduce((n, x) => n + x.score, 0) / (scores.length || 1),
  );
}
function provinceOverviewHtml(p) {
  return `<div class="section"><h4>三次产业结构</h4><div class="sectorBar"><span style="width:${p.mix[0]}%"></span><span style="width:${p.mix[1]}%"></span><span style="width:${p.mix[2]}%"></span></div><div class="sectorLabels"><span>一产 ${p.mix[0]}%</span><span>二产 ${p.mix[1]}%</span><span>三产 ${p.mix[2]}%</span></div></div><div class="profileGrid"><div class="infoCard"><h4>自然禀赋与约束</h4><p>${esc(p.nature)}</p></div><div class="infoCard"><h4>人才、人文与商业生态</h4><p>${esc(p.humanities)}</p></div><div class="infoCard wide"><h4>政策与制度平台</h4><p>${esc(p.policy)}</p></div></div><div class="riskGrid"><div class="riskCard"><b>区域投资逻辑</b><p>${esc(p.outlook)}</p></div><div class="riskCard risk"><b>需要核验的风险</b><p>${p.risks.map(esc).join("；")}</p></div></div>`;
}
function generatedEvidence(city, p) {
  const c = cityData(city, p),
    tops = citySectorScores(city, p).slice(0, 6),
    profile = c.profile;
  return tops.map((s) => {
    const proof = profile?.industryEvidence.find((item) => item.id === s.id);
    return {
      sector: s.id,
      title: s.label,
      metric: `区域产业适配度 ${s.score}/100 · ${proof?.basis || maturityFor(p, s)}`,
      employment:
        "缺少城市—产业统一就业口径，需查城市经普、园区和企业年报",
      why: proof?.localEnterpriseCount
        ? `本地企业证据包括${proof.companies.join("、")}。样本用于定位产业链入口，不代表行业全部企业。`
        : `该方向由${p.name}省域产业结构推导，尚缺城市专项统计和更多本地企业证据。`,
    };
  });
}
function renderCityFirstOverview(city, p) {
  const c = cityData(city, p),
    st = cityStats[city] || {},
    top = citySectorScores(city, p).slice(0, 5),
    recs = enterpriseCityCatalog(city, p),
    ev = (cityIndustryEvidence[city] || generatedEvidence(city, p)).slice(0, 6),
    score = cityInvestmentScore(city, p);
  const profile = c.profile;
  const kpis = [
    ["GDP", st.gdp || "未建立城市独立值"],
    ["最新增速", st.growth || "使用省域基线"],
    ["常住人口", st.population || "待查最新公报"],
    ["已收录企业", `${recs.filter((x) => !x._fallback).length || 0} 家`],
  ];
  document.getElementById("detailBody").innerHTML =
    `<div class="cityFirstHero" id="cityTop"><div class="cityHeroTop"><div><h3>${esc(city)}</h3><small>${esc(p.name)} · ${esc(c.level)} · 数据更新至 ${esc(st.asOf || cityProfileMeta.asOf || enterpriseMeta.asOf || "2026")}</small><p>${esc(st.position || profile?.position || c.angle)}</p></div><div class="cityScore"><b>${score}</b><span>城市产业适配度</span></div></div><div class="tagRow">${top.map((x, i) => `<span class="tag ${i < 2 ? "hot" : ""}">${x.label} ${x.score}</span>`).join("")}</div><div class="cityKpis">${kpis.map((x) => `<div class="cityKpi"><b>${esc(x[1])}</b><span>${esc(x[0])}</span></div>`).join("")}</div>${profile ? `<div class="cityEvidenceSummary"><div><b>${profile.locallyEvidencedIndustries}</b><span>有本地企业证据的产业</span></div><div><b>${profile.localSectorCount}</b><span>企业涉及产业链</span></div><p>${esc(profile.evidenceNote)}</p></div>` : ""}${st.detail ? `<p class="companyDesc">${esc(st.detail)}</p>` : ""}</div><div class="citySectionNav"><button data-cityanchor="cityEvidence">产业证据</button><button data-citytab="enterprises">企业库</button><button data-citytab="chains">产业链</button><button data-cityanchor="provinceContext">省域背景</button></div><div class="cityEvidenceHead" id="cityEvidence"><h4>重点产业：数据证据与企业样本</h4><span>优先列出可核验本地企业样本；省域推导明确标注</span></div><div class="industryEvidenceGrid">${ev.map((e) => industryEvidenceHtml(e, city, p)).join("")}</div><div class="cityBlock"><div class="cityBlockHead"><div><b>${esc(city)}城市画像</b><div style="font-size:8px;color:#718b9e;margin-top:3px">先看城市，省域背景置于最下方</div></div><span class="grade ${c.grade}">${c.grade}级</span></div><div class="cityCard">${cityCardHtml(c, p)}</div></div><details class="provinceContext" id="provinceContext"><summary>${esc(p.name)}省域背景 · 点击展开</summary><div class="provinceContextInner"><div class="provinceTitle"><div><h3>${p.name}</h3><small>${p.region}</small><p class="detailIntro">${esc(p.role)}</p></div><div class="scoreRing" style="--score:${p.investment * 3.6}deg"><div><b>${p.investment}</b><span>省域投资观察</span></div></div></div>${provinceOverviewHtml(p)}<button class="actionBtn" id="compareBtn">加入省域对比 →</button></div></details>`;
  bindCityOverviewActions(city, p);
  if (st.source) {
    const h = document.querySelector(".cityFirstHero");
    h.insertAdjacentHTML(
      "beforeend",
      `<div class="sourceMini">城市数据：<a href="${st.source}" target="_blank" rel="noopener">官方统计公报</a>${st.source2 ? ` · <a href="${st.source2}" target="_blank" rel="noopener">经济普查</a>` : ""}</div>`,
    );
  }
}
function industryEvidenceHtml(e, city, p) {
  const comps = companiesForSector(city, p, e.sector),
    sampleLabel = comps.length ? `${comps.length} 家本地样本` : "本地样本待补";
  return `<div class="industryEvidenceCard"><div class="industryEvidenceTop"><b>${esc(e.title || sectorLabel(e.sector))}</b><em>${sampleLabel}</em></div><div class="industryMetric">${esc(e.metric || "")}</div>${e.employment ? `<div class="industryMetric">就业/主体：${esc(e.employment)}</div>` : ""}<div class="industryWhy">${esc(e.why || "")}</div><div class="companyExampleRow">${
    comps.length
      ? comps
          .slice(0, 5)
          .map(
            (x) =>
              `<button class="companyExample" data-company="${esc(x.name)}">${esc(x.name)} · ${esc(x.status)}</button>`,
          )
          .join("")
      : `<span class="companyGap">暂无可核验的本地龙头记录，建议继续查园区名录、工商数据与企业年报。</span>`
  }${comps.length > 5 ? `<button class="textBtn" data-sector-open="${e.sector}">+${comps.length - 5} 家</button>` : ""}</div></div>`;
}
function bindCityOverviewActions(city, p) {
  document.querySelectorAll("[data-citytab]").forEach(
    (b) =>
      (b.onclick = () => {
        activeTab = b.dataset.citytab;
        renderDetail();
      }),
  );
  document
    .querySelectorAll("[data-cityanchor]")
    .forEach(
      (b) =>
        (b.onclick = () =>
          document
            .getElementById(b.dataset.cityanchor)
            ?.scrollIntoView({ behavior: "smooth", block: "start" })),
    );
  document.querySelectorAll("[data-sector-open]").forEach(
    (b) =>
      (b.onclick = () => {
        activeEnterpriseSector = b.dataset.sectorOpen;
        activeTab = "enterprises";
        renderDetail();
      }),
  );
  document.querySelectorAll("[data-company]").forEach(
    (b) =>
      (b.onclick = () => {
        activeEnterpriseQuery = b.dataset.company;
        activeTab = "enterprises";
        renderDetail();
      }),
  );
  const oe = document.getElementById("openEnterpriseFromCard");
  if (oe)
    oe.onclick = () => {
      activeEnterpriseQuery = "";
      activeEnterpriseSector = "all";
      activeTab = "enterprises";
      renderDetail();
    };
  const cb = document.getElementById("compareBtn");
  if (cb) cb.onclick = () => openCompare(p.name);
}
let activeEnterpriseQuery = "",
  activeEnterpriseSector = "all",
  activeEnterpriseStatus = "all";
function renderEnterprises(p) {
  const city =
    focusedCity && activeCityList(p).includes(focusedCity) ? focusedCity : null;
  if (!city) {
    document.getElementById("detailBody").innerHTML =
      `<div class="noData"><b>请先选择城市</b><br>企业库以城市为主键。可在地图中点击城市，或在顶部省市选择器中直接定位。</div>`;
    return;
  }
  const recs = enterpriseCityCatalog(city, p),
    sectors = [...new Set(recs.flatMap(companySectorIds))];
  document.getElementById("detailBody").innerHTML =
    `<div class="enterpriseIntro"><h3>${esc(city)}企业库</h3><p>${recs.length ? "展示已核验注册地的上市公司、龙头企业及关键非上市企业。" : "该城市的本地龙头企业样本仍在核验，当前不使用省内其他城市企业替代。"} ${esc(enterpriseMeta.scope || "")}</p></div><div class="enterpriseFilters"><input id="enterpriseSearch" placeholder="搜索企业、业务或代码" value="${esc(activeEnterpriseQuery)}"><select id="enterpriseSector"><option value="all">全部产业</option>${sectors.map((id) => `<option value="${id}" ${id === activeEnterpriseSector ? "selected" : ""}>${esc(sectorLabel(id))}</option>`).join("")}</select><select id="enterpriseStatus"><option value="all">全部上市状态</option><option value="listed" ${activeEnterpriseStatus === "listed" ? "selected" : ""}>上市/挂牌</option><option value="private" ${activeEnterpriseStatus === "private" ? "selected" : ""}>非上市/集团子公司</option></select></div><div class="enterpriseCount" id="enterpriseCount"></div><div class="enterpriseGrid" id="enterpriseGrid"></div><div class="coverageNote">${esc(enterpriseMeta.coverage || "")}<br>${esc(enterpriseMeta.marketNote || "")}</div>`;
  const rerender = () => {
    activeEnterpriseQuery = document
      .getElementById("enterpriseSearch")
      .value.trim();
    activeEnterpriseSector = document.getElementById("enterpriseSector").value;
    activeEnterpriseStatus = document.getElementById("enterpriseStatus").value;
    const filtered = recs.filter(
      (x) =>
        (!activeEnterpriseQuery ||
          [x.name, x.role, x.description, x.ticker, x.city]
            .join(" ")
            .toLowerCase()
            .includes(activeEnterpriseQuery.toLowerCase())) &&
        (activeEnterpriseSector === "all" ||
          companyMatchesSector(x, activeEnterpriseSector)) &&
        (activeEnterpriseStatus === "all" ||
          (activeEnterpriseStatus === "listed" ? !!x.ticker : !x.ticker)),
    );
    document.getElementById("enterpriseCount").textContent =
      `显示 ${filtered.length} / ${recs.length} 家 · 数据日期 ${enterpriseMeta.asOf || "2026"}`;
    document.getElementById("enterpriseGrid").innerHTML = filtered.length
      ? filtered.map(companyCardHtml).join("")
      : `<div class="noData">没有符合筛选条件的企业记录。</div>`;
    loadLiveCaps();
  };
  document.getElementById("enterpriseSearch").oninput = rerender;
  document.getElementById("enterpriseSector").onchange = rerender;
  document.getElementById("enterpriseStatus").onchange = rerender;
  rerender();
}
function companyCardHtml(x) {
  const generatedBadge = x.generated
    ? `<span class="dataBadge">${esc(
        x.dataset === "NEEQ"
          ? "挂牌样本 · 注册地核验"
          : x.dataset === "TWSE"
            ? "TWSE 样本 · 登记地核验"
            : x.dataset === "CURATED"
              ? "逐城核验样本"
              : "上市样本 · 注册地核验",
      )}</span>`
    : "";
  return `<article class="companyCard"><div class="companyHead"><div><h4>${esc(x.name)}${generatedBadge}</h4><small>${esc(companySectorIds(x).map(sectorLabel).join(" / "))} · ${esc(x.ownership || "所有制待核验")}</small></div><span class="companyStatus">${esc(x.status)}</span></div><div class="companyRole">${esc(x.role)}</div><div class="companyMetrics"><div class="companyMetric"><b>${esc(x.ticker || "非独立上市")}</b><span>上市代码</span></div><div class="companyMetric"><b>${x.secid ? `<span class="liveCap loading" data-secid="${x.secid}">${esc(x.valuation || "联网加载市值")}</span>` : esc(x.valuation || "未公开")}</b><span>市值 / 估值口径</span></div><div class="companyMetric"><b>${esc(x.revenue || "未录入/见最新年报")}</b><span>营业收入</span></div><div class="companyMetric"><b>${esc(x.employees || "未单独披露")}</b><span>集团员工 / 就业</span></div></div>${x.founded ? `<div class="sourceMini">成立：${esc(x.founded)} · 数据：${esc(x.asOf || "持续更新")}</div>` : ""}${x.rankBasis ? `<div class="sourceMini">入选口径：${esc(x.rankBasis)}</div>` : ""}${x.description ? `<p class="companyDesc">${esc(x.description)}</p>` : ""}${x.latest ? `<div class="companyLatest">${esc(x.latest)}</div>` : ""}<div class="companyLinks">${x.source ? `<a href="${x.source}" target="_blank" rel="noopener">${esc(x.sourceLabel || "年报/官方披露")} ↗</a>` : ""}${x.source2 ? `<a href="${x.source2}" target="_blank" rel="noopener">${esc(x.source2Label || "公司背景")} ↗</a>` : ""}${x.source3 ? `<a href="${x.source3}" target="_blank" rel="noopener">${esc(x.source3Label || "投资数据资料")} ↗</a>` : ""}</div></article>`;
}
function formatCap(v) {
  if (!v || v <= 0) return null;
  const yi = v / 1e8;
  if (yi >= 10000) return (yi / 10000).toFixed(2) + "万亿元";
  return yi.toFixed(1) + "亿元";
}
async function loadLiveCaps() {
  const els = [...document.querySelectorAll(".liveCap[data-secid]")];
  await Promise.all(
    els.map(async (el) => {
      try {
        const url = `https://push2.eastmoney.com/api/qt/stock/get?secid=${encodeURIComponent(el.dataset.secid)}&fields=f57,f58,f116`;
        const r = await fetch(url);
        if (!r.ok) throw Error(r.status);
        const j = await r.json(),
          cap = formatCap(j?.data?.f116);
        if (!cap) throw Error("no cap");
        el.textContent = cap + " · 实时";
        el.className = "liveCap ok";
      } catch (e) {
        el.textContent = "市值需联网刷新";
        el.className = "liveCap fail";
      }
    }),
  );
}

function renderCities(p) {
  const rows = activeCityList(p).map((city) => {
    const c = cityData(city, p),
      top = citySectorScores(city, p).slice(0, 3);
    return { city, c, top };
  });
  document.getElementById("detailBody").innerHTML =
    `<div class="provinceTitle"><div><h3>${p.name}城市矩阵</h3><small>${rows.length} 个行政单元 · 可按城市或产业搜索</small></div></div><div class="search citySearch"><span>⌕</span><input id="cityFilter" placeholder="筛选城市、产业或投资方向" /></div><div class="cityTableWrap"><table class="cityTable"><thead><tr><th>城市</th><th>等级</th><th>成熟产业</th><th>新兴方向</th><th>产业链Top 3</th><th>投资观察</th></tr></thead><tbody id="cityRows">${cityRowsHtml(rows)}</tbody></table></div>`;
  document.getElementById("cityFilter").oninput = (e) => {
    const q = e.target.value.trim();
    const filtered = rows.filter((r) =>
      [r.city, r.c.base, r.c.emerging, r.c.angle, ...r.top.map((x) => x.label)]
        .join(" ")
        .includes(q),
    );
    document.getElementById("cityRows").innerHTML = cityRowsHtml(filtered);
    bindCityRows(p);
  };
  setTimeout(() => bindCityRows(p), 0);
}
function cityRowsHtml(rows) {
  return rows
    .map(
      (r) =>
        `<tr><td><button class="cityNameBtn" data-city="${esc(r.city)}">${esc(r.city)}</button></td><td><span class="grade ${r.c.grade}">${r.c.grade}</span></td><td>${esc(r.c.base)}</td><td>${esc(r.c.emerging)}</td><td>${r.top.map((x) => `${x.label} ${x.score}`).join("<br>")}</td><td>${esc(r.c.angle)}</td></tr>`,
    )
    .join("");
}
function bindCityRows(p) {
  document
    .querySelectorAll(".cityNameBtn")
    .forEach(
      (b) => (b.onclick = () => selectCityFocus(b.dataset.city, p, true)),
    );
}
function renderEvidence(p) {
  const city =
    focusedCity && activeCityList(p).includes(focusedCity) ? focusedCity : null;
  const profile = city ? cityProfiles[city] : null;
  const cityProof = profile
    ? `<div class="evidenceBox evidenceStrong"><b>${esc(city)}逐城证据摘要</b><p>本地代表企业 ${profile.localEnterpriseCount} 家，覆盖 ${profile.localSectorCount} 条产业链；其中 ${profile.locallyEvidencedIndustries} 个重点方向有直接企业样本。${esc(profile.evidenceNote)}</p></div><div class="evidenceBox"><b>本市需继续核验</b><p>${profile.risks.map(esc).join("；")}。</p></div>`
    : "";
  document.getElementById("detailBody").innerHTML =
    `<div class="provinceTitle"><div><h3>证据与口径</h3><small>${city ? `${esc(city)} / ${p.name}` : p.name} · 数据可追溯性说明</small></div></div>${cityProof}<div class="evidenceBox"><b>城市优先显示规则</b><p>选择城市后，城市经济、产业证据、企业样本和龙头公司首先展示；省域自然、人文、政策和产业结构移动至页面底部折叠区。</p></div><div class="evidenceBox"><b>企业库范围</b><p>${esc(enterpriseMeta.scope || "")} 企业营收与员工优先取最新年度报告；“员工”通常为集团合并口径，不等于该城市本地就业。未单独披露时明确显示“未披露”，不进行估算。</p></div><div class="evidenceBox"><b>估值与市值</b><p>上市企业显示交易所代码，并尝试联网加载A股实时总市值。非上市企业若缺乏可靠股权交易，不填传闻估值；历史融资估值也不等同于当前企业价值。</p></div><div class="evidenceBox"><b>A/B城市颗粒度</b><p>A级为城市独立资料或多企业、多产业证据画像；B级至少有一家本地企业证据，产业缺口由省域结构补充并明确标注。企业库覆盖标签与产业适配度不是投资评级。</p></div><div class="evidenceBox"><b>产业链评分</b><p>由本地企业行业归属、省级产业标签、城市资料和成熟/新兴/未来关键词共同计算，表达“区域适配度”，不是企业收益率预测。</p></div><div class="evidenceBox"><b>当前区域风险</b><p>${p.risks.map(esc).join("；")}。项目尽调还应核验能耗、土地、环保、补贴兑现、核心客户、应收账款、资本开支和真实本地就业。</p></div>`;
}
function renderTaxonomy() {
  document.getElementById("taxonomyGrid").innerHTML = taxonomy
    .map(
      (s) =>
        `<div class="taxonomyCard"><small>${s.group}</small><b>${s.label}</b><ul>${s.segments.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>`,
    )
    .join("");
}
function renderSources() {
  document.getElementById("sourceList").innerHTML = sources
    .map(
      (s) =>
        `<a class="source" href="${s.url}" target="_blank" rel="noopener"><div><b>${esc(s.title)}</b><small>${esc(s.org)} · ${esc(s.date)}<br>${esc(s.use)}</small></div><em>原始来源 ↗</em></a>`,
    )
    .join("");
}
function runAtlasSearch() {
  const q = document.getElementById("globalSearch").value.trim();
  if (!q) return;
  const comp = enterprises.find(
    (x) => x.name.includes(q) || x.role.includes(q) || x.ticker.includes(q),
  );
  if (comp) {
    const p = provinces.find((x) => x.cities.includes(comp.city));
    if (p) {
      drillProvince(p, comp.city);
      setTimeout(() => {
        activeEnterpriseQuery = comp.name;
        activeTab = "enterprises";
        renderDetail();
      }, 420);
      return;
    }
  }
  let p = provinces.find((x) => x.name.includes(q) || x.mapName.includes(q));
  let city = null;
  if (!p) {
    for (const x of provinces) {
      city = x.cities.find((c) => c.includes(q));
      if (city) {
        p = x;
        break;
      }
    }
  }
  const sec = taxonomy.find(
    (s) =>
      s.label.includes(q) ||
      s.keywords.some((k) => k.includes(q) || q.includes(k)),
  );
  if (sec && !p) {
    activeIndustry = sec.id;
    renderControls();
    renderMap();
    renderDetail();
    document.getElementById("filterDrawer").classList.add("open");
    document.getElementById("filterToggle").classList.add("open");
    return;
  }
  if (p) {
    drillProvince(p, city);
  } else alert("暂未找到。可尝试省份、城市、企业名称、股票代码或产业关键词。");
}
function setupSearch() {
  const input = document.getElementById("globalSearch");
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") runAtlasSearch();
  });
  document.getElementById("searchGo").onclick = runAtlasSearch;
  document.addEventListener("keydown", (e) => {
    if (
      e.key === "/" &&
      !/input|select|textarea/i.test(document.activeElement.tagName)
    ) {
      e.preventDefault();
      input.focus();
    }
  });
}
function setupNavigator() {
  const ps = document.getElementById("provinceJump"),
    cs = document.getElementById("cityJump");
  ps.innerHTML =
    '<option value="">选择省份</option>' +
    provinces
      .map((p) => `<option value="${p.name}">${p.name}</option>`)
      .join("");
  document.getElementById("atlasSuggestions").innerHTML = [
    ...provinces.map((p) => p.name),
    ...provinces.flatMap((p) => p.cities),
    ...taxonomy.map((x) => x.label),
    ...enterprises.flatMap((x) => [x.name, x.ticker]).filter(Boolean),
  ]
    .map((x) => `<option value="${esc(x)}"></option>`)
    .join("");
  ps.onchange = () => {
    const p = byName[ps.value];
    if (p) drillProvince(p);
  };
  cs.onchange = () => {
    if (cs.value && selected) selectCityFocus(cs.value, selected, true);
  };
  document.getElementById("jumpBtn").onclick = () => {
    const p = byName[ps.value];
    if (!p) return;
    const c = cs.value || null;
    if (mapLevel === "china" || selected.name !== p.name) drillProvince(p, c);
    else if (c) selectCityFocus(c, p, true);
  };
  document.getElementById("homeTrail").onclick = () => initNational();
  document.getElementById("filterToggle").onclick = toggleFilterDrawer;
  document.getElementById("drawerClose").onclick = () =>
    toggleFilterDrawer(false);
  document.getElementById("resetView").onclick = () => {
    if (mapChart) {
      mapChart.dispatchAction({ type: "restore" });
      renderMap();
    }
  };
}
function toggleFilterDrawer(force) {
  const d = document.getElementById("filterDrawer"),
    b = document.getElementById("filterToggle"),
    open = typeof force === "boolean" ? force : !d.classList.contains("open");
  d.classList.toggle("open", open);
  b.classList.toggle("open", open);
}
function updateNavigator() {
  const ps = document.getElementById("provinceJump"),
    cs = document.getElementById("cityJump"),
    ctx = document.getElementById("navContext");
  if (!ps || !cs) return;
  if (!provinceNavActive) {
    ps.value = "";
    cs.innerHTML = '<option value="">先选择省份</option>';
    cs.disabled = true;
    ctx.textContent = "选择省份后进入市级地图";
  } else {
    ps.value = selected.name;
    const cities = activeCityList(selected);
    cs.disabled = false;
    cs.innerHTML =
      '<option value="">选择城市</option>' +
      cities
        .map(
          (c) =>
            `<option value="${esc(c)}" ${c === focusedCity ? "selected" : ""}>${esc(c)}</option>`,
        )
        .join("");
    ctx.textContent = focusedCity
      ? `${selected.name} / ${focusedCity}`
      : `${selected.name} / 市级边界`;
  }
}
function renderQuickRail() {
  const rail = document.getElementById("quickRail"),
    title = document.getElementById("quickTitle"),
    sub = document.getElementById("quickSubtitle");
  if (!rail) return;
  if (!provinceNavActive) {
    title.textContent = "省份快捷入口";
    sub.textContent = "横向滚动，点击即可进入";
    rail.innerHTML = provinces
      .map(
        (p) =>
          `<button class="quickChip" data-province="${p.name}">${p.name}</button>`,
      )
      .join("");
    rail
      .querySelectorAll("[data-province]")
      .forEach(
        (b) => (b.onclick = () => drillProvince(byName[b.dataset.province])),
      );
  } else {
    const cities = activeCityList(selected);
    title.textContent = `${selected.name}城市快捷入口`;
    sub.textContent = `${cities.length} 个城市/地区，点击同步地图与画像`;
    rail.innerHTML = cities
      .map(
        (c) =>
          `<button class="quickChip ${c === focusedCity ? "active" : ""}" data-city="${esc(c)}">${esc(c)}</button>`,
      )
      .join("");
    rail
      .querySelectorAll("[data-city]")
      .forEach(
        (b) =>
          (b.onclick = () => selectCityFocus(b.dataset.city, selected, true)),
      );
  }
}
function featureForCity(city, p) {
  return currentGeoNames.find((n) => matchCityName(n, p) === city) || city;
}
function selectCityFocus(city, p, scrollDetail = true, featureName = null) {
  focusedCity = city;
  selected = p;
  selectedFeatureName = featureName || featureForCity(city, p);
  activeTab = "overview";
  renderTabs();
  renderDetail();
  updateNavigator();
  renderQuickRail();
  if (mapChart && mapLevel !== "china") {
    mapChart.dispatchAction({ type: "unselect", seriesIndex: 0 });
    mapChart.dispatchAction({
      type: "select",
      seriesIndex: 0,
      name: selectedFeatureName,
    });
  }
  const c = cityData(city, p),
    top = citySectorScores(city, p)
      .slice(0, 2)
      .map((x) => x.label)
      .join(" · "),
    dock = document.getElementById("selectionDock");
  dock.innerHTML = `<small>${esc(p.name)} · ${esc(c.level)}</small><b>${esc(city)}</b><p>${esc(top)}<br>${esc(c.angle)}</p><button id="dockOpen">右侧查看完整画像 →</button>`;
  dock.classList.add("show");
  document.getElementById("dockOpen").onclick = () =>
    mobileMedia.matches
      ? setMobileView("detail", true)
      : document
          .querySelector(".detail")
          .scrollTo({ top: 0, behavior: "smooth" });
  if (scrollDetail) {
    const detail = document.querySelector(".detail");
    detail.scrollTo({ top: 0, behavior: "smooth" });
    if (mobileMedia.matches) setMobileView("detail", true);
  }
}
function initCharts() {
  const axis = {
    axisLine: { lineStyle: { color: "rgba(122,166,190,.24)" } },
    axisLabel: { color: "#7892a5", fontSize: 8 },
    splitLine: { lineStyle: { color: "rgba(99,232,255,.07)" } },
  };
  gdpChart = echarts.init(document.getElementById("gdpChart"));
  gdpChart.setOption({
    title: {
      text: "中国经济总量与增长",
      subtext: "2021—2025 · GDP 万亿元 / 实际增速 %",
      left: 17,
      top: 15,
      textStyle: { color: "#e9f8ff", fontSize: 13 },
      subtextStyle: { color: "#708ca0", fontSize: 8 },
    },
    legend: {
      right: 17,
      top: 17,
      textStyle: { color: "#8199aa", fontSize: 8 },
    },
    grid: { left: 50, right: 45, top: 78, bottom: 34 },
    tooltip: { trigger: "axis" },
    xAxis: { ...axis, type: "category", data: trends.years },
    yAxis: [
      { ...axis, type: "value", min: 100 },
      { ...axis, type: "value", min: 0, max: 10 },
    ],
    series: [
      {
        name: "GDP",
        type: "bar",
        data: trends.gdp,
        barWidth: 22,
        itemStyle: {
          borderRadius: [6, 6, 0, 0],
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "#63e8ff" },
            { offset: 1, color: "#3152c8" },
          ]),
        },
      },
      {
        name: "增速",
        type: "line",
        yAxisIndex: 1,
        data: trends.growth,
        smooth: true,
        symbolSize: 6,
        lineStyle: { width: 2, color: "#ffd078" },
        itemStyle: { color: "#ffd078" },
      },
    ],
  });
  sectorChart = echarts.init(document.getElementById("sectorChart"));
  sectorChart.setOption({
    title: {
      text: "2025 三次产业结构",
      subtext: "国家统计局公报口径",
      left: 17,
      top: 15,
      textStyle: { color: "#e9f8ff", fontSize: 13 },
      subtextStyle: { color: "#708ca0", fontSize: 8 },
    },
    tooltip: { trigger: "item", formatter: "{b}: {c}%" },
    legend: { bottom: 18, textStyle: { color: "#8199aa", fontSize: 8 } },
    series: [
      {
        type: "pie",
        radius: ["44%", "69%"],
        center: ["50%", "53%"],
        data: [
          { name: "第一产业", value: trends.sector2025[0] },
          { name: "第二产业", value: trends.sector2025[1] },
          { name: "第三产业", value: trends.sector2025[2] },
        ],
        label: { color: "#bdd0dc", fontSize: 9, formatter: "{b}\n{d}%" },
        itemStyle: { borderColor: "#071226", borderWidth: 4 },
        color: ["#55efb6", "#5279ff", "#a67cff"],
      },
    ],
  });
  futureChart = echarts.init(document.getElementById("futureChart"));
  futureChart.setOption({
    title: {
      text: "新兴支柱产业规模情景",
      subtext: "2025 锚点约 6 万亿元；2026—2030 为研究情景",
      left: 17,
      top: 15,
      textStyle: { color: "#e9f8ff", fontSize: 13 },
      subtextStyle: { color: "#708ca0", fontSize: 8 },
    },
    grid: { left: 52, right: 25, top: 75, bottom: 34 },
    tooltip: { trigger: "axis" },
    xAxis: {
      ...axis,
      type: "category",
      data: ["2025", "2026E", "2027E", "2028E", "2029E", "2030E"],
    },
    yAxis: { ...axis, type: "value" },
    series: [
      {
        type: "line",
        data: trends.futureScale,
        smooth: true,
        symbolSize: 7,
        lineStyle: { width: 4, color: "#63e8ff" },
        itemStyle: { color: "#fff", borderColor: "#63e8ff", borderWidth: 3 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "rgba(99,232,255,.32)" },
            { offset: 1, color: "rgba(82,121,255,0)" },
          ]),
        },
      },
    ],
  });
  signalChart = echarts.init(document.getElementById("signalChart"));
  const sig = taxonomy
    .map((s) => ({
      name: s.label,
      value: Math.round(
        provinces.reduce((n, p) => n + provinceSectorScore(p, s), 0) /
          provinces.length,
      ),
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);
  signalChart.setOption({
    title: {
      text: "2026 区域产业信号强度",
      subtext: "基于省域产业适配度均值 · 研究指数",
      left: 17,
      top: 15,
      textStyle: { color: "#e9f8ff", fontSize: 13 },
      subtextStyle: { color: "#708ca0", fontSize: 8 },
    },
    grid: { left: 115, right: 25, top: 70, bottom: 25 },
    tooltip: { trigger: "axis" },
    xAxis: { ...axis, type: "value", min: 50, max: 100 },
    yAxis: {
      ...axis,
      type: "category",
      data: sig.map((x) => x.name).reverse(),
    },
    series: [
      {
        type: "bar",
        data: sig.map((x) => x.value).reverse(),
        barWidth: 12,
        itemStyle: {
          borderRadius: [0, 6, 6, 0],
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: "#3152c8" },
            { offset: 1, color: "#55efb6" },
          ]),
        },
      },
    ],
  });
  window.addEventListener("resize", () =>
    [
      mapChart,
      gdpChart,
      sectorChart,
      futureChart,
      signalChart,
      compareChart,
    ].forEach((x) => x && x.resize()),
  );
}
function openCompare(seed) {
  document.getElementById("compareModal").classList.add("open");
  const defaults = [seed, "广东", "江苏", "浙江"]
    .filter((x, i, a) => a.indexOf(x) === i)
    .slice(0, 4);
  document.getElementById("compareList").innerHTML = provinces
    .map(
      (p) =>
        `<label><input type="checkbox" value="${p.name}" ${defaults.includes(p.name) ? "checked" : ""}> ${p.name}</label>`,
    )
    .join("");
  document.querySelectorAll("#compareList input").forEach(
    (x) =>
      (x.onchange = () => {
        const c = [...document.querySelectorAll("#compareList input:checked")];
        if (c.length > 4) {
          x.checked = false;
          alert("最多选择 4 个地区");
        }
        updateCompare();
      }),
  );
  setTimeout(() => {
    compareChart =
      compareChart || echarts.init(document.getElementById("compareChart"));
    updateCompare();
  }, 50);
}
function updateCompare() {
  if (!compareChart) return;
  const ps = [...document.querySelectorAll("#compareList input:checked")].map(
    (x) => byName[x.value],
  );
  compareChart.setOption(
    {
      legend: { top: 18, textStyle: { color: "#94acbc" } },
      tooltip: {},
      radar: {
        center: ["50%", "55%"],
        radius: "67%",
        indicator: [
          { name: "创新", max: 100 },
          { name: "制造", max: 100 },
          { name: "数字", max: 100 },
          { name: "绿色", max: 100 },
          { name: "开放", max: 100 },
          { name: "投资观察", max: 100 },
        ],
        axisName: { color: "#9bb2c1" },
        splitLine: { lineStyle: { color: "rgba(99,232,255,.15)" } },
        splitArea: {
          areaStyle: { color: ["rgba(17,34,62,.25)", "rgba(8,19,37,.25)"] },
        },
        axisLine: { lineStyle: { color: "rgba(99,232,255,.15)" } },
      },
      series: [
        {
          type: "radar",
          data: ps.map((p) => ({
            name: p.name,
            value: [
              p.innovation,
              p.manufacturing,
              p.digital,
              p.green,
              p.openness,
              p.investment,
            ],
            areaStyle: { opacity: 0.08 },
          })),
          lineStyle: { width: 2 },
          symbolSize: 5,
        },
      ],
    },
    true,
  );
}

async function openCityWorkflow(tab) {
  const city = focusedCity || "南通";
  const province = provinces.find((item) => item.cities.includes(city));
  if (!province) return;
  if (!provinceNavActive || selected.name !== province.name || mapLevel === "china") {
    await drillProvince(province);
  }
  selectCityFocus(city, province, false);
  activeTab = tab;
  renderTabs();
  renderDetail();
  document
    .getElementById("atlas")
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
  if (mobileMedia.matches) setMobileView("detail");
}

function setupUseCaseHub() {
  const count = document.getElementById("useCaseEnterpriseCount");
  if (count) count.textContent = enterprises.length.toLocaleString("zh-CN");

  document.querySelectorAll("[data-use-filter]").forEach((button) => {
    button.onclick = () => {
      const filter = button.dataset.useFilter;
      document.querySelectorAll("[data-use-filter]").forEach((item) => {
        const active = item === button;
        item.classList.toggle("active", active);
        item.setAttribute("aria-pressed", String(active));
      });
      document.querySelectorAll("[data-use-category]").forEach((card) => {
        card.hidden =
          filter !== "all" && card.dataset.useCategory !== filter;
      });
    };
  });

  document.querySelectorAll("[data-use-case]").forEach((card) => {
    card.onclick = async () => {
      const useCase = card.dataset.useCase;
      if (useCase === "national-map") {
        await initNational();
        document
          .getElementById("atlas")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      if (useCase === "region-compare") {
        openCompare(provinceNavActive ? selected.name : "江苏");
        return;
      }
      const tabByUseCase = {
        "city-overview": "overview",
        "enterprise-library": "enterprises",
        "industry-chain": "chains",
        "evidence-method": "evidence",
      };
      if (tabByUseCase[useCase]) await openCityWorkflow(tabByUseCase[useCase]);
    };
  });
}
document.querySelectorAll(".tabBtn").forEach(
  (b) =>
    (b.onclick = () => {
      activeTab = b.dataset.tab;
      renderDetail();
      if (activeTab === "cities") setTimeout(() => bindCityRows(selected), 0);
      if (mobileMedia.matches) setMobileView("detail");
    }),
);
document
  .querySelectorAll("[data-mobile-view]")
  .forEach(
    (button) =>
      (button.onclick = () => setMobileView(button.dataset.mobileView, true)),
  );
document.getElementById("openNantong").onclick = () => openFeaturedCity("南通");
document
  .querySelectorAll("[data-special-region]")
  .forEach(
    (button) =>
      (button.onclick = () => openFeaturedCity(button.dataset.specialRegion)),
  );
document.getElementById("backBtn").onclick = () => initNational();
document.getElementById("toggleLabels").onclick = () => {
  showLabels = !showLabels;
  renderMap();
};
document.getElementById("closeModal").onclick = () =>
  document.getElementById("compareModal").classList.remove("open");
document.getElementById("compareModal").onclick = (e) => {
  if (e.target.id === "compareModal") e.currentTarget.classList.remove("open");
};
document.addEventListener("keydown", (event) => {
  if (
    event.key === "Escape" &&
    document.getElementById("compareModal").classList.contains("open")
  ) {
    document.getElementById("compareModal").classList.remove("open");
  }
});
mobileMedia.addEventListener("change", (event) => {
  if (!event.matches) {
    document.body.dataset.mobileView = "map";
    window.setTimeout(() => mapChart?.resize(), 40);
  }
});
renderControls();
setupUseCaseHub();
renderTaxonomy();
renderSources();
renderDetail();
setupNavigator();
setupSearch();
updateNavigator();
renderQuickRail();
if (window.echarts) {
  mapChart = echarts.init(document.getElementById("chinaMap"));
  initNational();
  initCharts();
} else {
  document.getElementById("mapFallback").style.display = "block";
  renderFallback();
}
