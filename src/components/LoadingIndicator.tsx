import { FunctionComponent } from 'preact';
import { memo } from 'preact/compat';

const LoadingIndicator: FunctionComponent = memo(() => {
	return (
		<div class="message message-ai">
			<div class="loading-indicator">
				<span class="dot"></span>
				<span class="dot"></span>
				<span class="dot"></span>
			</div>
		</div>
	);
});

export default LoadingIndicator; 