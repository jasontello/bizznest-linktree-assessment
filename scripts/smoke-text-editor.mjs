import { chromium } from "playwright";

const url =
  process.env.SMOKE_URL ??
  "http://127.0.0.1:4173/bizznest-linktree-assessment/";

const OPTIONAL_FIELDS = ["description", "location", "role"];

function gapBetween(upperRect, lowerRect) {
  return Number((lowerRect.y - (upperRect.y + upperRect.height)).toFixed(2));
}

function overlaps(firstRect, secondRect) {
  return !(
    firstRect.x + firstRect.width <= secondRect.x ||
    secondRect.x + secondRect.width <= firstRect.x ||
    firstRect.y + firstRect.height <= secondRect.y ||
    secondRect.y + secondRect.height <= firstRect.y
  );
}

function distanceBetween(firstRect, secondRect) {
  const horizontalGap = Math.max(
    firstRect.x - (secondRect.x + secondRect.width),
    secondRect.x - (firstRect.x + firstRect.width),
    0,
  );
  const verticalGap = Math.max(
    firstRect.y - (secondRect.y + secondRect.height),
    secondRect.y - (firstRect.y + firstRect.height),
    0,
  );

  return Math.hypot(horizontalGap, verticalGap);
}

async function resetPage(page, viewport) {
  await page.setViewportSize(viewport);
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(650);

  if ((await page.locator(".app-shell").getAttribute("data-layout")) !== "grid") {
    await page.getByRole("button", { name: "Switch to grid view" }).click();
    await page.waitForTimeout(650);
  }
}

async function enterEditMode(page) {
  await page.getByRole("button", { name: "Turn edit mode on" }).click();
  await page.waitForTimeout(450);
}

async function hideFields(page, fields) {
  for (const field of fields) {
    await page
      .getByRole("button", { name: `Edit ${field}` })
      .click({ force: true });
    const label = `${field[0].toUpperCase()}${field.slice(1)}`;
    await page
      .getByRole("dialog", { name: `${label} text controls` })
      .getByRole("button", { name: "Hide from page" })
      .click({ force: true });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(420);
  }
}

async function readPublicGridGap(page) {
  const stageRect = await page.locator(".layout-stage").boundingBox();
  const upperRect = await page.locator(".profile-header").evaluate((element) => {
    const rects = Array.from(element.querySelectorAll("[data-profile-field]"))
      .filter((field) => field.dataset.profileVisible === "true")
      .map((field) => field.getBoundingClientRect().toJSON())
      .filter((rect) => rect.height > 0);

    if (!rects.length) {
      return element.getBoundingClientRect().toJSON();
    }

    return rects.reduce((lowest, rect) =>
      rect.y + rect.height > lowest.y + lowest.height ? rect : lowest,
    );
  });

  const headerState = await page.locator(".profile-header").evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      top: rect.top,
      bottom: rect.bottom,
      height: rect.height,
      emptyHeight: element.style.getPropertyValue("--grid-empty-header-height"),
      computedMinHeight: getComputedStyle(element).minHeight,
    };
  });
  const pageState = await page.locator(".profile-page").evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      alignContent: style.alignContent,
      gap: style.gap,
      gridTemplateRows: style.gridTemplateRows,
    };
  });
  const stageState = await page.locator(".layout-stage").evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return { top: rect.top, marginTop: style.marginTop, transform: style.transform };
  });

  return {
    gap: gapBetween(upperRect, stageRect),
    headerState,
    pageState,
    stageState,
    upperRect,
  };
}

async function verifyResponsiveHiddenSpacing(page, viewport) {
  console.log(`Checking hidden-text spacing at ${viewport.width}px.`);
  await resetPage(page, viewport);
  const baseline = await readPublicGridGap(page);

  await enterEditMode(page);
  await hideFields(page, OPTIONAL_FIELDS);
  await page.getByRole("button", { name: "Done" }).click();
  await page.waitForTimeout(550);

  const hidden = await readPublicGridGap(page);
  const visibleDetailCount = await page
    .locator(".profile-page")
    .getAttribute("data-visible-profile-details");

  if (
    visibleDetailCount !== "0" ||
    hidden.gap < 0 ||
    hidden.gap > baseline.gap + 5
  ) {
    throw new Error(
      `${viewport.width}px hidden-text spacing failed. Baseline: ${JSON.stringify(baseline)}; hidden: ${JSON.stringify(hidden)}; visible details: ${visibleDetailCount}.`,
    );
  }

  return {
    width: viewport.width,
    baselineGap: baseline.gap,
    hiddenGap: hidden.gap,
  };
}

async function verifyKeyboardAndPopover(page) {
  await resetPage(page, { width: 1280, height: 720 });
  await enterEditMode(page);
  await hideFields(page, ["location", "role"]);

  const descriptionTarget = page.getByRole("button", {
    name: "Edit description",
  });
  await descriptionTarget.press("Enter");

  const descriptionInput = page.getByRole("textbox", {
    name: "Profile description",
  });
  const dialog = page.getByRole("dialog", {
    name: "Description text controls",
  });

  if (!(await descriptionInput.isVisible()) || !(await dialog.isVisible())) {
    throw new Error("Enter did not open the description editor and its controls.");
  }

  const dialogRect = await dialog.boundingBox();
  const siblingRects = await page
    .locator(
      '[data-profile-field]:not([data-profile-field="bio"])[data-profile-visible="true"]',
    )
    .evaluateAll((elements) =>
      elements.map((element) => {
        const inlineInput = element.querySelector(".profile-inline-input");
        if (inlineInput) {
          return inlineInput.getBoundingClientRect().toJSON();
        }

        const textContent = element.querySelector(".profile-text-scale");
        if (textContent) {
          const range = document.createRange();
          range.selectNodeContents(textContent);
          return range.getBoundingClientRect().toJSON();
        }

        return element.getBoundingClientRect().toJSON();
      }),
    );

  if (siblingRects.some((rect) => overlaps(dialogRect, rect))) {
    throw new Error("The text controls overlap an adjacent profile text row.");
  }

  await descriptionInput.press("Tab");
  const decreaseButton = page.getByRole("button", {
    name: "Decrease Description text size",
  });

  if (!(await decreaseButton.evaluate((element) => element === document.activeElement))) {
    throw new Error("Tab did not move focus from the text field into the popup.");
  }

  const slider = page.getByRole("slider", { name: "Description text size" });
  const valueText = await slider.getAttribute("aria-valuetext");
  if (valueText !== "100 percent") {
    throw new Error(`The text-size slider has an incorrect value label: ${valueText}`);
  }

  await page.keyboard.press("Escape");
  await page.waitForTimeout(520);
  const focusReturned = await descriptionTarget.evaluate(
    (element) => element === document.activeElement,
  );
  if (!focusReturned) {
    throw new Error("Closing the text controls did not return focus to the edited row.");
  }

  const focusStyle = await descriptionTarget.evaluate((element) => {
    const style = getComputedStyle(element);
    return { outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth };
  });
  if (focusStyle.outlineStyle === "none" || focusStyle.outlineWidth === "0px") {
    throw new Error(`The editable text target has no visible focus cue: ${JSON.stringify(focusStyle)}`);
  }

  await page.getByRole("button", { name: "Switch to list view" }).click();
  await page.waitForTimeout(500);
  const listDescriptionTarget = page.getByRole("button", {
    name: "Edit description",
  });
  const beforeFocus = await listDescriptionTarget.boundingBox();
  let activeLabel = "";
  for (let step = 0; step < 10 && activeLabel !== "Edit description"; step += 1) {
    await page.keyboard.press("Tab");
    activeLabel = await page.evaluate(
      () => document.activeElement?.getAttribute("aria-label") ?? "",
    );
  }

  if (activeLabel !== "Edit description") {
    throw new Error(`Tab navigation did not reach the description row: ${activeLabel}`);
  }

  const afterFocus = await listDescriptionTarget.boundingBox();
  const listFocusStyle = await listDescriptionTarget.evaluate((element) => {
    const style = getComputedStyle(element);
    return { outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth };
  });
  const geometryShift = Math.max(
    Math.abs(beforeFocus.x - afterFocus.x),
    Math.abs(beforeFocus.y - afterFocus.y),
    Math.abs(beforeFocus.width - afterFocus.width),
    Math.abs(beforeFocus.height - afterFocus.height),
  );

  if (
    geometryShift > 0.5 ||
    listFocusStyle.outlineStyle === "none" ||
    listFocusStyle.outlineWidth === "0px"
  ) {
    throw new Error(
      `List-mode keyboard focus moved the text or lost its cue: ${JSON.stringify({ geometryShift, listFocusStyle })}`,
    );
  }

  return { sliderValueText: valueText, focusStyle, listFocusStyle };
}

async function verifyOverflowCue(page) {
  await resetPage(page, { width: 760, height: 520 });
  await enterEditMode(page);
  await page.getByRole("button", { name: "Edit description" }).click();

  const descriptionInput = page.getByRole("textbox", {
    name: "Profile description",
  });
  await descriptionInput.fill(
    "A deliberately long portfolio description that wraps across many lines so the editor must grow and communicate that more content is available below the fold.",
  );
  await page.getByRole("slider", { name: "Description text size" }).press("End");
  await page.waitForTimeout(500);

  const shellState = await page.locator(".app-shell").evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
      overflowY: style.overflowY,
      scrollbarWidth: style.scrollbarWidth,
    };
  });

  if (
    shellState.scrollHeight <= shellState.clientHeight ||
    !["auto", "scroll"].includes(shellState.overflowY) ||
    shellState.scrollbarWidth !== "thin"
  ) {
    throw new Error(`The overflowing editor has no persistent scroll cue: ${JSON.stringify(shellState)}`);
  }

  return shellState;
}

async function verifyProfilePopoverProximity(page) {
  const cases = [
    { target: "Edit name", dialog: "Name text controls", input: "Profile name" },
    {
      target: "Edit description",
      dialog: "Description text controls",
      input: "Profile description",
    },
    {
      target: "Edit location",
      dialog: "Location text controls",
      input: "Profile location",
    },
    { target: "Edit role", dialog: "Role text controls", input: "Profile role" },
  ];
  const viewports = [
    { width: 1800, height: 1007 },
    { width: 1280, height: 720 },
    { width: 760, height: 850 },
    { width: 390, height: 844 },
  ];
  const results = {};

  for (const viewport of viewports) {
    await resetPage(page, viewport);
    await enterEditMode(page);
    const viewportResults = {};

    for (const testCase of cases) {
      const target = page.getByRole("button", { name: testCase.target });
      await target.click({ force: true });

      const dialog = page.getByRole("dialog", { name: testCase.dialog });
      const input = page.getByRole("textbox", { name: testCase.input });
      const [inputRect, dialogRect] = await Promise.all([
        input.boundingBox(),
        dialog.boundingBox(),
      ]);
      const distance = distanceBetween(inputRect, dialogRect);

      if (overlaps(inputRect, dialogRect) || distance > 8) {
        throw new Error(
          `${testCase.dialog} is not anchored to its selected text at ${viewport.width}px: ${JSON.stringify({ inputRect, dialogRect, distance })}`,
        );
      }

      viewportResults[testCase.input] = Number(distance.toFixed(2));
      await input.press("Escape");
      await page.waitForTimeout(420);
    }

    results[`${viewport.width}x${viewport.height}`] = viewportResults;
  }

  return results;
}

const browser = await chromium.launch();
const page = await browser.newPage();

try {
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(message.text());
    }
  });

  const spacing = [];
  spacing.push(
    await verifyResponsiveHiddenSpacing(page, { width: 390, height: 844 }),
  );
  spacing.push(
    await verifyResponsiveHiddenSpacing(page, { width: 760, height: 900 }),
  );
  spacing.push(
    await verifyResponsiveHiddenSpacing(page, { width: 761, height: 900 }),
  );
  spacing.push(
    await verifyResponsiveHiddenSpacing(page, { width: 1800, height: 1007 }),
  );
  const accessibility = await verifyKeyboardAndPopover(page);
  const profilePopovers = await verifyProfilePopoverProximity(page);
  const overflow = await verifyOverflowCue(page);

  if (errors.length) {
    throw new Error(`Console errors found: ${errors.join(" | ")}`);
  }

  console.log(
    "Text editor smoke check passed:",
    JSON.stringify({ spacing, accessibility, profilePopovers, overflow }),
  );
} finally {
  await browser.close();
}
