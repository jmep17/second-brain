import { readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.ARTIFACT_REVIEW_BASE_URL;
if (!baseUrl) {
  throw new Error("ARTIFACT_REVIEW_BASE_URL is required");
}

const artifactFile = "2026-08-26-plan-013-execution-review.html";
const reviewPath = `/artifacts/review/diagrams/${artifactFile}`;
const repoRoot = path.resolve(process.cwd(), "..");
let filedPath = null;
let browser;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

try {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(`${baseUrl}/artifacts`);
  await page.locator(`a[href="${reviewPath}"]`).click();
  await page.waitForURL(`**${reviewPath}`);

  const frame = page.frameLocator('iframe[title="Artifact under review"]');
  await frame.locator("header").waitFor();
  await page.getByRole("button", { name: "Start review mode" }).click();

  const header = frame.locator("header");
  await header.focus();
  await header.press("Enter");
  await page
    .locator("[data-selected-target]")
    .filter({ hasText: "component" })
    .waitFor();

  const diagram = frame.locator(".mermaid svg").first();
  await diagram.waitFor();
  await diagram.evaluate((svg) => {
    const ns = "http://www.w3.org/2000/svg";
    const node = document.createElementNS(ns, "g");
    const rect = document.createElementNS(ns, "rect");
    const text = document.createElementNS(ns, "text");
    node.setAttribute("class", "node");
    node.setAttribute("id", "synthetic-review-node");
    rect.setAttribute("x", "10");
    rect.setAttribute("y", "10");
    rect.setAttribute("width", "180");
    rect.setAttribute("height", "40");
    rect.setAttribute("fill", "white");
    text.setAttribute("x", "20");
    text.setAttribute("y", "35");
    text.textContent = "Synthetic dynamic node";
    node.append(rect);
    node.append(text);
    svg.append(node);
  });

  const dynamicNode = frame.locator("g.node#synthetic-review-node");
  await dynamicNode.waitFor();
  await dynamicNode.getAttribute("data-artifact-review-target", {
    timeout: 5_000,
  });
  assert(
    await dynamicNode.getAttribute("data-artifact-review-target"),
    "MutationObserver did not discover the synthetic diagram node"
  );
  await dynamicNode.click();

  const selected = page.locator("[data-selected-target]");
  assert(
    (await selected.count()) === 2,
    "expected exactly two selected targets"
  );
  await selected
    .nth(0)
    .getByLabel("Requested change")
    .fill("Tighten the header summary.");
  await selected
    .nth(1)
    .getByLabel("Requested change")
    .fill("Rename the dynamic node.");
  await page.getByLabel("Batch title").fill("Plan 013 grouped review");
  await page
    .getByLabel("Overall instruction")
    .fill("Apply both review comments as one coherent change.");
  await page.getByRole("button", { name: "Queue for agent" }).click();

  const status = page.getByRole("status");
  await status.waitFor();
  const statusText = (await status.textContent()) ?? "";
  const match =
    /^Filed (\.scratch\/artifact-feedback\/issues\/[^/]+\.md)$/.exec(
      statusText.trim()
    );
  assert(match, `unexpected filed status: ${statusText}`);
  filedPath = match[1];

  const issue = await readFile(path.join(repoRoot, filedPath), "utf8");
  for (const expected of [
    "Status: ready-for-agent",
    "Execution: queued",
    "Kind: component",
    "Kind: diagram-node",
    "Tighten the header summary.",
    "Rename the dynamic node.",
    "> Execution review · 2026-08-26 · flowchart Plan 013 execution review Repo-side work is approved; machine installs remain behind the merge boundary.",
    "> Synthetic dynamic node",
  ]) {
    assert(
      issue.includes(expected),
      `filed issue is missing ${JSON.stringify(expected)}`
    );
  }
  assert(
    issue.includes("Selected excerpt (evidence only):"),
    "filed issue does not label selected excerpts as evidence"
  );

  console.log(`artifact review passed; filed ${filedPath}`);
} finally {
  if (browser) await browser.close();
  if (filedPath) {
    await unlink(path.join(repoRoot, filedPath));
    console.log(`removed smoke issue ${filedPath}`);
  }
}
