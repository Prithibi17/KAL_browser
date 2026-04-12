const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Window & App Management
  createWindow: () => ipcRenderer.send('window-create'),
  windowMinimize: () => ipcRenderer.send('window-minimize'),
  windowMaximize: () => ipcRenderer.send('window-maximize'),
  windowClose: () => ipcRenderer.send('window-close'),

  // Tab Management
  createTab: (id, url) => ipcRenderer.send('tab-create', { id, url }),
  switchTab: (id) => ipcRenderer.send('tab-switch', id),
  closeTab: (id) => ipcRenderer.send('tab-close', id),
  
  // Navigation
  navBack: () => ipcRenderer.send('nav-back'),
  navForward: () => ipcRenderer.send('nav-forward'),
  navReload: () => ipcRenderer.send('nav-reload'),
  navToUrl: (url) => ipcRenderer.send('nav-to-url', url),
  takeSnapshot: () => ipcRenderer.send('take-snapshot'),
  loadExtension: (path) => ipcRenderer.invoke('load-extension', path),
  
  // Menu Control
  showMenu: (pos) => ipcRenderer.send('show-menu', pos),
  hideMenu: () => ipcRenderer.send('hide-menu'),
  
  // Core Page Shortcuts
  openHistory: () => ipcRenderer.send('open-history'),
  openDownloads: () => ipcRenderer.send('open-downloads'),
  openSettings: () => ipcRenderer.send('open-settings'),
  getHistory: () => ipcRenderer.invoke('get-history'),
  deleteHistoryEntry: (timestamp) => ipcRenderer.send('delete-history-entry', timestamp),
  getDownloads: () => ipcRenderer.invoke('get-downloads'),
  printPage: () => ipcRenderer.send('print-page'),
  setZoom: (factor) => ipcRenderer.send('set-zoom', factor),

  // Site Info / Permissions
  showSiteInfo: (pos) => ipcRenderer.send('show-site-info', pos),
  hideSiteInfo: () => ipcRenderer.send('hide-site-info'),
  onPermissionRequest: (callback) => ipcRenderer.on('permission-request', (event, data) => callback(data)),
  onPermissionPending: (callback) => ipcRenderer.on('permission-pending', (event, data) => callback(data)),
  sendPermissionResponse: (data) => ipcRenderer.send('permission-response', data),
  
  // PERMISSION HUB: State Management
  getSitePermissions: (url) => ipcRenderer.invoke('get-site-permissions', url),
  updatePermission: (url, permission, allowed) => ipcRenderer.send('update-site-permission', { url, permission, allowed }),
  onSiteInfoOpen: (callback) => ipcRenderer.on('site-info-open', (event, data) => callback(data)),

  // Coordinate Syncing
  getLockRect: () => {
    const lockBtn = document.getElementById('lock-btn');
    if (!lockBtn) return null;
    const rect = lockBtn.getBoundingClientRect();
    return { x: rect.left, y: rect.bottom };
  },
  
  // Events
  onUrlChanged: (callback) => ipcRenderer.on('tab-url-changed', (event, data) => callback(data)),
  onTitleUpdated: (callback) => ipcRenderer.on('tab-title-updated', (event, data) => callback(data)),
  onFaviconUpdated: (callback) => ipcRenderer.on('tab-favicon-updated', (event, data) => callback(data)),
  onOpenLinkInNewTab: (callback) => ipcRenderer.on('open-link-in-new-tab', (event, data) => callback(data)),
  
  // Sidebar dynamic control
  resizeSidebar: (width) => ipcRenderer.send('sidebar-resize', width)
});

// SMART GLOBAL DISMISSAL
// Only dismiss popups if clicking in the main window content
if (window.location.protocol !== 'file:') {
  window.addEventListener('mousedown', () => {
    ipcRenderer.send('hide-menu');
    ipcRenderer.send('hide-site-info');
  });
}
