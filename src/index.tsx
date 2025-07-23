import { hydrate, prerender as ssr } from 'preact-iso';
import { useState, useRef, useEffect, useCallback, useMemo } from 'preact/hooks';
// Remove direct imports of components that will be lazy-loaded
// import FileMenu from './components/FileMenu';
import LoadingIndicator from './components/LoadingIndicator';
// import MediaControls from './components/MediaControls';
import VirtualMessageList from './components/VirtualMessageList';
import { ErrorBoundary } from './components/ErrorBoundary';
import { TeamNotFound } from './components/TeamNotFound';
import TeamProfile from './components/TeamProfile';
import MatterCanvas from './components/MatterCanvas';
import MediaSidebar from './components/MediaSidebar';
import PrivacySupportSidebar from './components/PrivacySupportSidebar';
import LeftSidebar from './components/LeftSidebar';
import BottomNavigation from './components/BottomNavigation';
import MobileSidebar from './components/MobileSidebar';
import MobileTopNav from './components/MobileTopNav';
import MattersList from './components/MattersList';
import MatterDetail from './components/MatterDetail';
import { debounce } from './utils/debounce';
import { useDebounce } from './utils/useDebounce';
import createLazyComponent from './utils/LazyComponent';
import features from './config/features';
import { detectSchedulingIntent, createSchedulingResponse } from './utils/scheduling';
import { getChatEndpoint, getFormsEndpoint, getTeamsEndpoint, getMatterCreationEndpoint } from './config/api';
import { router, RouterState } from './utils/routing';
import { Matter } from './types/matter';
import {
  FormState,
  processFormStep,
  startConversationalForm,
  extractContactInfo,
  formatFormData
} from './utils/conversationalForm';

import {
	DocumentIcon,
	DocumentTextIcon,
	TableCellsIcon,
	MusicalNoteIcon,
	VideoCameraIcon,
	XMarkIcon,
	ChatBubbleLeftIcon,
	ArrowUpIcon,
	CloudArrowUpIcon,
	FaceSmileIcon
} from '@heroicons/react/24/outline';
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

// Lazy-load scheduling components
const LazyScheduleButton = createLazyComponent(
	() => import('./components/scheduling/ScheduleButton'),
	'ScheduleButton'
);

// Define position type

import { FileAttachment } from './types/media';

// Add scheduling interface
interface SchedulingData {
	type: 'date-selection' | 'time-of-day-selection' | 'time-slot-selection' | 'confirmation';
	selectedDate?: Date;
	timeOfDay?: 'morning' | 'afternoon';
	scheduledDateTime?: Date;
}

interface MatterCreationData {
	type: 'service-selection' | 'urgency-selection' | 'ai-questions';
	availableServices: string[];
	question?: string;
	totalQuestions?: number;
	currentQuestionIndex?: number;
	questionType?: 'text' | 'choice' | 'date' | 'email';
	questionId?: string;
	questionOptions?: string[];
}

interface ChatMessage {
	content: string;
	isUser: boolean;
	files?: FileAttachment[];
	scheduling?: SchedulingData;
	matterCreation?: MatterCreationData;
	welcomeMessage?: {
		showButtons: boolean;
	};
	matterCanvas?: {
		matterId?: string;
		matterNumber?: string;
		service: string;
		matterSummary: string;
		qualityScore?: {
			score: number;
			badge: 'Excellent' | 'Good' | 'Fair' | 'Poor';
			color: 'blue' | 'green' | 'yellow' | 'red';
			inferredUrgency: string;
			breakdown: {
				followUpCompletion: number;
				requiredFields: number;
				evidence: number;
				clarity: number;
				urgency: number;
				consistency: number;
				aiConfidence: number;
			};
			suggestions: string[];
		};
		answers?: Record<string, string>;
	};
	isLoading?: boolean;
	id?: string;
}

const ANIMATION_DURATION = 300;
const RESIZE_DEBOUNCE_DELAY = 100;

// Utility function to upload a file to backend
async function uploadFileToBackend(file: File, teamId: string, sessionId: string) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('teamId', teamId);
  formData.append('sessionId', sessionId);

  const response = await fetch('/api/files/upload', {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.error || 'File upload failed');
  }
  const result = await response.json();
  return result.data;
}

export function App() {
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [inputValue, setInputValue] = useState('');
	// Global loading state removed - using per-message loading instead
	const [previewFiles, setPreviewFiles] = useState<FileAttachment[]>([]);

	const [teamId, setTeamId] = useState<string>('');
	const [sessionId] = useState<string>(() => crypto.randomUUID());
	const [teamNotFound, setTeamNotFound] = useState<boolean>(false);
	const messageListRef = useRef<HTMLDivElement>(null);
	const [isRecording, setIsRecording] = useState(false);
	const [isDragging, setIsDragging] = useState(false);
	const [formState, setFormState] = useState<FormState>({
		step: 'idle',
		data: {},
		isActive: false
	});

	// State for matter creation flow
	const [matterState, setMatterState] = useState<{
		step: 'idle' | 'gathering-info' | 'ai-questions' | 'matter-review' | 'matter-details' | 'ai-analysis' | 'ready-for-lawyer';
		data: {
			matterType?: string;
			description?: string;
			urgency?: string;
			location?: string;
			additionalInfo?: string;
			aiAnswers?: Record<string, string>;
			matterSummary?: string;
			followUpQuestions?: string[];
			currentFollowUpIndex?: number;
		};
		isActive: boolean;
		currentQuestionIndex?: number;
	}>({
		step: 'idle',
		data: {},
		isActive: false,
		currentQuestionIndex: 0
	});

	// State for team configuration
	const [teamConfig, setTeamConfig] = useState<{
		name: string;
		profileImage: string | null;
		introMessage: string | null;
		availableServices: string[];
		serviceQuestions?: Record<string, string[]>;
	}>({
		name: 'Blawby AI',
		profileImage: '/blawby-favicon-iframe.png',
		introMessage: null,
		availableServices: [],
		serviceQuestions: {}
	});

	// State for sidebar matter view
	const [sidebarMatter, setSidebarMatter] = useState<{
		matterId?: string;
		matterNumber?: string;
		service: string;
		matterSummary: string;
		qualityScore?: any;
		answers?: Record<string, string>;
	} | null>(null);

	// State for routing
	const [routerState, setRouterState] = useState<RouterState>({ currentRoute: 'chats', params: {} });
	
	// State for matters
	const [matters, setMatters] = useState<Matter[]>([]);
	const [selectedMatter, setSelectedMatter] = useState<Matter | null>(null);
	const [isLoadingMatters, setIsLoadingMatters] = useState(false);
	
	// State for mobile sidebar
	const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

	// State to prevent multiple simultaneous requests
	const [isProcessingRequest, setIsProcessingRequest] = useState(false);

	// Track drag counter for better handling of nested elements
	const dragCounter = useRef(0);

	// Function to find the most recent matter canvas from messages
	const findMostRecentMatter = () => {
		for (let i = messages.length - 1; i >= 0; i--) {
			if (messages[i].matterCanvas) {
				return messages[i].matterCanvas;
			}
		}
		return null;
	};

	// Function to handle view matter button click
	const handleViewMatter = () => {
		const mostRecentMatter = findMostRecentMatter();
		if (mostRecentMatter) {
			setSidebarMatter({
				...mostRecentMatter
			});
		} else {
			// If no matter exists, start the matter creation flow
			handleCreateMatterStart();
		}
	};

	// Effect to automatically update sidebar matter when new matter canvases are added
	useEffect(() => {
		const mostRecentMatter = findMostRecentMatter();
		if (mostRecentMatter && sidebarMatter) {
			// Only update if the matter has actually changed (different service or summary)
			if (mostRecentMatter.service !== sidebarMatter.service || 
				mostRecentMatter.matterSummary !== sidebarMatter.matterSummary) {
				setSidebarMatter({
					...mostRecentMatter
				});
			}
		} else if (mostRecentMatter && !sidebarMatter) {
			// If there's a matter but no sidebar matter, show it
			setSidebarMatter({
				...mostRecentMatter
			});
		}
	}, [messages]); // Watch for changes in messages

	// Handle feedback submission
	const handleFeedbackSubmit = useCallback((feedback: any) => {
		console.log('Feedback submitted:', feedback);
		// Could show a toast notification here
	}, []);

	// Handle routing changes
	useEffect(() => {
		const unsubscribe = router.subscribe((state) => {
			setRouterState(state);
		});
		
		return unsubscribe;
	}, []);

	// Handle bottom navigation tab changes
	const handleTabChange = useCallback((tab: 'chats' | 'matters') => {
		router.navigate(tab);
	}, []);

	// Load matters from messages (convert existing matter canvases to matters)
	useEffect(() => {
		const mattersFromMessages: Matter[] = messages
			.filter(msg => msg.matterCanvas)
			.map((msg, index) => {
				const canvas = msg.matterCanvas!;
				return {
					id: canvas.matterId || `matter-${index}`,
					matterNumber: canvas.matterNumber,
					title: `${canvas.service} Matter`,
					service: canvas.service,
					status: 'submitted' as const,
					createdAt: new Date(),
					updatedAt: new Date(),
					summary: canvas.matterSummary,
					qualityScore: canvas.qualityScore,
					answers: canvas.answers,
					contactInfo: {
						email: 'user@example.com', // This would come from form data
						phone: '+1 (555) 123-4567'
					}
				};
			});
		
		setMatters(mattersFromMessages);
	}, [messages]);

	// Handle matter selection
	const handleMatterSelect = useCallback((matter: Matter) => {
		setSelectedMatter(matter);
		router.navigate('matters', { id: matter.id });
	}, []);

	// Handle matter creation from matters view
	const handleCreateMatterFromList = useCallback(() => {
		router.navigate('chats');
		// Start matter creation flow after a short delay to allow navigation
		setTimeout(() => {
			handleCreateMatterStart();
		}, 100);
	}, []);

	// Handle back to matters list
	const handleBackToMatters = useCallback(() => {
		setSelectedMatter(null);
		router.navigate('matters');
	}, []);

	// Handle edit matter (for now, just go back to chat)
	const handleEditMatter = useCallback(() => {
		router.navigate('chats');
	}, []);

	// Parse URL parameters for configuration
	useEffect(() => {
		if (typeof window !== 'undefined') {
			const urlParams = new URLSearchParams(window.location.search);
			const teamIdParam = urlParams.get('teamId');
			const hostname = window.location.hostname;
			
			// Domain-based team routing
			if (hostname === 'northcarolinalegalservices.blawby.com') {
				setTeamId('north-carolina-legal-services');
				return;
			}
			
			// Check if we're on the root domain with no parameters - redirect to Blawby AI
			if (hostname === 'ai.blawby.com' && 
				window.location.pathname === '/' && 
				!teamIdParam) {
				// Redirect to Blawby AI
				window.location.href = 'https://ai.blawby.com/?teamId=blawby-ai';
				return;
			}

			// Set teamId if available, otherwise default to blawby-ai
			if (teamIdParam) {
				setTeamId(teamIdParam);
			} else {
				setTeamId('blawby-ai');
			}
		}
	}, []);



	const handleInputChange = useCallback((e: Event) => {
		const target = e.currentTarget as HTMLTextAreaElement;
		setInputValue(target.value);
		
		// Simple approach: reset height then set to scrollHeight
		target.style.height = '24px'; // Reset to default height first
		target.style.height = `${Math.max(24, target.scrollHeight)}px`;
	}, []);

	// Simple resize handler for window size changes
	useEffect(() => {
		const handleResize = () => {
			const textarea = document.querySelector('.message-input') as HTMLTextAreaElement;
			if (textarea) {
				// Use the same improved auto-expand logic
				textarea.style.height = '0';
				const newHeight = Math.max(24, textarea.scrollHeight);
				textarea.style.height = `${newHeight}px`;
			}
		};

		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	}, []);

	// Initialize textarea height on mount
	useEffect(() => {
		const textarea = document.querySelector('.message-input') as HTMLTextAreaElement;
		if (textarea && textarea.value) {
			textarea.style.height = '0';
			const newHeight = Math.max(24, textarea.scrollHeight);
			textarea.style.height = `${newHeight}px`;
		}
	}, []);

	// Fetch team configuration
	const fetchTeamConfig = async () => {
		if (!teamId) {
			return; // Don't fetch if no teamId (shouldn't happen with default)
		}
		
		try {
			const response = await fetch(getTeamsEndpoint());
			if (response.ok) {
				const teamsResponse = await response.json();
				const team = teamsResponse.data.find((t: any) => t.id === teamId);
				if (team?.config) {
					const config = {
						name: team.name || 'Blawby AI',
						profileImage: team.config.profileImage || '/blawby-favicon-iframe.png',
						introMessage: team.config.introMessage || null,
						availableServices: team.config.availableServices || [],
						serviceQuestions: team.config.serviceQuestions || {}
					};
					setTeamConfig(config);
					setTeamNotFound(false);
				} else {
					setTeamNotFound(true);
				}
			} else {
				setTeamNotFound(true);
			}
		} catch (error) {
			console.warn('Failed to fetch team config:', error);
			setTeamNotFound(true);
		}
	};

	// Fetch team config on mount and when teamId changes
	useEffect(() => {
		fetchTeamConfig();
	}, [teamId]);

	// Add welcome message when team config is loaded and no messages exist
	useEffect(() => {
		if (teamConfig.introMessage && messages.length === 0) {
			// Add team profile message first
			const profileMessage: ChatMessage = {
				content: '',
				isUser: false,
				welcomeMessage: {
					showButtons: false
				}
			};
			
			// Add welcome message with buttons
			const welcomeMessage: ChatMessage = {
				content: teamConfig.introMessage,
				isUser: false,
				welcomeMessage: {
					showButtons: true
				}
			};
			setMessages([profileMessage, welcomeMessage]);
		}
	}, [teamConfig.introMessage, messages.length]);

	// Retry function for team config
	const handleRetryTeamConfig = () => {
		setTeamNotFound(false);
		fetchTeamConfig();
	};

	const handlePhotoSelect = async (files: File[]) => {
		if (!teamId || !sessionId) {
			alert('Missing team or session ID. Cannot upload files.');
			return;
		}
		for (const file of files) {
			try {
				const uploaded = await uploadFileToBackend(file, teamId, sessionId);
				const fileAttachment: FileAttachment = {
					name: uploaded.fileName,
					size: uploaded.fileSize,
					type: uploaded.fileType,
					url: uploaded.url,
					backendId: uploaded.fileId,
				};
				setPreviewFiles(prev => [...prev, fileAttachment]);
			} catch (err: any) {
				alert(`Failed to upload file: ${file.name}\n${err.message}`);
			}
		}
	};

	const handleCameraCapture = async (file: File) => {
		if (!teamId || !sessionId) {
			alert('Missing team or session ID. Cannot upload files.');
			return;
		}
		try {
			const uploaded = await uploadFileToBackend(file, teamId, sessionId);
			const fileAttachment: FileAttachment = {
				name: uploaded.fileName,
				size: uploaded.fileSize,
				type: uploaded.fileType,
				url: uploaded.url,
				backendId: uploaded.fileId,
			};
			setPreviewFiles(prev => [...prev, fileAttachment]);
		} catch (err: any) {
			alert(`Failed to upload file: ${file.name}\n${err.message}`);
		}
	};

	const handleFileSelect = async (files: File[]) => {
		if (!teamId || !sessionId) {
			alert('Missing team or session ID. Cannot upload files.');
			return;
		}
		for (const file of files) {
			try {
				const uploaded = await uploadFileToBackend(file, teamId, sessionId);
				const fileAttachment: FileAttachment = {
					name: uploaded.fileName,
					size: uploaded.fileSize,
					type: uploaded.fileType,
					url: uploaded.url,
					backendId: uploaded.fileId,
				};
				setPreviewFiles(prev => [...prev, fileAttachment]);
			} catch (err: any) {
				alert(`Failed to upload file: ${file.name}\n${err.message}`);
			}
		}
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

	// Create debounced welcome button handlers to prevent spam clicks
	const debouncedCreateMatterStart = useMemo(() => 
		debounce(() => {
			// Send user's matter creation request message
			const matterMessage: ChatMessage = {
				content: "I'd like to create a matter and get help with my legal concern.",
				isUser: true
			};
			
			setMessages([...messages, matterMessage]);
			setInputValue('');
			
			// Add placeholder message with loading indicator (ChatGPT style)
			const loadingMessageId = crypto.randomUUID();
			const loadingMessage: ChatMessage = {
				content: "Let me set up your matter creation process...",
				isUser: false,
				isLoading: true,
				id: loadingMessageId
			};
			setMessages(prev => [...prev, loadingMessage]);
			
			// Start matter creation flow
			setTimeout(() => {
				const services = teamConfig.availableServices || [];
				const serviceOptions = services.length > 0 
					? services.map(service => `• ${service}`).join('\n')
					: '• Family Law\n• Business Law\n• Employment Law\n• Real Estate\n• Criminal Law\n• Other';
				
				// Update the loading message with actual content
				setMessages(prev => prev.map(msg => 
					msg.id === loadingMessageId 
						? {
							...msg,
							content: `I'm here to help you create a matter and assess your legal situation. We provide legal services for the following areas:\n\n${serviceOptions}\n\nPlease select the type of legal matter you're dealing with, or choose "General Inquiry" if you're not sure:`,
							isLoading: false,
							matterCreation: {
								type: 'service-selection',
								availableServices: services
							}
						}
						: msg
				));
				
				// Start matter creation flow
				setMatterState({
					step: 'gathering-info',
					data: {},
					isActive: true
				});
			}, 1000);
		}, 500), // 500ms debounce delay
		[messages, teamConfig.availableServices]
	);

	const debouncedScheduleStart = useMemo(() => 
		debounce(() => {
			// Send user's scheduling request message
			const schedulingMessage: ChatMessage = {
				content: "I'd like to request a consultation.",
				isUser: true
			};
			
			setMessages([...messages, schedulingMessage]);
			setInputValue('');
			
			// Add placeholder message with loading indicator (ChatGPT style)
			const loadingMessageId = crypto.randomUUID();
			const loadingMessage: ChatMessage = {
				content: "Let me help you schedule a consultation...",
				isUser: false,
				isLoading: true,
				id: loadingMessageId
			};
			setMessages(prev => [...prev, loadingMessage]);
			
			// Use our scheduling utility to create the AI response
			setTimeout(() => {
				const aiResponse = createSchedulingResponse('initial');
				// Update the loading message with actual content
				setMessages(prev => prev.map(msg => 
					msg.id === loadingMessageId 
						? {
							...msg,
							content: aiResponse.content,
							isLoading: false,
							scheduling: aiResponse.scheduling
						}
						: msg
				));
			}, 800);
		}, 500), // 500ms debounce delay
		[messages]
	);

	// Add matter creation handlers (now debounced)
	const handleCreateMatterStart = () => {
		debouncedCreateMatterStart();
	};

	// Add scheduling handlers (now debounced)
	const handleScheduleStart = () => {
		debouncedScheduleStart();
	};
	
	const handleDateSelect = (date: Date) => {
		// Send user's selected date as a message
		const formattedDate = new Intl.DateTimeFormat('en-US', {
			weekday: 'long',
			month: 'long',
			day: 'numeric'
		}).format(date);
		
		const dateSelectionMessage: ChatMessage = {
			content: `I'd like to be contacted on ${formattedDate} for my consultation.`,
			isUser: true
		};
		
		setMessages(prev => [...prev, dateSelectionMessage]);
		
		// Add placeholder message with loading indicator (ChatGPT style)
		const loadingMessageId = crypto.randomUUID();
		const loadingMessage: ChatMessage = {
			content: "Perfect! Let me check time slots for that date...",
			isUser: false,
			isLoading: true,
			id: loadingMessageId
		};
		setMessages(prev => [...prev, loadingMessage]);
		
		// Simulate AI response with time of day options
		setTimeout(() => {
			// Update the loading message with actual content
			setMessages(prev => prev.map(msg => 
				msg.id === loadingMessageId 
					? {
						...msg,
						content: `Great! What time on ${formattedDate} would be best for your consultation?`,
						isLoading: false,
						scheduling: {
							type: 'time-of-day-selection',
							selectedDate: date
						}
					}
					: msg
			));
		}, 800);
	};
	
	const handleTimeOfDaySelect = (timeOfDay: 'morning' | 'afternoon') => {
		// Get the most recent selected date from messages
		const lastDateSelection = [...messages]
			.reverse()
			.find(msg => msg.scheduling?.selectedDate)?.scheduling?.selectedDate;
			
		if (!lastDateSelection) return;
		
		// Map time of day to human-readable string
		const timeOfDayLabel = {
			morning: 'Morning (8:00 AM - 12:00 PM)',
			afternoon: 'Afternoon (12:00 PM - 5:00 PM)'
		}[timeOfDay];
		
		// Format the date
		const formattedDate = new Intl.DateTimeFormat('en-US', {
			weekday: 'long',
			month: 'long',
			day: 'numeric'
		}).format(lastDateSelection);
		
		// Send user's time of day selection as a message
		const timeSelectionMessage: ChatMessage = {
			content: `I prefer to be contacted in the ${timeOfDayLabel} on ${formattedDate}.`,
			isUser: true
		};
		
		setMessages(prev => [...prev, timeSelectionMessage]);
		
		// Add placeholder message with loading indicator (ChatGPT style)
		const loadingMessageId = crypto.randomUUID();
		const loadingMessage: ChatMessage = {
			content: "Great! Let me show you the available time slots...",
			isUser: false,
			isLoading: true,
			id: loadingMessageId
		};
		setMessages(prev => [...prev, loadingMessage]);
		
		// Simulate AI response with specific time slots
		setTimeout(() => {
			// Update the loading message with actual content
			setMessages(prev => prev.map(msg => 
				msg.id === loadingMessageId 
					? {
						...msg,
						content: `Great! Please select a specific time when you'll be available for your consultation on ${formattedDate}:`,
						isLoading: false,
						scheduling: {
							type: 'time-slot-selection',
							selectedDate: lastDateSelection,
							timeOfDay
						}
					}
					: msg
			));
		}, 800);
	};
	
	const handleTimeSlotSelect = (timeSlot: Date) => {
		// Format the time
		const formattedTime = new Intl.DateTimeFormat('en-US', {
			hour: 'numeric',
			minute: 'numeric',
			hour12: true
		}).format(timeSlot);
		
		// Format the full date
		const formattedDate = new Intl.DateTimeFormat('en-US', {
			weekday: 'long',
			month: 'long',
			day: 'numeric'
		}).format(timeSlot);
		
		// Send user's time slot selection as a message
		const timeSlotSelectionMessage: ChatMessage = {
			content: `I'll be available for a consultation at ${formattedTime} on ${formattedDate}.`,
			isUser: true
		};
		
		setMessages(prev => [...prev, timeSlotSelectionMessage]);
		
		// Add placeholder message with loading indicator (ChatGPT style)
		const loadingMessageId = crypto.randomUUID();
		const loadingMessage: ChatMessage = {
			content: "Perfect! Let me confirm your consultation request...",
			isUser: false,
			isLoading: true,
			id: loadingMessageId
		};
		setMessages(prev => [...prev, loadingMessage]);
		
		// Simulate AI confirmation response
		setTimeout(async () => {

			
			// Update the loading message with actual content
			setMessages(prev => prev.map(msg => 
				msg.id === loadingMessageId 
					? {
						...msg,
						content: `Thank you! Your consultation request has been submitted for ${formattedTime} on ${formattedDate}. A team member will contact you at this time. Is there anything specific you'd like to discuss during your consultation?`,
						isLoading: false,
						scheduling: {
							type: 'confirmation',
							scheduledDateTime: timeSlot
						}
					}
					: msg
			));
		}, 800);
	};
	
	const handleRequestMoreDates = () => {
		// Send user's request for more dates as a message
		const moreDatesMessage: ChatMessage = {
			content: "I need to see more date options.",
			isUser: true
		};
		
		setMessages(prev => [...prev, moreDatesMessage]);
		
		// Add placeholder message with loading indicator (ChatGPT style)
		const loadingMessageId = crypto.randomUUID();
		const loadingMessage: ChatMessage = {
			content: "Let me find more available dates for you...",
			isUser: false,
			isLoading: true,
			id: loadingMessageId
		};
		setMessages(prev => [...prev, loadingMessage]);
		
		// Find the most recent date-selection message
		const latestDateSelectionMsg = [...messages]
			.reverse()
			.find(msg => msg.scheduling?.type === 'date-selection');
			
		// Calculate new start date - add 9 days to the previous start date
		let startDate = new Date();
		if (latestDateSelectionMsg?.scheduling?.selectedDate) {
			startDate = new Date(latestDateSelectionMsg.scheduling.selectedDate);
			startDate.setDate(startDate.getDate() + 9); // Add 9 days
		}
		
		// Simulate AI response with more dates
		setTimeout(() => {
			// Update the loading message with actual content
			setMessages(prev => prev.map(msg => 
				msg.id === loadingMessageId 
					? {
						...msg,
						content: "Here are some additional dates to choose from:",
						isLoading: false,
						scheduling: {
							type: 'date-selection',
							selectedDate: startDate
						}
					}
					: msg
			));
		}, 800);
	};

	// Make real API calls to ai.blawby.com with SSE support
	const sendMessageToAPI = async (message: string, attachments: FileAttachment[] = []) => {
		
		// In a real implementation, this would be a call to your AI service API
		try {
			// Create user message
			const userMessage: ChatMessage = {
				content: message,
				isUser: true,
				files: attachments
			};
			
			setMessages(prev => [...prev, userMessage]);
			setInputValue('');
			setPreviewFiles([]);
			
			// Add a placeholder AI message immediately that will be updated
			const placeholderId = Date.now().toString();
			const placeholderMessage: ChatMessage = {
				content: 'Thinking...',
				isUser: false,
				isLoading: true,
				id: placeholderId
			};
			
			setMessages(prev => [...prev, placeholderMessage]);
			
			// Check if we're in an active form collection state
			if (formState.isActive) {
				// Process form step
				const extractedInfo = extractContactInfo(message);
				const { newState, response, shouldSubmit } = processFormStep(formState, message, extractedInfo);
				
				setFormState(newState);
				
				// Update the placeholder message with form response
				setTimeout(() => {
					setMessages(prev => prev.map(msg => 
						msg.id === placeholderId ? { 
							...msg, 
							content: response,
							isLoading: false,
							id: placeholderId 
						} : msg
					));
					
					// Submit form if complete
					if (shouldSubmit && newState.data.email && newState.data.phone && newState.data.matterDetails) {
						submitContactForm(newState.data);
					}
				}, 1000);
				
				return;
			}
			
			// Check if user typed a service name directly
			const availableServices = teamConfig.availableServices || [];
			const isServiceName = availableServices.some(service => 
				message.toLowerCase().trim() === service.toLowerCase() ||
				message.toLowerCase().trim() === service.toLowerCase().replace(/-/g, ' ')
			);
			
			// Also check for "General Inquiry"
			const isGeneralInquiry = message.toLowerCase().trim() === 'general inquiry';
			
			if ((isServiceName || isGeneralInquiry) && !matterState.isActive) {
				// Start matter creation flow with the typed service
				setMatterState({
					step: 'gathering-info',
					data: {},
					isActive: true
				});
				
				// Process the service selection
				setTimeout(async () => {
					try {
						const result = await handleMatterCreationAPI('service-selection', { service: message });
						
						setMatterState(prev => ({
							...prev,
							data: { ...prev.data, matterType: message },
							step: result.step,
							currentQuestionIndex: result.currentQuestionIndex || 0
						}));
						
						setMessages(prev => prev.map(msg => 
							msg.id === placeholderId ? { 
								...msg, 
								content: result.message,
								isLoading: false,
								id: placeholderId 
							} : msg
						));
					} catch (error) {
						console.error('Service selection error:', error);
						setMessages(prev => prev.map(msg => 
							msg.id === placeholderId ? { 
								...msg, 
								content: "I apologize, but I encountered an error processing your service selection. Please try again.",
								isLoading: false,
								id: placeholderId 
							} : msg
						));
					}
				}, 1000);
				
				return;
			}
			
			// Check if this is a scheduled message (could come from API in real implementation)
			const hasSchedulingIntent = detectSchedulingIntent(message);
			
			// This simulates the AI detecting scheduling intent and responding
			if (hasSchedulingIntent) {
				// Start typing after a short delay
				setTimeout(() => {
					// Create a scheduling response using our utility
					const aiResponse = createSchedulingResponse('initial');
					
					// Replace the placeholder message with the actual response
					setMessages(prev => prev.map(msg => 
						msg.id === placeholderId ? { ...aiResponse, isLoading: false, id: placeholderId } : msg
					));
				}, 1000);
				
				return;
			}
			
			// Create message history from existing messages
			const messageHistory = messages.map(msg => ({
				role: msg.isUser ? 'user' : 'assistant',
				content: msg.content
			}));
			
			// Add current message
			messageHistory.push({
				role: 'user',
				content: message
			});
			
			// Make actual API call using configuration
			const apiEndpoint = getChatEndpoint();
			
			try {
				const response = await fetch(apiEndpoint, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						messages: messageHistory,
						teamId: teamId,
						sessionId: sessionId
					})
				});
				
				if (!response.ok) {
					throw new Error(`API response error: ${response.status}`);
				}
				
				// Handle JSON response (non-streaming)
				const data = await response.json();
				
				const aiResponseText = data.response || data.message || data.content || '';

				
				// Update the placeholder message with the response
				setMessages(prev => prev.map(msg => 
					msg.id === placeholderId ? { 
						...msg, 
						content: aiResponseText,
						isLoading: false 
					} : msg
				));
				
			} catch (error) {
				console.error('Error fetching from AI API:', error);
				
				// Update placeholder with error message
				setMessages(prev => prev.map(msg => 
					msg.id === placeholderId ? { 
						...msg, 
						content: "Sorry, there was an error connecting to our AI service. Please try again later.",
						isLoading: false 
					} : msg
				));
			}
			
		} catch (error) {
			console.error('Error sending message:', error);
			
			// Update placeholder with error message
			setMessages(prev => prev.map(msg => 
				msg.id === placeholderId ? { 
					...msg, 
					content: "Sorry, there was an error processing your request. Please try again.",
					isLoading: false 
				} : msg
			));
		}
	};

	// Submit contact form to API
	const submitContactForm = async (formData: any) => {
		// Add placeholder message with loading indicator (ChatGPT style)
		const loadingMessageId = crypto.randomUUID();
		
		try {
			const loadingMessage: ChatMessage = {
				content: "Thank you! Let me submit your information to our legal team...",
				isUser: false,
				isLoading: true,
				id: loadingMessageId
			};
			setMessages(prev => [...prev, loadingMessage]);
			
			const formPayload = formatFormData(formData, teamId);
			const response = await fetch(getFormsEndpoint(), {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(formPayload)
			});

			if (response.ok) {
				const result = await response.json();
				console.log('Form submitted successfully:', result);
				
				// Fetch team configuration to check payment requirements and webhook config
				let teamConfig = null;
				try {
					const teamsResponse = await fetch(getTeamsEndpoint());
					if (teamsResponse.ok) {
						const teamsJson = await teamsResponse.json();
						teamConfig = teamsJson.data.find((team: any) => team.id === teamId);
					}
				} catch (error) {
					console.warn('Failed to fetch team config:', error);
				}
				

				
				// Create confirmation message based on payment requirements and matter creation status
				let confirmationContent = "";
				
				// Check if this came from matter creation flow
				const hasMatter = formData.matterDescription && formData.matterDescription !== '';
				
				if (hasMatter) {
					// Show matter canvas focus message
					confirmationContent = `✅ Perfect! Your complete matter information has been submitted successfully and updated below.`;
				} else {
					// Regular form submission
					if (teamConfig?.config?.requiresPayment) {
						const fee = teamConfig.config.consultationFee;
						const paymentLink = teamConfig.config.paymentLink;
						
						confirmationContent = `✅ Thank you! Your information has been submitted successfully.\n\n` +
							`💰 **Consultation Fee**: $${fee}\n\n` +
							`To schedule your consultation with our lawyer, please complete the payment first. ` +
							`This helps us prioritize your matter and ensures we can provide you with the best legal assistance.\n\n` +
							`🔗 **Payment Link**: ${paymentLink}\n\n` +
							`Once payment is completed, a lawyer will review your matter and contact you within 24 hours. ` +
							`Thank you for choosing ${teamConfig.name}!`;
					} else {
						confirmationContent = `✅ Your information has been submitted successfully! A lawyer will review your matter and contact you within 24 hours. Thank you for choosing our firm.`;
					}
				}
				
				// Update the loading message with confirmation
				setTimeout(() => {
					setMessages(prev => prev.map(msg => 
						msg.id === loadingMessageId 
							? {
								...msg,
								content: confirmationContent,
								isLoading: false
							}
							: msg
					));
				}, 300);
				
				// Show updated matter canvas with contact information (only if from matter creation)
				if (hasMatter) {
					setTimeout(() => {
						// Find the last message with a matter canvas to get the matter data
						setMessages(prev => {
							let lastMatterCanvas = null;
							for (let i = prev.length - 1; i >= 0; i--) {
								if (prev[i].matterCanvas) {
									lastMatterCanvas = prev[i].matterCanvas;
									break;
								}
							}
							
							if (lastMatterCanvas) {
								// Create updated matter summary with contact information
								const updatedMatterSummary = lastMatterCanvas.matterSummary + 
									`\n\n## 📞 Contact Information\n` +
									`- **Email**: ${formData.email}\n` +
									`- **Phone**: ${formData.phone}\n` +
									`- **Status**: ✅ Ready for Attorney Review\n` +
									`- **Submitted**: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;
								
								// Show the updated matter canvas as a new message
								const updatedMatterMessage: ChatMessage = {
									content: "Here's your complete matter information with contact details:",
									isUser: false,
									matterCanvas: {
										...lastMatterCanvas,
										matterSummary: updatedMatterSummary
									}
								};
								return [...prev, updatedMatterMessage];
							}
							return prev;
						});
						
						// Add payment/next steps message after matter canvas
						setTimeout(() => {
							let nextStepsMessage = "";
							
							if (teamConfig?.config?.requiresPayment) {
								const fee = teamConfig.config.consultationFee;
								const paymentLink = teamConfig.config.paymentLink;
								
								nextStepsMessage = `💰 **Consultation Fee**: $${fee}\n\n` +
									`To schedule your consultation with our lawyer, please complete the payment first. ` +
									`This helps us prioritize your matter and ensures we can provide you with the best legal assistance.\n\n` +
									`🔗 **Payment Link**: ${paymentLink}\n\n` +
									`Once payment is completed, a lawyer will review your matter and contact you within 24 hours. ` +
									`Thank you for choosing ${teamConfig.name}!`;
							} else {
								nextStepsMessage = `A lawyer will review your complete matter information and contact you within 24 hours. Thank you for choosing our firm!`;
							}
							
							const nextStepsMsg: ChatMessage = {
								content: nextStepsMessage,
								isUser: false
							};
							setMessages(prev => [...prev, nextStepsMsg]);
						}, 500);
					}, 1000);
				}
				
				// Reset form state
				setFormState({
					step: 'idle',
					data: {},
					isActive: false
				});


				
			} else {
				throw new Error('Form submission failed');
			}
		} catch (error) {
			console.error('Error submitting form:', error);
			
			// Update loading message with error content
			setTimeout(() => {
				setMessages(prev => prev.map(msg => 
					msg.id === loadingMessageId 
						? {
							...msg,
							content: "Sorry, there was an error submitting your information. Please try again or contact us directly.",
							isLoading: false
						}
						: msg
				));
			}, 300);
		}
	};

	// Update handleSubmit to use the new API function


	// Create debounced submit function
	const debouncedSubmit = useDebounce(() => {
		if (!inputValue.trim() && previewFiles.length === 0) return;

		const message = inputValue.trim();
		const attachments = [...previewFiles];
		
		// Handle form flow first (higher priority than matter creation)
		if (formState.isActive) {
			sendMessageToAPI(message, attachments);
			return;
		}
		
		// Handle matter creation flow
		if (matterState.isActive) {
			handleMatterCreationStep(message, attachments);
			return;
		}

		// Send message to API
		sendMessageToAPI(message, attachments);
		
		// Reset input and focus
		setInputValue('');
		setPreviewFiles([]);
		
		// Just focus the textarea
		const textarea = document.querySelector('.message-input') as HTMLTextAreaElement;
		if (textarea) {
			textarea.focus();
		}
	}, 500);

	// Update handleSubmit to use the debounced version
	const handleSubmit = () => {
		debouncedSubmit();
	};

	// API-driven matter creation handler
	const handleMatterCreationAPI = useCallback(async (step: string, data: any = {}) => {
		try {
			// Ensure we have a valid teamId
			if (!teamId) {
				throw new Error('TeamId not set - cannot make API request');
			}
			
			const requestBody = {
				teamId: teamId,
				service: data.service || matterState.data.matterType,
				step: step,
				currentQuestionIndex: data.currentQuestionIndex,
				answers: data.answers,
				description: data.description,
				urgency: data.urgency
			};
			
			console.log('Matter creation API request:', requestBody);
			console.log('Current teamId:', teamId);
			console.log('API endpoint:', getMatterCreationEndpoint());
			
			const response = await fetch(getMatterCreationEndpoint(), {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(requestBody)
			});

			console.log('API response status:', response.status);
			console.log('API response headers:', Object.fromEntries(response.headers.entries()));

			if (!response.ok) {
				const errorText = await response.text();
				console.error('API response error:', response.status, errorText);
				throw new Error(`API request failed: ${response.status} - ${errorText}`);
			}

			const result = await response.json();
			console.log('Matter creation API response:', result);
			return result;
		} catch (error) {
			console.error('Matter creation API error:', error);
			throw error;
		}
	}, [teamId, matterState.data.matterType]);

	// Create debounced service selection handler to prevent spam clicks
	const debouncedServiceSelect = useMemo(() => 
		debounce(async (service: string) => {
			// Prevent multiple simultaneous requests
			if (isProcessingRequest) {
				console.log('Request already in progress, ignoring click');
				return;
			}
			
			// Ensure teamId is set before making API call
			if (!teamId) {
				console.log('TeamId not set yet, waiting...');
				setTimeout(() => debouncedServiceSelect(service), 100);
				return;
			}
			
			setIsProcessingRequest(true);
			
			// Add user message
			const userMessage: ChatMessage = {
				content: service,
				isUser: true
			};
			setMessages(prev => [...prev, userMessage]);
			
			// Add placeholder message with loading indicator (ChatGPT style)
			const loadingMessageId = crypto.randomUUID();
			
			try {
				// Ensure matter state is properly initialized
				if (!matterState.isActive) {
					setMatterState({
						step: 'gathering-info',
						data: {},
						isActive: true
					});
				}
				const loadingMessage: ChatMessage = {
					content: `Great choice! Let me get the right questions for ${service}...`,
					isUser: false,
					isLoading: true,
					id: loadingMessageId
				};
				setMessages(prev => [...prev, loadingMessage]);
				
				// Call API for service selection
				const result = await handleMatterCreationAPI('service-selection', { service });
				
				setMatterState(prev => ({
					...prev,
					data: { ...prev.data, matterType: service },
					step: result.step === 'questions' ? 'ai-questions' : 'matter-details',
					currentQuestionIndex: result.currentQuestion ? result.currentQuestion - 1 : 0
				}));
				
				// Update the loading message with actual content
				setTimeout(() => {
					setMessages(prev => prev.map(msg => 
						msg.id === loadingMessageId 
							? {
								...msg,
								content: result.message,
								isLoading: false,
								matterCreation: result.step === 'urgency-selection' ? {
									type: 'urgency-selection',
									availableServices: []
								} : undefined
							}
							: msg
					));
				}, 300);
			} catch (error) {
				console.error('Service selection error:', error);
				// Update loading message with error content
				setTimeout(() => {
					setMessages(prev => prev.map(msg => 
						msg.id === loadingMessageId 
							? {
								...msg,
								content: "I apologize, but I encountered an error processing your service selection. Please try again.",
								isLoading: false
							}
							: msg
					));
				}, 300);
			} finally {
				setIsProcessingRequest(false);
			}
		}, 500), // 500ms debounce delay
		[teamId, isProcessingRequest, matterState.isActive, handleMatterCreationAPI] // Include dependencies
	);

	// Handle service selection from buttons (now debounced)
	const handleServiceSelect = (service: string) => {
		console.log('Service selection clicked:', service);
		console.log('Current teamId:', teamId);
		console.log('Current matterState:', matterState);
		debouncedServiceSelect(service);
	};

	// Create debounced urgency selection handler to prevent spam clicks
	const debouncedUrgencySelect = useMemo(() => 
		debounce(async (urgency: string) => {
			// Prevent multiple simultaneous requests
			if (isProcessingRequest) {
				console.log('Request already in progress, ignoring click');
				return;
			}
			
			// Ensure teamId is set before making API call
			if (!teamId) {
				console.log('TeamId not set yet, waiting...');
				setTimeout(() => debouncedUrgencySelect(urgency), 100);
				return;
			}
			
			setIsProcessingRequest(true);
			
			// Add user message
			const userMessage: ChatMessage = {
				content: urgency,
				isUser: true
			};
			setMessages(prev => [...prev, userMessage]);
			
			try {
				// Add placeholder message with loading indicator (ChatGPT style)
				const loadingMessageId = crypto.randomUUID();
				const loadingMessage: ChatMessage = {
					content: `Got it! Let me prepare the right questions for your ${urgency.toLowerCase()} matter...`,
					isUser: false,
					isLoading: true,
					id: loadingMessageId
				};
				setMessages(prev => [...prev, loadingMessage]);
				
				// Call API for urgency selection
				const result = await handleMatterCreationAPI('urgency-selection', {
					service: matterState.data.matterType,
					urgency: urgency
				});
				
				setMatterState(prev => ({
					...prev,
					data: { ...prev.data, urgency: urgency },
					step: result.step,
					currentQuestionIndex: result.currentQuestionIndex || 0
				}));
				
				// If we're moving to AI questions, we need to handle the first question
				if (result.step === 'ai-questions' && result.question) {
					// The AI response will include the question, so we don't need to add it separately
					// The user will see the question in the AI message and can respond in the chat input
				}
				
				// Update the loading message with actual content
				setTimeout(() => {
					setMessages(prev => prev.map(msg => 
						msg.id === loadingMessageId 
							? {
								...msg,
								content: result.message,
								isLoading: false
							}
							: msg
					));
				}, 300);
			} catch (error) {
				console.error('Urgency selection error:', error);
				// Update loading message with error content
				setTimeout(() => {
					setMessages(prev => prev.map(msg => 
						msg.id === loadingMessageId 
							? {
								...msg,
								content: "I apologize, but I encountered an error processing your urgency selection. Please try again.",
								isLoading: false
							}
							: msg
					));
				}, 300);
			} finally {
				setIsProcessingRequest(false);
			}
		}, 500), // 500ms debounce delay
		[teamId, isProcessingRequest, matterState.data.matterType, handleMatterCreationAPI] // Include dependencies
	);

	// Handle urgency selection from buttons (now debounced)
	const handleUrgencySelect = (urgency: string) => {
		console.log('Urgency selection clicked:', urgency);
		console.log('Current teamId:', teamId);
		console.log('Current matterState:', matterState);
		debouncedUrgencySelect(urgency);
	};

	// Handle matter creation flow steps
	const handleMatterCreationStep = async (message: string, attachments: FileAttachment[] = []) => {
		// Add user message
		const userMessage: ChatMessage = {
			content: message,
			isUser: true,
			files: attachments
		};
		setMessages(prev => [...prev, userMessage]);
		setInputValue('');
		setPreviewFiles([]);

		try {
			// Process based on current step
			switch (matterState.step) {
				case 'gathering-info':
					// Store matter type and start urgency selection
					const selectedService = message;
					
					setMatterState(prev => ({
						...prev,
						data: { ...prev.data, matterType: message },
						step: 'urgency-selection'
					}));
					
								// Call API for service selection
			const serviceResult = await handleMatterCreationAPI('service-selection', { service: selectedService });
			
								// Update matter state based on API response
					setMatterState(prev => ({
						...prev,
						data: { ...prev.data, matterType: selectedService },
						step: serviceResult.step === 'questions' ? 'ai-questions' : 'matter-details',
						currentQuestionIndex: serviceResult.currentQuestion ? serviceResult.currentQuestion - 1 : 0
					}));
					
					setTimeout(() => {
						const aiResponse: ChatMessage = {
							content: serviceResult.message,
							isUser: false,
							matterCreation: serviceResult.step === 'questions' ? {
								type: 'ai-questions',
								availableServices: [],
								question: serviceResult.questionText,
								totalQuestions: serviceResult.totalQuestions,
								currentQuestionIndex: serviceResult.currentQuestion,
								questionType: serviceResult.questionType,
								questionId: serviceResult.questionId,
								questionOptions: serviceResult.questionOptions
							} : serviceResult.step === 'urgency-selection' ? {
								type: 'urgency-selection',
								availableServices: []
							} : undefined,
							qualityScore: serviceResult.qualityScore
						};
						setMessages(prev => [...prev, aiResponse]);
					}, 800);
					break;

				case 'ai-questions':
					// Store answer to current AI question
					const currentService = matterState.data.matterType;
					const currentIndex = matterState.currentQuestionIndex || 0;
					
					// Get the current question ID from the last AI message
					const lastAIMessage = messages.findLast(msg => !msg.isUser && msg.matterCreation?.type === 'ai-questions');
					const questionId = lastAIMessage?.matterCreation?.questionId || `q${currentIndex + 1}`;
					
					// Store the answer with the question ID for conditional logic
					const updatedAnswers = {
						...matterState.data.aiAnswers,
						[questionId]: {
							question: matterState.data.currentQuestion || `Question ${currentIndex + 1}`,
							answer: message
						}
					};
					
					// Add placeholder message with loading indicator (ChatGPT style)
					const loadingMessageId = crypto.randomUUID();
					const loadingMessage: ChatMessage = {
						content: "Let me get your next question...",
						isUser: false,
						isLoading: true,
						id: loadingMessageId
					};
					setMessages(prev => [...prev, loadingMessage]);
					
					// Call API for questions step (next question)
					const aiResult = await handleMatterCreationAPI('questions', {
						service: currentService,
						currentQuestionIndex: currentIndex + 1,
						answers: updatedAnswers,
						urgency: matterState.data.urgency
					});
					
					if (aiResult.step === 'questions') {
						// More questions to ask
						setMatterState(prev => ({
							...prev,
							data: { 
								...prev.data, 
								aiAnswers: updatedAnswers,
								currentQuestion: aiResult.questionText || aiResult.message
							},
							currentQuestionIndex: aiResult.currentQuestion ? aiResult.currentQuestion - 1 : prev.currentQuestionIndex + 1
						}));
						
						setTimeout(() => {
							// Update the loading message with actual content
							setMessages(prev => prev.map(msg => 
								msg.id === loadingMessageId 
									? {
										...msg,
										content: aiResult.message,
										isLoading: false,
										matterCreation: {
											type: 'ai-questions',
											availableServices: [],
											question: aiResult.questionText,
											totalQuestions: aiResult.totalQuestions,
											currentQuestionIndex: aiResult.currentQuestion,
											questionType: aiResult.questionType,
											questionId: aiResult.questionId,
											questionOptions: aiResult.questionOptions
										}
									}
									: msg
							));
						}, 800);
					} else {
						// All questions answered, move to matter review
						setMatterState(prev => ({
							...prev,
							data: { ...prev.data, aiAnswers: updatedAnswers },
							step: 'matter-review'
						}));
						
						setTimeout(() => {
							// Update the loading message with actual content
							setMessages(prev => prev.map(msg => 
								msg.id === loadingMessageId 
									? {
										...msg,
										content: aiResult.message,
										isLoading: false
									}
									: msg
							));
							
							// Automatically trigger matter review
							setTimeout(async () => {
								try {
									// Add placeholder message with loading indicator (ChatGPT style)
									const loadingMessageId = crypto.randomUUID();
									const loadingMessage: ChatMessage = {
										content: "Let me review your matter and create a summary...",
										isUser: false,
										isLoading: true,
										id: loadingMessageId
									};
									setMessages(prev => [...prev, loadingMessage]);
									
									const reviewResult = await handleMatterCreationAPI('matter-review', {
										service: matterState.data.matterType,
										answers: updatedAnswers,
										description: aiResult.autoGeneratedDescription
									});
									
									// Update matter state with review data
									setMatterState(prev => ({
										...prev,
										data: { 
											...prev.data, 
											matterSummary: reviewResult.matterCanvas?.matterSummary,
											followUpQuestions: reviewResult.followUpQuestions || [],
											currentFollowUpIndex: 0
										},
										step: reviewResult.needsImprovement ? 'matter-review' : 'ready-for-lawyer'
									}));
									
									// Update the loading message with actual content
									setMessages(prev => prev.map(msg => 
										msg.id === loadingMessageId 
											? {
												...msg,
												content: reviewResult.message,
												isLoading: false,
												matterCanvas: reviewResult.matterCanvas
											}
											: msg
									));
									
									// Add follow-up message if there is one
									if (reviewResult.followUpMessage) {
										setTimeout(() => {
											const followUpResponse: ChatMessage = {
												content: reviewResult.followUpMessage,
												isUser: false
											};
											setMessages(prev => [...prev, followUpResponse]);
										}, 1000);
									}
									
									// If matter is ready and no improvement needed, auto-start contact form
									if (reviewResult.readyForNextStep) {
										setTimeout(() => {
											// Directly start the contact form without asking
											setFormState({
												step: 'collecting_email',
												data: { 
													matterType: matterState.data.matterType, 
													matterDescription: reviewResult.matterSummary || 'Matter details provided through Q&A',
													matterDetails: matterState.data.aiAnswers,
													urgency: reviewResult.qualityScore?.inferredUrgency || 'Not Urgent'
												},
												isActive: true
											});
											
											setMatterState(prev => ({
												...prev,
												isActive: false
											}));
											
											// Add initial form prompt
											const formStartMessage: ChatMessage = {
												content: "Perfect! To connect you with the right attorney, I'll need some contact information. What's your email address?",
												isUser: false
											};
											setMessages(prev => [...prev, formStartMessage]);
										}, 2000);
									}
								} catch (error) {
									console.error('Matter review error:', error);
									// Fallback to ready-for-lawyer
									setMatterState(prev => ({
										...prev,
										step: 'ready-for-lawyer'
									}));
								}
							}, 1000);
						}, 800);
					}
					break;

				        case 'matter-review':
					// Handle follow-up questions to improve matter quality
					const followUpQuestions = matterState.data.followUpQuestions || [];
					const currentFollowUpIndex = matterState.data.currentFollowUpIndex || 0;
					
					// Store the follow-up answer with question text
					const followUpAnswers = {
						...matterState.data.aiAnswers,
						[`followup_${currentFollowUpIndex + 1}`]: {
							question: followUpQuestions[currentFollowUpIndex] || `Follow-up question ${currentFollowUpIndex + 1}`,
							answer: message
						}
					};
					
					// Update matter state with new answer
					setMatterState(prev => ({
						...prev,
						data: { 
							...prev.data, 
							aiAnswers: followUpAnswers,
							currentFollowUpIndex: currentFollowUpIndex + 1
						}
					}));
					
					// Check if we have more follow-up questions
					if (currentFollowUpIndex + 1 < followUpQuestions.length) {
						// Ask next follow-up question
						setTimeout(() => {
							const nextQuestion = followUpQuestions[currentFollowUpIndex + 1];
							const aiResponse: ChatMessage = {
								content: `${nextQuestion}`,
								isUser: false
							};
							setMessages(prev => [...prev, aiResponse]);
						}, 800);
					} else {
						// All follow-up questions answered, re-assess matter
						setTimeout(async () => {
							try {
								// Add placeholder message with loading indicator (ChatGPT style)
								const loadingMessageId = crypto.randomUUID();
								const loadingMessage: ChatMessage = {
									content: "Thank you so much for providing those additional details. Let me update your matter summary...",
									isUser: false,
									isLoading: true,
									id: loadingMessageId
								};
								setMessages(prev => [...prev, loadingMessage]);
								
								const finalReviewResult = await handleMatterCreationAPI('matter-review', {
									service: matterState.data.matterType,
									answers: followUpAnswers,
									description: matterState.data.matterSummary
								});
								
								// Update matter state and quality score
								setMatterState(prev => ({
									...prev,
									data: { 
										...prev.data, 
										matterSummary: finalReviewResult.matterCanvas?.matterSummary,
										aiAnswers: followUpAnswers
									},
									step: 'ready-for-lawyer'
								}));
								
								// Update the loading message with actual content
								setMessages(prev => prev.map(msg => 
									msg.id === loadingMessageId 
										? {
											...msg,
											content: "Thank you so much for providing those additional details. Here's your updated matter summary:",
											isLoading: false,
											matterCanvas: finalReviewResult.matterCanvas
										}
										: msg
								));
								
								// Add completion message
								setTimeout(() => {
									const completionMessage: ChatMessage = {
										content: `Your matter quality score is now ${finalReviewResult.qualityScore?.score || 0}/100 - excellent! You've given us everything we need to connect you with the right attorney who can help with your situation.`,
										isUser: false
									};
									setMessages(prev => [...prev, completionMessage]);
								}, 1000);
								
								// Auto-start contact form
								setTimeout(() => {
									// Directly start the contact form without asking
									setFormState({
										step: 'collecting_email',
										data: { 
											matterType: matterState.data.matterType, 
											matterDescription: finalReviewResult.matterSummary || 'Comprehensive matter details provided',
											matterDetails: followUpAnswers,
											urgency: finalReviewResult.qualityScore?.inferredUrgency || 'Not Urgent'
										},
										isActive: true
									});
									
									setMatterState(prev => ({
										...prev,
										isActive: false
									}));
									
									// Add initial form prompt
									const formStartMessage: ChatMessage = {
										content: "Perfect! To connect you with the right attorney, I'll need some contact information. What's your email address?",
										isUser: false
									};
									setMessages(prev => [...prev, formStartMessage]);
								}, 2000);
								
							} catch (error) {
								console.error('Final matter review error:', error);
								setMatterState(prev => ({
									...prev,
									step: 'ready-for-lawyer'
								}));
							}
						}, 800);
					}
					break;

				        case 'ready-for-lawyer':
					// Handle additional information after matter completion
					// Add any additional information to the matter
					setMatterState(prev => ({
						...prev,
						data: { ...prev.data, additionalInfo: message }
					}));
					
					// Re-assess matter with additional information to get updated urgency
					const finalResult = await handleMatterCreationAPI('matter-details', {
						service: matterState.data.matterType,
						description: matterState.data.description || `${matterState.data.matterType} matter with provided details and additional information: ${message}`,
						answers: matterState.data.aiAnswers
					});
					

					
					setTimeout(() => {
						const urgencyText = finalResult.qualityScore?.inferredUrgency 
							? ` I've assessed this as ${finalResult.qualityScore.inferredUrgency.toLowerCase()}.`
							: '';
						
						const aiResponse: ChatMessage = {
							content: `Thank you for the additional information.${urgencyText} This will be included with your matter details when we connect you with an attorney.`,
							isUser: false
						};
						setMessages(prev => [...prev, aiResponse]);
						
						// Auto-start contact form
						setTimeout(() => {
							const contactResponse: ChatMessage = {
								content: "Let me gather your contact information so we can connect you with the right attorney.",
								isUser: false
							};
							setMessages(prev => [...prev, contactResponse]);
							
							setFormState({
								step: 'contact',
								data: { 
									matterType: matterState.data.matterType, 
									matterDescription: finalResult.autoGeneratedDescription || `${matterState.data.matterType} matter with additional details: ${message}`,
									matterDetails: matterState.data.aiAnswers,
									urgency: finalResult.qualityScore?.inferredUrgency || 'Not Urgent',
									additionalInfo: message
								},
								isActive: true
							});
							
							// Deactivate matter creation since we're now in form collection mode
							setMatterState(prev => ({
								...prev,
								isActive: false
							}));
						}, 2000);
					}, 800);
					break;
			}
		} catch (error) {
			console.error('Matter creation step error:', error);
			// Fallback to error message
			setTimeout(() => {
				const errorResponse: ChatMessage = {
					content: "I apologize, but I encountered an error processing your request. Please try again or contact support if the issue persists.",
					isUser: false
				};
				setMessages(prev => [...prev, errorResponse]);
			}, 800);
		}
	};

	const handleKeyPress = (e: KeyboardEvent) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSubmit();
		}
	};

	// Enhanced keyboard navigation
	const handleKeyDown = (e: KeyboardEvent) => {
		// Escape key to clear input or close modals
		if (e.key === 'Escape') {
			if (inputValue.trim() || previewFiles.length > 0) {
				setInputValue('');
				setPreviewFiles([]);
			}
		}
		
		// Ctrl/Cmd + Enter to send message (alternative to Enter)
		if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
			e.preventDefault();
			handleSubmit();
		}
		
		// Ctrl/Cmd + K to focus input (common chat shortcut)
		if (e.key === 'k' && (e.ctrlKey || e.metaKey)) {
			e.preventDefault();
			const textarea = document.querySelector('.message-input') as HTMLTextAreaElement;
			if (textarea) {
				textarea.focus();
			}
		}
	};

	// Add a helper function to get the appropriate file icon based on file type
	const getFileIcon = (file: FileAttachment) => {
		// Get file extension
		const ext = file.name.split('.').pop()?.toLowerCase();
		
		// PDF icon
		if (file.type === 'application/pdf' || ext === 'pdf') {
			return (
				<DocumentTextIcon className="w-6 h-6" />
			);
		}
		
		// Word document icon
		if (file.type === 'application/msword' ||
			file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
			ext === 'doc' || ext === 'docx') {
			return (
				<DocumentIcon className="w-6 h-6" />
			);
		}
		
		// Excel spreadsheet icon
		if (file.type === 'application/vnd.ms-excel' ||
			file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
			ext === 'xls' || ext === 'xlsx' || ext === 'csv') {
			return (
				<TableCellsIcon className="w-6 h-6" />
			);
		}
		
		// Audio file icon
		if (file.type.startsWith('audio/')) {
			return (
				<MusicalNoteIcon className="w-6 h-6" />
			);
		}
		
		// Video file icon
		if (file.type.startsWith('video/')) {
			return (
				<VideoCameraIcon className="w-6 h-6" />
			);
		}
		
		// Default file icon
		return (
			<DocumentIcon className="w-6 h-6" />
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

	// Register global drag handlers and keyboard shortcuts on the document body
	useEffect(() => {
		if (typeof document !== 'undefined') {
			document.body.addEventListener('dragenter', handleDragEnter);
			document.body.addEventListener('dragleave', handleDragLeave);
			document.body.addEventListener('dragover', handleDragOver);
			document.body.addEventListener('drop', handleDrop);
			document.addEventListener('keydown', handleKeyDown);

			return () => {
				document.body.removeEventListener('dragenter', handleDragEnter);
				document.body.removeEventListener('dragleave', handleDragLeave);
				document.body.removeEventListener('dragover', handleDragOver);
				document.body.removeEventListener('drop', handleDrop);
				document.removeEventListener('keydown', handleKeyDown);
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
						<CloudArrowUpIcon className="drag-message-icon w-12 h-12" aria-hidden="true" />
						<h3 className="drag-message-title">Drop Files to Upload</h3>
						<p className="drag-message-subtitle">We accept images, videos, and document files</p>
					</div>
				</div>
			)}
		
			{teamNotFound ? (
				<TeamNotFound teamId={teamId} onRetry={handleRetryTeamConfig} />
			) : (
				<>
					{/* Left Column */}
					{features.enableLeftSidebar && (
						<div className="grid-left">
							<LeftSidebar 
								currentRoute={routerState.currentRoute}
								onTabChange={handleTabChange}
								onOpenMenu={() => setIsMobileSidebarOpen(true)}
							/>
						</div>
					)}

					{/* Center Column - Main Content */}
					<div className={features.enableLeftSidebar ? "grid-center" : "grid-center-full"}>
						<div 
							className="chat-container" 
							role="application" 
							aria-label="Main interface"
							aria-expanded={true}
						>
							<ErrorBoundary>
								{routerState.currentRoute === 'chats' ? (
									<>
										<main className="chat-main">
										<VirtualMessageList
											messages={messages}
											onDateSelect={handleDateSelect}
											onTimeOfDaySelect={handleTimeOfDaySelect}
											onTimeSlotSelect={handleTimeSlotSelect}
											onRequestMoreDates={handleRequestMoreDates}
											onServiceSelect={handleServiceSelect}
											onUrgencySelect={handleUrgencySelect}
											onCreateMatter={handleCreateMatterStart}
											onScheduleConsultation={handleScheduleStart}
											onLearnServices={async () => {
												const servicesMessage: ChatMessage = {
													content: "Tell me about your firm's services",
													isUser: true
												};
												setMessages(prev => [...prev, servicesMessage]);
												
												// Add placeholder message with loading indicator (ChatGPT style)
												const loadingMessageId = crypto.randomUUID();
												const loadingMessage: ChatMessage = {
													content: "Let me tell you about our services...",
													isUser: false,
													isLoading: true,
													id: loadingMessageId
												};
												setMessages(prev => [...prev, loadingMessage]);
												
												try {
													// Call the actual API
													const response = await sendMessageToAPI("Tell me about your firm's services");
													
													// Update the loading message with actual content
													setMessages(prev => prev.map(msg => 
														msg.id === loadingMessageId 
															? {
																...msg,
																content: response,
																isLoading: false
															}
															: msg
													));
												} catch (error) {
													// Fallback to default response if API fails
													setMessages(prev => prev.map(msg => 
														msg.id === loadingMessageId 
															? {
																...msg,
																content: "Our firm specializes in several practice areas including business law, intellectual property, contract review, and regulatory compliance. We offer personalized legal counsel to help businesses navigate complex legal challenges. Would you like more details about any specific service?",
																isLoading: false
															}
															: msg
													));
												}
											}}
											teamConfig={{
												name: teamConfig.name,
												profileImage: teamConfig.profileImage,
												teamId: teamId
											}}
											onOpenSidebar={() => setIsMobileSidebarOpen(true)}
											sessionId={sessionId}
											teamId={teamId}
											onFeedbackSubmit={handleFeedbackSubmit}
										/>
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
																	<XMarkIcon className="w-4 h-4" aria-hidden="true" />
																</button>
															</div>
														))}
													</div>
												)}
												<div className="textarea-wrapper">
													<textarea
														className="message-input"
														placeholder="Type a message..."
														rows={1}
														value={inputValue}
														onInput={handleInputChange}
														onKeyPress={handleKeyPress}
														disabled={false}
														aria-label="Message input"
														aria-multiline="true"
														style={{ 
															minHeight: '24px',
															width: '100%'
														}}
													/>
												</div>
												<span id="input-instructions" className="sr-only">
													Type your message and press Enter to send. Use the buttons below to attach files or record audio.
												</span>
												<div className="input-controls-row">
													<div className="input-controls">
														{!isRecording && (
															<div className="input-left-controls">
																<LazyFileMenu
																	onPhotoSelect={handlePhotoSelect}
																	onCameraCapture={handleCameraCapture}
																	onFileSelect={handleFileSelect}
																/>
																
																{features.enableConsultationButton && (
																	<LazyScheduleButton
																		onClick={handleScheduleStart}
																		disabled={false}
																	/>
																)}
															</div>
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
																disabled={(!inputValue.trim() && previewFiles.length === 0)}
																aria-label={(!inputValue.trim() && previewFiles.length === 0) ? "Send message (disabled)" : "Send message"}
															>
																<ArrowUpIcon className="send-icon w-5 h-5" aria-hidden="true" />
															</button>
														</div>
													</div>
												</div>
											</div>
										</div>
										{features.enableDisclaimerText && (
											<div className="input-disclaimer">
												Blawby can make mistakes. Check for important information.
											</div>
										)}
										</main>
									</>
								) : routerState.currentRoute === 'matters' ? (
									<>
										{selectedMatter ? (
											<MatterDetail
												matter={selectedMatter}
												onBack={handleBackToMatters}
												onEdit={handleEditMatter}
											/>
										) : (
											<MattersList
												matters={matters}
												onMatterSelect={handleMatterSelect}
												onCreateMatter={handleCreateMatterFromList}
												isLoading={isLoadingMatters}
											/>
										)}
									</>
								) : null}
							</ErrorBoundary>
						</div>
					</div>

					{/* Right Column */}
					<div className="grid-right">
						<div className="team-sidebar">
							<TeamProfile
								name={teamConfig.name}
								profileImage={teamConfig.profileImage}
								teamId={teamId}
								variant="sidebar"
								showVerified={true}
							/>

							{/* Actions Row */}
							<div className="team-actions">
								<button 
									className="action-button view-matter-button"
									onClick={handleViewMatter}
									title={sidebarMatter ? "View matter details" : "Create a new matter"}
								>
									<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
									</svg>
									{sidebarMatter ? 'View Matter' : 'Create Matter'}
								</button>
							</div>

							{/* Matter Canvas in Sidebar */}
							{sidebarMatter && (
								<div className="team-section">
									<h4 className="section-title">
										{sidebarMatter.matterNumber ? `Matter ${sidebarMatter.matterNumber}` : 'Case Summary'}
									</h4>
									<div className="section-content">
										<MatterCanvas
											matterId={sidebarMatter.matterId}
											matterNumber={sidebarMatter.matterNumber}
											service={sidebarMatter.service}
											matterSummary={sidebarMatter.matterSummary}
											qualityScore={sidebarMatter.qualityScore}
											answers={sidebarMatter.answers}
										/>
									</div>
								</div>
							)}

							{/* Media Section */}
							<div className="team-section">
								<MediaSidebar messages={messages} />
							</div>

							{/* Privacy & Support Section */}
							<PrivacySupportSidebar />
						</div>
					</div>

					{/* Mobile Top Navigation */}
					<MobileTopNav
						teamConfig={{
							name: teamConfig.name,
							profileImage: teamConfig.profileImage,
							teamId: teamId
						}}
						onOpenSidebar={() => setIsMobileSidebarOpen(true)}
					/>

					{/* Mobile Bottom Navigation */}
					<BottomNavigation 
						activeTab={routerState.currentRoute}
						onTabChange={handleTabChange}
					/>

					{/* Mobile Sidebar */}
					<MobileSidebar
						isOpen={isMobileSidebarOpen}
						onClose={() => setIsMobileSidebarOpen(false)}
						teamConfig={{
							name: teamConfig.name,
							profileImage: teamConfig.profileImage,
							teamId: teamId
						}}
						sidebarMatter={sidebarMatter}
						messages={messages}
						onViewMatter={handleViewMatter}
					/>
				</>
			)}
		</>
	);
}

if (typeof window !== 'undefined') {
	// Initialize theme from localStorage
	const savedTheme = localStorage.getItem('theme');
	if (savedTheme === 'dark') {
		document.documentElement.classList.add('dark');
	}
	
	hydrate(<App />, document.getElementById('app'));
}

export async function prerender(data) {
	return await ssr(<App {...data} />);
}
