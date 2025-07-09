type FileThumb = {
  id: string;
  name: string;
  url: string;
  type: string;
};

type FileListProps = {
  files: FileThumb[];
  onFileClick?: (file: FileThumb) => void;
  gridClass?: string;
};

export default function FileList({ files, onFileClick, gridClass }: FileListProps) {
  const isImage = (type: string) => type.startsWith('image/');
  const isVideo = (type: string) => type.startsWith('video/');
  const displayFiles = files.slice(0, 9); // Only show up to 9 files

  return (
    <div class={`grid grid-cols-3 gap-2 mt-2`}>
      {displayFiles.length === 0 ? (
        <div class="col-span-3 text-center text-sm text-zinc-400 py-6">
          No files uploaded.
        </div>
      ) : (
        displayFiles.map(file => (
          <div key={file.id} class="w-full aspect-square overflow-hidden bg-zinc-800 rounded-lg flex items-center justify-center">
            {isImage(file.type) ? (
              <img 
                src={file.url} 
                alt={file.name} 
                class="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => onFileClick && onFileClick(file)}
              />
            ) : (
              <div 
                class="w-full h-full flex items-center justify-center cursor-pointer"
                onClick={() => onFileClick && onFileClick(file)}
              >
                <span class="text-lg text-zinc-400 select-none">
                  {isVideo(file.type) ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-7 h-7">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M4 6h8a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2z" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-7 h-7">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h10M7 11h10M7 15h6" />
                    </svg>
                  )}
                </span>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
} 