import { chromium } from "playwright";

const url =
  process.env.SMOKE_URL ?? "http://localhost:5173/bizznest-linktree-assessment/";

function roundRect(rect) {
  return {
    x: Number(rect.x.toFixed(3)),
    y: Number(rect.y.toFixed(3)),
    width: Number(rect.width.toFixed(3)),
    height: Number(rect.height.toFixed(3)),
  };
}

async function getCheckerState(target) {
  const checker = target.locator(":scope > .hover-checker-outline");
  const rect = checker.locator("rect");
  const [targetBox, checkerBox] = await Promise.all([
    target.boundingBox(),
    checker.boundingBox(),
  ]);
  const beforeOffset = await rect.evaluate(
    (element) => getComputedStyle(element).strokeDashoffset,
  );
  await target.page().waitForTimeout(120);
  const afterOffset = await rect.evaluate(
    (element) => getComputedStyle(element).strokeDashoffset,
  );

  const visualState = await checker.evaluate(
    (element, offsets) => {
      const checkerStyle = getComputedStyle(element);
      const rectStyle = getComputedStyle(element.querySelector("rect"));

      return {
        opacity: checkerStyle.opacity,
        animationName: rectStyle.animationName,
        dashArray: rectStyle.strokeDasharray,
        beforeOffset: offsets.beforeOffset,
        afterOffset: offsets.afterOffset,
      };
    },
    { beforeOffset, afterOffset },
  );

  return { ...visualState, targetBox, checkerBox };
}

function assertMovingChecker(state, label) {
  const beforeOffset = Number.parseFloat(state.beforeOffset);
  const afterOffset = Number.parseFloat(state.afterOffset);
  const leftGap = state.checkerBox?.x - state.targetBox?.x;
  const rightGap =
    state.targetBox?.x + state.targetBox?.width -
    (state.checkerBox?.x + state.checkerBox?.width);
  const topGap = state.checkerBox?.y - state.targetBox?.y;
  const bottomGap =
    state.targetBox?.y + state.targetBox?.height -
    (state.checkerBox?.y + state.checkerBox?.height);
  const checkerFitsTarget =
    state.targetBox &&
    state.checkerBox &&
    state.checkerBox.width / state.targetBox.width > 0.8 &&
    state.checkerBox.height / state.targetBox.height > 0.8 &&
    Math.abs(leftGap - rightGap) < 1 &&
    Math.abs(topGap - bottomGap) < 1;

  if (
    state.opacity !== "1" ||
    state.animationName !== "hover-checker-march" ||
    state.dashArray === "none" ||
    !Number.isFinite(beforeOffset) ||
    !Number.isFinite(afterOffset) ||
    afterOffset >= beforeOffset ||
    !checkerFitsTarget
  ) {
    throw new Error(
      `${label} did not receive the moving checkered hover line. State: ${JSON.stringify(state)}`,
    );
  }
}

function assertStationary(before, after, label) {
  const differences = {
    x: Math.abs(before.x - after.x),
    y: Math.abs(before.y - after.y),
    width: Math.abs(before.width - after.width),
    height: Math.abs(before.height - after.height),
  };

  if (Object.values(differences).some((difference) => difference > 0.5)) {
    throw new Error(
      `${label} moved or resized on hover. Before: ${JSON.stringify(before)}; after: ${JSON.stringify(after)}`,
    );
  }
}

function assertShrinksInPlace(before, after, label) {
  const beforeCenter = {
    x: before.x + before.width / 2,
    y: before.y + before.height / 2,
  };
  const afterCenter = {
    x: after.x + after.width / 2,
    y: after.y + after.height / 2,
  };
  const scale = after.width / before.width;

  if (
    scale < 0.975 ||
    scale > 0.985 ||
    after.height >= before.height ||
    Math.abs(beforeCenter.x - afterCenter.x) > 0.5 ||
    Math.abs(beforeCenter.y - afterCenter.y) > 0.5
  ) {
    throw new Error(
      `${label} did not shrink in place on hover. Before: ${JSON.stringify(before)}; after: ${JSON.stringify(after)}`,
    );
  }
}

async function assertEditableTextStaysPut(
  page,
  { wrapperSelector, inputSelector, label },
) {
  await page.mouse.move(1, 1);
  await page.waitForTimeout(220);

  const wrapper = page.locator(wrapperSelector);
  const readGeometry = (element) => {
    const rect = element.getBoundingClientRect();

    return {
      offsetX: element.offsetLeft,
      offsetY: element.offsetTop,
      offsetWidth: element.offsetWidth,
      offsetHeight: element.offsetHeight,
      renderedWidth: Number(rect.width.toFixed(3)),
      renderedHeight: Number(rect.height.toFixed(3)),
      transform: getComputedStyle(element).transform,
    };
  };
  const before = await wrapper.evaluate(readGeometry);

  await wrapper.click();
  await page.waitForTimeout(220);

  const input = page.locator(inputSelector);
  const after = await wrapper.evaluate(readGeometry);
  const shift = {
    x: Math.abs(before.offsetX - after.offsetX),
    y: Math.abs(before.offsetY - after.offsetY),
    width: Math.max(
      Math.abs(before.offsetWidth - after.offsetWidth),
      Math.abs(before.renderedWidth - after.renderedWidth),
    ),
    height: Math.max(
      Math.abs(before.offsetHeight - after.offsetHeight),
      Math.abs(before.renderedHeight - after.renderedHeight),
    ),
  };

  if (
    before.transform !== after.transform ||
    Object.values(shift).some((difference) => difference > 0.5)
  ) {
    throw new Error(
      `${label} moved when editing started. Before: ${JSON.stringify(before)}; while editing: ${JSON.stringify(after)}`,
    );
  }

  await input.press("Escape");
  await page.waitForTimeout(220);
}

async function assertTopRightIconsAreWhite(page, label) {
  const editIconColor = await page
    .getByRole("button", { name: /Turn edit mode/ })
    .evaluate((element) => getComputedStyle(element).color);
  const layoutIconFilter = await page
    .locator(".layout-toggle__icon")
    .evaluate((element) => getComputedStyle(element).filter);

  if (
    editIconColor !== "rgb(255, 255, 255)" ||
    !layoutIconFilter.includes("invert(1)")
  ) {
    throw new Error(
      `${label} top-right icons are not white. Edit color: ${editIconColor}; layout filter: ${layoutIconFilter}`,
    );
  }
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

try {
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(message.text());
    }
  });

  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(900);
  await assertTopRightIconsAreWhite(page, "Regular mode");

  const regularListButton = page.locator(".link-card").first();
  const regularListButtonBefore = roundRect(
    await regularListButton.boundingBox(),
  );
  await regularListButton.hover();
  await page.waitForTimeout(240);
  const regularListButtonAfter = roundRect(
    await regularListButton.boundingBox(),
  );
  assertShrinksInPlace(
    regularListButtonBefore,
    regularListButtonAfter,
    "Regular-mode list button",
  );
  const regularListHoverOverlay = await regularListButton.evaluate(
    (element) => getComputedStyle(element, "::before").opacity,
  );

  if (Number.parseFloat(regularListHoverOverlay) < 0.15) {
    throw new Error(
      `Regular-mode list button did not receive the lighter hover tint. Overlay opacity: ${regularListHoverOverlay}`,
    );
  }

  await page.getByRole("button", { name: "Turn edit mode on" }).click();
  await page.waitForTimeout(900);
  await assertTopRightIconsAreWhite(page, "Edit mode");

  const listEditableTextTargets = [
    {
      wrapperSelector: ".profile-name",
      inputSelector: ".profile-inline-input--name",
      label: "List profile name",
    },
    {
      wrapperSelector: ".bio",
      inputSelector: ".profile-inline-input--bio",
      label: "List profile description",
    },
    {
      wrapperSelector: ".location",
      inputSelector: ".profile-inline-input--location",
      label: "List profile location",
    },
    {
      wrapperSelector: ".role-line",
      inputSelector: ".profile-inline-input--role",
      label: "List profile role",
    },
    {
      wrapperSelector: ".page-footer",
      inputSelector: ".profile-inline-input--footer",
      label: "List profile footer",
    },
  ];

  for (const target of listEditableTextTargets) {
    await assertEditableTextStaysPut(page, target);
  }

  const profileCard = page.locator(".profile-card");
  const before = roundRect(await profileCard.boundingBox());
  await profileCard.hover();
  await page.waitForTimeout(240);
  const after = roundRect(await profileCard.boundingBox());

  if (before.x !== after.x || before.y !== after.y) {
    throw new Error(
      `Profile picture moved on hover. Before: ${JSON.stringify(
        before,
      )}; after: ${JSON.stringify(after)}`,
    );
  }

  const profileChecker = await getCheckerState(profileCard);
  assertMovingChecker(profileChecker, "Profile picture");

  if (
    profileChecker.checkerBox.x >= profileChecker.targetBox.x ||
    profileChecker.checkerBox.y >= profileChecker.targetBox.y ||
    profileChecker.checkerBox.width <= profileChecker.targetBox.width ||
    profileChecker.checkerBox.height <= profileChecker.targetBox.height
  ) {
    throw new Error(
      `Profile checkered line is not outside the picture. State: ${JSON.stringify(profileChecker)}`,
    );
  }

  const profileClipState = await profileCard
    .locator(".profile-card__clip")
    .evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        overflow: style.overflow,
        borderRadius: style.borderRadius,
      };
    });

  if (
    profileClipState.overflow !== "hidden" ||
    profileClipState.borderRadius === "0px"
  ) {
    throw new Error(
      `Profile artwork is not clipped inside its circular container. State: ${JSON.stringify(profileClipState)}`,
    );
  }

  const listStateOnPhotoHover = await page
    .locator(".link-card-shell")
    .evaluateAll((elements) =>
      elements.map((element) => {
        const style = getComputedStyle(element);
        return { filter: style.filter, opacity: style.opacity };
      }),
    );

  if (
    listStateOnPhotoHover.some(
      ({ filter, opacity }) => filter !== "none" || opacity !== "1",
    )
  ) {
    throw new Error(
      `List buttons changed while hovering the profile picture: ${JSON.stringify(listStateOnPhotoHover)}`,
    );
  }

  const firstLinkCard = page.locator(".link-card").first();
  const listButtonBeforeHover = roundRect(await firstLinkCard.boundingBox());
  await firstLinkCard.hover();
  await page.waitForTimeout(240);
  const listButtonAfterHover = roundRect(await firstLinkCard.boundingBox());

  assertStationary(
    listButtonBeforeHover,
    listButtonAfterHover,
    "Edit-mode list button",
  );

  const linkChecker = await getCheckerState(firstLinkCard);
  const listStateOnLinkHover = await page
    .locator(".link-card-shell")
    .evaluateAll((elements) =>
      elements.map((element) => {
        const style = getComputedStyle(element);
        return { filter: style.filter, opacity: style.opacity };
      }),
    );

  assertMovingChecker(linkChecker, "Link button");

  if (
    listStateOnLinkHover.some(
      ({ filter, opacity }) => filter.includes("blur") || opacity !== "1",
    )
  ) {
    throw new Error(
      `List buttons changed while hovering a link button: ${JSON.stringify(listStateOnLinkHover)}`,
    );
  }

  await firstLinkCard.click({ force: true });
  await page.waitForTimeout(240);
  const inactiveFiltersAfterSelection = await page
    .locator(".link-list .link-card-shell:not(.is-editing)")
    .evaluateAll((elements) =>
      elements.map((element) => getComputedStyle(element).filter),
    );

  if (
    inactiveFiltersAfterSelection.length === 0 ||
    inactiveFiltersAfterSelection.some((filter) => !filter.includes("blur"))
  ) {
    throw new Error(
      `Selecting a link did not preserve the editing blur. Filters: ${JSON.stringify(inactiveFiltersAfterSelection)}`,
    );
  }

  await page.keyboard.press("Escape");
  await page.waitForTimeout(240);
  await page
    .getByRole("button", { name: "Switch to grid view" })
    .evaluate((button) => button.click());

  const readGridNameAlignment = (element) => {
    const nameBox = element.getBoundingClientRect();
    const roleBox = element
      .closest(".profile-header")
      .querySelector(".role-line")
      .getBoundingClientRect();

    return {
      ready: element.dataset.gridNameReady,
      opacity: getComputedStyle(element).opacity,
      nameBottom: nameBox.bottom,
      roleBottom: roleBox.bottom,
    };
  };
  const gridNameAtSwitch = await page
    .locator(".profile-name")
    .evaluate(readGridNameAlignment);

  if (
    gridNameAtSwitch.ready !== "true" ||
    gridNameAtSwitch.opacity !== "1"
  ) {
    throw new Error(
      `Grid name was not aligned when the layout switched. State: ${JSON.stringify(gridNameAtSwitch)}`,
    );
  }

  await page.waitForTimeout(900);

  const gridNameAfterIntro = await page
    .locator(".profile-name")
    .evaluate(readGridNameAlignment);

  if (
    Math.abs(gridNameAfterIntro.nameBottom - gridNameAtSwitch.nameBottom) > 0.5
  ) {
    throw new Error(
      `Grid name shifted during its layout intro. At switch: ${JSON.stringify(gridNameAtSwitch)}; after intro: ${JSON.stringify(gridNameAfterIntro)}`,
    );
  }

  const gridEditableTextTargets = [
    {
      wrapperSelector: ".profile-name",
      inputSelector: ".profile-inline-input--name",
      label: "Grid profile name",
    },
    {
      wrapperSelector: ".bio",
      inputSelector: ".profile-inline-input--bio",
      label: "Grid profile description",
    },
    {
      wrapperSelector: ".location",
      inputSelector: ".profile-inline-input--location",
      label: "Grid profile location",
    },
    {
      wrapperSelector: ".role-line",
      inputSelector: ".profile-inline-input--role",
      label: "Grid profile role",
    },
  ];

  for (const target of gridEditableTextTargets) {
    await assertEditableTextStaysPut(page, target);
  }

  const gridName = page.locator(".profile-name");
  await gridName.click();
  const gridNameInput = page.locator(".profile-inline-input--name");
  await gridNameInput.fill("Alexandria Montgomery-Williams");
  await page.waitForTimeout(120);

  const editingGridNameState = await gridName.evaluate((element) => {
    const input = element.querySelector("input");
    const elementBox = element.getBoundingClientRect();
    const inputBox = input.getBoundingClientRect();

    return {
      elementRight: elementBox.right,
      inputRight: inputBox.right,
      inputClientWidth: input.clientWidth,
      inputScrollWidth: input.scrollWidth,
    };
  });

  if (
    editingGridNameState.inputRight > editingGridNameState.elementRight + 0.5 ||
    editingGridNameState.inputScrollWidth >
      editingGridNameState.inputClientWidth + 1
  ) {
    throw new Error(
      `Long grid name was clipped while editing. State: ${JSON.stringify(editingGridNameState)}`,
    );
  }

  await page.keyboard.press("Escape");
  await page.waitForTimeout(900);

  const displayedGridNameState = await gridName.evaluate((element) => {
    const elementBox = element.getBoundingClientRect();
    const contentRight = Array.from(element.children).reduce(
      (right, child) => Math.max(right, child.getBoundingClientRect().right),
      elementBox.left,
    );

    return {
      elementRight: elementBox.right,
      elementBottom: elementBox.bottom,
      contentRight,
    };
  });
  const firstGridCardTop = (await page.locator(".grid-card").first().boundingBox())
    .y;
  const secondGridCardTop = (
    await page.locator(".grid-card").nth(1).boundingBox()
  ).y;
  const gridRoleBox = await page.locator(".role-line").boundingBox();
  const nameToCardGap =
    firstGridCardTop - displayedGridNameState.elementBottom;
  const roleToCardGap =
    secondGridCardTop - (gridRoleBox.y + gridRoleBox.height);

  if (
    displayedGridNameState.contentRight >
      displayedGridNameState.elementRight + 0.5 ||
    displayedGridNameState.elementBottom >= firstGridCardTop ||
    Math.abs(nameToCardGap - roleToCardGap) > 1
  ) {
    throw new Error(
      `Long grid name did not fit above the Portfolio card with the role-line gap. Name: ${JSON.stringify(displayedGridNameState)}; name gap: ${nameToCardGap}; role gap: ${roleToCardGap}`,
    );
  }

  const firstGridCard = page.locator(".grid-card").first();
  await firstGridCard.hover();
  await page.waitForTimeout(240);

  assertMovingChecker(await getCheckerState(firstGridCard), "Grid button");

  if (errors.length > 0) {
    throw new Error(`Console errors found: ${errors.join(" | ")}`);
  }

  console.log(
    "Smoke check passed: regular list buttons shrink in place with a lighter tint; edit-mode list buttons and editable profile text stay fixed; profile, list, and grid edit hover use moving checkered lines without blur; selected-link editing keeps its blur treatment.",
  );
} finally {
  await browser.close();
}
