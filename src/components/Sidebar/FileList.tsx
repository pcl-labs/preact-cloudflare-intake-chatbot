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
  <div class="sidebar-file-row">
    {files.length === 0 ? <span>No files uploaded.</span> : files.map(file => (
      <div class="sidebar-file-thumb" key={file.id} title={file.name}>
        <span class="sidebar-file-icon">📄</span>
        <span class="sidebar-file-name">{file.name}</span>
      </div>
    ))}
  </div>
);

export default FileList; 