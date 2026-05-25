function GridArrowIcon() {
  return (
    <svg
      aria-hidden="true"
      className="grid-card__arrow"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M7 17L17 7M17 7H9M17 7V15"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LinkGrid({ links }) {
  return (
    <nav className="link-grid" aria-label="Jason Tello links grid">
      {links.map((link, index) => {
        const isExternal = link.url.startsWith("http");
        const cardSize = index === 0 ? "featured" : index === 1 ? "wide" : "small";

        return (
          <a
            className={`grid-card grid-card--${cardSize}`}
            href={link.url}
            key={link.title}
            rel={isExternal ? "noreferrer" : undefined}
            style={{ "--grid-accent": link.gridAccent || link.accent }}
            target={isExternal ? "_blank" : undefined}
            download={link.download}
            aria-label={`${link.title}: ${link.description}`}
          >
            <span className="grid-card__visual" aria-hidden="true">
              {link.iconImage ? (
                <img className="grid-card__image" src={link.iconImage} alt="" />
              ) : (
                <span className="grid-card__glyph">{link.icon}</span>
              )}
            </span>

            <span className="grid-card__copy">
              <span className="grid-card__label">{link.description}</span>
              <span className="grid-card__title">{link.title}</span>
            </span>

            <GridArrowIcon />
          </a>
        );
      })}
    </nav>
  );
}

export default LinkGrid;
