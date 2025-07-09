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
  <ul class="sidebar-timeline-list">
    {timeline.length === 0 ? <li>No events yet.</li> : timeline.map(event => (
      <li class="sidebar-timeline-event" key={event.id}>
        <span class="sidebar-timeline-label">{event.label}</span>
        <span class="sidebar-timeline-timestamp">{event.timestamp}</span>
      </li>
    ))}
  </ul>
);

export default TimelineList; 