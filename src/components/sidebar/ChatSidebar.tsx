import { useState } from 'preact/hooks';
import { ContactProfileCard, CaseSummarySection, MediaGallery, TimelineSection, AboutFirmSection } from '../details';
import { Lightbox } from '../ui';

type FileThumb = {
  id: string;
  name: string;
  url: string;
  type: string;
};

type TimelineItem = {
  id: string;
  label: string;
  timestamp: string;
};

type SidebarProps = {
  caseSummary: string;
  files: FileThumb[];
  timeline: TimelineItem[];
  onCreateCase: () => void;
  team: any;
};

export default function Sidebar({ caseSummary, files, timeline, onCreateCase, team }: SidebarProps) {
  const [lightboxFile, setLightboxFile] = useState<FileThumb | null>(null);

  const handleFileClick = (file: FileThumb) => {
    if (file.type.startsWith('image/')) {
      setLightboxFile(file);
    } else if (file.type.startsWith('video/')) {
      setLightboxFile(file); // Could extend Lightbox for video
    } else {
      window.open(file.url, '_blank');
    }
  };

  return (
    <div class="flex flex-col gap-4 w-full px-2">
      <ContactProfileCard
        logo={team?.logo}
        name={team?.name}
        tagline={team?.tagline}
        description={team?.description}
        website={team?.website}
        email={team?.email}
        phone={team?.phone}
      />
      <CaseSummarySection summary={caseSummary} />
      <TimelineSection timeline={timeline} />
      <AboutFirmSection team={team} />
      <div>
        <h3 class="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-1">Media, Files and Links</h3>
        <MediaGallery files={files} onFileClick={handleFileClick} gridClass="grid-cols-3" />
      </div>
      {lightboxFile && (
        <Lightbox
          src={lightboxFile.url}
          alt={lightboxFile.name}
          onClose={() => setLightboxFile(null)}
          type={lightboxFile.type}
        />
      )}
      <button class="sidebar-create-case-btn mt-4 w-full" onClick={onCreateCase}>
        Create Case
      </button>
    </div>
  );
} 