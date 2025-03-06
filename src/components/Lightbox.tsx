import { FunctionComponent } from 'preact';
import { createPortal } from 'preact/compat';
import { useEffect, useState } from 'preact/hooks';

interface LightboxProps {
    src: string;
    alt: string;
    onClose: () => void;
}

const Lightbox: FunctionComponent<LightboxProps> = ({ src, alt, onClose }) => {
    const [isClosing, setIsClosing] = useState(false);
    const [isBrowser, setIsBrowser] = useState(false);

    useEffect(() => {
        setIsBrowser(true);
    }, []);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            onClose();
        }, 300);
    };

    useEffect(() => {
        if (!isBrowser) return;

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                handleClose();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isBrowser]);

    if (!isBrowser) return null;

    const content = (
        <div class={`lightbox-overlay ${isClosing ? 'closing' : ''}`} onClick={handleClose}>
            <img src={src} alt={alt} class="lightbox-image" onClick={(e) => e.stopPropagation()} />
            <button class="lightbox-close" onClick={handleClose}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
            </button>
        </div>
    );

    return createPortal(content, document.body);
};

export default Lightbox; 