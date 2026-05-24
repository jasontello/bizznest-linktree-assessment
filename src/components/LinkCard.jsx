function ArrowIcon() {
  return (
    <svg
      aria-hidden="true"
      className="link-arrow"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M8 5l7 7-7 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LinkCard({ link }) {
  const isExternal = link.url.startsWith("http");

  return (
    <a
      className="link-card"
      href={link.url}
      style={{ "--link-accent": link.accent, "--link-ink": link.ink }}
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noreferrer" : undefined}
      aria-label={`${link.title}: ${link.description}`}
    >
      <span className="link-icon" aria-hidden="true">
        {link.iconImage ? (
          <img className="link-icon__image" src={link.iconImage} alt="" />
        ) : (
          link.icon
        )}
      </span>

      <span className="link-content">
        <span className="link-title">{link.title}</span>
        <span className="link-description">{link.description}</span>
      </span>

      <ArrowIcon />
    </a>
  );
}

export default LinkCard;
