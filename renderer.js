const urlInput = document.getElementById('url-input');
const backBtn = document.getElementById('back');
const forwardBtn = document.getElementById('forward');
const reloadBtn = document.getElementById('reload');
const minimizeBtn = document.getElementById('minimize');
const maximizeBtn = document.getElementById('maximize');
const closeBtn = document.getElementById('close');

const sidebar = document.getElementById('sidebar');
const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
const sidebarSearchInput = document.getElementById('sidebar-search-input');
const sidebarSearchBox = document.getElementById('sidebar-search-box');
const tabList = document.getElementById('tab-list');
const footerNewTabBtn = document.getElementById('footer-new-tab-btn');
const menuBtn = document.getElementById('menu-btn');
const lockBtn = document.getElementById('lock-btn');
const snapshotBtn = document.getElementById('snapshot-btn');

let tabs = [];
let activeTabId = null;
let isSidebarCollapsed = false;

// --- Sidebar Toggle Logic ---

sidebarToggleBtn.addEventListener('click', () => {
  toggleSidebar();
});

function toggleSidebar() {
  isSidebarCollapsed = !isSidebarCollapsed;
  sidebar.classList.toggle('collapsed', isSidebarCollapsed);
  
  const newWidth = isSidebarCollapsed ? 68 : 200;
  window.electronAPI.resizeSidebar(newWidth);
  
  // Hide site info on toggle to prevent misalignment
  window.electronAPI.hideSiteInfo();
}

sidebarSearchBox.addEventListener('click', () => {
  if (isSidebarCollapsed) {
    toggleSidebar();
    setTimeout(() => sidebarSearchInput.focus(), 200);
  }
});

sidebarSearchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && sidebarSearchInput.value.trim() !== '') {
    const query = sidebarSearchInput.value.trim();
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    addNewTab(searchUrl);
    sidebarSearchInput.value = '';
    sidebarSearchInput.blur();
  }
});

// --- Menu Logic ---

menuBtn.addEventListener('mousedown', (e) => {
  e.stopPropagation();
});

menuBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  const rect = menuBtn.getBoundingClientRect();
  window.electronAPI.showMenu({
    x: rect.right,
    y: rect.bottom
  });
});

// --- Site Information & Permissions Logic ---

lockBtn.addEventListener('mousedown', (e) => e.stopPropagation());

lockBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  lockBtn.classList.remove('pulsing');
  
  const rect = lockBtn.getBoundingClientRect();
  let hostname = '';
  try {
    const url = new URL(urlInput.value);
    hostname = url.hostname;
  } catch(e) {}

  window.electronAPI.showSiteInfo({
    x: rect.left,
    y: rect.bottom,
    url: hostname
  });
});

window.electronAPI.onPermissionPending(({ permission }) => {
  lockBtn.classList.add('pulsing');
  const tab = tabs.find(t => t.id === activeTabId);
  if (tab) tab.hasPendingPermission = true;
});

document.addEventListener('click', () => {
  window.electronAPI.hideMenu();
  window.electronAPI.hideSiteInfo();
});

// --- Tab Management ---

function createUniqueId() {
  return 'tab-' + Math.random().toString(36).substr(2, 9);
}

function renderTabs() {
  tabList.innerHTML = '';
  tabs.forEach(tab => {
    const tabEl = document.createElement('div');
    tabEl.className = `vertical-tab ${tab.id === activeTabId ? 'active' : ''}`;
    
    let faviconHtml = '';
    if (tab.faviconUrl) {
      faviconHtml = `<img src="${tab.faviconUrl}" alt="" onerror="this.style.display='none'; this.nextElementSibling.style.display='block'">
                     <span class="material-icons" style="display:none">public</span>`;
    } else {
      const isGoogle = tab.url && tab.url.includes('google.com');
      const fallbackIcon = isGoogle ? 'search' : 'public';
      faviconHtml = `<span class="material-icons">${fallbackIcon}</span>`;
    }

    tabEl.innerHTML = `
      <div class="tab-favicon">
        ${faviconHtml}
      </div>
      <span class="tab-title">${tab.title || 'New Tab'}</span>
      <button class="close-tab-btn" data-id="${tab.id}">
        <span class="material-icons" style="font-size: 16px">close</span>
      </button>
    `;
    
    tabEl.addEventListener('click', (e) => {
      if (e.target.closest('.close-tab-btn')) return;
      switchTab(tab.id);
    });

    const closeBtnEl = tabEl.querySelector('.close-tab-btn');
    closeBtnEl.addEventListener('click', (e) => {
      e.stopPropagation();
      closeTab(tab.id);
    });

    tabList.appendChild(tabEl);
  });
}

function addNewTab(url = 'https://www.google.com') {
  const id = createUniqueId();
  const newTab = { id, title: 'Loading...', url, faviconUrl: null, hasPendingPermission: false };
  tabs.push(newTab);
  window.electronAPI.createTab(id, url);
  switchTab(id);
}

function switchTab(id) {
  activeTabId = id;
  const tab = tabs.find(t => t.id === id);
  if (tab) {
    urlInput.value = tab.url || '';
    if (tab.hasPendingPermission) lockBtn.classList.add('pulsing');
    else lockBtn.classList.remove('pulsing');
  }
  window.electronAPI.switchTab(id);
  renderTabs();
  window.electronAPI.hideSiteInfo();
  window.electronAPI.hideMenu();
}

function closeTab(id) {
  const index = tabs.findIndex(t => t.id === id);
  if (index === -1) return;

  const wasActive = (activeTabId === id);
  tabs.splice(index, 1);
  window.electronAPI.closeTab(id);

  if (tabs.length === 0) {
    addNewTab();
  } else if (wasActive) {
    const newActiveIndex = Math.min(index, tabs.length - 1);
    switchTab(tabs[newActiveIndex].id);
  } else {
    renderTabs();
  }
}

// IPC Event Listeners
window.electronAPI.onUrlChanged(({ id, url }) => {
  const tab = tabs.find(t => t.id === id);
  if (tab) {
    tab.url = url;
    tab.hasPendingPermission = false;
    if (id === activeTabId) {
      urlInput.value = url;
      lockBtn.classList.remove('pulsing');
    }
    renderTabs();
  }
});

window.electronAPI.onTitleUpdated(({ id, title }) => {
  const tab = tabs.find(t => t.id === id);
  if (tab) {
    if (title && (title.startsWith('http') || title === 'Loading...')) return; 
    tab.title = title;
    renderTabs();
  }
});

window.electronAPI.onFaviconUpdated(({ id, faviconUrl }) => {
  const tab = tabs.find(t => t.id === id);
  if (tab) {
    tab.faviconUrl = faviconUrl;
    renderTabs();
  }
});

window.electronAPI.onOpenLinkInNewTab(({ url }) => {
  addNewTab(url);
});

// UI Events
urlInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    window.electronAPI.navToUrl(urlInput.value);
    urlInput.blur();
  }
});

backBtn.addEventListener('click', () => window.electronAPI.navBack());
forwardBtn.addEventListener('click', () => window.electronAPI.navForward());
reloadBtn.addEventListener('click', () => window.electronAPI.navReload());

footerNewTabBtn.addEventListener('click', () => addNewTab());

// Window controls
minimizeBtn.addEventListener('click', () => window.electronAPI.windowMinimize());
maximizeBtn.addEventListener('click', () => window.electronAPI.windowMaximize());
closeBtn.addEventListener('click', () => window.electronAPI.windowClose());

urlInput.addEventListener('click', () => urlInput.select());

snapshotBtn.addEventListener('click', () => window.electronAPI.takeSnapshot());

// Initial setup
addNewTab();
