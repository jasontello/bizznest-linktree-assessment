import ProfileHeader from "./components/ProfileHeader.jsx";
import LinkList from "./components/LinkList.jsx";
import { links } from "./data/links.js";

function App() {
  return (
    <main className="app-shell">
      <section className="profile-page" aria-label="Jason Tello personal links">
        <ProfileHeader />
        <LinkList links={links} />
      </section>
    </main>
  );
}

export default App;
