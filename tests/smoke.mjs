import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

const [html, app, dataSource, license, commercial] = await Promise.all([
  read("index.html"),
  read("assets/app.js"),
  read("assets/data.js"),
  read("LICENSE"),
  read("COMMERCIAL-LICENSE.md"),
]);

const data = vm.runInNewContext(`${dataSource}\n;DATA`);
const totalCities = data.provinces.reduce(
  (total, province) => total + province.cities.length,
  0,
);
const enterpriseCities = new Set(
  data.enterprises.map((enterprise) => enterprise.city),
);
const nantongEnterprises = data.enterprises.filter(
  (enterprise) => enterprise.city === "南通",
);

assert.equal(data.provinces.length, 34, "province coverage changed");
assert.equal(totalCities, 365, "city index coverage changed");
assert.equal(data.taxonomy.length, 16, "taxonomy coverage changed");
assert.equal(data.enterprises.length, 170, "enterprise coverage changed");
assert.equal(enterpriseCities.size, 29, "enterprise city coverage changed");
assert.equal(nantongEnterprises.length, 19, "Nantong sample changed");

for (const id of [
  "atlas",
  "provinceJump",
  "cityJump",
  "globalSearch",
  "chinaMap",
  "detailBody",
  "openNantong",
]) {
  assert.match(html, new RegExp(`id="${id}"`), `missing #${id}`);
}

assert.ok(
  html.indexOf("assets/data.js") < html.indexOf("assets/app.js"),
  "data.js must load before app.js",
);
assert.match(app, /function setMobileView\(/);
assert.match(app, /function renderNationalIntro\(/);
assert.match(license, /PolyForm Noncommercial License 1\.0\.0/);
assert.match(commercial, /No commercial permission is granted/);

for (const path of [
  "assets/styles.css",
  "assets/app.js",
  "assets/data.js",
  "assets/favicon.svg",
  "NOTICE.md",
  "THIRD_PARTY_NOTICES.md",
]) {
  assert.ok(existsSync(new URL(path, root)), `missing ${path}`);
}

console.log(
  `Smoke check passed: ${data.provinces.length} provinces, ${totalCities} city indexes, ${data.enterprises.length} enterprises, ${data.taxonomy.length} value chains.`,
);
