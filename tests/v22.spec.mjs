import { test, expect } from "@playwright/test";

const investorUrl = "/?mode=investor&province=%E6%B1%9F%E8%8B%8F&city=%E5%8D%97%E9%80%9A#workbench";

async function expectNoPageOverflow(page) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
}

test.beforeEach(async ({ page }) => {
  await page.goto(investorUrl);
  await page.evaluate(() => localStorage.removeItem("atlas.v22.workspaces"));
  await page.reload();
  await expect(page.locator("body")).toHaveClass(/v22-ready/);
});

test("Investor builds a user-selected peer set and exports a thesis memo", async ({ page }) => {
  await expect(page.locator("[data-v22-workspace='investor']")).toBeVisible();
  await expect(page.locator(".v22PeerTable")).toHaveCount(0);
  await page.locator("[data-v22-next]").click();
  await expect(page.locator(".v22PeerTable tbody tr")).toHaveCount(1);
  await expect(page.locator(".v22PeerTable")).not.toContainText("深圳");
  await expect(page.locator(".v22PeerTable")).not.toContainText("合肥");
  await page.locator("#v22PeerSelect").selectOption("苏州");
  await page.locator("[data-v22-add-peer]").click();
  await expect(page.locator(".v22PeerTable tbody tr")).toHaveCount(2);
  await expect(page.locator(".v22PeerTable")).toContainText("同省产业与要素背景");

  await page.locator("[data-v22-next]").click();
  await page.locator("[data-v22-investor-evidence='position']").check();
  await page.locator("[data-v22-bind='investor.thesis']").fill("南通的本地企业样本支持继续核验海上风电装备产业链，但仍需验证产能、客户和持续资本开支。");
  await page.locator("[data-v22-bind='investor.risks']").fill("样本不是工商全量，集团口径不能直接推导本地产值。");
  await page.locator("[data-v22-bind='investor.invalidation']").fill("若无法证明本地基地持续经营和投入，则应下调判断。");
  await page.locator("[data-v22-next]").click();
  await expect(page.getByRole("heading", { name: "研究备忘录", exact: true })).toBeVisible();
  await expect(page.locator(".v22Memo")).toContainText("南通的本地企业样本支持继续核验");
  await expect(page.locator(".v22Memo")).toContainText("苏州");
  await page.screenshot({ path: "docs/qa/v22/v22-investor-memo-1440x900.png", fullPage: false });

  const downloadPromise = page.waitForEvent("download");
  await page.locator("[data-v22-download='investor']").click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toContain("南通-投资研究备忘录");
});

test("Policy turns a chain gap into a qualified shortlist and local action pipeline", async ({ page }) => {
  await page.getByRole("tab", { name: /Policy/ }).click();
  await page.locator("[data-v22-policy-task='强链']").click();
  await page.locator("[data-v22-next]").click();
  await expect(page.locator(".v22GapRow")).toHaveCount(6);
  await expect(page.locator("#v21ModeCanvas")).toContainText("不等于当地真实没有企业、产能或项目");
  await page.locator("[data-v22-select-gap]").first().click();
  await page.locator("[data-v22-next]").click();
  await expect(page.locator(".v22CandidateRow")).toHaveCount(12);
  await expect(page.locator("#v21ModeCanvas")).toContainText("未核实其投资、迁移、扩产意向");
  await page.locator("[data-v22-shortlist]").first().click();
  await page.locator("[data-v22-next]").click();
  await expect(page.locator(".v22PipelineRow")).toHaveCount(1);
  await page.locator("[data-v22-pipeline-field='owner']").fill("产业研究组");
  await page.locator("[data-v22-pipeline-field='nextAction']").fill("核验企业基地、客户和扩产公告");
  await expect(page.locator(".v22Memo")).toContainText("没有结构化客户、人才、能耗、土地或政策兑现数据");
  await page.screenshot({ path: "docs/qa/v22/v22-policy-pipeline-1440x900.png", fullPage: false });

  const downloadPromise = page.waitForEvent("download");
  await page.locator("[data-v22-download='policy']").click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toContain("南通-招商行动简报");
});

test("Learn requires an answer before showing process feedback and saves progress", async ({ page }) => {
  await page.getByRole("tab", { name: /Learn/ }).click();
  await expect(page.locator("[data-v22-learn-case]")).toHaveCount(3);
  await page.locator("[data-v22-learn-next]").click();
  await page.locator("[data-v22-learn-next]").click();
  await expect(page.locator("#v21Toast")).toContainText("请至少选择一条证据");
  await expect(page.getByRole("heading", { name: "哪些是事实，哪些仍是推断？", exact: true })).toBeVisible();

  await page.locator("[data-v22-learn-evidence='position']").check();
  await page.locator("[data-v22-learn-field='diagnosis']").fill("企业样本能证明本地存在相关业务线索，但不能直接证明完整集群、产能规模或持续资本开支。");
  await page.locator("[data-v22-learn-next]").click();
  await page.locator("[data-v22-learn-field='decision']").fill("当前证据支持继续核验南通海上风电装备集群，但需要基地、客户和项目状态的进一步验证。");
  await page.locator("[data-v22-learn-next]").click();
  await page.locator("[data-v22-learn-field='counterEvidence']").fill("相关企业可能只有集团业务，核心产线和客户并不在南通。");
  await page.locator("[data-v22-learn-field='invalidation']").fill("若公告和年报不能证明本地基地持续投入，就应放弃集群已形成的判断。");
  await page.locator("[data-v22-learn-next]").click();
  await expect(page.getByRole("heading", { name: "案例复盘", exact: true })).toBeVisible();
  await expect(page.locator(".v22RubricRow")).toHaveCount(5);
  await expect(page.locator(".v22EvidenceRail")).toContainText("1 / 3 案例完成");
  await expect(page.locator("#v21Toast")).not.toHaveClass(/show/);
  await page.screenshot({ path: "docs/qa/v22/v22-learn-debrief-1440x900.png", fullPage: false });
  await page.reload();
  await expect(page.getByRole("heading", { name: "案例复盘", exact: true })).toBeVisible();
});

for (const viewport of [
  { width: 390, height: 844, name: "390x844" },
  { width: 768, height: 1024, name: "768x1024" },
  { width: 1440, height: 900, name: "1440x900" },
  { width: 1920, height: 1080, name: "1920x1080" },
]) {
  test(`V2.2 Investor has no page overflow at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto(investorUrl);
    await expect(page.locator("[data-v22-workspace='investor']")).toBeVisible();
    await expectNoPageOverflow(page);
    await page.screenshot({ path: `docs/qa/v22/v22-investor-${viewport.name}.png`, fullPage: false });
  });
}

test("V2.2 workspaces have no unexpected console errors", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto(investorUrl);
  await page.getByRole("tab", { name: /Policy/ }).click();
  await page.getByRole("tab", { name: /Learn/ }).click();
  expect(errors).toEqual([]);
});
