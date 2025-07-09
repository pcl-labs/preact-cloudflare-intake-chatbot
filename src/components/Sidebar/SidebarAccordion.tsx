import { FunctionalComponent, h } from 'preact';
import { useState } from 'preact/hooks';

interface SidebarAccordionSectionProps {
  title: string;
  icon: string;
  open: boolean;
  onToggle: () => void;
  children: preact.ComponentChildren;
}

export const SidebarAccordionSection: FunctionalComponent<SidebarAccordionSectionProps> = ({ title, icon, open, onToggle, children }) => (
  <div class="sidebar-card sidebar-accordion-section">
    <button
      class="sidebar-accordion-header"
      onClick={onToggle}
      aria-expanded={open}
    >
      <span class="sidebar-accordion-icon">{icon}</span>
      <span class="sidebar-accordion-title">{title}</span>
      <span class="sidebar-accordion-arrow">{open ? '▲' : '▼'}</span>
    </button>
    {open && <div class="sidebar-accordion-content">{children}</div>}
  </div>
);

interface SidebarAccordionProps {
  sections: Array<{
    key: string;
    icon: string;
    title: string;
    content: preact.ComponentChildren;
  }>;
  defaultOpenKey?: string;
}

const SidebarAccordion: FunctionalComponent<SidebarAccordionProps> = ({ sections, defaultOpenKey }) => {
  const [openKey, setOpenKey] = useState<string | null>(defaultOpenKey || sections[0]?.key || null);
  return (
    <div class="sidebar-accordion">
      {sections.map(section => (
        <SidebarAccordionSection
          key={section.key}
          title={section.title}
          icon={section.icon}
          open={openKey === section.key}
          onToggle={() => setOpenKey(openKey === section.key ? null : section.key)}
        >
          {section.content}
        </SidebarAccordionSection>
      ))}
    </div>
  );
};

export default SidebarAccordion; 