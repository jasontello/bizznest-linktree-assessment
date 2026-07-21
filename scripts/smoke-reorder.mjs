import { chromium } from "playwright";

const url =
  process.env.SMOKE_URL ?? "http://localhost:5173/bizznest-linktree-assessment/";

function center(rect) {
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
  };
}

async function getOrder(page) {
  return page
    .locator(".link-card-shell")
    .evaluateAll((elements) => elements.map((element) => element.dataset.linkId));
}

async function enterEditMode(page) {
  await page.getByRole("button", { name: "Turn edit mode on" }).click({
    force: true,
  });
  await page.waitForTimeout(700);
}

async function assertListButtonsAreFullyVisible(page, label) {
  const states = await page.locator(".link-card").evaluateAll((elements) =>
    elements.map((element) => {
      const style = getComputedStyle(element);

      return {
        animationName: style.animationName,
        opacity: style.opacity,
        visibility: style.visibility,
      };
    }),
  );

  if (
    states.some(
      (state) =>
        state.animationName !== "none" ||
        state.opacity !== "1" ||
        state.visibility !== "visible",
    )
  ) {
    throw new Error(
      `${label} did not keep every list button fully visible. States: ${JSON.stringify(states)}`,
    );
  }
}

async function verifyDraggedButtonStaysVisibleDuringListIntro(page) {
  await page
    .getByRole("button", { name: "Switch to grid view" })
    .evaluate((button) => button.click());
  await page.waitForTimeout(700);
  await page
    .getByRole("button", { name: "Switch to list view" })
    .evaluate((button) => button.click());
  await page.waitForTimeout(30);
  await assertListButtonsAreFullyVisible(page, "List entrance");

  const order = await getOrder(page);
  const sourceHandle = page
    .locator(`[data-link-id="${order[0]}"]`)
    .getByRole("button", { name: /^Move / });
  const handleRect = await sourceHandle.boundingBox();
  const start = center(handleRect);

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 18, start.y + 22, { steps: 3 });
  await page.waitForTimeout(40);

  const draggedShell = page.locator(".link-card-shell.is-dragging");
  if ((await draggedShell.count()) !== 1) {
    throw new Error("A quick drag did not enter the active dragging state.");
  }

  const draggedCardState = await draggedShell
    .locator(".link-card")
    .evaluate((element) => {
      const style = getComputedStyle(element);

      return {
        animationName: style.animationName,
        opacity: style.opacity,
        visibility: style.visibility,
      };
    });

  if (
    draggedCardState.animationName !== "none" ||
    draggedCardState.opacity !== "1" ||
    draggedCardState.visibility !== "visible"
  ) {
    throw new Error(
      `The dragged button disappeared during the list entrance animation. State: ${JSON.stringify(draggedCardState)}`,
    );
  }

  await page.mouse.up();
  await page.mouse.move(30, 30);
  await page.waitForTimeout(380);
  await assertListButtonsAreFullyVisible(page, "Quick drag release");

  const unsettledTransforms = await page
    .locator(".link-card-shell")
    .evaluateAll((elements) =>
      elements
        .map((element) => {
          const transform = getComputedStyle(element).transform;

          if (transform === "none") {
            return null;
          }

          const matrix = new DOMMatrixReadOnly(transform);
          const isResting =
            Math.abs(matrix.m41) <= 0.75 &&
            Math.abs(matrix.m42) <= 0.75 &&
            Math.abs(matrix.a - 1) <= 0.003;
          const isHoverLift =
            Math.abs(matrix.m41) <= 0.75 &&
            Math.abs(matrix.m42 + 8) <= 0.75 &&
            Math.abs(matrix.a - 1.018) <= 0.003;

          return isResting || isHoverLift ? null : transform;
        })
        .filter(Boolean),
    );

  if (unsettledTransforms.length > 0) {
    throw new Error(
      `The reordered buttons did not snap into place quickly. Transforms: ${JSON.stringify(unsettledTransforms)}`,
    );
  }
}

async function dragFirstButtonToBottom(page) {
  const shells = page.locator(".link-card-shell");
  const initialOrder = await getOrder(page);
  const initialRects = await shells.evaluateAll((elements) =>
    elements.map((element) => element.getBoundingClientRect().toJSON()),
  );
  const sourceShell = page.locator(
    `.link-card-shell[data-link-id="${initialOrder[0]}"]`,
  );
  const sourceButton = sourceShell.locator(".link-card");
  const buttonRect = await sourceButton.boundingBox();
  const lastRect = await shells.last().boundingBox();
  const buttonCenter = center(buttonRect);
  const targetPoint = {
    x: buttonCenter.x + 56,
    y: lastRect.y + lastRect.height + 28,
  };

  await page.mouse.move(buttonCenter.x, buttonCenter.y);
  await page.mouse.down();
  for (let step = 1; step <= 18; step += 1) {
    const progress = step / 18;
    await page.mouse.move(
      buttonCenter.x + (targetPoint.x - buttonCenter.x) * progress,
      buttonCenter.y + (targetPoint.y - buttonCenter.y) * progress,
    );
    await page.waitForTimeout(18);
  }
  await page.waitForTimeout(260);

  const midDragOrder = await getOrder(page);
  const draggedShell = page.locator(".link-card-shell.is-dragging");
  const draggedRect = await draggedShell.boundingBox();
  const displacedSecondRect = await page
    .locator(`[data-link-id="${initialOrder[1]}"]`)
    .boundingBox();
  const checkerOpacity = await sourceShell
    .locator(".hover-checker-outline")
    .evaluate((element) => getComputedStyle(element).opacity);
  const visibleCheckerCount = await page
    .locator(".hover-checker-outline")
    .evaluateAll(
      (elements) =>
        elements.filter(
          (element) => Number.parseFloat(getComputedStyle(element).opacity) > 0,
        ).length,
    );
  const hoverTargetDuringDrag = await page
    .locator(".app-shell")
    .getAttribute("data-hover-target");

  if (
    (await draggedShell.count()) !== 1 ||
    midDragOrder.at(-1) !== initialOrder[0]
  ) {
    throw new Error(
      `The list did not open a live slot while dragging. Initial: ${JSON.stringify(initialOrder)}; mid-drag: ${JSON.stringify(midDragOrder)}`,
    );
  }

  if (draggedRect.y <= initialRects[0].y + 80) {
    throw new Error(
      `The dragged button did not follow the pointer. Initial: ${JSON.stringify(initialRects[0])}; dragged: ${JSON.stringify(draggedRect)}`,
    );
  }

  if (displacedSecondRect.y >= initialRects[1].y - 24) {
    throw new Error(
      `Neighboring buttons did not move aside during the drag. Before: ${JSON.stringify(initialRects[1])}; during: ${JSON.stringify(displacedSecondRect)}`,
    );
  }

  if (
    checkerOpacity !== "0" ||
    visibleCheckerCount !== 0 ||
    hoverTargetDuringDrag !== null
  ) {
    throw new Error(
      `A checker or hover selection remained active during dragging. Source opacity: ${checkerOpacity}; visible checkers: ${visibleCheckerCount}; hover target: ${hoverTargetDuringDrag}`,
    );
  }

  await page.mouse.up();
  await page.waitForTimeout(650);

  const finalOrder = await getOrder(page);
  if (finalOrder.join("|") !== midDragOrder.join("|")) {
    throw new Error(
      `The released order did not match the live preview. Preview: ${JSON.stringify(midDragOrder)}; final: ${JSON.stringify(finalOrder)}`,
    );
  }

  return finalOrder;
}

async function dragLastButtonToTopQuickly(page) {
  const orderBefore = await getOrder(page);
  const sourceId = orderBefore.at(-1);
  const sourceHandle = page
    .locator(`[data-link-id="${sourceId}"]`)
    .getByRole("button", { name: /^Move / });
  const sourceRect = await sourceHandle.boundingBox();
  const firstRect = await page.locator(".link-card-shell").first().boundingBox();
  const start = center(sourceRect);
  const target = { x: start.x - 36, y: firstRect.y - 26 };

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  for (let step = 1; step <= 6; step += 1) {
    const progress = step / 6;
    await page.mouse.move(
      start.x + (target.x - start.x) * progress,
      start.y + (target.y - start.y) * progress,
    );
    await page.waitForTimeout(20);
  }
  await page.waitForTimeout(220);
  await page.mouse.up();
  await page.waitForTimeout(620);

  const orderAfter = await getOrder(page);
  if (orderAfter.indexOf(sourceId) >= orderBefore.indexOf(sourceId)) {
    throw new Error(
      `A quick upward drag did not move the button upward. Before: ${JSON.stringify(orderBefore)}; after: ${JSON.stringify(orderAfter)}`,
    );
  }
}

async function verifyDragCancellation(page) {
  const orderBefore = await getOrder(page);
  const sourceId = orderBefore[0];
  const sourceHandle = page
    .locator(`[data-link-id="${sourceId}"]`)
    .getByRole("button", { name: /^Move / });
  const sourceRect = await sourceHandle.boundingBox();
  const thirdRect = await page.locator(".link-card-shell").nth(2).boundingBox();
  const start = center(sourceRect);

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  for (let step = 1; step <= 10; step += 1) {
    const progress = step / 10;
    await page.mouse.move(
      start.x + 30 * progress,
      start.y + (thirdRect.y - start.y) * progress,
    );
    await page.waitForTimeout(20);
  }
  await page.waitForTimeout(180);
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await page.waitForTimeout(480);

  const orderAfter = await getOrder(page);
  const draggingCount = await page.locator(".link-card-shell.is-dragging").count();
  const announcement = await page.locator("[aria-live='polite']").textContent();

  if (
    orderAfter.join("|") !== orderBefore.join("|") ||
    draggingCount !== 0 ||
    !announcement.includes("cancelled")
  ) {
    throw new Error(
      `Escape did not restore the pre-drag order. Before: ${JSON.stringify(orderBefore)}; after: ${JSON.stringify(orderAfter)}; dragging: ${draggingCount}; announcement: ${announcement}`,
    );
  }
}

const browser = await chromium.launch();

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => window.localStorage.clear());
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);
  await enterEditMode(page);
  await verifyDraggedButtonStaysVisibleDuringListIntro(page);

  const finalPointerOrder = await dragFirstButtonToBottom(page);

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);
  const persistedOrder = await getOrder(page);
  if (persistedOrder.join("|") !== finalPointerOrder.join("|")) {
    throw new Error(
      `The reordered list did not persist after reload. Expected: ${JSON.stringify(finalPointerOrder)}; received: ${JSON.stringify(persistedOrder)}`,
    );
  }

  await enterEditMode(page);
  const beforeKeyboardOrder = await getOrder(page);
  const firstHandle = page
    .locator(`[data-link-id="${beforeKeyboardOrder[0]}"]`)
    .getByRole("button", { name: /^Move / });
  await firstHandle.focus();
  await page.keyboard.press("ArrowDown");
  await page.waitForTimeout(360);

  const afterKeyboardOrder = await getOrder(page);
  const announcement = await page.locator("[aria-live='polite']").textContent();
  if (
    afterKeyboardOrder[1] !== beforeKeyboardOrder[0] ||
    !announcement.includes("position 2")
  ) {
    throw new Error(
      `Keyboard reordering failed. Before: ${JSON.stringify(beforeKeyboardOrder)}; after: ${JSON.stringify(afterKeyboardOrder)}; announcement: ${announcement}`,
    );
  }

  await firstHandle.focus();
  await page.keyboard.press("ArrowUp");
  await page.waitForTimeout(360);
  const afterKeyboardReturn = await getOrder(page);
  if (afterKeyboardReturn[0] !== beforeKeyboardOrder[0]) {
    throw new Error(
      `Keyboard upward reordering failed. Expected ${beforeKeyboardOrder[0]} first; received: ${JSON.stringify(afterKeyboardReturn)}`,
    );
  }

  await dragLastButtonToTopQuickly(page);
  await verifyDragCancellation(page);

  const reducedPage = await browser.newPage({
    viewport: { width: 1280, height: 720 },
    reducedMotion: "reduce",
  });
  await reducedPage.goto(url, { waitUntil: "domcontentloaded" });
  await reducedPage.evaluate(() => window.localStorage.clear());
  await reducedPage.reload({ waitUntil: "domcontentloaded" });
  await reducedPage.waitForTimeout(120);
  await enterEditMode(reducedPage);

  const reducedMotionState = await reducedPage
    .locator(".link-list")
    .getAttribute("data-reduced-motion");
  if (reducedMotionState !== "true") {
    throw new Error("The list did not enter its reduced-motion mode.");
  }

  const reducedOrderBefore = await getOrder(reducedPage);
  const reducedFirstHandle = reducedPage
    .locator(`[data-link-id="${reducedOrderBefore[0]}"]`)
    .getByRole("button", { name: /^Move / });
  await reducedFirstHandle.focus();
  await reducedPage.keyboard.press("ArrowDown");
  await reducedPage.waitForTimeout(80);
  const reducedOrderAfter = await getOrder(reducedPage);

  if (reducedOrderAfter[1] !== reducedOrderBefore[0]) {
    throw new Error(
      `Reduced-motion reordering failed. Before: ${JSON.stringify(reducedOrderBefore)}; after: ${JSON.stringify(reducedOrderAfter)}`,
    );
  }

  await reducedPage.close();

  if (consoleErrors.length > 0) {
    throw new Error(`Console errors found: ${consoleErrors.join(" | ")}`);
  }

  console.log(
    "Reorder smoke check passed: the dragged button follows the pointer, neighboring buttons move live, the order persists, keyboard controls work, and reduced motion remains functional.",
  );
} finally {
  await browser.close();
}
