import { FunctionalComponent, h } from 'preact';

interface CaseSummaryProps {
  summary: string;
  onCreateCase?: () => void;
}

const CaseSummary: FunctionalComponent<CaseSummaryProps> = ({ summary, onCreateCase }) => {
  const hasSummary = summary && summary !== 'No case summary yet.';
  return (
    <div class="sidebar-case-summary">
      <pre>{summary}</pre>
      <button
        class="sidebar-create-case-btn"
        disabled={!hasSummary}
        onClick={onCreateCase}
      >
        Create Case
      </button>
    </div>
  );
};

export default CaseSummary; 