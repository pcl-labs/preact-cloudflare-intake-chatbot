import { FunctionalComponent, h } from 'preact';

interface CaseSummarySectionProps {
  summary: string;
}

const CaseSummarySection: FunctionalComponent<CaseSummarySectionProps> = ({ summary }) => (
  <section class="w-full flex flex-col gap-1 p-4 bg-zinc-900 rounded-xl shadow">
    <h3 class="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-1">Case Summary</h3>
    <div class="text-sm text-zinc-200 break-words">{summary}</div>
  </section>
);

export default CaseSummarySection; 