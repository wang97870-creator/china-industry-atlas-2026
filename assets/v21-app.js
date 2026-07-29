(function initAtlasV21() {
  "use strict";

  const MODES = ["explore", "investor", "policy", "learn"];
  const MODE_COPY = {
    explore: {
      eyebrow: "EXPLORE WORKBENCH",
      title: "城市产业探索",
      lead: "从地图或城市列表进入，把产业链位置、企业证据与来源放在同一研究上下文。",
    },
    investor: {
      eyebrow: "INVESTOR WORKBENCH",
      title: "投资研究工作台",
      lead: "并列比较城市与企业证据，拆分论点、反证与下一步核验；不把区域适配度解释为收益预测。",
    },
    policy: {
      eyebrow: "POLICY WORKBENCH",
      title: "产业政策与招商工作台",
      lead: "沿价值链识别证据覆盖与结构缺口，区分企业匹配、项目进度和政策执行事实。",
    },
    learn: {
      eyebrow: "LEARNING LAB",
      title: "城市产业案例学习",
      lead: "用同一数据底座练习观察、推理、Bull/Bear 反证与后续尽调，不产生真实交易建议。",
    },
  };
  const GROUP_LABELS = {
    province: "省级地区",
    city: "城市",
    company: "企业与股票代码",
    industry: "产业链",
    node: "价值链节点",
    project: "项目",
    policy: "政策",
  };
  const GROUP_ICONS = {
    province: "省",
    city: "城",
    company: "企",
    industry: "链",
    node: "点",
    project: "项",
    policy: "策",
  };
  const PROJECT_STAGES = ["规划", "签约", "备案", "核准", "环评", "开工", "试产", "投产", "运营"];
  const LEARN_CASES = [
    { id: "nantong", city: "南通", industry: "cleanenergy", title: "南通 · 海上风电与先进封装", question: "链主与关键部件证据如何改变城市产业判断？" },
    { id: "hefei", city: "合肥", industry: "nev", title: "合肥 · 新能源汽车", question: "整车、零部件与政策投入应如何分层核验？" },
    { id: "shenzhen", city: "深圳", industry: "ai", title: "深圳 · 人工智能", question: "硬件、算力与应用企业如何形成交叉证据？" },
    { id: "suzhou", city: "苏州", industry: "equipment", title: "苏州 · 先进制造", question: "制造密度与外向型风险如何同时进入论点？" },
  ];

  const state = {
    mode: "explore",
    mapView: "map",
    compare: { cities: [], companies: [] },
    watch: [],
    currentCompany: "",
    learnCase: "nantong",
    paletteItems: [],
    paletteIndex: 0,
    priorFocus: null,
    applyingHistory: false,
    modeChart: null,
    toastTimer: null,
  };

  const tableState = {
    city: "",
    query: "",
    sector: "all",
    status: "all",
    sort: "name",
    direction: "asc",
    visible: ["name", "role", "base", "status", "ticker", "revenue", "employees", "valuation", "asOf", "confidence"],
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const h = (value) => esc(value);

  function readJson(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return value ?? fallback;
    } catch (_) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (_) {
      // Private browsing or blocked storage must not break the research flow.
    }
  }

  const savedCompare = readJson("atlas.v21.compare", null);
  if (savedCompare?.cities && savedCompare?.companies) state.compare = savedCompare;
  state.watch = readJson("atlas.v21.watch", []);
  const savedColumns = readJson("atlas.v21.columns", null);
  if (Array.isArray(savedColumns) && savedColumns.includes("name")) tableState.visible = savedColumns;

  function cityProvince(city) {
    return provinces.find((province) => province.cities.includes(city));
  }

  function currentProvince() {
    return provinceNavActive ? selected : null;
  }

  function currentCity() {
    return focusedCity || "";
  }

  function evidenceMeta(city, province) {
    if (!city || !province) {
      return { depth: "D1", label: "区域索引", completeness: null, confidence: "基础", updated: enterpriseMeta.asOf || "2026-07-26" };
    }
    const profile = cityProfiles[city];
    const stats = cityStats[city] || {};
    const records = enterpriseCityCatalog(city, province);
    const evidence = cityIndustryEvidence[city] || profile?.industryEvidence || [];
    let completeness = 30;
    if (profile) completeness += 18;
    if (stats.gdp) completeness += 10;
    if (stats.growth) completeness += 8;
    if (stats.population) completeness += 7;
    completeness += Math.min(15, records.length);
    completeness += Math.min(12, evidence.length * 2);
    completeness = Math.min(99, completeness);
    const isD3 = city === "南通" && records.length >= 19 && evidence.length >= 6;
    const isD2 = !isD3 && profile && records.length >= 3 && evidence.length >= 3;
    return {
      depth: isD3 ? "D3" : isD2 ? "D2" : "D1",
      label: isD3 ? "深度尽调样板" : isD2 ? "多源企业证据" : "基础城市画像",
      completeness,
      confidence: isD3 ? "较高" : isD2 ? "中等" : "基础",
      updated: stats.asOf || profile?.updatedAt || cityProfileMeta.asOf || enterpriseMeta.asOf || "2026-07-26",
    };
  }

  function companyConfidence(company) {
    if (!company.generated && company.source && company.asOf) return "较高";
    if (company.source && (company.ticker || company.dataset === "CURATED")) return "中等";
    return "待补";
  }

  function toast(message) {
    const el = $("#v21Toast");
    if (!el) return;
    window.clearTimeout(state.toastTimer);
    el.textContent = message;
    el.classList.add("show");
    state.toastTimer = window.setTimeout(() => el.classList.remove("show"), 2400);
  }

  function urlForState() {
    const url = new URL(window.location.href);
    const province = currentProvince();
    const city = currentCity();
    url.searchParams.set("mode", state.mode);
    if (province) url.searchParams.set("province", province.name);
    else url.searchParams.delete("province");
    if (city) url.searchParams.set("city", city);
    else url.searchParams.delete("city");
    if (activeIndustry && activeIndustry !== "all") url.searchParams.set("industry", activeIndustry);
    else url.searchParams.delete("industry");
    if (state.currentCompany) url.searchParams.set("company", state.currentCompany);
    else url.searchParams.delete("company");
    if (state.mapView !== "map") url.searchParams.set("view", state.mapView);
    else url.searchParams.delete("view");
    if (state.compare.cities.length) url.searchParams.set("cities", state.compare.cities.join(","));
    else url.searchParams.delete("cities");
    if (state.compare.companies.length) url.searchParams.set("companies", state.compare.companies.join(","));
    else url.searchParams.delete("companies");
    url.hash = state.mode === "explore" ? "atlas" : "workbench";
    return url;
  }

  function syncUrl(push = false) {
    if (state.applyingHistory) return;
    const url = urlForState();
    window.history[push ? "pushState" : "replaceState"]({ atlasV21: true }, "", url);
  }

  function updateContext() {
    const province = currentProvince();
    const city = currentCity();
    const meta = evidenceMeta(city, province);
    const crumb = ["<span>中国</span>"];
    if (province) crumb.push("<i>/</i>", `<span>${h(province.name)}</span>`);
    crumb.push("<i>/</i>", `<strong>${h(city || province?.name || "全国")}</strong>`);
    $("#v21Breadcrumb").innerHTML = crumb.join("");
    $("#v21Depth").textContent = `${meta.depth} · ${meta.label}`;
    $("#v21Updated").textContent = `更新 ${meta.updated}`;
    $("#v21Completeness").textContent = meta.completeness == null ? "完整度 —" : `完整度 ${meta.completeness}%`;
    const watched = city && state.watch.some((item) => item.type === "city" && item.name === city);
    $("#v21AddWatch").textContent = watched ? "★ 已观察" : "☆ 观察";
    renderCityList();
    renderCompareTray();
  }

  function setMode(mode, options = {}) {
    const next = MODES.includes(mode) ? mode : "explore";
    state.mode = next;
    document.body.dataset.v21Mode = next;
    $$("[data-v21-mode]").forEach((button) => {
      const active = button.dataset.v21Mode === next;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", String(active));
      button.tabIndex = active ? 0 : -1;
    });
    const copy = MODE_COPY[next];
    $("#v21ModeDescription").textContent = copy.lead;
    const workbench = $("#v21ModeWorkbench");
    workbench.hidden = next === "explore";
    if (next !== "explore") {
      $("#v21WorkbenchEyebrow").textContent = copy.eyebrow;
      $("#v21WorkbenchTitle").textContent = copy.title;
      $("#v21WorkbenchLead").textContent = copy.lead;
      renderModeWorkbench();
    } else if (state.modeChart) {
      state.modeChart.dispose();
      state.modeChart = null;
    }
    if (options.push !== false) syncUrl(true);
    if (options.focus) (next === "explore" ? $("#atlas") : workbench)?.scrollIntoView({ block: "start", behavior: "smooth" });
  }

  function compareCitySet() {
    const seeds = [currentCity(), ...state.compare.cities, "南通", "深圳", "苏州", "合肥"].filter(Boolean);
    return [...new Set(seeds)].slice(0, 4);
  }

  function renderModeWorkbench() {
    if (state.modeChart) {
      state.modeChart.dispose();
      state.modeChart = null;
    }
    if (state.mode === "investor") renderInvestorWorkbench();
    if (state.mode === "policy") renderPolicyWorkbench();
    if (state.mode === "learn") renderLearnWorkbench();
  }

  function renderInvestorWorkbench() {
    const canvas = $("#v21ModeCanvas");
    const cities = compareCitySet();
    const rows = cities.map((city) => {
      const province = cityProvince(city);
      const profile = province ? cityData(city, province) : null;
      return province
        ? { city, province, profile, score: cityInvestmentScore(city, province), companies: enterpriseCityCatalog(city, province).length }
        : null;
    }).filter(Boolean);
    const watched = state.watch.filter((item) => item.type === "city");
    const province = currentProvince();
    const city = currentCity();
    const profile = city ? cityProfiles[city] : null;
    const risks = [...new Set([...(profile?.risks || []), ...(province?.risks || [])])].slice(0, 6);
    const cityCompanies = city && province ? enterpriseCityCatalog(city, province) : [];
    const companyNames = [...new Set([...state.compare.companies, ...cityCompanies.slice(0, 4).map((item) => item.name)])].slice(0, 6);
    canvas.innerHTML = `
      <div class="v21WorkbenchGrid">
        <div class="v21WorkbenchStack">
          <article class="v21TaskCard">
            <header><div><h3>城市可比证据</h3><p>最多 4 城；分数是区域研究适配度，不是收益预测。</p></div><span class="v21EvidencePill">同一数据底座</span></header>
            <div class="v21TaskCardBody"><div class="v21MetricGrid">${rows.map((row) => `<div class="v21Metric"><b>${h(row.score)}</b><span>${h(row.city)} · 产业适配度</span><small>${h(row.province.name)} · ${row.companies} 家企业样本</small></div>`).join("")}</div></div>
          </article>
          <article class="v21TaskCard">
            <header><div><h3>城市指标比较</h3><p>研究指数 · 0–100 · 数据期间 2026 研究快照</p></div><small>来源：省域数据与城市企业证据</small></header>
            <div id="v21InvestorChart" class="v21Chart" role="img" aria-label="${h(cities.join("、"))}的投资观察、制造、创新和数字经济研究指数条形图"></div>
            <div class="v21ChartMeta"><span>摘要：用于发现差异并提出核验问题；不同城市的数据深度并不完全相同。</span><span>单位：研究指数</span></div>
          </article>
          <article class="v21TaskCard">
            <header><div><h3>企业比较队列</h3><p>最多 6 家；财务缺失值保持为空，不用估算补齐。</p></div><span class="v21Confidence ${companyNames.length ? "" : "low"}">${companyNames.length ? "已有样本" : "待加入"}</span></header>
            <div class="v21TaskCardBody v21CompareRows">${companyNames.length ? companyNames.map((name) => {
              const company = companyByName(name);
              return company ? `<div class="v21CompareRow"><strong>${h(company.name)}</strong><span>${h(company.city)} · ${h(company.role)} · ${h(company.ticker || "非独立上市")}</span><em>${h(companyConfidence(company))}可信度</em></div>` : "";
            }).join("") : stateHtml("empty", "尚未加入企业", "从企业表格加入最多 6 家企业后，可在这里并列核验代码、角色、口径和来源。")}</div>
          </article>
        </div>
        <aside class="v21WorkbenchStack">
          <article class="v21TaskCard">
            <header><div><h3>${h(city || "当前城市")} · Bull / Bear</h3><p>把论点和反证放在一起。</p></div></header>
            <div class="v21TaskCardBody v21RiskList">
              <div class="v21RiskRow"><strong>Bull 观察</strong><span>${h(profile?.thesis || "选择城市后显示基于本地企业证据的研究论点。")}</span><em>需继续核验</em></div>
              ${risks.length ? risks.map((risk) => `<div class="v21RiskRow"><strong>Bear / 风险</strong><span>${h(risk)}</span><em>反证项</em></div>`).join("") : stateHtml("low", "证据不足", "当前没有足够的城市级风险字段，请转到来源与政策风险区继续核验。")}
            </div>
          </article>
          <article class="v21TaskCard">
            <header><div><h3>观察名单</h3><p>仅保存在当前浏览器。</p></div></header>
            <div class="v21TaskCardBody v21CompareRows">${watched.length ? watched.map((item) => `<div class="v21CompareRow"><strong>${h(item.name)}</strong><span>${h(item.province || "城市观察")}</span><button type="button" data-v21-watch-open="${h(item.name)}">打开</button></div>`).join("") : stateHtml("empty", "观察名单为空", "在城市上下文栏点击“观察”，即可保存待跟踪城市。")}</div>
          </article>
        </aside>
      </div>`;
    bindModeCityLinks(canvas);
    $$("[data-v21-watch-open]", canvas).forEach((button) => button.addEventListener("click", () => goToCity(button.dataset.v21WatchOpen, { mode: "investor" })));
    const chartEl = $("#v21InvestorChart");
    if (chartEl && window.echarts && rows.length) {
      state.modeChart = echarts.init(chartEl);
      state.modeChart.setOption({
        aria: { enabled: true, description: "城市研究指数分组条形图。数值仅用于区域适配度比较。" },
        dataset: {
          source: [["城市", "投资观察", "先进制造", "科技创新", "数字经济"], ...rows.map((row) => [row.city, row.province.investment, row.province.manufacturing, row.province.innovation, row.province.digital])],
        },
        color: ["#70e4d2", "#7297ff", "#a987ff", "#79e6af"],
        legend: { top: 12, textStyle: { color: "#93a8b1", fontSize: 11 } },
        tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
        grid: { left: 44, right: 18, top: 58, bottom: 32 },
        xAxis: { type: "category", axisLabel: { color: "#93a8b1" }, axisLine: { lineStyle: { color: "rgba(132,211,215,.15)" } } },
        yAxis: { type: "value", min: 50, max: 100, axisLabel: { color: "#6e8793" }, splitLine: { lineStyle: { color: "rgba(132,211,215,.08)" } } },
        series: ["投资观察", "先进制造", "科技创新", "数字经济"].map(() => ({ type: "bar", barMaxWidth: 24 })),
      });
    }
  }

  function stateHtml(type, title, message) {
    const icon = type === "error" ? "!" : type === "offline" ? "↯" : type === "low" ? "?" : "○";
    return `<div class="v21State"><span class="v21StateIcon" aria-hidden="true">${icon}</span><div><h4>${h(title)}</h4><p>${h(message)}</p></div></div>`;
  }

  function tokenMatches(text, segment) {
    const source = String(text || "");
    return String(segment || "").split(/[、/与及和（）()·]/).map((item) => item.trim()).filter((item) => item.length >= 2).some((item) => source.includes(item));
  }

  function renderPolicyWorkbench() {
    const canvas = $("#v21ModeCanvas");
    const province = currentProvince();
    const city = currentCity();
    if (!province || !city) {
      canvas.innerHTML = `${stateHtml("empty", "先选择一座城市", "Policy 工作台需要城市上下文，才能把本地企业样本映射到产业链并显示证据缺口。")}<div class="v21CaseList" style="margin-top:12px">${["南通", "合肥", "深圳", "苏州"].map((name) => `<button class="v21CaseButton" data-v21-city="${name}" type="button"><strong>${name}</strong><span>打开城市后生成价值链证据矩阵</span><em>进入 →</em></button>`).join("")}</div>`;
      bindModeCityLinks(canvas);
      return;
    }
    const profile = cityProfiles[city];
    const topSector = activeIndustry !== "all" ? sectorById(activeIndustry) : sectorById(profile?.industryEvidence?.[0]?.id || citySectorScores(city, province)[0]?.id);
    const sector = topSector || taxonomy[0];
    const local = companiesForSector(city, province, sector.id);
    const nodes = sector.segments.map((segment) => {
      const matches = local.filter((company) => tokenMatches(`${company.role} ${company.description}`, segment));
      return { segment, matches, coverage: matches.length ? "strong" : "gap" };
    });
    const candidates = enterprises.filter((company) => company.city !== city && companyMatchesSector(company, sector.id) && company.source).slice(0, 6);
    const risks = [...new Set([...(profile?.risks || []), ...province.risks])].slice(0, 6);
    canvas.innerHTML = `
      <div class="v21WorkbenchStack">
        <article class="v21TaskCard">
          <header><div><h3>${h(city)} · 产业链证据矩阵</h3><p>文本匹配推导，不等于项目落地或产能事实。</p></div><label><span class="srOnly">选择产业链</span><select id="v21PolicyIndustry">${taxonomy.map((item) => `<option value="${item.id}" ${item.id === sector.id ? "selected" : ""}>${h(item.label)}</option>`).join("")}</select></label></header>
          <div class="v21TaskCardBody"><div class="v21GapMatrix">${nodes.map((node) => `<div class="v21GapNode" data-coverage="${node.coverage}"><b>${h(node.segment)}</b><span>${node.matches.length ? `${node.matches.length} 家企业角色文本命中` : "未发现节点级文本证据"}</span></div>`).join("")}</div></div>
          <div class="v21ChartMeta"><span>摘要：绿色表示企业公开业务描述出现节点关键词；黄色表示结构化证据待补。需继续核验基地、产线、客户和产能。</span><span>期间：2026-07-26 快照</span></div>
        </article>
        <div class="v21WorkbenchGrid">
          <div class="v21WorkbenchStack">
            <article class="v21TaskCard">
              <header><div><h3>结构匹配企业</h3><p>来自其他城市的同产业样本；不代表迁移、投资或扩产意愿。</p></div><span class="v21Confidence low">研究推导</span></header>
              <div class="v21TaskCardBody v21CandidateList">${candidates.length ? candidates.map((company) => `<div class="v21Candidate"><strong>${h(company.name)}</strong><span>${h(company.city)} · ${h(company.role)}</span><button type="button" data-v21-company-compare="${h(company.name)}">加入企业比较</button></div>`).join("") : stateHtml("empty", "暂无结构匹配样本", "当前产业筛选下没有足够的异地企业来源记录。")}</div>
            </article>
            <article class="v21TaskCard">
              <header><div><h3>融资与重大项目</h3><p>只展示可核验结构化记录。</p></div><span class="v21Confidence low">Empty state</span></header>
              <div class="v21TaskCardBody">${stateHtml("empty", "暂无结构化项目记录", "项目名称、投资主体、金额、地点、阶段、日期和来源尚未形成统一可核验数据，因此不使用新闻线索补数。")}<div class="v21StageRail" aria-label="项目阶段字段">${PROJECT_STAGES.map((stage) => `<span>${stage}</span>`).join("")}</div></div>
            </article>
          </div>
          <aside class="v21WorkbenchStack">
            <article class="v21TaskCard">
              <header><div><h3>生产要素</h3><p>省域背景，不直接替代城市级地块、能耗和用工核验。</p></div></header>
              <div class="v21TaskCardBody v21RiskList"><div class="v21RiskRow"><strong>自然与承载</strong><span>${h(province.nature)}</span><em>省域口径</em></div><div class="v21RiskRow"><strong>人才与商业生态</strong><span>${h(province.humanities)}</span><em>省域口径</em></div></div>
            </article>
            <article class="v21TaskCard">
              <header><div><h3>政策与执行风险</h3><p>政策方向与项目执行事实分开。</p></div></header>
              <div class="v21TaskCardBody v21RiskList"><div class="v21RiskRow"><strong>政策背景</strong><span>${h(province.policy)}</span><em>方向性</em></div>${risks.map((risk) => `<div class="v21RiskRow"><strong>核验项</strong><span>${h(risk)}</span><em>风险</em></div>`).join("")}</div>
            </article>
          </aside>
        </div>
      </div>`;
    $("#v21PolicyIndustry")?.addEventListener("change", (event) => {
      activeIndustry = event.target.value;
      renderControls();
      renderMap();
      renderPolicyWorkbench();
      syncUrl(false);
    });
    bindCompanyCompareButtons(canvas);
  }

  function renderLearnWorkbench() {
    const canvas = $("#v21ModeCanvas");
    const selectedCase = LEARN_CASES.find((item) => item.id === state.learnCase) || LEARN_CASES[0];
    const province = cityProvince(selectedCase.city);
    const profile = cityProfiles[selectedCase.city];
    const records = province ? enterpriseCityCatalog(selectedCase.city, province).filter((company) => companyMatchesSector(company, selectedCase.industry)) : [];
    const sector = sectorById(selectedCase.industry);
    const risks = profile?.risks || province?.risks || [];
    canvas.innerHTML = `
      <div class="v21WorkbenchGrid">
        <aside class="v21TaskCard">
          <header><div><h3>案例路径</h3><p>点击案例会显式切换城市上下文。</p></div></header>
          <div class="v21TaskCardBody v21CaseList">${LEARN_CASES.map((item) => `<button class="v21CaseButton ${item.id === selectedCase.id ? "active" : ""}" data-v21-case="${item.id}" type="button"><strong>${h(item.title)}</strong><span>${h(item.question)}</span><em>${item.id === selectedCase.id ? "当前" : "打开"}</em></button>`).join("")}</div>
        </aside>
        <div class="v21WorkbenchStack">
          <article class="v21TaskCard">
            <header><div><h3>${h(selectedCase.title)} · Evidence → Thesis</h3><p>${h(selectedCase.question)}</p></div><span class="v21EvidencePill">教学案例</span></header>
            <div class="v21TaskCardBody v21RiskList">
              <div class="v21RiskRow"><strong>观察 Observation</strong><span>${h(profile ? `${profile.position}；本地已收录 ${profile.localEnterpriseCount} 家企业，${profile.locallyEvidencedIndustries} 个重点产业有直接企业样本。` : "城市基础画像可用，专项证据仍需补充。")}</span><em>数据事实</em></div>
              <div class="v21RiskRow"><strong>企业证据</strong><span>${h(records.length ? records.slice(0, 6).map((item) => item.name).join("、") : "本地专项企业样本不足")}</span><em>${records.length} 家</em></div>
              <div class="v21RiskRow"><strong>推理 Inference</strong><span>${h(profile?.thesis || `沿${sector?.label || "目标产业"}价值链提出假设，并逐项核验产线、客户与资本开支。`)}</span><em>研究判断</em></div>
              <div class="v21RiskRow"><strong>Bull 练习</strong><span>哪些本地企业与价值链节点形成相互印证？哪些来源能证明持续投入而不是一次性项目？</span><em>支持证据</em></div>
              <div class="v21RiskRow"><strong>Bear 练习</strong><span>${h(risks.slice(0, 4).join("；") || "识别产业同质化、单一客户、要素约束与政策兑现风险。")}</span><em>反证</em></div>
              <div class="v21RiskRow"><strong>下一步</strong><span>打开企业来源，核验年报业务分部、城市基地、员工口径、重大项目阶段与政策执行结果。</span><em>行动</em></div>
            </div>
          </article>
          <article class="v21TaskCard">
            <header><div><h3>模拟研究组合</h3><p>分配注意力，而非真实资金；总和可独立调整。</p></div><span class="v21Confidence low">教育用途</span></header>
            <div class="v21TaskCardBody" id="v21LearningPortfolio">
              ${[["链条证据",40],["企业披露",30],["政策项目",20],["风险储备",10]].map(([label,value]) => `<label class="v21PortfolioRow"><span>${label}</span><input type="range" min="0" max="100" value="${value}" data-v21-allocation="${label}"><output>${value}%</output></label>`).join("")}
              <p id="v21PortfolioSummary">当前注意力分配合计 100%。这只是尽调练习，不代表资产配置建议。</p>
            </div>
          </article>
        </div>
      </div>`;
    $$("[data-v21-case]", canvas).forEach((button) => button.addEventListener("click", async () => {
      state.learnCase = button.dataset.v21Case;
      const next = LEARN_CASES.find((item) => item.id === state.learnCase);
      await goToCity(next.city, { mode: "learn", push: true });
      renderLearnWorkbench();
    }));
    $$("[data-v21-allocation]", canvas).forEach((input) => input.addEventListener("input", () => {
      input.nextElementSibling.textContent = `${input.value}%`;
      const total = $$("[data-v21-allocation]", canvas).reduce((sum, item) => sum + Number(item.value), 0);
      $("#v21PortfolioSummary").textContent = `当前注意力分配合计 ${total}%。这只是尽调练习，不代表资产配置建议。`;
    }));
  }

  function bindModeCityLinks(root) {
    $$("[data-v21-city]", root).forEach((button) => button.addEventListener("click", () => goToCity(button.dataset.v21City, { mode: state.mode })));
  }

  function addCityCompare(city) {
    if (!city) return toast("请先选择城市，再加入比较。");
    if (state.compare.cities.includes(city)) return toast(`${city} 已在城市比较中。`);
    if (state.compare.cities.length >= 4) return toast("城市比较最多 4 个，请先移除一项。");
    state.compare.cities.push(city);
    persistCompare();
    toast(`已将 ${city} 加入城市比较。`);
  }

  function addCompanyCompare(name) {
    if (!name) return;
    if (state.compare.companies.includes(name)) return toast(`${name} 已在企业比较中。`);
    if (state.compare.companies.length >= 6) return toast("企业比较最多 6 家，请先移除一项。");
    state.compare.companies.push(name);
    persistCompare();
    toast(`已将 ${name} 加入企业比较。`);
  }

  function persistCompare() {
    writeJson("atlas.v21.compare", state.compare);
    renderCompareTray();
    syncUrl(false);
    if (state.mode === "investor") renderInvestorWorkbench();
  }

  function renderCompareTray() {
    const tray = $("#v21CompareTray");
    const items = [
      ...state.compare.cities.map((name) => ({ type: "city", name })),
      ...state.compare.companies.map((name) => ({ type: "company", name })),
    ];
    tray.hidden = !items.length;
    $("#v21CompareTrayTitle").textContent = `${state.compare.cities.length} 城 · ${state.compare.companies.length} 企`;
    $("#v21CompareItems").innerHTML = items.map((item) => `<span class="v21TrayItem">${item.type === "city" ? "城市" : "企业"} · ${h(item.name)}<button type="button" data-v21-remove-type="${item.type}" data-v21-remove-name="${h(item.name)}" aria-label="移除 ${h(item.name)}">×</button></span>`).join("");
    $$("[data-v21-remove-name]", tray).forEach((button) => button.addEventListener("click", () => {
      const list = button.dataset.v21RemoveType === "city" ? state.compare.cities : state.compare.companies;
      const index = list.indexOf(button.dataset.v21RemoveName);
      if (index >= 0) list.splice(index, 1);
      persistCompare();
    }));
  }

  function bindCompanyCompareButtons(root = document) {
    $$("[data-v21-company-compare]", root).forEach((button) => button.addEventListener("click", () => addCompanyCompare(button.dataset.v21CompanyCompare)));
  }

  function toggleWatch() {
    const city = currentCity();
    const province = currentProvince();
    if (!city || !province) return toast("请先选择城市，再加入观察名单。");
    const index = state.watch.findIndex((item) => item.type === "city" && item.name === city);
    if (index >= 0) {
      state.watch.splice(index, 1);
      toast(`已从观察名单移除 ${city}。`);
    } else {
      state.watch.push({ type: "city", name: city, province: province.name, addedAt: new Date().toISOString().slice(0, 10) });
      toast(`已将 ${city} 加入观察名单。`);
    }
    writeJson("atlas.v21.watch", state.watch);
    updateContext();
    if (state.mode === "investor") renderInvestorWorkbench();
  }

  function renderCityList(query = "") {
    const list = $("#v21CityList");
    if (!list) return;
    const province = currentProvince();
    const candidates = province
      ? province.cities.map((city) => ({ city, province }))
      : provinces.flatMap((item) => item.cities.map((city) => ({ city, province: item })));
    const normalized = query.trim().toLowerCase();
    const filtered = candidates.filter(({ city, province: item }) => {
      if (!normalized) return true;
      const data = cityData(city, item);
      return [city, item.name, data.base, data.emerging, data.angle].join(" ").toLowerCase().includes(normalized);
    });
    list.innerHTML = filtered.map(({ city, province: item }) => {
      const data = cityData(city, item);
      const top = citySectorScores(city, item).slice(0, 2).map((entry) => entry.label).join(" · ");
      return `<button class="v21CityEntry ${city === currentCity() ? "active" : ""}" data-v21-list-city="${h(city)}" type="button"><header><strong>${h(city)}</strong><span>${h(item.name)} · ${h(data.grade)}级</span></header><small>${h(top)}</small><em>${enterpriseCityCatalog(city, item).length} 家企业样本 →</em></button>`;
    }).join("") || stateHtml("empty", "没有匹配城市", "调整关键词，或返回地图选择省份。 ");
    $$("[data-v21-list-city]", list).forEach((button) => button.addEventListener("click", () => goToCity(button.dataset.v21ListCity, { mode: "explore", push: true })));
  }

  function setMapView(view, push = true) {
    state.mapView = view === "list" ? "list" : "map";
    const list = $("#v21CityListPanel");
    const map = $(".mapWrap");
    list.hidden = state.mapView !== "list";
    map.hidden = state.mapView === "list";
    $$("[data-v21-map-view]").forEach((button) => {
      const active = button.dataset.v21MapView === state.mapView;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    if (state.mapView === "map") window.setTimeout(() => mapChart?.resize(), 40);
    if (push) syncUrl(false);
  }

  function sourceItems() {
    const province = currentProvince();
    const city = currentCity();
    const stats = city ? cityStats[city] || {} : {};
    const items = [];
    if (stats.source) items.push({ title: `${city}官方统计`, note: stats.asOf || "城市统计口径", url: stats.source });
    if (stats.source2) items.push({ title: `${city}经济普查或补充来源`, note: "城市主体与就业口径", url: stats.source2 });
    if (city && province) {
      enterpriseCityCatalog(city, province).slice(0, 8).forEach((company) => {
        if (company.source) items.push({ title: company.name, note: `${company.sourceLabel || "企业/交易所披露"} · ${company.asOf || "持续更新"}`, url: company.source });
      });
    }
    sources.slice(0, city ? 5 : sources.length).forEach((source) => items.push({ title: source.title, note: `${source.org} · ${source.date} · ${source.use}`, url: source.url }));
    return items;
  }

  function openSources() {
    const drawer = $("#v21SourceDrawer");
    state.priorFocus = document.activeElement;
    $("#v21SourceContent").innerHTML = sourceItems().map((item) => `<article class="v21SourceItem"><b>${h(item.title)}</b><span>${h(item.note)}</span><a href="${h(item.url)}" target="_blank" rel="noopener">打开原始来源 ↗</a></article>`).join("") || stateHtml("empty", "暂无来源", "当前上下文还没有可显示的结构化来源。 ");
    drawer.hidden = false;
    document.body.style.overflow = "hidden";
    $("[data-v21-close='sources']", drawer)?.focus();
  }

  function closeDialog(name) {
    const element = name === "palette" ? $("#v21Palette") : $("#v21SourceDrawer");
    element.hidden = true;
    document.body.style.overflow = "";
    if (name === "palette") $("#v21PaletteInput").setAttribute("aria-expanded", "false");
    state.priorFocus?.focus?.();
  }

  function paletteCatalog() {
    const items = [];
    provinces.forEach((province) => {
      items.push({ type: "province", label: province.name, meta: `${province.region} · ${province.cities.length} 城`, province: province.name, search: `${province.name} ${province.mapName} ${province.region}` });
      province.cities.forEach((city) => {
        const data = cityData(city, province);
        items.push({ type: "city", label: city, meta: `${province.name} · ${data.level}`, city, province: province.name, search: `${city} ${province.name} ${data.base} ${data.emerging}` });
      });
    });
    enterprises.forEach((company) => items.push({ type: "company", label: company.name, meta: `${company.city} · ${company.ticker || company.status} · ${company.role}`, company: company.name, city: company.city, search: `${company.name} ${company.legalName || ""} ${company.ticker} ${company.role} ${company.description}` }));
    taxonomy.forEach((industry) => {
      items.push({ type: "industry", label: industry.label, meta: `${industry.group} · 6 个价值链节点`, industry: industry.id, search: `${industry.label} ${industry.group} ${(industry.keywords || []).join(" ")}` });
      industry.segments.forEach((node) => items.push({ type: "node", label: node, meta: `${industry.label} · 价值链节点`, industry: industry.id, search: `${node} ${industry.label}` }));
    });
    items.push({ type: "project", label: "融资与重大项目阶段", meta: "规划 → 运营 · 当前城市结构化记录", search: `项目 ${PROJECT_STAGES.join(" ")}` });
    items.push({ type: "policy", label: "政策执行与风险", meta: "进入 Policy 工作台", search: "政策 招商 执行 风险 产业链缺口" });
    return items;
  }

  function paletteMatches(query) {
    const q = query.trim().toLowerCase();
    const priority = { city: 0, company: 1, province: 2, industry: 3, node: 4, project: 5, policy: 6 };
    const preferred = q ? state.paletteItems.filter((item) => `${item.label} ${item.search}`.toLowerCase().includes(q)) : state.paletteItems.filter((item) => ["南通", "深圳", "苏州", "合肥", "集成电路与光电子", "人工智能、算力与数据"].includes(item.label) || ["project", "policy"].includes(item.type));
    return preferred.sort((a, b) => (a.label.startsWith(query) ? -1 : 0) - (b.label.startsWith(query) ? -1 : 0) || priority[a.type] - priority[b.type]).slice(0, 42);
  }

  function renderPalette(query = "") {
    const results = paletteMatches(query);
    state.paletteIndex = Math.min(state.paletteIndex, Math.max(0, results.length - 1));
    const grouped = new Map();
    results.forEach((item) => {
      if (!grouped.has(item.type)) grouped.set(item.type, []);
      grouped.get(item.type).push(item);
    });
    const container = $("#v21PaletteResults");
    let index = 0;
    container.innerHTML = results.length
      ? [...grouped.entries()].map(([type, entries]) => `<section class="v21ResultGroup"><strong>${GROUP_LABELS[type]}</strong>${entries.map((item) => {
          const current = index++;
          return `<div class="v21ResultOption" id="v21-result-${current}" role="option" aria-selected="${current === state.paletteIndex}" data-v21-result-index="${current}"><span class="v21ResultIcon">${GROUP_ICONS[type]}</span><span><b>${h(item.label)}</b><small>${h(item.meta)}</small></span><em>Enter ↵</em></div>`;
        }).join("")}</section>`).join("")
      : stateHtml("empty", "没有匹配结果", "尝试城市、企业全称、股票代码、产业或价值链节点。 ");
    container._v21Results = results;
    const input = $("#v21PaletteInput");
    input.setAttribute("aria-activedescendant", results.length ? `v21-result-${state.paletteIndex}` : "");
    $$("[data-v21-result-index]", container).forEach((option) => {
      option.addEventListener("mousemove", () => setPaletteIndex(Number(option.dataset.v21ResultIndex)));
      option.addEventListener("click", () => activatePaletteItem(container._v21Results[Number(option.dataset.v21ResultIndex)]));
    });
  }

  function setPaletteIndex(index) {
    const container = $("#v21PaletteResults");
    const results = container._v21Results || [];
    if (!results.length) return;
    state.paletteIndex = (index + results.length) % results.length;
    $$("[data-v21-result-index]", container).forEach((option) => option.setAttribute("aria-selected", String(Number(option.dataset.v21ResultIndex) === state.paletteIndex)));
    const active = $(`#v21-result-${state.paletteIndex}`, container);
    $("#v21PaletteInput").setAttribute("aria-activedescendant", active?.id || "");
    active?.scrollIntoView({ block: "nearest" });
  }

  function openPalette() {
    const dialog = $("#v21Palette");
    state.priorFocus = document.activeElement;
    dialog.hidden = false;
    document.body.style.overflow = "hidden";
    const input = $("#v21PaletteInput");
    input.setAttribute("aria-expanded", "true");
    input.value = "";
    state.paletteIndex = 0;
    renderPalette();
    input.focus();
  }

  async function activatePaletteItem(item) {
    if (!item) return;
    closeDialog("palette");
    if (item.type === "province") {
      setMode("explore", { push: false });
      await drillProvince(byName[item.province]);
    } else if (item.type === "city") {
      await goToCity(item.city, { mode: "explore", push: true });
    } else if (item.type === "company") {
      state.currentCompany = item.company;
      await goToCity(item.city, { mode: "explore", push: false });
      activeEnterpriseQuery = item.company;
      activeTab = "enterprises";
      renderDetail();
      syncUrl(true);
    } else if (item.type === "industry" || item.type === "node") {
      activeIndustry = item.industry;
      setMode("explore", { push: false });
      renderControls();
      renderMap();
      syncUrl(true);
      $("#atlas")?.scrollIntoView({ block: "start", behavior: "smooth" });
    } else {
      setMode("policy", { push: true, focus: true });
    }
  }

  async function goToCity(city, options = {}) {
    const province = cityProvince(city);
    if (!province) return toast(`暂未找到 ${city} 的城市索引。`);
    const mode = options.mode || state.mode;
    state.applyingHistory = true;
    try {
      await drillProvince(province);
      selectCityFocus(city, province, false);
    } finally {
      state.applyingHistory = false;
    }
    setMode(mode, { push: false });
    updateContext();
    syncUrl(options.push !== false);
  }

  function focusTrap(event, dialog) {
    if (event.key !== "Tab") return;
    const focusable = $$("button:not([disabled]), input:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex='-1'])", dialog).filter((item) => !item.hidden);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function enhancedCityOverview(city, province) {
    const data = cityData(city, province);
    const stats = cityStats[city] || {};
    const profile = cityProfiles[city];
    const records = enterpriseCityCatalog(city, province);
    const evidence = (cityIndustryEvidence[city] || generatedEvidence(city, province)).slice(0, 6);
    const top = citySectorScores(city, province).slice(0, 5);
    const meta = evidenceMeta(city, province);
    const kpis = [
      [stats.gdp || "未建立城市独立值", "GDP"],
      [stats.growth || "使用省域基线", "最新增速"],
      [stats.population || "待查最新公报", "常住人口"],
      [`${records.length} 家`, "已收录企业"],
    ];
    const sourceLinks = [
      stats.source ? `<a href="${h(stats.source)}" target="_blank" rel="noopener">官方统计公报 ↗</a>` : "",
      stats.source2 ? `<a href="${h(stats.source2)}" target="_blank" rel="noopener">经济普查/补充来源 ↗</a>` : "",
    ].filter(Boolean);
    $("#detailBody").innerHTML = `
      <div class="v21CityResearch">
        <section class="v21CityHero" id="v21-city-summary">
          <div class="v21CityHeroTop"><div><span class="sectionEyebrow">${meta.depth} · ${h(meta.label)}</span><h3>${h(city)}</h3><p>${h(province.name)} · ${h(data.level)} · ${h(stats.position || profile?.position || data.angle)}</p></div><div class="v21CompletenessRing" style="--value:${meta.completeness || 0}"><div><b>${meta.completeness || "—"}%</b><span>数据完整度</span></div></div></div>
          <div class="tagRow">${top.map((item, index) => `<span class="tag ${index < 2 ? "hot" : ""}">${h(item.label)} ${item.score}</span>`).join("")}</div>
          <div class="v21KpiStrip">${kpis.map(([value, label]) => `<div><b>${h(value)}</b><span>${h(label)}</span></div>`).join("")}</div>
        </section>
        <nav class="v21CityTabs" aria-label="城市研究章节">${[["overview","Overview"],["chains","Industry Chains"],["companies","Companies"],["projects","Capital & Projects"],["factors","Production Factors"],["risks","Policy & Risks"],["province","Province Context"],["sources","Sources"]].map(([id,label]) => `<button type="button" data-v21-section="${id}">${label}</button>`).join("")}</nav>
        <section class="v21ResearchSection" id="v21-section-overview"><header><h4>Overview · 城市摘要</h4><span>${meta.confidence}可信度 · 更新 ${h(meta.updated)}</span></header><p>${h(profile?.thesis || data.angle)}</p>${profile ? `<div class="v21MetricGrid"><div class="v21Metric"><b>${profile.locallyEvidencedIndustries}</b><span>有本地企业证据的产业</span></div><div class="v21Metric"><b>${profile.localSectorCount}</b><span>企业涉及产业链</span></div><div class="v21Metric"><b>${profile.listedOrQuotedCount}</b><span>上市 / 挂牌样本</span></div><div class="v21Metric"><b>${profile.grade}级</b><span>城市资料层级</span></div></div>` : stateHtml("low", "基础画像", "当前城市以企业样本和省域结构为主，城市级专项指标需继续补充。")}</section>
        <section class="v21ResearchSection" id="v21-section-chains"><header><h4>Industry Chains · 产业链证据</h4><span>本地样本优先；省域推导明确标注</span></header><div class="v21IndustryRows">${evidence.map((item) => {
          const companies = companiesForSector(city, province, item.sector);
          return `<div class="v21IndustryRow"><b>${h(item.title || sectorLabel(item.sector))}</b><span>${h(item.metric || item.why || "需继续核验产业主体")}</span><em>${companies.length ? `${companies.length} 家本地样本` : "本地样本待补"}</em></div>`;
        }).join("")}</div></section>
        <section class="v21ResearchSection" id="v21-section-companies"><header><h4>Companies · 企业证据</h4><span>${records.length} 家已收录代表企业</span></header><div class="v21IndustryRows">${records.slice(0, 8).map((company) => `<div class="v21IndustryRow"><b><button class="textBtn" type="button" data-v21-open-company="${h(company.name)}">${h(company.name)}</button></b><span>${h(company.role)} · ${h(company.ticker || company.status)}</span><em>${h(companyConfidence(company))}</em></div>`).join("")}</div><button class="actionBtn" id="v21OpenEnterpriseTable" type="button">打开专业企业数据表 →</button></section>
        <section class="v21ResearchSection" id="v21-section-projects"><header><h4>Capital & Projects · 融资与重大项目</h4><span>结构化证据状态</span></header>${stateHtml("empty", "暂无统一可核验的项目记录", "项目名称、投资主体、金额、地点、阶段、日期与来源尚未形成统一数据。页面不会用新闻传闻补齐。") }<div class="v21StageRail" aria-label="项目阶段字段">${PROJECT_STAGES.map((stage) => `<span>${stage}</span>`).join("")}</div></section>
        <section class="v21ResearchSection" id="v21-section-factors"><header><h4>Production Factors · 生产要素</h4><span>省域背景 · 需城市级核验</span></header><div class="v21RiskList"><div class="v21RiskRow"><strong>自然与承载</strong><span>${h(province.nature)}</span><em>省域口径</em></div><div class="v21RiskRow"><strong>人才与商业生态</strong><span>${h(province.humanities)}</span><em>省域口径</em></div>${stats.detail ? `<div class="v21RiskRow"><strong>城市统计补充</strong><span>${h(stats.detail)}</span><em>城市来源</em></div>` : ""}</div></section>
        <section class="v21ResearchSection" id="v21-section-risks"><header><h4>Policy & Risks · 政策与风险</h4><span>政策方向不等于执行结果</span></header><div class="v21RiskList"><div class="v21RiskRow"><strong>政策背景</strong><span>${h(province.policy)}</span><em>省域方向</em></div>${[...new Set([...(profile?.risks || []), ...province.risks])].map((risk) => `<div class="v21RiskRow"><strong>核验风险</strong><span>${h(risk)}</span><em>反证项</em></div>`).join("")}</div></section>
        <details class="v21ProvinceContext" id="v21-section-province"><summary>Province Context · ${h(province.name)}省域背景（默认折叠）</summary><div><p>${h(province.role)}</p><div class="v21MetricGrid"><div class="v21Metric"><b>${h(province.gdp)} 万亿元</b><span>省域 GDP 研究基线</span></div><div class="v21Metric"><b>${h(province.growth)}%</b><span>省域增速研究基线</span></div><div class="v21Metric"><b>${h(province.mix.join(" / "))}</b><span>三次产业占比</span></div><div class="v21Metric"><b>${h(province.investment)}</b><span>省域投资观察</span></div></div><p>${h(province.outlook)}</p></div></details>
        <section class="v21ResearchSection" id="v21-section-sources"><header><h4>Sources · 数据来源</h4><span>点击打开原始页面</span></header>${sourceLinks.length ? `<div class="companyLinks">${sourceLinks.join("")}</div>` : stateHtml("low", "城市专项来源待补", "当前主要依赖企业官方披露与省域背景；请在来源抽屉继续核验。") }<button class="actionBtn" type="button" id="v21OpenSourceDrawerInline">查看当前全部来源 →</button></section>
      </div>`;
    $$("[data-v21-section]", $("#detailBody")).forEach((button) => button.addEventListener("click", () => $(`#v21-section-${button.dataset.v21Section}`)?.scrollIntoView({ block: "start", behavior: "smooth" })));
    $("#v21OpenEnterpriseTable")?.addEventListener("click", () => { activeTab = "enterprises"; renderDetail(); });
    $$("[data-v21-open-company]", $("#detailBody")).forEach((button) => button.addEventListener("click", () => { state.currentCompany = button.dataset.v21OpenCompany; activeEnterpriseQuery = button.dataset.v21OpenCompany; activeTab = "enterprises"; renderDetail(); syncUrl(false); }));
    $("#v21OpenSourceDrawerInline")?.addEventListener("click", openSources);
  }

  const columnDefs = [
    { id: "name", label: "企业名称", value: (company) => company.name },
    { id: "role", label: "产业链角色", value: (company) => company.role },
    { id: "base", label: "总部 / 生产基地", value: (company) => `${company.city}（注册/核心运营口径）` },
    { id: "status", label: "上市状态", value: (company) => company.status },
    { id: "ticker", label: "股票代码", value: (company) => company.ticker },
    { id: "revenue", label: "营收", value: (company) => company.revenue },
    { id: "revenueGrowth", label: "营收增速", value: (company) => company.revenueGrowth || company.revenue_growth },
    { id: "grossMargin", label: "毛利率", value: (company) => company.grossMargin || company.gross_margin },
    { id: "rdRatio", label: "研发费用率", value: (company) => company.rdRatio || company.rd_ratio },
    { id: "employees", label: "员工数及口径", value: (company) => company.employees },
    { id: "valuation", label: "市值 / 估值类型", value: (company) => company.valuation },
    { id: "asOf", label: "数据日期", value: (company) => company.asOf },
    { id: "confidence", label: "可信度", value: (company) => companyConfidence(company) },
  ];

  function tableValue(company, id) {
    return columnDefs.find((column) => column.id === id)?.value(company) || "";
  }

  function filteredCompanies(records) {
    const query = tableState.query.toLowerCase();
    const filtered = records.filter((company) => {
      const text = [company.name, company.legalName, company.role, company.description, company.ticker, company.city].join(" ").toLowerCase();
      return (!query || text.includes(query)) && (tableState.sector === "all" || companyMatchesSector(company, tableState.sector)) && (tableState.status === "all" || (tableState.status === "listed" ? Boolean(company.ticker) : !company.ticker));
    });
    const direction = tableState.direction === "asc" ? 1 : -1;
    return filtered.sort((a, b) => String(tableValue(a, tableState.sort) || "").localeCompare(String(tableValue(b, tableState.sort) || ""), "zh-CN", { numeric: true }) * direction);
  }

  function cellHtml(company, column) {
    const raw = column.value(company);
    if (column.id === "name") return `<button type="button" data-v21-company-detail="${h(company.name)}">${h(company.name)}</button><br><button type="button" class="textBtn" data-v21-company-compare="${h(company.name)}">＋企业比较</button>`;
    return raw ? h(raw) : `<span class="v21Missing">未披露 / 未录入</span>`;
  }

  function tableMarkup(records) {
    const visible = columnDefs.filter((column) => tableState.visible.includes(column.id));
    return `<table class="v21EnterpriseTable"><thead><tr>${visible.map((column) => `<th><button type="button" data-v21-sort="${column.id}">${h(column.label)}${tableState.sort === column.id ? (tableState.direction === "asc" ? " ↑" : " ↓") : ""}</button></th>`).join("")}</tr></thead><tbody>${records.map((company) => `<tr>${visible.map((column) => `<td>${cellHtml(company, column)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  }

  function mobileCardsMarkup(records) {
    return records.map((company) => `<article class="v21CompanyCard"><header><h4>${h(company.name)}</h4><span>${h(company.status)}</span></header><p>${h(company.role)}</p><dl><dt>产业链</dt><dd>${h(companySectorIds(company).map(sectorLabel).join(" / "))}</dd><dt>代码</dt><dd>${h(company.ticker || "非独立上市")}</dd><dt>营收</dt><dd>${h(company.revenue || "未披露 / 未录入")}</dd><dt>员工口径</dt><dd>${h(company.employees || "未单独披露")}</dd><dt>可信度</dt><dd>${h(companyConfidence(company))}</dd></dl><button type="button" data-v21-company-detail="${h(company.name)}">展开企业证据</button><button type="button" data-v21-company-compare="${h(company.name)}">＋ 加入企业比较</button></article>`).join("");
  }

  function companyDetailHtml(company) {
    if (!company) return "";
    return `<article class="v21CompanyDetail"><h4>${h(company.name)} · 企业证据抽屉</h4><p>${h(company.description || company.role)}</p><p>产业链：${h(companySectorIds(company).map(sectorLabel).join(" / "))}<br>所有制：${h(company.ownership || "待核验")} · 成立：${h(company.founded || "未录入")} · 数据：${h(company.asOf || "持续更新")}<br>入选口径：${h(company.rankBasis || "已收录代表企业样本，不等同工商全量名录")}</p><div class="companyLinks">${company.source ? `<a href="${h(company.source)}" target="_blank" rel="noopener">${h(company.sourceLabel || "官方/年报来源")} ↗</a>` : ""}${company.source2 ? `<a href="${h(company.source2)}" target="_blank" rel="noopener">${h(company.source2Label || "企业背景")} ↗</a>` : ""}</div></article>`;
  }

  function enhancedEnterpriseTable(province) {
    const city = currentCity();
    if (!city) {
      $("#detailBody").innerHTML = stateHtml("empty", "请先选择城市", "企业库以城市为主键。可通过地图、城市列表或命令面板定位。 ");
      return;
    }
    const records = enterpriseCityCatalog(city, province);
    const sectors = [...new Set(records.flatMap(companySectorIds))];
    if (tableState.city !== city) {
      tableState.city = city;
      tableState.query = activeEnterpriseQuery || "";
      tableState.sector = activeEnterpriseSector || "all";
      tableState.status = activeEnterpriseStatus || "all";
    }
    $("#detailBody").innerHTML = `
      <div class="v21EnterpriseShell">
        <header class="v21EnterpriseHeader"><div><h3>${h(city)} · 专业企业数据表</h3><p>${records.length} 家已收录代表企业；缺失财务字段保持为空。员工通常为集团口径，不等于本地就业。</p></div><div class="v21EnterpriseHeaderActions"><button type="button" id="v21ColumnsButton" aria-expanded="false" aria-controls="v21ColumnMenu">列显隐</button><button type="button" id="v21SaveView">保存筛选视图</button><button type="button" id="v21ExportCsv">导出当前结果</button></div></header>
        <div class="v21EnterpriseFilters"><input id="v21EnterpriseSearch" type="search" placeholder="搜索企业、业务或代码" value="${h(tableState.query)}"><select id="v21EnterpriseSector"><option value="all">全部产业</option>${sectors.map((id) => `<option value="${id}" ${id === tableState.sector ? "selected" : ""}>${h(sectorLabel(id))}</option>`).join("")}</select><select id="v21EnterpriseStatus"><option value="all">全部上市状态</option><option value="listed" ${tableState.status === "listed" ? "selected" : ""}>上市 / 挂牌</option><option value="private" ${tableState.status === "private" ? "selected" : ""}>非上市 / 集团子公司</option></select></div>
        <div class="v21ColumnMenu" id="v21ColumnMenu" hidden>${columnDefs.map((column) => `<label><input type="checkbox" value="${column.id}" ${tableState.visible.includes(column.id) ? "checked" : ""} ${column.id === "name" ? "disabled" : ""}>${h(column.label)}</label>`).join("")}</div>
        <div id="v21CompanyDetail">${companyDetailHtml(companyByName(state.currentCompany))}</div>
        <div class="v21EnterpriseCount" id="v21EnterpriseCount"></div>
        <div class="v21TableWrap" id="v21TableWrap"></div>
        <div class="v21MobileCompanyCards" id="v21MobileCompanyCards"></div>
        <div class="coverageNote">${h(enterpriseMeta.coverage || "")}<br>${h(enterpriseMeta.marketNote || "")}</div>
      </div>`;

    const rerender = () => {
      const filtered = filteredCompanies(records);
      $("#v21EnterpriseCount").textContent = `显示 ${filtered.length} / ${records.length} 家 · 数据日期 ${enterpriseMeta.asOf || "2026"}`;
      $("#v21TableWrap").innerHTML = filtered.length ? tableMarkup(filtered) : stateHtml("empty", "没有符合筛选条件的企业", "调整关键词、产业或上市状态。 ");
      $("#v21MobileCompanyCards").innerHTML = filtered.length ? mobileCardsMarkup(filtered) : stateHtml("empty", "没有符合筛选条件的企业", "调整关键词、产业或上市状态。 ");
      $$("[data-v21-sort]", $("#detailBody")).forEach((button) => button.addEventListener("click", () => {
        if (tableState.sort === button.dataset.v21Sort) tableState.direction = tableState.direction === "asc" ? "desc" : "asc";
        else { tableState.sort = button.dataset.v21Sort; tableState.direction = "asc"; }
        rerender();
      }));
      $$("[data-v21-company-detail]", $("#detailBody")).forEach((button) => button.addEventListener("click", () => {
        state.currentCompany = button.dataset.v21CompanyDetail;
        $("#v21CompanyDetail").innerHTML = companyDetailHtml(companyByName(state.currentCompany));
        syncUrl(false);
      }));
      bindCompanyCompareButtons($("#detailBody"));
      return filtered;
    };

    let currentFiltered = rerender();
    $("#v21EnterpriseSearch").addEventListener("input", (event) => { tableState.query = event.target.value.trim(); activeEnterpriseQuery = tableState.query; currentFiltered = rerender(); });
    $("#v21EnterpriseSector").addEventListener("change", (event) => { tableState.sector = event.target.value; activeEnterpriseSector = tableState.sector; currentFiltered = rerender(); });
    $("#v21EnterpriseStatus").addEventListener("change", (event) => { tableState.status = event.target.value; activeEnterpriseStatus = tableState.status; currentFiltered = rerender(); });
    $("#v21ColumnsButton").addEventListener("click", (event) => {
      const menu = $("#v21ColumnMenu");
      menu.hidden = !menu.hidden;
      event.currentTarget.setAttribute("aria-expanded", String(!menu.hidden));
    });
    $$("#v21ColumnMenu input").forEach((input) => input.addEventListener("change", () => {
      tableState.visible = ["name", ...$$("#v21ColumnMenu input:checked").map((item) => item.value).filter((id) => id !== "name")];
      writeJson("atlas.v21.columns", tableState.visible);
      currentFiltered = rerender();
    }));
    $("#v21SaveView").addEventListener("click", () => {
      writeJson("atlas.v21.savedView", { query: tableState.query, sector: tableState.sector, status: tableState.status, sort: tableState.sort, direction: tableState.direction, visible: tableState.visible });
      toast("筛选视图已保存在当前浏览器。");
    });
    $("#v21ExportCsv").addEventListener("click", () => exportCompaniesCsv(currentFiltered));
  }

  function exportCompaniesCsv(records) {
    const visible = columnDefs.filter((column) => tableState.visible.includes(column.id));
    const quote = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const csv = [visible.map((column) => quote(column.label)).join(","), ...records.map((company) => visible.map((column) => quote(column.value(company))).join(","))].join("\n");
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${tableState.city}-企业筛选-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast(`已导出 ${records.length} 家企业。`);
  }

  const baseRenderCityFirstOverview = renderCityFirstOverview;
  const baseRenderEnterprises = renderEnterprises;
  const baseSelectCityFocus = selectCityFocus;
  const baseDrillProvince = drillProvince;
  const baseInitNational = initNational;

  renderCityFirstOverview = enhancedCityOverview;
  renderEnterprises = enhancedEnterpriseTable;
  selectCityFocus = function v21SelectCityFocus(city, province, scrollDetail = true, featureName = null) {
    const result = baseSelectCityFocus(city, province, scrollDetail, featureName);
    updateContext();
    if (state.mode !== "explore") renderModeWorkbench();
    syncUrl(false);
    return result;
  };
  drillProvince = async function v21DrillProvince(province, cityToFocus = null) {
    const result = await baseDrillProvince(province, cityToFocus);
    updateContext();
    syncUrl(false);
    return result;
  };
  initNational = async function v21InitNational() {
    const result = await baseInitNational();
    state.currentCompany = "";
    updateContext();
    syncUrl(false);
    return result;
  };

  function setConnection(online) {
    const element = $("#v21Connection");
    element.dataset.state = online ? "online" : "offline";
    element.querySelector("span").textContent = online ? "本地数据就绪" : "离线 · 本地核心可用";
    if (!online) toast("当前离线：本地地图、城市与企业数据仍可使用；外部来源和实时市值不可用。");
  }

  async function applyUrlState(push = false) {
    const params = new URLSearchParams(window.location.search);
    state.applyingHistory = true;
    try {
      const mode = MODES.includes(params.get("mode")) ? params.get("mode") : "explore";
      const industry = params.get("industry");
      if (industry && sectorById(industry)) activeIndustry = industry;
      state.currentCompany = params.get("company") || "";
      state.mapView = params.get("view") === "list" ? "list" : "map";
      const urlCities = (params.get("cities") || "").split(",").filter((city) => cityProvince(city)).slice(0, 4);
      const urlCompanies = (params.get("companies") || "").split(",").filter((name) => companyByName(name)).slice(0, 6);
      if (urlCities.length) state.compare.cities = urlCities;
      if (urlCompanies.length) state.compare.companies = urlCompanies;
      const city = params.get("city");
      const provinceName = params.get("province");
      const province = city ? cityProvince(city) : byName[provinceName];
      if (province) {
        await baseDrillProvince(province);
        if (city && province.cities.includes(city)) baseSelectCityFocus(city, province, false);
      }
      setMode(mode, { push: false });
      setMapView(state.mapView, false);
      if (state.currentCompany && currentCity()) {
        activeEnterpriseQuery = state.currentCompany;
        activeTab = "enterprises";
        renderDetail();
      }
      renderControls();
      renderMap();
      updateContext();
    } finally {
      state.applyingHistory = false;
    }
    syncUrl(push);
  }

  document.body.classList.add("v21-ready");
  state.paletteItems = paletteCatalog();
  [["overview", "城市研究"], ["enterprises", "企业数据"], ["chains", "产业链"], ["cities", "城市列表"], ["evidence", "证据 / 来源"]].forEach(([tab, label]) => {
    const button = $(`[data-tab='${tab}']`);
    if (button) button.textContent = label;
  });
  $$("[data-v21-mode]").forEach((button) => button.addEventListener("click", () => setMode(button.dataset.v21Mode, { push: true, focus: true })));
  $("#v21CommandTrigger").addEventListener("click", openPalette);
  $("#v21PaletteInput").addEventListener("input", (event) => { state.paletteIndex = 0; renderPalette(event.target.value); });
  $("#v21PaletteInput").addEventListener("keydown", (event) => {
    const results = $("#v21PaletteResults")._v21Results || [];
    if (event.key === "ArrowDown") { event.preventDefault(); setPaletteIndex(state.paletteIndex + 1); }
    if (event.key === "ArrowUp") { event.preventDefault(); setPaletteIndex(state.paletteIndex - 1); }
    if (event.key === "Enter") { event.preventDefault(); activatePaletteItem(results[state.paletteIndex]); }
  });
  $$("[data-v21-close]").forEach((button) => button.addEventListener("click", () => closeDialog(button.dataset.v21Close)));
  $("#v21OpenSources").addEventListener("click", openSources);
  $("#v21AddCompare").addEventListener("click", () => addCityCompare(currentCity()));
  $("#v21AddWatch").addEventListener("click", toggleWatch);
  $("#v21CopyLink").addEventListener("click", async () => {
    const link = urlForState().toString();
    try { await navigator.clipboard.writeText(link); toast("可分享研究链接已复制。 "); }
    catch (_) { toast("复制失败，请从地址栏复制当前链接。 "); }
  });
  $("#v21ClearCompare").addEventListener("click", () => { state.compare = { cities: [], companies: [] }; persistCompare(); });
  $("#v21OpenCompare").addEventListener("click", () => setMode("investor", { push: true, focus: true }));
  $("#v21ToggleContextMap").addEventListener("click", (event) => {
    const open = document.body.classList.toggle("v21-context-map-open");
    event.currentTarget.setAttribute("aria-expanded", String(open));
    event.currentTarget.textContent = open ? "收起地理背景" : "展开地理背景";
    if (open) window.setTimeout(() => mapChart?.resize(), 60);
  });
  $$("[data-v21-map-view]").forEach((button) => button.addEventListener("click", () => setMapView(button.dataset.v21MapView)));
  $("#v21CityListSearch").addEventListener("input", (event) => renderCityList(event.target.value));

  document.addEventListener("keydown", (event) => {
    const target = event.target;
    const typing = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || target?.isContentEditable;
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); openPalette(); return; }
    if (event.key === "/" && !typing && $("#v21Palette").hidden) { event.preventDefault(); openPalette(); return; }
    if (event.key === "Escape") {
      if (!$("#v21Palette").hidden) closeDialog("palette");
      else if (!$("#v21SourceDrawer").hidden) closeDialog("sources");
    }
    if (!$("#v21Palette").hidden) focusTrap(event, $("#v21Palette"));
    if (!$("#v21SourceDrawer").hidden) focusTrap(event, $("#v21SourceDrawer"));
  });
  window.addEventListener("online", () => setConnection(true));
  window.addEventListener("offline", () => setConnection(false));
  window.addEventListener("popstate", () => applyUrlState(false));
  window.addEventListener("resize", () => state.modeChart?.resize());
  setConnection(navigator.onLine);
  updateContext();
  renderCompareTray();
  renderCityList();
  setMapView("map", false);
  window.addEventListener("load", () => window.setTimeout(() => applyUrlState(false), 80), { once: true });
})();
