import { FunctionalComponent, h } from 'preact';

interface AboutFirmSectionProps {
  team: {
    name?: string;
    description?: string;
    website?: string;
    email?: string;
    phone?: string;
  };
}

const AboutFirmSection: FunctionalComponent<AboutFirmSectionProps> = ({ team }) => (
  <section class="w-full flex flex-col gap-1 p-4 bg-zinc-900 rounded-xl shadow">
    <h3 class="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-1">About Firm</h3>
    {team?.description && <div class="text-sm text-zinc-200 break-words mb-1">{team.description}</div>}
    {team?.website && (
      <div class="text-xs text-zinc-400">
        Website: <a href={team.website} target="_blank" rel="noopener" class="text-blue-400 hover:underline break-all">{team.website.replace(/^https?:\/\//, '')}</a>
      </div>
    )}
    {team?.email && (
      <div class="text-xs text-zinc-400">
        Email: <a href={`mailto:${team.email}`} class="text-blue-400 hover:underline break-all">{team.email}</a>
      </div>
    )}
    {team?.phone && (
      <div class="text-xs text-zinc-400">
        Phone: <a href={`tel:${team.phone}`} class="text-blue-400 hover:underline break-all">{team.phone}</a>
      </div>
    )}
  </section>
);

export default AboutFirmSection; 