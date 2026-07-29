(function initAtlasV22() {
  "use strict";

  const STORAGE_KEY = "atlas.v22.workspaces";
  const TODAY = "2026-07-29";
  const POLICY_STAGES = ["研究候选", "已接触", "表达兴趣", "深度尽调", "签约", "建设", "投产"];
  const MODE_META = {
    investor: {
      title: "投资论点工作台",
      lead: "从研究对象和可比组开始，把证据、反证与待核验问题整理成可下载的研究备忘录。",
      kicker: "INVESTMENT THESIS WORKSPACE",
      steps: [
        ["研究设置", "定义对象与边界"],
        ["可比组", "主动选择同业"],
        ["论点压力测试", "证据、风险、反证"],
        ["研究备忘录", "形成可审阅成果"],
      ],
    },
    policy: {
      title: "产业链招商行动台",
      lead: "从补链任务进入，区分证据缺口、结构候选与真实项目状态，形成可执行招商简报。",
      kicker: "INDUSTRY ATTRACTION WORKSPACE",
      steps: [
        ["定义任务", "城市、链条与目的"],
        ["缺口诊断", "强、弱与待补"],
        ["候选资格", "理由与排除项"],
        ["项目管线", "责任人与下一步"],
      ],
    },
    learn: {
      title: "产业研究案例实验室",
      lead: "先观察和作答，再查看反馈；通过真实城市证据练习事实、推断、反证和复盘。",
      kicker: "EVIDENCE-LED CASE LAB",
      steps: [
        ["观察", "阅读案例资料包"],
        ["诊断", "选择证据并解释"],
        ["决策", "写下判断与信心"],
        ["论证", "寻找反证与推翻条件"],
        ["复盘", "查看完成度反馈"],
      ],
    },
  };
  const LEARN_CASES = [
    {
      id: "nantong",
      city: "南通",
      industry: "cleanenergy",
      title: "南通 · 海上风电产业链",
      objective: "区分本地企业证据、产业链推断与仍需核验的产能事实。",
      prompt: "现有企业样本能否支持南通形成海上风电装备集群的判断？",
    },
    {
      id: "hefei",
      city: "合肥",
      industry: "nev",
      title: "合肥 · 新能源汽车",
      objective: "识别整车、零部件和政策背景在论证中的不同证据等级。",
      prompt: "如何判断整车项目与本地供应链之间是否形成持续协同？",
    },
    {
      id: "shenzhen",
      city: "深圳",
      industry: "ai",
      title: "深圳 · 人工智能与算力",
      objective: "练习从硬件、算力和应用企业的交叉样本中建立并质疑产业论点。",
      prompt: "企业数量与产业集群质量之间还缺少哪些关键证据？",
    },
  ];

  const defaults = {
    investorStep: 0,
    investor: {
      subjectCity: "",
      industry: "all",
      horizon: "中期 · 2–5年",
      objective: "城市产业机会初筛",
      peerCities: [],
      selectedEvidence: [],
      thesis: "",
      catalysts: "",
      risks: "",
      invalidation: "",
      openQuestions: "",
      updatedAt: TODAY,
    },
    policyStep: 0,
    policy: {
      city: "",
      industry: "",
      taskType: "补链",
      selectedGap: "",
      shortlist: [],
      pipeline: [],
      updatedAt: TODAY,
    },
    learnCase: "nantong",
    learnAttempts: {},
  };

  const saved = readJson(STORAGE_KEY, {});
  const state = {
    ...defaults,
    ...saved,
    investor: { ...defaults.investor, ...(saved.investor || {}) },
    policy: { ...defaults.policy, ...(saved.policy || {}) },
    learnAttempts: saved.learnAttempts || {},
    renderFrame: 0,
  };

  function readJson(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key)) || fallback;
    } catch (_) {
      return fallback;
    }
  }

  function persist() {
    try {
      const snapshot = { ...state };
      delete snapshot.renderFrame;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch (_) {
      // A blocked storage context must not break the workbench.
    }
  }

  function escHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function toast(message) {
    const el = document.querySelector("#v21Toast");
    if (!el) return;
    el.textContent = message;
    el.classList.add("show");
    window.setTimeout(() => el.classList.remove("show"), 2600);
  }

  function currentMode() {
    return document.body.dataset.v21Mode || "explore";
  }

  function currentCityName() {
    try {
      if (typeof focusedCity !== "undefined" && focusedCity) return focusedCity;
    } catch (_) {
      // Fall through to URL state.
    }
    return new URL(window.location.href).searchParams.get("city") || "";
  }

  function provinceForCity(city) {
    return provinces.find((province) => province.cities.includes(city)) || null;
  }

  function cityOptions(selectedCity, excluded = []) {
    const blocked = new Set(excluded);
    return provinces.flatMap((province) => province.cities.map((city) => ({ city, province: province.name })))
      .filter((item) => !blocked.has(item.city))
      .map((item) => `<option value="${escHtml(item.city)}" ${item.city === selectedCity ? "selected" : ""}>${escHtml(item.city)} · ${escHtml(item.province)}</option>`)
      .join("");
  }

  function industryOptions(selectedId, includeAll = true) {
    return `${includeAll ? `<option value="all" ${selectedId === "all" ? "selected" : ""}>全部产业 · 先看城市整体</option>` : ""}${taxonomy.map((sector) => `<option value="${sector.id}" ${sector.id === selectedId ? "selected" : ""}>${escHtml(sector.label)}</option>`).join("")}`;
  }

  function cityCatalog(city) {
    const province = provinceForCity(city);
    if (!province) return [];
    return enterpriseCityCatalog(city, province);
  }

  function cityMeta(city) {
    const province = provinceForCity(city);
    const profile = cityProfiles[city];
    const records = cityCatalog(city);
    const evidence = profile?.industryEvidence || [];
    let completeness = 30;
    if (profile) completeness += 18;
    if (cityStats[city]?.gdp) completeness += 10;
    if (cityStats[city]?.growth) completeness += 8;
    if (cityStats[city]?.population) completeness += 7;
    completeness += Math.min(15, records.length);
    completeness += Math.min(12, evidence.length * 2);
    completeness = Math.min(99, completeness);
    const depth = city === "南通" && records.length >= 19 ? "D3" : profile && records.length >= 3 && evidence.length >= 3 ? "D2" : "D1";
    return {
      city,
      province,
      profile,
      records,
      evidence,
      completeness,
      depth,
      topIndustry: evidence[0]?.label || "待补城市专项产业证据",
      updated: cityStats[city]?.asOf || profile?.updatedAt || TODAY,
    };
  }

  function evidenceFacts(city, industryId = "all") {
    const meta = cityMeta(city);
    if (!meta.profile) return [];
    const industry = industryId === "all" ? meta.evidence[0] : meta.evidence.find((item) => item.id === industryId);
    const facts = [
      { id: "position", label: "城市定位", value: meta.profile.position, tag: "研究画像" },
      { id: "sample", label: "本地企业样本", value: `已收录 ${meta.records.length} 条本地企业记录；样本不等于工商全量。`, tag: "可计数" },
      { id: "industry", label: "产业链证据", value: industry ? `${industry.label}：${industry.basis}` : "当前产业尚无城市级结构化证据。", tag: industry?.localEnterpriseCount ? "本地证据" : "待补" },
      { id: "risk", label: "首要反证", value: meta.profile.risks?.[0] || "城市专项风险字段待补。", tag: "风险" },
    ];
    return facts;
  }

  function updateField(target, value) {
    const [group, field] = target.split(".");
    if (!state[group] || !(field in state[group])) return;
    state[group][field] = value;
    state[group].updatedAt = TODAY;
    persist();
  }

  function stepRail(mode, activeStep) {
    const meta = MODE_META[mode];
    return `<nav class="v22Steps" aria-label="${escHtml(meta.title)}步骤">${meta.steps.map(([title, detail], index) => `<button type="button" class="v22Step ${index === activeStep ? "active" : ""} ${index < activeStep ? "done" : ""}" data-v22-step="${index}" aria-current="${index === activeStep ? "step" : "false"}"><span class="v22StepNo">${index < activeStep ? "✓" : String(index + 1).padStart(2, "0")}</span><span class="v22StepText">${escHtml(title)}<small>${escHtml(detail)}</small></span></button>`).join("")}</nav>`;
  }

  function shell(mode, step, main, evidence) {
    const meta = MODE_META[mode];
    return `<div class="v22Shell" data-v22-workspace="${mode}">
      <aside class="v22Rail">
        <section class="v22RailCard"><span class="v22Kicker">${meta.kicker}</span><h3>${escHtml(meta.title)}</h3><p>工作记录仅保存在当前浏览器。切换城市不会自动改写已经建立的任务。</p></section>
        <section class="v22RailCard">${stepRail(mode, step)}</section>
        <button class="v22RailAction" type="button" data-v22-new="${mode}">＋ 新建${mode === "investor" ? "研究" : mode === "policy" ? "招商任务" : "案例练习"}</button>
      </aside>
      <main class="v22Main">${main}</main>
      <aside class="v22EvidenceRail">${evidence}</aside>
    </div>`;
  }

  function meter(label, value) {
    return `<div class="v22DataMeter"><div class="v22DataMeterHead"><span>${escHtml(label)}</span><strong>${value}%</strong></div><div class="v22DataMeterTrack"><i style="width:${value}%"></i></div></div>`;
  }

  function commonEvidenceRail(city, mode) {
    if (!city) {
      return `<section class="v22EvidenceCard"><span class="v22Kicker">DATA READINESS</span><h3>等待研究对象</h3><p>选择城市后才会计算证据深度和字段完整度。</p></section>`;
    }
    const meta = cityMeta(city);
    const limitations = mode === "policy"
      ? ["候选企业不代表投资或迁移意向", "人才、能耗、土地与项目数据尚未全国结构化", "省域背景不能替代城市落地尽调"]
      : ["企业样本不等于城市全量企业", "集团口径不等于本地就业或产值", "研究画像不构成估值或收益预测"];
    return `<section class="v22EvidenceCard"><span class="v22Kicker">DATA READINESS</span><h3>${escHtml(city)} · ${meta.depth}</h3><p>${escHtml(meta.province?.name || "")} · 更新 ${escHtml(meta.updated)}</p>${meter("结构化完整度", meta.completeness)}</section>
      <section class="v22EvidenceCard"><span class="v22Kicker">KNOWN LIMITS</span><h3>使用边界</h3><ul>${limitations.map((item) => `<li>${escHtml(item)}</li>`).join("")}</ul></section>
      <section class="v22EvidenceCard"><span class="v22Kicker">EVIDENCE</span><h3>核验原始来源</h3><p>打开当前城市、企业和产业数据的来源抽屉。关键结论应回到原始公告或年报复核。</p><button type="button" class="v22Button v22SourceButton" data-v22-open-sources>查看来源</button></section>`;
  }

  function renderInvestor() {
    const contextCity = currentCityName();
    if (!state.investor.subjectCity && contextCity) state.investor.subjectCity = contextCity;
    const step = Number(state.investorStep) || 0;
    const main = [renderInvestorSetup, renderInvestorPeers, renderInvestorThesis, renderInvestorMemo][step]();
    return shell("investor", step, main, commonEvidenceRail(state.investor.subjectCity, "investor"));
  }

  function renderInvestorSetup() {
    const analysis = state.investor;
    return `<section class="v22Panel"><header class="v22PanelHead"><div><span class="v22Kicker">01 · RESEARCH BRIEF</span><h2>先定义要回答的问题</h2><p>成熟投研流程从对象、期限和研究目的开始。当前城市只作为建议，不会自动建立固定比较组。</p></div><span class="v22Badge">本地自动保存</span></header>
      <div class="v22PanelBody"><div class="v22FormGrid">
        <label class="v22Field"><span>研究对象 · 城市</span><select data-v22-bind="investor.subjectCity" data-v22-rerender><option value="">请选择城市</option>${cityOptions(analysis.subjectCity)}</select><small>${contextCityCopy(analysis.subjectCity)}</small></label>
        <label class="v22Field"><span>产业范围</span><select data-v22-bind="investor.industry">${industryOptions(analysis.industry)}</select><small>选择“全部产业”时仅做城市层面的证据初筛。</small></label>
        <label class="v22Field"><span>研究期限</span><select data-v22-bind="investor.horizon">${["短期 · 0–2年", "中期 · 2–5年", "长期 · 5年以上"].map((item) => `<option ${item === analysis.horizon ? "selected" : ""}>${item}</option>`).join("")}</select></label>
        <label class="v22Field"><span>研究目的</span><select data-v22-bind="investor.objective">${["城市产业机会初筛", "产业链进入研究", "企业同业比较准备", "存量观察名单复核"].map((item) => `<option ${item === analysis.objective ? "selected" : ""}>${item}</option>`).join("")}</select></label>
      </div><div class="v22Notice">本工作台组织研究证据，不提供证券评级、估值结论或收益预测。没有一致数据期间的指标不会被强行合成排名。</div></div>
      <footer class="v22PanelFoot"><span>下一步由你主动建立可比组。</span><div class="v22Actions"><button type="button" class="v22Button primary" data-v22-next>建立可比组 →</button></div></footer></section>`;
  }

  function contextCityCopy(subjectCity) {
    const context = currentCityName();
    if (!context) return "当前 Explore 尚未选择城市。";
    return subjectCity === context ? `已沿用 Explore 当前城市：${context}` : `Explore 当前城市是 ${context}；研究对象已独立保存。`;
  }

  function peerReason(subject, peer) {
    const a = cityMeta(subject);
    const b = cityMeta(peer);
    if (a.province?.name === b.province?.name) return "同省产业与要素背景，可用于区域内部差异核验";
    if (a.topIndustry === b.topIndustry) return `首位证据产业同为“${a.topIndustry}”`;
    return "用户主动选择；需自行补充可比性理由";
  }

  function renderInvestorPeers() {
    const analysis = state.investor;
    const subject = analysis.subjectCity;
    if (!subject) return missingSubjectPanel("investor");
    const peerCities = analysis.peerCities.filter((city) => city !== subject && provinceForCity(city));
    const rows = [subject, ...peerCities];
    const excluded = [subject, ...peerCities];
    return `<section class="v22Panel"><header class="v22PanelHead"><div><span class="v22Kicker">02 · USER-BUILT PEER SET</span><h2>${escHtml(subject)} · 自定义可比组</h2><p>系统不再自动加入南通、深圳、苏州或合肥。每个可比对象均显示可比理由、样本量和数据缺口。</p></div><span class="v22Badge">${rows.length} / 4 城</span></header>
      <div class="v22PanelBody"><div class="v22InlineControl"><select id="v22PeerSelect" aria-label="选择要加入的可比城市"><option value="">选择可比城市</option>${cityOptions("", excluded)}</select><button type="button" class="v22Button" data-v22-add-peer>＋ 加入可比组</button></div>
        <div class="v22PeerTableWrap"><table class="v22PeerTable"><thead><tr><th>城市</th><th>可比理由</th><th>企业样本</th><th>首位产业证据</th><th>数据深度</th><th>完整度</th><th></th></tr></thead><tbody>${rows.map((city, index) => {
          const meta = cityMeta(city);
          return `<tr><td><strong>${escHtml(city)}</strong>${escHtml(meta.province?.name || "")}</td><td>${index === 0 ? "研究对象 · 比较基准" : escHtml(peerReason(subject, city))}</td><td>${meta.records.length} 条<br><span class="v22Badge">非工商全量</span></td><td>${escHtml(meta.topIndustry)}</td><td><span class="v22Status ${meta.depth === "D1" ? "weak" : "strong"}">${meta.depth}</span></td><td>${meta.completeness}%</td><td>${index ? `<button class="v22TinyButton" type="button" data-v22-remove-peer="${escHtml(city)}">移除</button>` : "—"}</td></tr>`;
        }).join("")}</tbody></table></div>
        ${peerCities.length ? "" : `<div class="v22Notice">当前还没有可比城市。可以继续研究单一城市，但备忘录会明确标记“未建立可比组”。</div>`}
      </div><footer class="v22PanelFoot"><button type="button" class="v22GhostButton" data-v22-prev>← 返回设置</button><button type="button" class="v22Button primary" data-v22-next>进入论点压力测试 →</button></footer></section>`;
  }

  function missingSubjectPanel(mode) {
    return `<section class="v22Panel"><header class="v22PanelHead"><div><h2>还没有研究对象</h2><p>请先返回第一步选择城市，再继续建立证据工作流。</p></div></header><div class="v22PanelBody"><div class="v22Notice">城市上下文不会被强制写入任务，避免切换地图时意外覆盖研究记录。</div></div><footer class="v22PanelFoot"><span></span><button type="button" class="v22Button primary" data-v22-step="0">返回第一步</button></footer></section>`;
  }

  function renderInvestorThesis() {
    const analysis = state.investor;
    if (!analysis.subjectCity) return missingSubjectPanel("investor");
    const facts = evidenceFacts(analysis.subjectCity, analysis.industry);
    return `<section class="v22Panel"><header class="v22PanelHead"><div><span class="v22Kicker">03 · THESIS STRESS TEST</span><h2>用证据支撑，也用反证限制结论</h2><p>先选择要引用的事实，再分别写下核心判断、催化剂、风险和推翻条件。</p></div><span class="v22Badge">${analysis.selectedEvidence.length} 条已选证据</span></header>
      <div class="v22PanelBody"><div class="v22EvidenceList">${facts.map((fact) => `<div class="v22EvidenceItem"><label><input type="checkbox" data-v22-investor-evidence="${fact.id}" ${analysis.selectedEvidence.includes(fact.id) ? "checked" : ""}><span><strong>${escHtml(fact.label)}</strong>${escHtml(fact.value)}</span></label><span class="v22Status ${fact.tag === "待补" ? "missing" : "strong"}">${escHtml(fact.tag)}</span></div>`).join("")}</div>
        <div class="v22FormGrid">
          <label class="v22Field wide"><span>核心判断 Thesis</span><textarea data-v22-bind="investor.thesis" placeholder="基于哪些事实，当前最值得继续验证的判断是什么？">${escHtml(analysis.thesis)}</textarea></label>
          <label class="v22Field"><span>催化因素 Catalysts</span><textarea data-v22-bind="investor.catalysts" placeholder="什么变化会增强判断？">${escHtml(analysis.catalysts)}</textarea></label>
          <label class="v22Field"><span>主要风险 Risks</span><textarea data-v22-bind="investor.risks" placeholder="哪些事实可能削弱判断？">${escHtml(analysis.risks)}</textarea></label>
          <label class="v22Field"><span>推翻条件 Invalidation</span><textarea data-v22-bind="investor.invalidation" placeholder="出现什么证据时必须放弃当前论点？">${escHtml(analysis.invalidation)}</textarea></label>
          <label class="v22Field"><span>待核验问题 Open questions</span><textarea data-v22-bind="investor.openQuestions" placeholder="下一轮需要查公告、年报或项目资料的具体问题。">${escHtml(analysis.openQuestions)}</textarea></label>
        </div></div><footer class="v22PanelFoot"><button type="button" class="v22GhostButton" data-v22-prev>← 返回可比组</button><button type="button" class="v22Button primary" data-v22-next>生成研究备忘录 →</button></footer></section>`;
  }

  function investorMemoMarkdown() {
    const a = state.investor;
    const meta = cityMeta(a.subjectCity);
    const selected = evidenceFacts(a.subjectCity, a.industry).filter((fact) => a.selectedEvidence.includes(fact.id));
    const industry = a.industry === "all" ? "城市整体" : taxonomy.find((item) => item.id === a.industry)?.label || a.industry;
    return `# ${a.subjectCity} · 投资研究备忘录\n\n- 研究目的：${a.objective}\n- 研究期限：${a.horizon}\n- 产业范围：${industry}\n- 数据深度：${meta.depth} / 完整度 ${meta.completeness}%\n- 可比城市：${a.peerCities.join("、") || "未建立可比组"}\n- 更新日期：${a.updatedAt}\n\n## 核心判断\n\n${a.thesis || "待填写"}\n\n## 已选证据\n\n${selected.length ? selected.map((fact) => `- ${fact.label}：${fact.value}`).join("\n") : "- 尚未选择证据"}\n\n## 催化因素\n\n${a.catalysts || "待填写"}\n\n## 主要风险\n\n${a.risks || "待填写"}\n\n## 推翻条件\n\n${a.invalidation || "待填写"}\n\n## 待核验问题\n\n${a.openQuestions || "待填写"}\n\n## 方法限制\n\n本备忘录由浏览器本地工作台生成。企业样本不等于工商全量；集团口径不等于本地就业或产值；区域产业适配不构成证券评级、估值或收益预测。关键结论应回到原始公告、统计公报和企业年报核验。\n`;
  }

  function renderInvestorMemo() {
    const a = state.investor;
    if (!a.subjectCity) return missingSubjectPanel("investor");
    const meta = cityMeta(a.subjectCity);
    const selected = evidenceFacts(a.subjectCity, a.industry).filter((fact) => a.selectedEvidence.includes(fact.id));
    return `<section class="v22Panel"><header class="v22PanelHead"><div><span class="v22Kicker">04 · REVIEWABLE OUTPUT</span><h2>研究备忘录</h2><p>这是一份研究工作底稿，不是投资建议。空字段会原样保留，便于下一轮继续完善。</p></div><span class="v22Status ${a.thesis && selected.length ? "strong" : "weak"}">${a.thesis && selected.length ? "可供审阅" : "尚待完善"}</span></header>
      <div class="v22PanelBody"><article class="v22Memo"><span class="v22Kicker">INVESTMENT RESEARCH MEMO</span><h3>${escHtml(a.subjectCity)} · ${escHtml(a.objective)}</h3><p>${escHtml(a.horizon)} · ${meta.depth} · 完整度 ${meta.completeness}% · 更新 ${escHtml(a.updatedAt)}</p>
        <h4>核心判断</h4><p>${escHtml(a.thesis || "待填写：返回上一步补充核心判断。")}</p>
        <h4>已选证据</h4>${selected.length ? `<ul>${selected.map((fact) => `<li><strong>${escHtml(fact.label)}：</strong>${escHtml(fact.value)}</li>`).join("")}</ul>` : `<p>尚未选择证据。</p>`}
        <h4>可比城市</h4><p>${escHtml(a.peerCities.join("、") || "未建立可比组；当前为单城市研究。")}</p>
        <div class="v22MemoFacts"><div class="v22MemoFact"><span><strong>催化因素</strong>${escHtml(a.catalysts || "待填写")}</span></div><div class="v22MemoFact"><span><strong>主要风险</strong>${escHtml(a.risks || "待填写")}</span></div><div class="v22MemoFact"><span><strong>推翻条件</strong>${escHtml(a.invalidation || "待填写")}</span></div><div class="v22MemoFact"><span><strong>待核验问题</strong>${escHtml(a.openQuestions || "待填写")}</span></div></div>
      </article></div><footer class="v22PanelFoot"><button type="button" class="v22GhostButton" data-v22-prev>← 返回编辑</button><div class="v22Actions"><button type="button" class="v22Button" data-v22-copy="investor">复制文本</button><button type="button" class="v22Button primary" data-v22-download="investor">下载 Markdown</button></div></footer></section>`;
  }

  function renderPolicy() {
    const contextCity = currentCityName();
    if (!state.policy.city && contextCity) state.policy.city = contextCity;
    if (!state.policy.industry && state.policy.city) state.policy.industry = cityMeta(state.policy.city).evidence[0]?.id || taxonomy[0].id;
    const step = Number(state.policyStep) || 0;
    const main = [renderPolicySetup, renderPolicyGaps, renderPolicyCandidates, renderPolicyPipeline][step]();
    return shell("policy", step, main, commonEvidenceRail(state.policy.city, "policy"));
  }

  function renderPolicySetup() {
    const p = state.policy;
    const tasks = [
      ["补链", "寻找缺失或证据薄弱的价值链节点"],
      ["强链", "识别现有集群的关键薄弱环节"],
      ["扩链", "寻找可延伸的上下游结构候选"],
      ["稳链", "记录供应、人才和要素风险"],
      ["项目监测", "管理已核实项目的下一步行动"],
      ["人才诊断", "标记需要新增数据的岗位与技能问题"],
    ];
    return `<section class="v22Panel"><header class="v22PanelHead"><div><span class="v22Kicker">01 · DEFINE THE ACTION</span><h2>这次产业工作要推动什么？</h2><p>先明确政策任务，再判断哪些字段已有证据、哪些只能作为研究假设。</p></div><span class="v22Badge">非意向预测</span></header><div class="v22PanelBody">
      <div class="v22TaskChoices">${tasks.map(([title, detail]) => `<button type="button" class="v22Choice ${p.taskType === title ? "active" : ""}" data-v22-policy-task="${title}"><strong>${title}</strong><span>${detail}</span></button>`).join("")}</div>
      <div class="v22FormGrid"><label class="v22Field"><span>目标城市</span><select data-v22-bind="policy.city" data-v22-rerender><option value="">请选择城市</option>${cityOptions(p.city)}</select></label><label class="v22Field"><span>目标产业链</span><select data-v22-bind="policy.industry" data-v22-rerender>${industryOptions(p.industry, false)}</select></label></div>
      <div class="v22Notice">本工作台只生成“结构性候选”和本地项目管理记录。候选企业不代表接触、投资、迁移或扩产意向。</div></div><footer class="v22PanelFoot"><span>当前任务：${escHtml(p.taskType)}</span><button type="button" class="v22Button primary" data-v22-next>诊断产业链缺口 →</button></footer></section>`;
  }

  function chainNodes() {
    const p = state.policy;
    const sector = taxonomy.find((item) => item.id === p.industry) || taxonomy[0];
    const local = cityCatalog(p.city).filter((company) => companyMatchesSector(company, sector.id));
    return sector.segments.map((segment) => {
      const tokens = String(segment).split(/[、/与及和（）()·]/).map((item) => item.trim()).filter((item) => item.length >= 2);
      const matches = local.filter((company) => tokens.some((token) => `${company.role || ""} ${company.description || ""}`.includes(token)));
      const status = matches.length >= 2 ? "strong" : matches.length === 1 ? "weak" : "missing";
      const label = status === "strong" ? "已有多条角色证据" : status === "weak" ? "单一样本 · 证据偏弱" : "未发现节点级文本证据";
      return { segment, matches, status, label };
    });
  }

  function renderPolicyGaps() {
    const p = state.policy;
    if (!p.city) return missingSubjectPanel("policy");
    const sector = taxonomy.find((item) => item.id === p.industry) || taxonomy[0];
    const nodes = chainNodes();
    return `<section class="v22Panel"><header class="v22PanelHead"><div><span class="v22Kicker">02 · EVIDENCE-LABELLED GAP</span><h2>${escHtml(p.city)} · ${escHtml(sector.label)}</h2><p>“缺口”仅指当前数据未发现节点级证据，不等于当地真实没有企业、产能或项目。</p></div><span class="v22Badge">${nodes.filter((node) => node.status === "strong").length} 强 · ${nodes.filter((node) => node.status === "weak").length} 弱 · ${nodes.filter((node) => node.status === "missing").length} 待补</span></header>
      <div class="v22PanelBody"><div class="v22GapList">${nodes.map((node) => `<div class="v22GapRow ${p.selectedGap === node.segment ? "selected" : ""}"><div><strong>${escHtml(node.segment)}</strong><span>${escHtml(node.label)}${node.matches.length ? `：${node.matches.slice(0, 3).map((item) => item.name).join("、")}` : ""}</span></div><button type="button" class="v22TinyButton" data-v22-select-gap="${escHtml(node.segment)}">${p.selectedGap === node.segment ? "已选为任务" : "设为目标节点"}</button></div>`).join("")}</div>
      <div class="v22Checklist"><div class="v22CheckItem"><strong>供应商与本地企业</strong><span>部分可用</span></div><div class="v22CheckItem"><strong>客户与实际采购关系</strong><span>待补</span></div><div class="v22CheckItem"><strong>人才与岗位缺口</strong><span>待补</span></div><div class="v22CheckItem"><strong>土地、能耗与环保容量</strong><span>待补</span></div><div class="v22CheckItem"><strong>物流与港口背景</strong><span>省域背景</span></div><div class="v22CheckItem"><strong>政策执行与兑现结果</strong><span>待补</span></div></div>
      </div><footer class="v22PanelFoot"><button type="button" class="v22GhostButton" data-v22-prev>← 返回任务</button><button type="button" class="v22Button primary" data-v22-next>筛选结构候选 →</button></footer></section>`;
  }

  function policyCandidates() {
    const p = state.policy;
    return enterprises
      .filter((company) => company.city !== p.city && company.source && companyMatchesSector(company, p.industry))
      .sort((a, b) => Number(Boolean(b.ticker)) - Number(Boolean(a.ticker)) || String(a.name).localeCompare(String(b.name), "zh-CN"))
      .slice(0, 12);
  }

  function renderPolicyCandidates() {
    const p = state.policy;
    if (!p.city) return missingSubjectPanel("policy");
    const sector = taxonomy.find((item) => item.id === p.industry) || taxonomy[0];
    const candidates = policyCandidates();
    return `<section class="v22Panel"><header class="v22PanelHead"><div><span class="v22Kicker">03 · QUALIFY, DO NOT IMPLY INTENT</span><h2>结构性招商候选</h2><p>候选来自其他城市的同产业公开样本。加入清单前同时展示推荐理由和必须排除的误解。</p></div><span class="v22Badge">已选 ${p.shortlist.length} 家</span></header><div class="v22PanelBody">
      <div class="v22CandidateList">${candidates.map((company) => {
        const selected = p.shortlist.includes(company.name);
        return `<div class="v22CandidateRow"><div class="v22CandidateMeta"><strong>${escHtml(company.name)} · ${escHtml(company.city)}</strong><span>资格理由：公开业务样本匹配“${escHtml(sector.label)}”；角色为 ${escHtml(company.role || "待核验")}。</span><em>排除项：未核实其投资、迁移、扩产意向，也未核实与 ${escHtml(p.city)} 的客户或供应关系。</em></div><button type="button" class="v22TinyButton" data-v22-shortlist="${escHtml(company.name)}">${selected ? "✓ 已加入" : "＋ 加入清单"}</button></div>`;
      }).join("") || `<div class="v22Notice">当前产业没有足够的异地公开企业样本。</div>`}</div></div>
      <footer class="v22PanelFoot"><button type="button" class="v22GhostButton" data-v22-prev>← 返回缺口</button><button type="button" class="v22Button primary" data-v22-next>进入项目管线 →</button></footer></section>`;
  }

  function ensurePipeline() {
    const known = new Set(state.policy.pipeline.map((item) => item.company));
    state.policy.shortlist.forEach((company) => {
      if (!known.has(company)) state.policy.pipeline.push({ company, stage: "研究候选", owner: "", nextAction: "", due: "" });
    });
    state.policy.pipeline = state.policy.pipeline.filter((item) => state.policy.shortlist.includes(item.company));
  }

  function policyBriefMarkdown() {
    const p = state.policy;
    const sector = taxonomy.find((item) => item.id === p.industry)?.label || p.industry;
    const nodes = chainNodes();
    return `# ${p.city} · ${sector}招商行动简报\n\n- 任务类型：${p.taskType}\n- 目标节点：${p.selectedGap || "待选择"}\n- 更新日期：${p.updatedAt}\n\n## 证据缺口\n\n${nodes.map((node) => `- ${node.segment}：${node.label}`).join("\n")}\n\n## 结构性候选\n\n${p.shortlist.length ? p.shortlist.map((name) => `- ${name}：同产业公开样本；未核实投资、迁移或扩产意向。`).join("\n") : "- 尚未建立候选清单"}\n\n## 项目管线\n\n${p.pipeline.length ? p.pipeline.map((item) => `- ${item.company} | ${item.stage} | 负责人：${item.owner || "待定"} | 下一步：${item.nextAction || "待定"} | 日期：${item.due || "待定"}`).join("\n") : "- 暂无本地项目记录"}\n\n## 数据缺口\n\n- 客户和实际采购关系待补\n- 城市级人才与岗位缺口待补\n- 土地、能耗、环保容量待补\n- 政策执行和兑现结果待补\n\n本简报用于组织招商研究，不表示任何企业已有投资、迁移、接触或扩产意向。\n`;
  }

  function renderPolicyPipeline() {
    const p = state.policy;
    if (!p.city) return missingSubjectPanel("policy");
    ensurePipeline();
    persist();
    return `<section class="v22Panel"><header class="v22PanelHead"><div><span class="v22Kicker">04 · ACTION PIPELINE</span><h2>候选与项目推进</h2><p>这里的阶段由用户自行维护。系统不会把结构候选自动标记为已接触或有投资意向。</p></div><span class="v22Badge">${p.pipeline.length} 条本地记录</span></header><div class="v22PanelBody">
      ${p.pipeline.length ? `<div class="v22Pipeline">${p.pipeline.map((item, index) => `<div class="v22PipelineRow"><strong>${escHtml(item.company)}</strong><select aria-label="${escHtml(item.company)}阶段" data-v22-pipeline="${index}" data-v22-pipeline-field="stage">${POLICY_STAGES.map((stage) => `<option ${stage === item.stage ? "selected" : ""}>${stage}</option>`).join("")}</select><input aria-label="${escHtml(item.company)}负责人" placeholder="负责人" value="${escHtml(item.owner)}" data-v22-pipeline="${index}" data-v22-pipeline-field="owner"><input aria-label="${escHtml(item.company)}下一步" placeholder="下一步行动" value="${escHtml(item.nextAction)}" data-v22-pipeline="${index}" data-v22-pipeline-field="nextAction"><input type="date" aria-label="${escHtml(item.company)}计划日期" value="${escHtml(item.due)}" data-v22-pipeline="${index}" data-v22-pipeline-field="due"></div>`).join("")}</div>` : `<div class="v22Notice">尚未加入结构候选。可以先下载一份仅包含缺口和数据待办的简报，或返回上一步建立候选清单。</div>`}
      <article class="v22Memo"><span class="v22Kicker">ATTRACTION BRIEF</span><h3>${escHtml(p.city)} · ${escHtml(p.taskType)}任务</h3><p>目标节点：${escHtml(p.selectedGap || "待选择")} · 候选 ${p.shortlist.length} 家 · 当前阶段均由用户维护。</p><h4>行动边界</h4><p>没有结构化客户、人才、能耗、土地或政策兑现数据时，简报将其列为待补，不生成影响测算。</p></article>
      </div><footer class="v22PanelFoot"><button type="button" class="v22GhostButton" data-v22-prev>← 返回候选</button><div class="v22Actions"><button type="button" class="v22Button" data-v22-copy="policy">复制简报</button><button type="button" class="v22Button primary" data-v22-download="policy">下载招商简报</button></div></footer></section>`;
  }

  function blankAttempt() {
    return { step: 0, selectedEvidence: [], diagnosis: "", decision: "", counterEvidence: "", invalidation: "", confidence: 50, completedAt: "" };
  }

  function activeCase() {
    return LEARN_CASES.find((item) => item.id === state.learnCase) || LEARN_CASES[0];
  }

  function activeAttempt() {
    if (!state.learnAttempts[state.learnCase]) state.learnAttempts[state.learnCase] = blankAttempt();
    return state.learnAttempts[state.learnCase];
  }

  function renderLearn() {
    const attempt = activeAttempt();
    const step = Math.min(4, Number(attempt.step) || 0);
    const main = [renderLearnObserve, renderLearnDiagnose, renderLearnDecide, renderLearnDefend, renderLearnDebrief][step]();
    const completed = Object.values(state.learnAttempts).filter((item) => item.completedAt).length;
    const evidence = `<section class="v22EvidenceCard"><span class="v22Kicker">LEARNING PROGRESS</span><h3>${completed} / ${LEARN_CASES.length} 案例完成</h3><p>进度保存在当前浏览器。完成度反馈不等于专业能力认证。</p><div class="v22Progress">${MODE_META.learn.steps.map(([name], index) => `<span class="${index <= step ? "active" : ""}">${escHtml(name)}</span>`).join("")}</div></section>
      <section class="v22EvidenceCard"><span class="v22Kicker">CASE OBJECTIVE</span><h3>${escHtml(activeCase().title)}</h3><p>${escHtml(activeCase().objective)}</p></section>
      <section class="v22EvidenceCard"><span class="v22Kicker">METHOD</span><h3>先作答，后反馈</h3><ul><li>事实与推断分开</li><li>至少选择一条证据</li><li>写下反证和推翻条件</li></ul><button type="button" class="v22Button v22SourceButton" data-v22-open-sources>查看来源</button></section>`;
    return shell("learn", step, main, evidence);
  }

  function renderLearnObserve() {
    const selected = activeCase();
    const meta = cityMeta(selected.city);
    const records = meta.records.filter((company) => companyMatchesSector(company, selected.industry));
    return `<section class="v22Panel"><header class="v22PanelHead"><div><span class="v22Kicker">01 · OBSERVE</span><h2>选择案例，先阅读资料包</h2><p>这一阶段只呈现已知事实和明确的数据边界，不展示参考结论。</p></div><span class="v22Badge">3 个精选案例</span></header><div class="v22PanelBody">
      <div class="v22CaseGrid">${LEARN_CASES.map((item) => `<button type="button" class="v22CaseCard ${item.id === selected.id ? "active" : ""}" data-v22-learn-case="${item.id}"><strong>${escHtml(item.title)}</strong><span>${escHtml(item.objective)}</span><small>${state.learnAttempts[item.id]?.completedAt ? "✓ 已完成，可重做" : "开始案例 →"}</small></button>`).join("")}</div>
      <div class="v22Packet"><article><h4>城市画像</h4><p>${escHtml(meta.profile?.position || "城市画像待补")}</p></article><article><h4>本地企业证据</h4><p>${records.length ? `${records.length} 家相关样本：${records.slice(0, 5).map((item) => item.name).join("、")}` : "当前专项企业样本不足"}</p></article><article><h4>已知未知项</h4><p>样本不代表企业全量；产能、客户、项目阶段和城市就业仍需回到原始资料核验。</p></article></div>
      <div class="v22Notice"><strong>案例问题：</strong>${escHtml(selected.prompt)}</div></div><footer class="v22PanelFoot"><span>下一步需要主动选择证据并写下诊断。</span><button type="button" class="v22Button primary" data-v22-learn-next>开始诊断 →</button></footer></section>`;
  }

  function learnFacts() {
    const c = activeCase();
    return evidenceFacts(c.city, c.industry);
  }

  function renderLearnDiagnose() {
    const a = activeAttempt();
    return `<section class="v22Panel"><header class="v22PanelHead"><div><span class="v22Kicker">02 · DIAGNOSE</span><h2>哪些是事实，哪些仍是推断？</h2><p>至少选择一条能够支持后续判断的证据，并解释它能证明什么、不能证明什么。</p></div><span class="v22Badge">${a.selectedEvidence.length} 条已选</span></header><div class="v22PanelBody">
      <div class="v22EvidenceList">${learnFacts().map((fact) => `<div class="v22EvidenceItem"><label><input type="checkbox" data-v22-learn-evidence="${fact.id}" ${a.selectedEvidence.includes(fact.id) ? "checked" : ""}><span><strong>${escHtml(fact.label)}</strong>${escHtml(fact.value)}</span></label><span class="v22Status ${fact.tag === "待补" ? "missing" : "strong"}">${escHtml(fact.tag)}</span></div>`).join("")}</div>
      <label class="v22Field"><span>你的诊断</span><textarea data-v22-learn-field="diagnosis" placeholder="说明已选证据能够支持什么，以及仍不能证明什么。">${escHtml(a.diagnosis)}</textarea></label></div><footer class="v22PanelFoot"><button type="button" class="v22GhostButton" data-v22-learn-prev>← 返回资料包</button><button type="button" class="v22Button primary" data-v22-learn-next>提交诊断并决策 →</button></footer></section>`;
  }

  function renderLearnDecide() {
    const a = activeAttempt();
    return `<section class="v22Panel"><header class="v22PanelHead"><div><span class="v22Kicker">03 · DECIDE</span><h2>在看到反馈前写下判断</h2><p>${escHtml(activeCase().prompt)}</p></div><span class="v22Badge">教育练习</span></header><div class="v22PanelBody">
      <label class="v22Field"><span>你的核心判断</span><textarea data-v22-learn-field="decision" placeholder="使用“因为…所以…但仍需核验…”的结构。">${escHtml(a.decision)}</textarea></label>
      <label class="v22Field"><span>当前判断信心</span><div class="v22ConfidenceControl"><input type="range" min="0" max="100" value="${a.confidence}" data-v22-learn-field="confidence"><output>${a.confidence}%</output></div><small>信心只用于比较你在案例前后的主观变化，不是正确率。</small></label>
      </div><footer class="v22PanelFoot"><button type="button" class="v22GhostButton" data-v22-learn-prev>← 返回诊断</button><button type="button" class="v22Button primary" data-v22-learn-next>寻找反证 →</button></footer></section>`;
  }

  function renderLearnDefend() {
    const a = activeAttempt();
    return `<section class="v22Panel"><header class="v22PanelHead"><div><span class="v22Kicker">04 · DEFEND</span><h2>主动攻击自己的判断</h2><p>成熟研究不只寻找支持材料，还要明确反证和何时放弃当前论点。</p></div></header><div class="v22PanelBody">
      <label class="v22Field"><span>一条最重要的反证</span><textarea data-v22-learn-field="counterEvidence" placeholder="什么事实可能让你的结论不成立？">${escHtml(a.counterEvidence)}</textarea></label>
      <label class="v22Field"><span>推翻条件</span><textarea data-v22-learn-field="invalidation" placeholder="出现什么可观察证据时，你会修改或放弃判断？">${escHtml(a.invalidation)}</textarea></label>
      <div class="v22Notice">只有完成证据选择、诊断、判断、反证和推翻条件后，才能进入复盘。反馈评价的是研究过程完整度，不会把开放性产业判断伪装成唯一标准答案。</div>
      </div><footer class="v22PanelFoot"><button type="button" class="v22GhostButton" data-v22-learn-prev>← 返回决策</button><button type="button" class="v22Button primary" data-v22-learn-next>提交并查看复盘 →</button></footer></section>`;
  }

  function learnRubric() {
    const a = activeAttempt();
    return [
      ["选择可追溯证据", a.selectedEvidence.length >= 1, `${a.selectedEvidence.length} 条已选`],
      ["区分证据能力边界", a.diagnosis.trim().length >= 24, a.diagnosis.trim().length >= 24 ? "已形成解释" : "诊断过短"],
      ["形成明确判断", a.decision.trim().length >= 24, a.decision.trim().length >= 24 ? "已提交" : "判断过短"],
      ["主动寻找反证", a.counterEvidence.trim().length >= 16, a.counterEvidence.trim().length >= 16 ? "已提交" : "反证不足"],
      ["明确推翻条件", a.invalidation.trim().length >= 16, a.invalidation.trim().length >= 16 ? "已提交" : "条件不足"],
    ];
  }

  function learnMemoMarkdown() {
    const c = activeCase();
    const a = activeAttempt();
    const selected = learnFacts().filter((fact) => a.selectedEvidence.includes(fact.id));
    return `# ${c.title} · 案例练习记录\n\n- 学习目标：${c.objective}\n- 主观信心：${a.confidence}%\n- 完成日期：${a.completedAt || TODAY}\n\n## 已选证据\n\n${selected.map((fact) => `- ${fact.label}：${fact.value}`).join("\n") || "- 未选择"}\n\n## 诊断\n\n${a.diagnosis}\n\n## 判断\n\n${a.decision}\n\n## 反证\n\n${a.counterEvidence}\n\n## 推翻条件\n\n${a.invalidation}\n\n本反馈仅评价研究步骤完成度，不代表专业能力认证或唯一正确答案。\n`;
  }

  function renderLearnDebrief() {
    const a = activeAttempt();
    const rubric = learnRubric();
    const passed = rubric.filter((item) => item[1]).length;
    return `<section class="v22Panel"><header class="v22PanelHead"><div><span class="v22Kicker">05 · DEBRIEF</span><h2>案例复盘</h2><p>先展示你的研究过程完成度，再给出下一轮应补的证据，不提供虚假的唯一标准答案。</p></div><span class="v22Status ${passed === rubric.length ? "strong" : "weak"}">${passed} / ${rubric.length} 项完成</span></header><div class="v22PanelBody">
      <div class="v22Rubric">${rubric.map(([label, ok, detail]) => `<div class="v22RubricRow"><span><strong>${ok ? "✓" : "○"} ${escHtml(label)}</strong><br>${escHtml(detail)}</span><span class="v22Status ${ok ? "strong" : "weak"}">${ok ? "已完成" : "建议重做"}</span></div>`).join("")}</div>
      <article class="v22Memo"><span class="v22Kicker">REFERENCE REASONING</span><h3>${escHtml(activeCase().title)}</h3><p>较稳健的分析会把“本地企业样本存在”限定为产业线索，而不是直接推导完整集群、产能规模或投资回报。下一步应核验企业基地、业务分部、客户关系、持续资本开支和项目状态。</p><h4>你的判断</h4><p>${escHtml(a.decision)}</p><h4>你的反证</h4><p>${escHtml(a.counterEvidence)}</p></article>
      </div><footer class="v22PanelFoot"><button type="button" class="v22GhostButton" data-v22-learn-prev>← 返回修改</button><div class="v22Actions"><button type="button" class="v22Button" data-v22-restart-case>重新练习</button><button type="button" class="v22Button primary" data-v22-download="learn">下载案例记录</button></div></footer></section>`;
  }

  function downloadText(filename, content) {
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  async function copyText(content) {
    try {
      await navigator.clipboard.writeText(content);
      toast("已复制到剪贴板。");
    } catch (_) {
      toast("当前浏览器未允许剪贴板，请使用下载功能。");
    }
  }

  function render() {
    const mode = currentMode();
    if (!MODE_META[mode]) return;
    const canvas = document.querySelector("#v21ModeCanvas");
    if (!canvas) return;
    const meta = MODE_META[mode];
    const title = document.querySelector("#v21WorkbenchTitle");
    const lead = document.querySelector("#v21WorkbenchLead");
    const eyebrow = document.querySelector("#v21WorkbenchEyebrow");
    if (title) title.textContent = meta.title;
    if (lead) lead.textContent = meta.lead;
    if (eyebrow) eyebrow.textContent = meta.kicker;
    canvas.innerHTML = mode === "investor" ? renderInvestor() : mode === "policy" ? renderPolicy() : renderLearn();
    persist();
  }

  function scheduleRender() {
    window.cancelAnimationFrame(state.renderFrame);
    state.renderFrame = window.requestAnimationFrame(render);
  }

  function validateLearnNext() {
    const a = activeAttempt();
    if (a.step === 1 && (!a.selectedEvidence.length || a.diagnosis.trim().length < 12)) {
      toast("请至少选择一条证据，并写下它能证明什么、不能证明什么。");
      return false;
    }
    if (a.step === 2 && a.decision.trim().length < 12) {
      toast("请先写下你的核心判断，再进入反证阶段。");
      return false;
    }
    if (a.step === 3 && (a.counterEvidence.trim().length < 8 || a.invalidation.trim().length < 8)) {
      toast("请补充反证和推翻条件后再查看复盘。");
      return false;
    }
    return true;
  }

  function handleClick(event) {
    const target = event.target.closest("button");
    if (!target) return;
    const mode = currentMode();
    if (target.matches("[data-v22-step]")) {
      const step = Number(target.dataset.v22Step);
      if (mode === "investor") state.investorStep = Math.min(3, step);
      if (mode === "policy") state.policyStep = Math.min(3, step);
      if (mode === "learn") activeAttempt().step = Math.min(4, step);
      persist(); scheduleRender(); return;
    }
    if (target.matches("[data-v22-next]")) {
      if (mode === "investor") state.investorStep = Math.min(3, state.investorStep + 1);
      if (mode === "policy") state.policyStep = Math.min(3, state.policyStep + 1);
      persist(); scheduleRender(); return;
    }
    if (target.matches("[data-v22-prev]")) {
      if (mode === "investor") state.investorStep = Math.max(0, state.investorStep - 1);
      if (mode === "policy") state.policyStep = Math.max(0, state.policyStep - 1);
      persist(); scheduleRender(); return;
    }
    if (target.matches("[data-v22-new]")) {
      const kind = target.dataset.v22New;
      if (kind === "investor") { state.investor = { ...defaults.investor, subjectCity: currentCityName() }; state.investorStep = 0; }
      if (kind === "policy") { state.policy = { ...defaults.policy, city: currentCityName() }; state.policyStep = 0; }
      if (kind === "learn") { state.learnAttempts[state.learnCase] = blankAttempt(); }
      persist(); scheduleRender(); return;
    }
    if (target.matches("[data-v22-add-peer]")) {
      const select = document.querySelector("#v22PeerSelect");
      const city = select?.value;
      if (!city) return toast("请先选择一个可比城市。");
      if (state.investor.peerCities.length >= 3) return toast("加上研究对象后最多比较 4 座城市。");
      if (!state.investor.peerCities.includes(city) && city !== state.investor.subjectCity) state.investor.peerCities.push(city);
      persist(); scheduleRender(); return;
    }
    if (target.matches("[data-v22-remove-peer]")) {
      state.investor.peerCities = state.investor.peerCities.filter((city) => city !== target.dataset.v22RemovePeer);
      persist(); scheduleRender(); return;
    }
    if (target.matches("[data-v22-policy-task]")) {
      state.policy.taskType = target.dataset.v22PolicyTask;
      persist(); scheduleRender(); return;
    }
    if (target.matches("[data-v22-select-gap]")) {
      state.policy.selectedGap = target.dataset.v22SelectGap;
      persist(); scheduleRender(); return;
    }
    if (target.matches("[data-v22-shortlist]")) {
      const name = target.dataset.v22Shortlist;
      state.policy.shortlist = state.policy.shortlist.includes(name) ? state.policy.shortlist.filter((item) => item !== name) : [...state.policy.shortlist, name];
      ensurePipeline(); persist(); scheduleRender(); return;
    }
    if (target.matches("[data-v22-learn-case]")) {
      state.learnCase = target.dataset.v22LearnCase;
      activeAttempt(); persist(); scheduleRender(); return;
    }
    if (target.matches("[data-v22-learn-next]")) {
      const attempt = activeAttempt();
      if (!validateLearnNext()) return;
      attempt.step = Math.min(4, attempt.step + 1);
      if (attempt.step === 4) attempt.completedAt = TODAY;
      persist(); scheduleRender(); return;
    }
    if (target.matches("[data-v22-learn-prev]")) {
      const attempt = activeAttempt();
      attempt.step = Math.max(0, attempt.step - 1);
      persist(); scheduleRender(); return;
    }
    if (target.matches("[data-v22-restart-case]")) {
      state.learnAttempts[state.learnCase] = blankAttempt();
      persist(); scheduleRender(); return;
    }
    if (target.matches("[data-v22-open-sources]")) {
      document.querySelector("#v21OpenSources")?.click(); return;
    }
    if (target.matches("[data-v22-download]")) {
      const kind = target.dataset.v22Download;
      if (kind === "investor") downloadText(`${state.investor.subjectCity || "城市"}-投资研究备忘录.md`, investorMemoMarkdown());
      if (kind === "policy") downloadText(`${state.policy.city || "城市"}-招商行动简报.md`, policyBriefMarkdown());
      if (kind === "learn") downloadText(`${activeCase().title.replaceAll(" · ", "-")}-案例记录.md`, learnMemoMarkdown());
      return;
    }
    if (target.matches("[data-v22-copy]")) {
      copyText(target.dataset.v22Copy === "investor" ? investorMemoMarkdown() : policyBriefMarkdown());
    }
  }

  function handleInput(event) {
    const target = event.target;
    if (target.matches("[data-v22-bind]")) {
      updateField(target.dataset.v22Bind, target.value);
      if (target.dataset.v22Rerender !== undefined) {
        if (target.dataset.v22Bind === "investor.subjectCity") state.investor.peerCities = state.investor.peerCities.filter((city) => city !== target.value);
        if (target.dataset.v22Bind === "policy.city" || target.dataset.v22Bind === "policy.industry") {
          state.policy.selectedGap = "";
          state.policy.shortlist = [];
          state.policy.pipeline = [];
        }
        scheduleRender();
      }
      return;
    }
    if (target.matches("[data-v22-investor-evidence]")) {
      const id = target.dataset.v22InvestorEvidence;
      state.investor.selectedEvidence = target.checked ? [...new Set([...state.investor.selectedEvidence, id])] : state.investor.selectedEvidence.filter((item) => item !== id);
      persist(); return;
    }
    if (target.matches("[data-v22-learn-evidence]")) {
      const a = activeAttempt();
      const id = target.dataset.v22LearnEvidence;
      a.selectedEvidence = target.checked ? [...new Set([...a.selectedEvidence, id])] : a.selectedEvidence.filter((item) => item !== id);
      persist(); return;
    }
    if (target.matches("[data-v22-learn-field]")) {
      const a = activeAttempt();
      const field = target.dataset.v22LearnField;
      a[field] = field === "confidence" ? Number(target.value) : target.value;
      if (field === "confidence") target.nextElementSibling.textContent = `${target.value}%`;
      persist(); return;
    }
    if (target.matches("[data-v22-pipeline]")) {
      const item = state.policy.pipeline[Number(target.dataset.v22Pipeline)];
      if (item) item[target.dataset.v22PipelineField] = target.value;
      state.policy.updatedAt = TODAY;
      persist();
    }
  }

  function init() {
    const canvas = document.querySelector("#v21ModeCanvas");
    if (!canvas) return;
    document.body.classList.add("v22-ready");
    canvas.addEventListener("click", handleClick);
    canvas.addEventListener("input", handleInput);
    canvas.addEventListener("change", handleInput);
    const observer = new MutationObserver((records) => {
      if (records.some((record) => record.attributeName === "data-v21-mode" || record.target.id === "v21Breadcrumb" || record.target.closest?.("#v21Breadcrumb"))) scheduleRender();
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ["data-v21-mode"] });
    const breadcrumb = document.querySelector("#v21Breadcrumb");
    if (breadcrumb) observer.observe(breadcrumb, { childList: true, subtree: true });
    scheduleRender();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
