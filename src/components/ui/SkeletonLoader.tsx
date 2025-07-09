import { FunctionComponent } from 'preact';

interface SkeletonLoaderProps {
    height?: string;
    width?: string;
    borderRadius?: string;
    className?: string;
}

const SkeletonLoader: FunctionComponent<SkeletonLoaderProps> = ({
    height = '40px',
    width = '100%',
    borderRadius = '8px',
    className = ''
}) => {
    return (
        <div
            className={`skeleton-loader ${className}`}
            style={{
                height,
                width,
                borderRadius,
            }}
            aria-hidden="true"
        />
    );
};

export default SkeletonLoader; 