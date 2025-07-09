import { FunctionalComponent, h } from 'preact';

interface TimelineItem {
  id: string;
  label: string;
  timestamp: string;
}

interface TimelineSectionProps {
  timeline: TimelineItem[];
}

const TimelineSection: FunctionalComponent<TimelineSectionProps> = ({ timeline }) => (
  <section class="w-full flex flex-col gap-2 p-4 bg-zinc-900 rounded-xl shadow">
    <h3 class="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-1">Timeline</h3>
    <ul class="flex flex-col gap-1">
      {timeline.length === 0 ? (
        <li class="text-sm text-zinc-400">No timeline events.</li>
      ) : (
        timeline.map(item => (
          <li key={item.id} class="flex flex-col sm:flex-row sm:items-center gap-1">
            <span class="text-xs text-zinc-500 w-24 shrink-0">{item.timestamp}</span>
            <span class="text-sm text-zinc-200 break-words">{item.label}</span>
          </li>
        ))
      )}
    </ul>
  </section>
);

export default TimelineSection; 