import { FunctionalComponent, h } from 'preact';

interface FileThumb {
  id: string;
  name: string;
  url: string;
  type: string;
}

interface FileListProps {
  files: FileThumb[];
}

const FileList: FunctionalComponent<FileListProps> = ({ files }) => (
  <div class="sidebar-file-list">
    {files.length === 0 ? (
      <div class="sidebar-empty-state">No files uploaded.</div>
    ) : (
      files.map(file => (
        <div 
          class="sidebar-file-item" 
          key={file.id} 
          title={file.name}
        >
          <span class="sidebar-file-icon">📄</span>
          <span class="sidebar-file-name">{file.name}</span>
        </div>
      ))
    )}
  </div>
);

export default FileList; 