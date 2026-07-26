import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";

const source =
  "https://raw.githubusercontent.com/g0v/twgeojson/master/json/twCounty2010.geo.json";
const response = await fetch(source);
if (!response.ok) throw new Error(`Taiwan GeoJSON download failed: ${response.status}`);
const geo = await response.json();

const simplifiedNames = new Map(
  Object.entries({
    台北市: "台北",
    臺北市: "台北",
    新北市: "新北",
    桃園市: "桃园",
    桃園縣: "桃园",
    台中市: "台中",
    臺中市: "台中",
    台南市: "台南",
    臺南市: "台南",
    高雄市: "高雄",
    基隆市: "基隆",
    新竹市: "新竹",
    嘉義市: "嘉义",
    新竹縣: "新竹县",
    苗栗縣: "苗栗县",
    彰化縣: "彰化县",
    南投縣: "南投县",
    雲林縣: "云林县",
    嘉義縣: "嘉义县",
    屏東縣: "屏东县",
    宜蘭縣: "宜兰县",
    花蓮縣: "花莲县",
    台東縣: "台东县",
    臺東縣: "台东县",
    澎湖縣: "澎湖县",
  }),
);

const toleranceSquared = 0.0012 ** 2;
const round = (value) => Math.round(value * 1e5) / 1e5;
function simplifyRing(ring) {
  if (ring.length <= 5) return ring.map(([x, y]) => [round(x), round(y)]);
  const first = [round(ring[0][0]), round(ring[0][1])];
  const kept = [first];
  let last = first;
  for (let index = 1; index < ring.length - 1; index += 1) {
    const point = [round(ring[index][0]), round(ring[index][1])];
    const dx = point[0] - last[0];
    const dy = point[1] - last[1];
    if (dx * dx + dy * dy >= toleranceSquared) {
      kept.push(point);
      last = point;
    }
  }
  if (kept.length < 3) {
    const middle = ring[Math.floor(ring.length / 2)];
    kept.push([round(middle[0]), round(middle[1])]);
  }
  kept.push([...first]);
  return kept;
}
function simplifyGeometry(geometry) {
  if (geometry.type === "Polygon") {
    return {
      ...geometry,
      coordinates: geometry.coordinates.map(simplifyRing),
    };
  }
  if (geometry.type === "MultiPolygon") {
    return {
      ...geometry,
      coordinates: geometry.coordinates.map((polygon) =>
        polygon.map(simplifyRing),
      ),
    };
  }
  return geometry;
}

const features = (geo.features || [])
  .map((feature) => {
    const original = feature.properties?.name || feature.properties?.COUNTYNAME;
    const name = simplifiedNames.get(original);
    if (!name) return null;
    return {
      ...feature,
      geometry: simplifyGeometry(feature.geometry),
      properties: {
        ...feature.properties,
        sourceName: original,
        name,
      },
    };
  })
  .filter(Boolean);

if (features.length !== 20) {
  throw new Error(`Expected 20 Taiwan city/county features, got ${features.length}`);
}

const output = JSON.stringify({
  type: "FeatureCollection",
  source,
  license: "CC0-1.0",
  features,
});
const target = new URL("../assets/maps/provinces/台湾省.json", import.meta.url);
await writeFile(target, output);
console.log(
  `Wrote 20 Taiwan city/county boundaries; SHA-256 ${createHash("sha256").update(output).digest("hex")}`,
);
