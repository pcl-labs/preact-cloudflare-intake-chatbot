import { FunctionComponent } from 'preact';
import { useState, useRef, useEffect } from 'preact/hooks';
import AudioRecordingUI from './AudioRecordingUI';
import features from '../config/features';

interface MediaControlsProps {
	onMediaCapture: (blob: Blob, type: 'audio' | 'video') => void;
	onRecordingStateChange?: (isRecording: boolean) => void;
}

const MediaControls: FunctionComponent<MediaControlsProps> = ({ 
	onMediaCapture,
	onRecordingStateChange 
}) => {
	// If audio recording is disabled via feature flag, don't render anything
	if (!features.enableAudioRecording) {
		return null;
	}
	
	const [isRecording, setIsRecording] = useState(false);
	const [permissionDenied, setPermissionDenied] = useState(false);
	const mediaRecorderRef = useRef<MediaRecorder | null>(null);
	const mediaStreamRef = useRef<MediaStream | null>(null);
	const chunksRef = useRef<Blob[]>([]);

	useEffect(() => {
		onRecordingStateChange?.(isRecording);
	}, [isRecording, onRecordingStateChange]);

	const stopMediaStream = () => {
		if (mediaStreamRef.current) {
			mediaStreamRef.current.getTracks().forEach(track => {
				track.stop();
			});
			mediaStreamRef.current = null;
		}
	};

	useEffect(() => {
		return () => {
			stopMediaStream();
		};
	}, []);

	const startRecording = async () => {
		try {
			setPermissionDenied(false);
			const constraints = {
				audio: true,
				video: false
			};

			const stream = await navigator.mediaDevices.getUserMedia(constraints);
			mediaStreamRef.current = stream;
			const mediaRecorder = new MediaRecorder(stream);
			mediaRecorderRef.current = mediaRecorder;
			chunksRef.current = [];

			mediaRecorder.ondataavailable = (e) => {
				if (e.data.size > 0) {
					chunksRef.current.push(e.data);
				}
			};

			mediaRecorder.start();
			setIsRecording(true);
		} catch (error) {
			console.error('Error accessing media devices:', error);
			setIsRecording(false);
			setPermissionDenied(true);
			// Announce the error for screen readers
			if (typeof document !== 'undefined') {
				const errorMessage = document.createElement('div');
				errorMessage.setAttribute('role', 'alert');
				errorMessage.classList.add('sr-only');
				errorMessage.textContent = 'Microphone access denied. Please check your browser permissions.';
				document.body.appendChild(errorMessage);
				setTimeout(() => {
					document.body.removeChild(errorMessage);
				}, 5000);
			}
		}
	};

	const stopRecording = (shouldSave: boolean = true) => {
		if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
			try {
				mediaRecorderRef.current.onstop = () => {
					if (shouldSave && chunksRef.current.length > 0) {
						const blob = new Blob(chunksRef.current, {
							type: 'audio/webm'
						});
						onMediaCapture(blob, 'audio');
					}
					chunksRef.current = [];
					stopMediaStream();
					setIsRecording(false);
				};
				mediaRecorderRef.current.stop();
			} catch (error) {
				console.error('Error stopping recording:', error);
				// Force cleanup even if there was an error
				chunksRef.current = [];
				stopMediaStream();
				setIsRecording(false);
			}
		} else {
			// If recorder is not available or already inactive, just clean up
			chunksRef.current = [];
			stopMediaStream();
			setIsRecording(false);
		}
	};

	const handleCancelRecording = () => {
		stopRecording(false);
	};

	const handleConfirmRecording = () => {
		stopRecording(true);
	};

	const handleKeyDown = (e: KeyboardEvent) => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			if (!isRecording) {
				startRecording();
			}
		}
	};

	if (isRecording) {
		return (
			<div className="media-controls recording" role="region" aria-label="Audio recording controls">
				<AudioRecordingUI
					isRecording={isRecording}
					onCancel={handleCancelRecording}
					onConfirm={handleConfirmRecording}
					mediaStream={mediaStreamRef.current}
				/>
			</div>
		);
	}

	return (
		<div className="media-controls" role="region" aria-label="Audio recording">
			<button
				type="button"
				className="media-button"
				onClick={() => {
					if (!isRecording) {
						startRecording();
					}
				}}
				onKeyDown={handleKeyDown}
				title="Record audio"
				aria-label="Record audio message"
				aria-pressed={isRecording}
				disabled={permissionDenied}
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					className="media-icon"
					aria-hidden="true"
				>
					<path
						fill="currentColor"
						d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"
					/>
					<path
						fill="currentColor"
						d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"
					/>
				</svg>
			</button>
			{permissionDenied && (
				<div className="sr-only" role="alert">
					Microphone access denied. Please check your browser permissions.
				</div>
			)}
		</div>
	);
};

export default MediaControls; 