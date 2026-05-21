const avatarSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
  <circle cx="80" cy="80" r="78" fill="#F6F6F0"/>
  <circle cx="80" cy="80" r="66" fill="#050505"/>
  <text x="50%" y="58%" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="42" font-weight="800" fill="#F6F6F0">JT</text>
</svg>
`;

const avatarSrc = `data:image/svg+xml;utf8,${encodeURIComponent(avatarSvg)}`;

function ProfileHeader() {
  return (
    <header className="profile-header">
      <img
        className="profile-avatar"
        src={avatarSrc}
        alt="Jason Tello initials avatar"
      />

      <p className="role-line">Frontend • UI/UX • Creative Technology</p>

      <div className="profile-copy">
        <h1>Jason Tello</h1>
        <p className="bio">
          Design-oriented frontend developer focused on UI, interaction design,
          and creative web tools.
        </p>
        <p className="location">Rio Vista / Bay Area, CA</p>
      </div>
    </header>
  );
}

export default ProfileHeader;
