import { FunctionalComponent, h } from 'preact';

interface TimelineEvent {
  id: string;
  label: string;
  timestamp: string;
}

interface TimelineListProps {
  timeline: TimelineEvent[];
}

const TimelineList: FunctionalComponent<TimelineListProps> = ({ timeline }) => (
  <div class="sidebar-timeline-list">
    {timeline.length === 0 ? (
      <div class="sidebar-empty-state">No events yet.</div>
    ) : (
      timeline.map(event => (
        <div class="sidebar-timeline-item" key={event.id}>
          <span class="sidebar-timeline-label">{event.label}</span>
          <span class="sidebar-timeline-timestamp">{event.timestamp}</span>
        </div>
      ))
    )}
  </div>
);

export default TimelineList; 