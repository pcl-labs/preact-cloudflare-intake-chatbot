import { FunctionalComponent, h } from 'preact';
import ProfileCard from './Sidebar/ProfileCard';
import SidebarAccordion from './Sidebar/SidebarAccordion';
import CaseSummary from './Sidebar/CaseSummary';
import FileList from './Sidebar/FileList';
import TimelineList from './Sidebar/TimelineList';
import AboutFirm from './Sidebar/AboutFirm';

interface FileThumb {
  id: string;
  name: string;
  url: string;
  type: string;
}

interface TimelineEvent {
  id: string;
  label: string;
  timestamp: string;
}

interface TeamInfo {
  logo?: string;
  name: string;
  tagline?: string;
  website?: string;
  description?: string;
  email?: string;
  phone?: string;
  verified?: boolean;
}

interface SidebarProps {
  caseSummary: string; // markdown/MDX string
  files: FileThumb[];
  timeline: TimelineEvent[];
  onCreateCase?: () => void;
  team?: TeamInfo;
}

const Sidebar: FunctionalComponent<SidebarProps> = ({ caseSummary, files, timeline, onCreateCase, team }) => {
  const sections = [
    {
      key: 'Case Summary',
      icon: '📝',
      title: 'Case Summary',
      content: <CaseSummary summary={caseSummary} onCreateCase={onCreateCase} />
    },
    {
      key: 'Files',
      icon: '📁',
      title: 'Files',
      content: <FileList files={files} />
    },
    {
      key: 'Timeline',
      icon: '⏳',
      title: 'Timeline',
      content: <TimelineList timeline={timeline} />
    },
    {
      key: 'About the Firm',
      icon: '🏢',
      title: 'About the Firm',
      content: <AboutFirm description={team?.description} website={team?.website} />
    }
  ];

  return (
    <div class="sidebar-content">
      <ProfileCard
        logo={team?.logo}
        name={team?.name || 'Your Legal Team'}
        tagline={team?.tagline}
        website={team?.website}
        email={team?.email}
        phone={team?.phone}
        verified={team?.verified}
      />
      <SidebarAccordion sections={sections} defaultOpenKey="Case Summary" />
    </div>
  );
};

export default Sidebar; 