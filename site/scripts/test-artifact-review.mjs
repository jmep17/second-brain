import { readFile, readdir, unlink } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.ARTIFACT_REVIEW_BASE_URL;
if (!baseUrl) {
  throw new Error("ARTIFACT_REVIEW_BASE_URL is required");
}

const artifactFile = "2026-08-26-plan-013-execution-review.html";
const reviewPath = `/artifacts/review/diagrams/${artifactFile}`;
const repoRoot = path.resolve(process.cwd(), "..");
const issueDir = path.join(repoRoot, ".scratch", "artifact-feedback", "issues");
const runMarker = `artifact-review-${process.pid}-${Date.now().toString(36)}`;
let filedPath = null;
let browser;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function issueNames() {
  try {
    const entries = await readdir(issueDir, { withFileTypes: true });
    return entries.filter((entry) => entry.isFile()).map((entry) => entry.name);
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
}

async function waitForReviewMarker(locator) {
  await locator.evaluate((node) => {
    if (node.hasAttribute("data-artifact-review-target")) return;
    return new Promise((resolve, reject) => {
      const observer = new MutationObserver(() => {
        if (!node.hasAttribute("data-artifact-review-target")) return;
        observer.disconnect();
        clearTimeout(timeout);
        resolve();
      });
      const timeout = setTimeout(() => {
        observer.disconnect();
        reject(new Error("review marker did not appear within 5 seconds"));
      }, 5_000);
      observer.observe(node, {
        attributes: true,
        attributeFilter: ["data-artifact-review-target"],
      });
    });
  });
}

async function foreignMarkerState(locator) {
  return locator.evaluate((element) => ({
    marker: element.getAttribute("data-artifact-review-target"),
    ariaSelected: element.getAttribute("aria-selected"),
    style: element.getAttribute("style"),
  }));
}

async function dispatchInteractionSentinels(locator) {
  return locator.evaluate((element) => {
    element.dispatchEvent(
      new PointerEvent("pointerdown", {
        bubbles: true,
        cancelable: true,
        pointerId: 41,
      })
    );
    element.dispatchEvent(
      new PointerEvent("pointermove", {
        bubbles: true,
        cancelable: true,
        pointerId: 41,
      })
    );
    element.dispatchEvent(
      new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY: 10 })
    );
    return { ...window.__artifactReviewSentinelCounts };
  });
}

const preExistingIssueNames = new Set(await issueNames());

try {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(`${baseUrl}/artifacts`);
  await page.locator(`a[href="${reviewPath}"]`).click();
  await page.waitForURL(`**${reviewPath}`);

  const frame = page.frameLocator('iframe[title="Artifact under review"]');
  await frame.locator("header").waitFor();

  await frame.locator("body").evaluate((body) => {
    const foreign = document.createElement("div");
    foreign.id = "foreign-review-marker";
    foreign.setAttribute("data-artifact-review-target", "foreign-owned-id");
    foreign.setAttribute("aria-selected", "legacy-value");
    foreign.style.outline = "7px dotted rgb(255, 0, 0)";
    foreign.style.outlineOffset = "9px";
    foreign.textContent = "Foreign marker";
    body.append(foreign);

    const background = document.createElement("div");
    background.id = "review-interaction-background";
    background.textContent = "Interaction sentinel background";
    body.append(background);

    window.__artifactReviewSentinelCounts = {
      pointerdown: 0,
      pointermove: 0,
      wheel: 0,
    };
    for (const eventName of ["pointerdown", "pointermove", "wheel"]) {
      background.addEventListener(eventName, () => {
        window.__artifactReviewSentinelCounts[eventName] += 1;
      });
    }
  });
  const foreignMarker = frame.locator("#foreign-review-marker");
  const foreignBefore = await foreignMarkerState(foreignMarker);
  const interactionBackground = frame.locator("#review-interaction-background");
  assert(
    JSON.stringify(
      await dispatchInteractionSentinels(interactionBackground)
    ) === JSON.stringify({ pointerdown: 1, pointermove: 1, wheel: 1 }),
    "artifact interaction sentinels did not run outside review mode"
  );

  await page.getByRole("button", { name: "Start review mode" }).click();

  const header = frame.locator("header");
  await waitForReviewMarker(header);
  assert(
    JSON.stringify(
      await dispatchInteractionSentinels(interactionBackground)
    ) === JSON.stringify({ pointerdown: 1, pointermove: 1, wheel: 1 }),
    "review mode did not suppress background pointer/wheel interaction"
  );
  await header.focus();
  await header.press("Enter");
  await page
    .locator("[data-selected-target]")
    .filter({ hasText: "component" })
    .waitFor();
  const headerId = await header.getAttribute("data-artifact-review-target");
  assert(headerId, "selected header has no reviewer ID");
  await header.evaluate((element) => {
    element.setAttribute("data-e2e-selected-header", "true");
  });
  const selectedHeader = frame.locator(
    'header[data-e2e-selected-header="true"]'
  );
  const headerCard = page.locator(`[data-selected-target="${headerId}"]`);
  await headerCard
    .getByLabel("Requested change")
    .fill("Tighten the header summary.");

  await header.evaluate((element) => {
    const inserted = document.createElement("header");
    inserted.setAttribute("data-inserted-before-selected", "true");
    inserted.textContent = "New same-kind header inserted before selection";
    element.parentElement?.insertBefore(inserted, element);
  });
  const insertedHeader = frame.locator(
    'header[data-inserted-before-selected="true"]'
  );
  await waitForReviewMarker(insertedHeader);
  assert(
    (await selectedHeader.getAttribute("data-artifact-review-target")) ===
      headerId,
    "selected header ID changed after a same-kind insertion before it"
  );
  assert(
    (await selectedHeader.getAttribute("aria-selected")) === "true",
    "original header lost its selected state after insertion"
  );
  assert(
    (await headerCard.getByLabel("Requested change").inputValue()) ===
      "Tighten the header summary.",
    "selected header comment was rebound after insertion"
  );
  assert(
    JSON.stringify(await foreignMarkerState(foreignMarker)) ===
      JSON.stringify(foreignBefore),
    "reviewer mutated a pre-existing foreign review marker"
  );

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
  await waitForReviewMarker(dynamicNode);
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
    .nth(1)
    .getByLabel("Requested change")
    .fill("Rename the dynamic node.");

  await page.getByRole("button", { name: "Exit review mode" }).click();
  await selectedHeader.evaluate((element) => {
    if (!element.hasAttribute("data-artifact-review-target")) return;
    return new Promise((resolve, reject) => {
      const observer = new MutationObserver(() => {
        if (element.hasAttribute("data-artifact-review-target")) return;
        observer.disconnect();
        clearTimeout(timeout);
        resolve();
      });
      const timeout = setTimeout(() => {
        observer.disconnect();
        reject(new Error("review marker was not cleaned within 5 seconds"));
      }, 5_000);
      observer.observe(element, {
        attributes: true,
        attributeFilter: ["data-artifact-review-target"],
      });
    });
  });
  assert(
    JSON.stringify(await foreignMarkerState(foreignMarker)) ===
      JSON.stringify(foreignBefore),
    "review cleanup mutated a pre-existing foreign review marker"
  );
  assert(
    JSON.stringify(
      await dispatchInteractionSentinels(interactionBackground)
    ) === JSON.stringify({ pointerdown: 2, pointermove: 2, wheel: 2 }),
    "artifact interaction did not resume outside review mode"
  );

  await page
    .getByLabel("Batch title")
    .fill(`Plan 013 grouped review ${runMarker}`);
  await page
    .getByLabel("Overall instruction")
    .fill(
      `Apply both review comments as one coherent change. Run marker: ${runMarker}`
    );
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
  assert(
    !preExistingIssueNames.has(path.basename(filedPath)),
    "review submission reused a pre-existing issue filename"
  );

  const issue = await readFile(path.join(repoRoot, filedPath), "utf8");
  for (const expected of [
    "Status: ready-for-agent",
    "Execution: queued",
    "Kind: component",
    "Kind: diagram-node",
    "Tighten the header summary.",
    "Rename the dynamic node.",
    runMarker,
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
  assert(
    /^> .*Plan 013 execution review.*$/m.test(issue),
    `filed issue does not quote the selected header title as evidence: ${issue
      .split("\n")
      .filter((line) => line.startsWith("> "))
      .join(" | ")}`
  );

  console.log(`artifact review passed; filed ${filedPath}`);
} finally {
  if (browser) await browser.close();
  for (const name of await issueNames()) {
    if (preExistingIssueNames.has(name)) continue;
    const issuePath = path.join(issueDir, name);
    const issue = await readFile(issuePath, "utf8");
    if (!issue.includes(runMarker)) continue;
    await unlink(issuePath);
    console.log(
      `removed smoke issue ${path.join(
        ".scratch",
        "artifact-feedback",
        "issues",
        name
      )}`
    );
  }
}
