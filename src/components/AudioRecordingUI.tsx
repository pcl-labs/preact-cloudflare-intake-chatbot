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

    useEffect(() => {
        setIsBrowser(true);
    }, []);

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

        const ctx = canvas.getContext('2d', { alpha: true });
        if (!ctx) return;

        // Get device pixel ratio
        const dpr = window.devicePixelRatio || 1;
        
        // Set canvas size accounting for device pixel ratio
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        
        // Scale for high DPI display
        ctx.scale(dpr, dpr);
        
        // Set canvas CSS dimensions
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
        
        // Ensure canvas is transparent
        canvas.style.backgroundColor = 'transparent';

        const width = rect.width;
        const height = rect.height;
        
        // Bar configuration
        const barWidth = 2;
        const barGap = 3;
        const numBars = Math.floor(width / (barWidth + barGap));
        
        // Initialize bar height data 
        const barData = Array(numBars).fill(0).map(() => 0.5 + Math.random() * 0.2);
        
        // Animation offset counter
        let animOffset = 0;
        
        // Animate the bar data with smooth transitions
        function animateBarData() {
            let i = 0;
            const phase = Math.sin(animOffset / 10) * 100;
            
            while (i < numBars) {
                let t = barData[i];
                
                // Add tiny random movement
                t += (Math.random() - 0.5) * 0.005;
                
                // Add multiple sine wave components with different frequencies and phases
                t += Math.sin(i * 0.6 + phase + animOffset) * 0.02;
                t += Math.sin(i * 0.1 + animOffset * 2) * 0.04;
                
                // Constrain values between 0 and 1
                barData[i++] = t <= 0.1 ? 0.1 : t >= 0.9 ? 0.9 : t;
            }
            
            // Increment animation offset for next frame
            animOffset += 0.03;
        }
        
        const drawBars = () => {
            // Update bar data for smooth animation
            animateBarData();
            
            // Clear the canvas with transparent background
            ctx.clearRect(0, 0, width * dpr, height * dpr);
            
            // Get color from computed style
            const computedStyle = getComputedStyle(canvas);
            const textColor = computedStyle.getPropertyValue('color');
            
            // Draw the bars
            for (let i = 0; i < numBars; i++) {
                const x = Math.round(i * (barWidth + barGap));
                const h = Math.round(barData[i] * height * 0.7); // 70% of height maximum
                const y = Math.round((height - h) / 2);
                const radius = Math.min(barWidth / 2, h / 2); // Rounded corners radius
                
                ctx.fillStyle = textColor;
                
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
        <div class="audio-recording-ui">
            <button class="recording-control-btn cancel" onClick={onCancel}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
            </button>
            <div class="recording-visualization">
                <canvas ref={canvasRef} width="300" height="40" />
                <div class="recording-timer">{formatTime(recordingTime)}</div>
            </div>
            <button class="recording-control-btn confirm" onClick={onConfirm}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>
                </svg>
            </button>
        </div>
    );
};

export default AudioRecordingUI; 