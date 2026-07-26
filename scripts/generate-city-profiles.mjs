import { readFile, writeFile } from "node:fs/promises";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

const dataContext = {};
vm.runInNewContext(
  `${await read("assets/data.js")}\n;globalThis.DATA_EXPORT = DATA;`,
  dataContext,
);
const DATA = dataContext.DATA_EXPORT;

const generatedContext = {};
for (const path of [
  "assets/generated/a-share-enterprises.js",
  "assets/generated/neeq-enterprises.js",
  "assets/generated/twse-enterprises.js",
  "assets/generated/curated-city-enterprises.js",
]) {
  vm.runInNewContext(await read(path), generatedContext);
}

const enterpriseKeys = new Set();
const enterprises = [
  ...(DATA.enterprises || []).map((record) => ({
    ...record,
    dataset: record.dataset || "MANUAL",
  })),
  ...(generatedContext.A_SHARE_ENTERPRISES || []).map((record) => ({
    ...record,
    dataset: "A_SHARE",
  })),
  ...(generatedContext.NEEQ_ENTERPRISES || []).map((record) => ({
    ...record,
    dataset: "NEEQ",
  })),
  ...(generatedContext.TWSE_ENTERPRISES || []).map((record) => ({
    ...record,
    dataset: "TWSE",
  })),
  ...(generatedContext.CURATED_CITY_ENTERPRISES || []).map((record) => ({
    ...record,
    dataset: "CURATED",
  })),
].filter((enterprise) => {
  const key = enterprise.ticker
    ? `${enterprise.city}::${enterprise.ticker}`
    : `${enterprise.city}::${enterprise.name}`;
  if (enterpriseKeys.has(key)) return false;
  enterpriseKeys.add(key);
  return true;
});

const taxonomyById = new Map(DATA.taxonomy.map((sector) => [sector.id, sector]));
const datasetWeight = {
  MANUAL: 8,
  A_SHARE: 6,
  NEEQ: 4,
  TWSE: 5,
  CURATED: 5,
};
const cleanList = (items) => [...new Set(items.filter(Boolean))];
const sectorIds = (enterprise) =>
  cleanList([enterprise.sector, ...(enterprise.sectors || [])]).filter((id) =>
    taxonomyById.has(id),
  );

function profileFor(city, province) {
  const local = enterprises.filter((enterprise) => enterprise.city === city);
  const scores = new Map();
  const evidence = new Map();
  for (const enterprise of local) {
    const weight = datasetWeight[enterprise.dataset || "MANUAL"] || 4;
    for (const id of sectorIds(enterprise)) {
      scores.set(id, (scores.get(id) || 0) + weight);
      if (!evidence.has(id)) evidence.set(id, []);
      evidence.get(id).push(enterprise.name);
    }
  }

  const provincePriority = DATA.focus[province.name] || [];
  provincePriority.forEach((id, index) => {
    scores.set(id, (scores.get(id) || 0) + Math.max(1, 5 - index));
  });
  DATA.taxonomy.forEach((sector) => {
    const text = [
      ...(province.base || []),
      ...(province.emerging || []),
      ...(province.future || []),
    ].join(" ");
    const keywordHits = sector.keywords.filter((keyword) =>
      text.includes(keyword),
    ).length;
    if (keywordHits) scores.set(sector.id, (scores.get(sector.id) || 0) + keywordHits);
  });

  const rankedIds = [...scores.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh-CN"))
    .map(([id]) => id);
  for (const id of provincePriority) {
    if (!rankedIds.includes(id)) rankedIds.push(id);
  }
  for (const sector of DATA.taxonomy) {
    if (!rankedIds.includes(sector.id)) rankedIds.push(sector.id);
  }
  const topIds = rankedIds.slice(0, 6);
  const industryEvidence = topIds.map((id, index) => {
    const companies = cleanList(evidence.get(id) || []);
    return {
      id,
      label: taxonomyById.get(id).label,
      rank: index + 1,
      localEnterpriseCount: companies.length,
      companies: companies.slice(0, 6),
      basis: companies.length
        ? `本地企业证据 · ${companies.length} 家样本`
        : "省域产业结构推导 · 待补城市专项统计",
    };
  });

  const override =
    DATA.cityOverrides[city] ||
    DATA.cityOverrides[city.replace(/市$/, "")] ||
    null;
  const localSectorCount = new Set(local.flatMap(sectorIds)).size;
  const grade =
    override || DATA.cityStats?.[city] || (local.length >= 3 && localSectorCount >= 2)
      ? "A"
      : "B";
  const mature = industryEvidence.slice(0, 3).map((item) => item.label);
  const emerging = industryEvidence.slice(3, 6).map((item) => item.label);
  const future = cleanList([...(province.future || []), ...(province.emerging || [])]).slice(
    0,
    4,
  );
  const leaders = local.slice(0, 6).map((enterprise) => enterprise.name);
  const localProof = industryEvidence.filter((item) => item.localEnterpriseCount);
  const sourceTypes = Object.fromEntries(
    ["MANUAL", "A_SHARE", "NEEQ", "TWSE", "CURATED"].map((dataset) => [
      dataset,
      local.filter((enterprise) => (enterprise.dataset || "MANUAL") === dataset)
        .length,
    ]),
  );
  const position = override
    ? override[2]
    : `${city}的已核验企业样本主要落在${mature.join("、")}；其城市定位需结合${province.name}的“${province.role}”省域分工进一步做园区和项目级核验。`;
  const thesis = `优先沿“${mature.slice(0, 2).join(" + ")}”寻找本地供应链、技术改造与场景落地机会；以${leaders.slice(0, 3).join("、")}等企业为入口核验客户、产能、就业与资本开支，不把产业适配度直接解释为投资回报。`;
  const risks = cleanList([
    local.length < 3
      ? `当前仅收录 ${local.length} 家本地企业样本，不能代表完整产业结构`
      : "企业库是代表性样本，不是工商全量名录",
    "集团员工与营收口径不等于本地就业或本地产值",
    ...(province.risks || []).slice(0, 2),
  ]);

  return {
    city,
    province: province.name,
    grade,
    level:
      grade === "A"
        ? "A · 城市企业证据画像"
        : "B · 城市企业证据画像（样本待扩充）",
    position,
    mature,
    emerging,
    future,
    thesis,
    risks,
    localEnterpriseCount: local.length,
    listedOrQuotedCount: local.filter((enterprise) => enterprise.ticker).length,
    localSectorCount,
    leaders,
    industryEvidence,
    locallyEvidencedIndustries: localProof.length,
    sourceTypes,
    evidenceNote:
      "产业排序综合本地企业行业归属与省域产业结构；有企业名称的条目为本地证据，无企业名称的条目明确标为省域推导。",
    updatedAt: "2026-07-26",
  };
}

const profiles = {};
for (const province of DATA.provinces) {
  for (const city of province.cities) {
    profiles[city] = profileFor(city, province);
  }
}

const missing = Object.values(profiles).filter(
  (profile) => profile.localEnterpriseCount < 1,
);
if (missing.length) {
  throw new Error(
    `City profiles require local enterprise evidence: ${missing
      .map((profile) => profile.city)
      .join(", ")}`,
  );
}

const output = `/* Generated by scripts/generate-city-profiles.mjs on 2026-07-26. */\n` +
  `globalThis.CITY_PROFILES = ${JSON.stringify(profiles)};\n` +
  `globalThis.CITY_PROFILE_META = ${JSON.stringify({
    asOf: "2026-07-26",
    cities: Object.keys(profiles).length,
    profilesWithLocalEnterpriseEvidence: Object.values(profiles).filter(
      (profile) => profile.localEnterpriseCount > 0,
    ).length,
    method:
      "City-level enterprise sectors first; province priorities only fill structural gaps and are labeled as inferred.",
  })};\n`;

await writeFile(new URL("assets/generated/city-profiles.js", root), output);
console.log(
  `Generated ${Object.keys(profiles).length} city profiles from ${enterprises.length} deduplicated enterprises.`,
);
