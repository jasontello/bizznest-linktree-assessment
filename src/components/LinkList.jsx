import LinkCard from "./LinkCard.jsx";

function LinkList({ links }) {
  return (
    <nav className="link-list" aria-label="Jason Tello links">
      {links.map((link) => (
        <LinkCard key={link.title} link={link} />
      ))}
    </nav>
  );
}

export default LinkList;
