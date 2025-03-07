import { hydrate, prerender as ssr } from 'preact-iso';
import { useState, useRef, useEffect, useCallback } from 'preact/hooks';
// Remove direct imports of components that will be lazy-loaded
// import FileMenu from './components/FileMenu';
import LoadingIndicator from './components/LoadingIndicator';
// import MediaControls from './components/MediaControls';
import VirtualMessageList from './components/VirtualMessageList';
import { ErrorBoundary } from './components/ErrorBoundary';
import { debounce } from './utils/debounce';
import createLazyComponent from './utils/LazyComponent';
import features from './config/features';
import './style.css';

// Create lazy-loaded components
const LazyMediaControls = createLazyComponent(
	() => import('./components/MediaControls'),
	'MediaControls'
);

const LazyFileMenu = createLazyComponent(
	() => import('./components/FileMenu'),
	'FileMenu'
);

// Lazy-load other components that might not be needed immediately
const LazyLightbox = createLazyComponent(
	() => import('./components/Lightbox'),
	'Lightbox'
);

const LazyCameraModal = createLazyComponent(
	() => import('./components/CameraModal'),
	'CameraModal'
);

// Define position type
type ChatPosition = 'widget' | 'inline';

interface FileAttachment {
	name: string;
	size: number;
	type: string;
	url: string;
}

interface ChatMessage {
	content: string;
	isUser: boolean;
	files?: FileAttachment[];
}

const RESIZE_DEBOUNCE_DELAY = 100;
const INPUT_RESIZE_DEBOUNCE_DELAY = 50;

export function App() {
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [inputValue, setInputValue] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [previewFiles, setPreviewFiles] = useState<FileAttachment[]>([]);
	const [position, setPosition] = useState<ChatPosition>('widget');
	const [isOpen, setIsOpen] = useState(position === 'inline' ? true : false);
	const [teamId, setTeamId] = useState<string>('demo');
	const messageListRef = useRef<HTMLDivElement>(null);
	const [isRecording, setIsRecording] = useState(false);
	const [isDragging, setIsDragging] = useState(false);

	// Track drag counter for better handling of nested elements
	const dragCounter = useRef(0);

	// Parse URL parameters for configuration
	useEffect(() => {
		if (typeof window !== 'undefined') {
			const urlParams = new URLSearchParams(window.location.search);
			const positionParam = urlParams.get('position');
			const teamIdParam = urlParams.get('teamId');
			
			// Set position based on URL parameter
			if (positionParam === 'widget' || positionParam === 'inline') {
				setPosition(positionParam);
				// Immediately update isOpen based on position
				if (positionParam === 'inline') {
					setIsOpen(true);
				} else {
					setIsOpen(false);
				}
			}

			// Set teamId if available, otherwise keep the default "demo"
			if (teamIdParam) {
				setTeamId(teamIdParam);
			}
		}
	}, []);

	// Set up postMessage communication with parent frame
	useEffect(() => {
		// Function to notify parent frame of state changes
		const notifyParent = (eventType: string, data: any = {}) => {
			if (window.parent !== window) {
				window.parent.postMessage({
					type: eventType,
					...data
				}, '*');
			}
		};

		// Notify parent when open/closed state changes
		notifyParent('chatStateChange', { isOpen });

		// Listen for messages from parent
		const handleParentMessage = (event: MessageEvent) => {
			if (event.data && event.data.type && position === 'widget') {
				switch (event.data.type) {
					case 'toggleChat':
						setIsOpen(prev => !prev);
						break;
					case 'openChat':
						setIsOpen(true);
						break;
					case 'closeChat':
						setIsOpen(false);
						break;
				}
			}
		};

		window.addEventListener('message', handleParentMessage);
		
		return () => {
			window.removeEventListener('message', handleParentMessage);
		};
	}, [isOpen, position]);

	const adjustTextareaHeight = useCallback((target: HTMLTextAreaElement) => {
		target.style.height = 'auto';
		target.style.height = target.scrollHeight + 'px';
	}, []);

	const debouncedAdjustHeight = useCallback(
		debounce((target: HTMLTextAreaElement) => adjustTextareaHeight(target), INPUT_RESIZE_DEBOUNCE_DELAY),
		[adjustTextareaHeight]
	);

	const handleInputChange = useCallback((e: Event) => {
		const target = e.currentTarget as HTMLTextAreaElement;
		setInputValue(target.value);
		debouncedAdjustHeight(target);
	}, []);

	useEffect(() => {
		const handleResize = debounce(() => {
			const textarea = document.querySelector('.message-input') as HTMLTextAreaElement;
			if (textarea) {
				adjustTextareaHeight(textarea);
			}
		}, RESIZE_DEBOUNCE_DELAY);

		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	}, [adjustTextareaHeight]);

	const handlePhotoSelect = async (files: File[]) => {
		const fileAttachments: FileAttachment[] = await Promise.all(
			files.map(async (file) => ({
				name: file.name,
				size: file.size,
				type: file.type,
				url: URL.createObjectURL(file),
			}))
		);

		setPreviewFiles(prev => [...prev, ...fileAttachments]);
	};

	const handleCameraCapture = async (file: File) => {
		const fileAttachment: FileAttachment = {
			name: file.name,
			size: file.size,
			type: file.type,
			url: URL.createObjectURL(file),
		};

		setPreviewFiles(prev => [...prev, fileAttachment]);
	};

	const handleFileSelect = async (files: File[]) => {
		const fileAttachments: FileAttachment[] = await Promise.all(
			files.map(async (file) => ({
				name: file.name,
				size: file.size,
				type: file.type,
				url: URL.createObjectURL(file),
			}))
		);

		setPreviewFiles(prev => [...prev, ...fileAttachments]);
	};

	const removePreviewFile = (index: number) => {
		setPreviewFiles(prev => prev.filter((_, i) => i !== index));
	};

	const handleMediaCapture = (blob: Blob, type: 'audio' | 'video') => {
		const url = URL.createObjectURL(blob);
		const file: FileAttachment = {
			name: `Recording_${new Date().toISOString()}.webm`,
			size: blob.size,
			type: blob.type,
			url,
		};

		const newMessage: ChatMessage = {
			content: '',
			isUser: true,
			files: [file],
		};

		setMessages((prev) => [...prev, newMessage]);
	};

	// Make real API calls to ai.blawby.com with SSE support
	const sendMessageToAPI = async (message: string, attachments: FileAttachment[] = []) => {
		setIsLoading(true);
		
		try {
			const apiUrl = teamId 
				? `https://chat.blawby.com/api/chatbot/${teamId}` 
				: 'https://chat.blawby.com/api/chatbot';
			
			// Prepare the request data
			const requestData = {
				message,
				attachments: attachments.map(file => ({
					name: file.name,
					type: file.type,
					size: file.size,
					url: file.url
				}))
			};
			
			// Add a placeholder message for the AI's response that we'll update
			const placeholderMessage: ChatMessage = {
				content: '',
				isUser: false
			};
			
			setMessages(prev => [...prev, placeholderMessage]);
			
			// Make the API call
			const response = await fetch(apiUrl, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(requestData)
			});
			
			if (!response.ok) {
				throw new Error(`API error: ${response.status}`);
			}
			
			// Create a reader to read the stream
			const reader = response.body?.getReader();
			if (!reader) {
				throw new Error('ReadableStream not supported.');
			}
			
			let accumulatedResponse = '';
			
			// Process the stream
			while (true) {
				const { done, value } = await reader.read();
				
				if (done) {
					break;
				}
				
				// Convert the chunk to text
				const chunk = new TextDecoder().decode(value);
				
				// Parse the SSE data
				const lines = chunk.split('\n');
				let newContent = '';
				
				for (const line of lines) {
					if (line.startsWith('data:')) {
						try {
							const data = JSON.parse(line.substring(5));
							if (data.content) {
								newContent += data.content;
							}
						} catch (e) {
							// If not JSON, just append the raw data
							newContent += line.substring(5);
						}
					}
				}
				
				// Append to accumulated content
				accumulatedResponse += newContent;
				
				// Update the last message in the state
				setMessages(prevMessages => {
					const newMessages = [...prevMessages];
					if (newMessages.length > 0) {
						// Update the last message's content
						newMessages[newMessages.length - 1] = {
							...newMessages[newMessages.length - 1],
							content: accumulatedResponse
						};
					}
					return newMessages;
				});
			}
		} catch (error) {
			console.error('Error sending message:', error);
			
			// Show error to user
			setMessages(prev => [...prev, {
				content: "Sorry, there was an error communicating with the server. Please try again.",
				isUser: false
			}]);
		} finally {
			setIsLoading(false);
		}
	};

	// Update handleSubmit to use the new API function
	const handleSubmit = () => {
		if (!inputValue.trim() && previewFiles.length === 0) return;

		// Send files first if any
		if (previewFiles.length > 0) {
			const fileMessage: ChatMessage = {
				content: '',
				isUser: true,
				files: previewFiles
			};
			setMessages(prev => [...prev, fileMessage]);
		}

		// Send text message if any
		if (inputValue.trim()) {
			const textMessage: ChatMessage = {
				content: inputValue.trim(),
				isUser: true
			};
			setMessages(prev => [...prev, textMessage]);
		}

		setInputValue('');
		setPreviewFiles([]);
		
		// Reset textarea height
		const textarea = document.querySelector('.message-input') as HTMLTextAreaElement;
		if (textarea) {
			textarea.style.height = 'auto';
		}

		// Send message to API
		sendMessageToAPI(inputValue.trim(), previewFiles);
	};

	const handleKeyPress = (e: KeyboardEvent) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSubmit();
		}
	};

	// Add a helper function to get the appropriate file icon based on file type
	const getFileIcon = (file: FileAttachment) => {
		// Get file extension
		const ext = file.name.split('.').pop()?.toLowerCase();
		
		// PDF icon
		if (file.type === 'application/pdf' || ext === 'pdf') {
			return (
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
					<path fill="currentColor" d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm12 6V9c0-.55-.45-1-1-1h-2v5h2c.55 0 1-.45 1-1zm-2-3h1v3h-1V9zm4 2h1v-1h-1V9h1V8h-2v5h1v-1zm-8 0h1c.55 0 1-.45 1-1V9c0-.55-.45-1-1-1H9v5h1v-2zm0-2h1v1h-1V9z"/>
				</svg>
			);
		}
		
		// Word document icon
		if (file.type === 'application/msword' || 
			file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
			ext === 'doc' || ext === 'docx') {
			return (
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
					<path fill="currentColor" d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6zm10-9h-4v1h4v-1zm0 3H8v1h8v-1zm0 3H8v1h8v-1z"/>
				</svg>
			);
		}
		
		// Excel spreadsheet icon
		if (file.type === 'application/vnd.ms-excel' || 
			file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
			ext === 'xls' || ext === 'xlsx' || ext === 'csv') {
			return (
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
					<path fill="currentColor" d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6zm7-7H8v-2h5v2zm0 4H8v-2h5v2zm2-2v-2h2v2h-2zm0 4v-2h2v2h-2z"/>
				</svg>
			);
		}
		
		// Audio file icon
		if (file.type.startsWith('audio/')) {
			return (
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
					<path fill="currentColor" d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6zm-2 16c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
				</svg>
			);
		}
		
		// Video file icon
		if (file.type.startsWith('video/')) {
			return (
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
					<path fill="currentColor" d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4zM14 13h-3v3H9v-3H6v-2h3V8h2v3h3v2z"/>
				</svg>
			);
		}
		
		// Default file icon
		return (
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
				<path fill="currentColor" d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 2l5 5h-5V4zM6 20V4h5v6h6v10H6z" />
			</svg>
		);
	};

	// Handle file drag-and-drop events
	const handleDragEnter = (e: DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		dragCounter.current += 1;
		setIsDragging(true);
	};

	const handleDragLeave = (e: DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		
		dragCounter.current -= 1;
		
		// Only reset dragging state when we've left all drag elements
		if (dragCounter.current === 0) {
			setIsDragging(false);
		}
	};

	const handleDragOver = (e: DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
	};

	const handleDrop = async (e: DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		dragCounter.current = 0;
		setIsDragging(false);

		// Get all files from the drop event
		const droppedFiles = Array.from(e.dataTransfer?.files || []);
		
		if (droppedFiles.length === 0) return;

		// Separate different types of files
		const imageFiles = droppedFiles.filter(file => file.type.startsWith('image/'));
		const videoFiles = droppedFiles.filter(file => file.type.startsWith('video/'));
		const otherFiles = droppedFiles.filter(file => 
			!file.type.startsWith('image/') && 
			!file.type.startsWith('video/')
		);

		// Apply file type validation
		const mediaFiles = [...imageFiles, ...videoFiles];
		const safeOtherFiles = otherFiles.filter(file => {
			const fileExtension = file.name.split('.').pop()?.toLowerCase();
			const disallowedExtensions = ['zip', 'exe', 'bat', 'cmd', 'msi', 'app'];
			return !disallowedExtensions.includes(fileExtension || '');
		});

		// Handle media files
		if (mediaFiles.length > 0) {
			await handlePhotoSelect(mediaFiles);
		}

		// Handle other valid files
		if (safeOtherFiles.length > 0) {
			await handleFileSelect(safeOtherFiles);
		}

		// Show alert if any files were filtered out
		if (safeOtherFiles.length < otherFiles.length) {
			alert('Some files were not uploaded because they have disallowed file extensions (zip, exe, etc.)');
		}
	};

	// Register global drag handlers on the document body
	useEffect(() => {
		if (typeof document !== 'undefined') {
			document.body.addEventListener('dragenter', handleDragEnter);
			document.body.addEventListener('dragleave', handleDragLeave);
			document.body.addEventListener('dragover', handleDragOver);
			document.body.addEventListener('drop', handleDrop);

			return () => {
				document.body.removeEventListener('dragenter', handleDragEnter);
				document.body.removeEventListener('dragleave', handleDragLeave);
				document.body.removeEventListener('dragover', handleDragOver);
				document.body.removeEventListener('drop', handleDrop);
			};
		}
	}, []);

	useEffect(() => {
		if (typeof document === 'undefined') return;
		
		const messageList = document.querySelector('.message-list');
		if (!messageList) return;
		
		let scrollTimer: number | null = null;
		
		const handleScroll = () => {
			// Add scrolling class when scrolling starts
			messageList.classList.add('scrolling');
			
			// Clear any existing timer
			if (scrollTimer) {
				clearTimeout(scrollTimer);
				scrollTimer = null;
			}
			
			// Set a timer to remove the scrolling class after scrolling stops
			scrollTimer = window.setTimeout(() => {
				messageList.classList.remove('scrolling');
			}, 1000); // Hide scrollbar 1 second after scrolling stops
		};
		
		messageList.addEventListener('scroll', handleScroll);
		
		return () => {
			messageList.removeEventListener('scroll', handleScroll);
			if (scrollTimer) {
				clearTimeout(scrollTimer);
			}
		};
	}, []);

	return (
		<>
			{isDragging && (
				<div 
					className="drag-overlay" 
					role="dialog"
					aria-label="File upload"
					aria-modal="true"
				>
					<div className="drag-message">
						<svg 
							className="drag-message-icon" 
							xmlns="http://www.w3.org/2000/svg" 
							viewBox="0 0 24 24" 
							fill="none" 
							stroke="currentColor" 
							stroke-width="2" 
							stroke-linecap="round" 
							stroke-linejoin="round"
							aria-hidden="true"
						>
							<path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"></path>
							<path d="M12 12v9"></path>
							<path d="m16 16-4-4-4 4"></path>
						</svg>
						<h3 className="drag-message-title">Drop Files to Upload</h3>
						<p className="drag-message-subtitle">We accept images, videos, and document files</p>
					</div>
				</div>
			)}
		
			{/* Place toggle button outside main container for widget mode */}
			{position === 'widget' && (
				<button 
					className={`chat-toggle standalone ${isOpen ? 'chat-open' : 'chat-closed'}`}
					onClick={() => setIsOpen(prev => !prev)}
					aria-label={isOpen ? "Minimize chat" : "Open chat"}
					title={isOpen ? "Minimize chat" : "Open chat"}
				>
					{isOpen ? (
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">
							<path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" />
						</svg>
					) : (
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">
							<path fill="currentColor" d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z" />
						</svg>
					)}
				</button>
			)}
		
			<div 
				className={`chat-container ${position} ${position === 'widget' ? (isOpen ? 'open' : 'closed') : ''}`} 
				role="application" 
				aria-label="Chat interface"
				aria-expanded={position === 'inline' ? true : isOpen}
			>
				<ErrorBoundary>
					{(position === 'inline' || isOpen) && (
						<main className="chat-main">
							{messages.length === 0 && (
								<div className="welcome-message">
									<h1>What can I help with?</h1>
								</div>
							)}
							<VirtualMessageList messages={messages} isLoading={isLoading} />
							<div className="input-area" role="form" aria-label="Message composition">
								<div className="input-container">
									{previewFiles.length > 0 && (
										<div className="input-preview" role="list" aria-label="File attachments">
											{previewFiles.map((file, index) => (
												<div 
													className={`input-preview-item ${file.type.startsWith('image/') ? 'image-preview' : 'file-preview'}`}
													key={index}
													role="listitem"
												>
													{file.type.startsWith('image/') ? (
														<>
															<img src={file.url} alt={`Preview of ${file.name}`} />
														</>
													) : (
														<>
															<div className="file-thumbnail" aria-hidden="true">
																{getFileIcon(file)}
															</div>
															<div className="file-info">
																<div className="file-name">{file.name.length > 15 ? `${file.name.substring(0, 15)}...` : file.name}</div>
																<div className="file-ext">{file.name.split('.').pop()}</div>
															</div>
														</>
													)}
													<button
														type="button"
														className="input-preview-remove"
														onClick={() => removePreviewFile(index)}
														title="Remove file"
														aria-label={`Remove ${file.name}`}
													>
														<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">
															<path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" />
														</svg>
													</button>
												</div>
											))}
										</div>
									)}
									<textarea
										className="message-input"
										placeholder="Type a message..."
										rows={1}
										value={inputValue}
										onInput={handleInputChange}
										onKeyPress={handleKeyPress}
										disabled={isLoading}
										aria-label="Message input"
										aria-multiline="true"
										aria-required="false"
										aria-describedby="input-instructions"
									/>
									<span id="input-instructions" className="sr-only">
										Type your message and press Enter to send. Use the buttons below to attach files or record audio.
									</span>
									<div className="input-controls-row">
										<div className="input-controls">
											{!isRecording && (
												<LazyFileMenu
													onPhotoSelect={handlePhotoSelect}
													onCameraCapture={handleCameraCapture}
													onFileSelect={handleFileSelect}
												/>
											)}
											
											<div className="send-controls">
												{features.enableAudioRecording && (
													<LazyMediaControls
														onMediaCapture={handleMediaCapture}
														onRecordingStateChange={setIsRecording}
													/>
												)}
												
												<button
													className="send-button"
													type="button"
													onClick={handleSubmit}
													disabled={(!inputValue.trim() && previewFiles.length === 0) || isLoading}
													aria-label={(!inputValue.trim() && previewFiles.length === 0) ? "Send message (disabled)" : "Send message"}
												>
													<svg
														viewBox="0 0 24 24"
														className="send-icon"
														xmlns="http://www.w3.org/2000/svg"
														aria-hidden="true"
													>
														{(!inputValue.trim() && previewFiles.length === 0) ? (
															// Paper plane icon when nothing to send
															<path
																fill="currentColor"
																d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"
															/>
														) : (
															// Up arrow icon when ready to send
															<path
																fill="currentColor"
																d="M4 12l1.41 1.41L11 7.83V20h2V7.83l5.58 5.59L20 12l-8-8-8 8z"
															/>
														)}
													</svg>
												</button>
											</div>
										</div>
									</div>
								</div>
							</div>
						</main>
					)}
				</ErrorBoundary>
			</div>
		</>
	);
}

if (typeof window !== 'undefined') {
	hydrate(<App />, document.getElementById('app'));
}

export async function prerender(data) {
	return await ssr(<App {...data} />);
}
