import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

const [
  html,
  app,
  dataSource,
  generatedSource,
  neeqSource,
  twseSource,
  curatedSource,
  cityProfileSource,
  license,
  commercial,
] =
  await Promise.all([
  read("index.html"),
  read("assets/app.js"),
  read("assets/data.js"),
  read("assets/generated/a-share-enterprises.js"),
  read("assets/generated/neeq-enterprises.js"),
  read("assets/generated/twse-enterprises.js"),
  read("assets/generated/curated-city-enterprises.js"),
  read("assets/generated/city-profiles.js"),
  read("LICENSE"),
  read("COMMERCIAL-LICENSE.md"),
  ]);

const data = vm.runInNewContext(`${dataSource}\n;DATA`);
const generatedContext = {};
vm.runInNewContext(generatedSource, generatedContext);
const generatedEnterprises = generatedContext.A_SHARE_ENTERPRISES || [];
vm.runInNewContext(neeqSource, generatedContext);
vm.runInNewContext(twseSource, generatedContext);
vm.runInNewContext(curatedSource, generatedContext);
vm.runInNewContext(cityProfileSource, generatedContext);
const neeqEnterprises = generatedContext.NEEQ_ENTERPRISES || [];
const twseEnterprises = generatedContext.TWSE_ENTERPRISES || [];
const curatedEnterprises = generatedContext.CURATED_CITY_ENTERPRISES || [];
const cityProfiles = generatedContext.CITY_PROFILES || {};
const combinedKeys = new Set();
const enterprises = [
  ...data.enterprises,
  ...generatedEnterprises,
  ...neeqEnterprises,
  ...twseEnterprises,
  ...curatedEnterprises,
].filter(
  (enterprise) => {
    const key = enterprise.ticker
      ? `${enterprise.city}::${enterprise.ticker}`
      : `${enterprise.city}::${enterprise.name}`;
    if (combinedKeys.has(key)) return false;
    combinedKeys.add(key);
    return true;
  },
);
const nationalGeo = JSON.parse(await read("assets/maps/china.json"));
const totalCities = data.provinces.reduce(
  (total, province) => total + province.cities.length,
  0,
);
const enterpriseCities = new Set(
  enterprises.map((enterprise) => enterprise.city),
);
const nantongEnterprises = enterprises.filter(
  (enterprise) => enterprise.city === "南通",
);

for (const enterprise of enterprises) {
  for (const field of ["source", "source2", "source3"]) {
    if (!enterprise[field]) continue;
    const url = new URL(enterprise[field]);
    assert.match(url.protocol, /^https?:$/, `${enterprise.name} has a bad ${field}`);
    assert.doesNotMatch(
      enterprise[field],
      /[,\s]/,
      `${enterprise.name} has multiple or malformed URLs in ${field}`,
    );
  }
}

assert.equal(data.provinces.length, 34, "province coverage changed");
assert.equal(totalCities, 365, "city index coverage changed");
assert.equal(data.taxonomy.length, 16, "taxonomy coverage changed");
assert.equal(data.enterprises.length, 170, "enterprise coverage changed");
assert.ok(generatedEnterprises.length >= 800, "listed-company snapshot is incomplete");
assert.ok(neeqEnterprises.length >= 650, "NEEQ snapshot is incomplete");
assert.ok(twseEnterprises.length >= 65, "TWSE snapshot is incomplete");
assert.ok(curatedEnterprises.length >= 44, "curated city snapshot is incomplete");
assert.equal(
  enterpriseCities.size,
  totalCities,
  "every city index must have at least one locally sourced enterprise",
);
assert.ok(nantongEnterprises.length >= 19, "Nantong sample changed");
assert.equal(
  Object.keys(cityProfiles).length,
  totalCities,
  "every city index must have a generated due-diligence profile",
);
for (const city of data.provinces.flatMap((province) => province.cities)) {
  const profile = cityProfiles[city];
  assert.ok(profile, `missing city profile for ${city}`);
  assert.ok(profile.localEnterpriseCount >= 1, `${city} lacks enterprise evidence`);
  assert.ok(profile.industryEvidence.length >= 6, `${city} profile is too shallow`);
  assert.ok(profile.thesis, `${city} lacks an investment thesis`);
  assert.ok(profile.risks.length >= 2, `${city} lacks risk flags`);
}
assert.equal(
  nationalGeo.features.filter((feature) =>
    Number.isInteger(feature.properties?.adcode),
  ).length,
  34,
  "national map must contain 34 clickable province-level features",
);

for (const id of [
  "atlas",
  "useCases",
  "useCaseEnterpriseCount",
  "provinceJump",
  "cityJump",
  "globalSearch",
  "chinaMap",
  "detailBody",
  "openNantong",
]) {
  assert.match(html, new RegExp(`id="${id}"`), `missing #${id}`);
}

for (const region of ["香港", "澳门"]) {
  assert.match(
    html,
    new RegExp(`data-special-region="${region}"`),
    `missing visible ${region} entry`,
  );
}

for (const asset of [
  "assets/styles.css",
  "assets/vendor/echarts-5.5.1.min.js",
  "assets/data.js",
  "assets/generated/a-share-enterprises.js",
  "assets/generated/neeq-enterprises.js",
  "assets/generated/twse-enterprises.js",
  "assets/generated/curated-city-enterprises.js",
  "assets/generated/city-profiles.js",
  "assets/app.js",
]) {
  assert.ok(
    html.includes(`${asset}?v=20260726.2`),
    `runtime asset must be cache-busted: ${asset}`,
  );
}

assert.ok(
  html.indexOf("assets/vendor/echarts-5.5.1.min.js") <
    html.indexOf("assets/app.js"),
  "local ECharts must load before app.js",
);
assert.ok(
  html.indexOf("assets/data.js") < html.indexOf("assets/app.js"),
  "data.js must load before app.js",
);
assert.ok(
  html.indexOf("assets/generated/a-share-enterprises.js") <
    html.indexOf("assets/app.js"),
  "generated enterprise snapshot must load before app.js",
);
assert.ok(
  html.indexOf("assets/generated/neeq-enterprises.js") <
    html.indexOf("assets/app.js"),
  "NEEQ snapshot must load before app.js",
);
assert.ok(
  html.indexOf("assets/generated/twse-enterprises.js") <
    html.indexOf("assets/app.js"),
  "TWSE snapshot must load before app.js",
);
assert.ok(
  html.indexOf("assets/generated/curated-city-enterprises.js") <
    html.indexOf("assets/app.js"),
  "curated city snapshot must load before app.js",
);
assert.ok(
  html.indexOf("assets/generated/city-profiles.js") <
    html.indexOf("assets/app.js"),
  "city profiles must load before app.js",
);
assert.match(app, /assets\/maps\/china\.json/);
assert.match(app, /assets\/maps\/provinces/);
assert.match(app, /function setMobileView\(/);
assert.match(app, /function renderNationalIntro\(/);
assert.match(app, /function setupUseCaseHub\(/);
assert.match(license, /PolyForm Noncommercial License 1\.0\.0/);
assert.match(commercial, /No commercial permission is granted/);

for (const path of [
  "assets/styles.css",
  "assets/app.js",
  "assets/data.js",
  "assets/generated/a-share-enterprises.js",
  "assets/generated/neeq-enterprises.js",
  "assets/generated/twse-enterprises.js",
  "assets/generated/curated-city-enterprises.js",
  "assets/generated/city-profiles.js",
  "assets/favicon.svg",
  "assets/vendor/echarts-5.5.1.min.js",
  "assets/maps/china.json",
  "assets/maps/README.md",
  "assets/licenses/Apache-ECharts-LICENSE.txt",
  "assets/licenses/ChinaGeoJson-LICENSE.txt",
  "assets/licenses/twgeojson-CC0.txt",
  "NOTICE.md",
  "THIRD_PARTY_NOTICES.md",
]) {
  assert.ok(existsSync(new URL(path, root)), `missing ${path}`);
}

for (const province of data.provinces) {
  const path = `assets/maps/provinces/${province.mapName}.json`;
  assert.ok(existsSync(new URL(path, root)), `missing local map ${path}`);
  const geo = JSON.parse(await read(path));
  assert.ok(geo.features?.length, `local map ${path} has no clickable features`);
  if (province.cities.length > 1) {
    assert.ok(
      geo.features.length >= province.cities.length - 1,
      `local map ${path} is missing most city boundaries`,
    );
  }
}

const taiwanGeo = JSON.parse(await read("assets/maps/provinces/台湾省.json"));
assert.equal(taiwanGeo.features.length, 20, "Taiwan must expose 20 city boundaries");
assert.deepEqual(
  new Set(taiwanGeo.features.map((feature) => feature.properties?.name)),
  new Set(data.provinces.find((province) => province.name === "台湾").cities),
  "Taiwan map names must match the city index",
);

console.log(
  `Smoke check passed: ${data.provinces.length} provinces, ${totalCities} city indexes, ${enterprises.length} enterprises across ${enterpriseCities.size} cities, ${data.taxonomy.length} value chains.`,
);
