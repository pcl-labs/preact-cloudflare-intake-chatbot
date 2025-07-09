import { FunctionalComponent, h } from 'preact';

interface ProfileCardProps {
  logo?: string;
  name: string;
  tagline?: string;
  website?: string;
  email?: string;
  phone?: string;
  verified?: boolean;
}

const ProfileCard: FunctionalComponent<ProfileCardProps> = ({ logo, name, tagline, website, email, phone, verified }) => (
  <div class="sidebar-card sidebar-profile-card">
    {logo && <img src={logo} alt={name} class="sidebar-profile-logo" />}
    <h2 class="sidebar-profile-name">{name}</h2>
    {verified && <span class="sidebar-profile-verified" title="Verified">✔️</span>}
    {tagline && <p class="sidebar-profile-tagline">{tagline}</p>}
    <div class="sidebar-profile-actions">
      {website && <a href={website} target="_blank" rel="noopener" class="sidebar-profile-action" title="Website">🌐</a>}
      {email && <a href={`mailto:${email}`} class="sidebar-profile-action" title="Email">✉️</a>}
      {phone && <a href={`tel:${phone}`} class="sidebar-profile-action" title="Call">📞</a>}
    </div>
  </div>
);

export default ProfileCard; 