const { app, BrowserWindow, BrowserView, ipcMain, session, shell, Menu, MenuItem, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let windows = new Set();
const views = new Map(); // id -> BrowserView
let lastActiveTabId = null;

// --- Smart Permission Management & Persistent Sync ---
const PERMISSIONS_FILE = path.join(app.getPath('userData'), 'permissions.json');
let sessionPermissions = new Map(); // url -> { permission -> boolean }
const pendingPermissions = new Map(); // requestId -> callback
const activeRequestsByUrl = new Map(); // url -> { permission -> [callbacks] }

const PERMISSION_MAP = {
  'media': ['audioCapture', 'videoCapture', 'media'],
  'audio': ['audioCapture', 'media'],
  'video': ['videoCapture', 'media'],
  'camera': ['videoCapture', 'media'],
  'microphone': ['audioCapture', 'media'],
  'geolocation': ['geolocation'],
  'notifications': ['notifications'],
  'clipboard-read': ['clipboard-read']
};

const REVERSE_PERM_MAP = {
  'audioCapture': 'media',
  'videoCapture': 'media'
};

function loadPermissions() {
  try {
    if (fs.existsSync(PERMISSIONS_FILE)) {
      const data = JSON.parse(fs.readFileSync(PERMISSIONS_FILE, 'utf8'));
      sessionPermissions = new Map(Object.entries(data));
    }
  } catch (err) {}
}

function savePermissions() {
  try {
    const data = Object.fromEntries(sessionPermissions);
    fs.writeFileSync(PERMISSIONS_FILE, JSON.stringify(data, null, 2));
  } catch (err) {}
}

const TOP_BAR_HEIGHT = 48;

// --- History, Downloads & Settings Management ---
const HISTORY_FILE = path.join(app.getPath('userData'), 'history.json');
const DOWNLOADS_FILE = path.join(app.getPath('userData'), 'downloads.json');
let historyData = [];
let downloadsData = [];

function loadPersistence() {
  try { if (fs.existsSync(HISTORY_FILE)) historyData = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8')); } catch (e) {}
  try { if (fs.existsSync(DOWNLOADS_FILE)) downloadsData = JSON.parse(fs.readFileSync(DOWNLOADS_FILE, 'utf8')); } catch (e) {}
}

function saveHistoryLog(title, url) {
  if (!url || url.startsWith('about:') || url.startsWith('chrome:')) return;
  const entry = { title: title || url, url, timestamp: Date.now() };
  historyData.unshift(entry);
  if (historyData.length > 5000) historyData.pop(); // Cap history
  try { fs.writeFileSync(HISTORY_FILE, JSON.stringify(historyData, null, 2)); } catch (e) {}
}

function saveDownloadEntry(item) {
  const entry = {
    fileName: item.getFilename(),
    url: item.getURL(),
    path: item.getSavePath(),
    timestamp: Date.now(),
    totalBytes: item.getTotalBytes()
  };
  downloadsData.unshift(entry);
  try { fs.writeFileSync(DOWNLOADS_FILE, JSON.stringify(downloadsData, null, 2)); } catch (e) {}
}

function createView(id, url = 'https://www.google.com', window) {
  const view = new BrowserView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    }
  });

  views.set(id, view);
  view.webContents.loadURL(url);

  view.webContents.on('did-navigate', (event, navigatedUrl) => {
    if (window && !window.isDestroyed()) window.webContents.send('tab-url-changed', { id, url: navigatedUrl });
    saveHistoryLog(view.webContents.getTitle(), navigatedUrl);
  });

  view.webContents.on('page-title-updated', (event, title) => {
    if (window && !window.isDestroyed()) window.webContents.send('tab-title-updated', { id, title });
    // Update last history entry if it matches the current URL
    if (historyData.length > 0 && historyData[0].url === view.webContents.getURL()) {
      historyData[0].title = title;
      try { fs.writeFileSync(HISTORY_FILE, JSON.stringify(historyData, null, 2)); } catch (e) {}
    }
  });

  view.webContents.on('did-stop-loading', () => {
    if (view.webContents.isDestroyed()) return;
    const title = view.webContents.getTitle();
    if (window && !window.isDestroyed()) window.webContents.send('tab-title-updated', { id, title });
  });

  view.webContents.on('context-menu', (event, params) => {
    const menu = new Menu();

    // Link actions
    if (params.linkURL) {
      menu.append(new MenuItem({
        label: 'Open link in new tab',
        click: () => {
          if (window && !window.isDestroyed()) {
            window.webContents.send('open-link-in-new-tab', { url: params.linkURL });
          }
        }
      }));
      menu.append(new MenuItem({ type: 'separator' }));
    }

    // Navigation
    menu.append(new MenuItem({
      label: 'Back',
      click: () => { if (view.webContents.canGoBack()) view.webContents.goBack(); }
    }));
    menu.append(new MenuItem({
      label: 'Forward',
      click: () => { if (view.webContents.canGoForward()) view.webContents.goForward(); }
    }));
    menu.append(new MenuItem({
      label: 'Reload',
      click: () => view.webContents.reload()
    }));
    menu.append(new MenuItem({ type: 'separator' }));

    // Clipboard
    menu.append(new MenuItem({ label: 'Copy', role: 'copy', enabled: params.editFlags.canCopy }));
    menu.append(new MenuItem({ label: 'Paste', role: 'paste', enabled: params.editFlags.canPaste }));
    menu.append(new MenuItem({ type: 'separator' }));

    // Developer Tools
    menu.append(new MenuItem({
      label: 'Inspect Element',
      click: () => view.webContents.inspectElement(params.x, params.y)
    }));
    menu.append(new MenuItem({ type: 'separator' }));

    // Advanced Tools
    if (params.mediaType === 'video') {
      menu.append(new MenuItem({
        label: 'Picture-in-Picture',
        click: () => {
          view.webContents.executeJavaScript('document.querySelector("video").requestPictureInPicture()');
        }
      }));
    }
    
    menu.append(new MenuItem({
      label: 'Take Screenshot',
      click: () => {
        if (window && !window.isDestroyed()) {
          ipcMain.emit('take-snapshot', { sender: view.webContents });
        }
      }
    }));

    menu.popup();
  });

  view.webContents.on('page-favicon-updated', (event, favicons) => {
    if (favicons && favicons.length > 0 && window && !window.isDestroyed()) {
      window.webContents.send('tab-favicon-updated', { id, faviconUrl: favicons[0] });
    }
  });

  return view;
}

function updateViewBounds(window, sidebarWidth) {
  const activeId = window.activeTabId;
  const view = views.get(activeId);
  if (!view || view.webContents.isDestroyed()) return;

  const { width, height } = window.getContentBounds();
  const viewWidth = Math.max(1, width - sidebarWidth);
  const viewHeight = Math.max(1, height - TOP_BAR_HEIGHT);

  try {
    view.setBounds({ x: sidebarWidth, y: TOP_BAR_HEIGHT, width: viewWidth, height: viewHeight });
  } catch (err) {}
}

function createBrowserWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    frame: false,
    titleBarStyle: 'hidden',
    title: 'KAL',
    icon: path.join(__dirname, 'logo.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), nodeIntegration: false, contextIsolation: true },
  });

  win.activeTabId = null;
  win.currentSidebarWidth = 200;
  win.menuView = null;
  win.siteInfoView = null;
  windows.add(win);

  win.loadFile('index.html');

  const createPopupViews = () => {
    win.menuView = new BrowserView({ webPreferences: { contextIsolation: true, preload: path.join(__dirname, 'preload.js') } });
    win.menuView.webContents.loadFile('menu.html');
    win.siteInfoView = new BrowserView({ webPreferences: { contextIsolation: true, preload: path.join(__dirname, 'preload.js') } });
    win.siteInfoView.webContents.loadFile('site-info.html');
  };

  createPopupViews();

  win.on('resize', () => { updateViewBounds(win, win.currentSidebarWidth); hideAllPopups(win); });
  win.on('closed', () => windows.delete(win));

  return win;
}

function hideAllPopups(win) {
  if (win.menuView) try { win.removeBrowserView(win.menuView); } catch(e) {}
  if (win.siteInfoView) try { win.removeBrowserView(win.siteInfoView); } catch(e) {}
}

// --- IPC HANDLERS ---

function getWindowFromContents(webContents) {
  for (const win of windows) {
    if (win.webContents === webContents) return win;
    if (win.menuView && win.menuView.webContents === webContents) return win;
    if (win.siteInfoView && win.siteInfoView.webContents === webContents) return win;
  }
  return null;
}

// --- IPC HANDLERS ---

ipcMain.on('window-create', () => createBrowserWindow());

ipcMain.on('tab-create', (event, { id, url }) => {
  const win = getWindowFromContents(event.sender);
  if (win) createView(id, url, win);
});

ipcMain.on('tab-switch', (event, id) => {
  const win = getWindowFromContents(event.sender);
  if (!win) return;
  
  if (win.activeTabId && views.has(win.activeTabId)) {
    const prev = views.get(win.activeTabId);
    if (prev && !prev.webContents.isDestroyed()) win.removeBrowserView(prev);
  }
  
  win.activeTabId = id;
  const view = views.get(id);
  if (view && !view.webContents.isDestroyed()) {
    win.setBrowserView(view);
    updateViewBounds(win, win.currentSidebarWidth);
  }
});

ipcMain.on('tab-close', (event, id) => {
  const view = views.get(id);
  if (view) {
    const win = getWindowFromContents(event.sender);
    if (win && win.activeTabId === id) { win.removeBrowserView(view); win.activeTabId = null; }
    view.webContents.destroy();
    views.delete(id);
  }
});

ipcMain.on('show-menu', (event, { x, y }) => {
  const win = getWindowFromContents(event.sender);
  if (win && win.menuView) {
    win.addBrowserView(win.menuView);
    win.menuView.setBounds({ x: Math.round(x - 310), y: Math.round(y + 10), width: 320, height: 520 });
    win.setTopBrowserView(win.menuView);
  }
});

ipcMain.on('show-site-info', (event, { x, y, url }) => {
  const win = getWindowFromContents(event.sender);
  if (win && win.siteInfoView) {
    win.addBrowserView(win.siteInfoView);
    win.siteInfoView.setBounds({ x: Math.round(x - 20), y: Math.round(y + 4), width: 380, height: 320 });
    win.setTopBrowserView(win.siteInfoView);
    win.siteInfoView.webContents.send('site-info-open', { url });
  }
});

ipcMain.on('hide-menu', (event) => {
  const win = getWindowFromContents(event.sender);
  if (win && win.menuView) win.removeBrowserView(win.menuView);
});

ipcMain.on('hide-site-info', (event) => {
  const win = getWindowFromContents(event.sender);
  if (win && win.siteInfoView) win.removeBrowserView(win.siteInfoView);
});

// INTERNAL PAGE NAVIGATION HELPER
function loadInternalPage(win, fileName) {
  if (!win || !win.activeTabId) return;
  const view = views.get(win.activeTabId);
  if (view) view.webContents.loadURL(`file://${path.join(__dirname, fileName)}`);
}

// CORE ACTION HANDLERS
ipcMain.on('open-history', (event) => { loadInternalPage(getWindowFromContents(event.sender), 'history.html'); });
ipcMain.on('open-downloads', (event) => { loadInternalPage(getWindowFromContents(event.sender), 'downloads.html'); });
ipcMain.on('open-settings', (event) => { loadInternalPage(getWindowFromContents(event.sender), 'settings.html'); });

ipcMain.handle('get-history', () => historyData);
ipcMain.handle('get-downloads', () => downloadsData);

ipcMain.on('delete-history-entry', (event, timestamp) => {
  historyData = historyData.filter(h => h.timestamp !== timestamp);
  try { fs.writeFileSync(HISTORY_FILE, JSON.stringify(historyData, null, 2)); } catch (e) {}
});

ipcMain.on('take-snapshot', async (event) => {
  const win = getWindowFromContents(event.sender);
  if (!win || !win.activeTabId) return;
  const view = views.get(win.activeTabId);
  if (!view) return;

  const image = await view.webContents.capturePage();
  const picturesPath = app.getPath('pictures');
  const fileName = `KAL_Snapshot_${Date.now()}.png`;
  const filePath = path.join(picturesPath, fileName);
  
  fs.writeFile(filePath, image.toPNG(), (err) => {
    if (err) console.error('Failed to save snapshot:', err);
    else shell.showItemInFolder(filePath);
  });
});

ipcMain.handle('load-extension', async (event, folderPath) => {
  try {
    const ext = await session.defaultSession.loadExtension(folderPath);
    return { success: true, name: ext.name };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.on('print-page', (event) => {
  const win = getWindowFromContents(event.sender);
  if (win && win.activeTabId) {
    const view = views.get(win.activeTabId);
    if (view) view.webContents.print();
  }
});

ipcMain.on('set-zoom', (event, factor) => {
  const win = getWindowFromContents(event.sender);
  if (win && win.activeTabId) {
    const view = views.get(win.activeTabId);
    if (view) view.webContents.setZoomFactor(factor);
  }
});

ipcMain.on('sidebar-resize', (event, width) => {
  const win = getWindowFromContents(event.sender);
  if (win) { win.currentSidebarWidth = width; updateViewBounds(win, width); }
});

ipcMain.on('nav-back', (event) => { 
  const win = getWindowFromContents(event.sender);
  if (win && win.activeTabId) { const v = views.get(win.activeTabId); if (v && v.webContents.canGoBack()) v.webContents.goBack(); }
});

ipcMain.on('nav-forward', (event) => {
  const win = getWindowFromContents(event.sender);
  if (win && win.activeTabId) { const v = views.get(win.activeTabId); if (v && v.webContents.canGoForward()) v.webContents.goForward(); }
});

ipcMain.on('nav-reload', (event) => {
  const win = getWindowFromContents(event.sender);
  if (win && win.activeTabId) { const v = views.get(win.activeTabId); if (v) v.webContents.reload(); }
});

ipcMain.on('nav-to-url', (event, url) => {
  const win = getWindowFromContents(event.sender);
  if (win && win.activeTabId) {
    const v = views.get(win.activeTabId);
    if (v) {
      let targetUrl = url;
      // Handle file protocol or http
      if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('file://')) {
        targetUrl = `https://www.google.com/search?q=${encodeURIComponent(url)}`;
      }
      v.webContents.loadURL(targetUrl);
    }
  }
});

ipcMain.on('window-minimize', (event) => { const win = getWindowFromContents(event.sender); if (win) win.minimize(); });
ipcMain.on('window-maximize', (event) => {
  const win = getWindowFromContents(event.sender);
  if (win) { if (win.isMaximized()) win.unmaximize(); else win.maximize(); }
});
ipcMain.on('window-close', (event) => { const win = getWindowFromContents(event.sender); if (win) win.close(); });

// PERMISSION LOGIC (Re-integrated for safety)
app.whenReady().then(() => { 
  loadPersistence(); 

  // DOWNLOAD TRACKING
  session.defaultSession.on('will-download', (event, item, webContents) => {
    item.once('done', (event, state) => {
      if (state === 'completed') saveDownloadEntry(item);
    });
  });

  // PERMISSION LOGIC - Wrapped in Ready
  session.defaultSession.setPermissionCheckHandler((webContents, permission, origin) => {
    if (!origin || origin === 'null') return null;
    try {
      const url = new URL(origin).hostname;
      const sitePerms = sessionPermissions.get(url);
      if (!sitePerms) return null;
      if (sitePerms[permission] !== undefined) return sitePerms[permission];
      const mappedBase = REVERSE_PERM_MAP[permission];
      if (mappedBase && sitePerms[mappedBase] !== undefined) return sitePerms[mappedBase];
    } catch (e) {}
    return null;
  });

  session.defaultSession.setDevicePermissionHandler((details) => {
    try {
      const url = new URL(details.origin).hostname;
      const sitePerms = sessionPermissions.get(url);
      if (!sitePerms) return false;
      return (sitePerms['media'] || sitePerms['audioCapture'] || sitePerms['videoCapture']);
    } catch (e) { return false; }
  });

  session.defaultSession.setPermissionRequestHandler(async (webContents, permission, callback) => {
    let url = '';
    try { url = new URL(webContents.getURL()).hostname; } catch(e) { return callback(false); }
    const sitePerms = sessionPermissions.get(url);
    if (sitePerms && (sitePerms[permission] !== undefined || sitePerms[REVERSE_PERM_MAP[permission]] !== undefined)) {
      return callback(sitePerms[permission] ?? sitePerms[REVERSE_PERM_MAP[permission]]);
    }
    const requestId = `perm-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    if (!activeRequestsByUrl.has(url)) activeRequestsByUrl.set(url, {});
    if (activeRequestsByUrl.get(url)[permission]) return activeRequestsByUrl.get(url)[permission].push(callback);
    activeRequestsByUrl.get(url)[permission] = [callback];
    pendingPermissions.set(requestId, { url, permission });
    const win = getWindowFromContents(webContents);
    if (win) {
      if (['media', 'audio', 'video', 'camera', 'microphone', 'audioCapture', 'videoCapture'].includes(permission)) {
        win.webContents.executeJavaScript('window.electronAPI.getLockRect()').then(rect => {
          if (rect && win.siteInfoView) {
            win.addBrowserView(win.siteInfoView);
            win.siteInfoView.setBounds({ x: Math.round(rect.x - 20), y: Math.round(rect.y + 4), width: 380, height: 320 });
            win.setTopBrowserView(win.siteInfoView);
            win.siteInfoView.webContents.send('site-info-open', { url });
          }
        });
      } else win.webContents.send('permission-pending', { requestId, url, permission });
      if (win.siteInfoView) win.siteInfoView.webContents.send('permission-request', { requestId, url, permission });
    } else callback(false);
  });

  createBrowserWindow(); 
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (windows.size === 0) createBrowserWindow(); });
