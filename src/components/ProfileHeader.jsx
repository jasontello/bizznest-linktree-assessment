import { useEffect, useLayoutEffect, useRef } from "react";
import HoverCheckerOutline from "./HoverCheckerOutline.jsx";

function splitDisplayName(displayName) {
  const [firstName, ...rest] = displayName.trim().split(/\s+/);

  return {
    firstName: firstName || "Jason",
    lastName: rest.join(" ") || "Tello",
  };
}

export function renderMaskedWords(text, startIndex = 0) {
  let wordIndex = 0;

  return text.split(/(\s+)/).map((token, tokenIndex) => {
    if (!token.trim()) {
      return token;
    }

    const revealIndex = startIndex + wordIndex;
    wordIndex += 1;

    return (
      <span className="grid-intro-word-mask" key={`${token}-${tokenIndex}`}>
        <span
          className="grid-intro-word"
          style={{ "--grid-intro-index": revealIndex }}
        >
          {token}
        </span>
      </span>
    );
  });
}

function ProfileHeader({
  profile,
  layoutMode = "list",
  animateLayoutIntro = false,
  editMode = false,
  activeTargetId = null,
  hoverTargetId = null,
  onEdit,
  onHoverTarget,
  onProfileChange,
  onFinishInlineEdit,
}) {
  const { firstName, lastName } = splitDisplayName(profile.name);
  const profileLocation = profile.location || "Rio Vista / Bay Area, CA";
  const profileRole =
    profile.role || "Frontend • UI/UX • Creative Technology";
  const profileHeaderRef = useRef(null);
  const nameInputRef = useRef(null);
  const nameElementRef = useRef(null);
  const previousLayoutModeRef = useRef(null);
  const bioInputRef = useRef(null);
  const bioElementRef = useRef(null);
  const locationInputRef = useRef(null);
  const locationElementRef = useRef(null);
  const roleInputRef = useRef(null);
  const roleElementRef = useRef(null);
  const isEditingName = activeTargetId === "profile-name";
  const isEditingBio = activeTargetId === "profile-bio";
  const isEditingLocation = activeTargetId === "profile-location";
  const isEditingRole = activeTargetId === "profile-role";

  function getTextScaleStyle(field) {
    return {
      "--profile-text-size": `${(profile.fontScales?.[field] ?? 1) * 100}%`,
    };
  }

  function isTextVisible(field) {
    return profile.visibility?.[field] !== false;
  }

  function renderHiddenLabel(field) {
    if (!editMode || isTextVisible(field)) {
      return null;
    }

    return (
      <span className="profile-hidden-label" aria-hidden="true">
        Hidden
      </span>
    );
  }

  useLayoutEffect(() => {
    const header = profileHeaderRef.current;
    const bioElement = bioElementRef.current;
    const locationElement = locationElementRef.current;
    const roleElement = roleElementRef.current;
    let layoutFrame;
    let effectActive = true;

    if (!header || !bioElement || !locationElement || !roleElement) {
      return undefined;
    }

    function clearDynamicGridLayout() {
      header.style.removeProperty("--grid-header-extra-height");
      header.style.removeProperty("--grid-bio-dynamic-top");
      header.style.removeProperty("--grid-bio-dynamic-offset");
      header.style.removeProperty("--grid-location-dynamic-top");
      header.style.removeProperty("--grid-location-dynamic-bottom");
      header.style.removeProperty("--grid-role-dynamic-top");
      header.style.removeProperty("--grid-role-dynamic-bottom");
    }

    function layoutGridDetails() {
      if (!effectActive) {
        return;
      }

      clearDynamicGridLayout();

      if (layoutMode !== "grid") {
        return;
      }

      const isCompactGrid = window.matchMedia("(max-width: 640px)").matches;
      const usesNaturalFlow = window.matchMedia(
        "(min-width: 641px) and (max-width: 760px)",
      ).matches;

      if (usesNaturalFlow) {
        return;
      }

      const baseHeaderHeight = header.offsetHeight;
      const baseBioTop = bioElement.offsetTop;
      const baseLocationTop = locationElement.offsetTop;
      const baseRoleTop = roleElement.offsetTop;
      const bioParticipates = editMode || isTextVisible("bio");
      const locationParticipates = editMode || isTextVisible("location");
      const roleParticipates = editMode || isTextVisible("role");
      const detailGap = isCompactGrid ? 8 : 10;
      const visibleFields = [
        {
          field: "bio",
          element: bioElement,
          baseTop: baseBioTop,
        },
        {
          field: "location",
          element: locationElement,
          baseTop: baseLocationTop,
        },
        {
          field: "role",
          element: roleElement,
          baseTop: baseRoleTop,
        },
      ].filter(({ field }) => isTextVisible(field));
      const shouldBottomAnchor = !editMode && visibleFields.length < 3;
      let bioTop = baseBioTop;
      let previousBottom = bioParticipates
        ? bioTop + bioElement.offsetHeight
        : null;
      let locationTop = baseLocationTop;
      let roleTop = baseRoleTop;

      if (shouldBottomAnchor && visibleFields.length > 0) {
        const anchorBottom = baseRoleTop + roleElement.offsetHeight;
        const visibleStackHeight =
          visibleFields.reduce(
            (total, { element }) => total + element.offsetHeight,
            0,
          ) +
          detailGap * (visibleFields.length - 1);
        let nextTop = anchorBottom - visibleStackHeight;

        visibleFields.forEach(({ field, element }) => {
          if (field === "bio") {
            bioTop = nextTop;
          } else if (field === "location") {
            locationTop = nextTop;
          } else {
            roleTop = nextTop;
          }

          nextTop += element.offsetHeight + detailGap;
        });
      } else {
        if (locationParticipates && previousBottom !== null) {
          locationTop = Math.max(baseLocationTop, previousBottom + detailGap);
        }

        if (locationParticipates) {
          previousBottom = locationTop + locationElement.offsetHeight;
        }

        if (roleParticipates && previousBottom !== null) {
          roleTop = Math.max(baseRoleTop, previousBottom + detailGap);
        }
      }

      if (bioParticipates) {
        if (isCompactGrid) {
          header.style.setProperty(
            "--grid-bio-dynamic-offset",
            `${bioTop - baseBioTop}px`,
          );
        } else {
          header.style.setProperty("--grid-bio-dynamic-top", `${bioTop}px`);
        }
      }

      if (locationParticipates) {
        header.style.setProperty(
          "--grid-location-dynamic-top",
          `${locationTop}px`,
        );
        header.style.setProperty("--grid-location-dynamic-bottom", "auto");
      }

      if (roleParticipates) {
        header.style.setProperty("--grid-role-dynamic-top", `${roleTop}px`);
        header.style.setProperty("--grid-role-dynamic-bottom", "auto");
      }

      const detailBottoms = [];

      if (bioParticipates) {
        detailBottoms.push(bioTop + bioElement.offsetHeight);
      }

      if (locationParticipates) {
        detailBottoms.push(locationTop + locationElement.offsetHeight);
      }

      if (roleParticipates) {
        detailBottoms.push(roleTop + roleElement.offsetHeight);
      }

      const reservedOverflow = isCompactGrid ? 96 : 0;
      const requiredBottom = Math.max(0, ...detailBottoms) + detailGap;
      const extraHeight = Math.max(
        0,
        requiredBottom - baseHeaderHeight - reservedOverflow,
      );

      if (extraHeight > 0.5) {
        header.style.setProperty(
          "--grid-header-extra-height",
          `${extraHeight}px`,
        );
      }
    }

    function scheduleGridDetailsLayout() {
      if (!effectActive) {
        return;
      }

      window.cancelAnimationFrame(layoutFrame);
      layoutFrame = window.requestAnimationFrame(layoutGridDetails);
    }

    layoutGridDetails();

    const resizeObserver = new ResizeObserver(scheduleGridDetailsLayout);
    resizeObserver.observe(bioElement);
    resizeObserver.observe(locationElement);
    resizeObserver.observe(roleElement);
    window.addEventListener("resize", scheduleGridDetailsLayout);

    document.fonts?.ready.then(() => {
      if (effectActive) {
        scheduleGridDetailsLayout();
      }
    });

    return () => {
      effectActive = false;
      window.cancelAnimationFrame(layoutFrame);
      resizeObserver.disconnect();
      window.removeEventListener("resize", scheduleGridDetailsLayout);
      clearDynamicGridLayout();
    };
  }, [
    editMode,
    isEditingBio,
    isEditingLocation,
    isEditingRole,
    layoutMode,
    profile.fontScales?.name,
    profile.bio,
    profile.fontScales?.bio,
    profile.fontScales?.location,
    profile.fontScales?.role,
    profile.location,
    profile.name,
    profile.role,
    profile.visibility?.bio,
    profile.visibility?.location,
    profile.visibility?.role,
  ]);

  useLayoutEffect(() => {
    const nameElement = nameElementRef.current;
    let alignmentFrame;
    let effectActive = true;

    if (!nameElement) {
      return undefined;
    }

    let shouldRevealAfterAlignment =
      layoutMode === "grid" &&
      (previousLayoutModeRef.current !== "grid" ||
        nameElement.dataset.gridNameReady === "false");
    previousLayoutModeRef.current = layoutMode;

    if (shouldRevealAfterAlignment) {
      nameElement.dataset.gridNameReady = "false";
    } else if (layoutMode !== "grid") {
      delete nameElement.dataset.gridNameReady;
    }

    function alignGridNameBottom() {
      if (
        !effectActive ||
        layoutMode !== "grid" ||
        window.matchMedia("(max-width: 760px)").matches
      ) {
        return;
      }

      const profileHeader = nameElement.closest(".profile-header");
      const alignmentField = editMode
        ? "role"
        : ["role", "location", "bio"].find((field) => isTextVisible(field)) ??
          "role";
      const alignmentElement = alignmentField
        ? profileHeader?.querySelector(
            `[data-profile-field="${alignmentField}"]`,
          )
        : null;

      if (!alignmentElement) {
        nameElement.style.removeProperty("--grid-name-y-offset");
        return;
      }

      const currentOffset =
        Number.parseFloat(
          nameElement.style.getPropertyValue("--grid-name-y-offset"),
        ) || 0;
      const nameBottomWithoutOffset =
        nameElement.offsetTop - currentOffset + nameElement.offsetHeight;
      const targetOffset =
        alignmentElement.offsetTop +
        alignmentElement.offsetHeight -
        nameBottomWithoutOffset;

      if (Math.abs(targetOffset - currentOffset) > 0.1) {
        nameElement.style.setProperty(
          "--grid-name-y-offset",
          `${targetOffset}px`,
        );
      }
    }

    function scheduleGridNameAlignment() {
      if (!effectActive) {
        return;
      }

      window.cancelAnimationFrame(alignmentFrame);
      alignmentFrame = window.requestAnimationFrame(() => {
        if (!effectActive) {
          return;
        }

        alignGridNameBottom();
        alignmentFrame = window.requestAnimationFrame(() => {
          if (!effectActive) {
            return;
          }

          alignGridNameBottom();
        });
      });
    }

    function handleNameAnimationEnd(event) {
      if (event.animationName === "grid-intro-word-reveal") {
        scheduleGridNameAlignment();
      }
    }

    function fitGridName() {
      if (!effectActive) {
        return;
      }

      nameElement.style.removeProperty("--grid-name-fit-size");

      if (layoutMode !== "grid") {
        nameElement.style.removeProperty("--grid-name-y-offset");
        return;
      }

      const availableWidth = nameElement.clientWidth;
      const computedStyle = window.getComputedStyle(nameElement);
      const maximumFontSize = Number.parseFloat(computedStyle.fontSize);
      const nameScale = profile.fontScales?.name ?? 1;

      if (!availableWidth || !Number.isFinite(maximumFontSize)) {
        return;
      }

      const measurement = document.createElement("span");
      const measurementText = window.matchMedia("(max-width: 640px)").matches
        ? [firstName, lastName].reduce(
            (longest, part) =>
              part.length > longest.length ? part : longest,
            " ",
          )
        : profile.name.trim() || " ";
      measurement.textContent = measurementText;
      Object.assign(measurement.style, {
        position: "fixed",
        top: "-10000px",
        left: "-10000px",
        visibility: "hidden",
        pointerEvents: "none",
        whiteSpace: "nowrap",
        fontFamily: computedStyle.fontFamily,
        fontSize: `${maximumFontSize * nameScale}px`,
        fontStyle: computedStyle.fontStyle,
        fontWeight: computedStyle.fontWeight,
        letterSpacing: computedStyle.letterSpacing,
        lineHeight: "1",
      });
      document.body.append(measurement);

      const naturalWidth = measurement.getBoundingClientRect().width;
      measurement.remove();

      if (!naturalWidth) {
        return;
      }

      const caretAllowance = Math.max(8, maximumFontSize * nameScale * 0.04);
      const fittedFontSize = Math.max(
        16,
        maximumFontSize *
          Math.min(1, (availableWidth - caretAllowance) / naturalWidth),
      );

      nameElement.style.setProperty(
        "--grid-name-fit-size",
        `${fittedFontSize}px`,
      );

      alignGridNameBottom();
      scheduleGridNameAlignment();
    }

    fitGridName();

    if (shouldRevealAfterAlignment) {
      nameElement.dataset.gridNameReady = "true";
      shouldRevealAfterAlignment = false;
    }

    const shell = nameElement.closest(".app-shell");
    const resizeObserver = new ResizeObserver(fitGridName);
    const nameResizeObserver = new ResizeObserver(scheduleGridNameAlignment);

    if (shell) {
      resizeObserver.observe(shell);
    }

    nameResizeObserver.observe(nameElement);
    nameElement.addEventListener("animationend", handleNameAnimationEnd);

    document.fonts?.ready.then(() => {
      if (effectActive) {
        fitGridName();
      }
    });

    return () => {
      effectActive = false;
      window.cancelAnimationFrame(alignmentFrame);
      resizeObserver.disconnect();
      nameResizeObserver.disconnect();
      nameElement.removeEventListener("animationend", handleNameAnimationEnd);
      nameElement.style.removeProperty("--grid-name-fit-size");
      nameElement.style.removeProperty("--grid-name-y-offset");
    };
  }, [
    animateLayoutIntro,
    isEditingName,
    editMode,
    layoutMode,
    profile.fontScales?.name,
    profile.fontScales?.bio,
    profile.fontScales?.location,
    profile.fontScales?.role,
    profile.name,
    profile.visibility?.bio,
    profile.visibility?.location,
    profile.visibility?.role,
  ]);

  useEffect(() => {
    if (isEditingName) {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }
  }, [isEditingName]);

  useEffect(() => {
    if (isEditingBio) {
      bioInputRef.current?.focus();
      bioInputRef.current?.select();
    }
  }, [isEditingBio]);

  useEffect(() => {
    if (isEditingLocation) {
      locationInputRef.current?.focus();
      locationInputRef.current?.select();
    }
  }, [isEditingLocation]);

  useEffect(() => {
    if (isEditingRole) {
      roleInputRef.current?.focus();
      roleInputRef.current?.select();
    }
  }, [isEditingRole]);

  function getTargetClass(baseClass, targetId) {
    return `${baseClass} editable-target${activeTargetId === targetId ? " is-editing" : ""}${hoverTargetId === targetId ? " is-hovering" : ""}`;
  }

  function setHoverTarget(targetId) {
    if (editMode && onHoverTarget) {
      onHoverTarget(targetId);
    }
  }

  function clearHoverTarget() {
    if (editMode && onHoverTarget) {
      onHoverTarget(null);
    }
  }

  function getEditorTargetAccessibility(field, label, isEditing) {
    if (!editMode || isEditing) {
      return {};
    }

    const hiddenPrefix = field && !isTextVisible(field) ? "hidden " : "";

    return {
      role: "button",
      tabIndex: 0,
      "aria-label": `Edit ${hiddenPrefix}${label}`,
    };
  }

  function openProfileEditor(event, type) {
    if (!editMode || !onEdit) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const element = event.currentTarget;

    onEdit(type, {
      cardElement: element,
      triggerElement: element,
      rect: element.getBoundingClientRect(),
      borderRadius: window.getComputedStyle(element).borderRadius,
      cardKind: type,
    });
  }

  function handleInlineKeyDown(event, label) {
    if (event.key === "Escape") {
      event.preventDefault();
      onFinishInlineEdit?.();
    }

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onFinishInlineEdit?.();
    }

    if (event.key === "Tab" && !event.shiftKey) {
      const activePopover = Array.from(
        document.querySelectorAll(".text-size-popover"),
      ).find(
        (popover) =>
          popover.getAttribute("aria-label") === `${label} text controls`,
      );
      const firstPopoverControl = activePopover?.querySelector("button");

      if (firstPopoverControl instanceof HTMLElement) {
        event.preventDefault();
        firstPopoverControl.focus();
      }
    }
  }

  function handleEditorTargetKeyDown(event, type) {
    if (
      event.target !== event.currentTarget ||
      (event.key !== "Enter" && event.key !== " ")
    ) {
      return;
    }

    openProfileEditor(event, type);
  }

  return (
    <header
      ref={profileHeaderRef}
      className="profile-header"
      data-layout-intro={animateLayoutIntro || undefined}
    >
      <div className="profile-mark" role="img" aria-label="Three overlapping color circles">
        <span className="profile-mark__circle profile-mark__circle--blue" />
        <span className="profile-mark__circle profile-mark__circle--pink" />
        <span className="profile-mark__circle profile-mark__circle--yellow" />
      </div>

      <button
        className={getTargetClass("profile-card", "profile-photo")}
        aria-label="Change profile picture"
        type="button"
        disabled={!editMode}
        onClick={(event) => openProfileEditor(event, "profile-photo")}
        onMouseEnter={() => setHoverTarget("profile-photo")}
        onMouseLeave={clearHoverTarget}
      >
        <span className="profile-card__clip">
          <img
            src={profile.imageSrc || `${import.meta.env.BASE_URL}face.png`}
            alt="Jason Tello profile illustration"
            className="profile-card__image grid-intro-profile"
          />
        </span>
        {editMode ? <HoverCheckerOutline /> : null}
      </button>

      <p
        ref={roleElementRef}
        className={getTargetClass("role-line", "profile-role")}
        {...getEditorTargetAccessibility("role", "role", isEditingRole)}
        data-profile-field="role"
        data-profile-visible={isTextVisible("role")}
        onClick={(event) => openProfileEditor(event, "profile-role")}
        onKeyDown={(event) =>
          handleEditorTargetKeyDown(event, "profile-role")
        }
        onMouseEnter={() => setHoverTarget("profile-role")}
        onMouseLeave={clearHoverTarget}
      >
        <span
          className="profile-text-scale"
          aria-hidden={
            editMode && !isTextVisible("role") && !isEditingRole
              ? true
              : undefined
          }
          style={getTextScaleStyle("role")}
        >
          {isEditingRole ? (
            <input
              className="profile-inline-input profile-inline-input--role"
              ref={roleInputRef}
              value={profileRole}
              maxLength="80"
              aria-label="Profile role"
              onChange={(event) =>
                onProfileChange?.({ role: event.target.value })
              }
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => handleInlineKeyDown(event, "Role")}
            />
          ) : (
            renderMaskedWords(profileRole, 2)
          )}
        </span>
        {renderHiddenLabel("role")}
      </p>

      <div className="profile-copy">
        <h1
          ref={nameElementRef}
          className={getTargetClass("profile-name", "profile-name")}
          {...getEditorTargetAccessibility(null, "name", isEditingName)}
          onClick={(event) => openProfileEditor(event, "profile-name")}
          onKeyDown={(event) =>
            handleEditorTargetKeyDown(event, "profile-name")
          }
          onMouseEnter={() => setHoverTarget("profile-name")}
          onMouseLeave={clearHoverTarget}
        >
          <span className="profile-text-scale" style={getTextScaleStyle("name")}>
            {isEditingName ? (
              <input
                className="profile-inline-input profile-inline-input--name"
                ref={nameInputRef}
                value={profile.name}
                maxLength="32"
                aria-label="Profile name"
                onChange={(event) => onProfileChange?.({ name: event.target.value })}
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => handleInlineKeyDown(event, "Name")}
              />
            ) : (
              <>
                <span className="profile-name__first grid-intro-word-mask">
                  <span
                    className="grid-intro-word"
                    style={{ "--grid-intro-index": 0 }}
                  >
                    {firstName}
                  </span>
                </span>
                <span className="profile-name__last grid-intro-word-mask">
                  <span
                    className="grid-intro-word"
                    style={{ "--grid-intro-index": 1 }}
                  >
                    {lastName}
                  </span>
                </span>
              </>
            )}
          </span>
        </h1>
        <div
          ref={bioElementRef}
          className={getTargetClass("bio", "profile-bio")}
          {...getEditorTargetAccessibility(
            "bio",
            "description",
            isEditingBio,
          )}
          data-profile-field="bio"
          data-profile-visible={isTextVisible("bio")}
          onClick={(event) => openProfileEditor(event, "profile-bio")}
          onKeyDown={(event) =>
            handleEditorTargetKeyDown(event, "profile-bio")
          }
          onMouseEnter={() => setHoverTarget("profile-bio")}
          onMouseLeave={clearHoverTarget}
        >
          <span
            className="profile-text-scale"
            aria-hidden={
              editMode && !isTextVisible("bio") && !isEditingBio
                ? true
                : undefined
            }
            style={getTextScaleStyle("bio")}
          >
            {isEditingBio ? (
              <textarea
                className="profile-inline-input profile-inline-input--bio"
                ref={bioInputRef}
                value={profile.bio}
                maxLength="150"
                aria-label="Profile description"
                onChange={(event) => onProfileChange?.({ bio: event.target.value })}
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) =>
                  handleInlineKeyDown(event, "Description")
                }
              />
            ) : (
              renderMaskedWords(profile.bio, 2)
            )}
          </span>
          {renderHiddenLabel("bio")}
        </div>
        <p
          ref={locationElementRef}
          className={getTargetClass("location", "profile-location")}
          {...getEditorTargetAccessibility(
            "location",
            "location",
            isEditingLocation,
          )}
          data-profile-field="location"
          data-profile-visible={isTextVisible("location")}
          onClick={(event) => openProfileEditor(event, "profile-location")}
          onKeyDown={(event) =>
            handleEditorTargetKeyDown(event, "profile-location")
          }
          onMouseEnter={() => setHoverTarget("profile-location")}
          onMouseLeave={clearHoverTarget}
        >
          <span
            className="profile-text-scale"
            aria-hidden={
              editMode && !isTextVisible("location") && !isEditingLocation
                ? true
                : undefined
            }
            style={getTextScaleStyle("location")}
          >
            {isEditingLocation ? (
              <input
                className="profile-inline-input profile-inline-input--location"
                ref={locationInputRef}
                value={profileLocation}
                maxLength="60"
                aria-label="Profile location"
                onChange={(event) =>
                  onProfileChange?.({ location: event.target.value })
                }
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => handleInlineKeyDown(event, "Location")}
              />
            ) : (
              renderMaskedWords(profileLocation, 2)
            )}
          </span>
          {renderHiddenLabel("location")}
        </p>
      </div>
    </header>
  );
}

export default ProfileHeader;
