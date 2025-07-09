import { FunctionalComponent, h } from 'preact';

interface LayoutProps {
  nav?: preact.ComponentChildren; // Left navigation/case list
  children: preact.ComponentChildren; // Main chat content
  sidebar: preact.ComponentChildren; // Sidebar content
}

const Layout: FunctionalComponent<LayoutProps> = ({ nav, children, sidebar }) => {
  return (
    <div class="app-layout">
      <nav class="nav-column">
        {nav}
      </nav>
      <main class="chat-column">
        {children}
      </main>
      <aside class="sidebar-column">
        {sidebar}
      </aside>
    </div>
  );
};

export default Layout; 