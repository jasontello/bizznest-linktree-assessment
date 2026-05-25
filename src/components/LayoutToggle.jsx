function LayoutToggle({ mode, onModeChange }) {
  const isGrid = mode === "grid";
  const iconSrc = `${import.meta.env.BASE_URL}${isGrid ? "list-icon.png" : "grid-icon.png"}`;

  return (
    <button
      className="layout-toggle"
      type="button"
      aria-label={isGrid ? "Switch to list view" : "Switch to grid view"}
      aria-pressed={isGrid}
      onClick={() => onModeChange(isGrid ? "list" : "grid")}
      title={isGrid ? "List view" : "Grid view"}
    >
      <img
        className="layout-toggle__icon"
        src={iconSrc}
        alt=""
        aria-hidden="true"
      />
    </button>
  );
}

export default LayoutToggle;
