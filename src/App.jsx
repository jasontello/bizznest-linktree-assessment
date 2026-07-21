import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence } from "motion/react";
import ProfileHeader, {
  renderMaskedWords,
} from "./components/ProfileHeader.jsx";
import LayoutToggle from "./components/LayoutToggle.jsx";
import LinkEditor from "./components/LinkEditor.jsx";
import LinkGrid from "./components/LinkGrid.jsx";
import LinkList from "./components/LinkList.jsx";
import TextSizePopover from "./components/TextSizePopover.jsx";
import { links } from "./data/links.js";
import { linkThemes } from "./data/linkThemes.js";
import {
  createDefaultLinkCustomizations,
  createDefaultListOrder,
  createDefaultPageCustomization,
  createDefaultProfileCustomization,
  readSavedCustomizations,
  saveCustomizations,
} from "./lib/customizationStorage.js";
import { getRenderableLinks } from "./lib/linkViewModels.js";

const pageBackgroundThemes = linkThemes.filter((theme) => theme.id !== "white");
const LAYOUT_INTRO_DURATION = 1500;
const textTargetDetails = {
  "profile-name": { field: "name", label: "Name", canHide: false },
  "profile-bio": { field: "bio", label: "Description", canHide: true },
  "profile-location": { field: "location", label: "Location", canHide: true },
  "profile-role": { field: "role", label: "Role", canHide: true },
  "profile-footer": { field: "footer", label: "Footer", canHide: true },
};

function PaintbrushIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M14.5 4.5l5 5M13.1 5.9l5 5-8.9 8.9-5.7 1.2 1.2-5.7 8.4-9.4z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4.8 15.4l3.8 3.8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PageContent({
  layoutMode,
  animateLayoutIntro,
  renderableLinks,
  listRenderableLinks,
  profileCustomization,
  editMode = false,
  activeTargetId = null,
  hoverTargetId = null,
  onEdit,
  onEditBackground,
  onProfileChange,
  onFinishInlineEdit,
  onHoverTarget,
  onReorderLinks,
  preview = false,
}) {
  const canEditProfileAndLinks = editMode && !preview;
  const footerInputRef = useRef(null);
  const isEditingFooter = activeTargetId === "profile-footer";
  const profileFooter =
    profileCustomization.footer || "BizzNEST · Rio Vista, CA";
  const footerScale = profileCustomization.fontScales?.footer ?? 1;
  const footerVisible = profileCustomization.visibility?.footer !== false;
  const visibleProfileDetailCount = ["bio", "location", "role"].filter(
    (field) => profileCustomization.visibility?.[field] !== false,
  ).length;
  const sharedLinkProps = {
    links: renderableLinks,
    editMode: canEditProfileAndLinks,
    activeTargetId,
    hoverTargetId,
    onEdit,
    onHoverTarget,
  };

  useEffect(() => {
    if (isEditingFooter) {
      footerInputRef.current?.focus();
      footerInputRef.current?.select();
    }
  }, [isEditingFooter]);

  function openFooterEditor(event) {
    if (!canEditProfileAndLinks || !onEditBackground) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const element = event.currentTarget;

    onEditBackground("profile-footer", {
      cardElement: element,
      triggerElement: element,
      rect: element.getBoundingClientRect(),
      borderRadius: window.getComputedStyle(element).borderRadius,
      cardKind: "profile-footer",
    });
  }

  function handleFooterKeyDown(event) {
    if (event.key === "Escape" || event.key === "Enter") {
      event.preventDefault();
      onFinishInlineEdit?.();
    }

    if (event.key === "Tab" && !event.shiftKey) {
      const activePopover = Array.from(
        document.querySelectorAll(".text-size-popover"),
      ).find(
        (popover) =>
          popover.getAttribute("aria-label") === "Footer text controls",
      );
      const firstPopoverControl = activePopover?.querySelector("button");

      if (firstPopoverControl instanceof HTMLElement) {
        event.preventDefault();
        firstPopoverControl.focus();
      }
    }
  }

  function handleFooterTargetKeyDown(event) {
    if (
      event.target !== event.currentTarget ||
      (event.key !== "Enter" && event.key !== " ")
    ) {
      return;
    }

    openFooterEditor(event);
  }

  function renderFooter() {
    return (
      <p
        className={`page-footer editable-target${isEditingFooter ? " is-editing" : ""}${hoverTargetId === "profile-footer" ? " is-hovering" : ""}`}
        role={canEditProfileAndLinks && !isEditingFooter ? "button" : undefined}
        tabIndex={canEditProfileAndLinks && !isEditingFooter ? 0 : undefined}
        aria-label={
          canEditProfileAndLinks && !isEditingFooter
            ? `Edit ${footerVisible ? "" : "hidden "}footer`
            : undefined
        }
        data-layout-intro={animateLayoutIntro || undefined}
        data-profile-field="footer"
        data-profile-visible={footerVisible}
        onClick={openFooterEditor}
        onKeyDown={handleFooterTargetKeyDown}
        onMouseEnter={() =>
          canEditProfileAndLinks && onHoverTarget?.("profile-footer")
        }
        onMouseLeave={() =>
          canEditProfileAndLinks && onHoverTarget?.(null)
        }
      >
        <span
          className="profile-text-scale"
          aria-hidden={
            canEditProfileAndLinks && !footerVisible && !isEditingFooter
              ? true
              : undefined
          }
          style={{ "--profile-text-size": `${footerScale * 100}%` }}
        >
          {isEditingFooter ? (
            <input
              className="profile-inline-input profile-inline-input--footer"
              ref={footerInputRef}
              value={profileFooter}
              maxLength="80"
              aria-label="Profile footer"
              onChange={(event) =>
                onProfileChange?.({ footer: event.target.value })
              }
              onClick={(event) => event.stopPropagation()}
              onKeyDown={handleFooterKeyDown}
            />
          ) : (
            renderMaskedWords(profileFooter)
          )}
        </span>
        {!footerVisible && canEditProfileAndLinks ? (
          <span className="profile-hidden-label" aria-hidden="true">
            Hidden
          </span>
        ) : null}
      </p>
    );
  }

  return (
    <section
      className="profile-page"
      data-visible-profile-details={visibleProfileDetailCount}
      aria-label={preview ? undefined : "Jason Tello personal links"}
    >
      <ProfileHeader
        profile={profileCustomization}
        layoutMode={layoutMode}
        animateLayoutIntro={animateLayoutIntro}
        editMode={canEditProfileAndLinks}
        activeTargetId={activeTargetId}
        hoverTargetId={hoverTargetId}
        onEdit={onEditBackground}
        onProfileChange={onProfileChange}
        onFinishInlineEdit={onFinishInlineEdit}
        onHoverTarget={onHoverTarget}
      />
      {layoutMode === "grid" && (
        renderFooter()
      )}
      <div
        className="layout-stage"
        data-layout={layoutMode}
        key={layoutMode}
      >
        {layoutMode === "grid" ? (
          <LinkGrid {...sharedLinkProps} />
        ) : (
          <LinkList
            {...sharedLinkProps}
            links={listRenderableLinks}
            onReorder={onReorderLinks}
          />
        )}
      </div>
      {layoutMode === "list" && (
        renderFooter()
      )}
    </section>
  );
}

function App() {
  const [savedCustomizations] = useState(readSavedCustomizations);
  const [layoutMode, setLayoutMode] = useState(savedCustomizations.layoutMode);
  const [layoutIntroActive, setLayoutIntroActive] = useState(true);
  const [customizations, setCustomizations] = useState(
    savedCustomizations.links,
  );
  const [listOrder, setListOrder] = useState(savedCustomizations.listOrder);
  const [profileCustomization, setProfileCustomization] = useState(
    savedCustomizations.profile,
  );
  const [pageCustomization, setPageCustomization] = useState(
    savedCustomizations.page,
  );
  const [editMode, setEditMode] = useState(false);
  const [editorState, setEditorState] = useState(null);
  const [editorTargetReleased, setEditorTargetReleased] = useState(false);
  const [hoverTargetId, setHoverTargetId] = useState(null);
  const [colorAnimationState, setColorAnimationState] = useState(null);
  const colorAnimationTimeoutRef = useRef(null);
  const layoutIntroTimeoutRef = useRef(null);
  const colorAnimationId = useRef(0);
  const editorOpenRef = useRef(false);
  const returnFocusRef = useRef(null);
  const editingLinkId = editorState?.linkId ?? null;
  const editingLink = links.find((link) => link.id === editingLinkId);
  const textEditorDetails = textTargetDetails[editorState?.type] ?? null;
  const activeTargetId = editorTargetReleased
    ? null
    : editorState?.targetId ?? null;
  const customizationValues = Object.values(customizations);
  const sharedThemeId = customizationValues.every(
    (customization) =>
      customization.theme === customizationValues[0]?.theme,
  )
    ? customizationValues[0]?.theme
    : null;
  const selectedBackgroundThemeId =
    linkThemes.find(
      (linkTheme) =>
        linkTheme.background.toLowerCase() ===
        pageCustomization.background.toLowerCase(),
    )?.id ?? null;
  const renderableLinks = getRenderableLinks(
    links,
    customizations,
    linkThemes,
  );
  const listRenderableLinks = listOrder
    .map((linkId) =>
      renderableLinks.find(({ link }) => link.id === linkId),
    )
    .filter(Boolean);

  useEffect(() => {
    saveCustomizations({
      layoutMode,
      listOrder,
      links: customizations,
      profile: profileCustomization,
      page: pageCustomization,
    });
  }, [
    customizations,
    layoutMode,
    listOrder,
    pageCustomization,
    profileCustomization,
  ]);

  useEffect(() => {
    if (!editorState && returnFocusRef.current) {
      const focusTarget = returnFocusRef.current;
      const focusTimer = window.setTimeout(() => {
        if (focusTarget.isConnected) {
          focusTarget.focus();
        }

        if (returnFocusRef.current === focusTarget) {
          returnFocusRef.current = null;
        }
      }, 440);

      return () => window.clearTimeout(focusTimer);
    }

    return undefined;
  }, [editorState]);

  useEffect(() => {
    if (!editMode) {
      setHoverTargetId(null);
      setColorAnimationState(null);
      window.clearTimeout(colorAnimationTimeoutRef.current);
    }
  }, [editMode]);

  useEffect(() => {
    return () => {
      window.clearTimeout(colorAnimationTimeoutRef.current);
      window.clearTimeout(layoutIntroTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    window.clearTimeout(layoutIntroTimeoutRef.current);

    if (!layoutIntroActive) {
      return undefined;
    }

    layoutIntroTimeoutRef.current = window.setTimeout(() => {
      setLayoutIntroActive(false);
    }, LAYOUT_INTRO_DURATION);

    return () => window.clearTimeout(layoutIntroTimeoutRef.current);
  }, [layoutIntroActive]);

  function handleLayoutModeChange(nextMode) {
    setLayoutIntroActive(true);
    setLayoutMode(nextMode);
  }

  function triggerColorAnimation(target, previousColor) {
    if (!previousColor) {
      return;
    }

    const nextAnimationId = colorAnimationId.current + 1;
    colorAnimationId.current = nextAnimationId;

    window.clearTimeout(colorAnimationTimeoutRef.current);
    setColorAnimationState({
      target,
      id: nextAnimationId,
      previousColor,
    });

    colorAnimationTimeoutRef.current = window.setTimeout(() => {
      setColorAnimationState((current) =>
        current?.id === nextAnimationId ? null : current,
      );
    }, 1120);
  }

  const closeEditor = useCallback(() => {
    returnFocusRef.current = editorState?.triggerElement ?? null;

    setCustomizations((current) => {
      if (!editingLinkId || current[editingLinkId].title.trim()) {
        return current;
      }

      const fallbackTitle =
        links.find((link) => link.id === editingLinkId)?.title ?? "Link";

      return {
        ...current,
        [editingLinkId]: {
          ...current[editingLinkId],
          title: fallbackTitle,
        },
      };
    });
    setEditorState(null);
    setEditorTargetReleased(false);
    editorOpenRef.current = false;
    setHoverTargetId(null);
  }, [editingLinkId, editorState?.triggerElement]);

  function getTargetId(type, linkId) {
    if (type === "link-button" || type === "link-text") {
      return `${type}-${linkId}`;
    }

    return type;
  }

  function openEditor(type, linkId, origin) {
    if (editorOpenRef.current) {
      return;
    }

    editorOpenRef.current = true;
    setEditorTargetReleased(false);
    setEditorState({
      type,
      linkId,
      targetId: getTargetId(type, linkId),
      ...origin,
    });
  }

  function openPageEditor(type, origin) {
    if (editorOpenRef.current) {
      return;
    }

    editorOpenRef.current = true;
    setEditorTargetReleased(false);
    setEditorState({
      type,
      targetId: type,
      ...origin,
    });
  }

  function updateLink(linkId, changes) {
    if (Object.hasOwn(changes, "theme")) {
      const currentTheme = linkThemes.find(
        (linkTheme) => linkTheme.id === customizations[linkId]?.theme,
      );
      const nextTheme = linkThemes.find(
        (linkTheme) => linkTheme.id === changes.theme,
      );

      if (currentTheme?.id !== nextTheme?.id) {
        triggerColorAnimation("link", currentTheme?.background);
      }
    }

    setCustomizations((current) => ({
      ...current,
      [linkId]: {
        ...current[linkId],
        ...changes,
      },
    }));
  }

  function reorderListLinks(nextOrder) {
    setListOrder((currentOrder) => {
      if (!Array.isArray(nextOrder)) {
        return currentOrder;
      }

      const allowedLinkIds = new Set(currentOrder);
      const normalizedOrder = nextOrder.filter(
        (linkId, index) =>
          allowedLinkIds.has(linkId) && nextOrder.indexOf(linkId) === index,
      );
      currentOrder.forEach((linkId) => {
        if (!normalizedOrder.includes(linkId)) {
          normalizedOrder.push(linkId);
        }
      });

      return normalizedOrder.every(
        (linkId, index) => linkId === currentOrder[index],
      )
        ? currentOrder
        : normalizedOrder;
    });
    setHoverTargetId(null);
  }

  function applyThemeToAll(theme) {
    const previousTheme =
      linkThemes.find((linkTheme) => linkTheme.id === sharedThemeId) ??
      linkThemes.find(
        (linkTheme) => linkTheme.id === customizationValues[0]?.theme,
      );

    if (previousTheme?.id !== theme) {
      triggerColorAnimation("link", previousTheme?.background);
    }

    setCustomizations((current) =>
      Object.fromEntries(
        Object.entries(current).map(([linkId, customization]) => [
          linkId,
          { ...customization, theme },
        ]),
      ),
    );
  }

  function updateProfile(changes) {
    setProfileCustomization((current) => ({
      ...current,
      ...changes,
    }));
  }

  function updateProfileFontScale(field, scale) {
    setProfileCustomization((current) => ({
      ...current,
      fontScales: {
        ...current.fontScales,
        [field]: scale,
      },
    }));
  }

  function updateProfileVisibility(field, visible) {
    setProfileCustomization((current) => ({
      ...current,
      visibility: {
        ...current.visibility,
        [field]: visible,
      },
    }));
  }

  function updatePage(changes) {
    if (Object.hasOwn(changes, "background")) {
      const nextBackground = changes.background;

      if (
        typeof nextBackground === "string" &&
        nextBackground.toLowerCase() !==
          pageCustomization.background.toLowerCase()
      ) {
        triggerColorAnimation("background", pageCustomization.background);
      }
    }

    setPageCustomization((current) => ({
      ...current,
      ...changes,
    }));
  }

  function applyPaletteTheme(linkTheme) {
    if (!editMode) {
      return;
    }

    updatePage({ background: linkTheme.background });
  }

  function resetCustomizations() {
    setCustomizations(createDefaultLinkCustomizations());
    setListOrder(createDefaultListOrder());
    setProfileCustomization(createDefaultProfileCustomization());
    setPageCustomization(createDefaultPageCustomization());
  }

  function isPointerInsideVisibleElement(event, element) {
    const rect = element.getBoundingClientRect();

    return (
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom
    );
  }

  function handleShellEditClick(event) {
    if (!editMode) {
      return;
    }

    const previewElement = event.currentTarget;

    if (!isPointerInsideVisibleElement(event, previewElement)) {
      return;
    }

    if (event.target.closest(".profile-header")) {
      return;
    }

    if (
      activeTargetId === "profile-name" ||
      activeTargetId === "profile-bio" ||
      activeTargetId === "profile-location"
    ) {
      closeEditor();
      return;
    }

    if (event.target.closest(".editable-target, button, a, dialog")) {
      return;
    }
  }

  function handleWorkspaceHover(event) {
    if (!editMode) {
      return;
    }

    if (!event.target.closest(".app-shell") && hoverTargetId) {
      setHoverTargetId(null);
    }
  }

  return (
    <div
      className="editor-workspace"
      data-edit-mode={editMode || undefined}
      data-color-animation={
        colorAnimationState
          ? `${colorAnimationState.target}-${colorAnimationState.id}`
          : undefined
      }
      style={{
        "--custom-page-bg": pageCustomization.background,
        "--previous-page-bg":
          colorAnimationState?.target === "background"
            ? colorAnimationState.previousColor
            : undefined,
        "--previous-link-accent":
          colorAnimationState?.target === "link"
            ? colorAnimationState.previousColor
            : undefined,
      }}
      onMouseMove={handleWorkspaceHover}
    >
      <aside
        className="edit-workspace-chrome"
        aria-hidden={!editMode}
        inert={!editMode}
      >
        <div className="edit-workspace-toolbar">
          <div className="edit-workspace-status">
            <span aria-hidden="true" />
            <strong>Edit mode</strong>
            <small>Live link preview</small>
          </div>

          <p>Choose a background, select a link, or drag list buttons to reorder.</p>

          <div className="edit-workspace-actions">
            <button
              type="button"
              disabled={!editMode}
              onClick={resetCustomizations}
            >
              Reset
            </button>
            <button
              className="edit-workspace-done"
              type="button"
              disabled={!editMode}
              onClick={() => {
                setEditorState(null);
                setEditorTargetReleased(false);
                editorOpenRef.current = false;
                setEditMode(false);
              }}
            >
              Done
            </button>
          </div>
        </div>

        <div
          className="edit-workspace-palette"
          data-disabled={!editMode || undefined}
        >
          <span>Background</span>
          <div className="edit-workspace-swatches">
            {pageBackgroundThemes.map((linkTheme) => (
                <button
                  type="button"
                  key={linkTheme.id}
                  disabled={!editMode}
                  aria-label={`Apply ${linkTheme.label} to background`}
                  aria-pressed={selectedBackgroundThemeId === linkTheme.id}
                  title={linkTheme.label}
                  style={{ "--workspace-swatch": linkTheme.background }}
                  onClick={() => applyPaletteTheme(linkTheme)}
                />
              ))}
          </div>
        </div>

        <span className="edit-workspace-corner edit-workspace-corner--left">
          BizzNEST / editor
        </span>
        <span className="edit-workspace-corner edit-workspace-corner--right">
          Changes save automatically
        </span>
      </aside>

      <main
        className="app-shell"
        data-layout={layoutMode}
        data-edit-mode={editMode || undefined}
        data-active-target={activeTargetId || undefined}
        data-editor-target-released={editorTargetReleased || undefined}
        data-hover-target={hoverTargetId || undefined}
        data-background-theme={selectedBackgroundThemeId || undefined}
        onClick={handleShellEditClick}
        style={{
          "--page-bg": pageCustomization.background,
        }}
      >
        <LayoutToggle
          mode={layoutMode}
          onModeChange={handleLayoutModeChange}
        />

        <button
          className="edit-mode-toggle"
          type="button"
          aria-label={editMode ? "Turn edit mode off" : "Turn edit mode on"}
          aria-pressed={editMode}
          onClick={() => setEditMode((current) => !current)}
        >
          <PaintbrushIcon />
        </button>

        <PageContent
          layoutMode={layoutMode}
          animateLayoutIntro={layoutIntroActive}
          renderableLinks={renderableLinks}
          listRenderableLinks={listRenderableLinks}
          profileCustomization={profileCustomization}
          editMode={editMode}
          activeTargetId={activeTargetId}
          hoverTargetId={hoverTargetId}
          onEdit={openEditor}
          onEditBackground={openPageEditor}
          onProfileChange={updateProfile}
          onFinishInlineEdit={closeEditor}
          onHoverTarget={setHoverTargetId}
          onReorderLinks={reorderListLinks}
        />
      </main>

      {editorState &&
      editorState.type !== "profile-name" &&
      editorState.type !== "profile-bio" &&
      editorState.type !== "profile-location" &&
      editorState.type !== "profile-role" &&
      editorState.type !== "profile-footer" ? (
        <LinkEditor
          key={editorState.targetId}
          targetType={editorState.type}
          link={editingLink}
          customization={
            editingLink ? customizations[editingLink.id] : undefined
          }
          profileCustomization={profileCustomization}
          pageCustomization={pageCustomization}
          origin={editorState}
          themes={linkThemes}
          onNameChange={(title) =>
            editingLink ? updateLink(editingLink.id, { title }) : undefined
          }
          onThemeChange={(themeId) =>
            editingLink ? updateLink(editingLink.id, { theme: themeId }) : undefined
          }
          onProfileChange={updateProfile}
          onPageChange={updatePage}
          onApplyThemeToAll={applyThemeToAll}
          onReleaseTarget={() => setEditorTargetReleased(true)}
          onClose={closeEditor}
        />
      ) : null}

      <AnimatePresence>
        {editorState && textEditorDetails ? (
          <TextSizePopover
            key={editorState.targetId}
            label={textEditorDetails.label}
            origin={editorState}
            value={
              profileCustomization.fontScales?.[textEditorDetails.field] ?? 1
            }
            canHide={textEditorDetails.canHide}
            isVisible={
              profileCustomization.visibility?.[textEditorDetails.field] !==
              false
            }
            onChange={(scale) =>
              updateProfileFontScale(textEditorDetails.field, scale)
            }
            onVisibilityChange={(visible) =>
              updateProfileVisibility(textEditorDetails.field, visible)
            }
            onClose={closeEditor}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export default App;
