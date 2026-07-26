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

async function fetchDataset(endpoint) {
  const { stdout } = await execFileAsync(
    "curl",
    [
      "-L",
      "-sS",
      "--fail",
      "--max-time",
      "60",
      `https://openapi.twse.com.tw/v1/opendata/${endpoint}`,
    ],
    { maxBuffer: 64 * 1024 * 1024 },
  );
  return JSON.parse(stdout);
}

const placeTokens = {
  台北: ["台北市", "臺北市"],
  新北: ["新北市"],
  桃园: ["桃園市"],
  台中: ["台中市", "臺中市"],
  台南: ["台南市", "臺南市"],
  高雄: ["高雄市"],
  基隆: ["基隆市"],
  新竹: ["新竹市"],
  嘉义: ["嘉義市"],
  新竹县: ["新竹縣"],
  苗栗县: ["苗栗縣"],
  彰化县: ["彰化縣"],
  南投县: ["南投縣"],
  云林县: ["雲林縣"],
  嘉义县: ["嘉義縣"],
  屏东县: ["屏東縣"],
  宜兰县: ["宜蘭縣"],
  花莲县: ["花蓮縣"],
  台东县: ["台東縣", "臺東縣"],
  澎湖县: ["澎湖縣"],
};

const industries = {
  "01": ["水泥工业", "materials"],
  "02": ["食品工业", "agri"],
  "03": ["塑胶工业", "petrochem"],
  "04": ["纺织纤维", "consumer"],
  "05": ["电机机械", "equipment"],
  "06": ["电器电缆", "equipment"],
  "08": ["玻璃陶瓷", "materials"],
  "09": ["造纸工业", "materials"],
  "10": ["钢铁工业", "materials"],
  "11": ["橡胶工业", "petrochem"],
  "12": ["汽车工业", "nev"],
  "14": ["建筑材料与营造", "materials"],
  "15": ["航运业", "ocean"],
  "16": ["观光餐旅", "tourism"],
  "17": ["金融保险", "finance"],
  "18": ["贸易百货", "consumer"],
  "20": ["其他产业", "equipment"],
  "21": ["化学工业", "petrochem"],
  "22": ["生技医疗", "biomed"],
  "23": ["油电燃气", "cleanenergy"],
  "24": ["半导体", "chips"],
  "25": ["电脑与周边设备", "chips"],
  "26": ["光电", "chips"],
  "27": ["通信网络", "ai"],
  "28": ["电子零组件", "chips"],
  "29": ["电子通路", "logistics"],
  "30": ["信息服务", "ai"],
  "31": ["其他电子", "chips"],
  "32": ["文化创意", "tourism"],
  "33": ["农业科技", "agri"],
  "34": ["电子商务", "ai"],
  "35": ["绿色能源与环保", "cleanenergy"],
  "36": ["数字云端", "ai"],
  "37": ["运动休闲", "tourism"],
  "38": ["居家生活", "consumer"],
};

function cityForAddress(address) {
  const text = String(address || "");
  return Object.entries(placeTokens).find(([, tokens]) =>
    tokens.some((token) => text.includes(token)),
  )?.[0];
}

function companyWebsite(company) {
  const website = String(company["網址"] || "").trim();
  if (!website) return "";
  return /^https?:\/\//i.test(website) ? website : `https://${website}`;
}

function selectIndustryDiverseCompanies(companies, limit = 4) {
  const selected = [];
  const seenIndustries = new Set();
  for (const company of companies) {
    const industry = company["產業別"] || "待核验";
    if (seenIndustries.has(industry)) continue;
    selected.push(company);
    seenIndustries.add(industry);
    if (selected.length === limit) return selected;
  }
  for (const company of companies) {
    if (selected.includes(company)) continue;
    selected.push(company);
    if (selected.length === limit) break;
  }
  return selected;
}

function enterpriseRecord(city, company) {
  const code = String(company["公司代號"] || "").trim();
  const industryCode = String(company["產業別"] || "").padStart(2, "0");
  const [industryName, sector] = industries[industryCode] || [
    `产业代码 ${industryCode || "待核验"}`,
    "equipment",
  ];
  const listed = company.__dataset === "上市";
  return {
    city,
    name: company["公司簡稱"] || company["公司名称"] || company["公司名稱"],
    legalName: company["公司名稱"] || "",
    sector,
    sectors: [sector],
    role: `${industryName}；以证交所公开公司基本资料作为本地企业样本。`,
    status: listed ? "台湾证券交易所上市" : "台湾公开发行公司",
    ticker: listed && code ? `${code}.TW` : code ? `${code}（公开发行代码）` : "",
    ownership: "公开发行公司/所有制待核验",
    founded: String(company["成立日期"] || "").slice(0, 4),
    revenue: "需查阅公司财报",
    employees: "需查阅公司财报",
    valuation: listed ? "市值需联网核验" : "未公开统一估值",
    asOf: `${generatedOn} TWSE 开放数据快照`,
    description: `${company["公司名稱"] || ""}；登记地址 ${company["住址"] || "待核验"}；TWSE 产业分类为${industryName}。`,
    latest: "",
    source: listed
      ? "https://openapi.twse.com.tw/v1/opendata/t187ap03_L"
      : "https://openapi.twse.com.tw/v1/opendata/t187ap03_P",
    source2: companyWebsite(company),
    source3: "https://mops.twse.com.tw/mops/web/t05st03",
    sourceLabel: "TWSE 官方开放数据",
    source2Label: "企业官网",
    source3Label: "公开资讯观测站",
    generated: true,
    dataset: "TWSE",
    rankBasis: "城市内实收资本额与产业分散",
  };
}

const [listedRows, publicRows] = await Promise.all([
  fetchDataset("t187ap03_L"),
  fetchDataset("t187ap03_P"),
]);
const dedupe = new Set();
const organizations = [
  ...listedRows.map((row) => ({ ...row, __dataset: "上市" })),
  ...publicRows.map((row) => ({ ...row, __dataset: "公开发行" })),
].filter((row) => {
  const key = row["營利事業統一編號"] || row["公司名稱"];
  if (!key || dedupe.has(key)) return false;
  dedupe.add(key);
  return true;
});
const taiwanCities =
  data.provinces.find((province) => province.name === "台湾")?.cities || [];
const coverage = taiwanCities.map((city) => {
  const rankedCompanies = organizations
    .filter((organization) => cityForAddress(organization["住址"]) === city)
    .sort(
      (left, right) =>
        Number(right["實收資本額"] || 0) - Number(left["實收資本額"] || 0),
    );
  const companies = selectIndustryDiverseCompanies(rankedCompanies);
  return {
    city,
    companyCount: rankedCompanies.length,
    enterprises: companies.map((company) => enterpriseRecord(city, company)),
  };
});

const summary = {
  asOf: new Date().toISOString(),
  listedRows: listedRows.length,
  publicCompanyRows: publicRows.length,
  indexedTaiwanCities: taiwanCities.length,
  citiesWithOneOrMorePublicCompanies: coverage.filter(
    (city) => city.companyCount >= 1,
  ).length,
  citiesWithoutPublicCompanies: coverage.filter((city) => city.companyCount === 0)
    .length,
  source: "Taiwan Stock Exchange official OpenAPI company basic profiles.",
  ranking: "Paid-in capital with industry diversification",
};

if (process.argv.includes("--write")) {
  const outputDirectory = new URL("../assets/generated/", import.meta.url);
  await mkdir(outputDirectory, { recursive: true });
  const generatedEnterprises = coverage.flatMap((city) => city.enterprises);
  const generatedSource =
    `/* Generated by scripts/twse-city-coverage.mjs on ${generatedOn}. */\n` +
    `globalThis.TWSE_ENTERPRISES = ${JSON.stringify(generatedEnterprises)};\n` +
    `globalThis.TWSE_META = ${JSON.stringify(summary)};\n`;
  await writeFile(
    new URL("twse-enterprises.js", outputDirectory),
    generatedSource,
    "utf8",
  );
  console.log(
    `Wrote ${generatedEnterprises.length} generated records to assets/generated/twse-enterprises.js.`,
  );
}

console.log(JSON.stringify(summary, null, 2));
console.log("\nCities without a TWSE public-company sample:\n");
console.log(
  coverage
    .filter((city) => city.companyCount === 0)
    .map((city) => `台湾/${city.city}`)
    .join("\n"),
);
