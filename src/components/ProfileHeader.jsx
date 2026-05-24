function ProfileHeader() {
  return (
    <header className="profile-header">
      <div className="profile-mark" role="img" aria-label="Three overlapping color circles">
        <span className="profile-mark__circle profile-mark__circle--blue" />
        <span className="profile-mark__circle profile-mark__circle--pink" />
        <span className="profile-mark__circle profile-mark__circle--yellow" />
      </div>

      <p className="role-line">Frontend • UI/UX • Creative Technology</p>

      <div className="profile-copy">
        <h1 className="profile-name">
          <span className="profile-name__first">Jason</span>
          <span className="profile-name__last">Tello</span>
        </h1>
        <p className="bio">
          <span>Design-oriented frontend developer focused on UI,</span>
          <span>interaction design, and creative web tools.</span>
        </p>
        <p className="location">Rio Vista / Bay Area, CA</p>
      </div>
    </header>
  );
}

export default ProfileHeader;
