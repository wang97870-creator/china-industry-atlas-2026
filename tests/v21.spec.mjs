import { test, expect } from "@playwright/test";

const nantongUrl = "/?mode=explore&province=%E6%B1%9F%E8%8B%8F&city=%E5%8D%97%E9%80%9A#atlas";

async function expectNoPageOverflow(page) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
}

test("Explore preserves production counts and renders the local map with city-first research", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  await page.goto(nantongUrl);
  await expect(page.locator("body")).toHaveClass(/v21-ready/);
  await expect(page.locator("#v21Breadcrumb")).toContainText("中国/江苏/南通");
  await expect(page.locator("#v21Depth")).toContainText("D3");
  await expect(page.locator("#provinceCount")).toHaveText("34");
  await expect(page.locator("#cityCount")).toHaveText("365");
  await expect(page.locator("#enterpriseCountStat")).toHaveText("1758");
  await expect(page.locator("#chinaMap canvas")).toHaveCount(1);
  await expect(page.locator("#v21-section-projects .v21State h4")).toHaveText("暂无统一可核验的项目记录");
  await expect(page.locator("#v21-section-province")).not.toHaveAttribute("open", "");
  await expectNoPageOverflow(page);
  expect(errors).toEqual([]);
});

test("Command palette is keyboard-operable, restores focus, and opens a company deep link", async ({ page }) => {
  await page.goto(nantongUrl);
  const trigger = page.locator("#v21CommandTrigger");
  await trigger.focus();
  await page.keyboard.press("Meta+K");
  await expect(page.locator("#v21Palette")).toBeVisible();
  await expect(page.locator("#v21PaletteInput")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();

  await page.keyboard.press("/");
  await page.locator("#v21PaletteInput").fill("通富微电");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/company=%E9%80%9A%E5%AF%8C%E5%BE%AE%E7%94%B5/);
  await expect(page.getByRole("tab", { name: "企业数据" })).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(".v21EnterpriseHeader h3")).toContainText("南通");
  await expect(page.locator(".v21CompanyDetail h4")).toContainText("通富微电");
  await expect(page.locator(".v21EnterpriseTable tbody tr")).toHaveCount(1);
});

test("Four work modes retain city context and expose task-specific evidence", async ({ page }) => {
  await page.goto(nantongUrl);
  await page.getByRole("tab", { name: /Investor/ }).click();
  await expect(page.locator("#v21Breadcrumb")).toContainText("江苏/南通");
  await expect(page.locator("#v21InvestorChart canvas")).toHaveCount(1);
  await expect(page.locator("#atlas")).toBeHidden();

  await page.getByRole("tab", { name: /Policy/ }).click();
  await expect(page.locator(".v21GapNode")).toHaveCount(6);
  await expect(page.locator("#v21ModeCanvas .v21StageRail span")).toHaveCount(9);
  await expect(page.locator("#v21ModeCanvas")).toContainText("结构匹配企业");
  await expect(page.locator("#v21ModeCanvas")).toContainText("不代表迁移、投资或扩产意愿");

  await page.getByRole("tab", { name: /Learn/ }).click();
  await expect(page.locator("[data-v21-case]")).toHaveCount(4);
  await expect(page.locator("[data-v21-allocation]")).toHaveCount(4);
  await expect(page.locator("#v21Breadcrumb")).toContainText("江苏/南通");

  await page.goBack();
  await expect(page.locator("body")).toHaveAttribute("data-v21-mode", "policy");
  await expect(page.locator("#v21Breadcrumb")).toContainText("江苏/南通");
});

test("City list is an equivalent keyboard entry and URL state survives refresh", async ({ page }) => {
  await page.goto(nantongUrl);
  await page.getByRole("button", { name: "城市列表", exact: true }).click();
  await expect(page.locator("#v21CityListPanel")).toBeVisible();
  await page.locator("#v21CityListSearch").fill("苏州");
  await page.locator("[data-v21-list-city='苏州']").click();
  await expect(page).toHaveURL(/city=%E8%8B%8F%E5%B7%9E/);
  await expect(page.locator("#v21Breadcrumb")).toContainText("江苏/苏州");
  await page.reload();
  await expect(page.locator("#v21Breadcrumb")).toContainText("江苏/苏州");
  await expect(page.locator("#v21CityListPanel")).toBeVisible();
  await expectNoPageOverflow(page);
});

test("Enterprise table filters, sorts, changes columns, saves a view, exports, and adds comparison", async ({ page }) => {
  await page.goto(nantongUrl);
  await page.getByRole("tab", { name: "企业数据" }).click();
  await page.locator("#v21EnterpriseSearch").fill("中天科技");
  await expect(page.locator(".v21EnterpriseTable tbody tr")).toHaveCount(1);
  await page.locator("[data-v21-sort='status']").click();
  await page.locator("#v21ColumnsButton").click();
  await page.locator("#v21ColumnMenu input[value='valuation']").uncheck();
  await expect(page.locator(".v21EnterpriseTable thead")).not.toContainText("市值 / 估值类型");
  await page.locator("#v21SaveView").click();
  await expect(page.locator("#v21Toast")).toContainText("筛选视图已保存在当前浏览器");

  const downloadPromise = page.waitForEvent("download");
  await page.locator("#v21ExportCsv").click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toContain("南通-企业筛选");

  await page.locator("[data-v21-company-compare='中天科技']").first().click();
  await expect(page.locator("#v21CompareTray")).toBeVisible();
  await expect(page.locator("#v21CompareItems")).toContainText("中天科技");
});

test("Map boundaries are pointer-clickable and Taiwan, Hong Kong, and Macau remain reachable", async ({ page }) => {
  await page.goto("/?mode=explore#atlas");
  await expect(page.locator("#boundaryStatus")).toContainText("省界已开启");
  await expect(page.locator(".sarDock [data-special-region='香港']")).toBeVisible();
  await expect(page.locator(".sarDock [data-special-region='澳门']")).toBeVisible();

  const nationalCanvas = page.locator("#chinaMap canvas");
  const nationalBox = await nationalCanvas.boundingBox();
  const jiangsuPixel = await page.evaluate(() => mapChart.convertToPixel({ seriesIndex: 0 }, [119.1, 32.8]));
  await page.mouse.click(nationalBox.x + jiangsuPixel[0], nationalBox.y + jiangsuPixel[1]);
  await expect(page.locator("#boundaryStatus")).toContainText("13 个市/州/区边界");
  await expect(page.locator("#v21Breadcrumb")).toContainText("江苏");

  const provinceBox = await nationalCanvas.boundingBox();
  const nantongPixel = await page.evaluate(() => mapChart.convertToPixel({ seriesIndex: 0 }, [121.0, 32.0]));
  await page.mouse.click(provinceBox.x + nantongPixel[0], provinceBox.y + nantongPixel[1]);
  await expect(page.locator("#v21Breadcrumb")).toContainText("江苏/南通");

  await page.locator("#provinceJump").selectOption("台湾");
  await expect(page.locator("#boundaryStatus")).toContainText("20 个市/州/区边界");
  await expect(page.locator("#cityJump option")).toHaveCount(21);
});

test("Mobile uses one primary surface and converts the company table to cards", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(nantongUrl);
  await expect(page.locator(".mapColumn")).toBeVisible();
  await expect(page.locator(".detail")).toBeHidden();
  await page.getByRole("button", { name: "城市详情", exact: true }).click();
  await page.getByRole("tab", { name: "企业数据" }).click();
  await expect(page.locator(".mapColumn")).toBeHidden();
  await expect(page.locator(".detail")).toBeVisible();
  await expect(page.locator(".v21TableWrap")).toBeHidden();
  await expect(page.locator(".v21CompanyCard")).toHaveCount(22);
  await expectNoPageOverflow(page);
  const fontSize = await page.locator(".v21CompanyCard p").first().evaluate((element) => getComputedStyle(element).fontSize);
  expect(Number.parseFloat(fontSize)).toBeGreaterThanOrEqual(11);
});

test("External-network failure keeps local map and offline status remains explicit", async ({ page, context }) => {
  await page.route(/https?:\/\/(?!127\.0\.0\.1|localhost).*/, (route) => route.abort());
  await page.goto(nantongUrl);
  await expect(page.locator("#chinaMap canvas")).toHaveCount(1);
  await context.setOffline(true);
  await page.evaluate(() => window.dispatchEvent(new Event("offline")));
  await expect(page.locator("#v21Connection")).toContainText("离线 · 本地核心可用");
  await expect(page.locator("#v21Toast")).toContainText("本地地图、城市与企业数据仍可使用");
});
