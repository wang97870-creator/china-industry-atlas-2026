import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import vm from "node:vm";

const dataSource = await readFile(
  new URL("../assets/data.js", import.meta.url),
  "utf8",
);
const data = vm.runInNewContext(`${dataSource}\n;DATA`);
const generatedOn = new Date().toISOString().slice(0, 10);

const EASTMONEY_ORG_ENDPOINT =
  "https://datacenter-web.eastmoney.com/api/data/v1/get";
const EASTMONEY_MARKET_ENDPOINT =
  "https://push2.eastmoney.com/api/qt/clist/get";
const requestHeaders = {
  Accept: "application/json, text/plain, */*",
  Connection: "close",
  Referer: "https://data.eastmoney.com/",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/138 Safari/537.36",
};

const wait = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));
const execFileAsync = promisify(execFile);

async function fetchJson(url, attempts = 5) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const headerArgs = Object.entries(requestHeaders).flatMap(([key, value]) =>
        ["-H", `${key}: ${value}`],
      );
      const { stdout } = await execFileAsync(
        "curl",
        [
          "-L",
          "-sS",
          "--fail",
          "--max-time",
          "25",
          ...headerArgs,
          String(url),
        ],
        { maxBuffer: 64 * 1024 * 1024 },
      );
      return JSON.parse(stdout);
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await wait(attempt * 500);
    }
  }
  throw lastError;
}

function orgInfoUrl(pageNumber) {
  const url = new URL(EASTMONEY_ORG_ENDPOINT);
  const params = {
    reportName: "RPT_HSF9_BASIC_ORGINFO",
    columns: [
      "SECUCODE",
      "SECURITY_CODE",
      "SECURITY_NAME_ABBR",
      "LISTING_STATE",
      "ORG_NAME",
      "FOUND_DATE",
      "INDUSTRYCSRC1",
      "PROVINCE",
      "CITY",
      "DISTRICT",
      "REG_ADDRESS",
      "ORG_WEB",
      "EMP_NUM",
      "MAIN_BUSINESS",
      "ACTUAL_HOLDER",
    ].join(","),
    sortColumns: "SECURITY_CODE",
    sortTypes: "1",
    pageSize: "500",
    pageNumber: String(pageNumber),
    filter: '(LISTING_STATE="0")',
  };
  Object.entries(params).forEach(([key, value]) =>
    url.searchParams.set(key, value),
  );
  return url;
}

function marketUrl() {
  const url = new URL(EASTMONEY_MARKET_ENDPOINT);
  const params = {
    pn: "1",
    pz: "6000",
    po: "1",
    np: "1",
    ut: "bd1d9ddb04089700cf9c27f6f7426281",
    fltt: "2",
    invt: "2",
    fid: "f20",
    fs: "m:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23",
    fields: "f12,f14,f20",
  };
  Object.entries(params).forEach(([key, value]) =>
    url.searchParams.set(key, value),
  );
  return url;
}

async function fetchOrganizations() {
  const first = await fetchJson(orgInfoUrl(1));
  const pages = first.result?.pages || 1;
  const rows = [...(first.result?.data || [])];
  for (let page = 2; page <= pages; page += 1) {
    await wait(120);
    const payload = await fetchJson(orgInfoUrl(page));
    rows.push(...(payload.result?.data || []));
  }
  return rows.filter((row) => /^\d{6}\.(SH|SZ|BJ)$/.test(row.SECUCODE));
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
  if (simplifyPlace(site.province) !== simplifyPlace(organization.PROVINCE)) {
    return false;
  }
  const city = simplifyPlace(site.city);
  const organizationCity = simplifyPlace(organization.CITY);
  if (!city || !organizationCity) return false;
  if (
    city === organizationCity ||
    city.includes(organizationCity) ||
    organizationCity.includes(city)
  ) {
    return true;
  }
  return city.slice(0, 2) === organizationCity.slice(0, 2);
}

function isMainlandAshare(organization) {
  const code = organization.SECURITY_CODE;
  const name = organization.SECURITY_NAME_ABBR || "";
  if (!/^\d{6}$/.test(code) || /(^|\*)ST|退/.test(name)) return false;
  if (organization.SECUCODE.endsWith(".SH")) return !code.startsWith("900");
  if (organization.SECUCODE.endsWith(".SZ")) return !code.startsWith("200");
  return organization.SECUCODE.endsWith(".BJ");
}

function selectIndustryDiverseCompanies(companies, limit = 4) {
  const selected = [];
  const industries = new Set();
  for (const company of companies) {
    const industry = company.INDUSTRYCSRC1 || "行业待核验";
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

function companySectorIds(company) {
  const text = [
    company.SECURITY_NAME_ABBR,
    company.ORG_NAME,
    company.INDUSTRYCSRC1,
    company.MAIN_BUSINESS,
  ].join(" ");
  const industry = String(company.INDUSTRYCSRC1 || "");
  const industryRules = [
    [/金融|银行|保险|资本市场/, "finance"],
    [/软件|互联网|电信|信息技术服务/, "ai"],
    [/计算机、通信|电子设备|半导体/, "chips"],
    [/汽车制造/, "nev"],
    [/医药|卫生/, "biomed"],
    [/石油|化学原料|化学制品|化学纤维|煤炭加工/, "petrochem"],
    [/金属|矿物|采矿/, "materials"],
    [/电力|燃气|生态保护|环境治理/, "cleanenergy"],
    [/水上运输|船舶/, "ocean"],
    [/铁路|道路|航空运输|仓储|邮政|装卸/, "logistics"],
    [/农业|林业|畜牧|渔业|食品制造|农副食品/, "agri"],
    [/纺织|服装|家具|酒、饮料|零售|批发/, "consumer"],
    [/文化|体育|娱乐|住宿|餐饮/, "tourism"],
    [/专用设备|通用设备|仪器仪表|机械和设备修理/, "equipment"],
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

function summarizeBusiness(company) {
  const text = String(company.MAIN_BUSINESS || company.INDUSTRYCSRC1 || "")
    .replace(/\s+/g, " ")
    .replace(/^[（(一二三四五六七八九十、\d）).]+/g, "")
    .trim();
  const firstClause = text.split(/[;；。]/).find(Boolean) || text;
  return firstClause.length > 72
    ? `${firstClause.slice(0, 72)}…`
    : firstClause;
}

function exchangeSource(company) {
  const code = company.SECURITY_CODE;
  if (company.SECUCODE.endsWith(".SH")) {
    return `https://www.sse.com.cn/assortment/stock/list/info/company/index.shtml?COMPANY_CODE=${code}`;
  }
  return `https://www.cninfo.com.cn/new/fulltextSearch?keyWord=${code}`;
}

function companyWebsite(company) {
  const website = String(company.ORG_WEB || "")
    .trim()
    .split(/[,，;；\s]+/)[0];
  if (!website) return "";
  return /^https?:\/\//i.test(website) ? website : `https://${website}`;
}

function eastmoneyProfile(company) {
  const marketPrefix = company.SECUCODE.endsWith(".SH")
    ? "SH"
    : company.SECUCODE.endsWith(".BJ")
      ? "BJ"
      : "SZ";
  return `https://emweb.securities.eastmoney.com/pc_hsf10/pages/index.html?type=web&code=${marketPrefix}${company.SECURITY_CODE}#/gsgk`;
}

function formatMarketCap(value) {
  if (!value) return "联网刷新总市值";
  const yi = value / 1e8;
  return yi >= 10000
    ? `${(yi / 10000).toFixed(2)}万亿元`
    : `${yi.toFixed(1)}亿元`;
}

function enterpriseRecord(site, company) {
  const code = company.SECURITY_CODE;
  const sectors = companySectorIds(company);
  const holder = String(company.ACTUAL_HOLDER || "");
  const ownership = /国资|国务院|政府|财政|管理委员会|中央/.test(holder)
    ? "国资背景/公众公司"
    : holder && holder !== "无"
      ? "公众公司/实控人已披露"
      : "公众公司/所有制待核验";
  return {
    city: site.city,
    name: company.SECURITY_NAME_ABBR,
    legalName: company.ORG_NAME,
    sector: sectors[0] || "equipment",
    sectors: sectors.length ? sectors : ["equipment"],
    role: summarizeBusiness(company),
    status: company.SECUCODE.endsWith(".BJ") ? "北交所" : "A股",
    ticker: company.SECUCODE,
    secid: `${company.SECUCODE.endsWith(".SH") ? "1" : "0"}.${code}`,
    ownership,
    founded: String(company.FOUND_DATE || "").slice(0, 4),
    revenue: "",
    employees: company.EMP_NUM
      ? `${Number(company.EMP_NUM).toLocaleString("zh-CN")} 人（集团口径）`
      : "未单独披露",
    valuation: formatMarketCap(marketCaps.get(code)),
    asOf: `${generatedOn} 上市公司资料快照`,
    description: `${company.ORG_NAME}；注册地 ${company.PROVINCE}${company.CITY || ""}${company.DISTRICT || ""}；证监会行业为${company.INDUSTRYCSRC1 || "待核验"}。`,
    latest: "",
    source: exchangeSource(company),
    source2: companyWebsite(company),
    source3: eastmoneyProfile(company),
    sourceLabel: "交易所/巨潮披露",
    source2Label: "企业官网",
    source3Label: "投资数据资料页",
    generated: true,
    rankBasis: marketCaps.has(code)
      ? "城市内总市值与行业分散"
      : "城市内集团员工规模与行业分散",
  };
}

const organizations = (await fetchOrganizations()).filter(isMainlandAshare);
let marketRows = [];
try {
  await wait(750);
  const marketPayload = await fetchJson(marketUrl(), 2);
  marketRows = marketPayload.data?.diff || [];
} catch (error) {
  console.warn(
    "Live market-cap snapshot unavailable; ranking falls back to disclosed group employee count.",
  );
}
const marketCaps = new Map(marketRows.map((row) => [row.f12, row.f20 || 0]));
const siteCities = data.provinces.flatMap((province) =>
  province.cities.map((city) => ({ province: province.name, city })),
);

const coverage = siteCities.map((site) => {
  const rankedCompanies = organizations
    .filter((organization) => organizationMatchesCity(site, organization))
    .sort(
      (left, right) =>
        (marketCaps.get(right.SECURITY_CODE) || right.EMP_NUM || 0) -
        (marketCaps.get(left.SECURITY_CODE) || left.EMP_NUM || 0),
    );
  const companies = selectIndustryDiverseCompanies(rankedCompanies);
  return {
    ...site,
    companyCount: rankedCompanies.length,
    enterprises: companies.map((company) => enterpriseRecord(site, company)),
    topCompanies: companies.slice(0, 5).map((company) => ({
      name: company.SECURITY_NAME_ABBR,
      ticker: company.SECUCODE,
      industry: company.INDUSTRYCSRC1,
      marketCap: marketCaps.get(company.SECURITY_CODE),
    })),
  };
});

const summary = {
  asOf: new Date().toISOString(),
  organizationRows: organizations.length,
  marketRows: marketRows.length,
  indexedCities: siteCities.length,
  citiesWithOneOrMoreListedCompanies: coverage.filter(
    (city) => city.companyCount >= 1,
  ).length,
  citiesWithThreeOrMoreListedCompanies: coverage.filter(
    (city) => city.companyCount >= 3,
  ).length,
  citiesWithoutListedCompanies: coverage.filter(
    (city) => city.companyCount === 0,
  ).length,
};

if (process.argv.includes("--write")) {
  const outputDirectory = new URL("../assets/generated/", import.meta.url);
  await mkdir(outputDirectory, { recursive: true });
  const generatedEnterprises = coverage.flatMap((city) => city.enterprises);
  const generatedMeta = {
    ...summary,
    source:
      "Eastmoney public company-profile dataset; exchange and company links are preserved per record.",
    ranking:
      marketRows.length > 0
        ? "City-level market cap with industry diversification"
        : "Disclosed group employee count with industry diversification",
  };
  const generatedSource =
    `/* Generated by scripts/a-share-city-coverage.mjs on ${generatedOn}. */\n` +
    `globalThis.A_SHARE_ENTERPRISES = ${JSON.stringify(generatedEnterprises)};\n` +
    `globalThis.A_SHARE_META = ${JSON.stringify(generatedMeta)};\n`;
  await writeFile(
    new URL("a-share-enterprises.js", outputDirectory),
    generatedSource,
    "utf8",
  );
  console.log(
    `\nWrote ${generatedEnterprises.length} generated records to assets/generated/a-share-enterprises.js.`,
  );
}

console.log(JSON.stringify(summary, null, 2));
console.log("\nCities without an A-share sample:\n");
console.log(
  coverage
    .filter((city) => city.companyCount === 0)
    .map((city) => `${city.province}/${city.city}`)
    .join("\n"),
);
console.log("\nCoverage sample:\n");
console.log(
  coverage
    .filter((city) => city.companyCount > 0)
    .slice(0, 40)
    .map(
      (city) =>
        `${city.province}/${city.city}: ${city.companyCount} · ${city.topCompanies
          .map((company) => `${company.name}(${company.ticker})`)
          .join("、")}`,
    )
    .join("\n"),
);
