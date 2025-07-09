import { FunctionalComponent, h } from 'preact';

interface AboutFirmProps {
  description?: string;
  website?: string;
}

const AboutFirm: FunctionalComponent<AboutFirmProps> = ({ description, website }) => (
  <div class="sidebar-about-firm">
    <p>{description || 'We are a dedicated legal team here to help you with your case. Contact us for more information.'}</p>
    {website && (
      <a href={website} target="_blank" rel="noopener">
        {website}
      </a>
    )}
  </div>
);

export default AboutFirm; 