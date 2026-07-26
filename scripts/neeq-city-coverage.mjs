import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import vm from "node:vm";

const execFileAsync = promisify(execFile);
const dataSource = await readFile(
  new URL("../assets/data.js", import.meta.url),
  "utf8",
);
const data = vm.runInNewContext(`${dataSource}\n;DATA`);
const generatedOn = new Date().toISOString().slice(0, 10);

const endpoint = new URL(
  "https://xinsanban.eastmoney.com/api/DataCenter/GSGP/GetGPGSMX",
);
Object.entries({
  page: "1",
  pagesize: "7000",
  sortType: "LISTINGDATE",
  sortRule: "-1",
  code: "",
}).forEach(([key, value]) => endpoint.searchParams.set(key, value));

async function fetchRows() {
  const { stdout } = await execFileAsync(
    "curl",
    [
      "-L",
      "-sS",
      "--fail",
      "--max-time",
      "90",
      "-H",
      "User-Agent: Mozilla/5.0 Chrome/138 Safari/537.36",
      String(endpoint),
    ],
    { maxBuffer: 128 * 1024 * 1024 },
  );
  const payload = JSON.parse(stdout);
  if (!payload.IsSuccess || !Array.isArray(payload.result)) {
    throw new Error(payload.Message || "NEEQ company dataset is unavailable");
  }
  return payload.result.filter(
    (row) =>
      /^\d{6}\.NQ$/.test(row.MSECUCODE || "") &&
      !/(^|\*)ST|退/.test(row.SECURITYSHORTNAME || ""),
  );
}

function simplifyPlace(value) {
  return String(value || "")
    .replace(
      /(特别行政区|维吾尔自治区|壮族自治区|回族自治区|自治区|自治州|地区|市|盟|州)$/g,
      "",
    )
    .replace(
      /(土家族苗族|蒙古族藏族|藏族羌族|哈萨克|朝鲜族|蒙古族|彝族|白族|傣族景颇族|苗族侗族|布依族苗族|哈尼族彝族)/g,
      "",
    );
}

function organizationMatchesCity(site, organization) {
  if (simplifyPlace(site.province) !== simplifyPlace(organization.STR_REGION)) {
    return false;
  }
  const city = simplifyPlace(site.city);
  const organizationCity = simplifyPlace(organization.STR_CITY);
  if (!city || !organizationCity) return false;
  return (
    city === organizationCity ||
    city.includes(organizationCity) ||
    organizationCity.includes(city)
  );
}

function companySectorIds(company) {
  const text = [
    company.SECURITYSHORTNAME,
    company.INSTNAME,
    company.MAINBUSIN,
    company.COMPPROFILE,
    company.STR_INDSORT_ZJH,
    company.STR_INDSORT_GL2,
    company.STR_INDSORT_TZ2,
  ].join(" ");
  const industry = [
    company.STR_INDSORT_ZJH,
    company.STR_INDSORT_GL2,
    company.STR_INDSORT_TZ2,
  ].join(" ");
  const industryRules = [
    [/金融|银行|保险|资本市场/, "finance"],
    [/软件|互联网|信息技术|数字内容/, "ai"],
    [/计算机|通信|电子|半导体|光电/, "chips"],
    [/汽车|运输设备/, "nev"],
    [/医药|生物|卫生|医疗/, "biomed"],
    [/石油|化工|化学|煤炭加工/, "petrochem"],
    [/金属|矿物|采矿|材料/, "materials"],
    [/电力|燃气|新能源|环境治理|生态保护/, "cleanenergy"],
    [/水上运输|船舶|海洋/, "ocean"],
    [/铁路|道路|航空运输|仓储|邮政|物流/, "logistics"],
    [/农业|林业|畜牧|渔业|食品|农副/, "agri"],
    [/纺织|服装|家具|酒|饮料|零售|批发/, "consumer"],
    [/文化|体育|娱乐|旅游|住宿|餐饮/, "tourism"],
    [/专用设备|通用设备|仪器仪表|机械/, "equipment"],
  ];
  const industrySector = industryRules.find(([pattern]) =>
    pattern.test(industry),
  )?.[1];
  const keywordSectors = data.taxonomy
    .map((sector) => ({
      id: sector.id,
      hits: sector.keywords.filter((keyword) => text.includes(keyword)).length,
    }))
    .filter((sector) => sector.hits > 0)
    .sort((left, right) => right.hits - left.hits)
    .slice(0, 3)
    .map((sector) => sector.id);
  return [...new Set([industrySector, ...keywordSectors].filter(Boolean))].slice(
    0,
    3,
  );
}

function selectIndustryDiverseCompanies(companies, limit = 3) {
  const selected = [];
  const industries = new Set();
  for (const company of companies) {
    const industry = company.STR_INDSORT_GL2 || company.STR_INDSORT_ZJH || "待核验";
    if (industries.has(industry)) continue;
    selected.push(company);
    industries.add(industry);
    if (selected.length === limit) return selected;
  }
  for (const company of companies) {
    if (selected.includes(company)) continue;
    selected.push(company);
    if (selected.length === limit) break;
  }
  return selected;
}

function compactText(value, limit = 78) {
  const text = String(value || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return "主营业务待进一步核验";
  const firstClause = text.split(/[;；。]/).find(Boolean) || text;
  return firstClause.length > limit
    ? `${firstClause.slice(0, limit)}…`
    : firstClause;
}

function formatRevenue(value) {
  const tenThousands = Number(value);
  if (!Number.isFinite(tenThousands) || tenThousands <= 0) return "未单独披露";
  const hundredMillions = tenThousands / 10000;
  return hundredMillions >= 1
    ? `${hundredMillions.toFixed(2)} 亿元`
    : `${tenThousands.toFixed(0)} 万元`;
}

function companyWebsite(company) {
  const website = String(company.COMPWEB || "").trim();
  if (!website) return "";
  return /^https?:\/\//i.test(website) ? website : `https://${website}`;
}

function enterpriseRecord(site, company) {
  const sectors = companySectorIds(company);
  const reportDate = String(company.REPORTDATE || "").slice(0, 10);
  return {
    city: site.city,
    name: company.SECURITYSHORTNAME,
    legalName: company.INSTNAME,
    sector: sectors[0] || "equipment",
    sectors: sectors.length ? sectors : ["equipment"],
    role: compactText(company.MAINBUSIN || company.COMPPROFILE),
    status: `新三板${company.LEVEL ? `·${company.LEVEL}` : ""}`,
    ticker: company.MSECUCODE,
    ownership: company.ORGFORM || "所有制待核验",
    founded: String(company.ESTDATE || "").slice(0, 4),
    revenue: formatRevenue(company.DEC_TOTALOPERATEREVE),
    employees: company.WORKFORCE
      ? `${Number(company.WORKFORCE).toLocaleString("zh-CN")} 人（公司口径）`
      : "未单独披露",
    valuation: "未公开统一估值",
    asOf: reportDate
      ? `${reportDate} 挂牌公司披露口径`
      : `${generatedOn} 挂牌公司资料快照`,
    description: `${company.INSTNAME}；注册地 ${company.STR_REGION || ""}${company.STR_CITY || ""}；管理型行业为${company.STR_INDSORT_GL2 || company.STR_INDSORT_ZJH || "待核验"}。`,
    latest: "",
    source: `https://xinsanban.eastmoney.com/F10/${company.MSECUCODE}.html`,
    source2: companyWebsite(company),
    source3: "https://www.neeq.com.cn/disclosure/announcement.html",
    sourceLabel: "挂牌公司资料页",
    source2Label: "企业官网",
    source3Label: "全国股转披露",
    generated: true,
    dataset: "NEEQ",
    rankBasis: "城市内最新披露营收与行业分散",
  };
}

const organizations = await fetchRows();
const siteCities = data.provinces
  .filter((province) => !["香港", "澳门", "台湾"].includes(province.name))
  .flatMap((province) =>
    province.cities.map((city) => ({ province: province.name, city })),
  );

const coverage = siteCities.map((site) => {
  const rankedCompanies = organizations
    .filter((organization) => organizationMatchesCity(site, organization))
    .sort(
      (left, right) =>
        Number(right.DEC_TOTALOPERATEREVE || 0) -
          Number(left.DEC_TOTALOPERATEREVE || 0) ||
        Number(right.WORKFORCE || 0) - Number(left.WORKFORCE || 0),
    );
  const companies = selectIndustryDiverseCompanies(rankedCompanies);
  return {
    ...site,
    companyCount: rankedCompanies.length,
    enterprises: companies.map((company) => enterpriseRecord(site, company)),
  };
});

const summary = {
  asOf: new Date().toISOString(),
  organizationRows: organizations.length,
  indexedMainlandCities: siteCities.length,
  citiesWithOneOrMoreNeeqCompanies: coverage.filter(
    (city) => city.companyCount >= 1,
  ).length,
  citiesWithoutNeeqCompanies: coverage.filter((city) => city.companyCount === 0)
    .length,
  source:
    "Eastmoney NEEQ company-profile dataset with National Equities Exchange disclosure links preserved per record.",
  ranking: "Latest disclosed operating revenue with industry diversification",
};

if (process.argv.includes("--write")) {
  const outputDirectory = new URL("../assets/generated/", import.meta.url);
  await mkdir(outputDirectory, { recursive: true });
  const generatedEnterprises = coverage.flatMap((city) => city.enterprises);
  const generatedSource =
    `/* Generated by scripts/neeq-city-coverage.mjs on ${generatedOn}. */\n` +
    `globalThis.NEEQ_ENTERPRISES = ${JSON.stringify(generatedEnterprises)};\n` +
    `globalThis.NEEQ_META = ${JSON.stringify(summary)};\n`;
  await writeFile(
    new URL("neeq-enterprises.js", outputDirectory),
    generatedSource,
    "utf8",
  );
  console.log(
    `Wrote ${generatedEnterprises.length} generated records to assets/generated/neeq-enterprises.js.`,
  );
}

console.log(JSON.stringify(summary, null, 2));
console.log("\nCities without a NEEQ sample:\n");
console.log(
  coverage
    .filter((city) => city.companyCount === 0)
    .map((city) => `${city.province}/${city.city}`)
    .join("\n"),
);
