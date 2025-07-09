import { FunctionalComponent, h } from 'preact';

interface LayoutProps {
  nav?: preact.ComponentChildren; // Left navigation/case list
  children: preact.ComponentChildren; // Main chat content
  sidebar: preact.ComponentChildren; // Sidebar content
}

const Layout: FunctionalComponent<LayoutProps> = ({ nav, children, sidebar }) => {
  return (
    <div class="app-layout">
      {/* Left Navigation Column - Hidden on mobile */}
      <nav class="nav-column">
        {nav}
      </nav>
      
      {/* Main Content Area */}
      <div class="main-content-area">
        {/* Main Chat Column */}
        <main class="chat-column">
          {children}
        </main>
      </div>
      
      {/* Right Sidebar - Responsive */}
      <aside class="sidebar-column">
        {sidebar}
      </aside>
    </div>
  );
};

export default Layout; 