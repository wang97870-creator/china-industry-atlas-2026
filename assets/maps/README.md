# Administrative boundary sources

The map boundary files are bundled locally so the atlas remains clickable when runtime CDN requests fail.

- `china.json`: province-level boundary data retrieved from the DataV GeoAtlas V3 boundary service on 2026-07-26 (`100000_full.json`). SHA-256: `99adfeded5223848bbe37a0a12f8023e11ee12161c7800521c27db42fdeac275`.
- `provinces/*.json`: city-level boundary collections from [`zhChuXiao/ChinaGeoJson`](https://github.com/zhChuXiao/ChinaGeoJson), retrieved from the repository's `master` branch on 2026-07-26. The upstream repository states the MIT License; its license text is preserved at `../licenses/ChinaGeoJson-LICENSE.txt`.
- `provinces/台湾省.json`: the single-outline upstream file is replaced with 20 clickable county/city features from [`g0v/twgeojson`](https://github.com/g0v/twgeojson), normalized and display-simplified by `scripts/import-taiwan-map.mjs`. The dataset is CC0 1.0; its notice is preserved at `../licenses/twgeojson-CC0.txt`. SHA-256: `00031bd502bbb6703b2deac4d5c201e71e454ea9dfa8e9419d05512241b8d73a`.

Boundary data is for research visualization only. Administrative names and geometries should be checked against the latest official standard maps before publication in regulated contexts.
