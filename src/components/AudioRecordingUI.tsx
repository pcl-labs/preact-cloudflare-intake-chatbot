import { FunctionComponent } from 'preact';
import { useEffect, useState, useRef } from 'preact/hooks';

interface AudioRecordingUIProps {
    onCancel: () => void;
    onConfirm: () => void;
    isRecording: boolean;
}

const AudioRecordingUI: FunctionComponent<AudioRecordingUIProps> = ({
    onCancel,
    onConfirm,
    isRecording
}) => {
    const [recordingTime, setRecordingTime] = useState(0);
    const [isBrowser, setIsBrowser] = useState(false);
    const timerRef = useRef<number>();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationFrameRef = useRef<number>();
    const confirmBtnRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        setIsBrowser(true);
    }, []);

    // Focus the confirm button when recording starts
    useEffect(() => {
        if (isBrowser && isRecording) {
            setTimeout(() => {
                confirmBtnRef.current?.focus();
            }, 100);
        }
    }, [isRecording, isBrowser]);

    // Handle keyboard navigation during recording
    useEffect(() => {
        if (!isBrowser || !isRecording) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                onCancel();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                onConfirm();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isRecording, isBrowser, onCancel, onConfirm]);

    // Timer logic
    useEffect(() => {
        if (!isBrowser || !isRecording) return;

        timerRef.current = window.setInterval(() => {
            setRecordingTime(prev => prev + 1);
        }, 1000);
        
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [isRecording, isBrowser]);

    // Waveform animation
    useEffect(() => {
        if (!isBrowser || !isRecording) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        // Cancel any existing animation frame to prevent duplicates
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = undefined;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Visualization settings
        const barWidth = 4;
        const barGap = 2;
        const barCount = Math.floor(canvas.width / (barWidth + barGap));
        const barHeightMultiplier = 30;
        const baseHeight = canvas.height / 4;
        const radius = 2; // Radius for rounded corners
        const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent-color');
        
        ctx.fillStyle = accentColor || '#0ea5e9';
        
        function animateBarData() {
            const amplitudes = [];
            for (let i = 0; i < barCount; i++) {
                // Dynamic animation logic
                const time = Date.now() / 1000;
                const freq = 1 + (i / barCount) * 3;
                const amplitude = (Math.sin(time * freq * 2) + 1) / 2;
                
                // Add variations based on index to make it look more natural
                const variation = Math.sin(i * 0.2) * 0.3 + 0.7;
                
                // Create amplitude array with values between 0.1 and 1
                const finalAmplitude = 0.1 + (amplitude * variation * 0.9);
                
                // Add in some randomness for realism
                const randomFactor = 0.05;
                const randomOffset = (Math.random() * 2 - 1) * randomFactor;
                
                amplitudes.push(Math.max(0.1, Math.min(1, finalAmplitude + randomOffset)));
            }
            return amplitudes;
        }
        
        const drawBars = () => {
            const barAmplitudes = animateBarData();
            
            // Clear the canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Center everything
            const totalWidth = barCount * barWidth + (barCount - 1) * barGap;
            const startX = (canvas.width - totalWidth) / 2;
            
            // Draw bars
            for (let i = 0; i < barCount; i++) {
                const x = startX + i * (barWidth + barGap);
                const amplitude = barAmplitudes[i];
                const h = amplitude * barHeightMultiplier + baseHeight;
                const y = (canvas.height - h) / 2;
                
                // Draw rounded rectangle with better corner handling
                if (h > 0) {
                    ctx.beginPath();
                    // Only use rounded corners if height is enough
                    if (h > radius * 2) {
                        // Corners are rounded
                        ctx.moveTo(x + radius, y);
                        ctx.lineTo(x + barWidth - radius, y);
                        ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + radius);
                        ctx.lineTo(x + barWidth, y + h - radius);
                        ctx.quadraticCurveTo(x + barWidth, y + h, x + barWidth - radius, y + h);
                        ctx.lineTo(x + radius, y + h);
                        ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
                        ctx.lineTo(x, y + radius);
                        ctx.quadraticCurveTo(x, y, x + radius, y);
                    } else {
                        // Simple rectangle for small heights
                        ctx.rect(x, y, barWidth, h);
                    }
                    ctx.fill();
                }
            }
            
            // Continue the animation loop if still recording
            if (isRecording) {
                animationFrameRef.current = requestAnimationFrame(drawBars);
            }
        };
        
        // Start the animation loop
        animationFrameRef.current = requestAnimationFrame(drawBars);
        
        // Cleanup function
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = undefined;
            }
        };
    }, [isRecording, isBrowser]);

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="audio-recording-ui" role="dialog" aria-label="Audio recording in progress">
            <button 
                className="recording-control-btn cancel" 
                onClick={onCancel}
                aria-label="Cancel recording"
                title="Cancel recording"
            >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
            </button>
            <div className="recording-visualization" aria-live="polite">
                <canvas ref={canvasRef} width="300" height="40" aria-hidden="true" />
                <div className="recording-timer" role="timer" aria-label={`Recording time: ${formatTime(recordingTime)}`}>
                    {formatTime(recordingTime)}
                </div>
                <div className="sr-only" aria-live="assertive">
                    Recording audio, duration: {formatTime(recordingTime)}
                </div>
            </div>
            <button 
                className="recording-control-btn confirm" 
                onClick={onConfirm}
                aria-label="Confirm and send recording"
                title="Confirm and send recording"
                ref={confirmBtnRef}
            >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="currentColor" d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>
                </svg>
            </button>
        </div>
    );
};

export default AudioRecordingUI; 