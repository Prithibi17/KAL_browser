import React, { useState, useEffect, useCallback } from 'react'
import { X, Plus, Minus, Globe, Search, Settings, LayoutGrid, ChevronLeft, ChevronRight, Shield, Lock, RotateCcw, Download, Star, Sliders, Folder, Trash2, ExternalLink, User, ChevronDown } from 'lucide-react'
import { useTabStore } from './store/useTabStore'
import { useSettingsStore, SEARCH_ENGINES } from './store/useSettingsStore'
import { usePermissionStore, type WebsitePermissions } from './store/usePermissionStore'
import { useDownloadStore } from './store/useDownloadStore'
import { translations } from './i18n'


// Declare global for the exposed API
declare global {
  interface Window {
    kalAPI: {
      windowControls: (action: 'minimize' | 'maximize' | 'close') => void
      createTab: (url: string, preferredId?: string, profileId?: string) => Promise<string>
      setActiveTab: (id: string) => Promise<void>
      closeTab: (id: string) => Promise<void>
      navigateTab: (id: string, url: string) => Promise<void>
      goBack: (id: string) => Promise<void>
      goForward: (id: string) => Promise<void>
      reload: (id: string) => Promise<void>
      setZoom: (id: string, factor: number) => Promise<void>
      inspectElement: (id: string, x: number, y: number) => Promise<void>
      viewSource: (id: string) => Promise<void>
      print: (id: string) => Promise<void>
      updateBounds: (id: string, bounds: any, forceRepaint?: boolean) => void
      setViewVisibility: (id: string, visible: boolean) => void
      respondToPermission: (requestId: string, allowed: boolean) => void
      openSettings: () => void
      closeSettings: () => void
      openDownloads: () => void
      closeDownloads: () => void
      showInFolder: (path: string) => void
      openFile: (path: string) => void
      deleteFile: (path: string) => Promise<boolean>
      applyResourceLimits: (limits: { ramLimit: number, netLimit: number, efficiencyMode: string }) => void
      detectIdentity: (tabId: string) => Promise<{ email: string, name: string } | null>
      captureTab: (id: string) => Promise<string | null>
      isDefaultBrowser: () => Promise<boolean>
      setAsDefaultBrowser: () => Promise<boolean>
      setGlobalVisibility: (visible: boolean) => void
      setSystemLanguage: (lang: string) => void
      on: (channel: string, callback: (...args: any[]) => void) => () => void
    }
  }
}


function SettingsMode() {
  const { 
    searchEngineId, setSearchEngine, 
    bookmarks, bookmarkGroups, removeBookmark, 
    addBookmarkGroup, removeBookmarkGroup, moveBookmarkToGroup,
    ramLimit, setRamLimit, netLimit, setNetLimit, efficiencyMode, setEfficiencyMode,
    profiles, activeProfileId, addProfile, removeProfile, setActiveProfile,
    language, setLanguage
  } = useSettingsStore()
  
  const t = (key: string) => (translations[language || 'en'] || translations['en'])[key] || key
  const [activeSettingsTab, setActiveSettingsTab] = useState('SEARCH_ENGINE')
  const [newGroupName, setNewGroupName] = useState('')
  const [showAddGroup, setShowAddGroup] = useState(false)
  const [isDefaultBrowser, setIsDefaultBrowser] = useState(false)

  useEffect(() => {
    const checkDefault = async () => {
      try {
        const isDefault = await window.kalAPI.isDefaultBrowser()
        setIsDefaultBrowser(isDefault)
      } catch (e) {
        console.error('Failed to check default browser status:', e)
      }
    }
    checkDefault()
  }, [])

  const handleSetDefaultBrowser = async () => {
    try {
      const success = await window.kalAPI.setAsDefaultBrowser()
      if (success) {
        setIsDefaultBrowser(true)
      }
    } catch (e) {
      console.error('Failed to set as default browser:', e)
    }
  }
  const [showAddProfile, setShowAddProfile] = useState(false)
  const [newProfileName, setNewProfileName] = useState('')
  const [newProfileEmail, setNewProfileEmail] = useState('')

  // Sync with main process
  useEffect(() => {
    window.kalAPI.applyResourceLimits({ ramLimit, netLimit, efficiencyMode })
  }, [ramLimit, netLimit, efficiencyMode])

  const handleAddGroup = (e: React.FormEvent) => {
    e.preventDefault()
    if (newGroupName.trim()) {
      addBookmarkGroup(newGroupName.trim())
      setNewGroupName('')
      setShowAddGroup(false)
    }
  }

  const handleSyncIdentity = async () => {
    // We scan all tabs for identities
    for (const tab of useTabStore.getState().tabs) {
      try {
        const identity = await window.kalAPI.detectIdentity(tab.id)
        if (identity && identity.email) {
          // Add as a new profile if it doesn't exist
          const exists = useSettingsStore.getState().profiles.find(p => p.email.toLowerCase() === identity.email.toLowerCase())
          if (!exists) {
            addProfile(identity.name || identity.email.split('@')[0].toUpperCase(), identity.email)
          }
        }
      } catch (err) {
        console.error('Failed to sync identity for tab:', tab.id, err)
      }
    }
  }

  return (
    <div className="h-screen w-screen flex bg-kal-bg text-kal-text overflow-hidden weathered-surface selection:bg-kal-accent selection:text-black font-sans">
        <div className="w-full h-full bg-kal-bg border border-kal-border flex">
            {/* Sidebar Navigation */}
            <aside className="w-[240px] border-r border-white/[0.03] bg-kal-surface/50 flex flex-col app-region-drag">
              <div className="p-8 border-b border-white/[0.03] flex items-center gap-4 shrink-0">
                <Settings size={18} className="text-kal-accent" />
                <span className="text-[11px] technical-label text-kal-text">CONFIG_CORE</span>
              </div>
              <nav className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-2 app-region-no-drag">
                {[
                  { id: 'SEARCH_ENGINE', label: t('SEARCH_ENGINE'), icon: <Search size={16} /> },
                  { id: 'LANGUAGE', label: t('SYSTEM_LANGUAGE'), icon: <Globe size={16} /> },
                  { id: 'BOOKMARKS', label: t('SAVED_NODES'), icon: <Star size={16} /> },
                  { id: 'EFFICIENCY', label: t('RESOURCE_MODULATOR'), icon: <Sliders size={16} /> },
                  { id: 'ACCOUNTS', label: t('ACCOUNTS_PROFILES'), icon: <User size={16} /> },
                ].map(item => (
                  <button 
                    key={item.id}
                    onClick={() => setActiveSettingsTab(item.id)}
                    className={`w-full group flex items-center justify-between p-4 rounded transition-all hover:bg-white/[0.02] ${
                      activeSettingsTab === item.id ? 'bg-white/[0.04] border-r-2 border-kal-accent' : ''
                    }`}
                  >
                    <div className="flex items-center gap-4">
                    <div className={activeSettingsTab === item.id ? 'text-kal-accent' : 'text-kal-text-disabled group-hover:text-kal-text-muted transition-colors'}>
                        {item.icon}
                      </div>
                    <span className={`text-[10px] technical-label ${activeSettingsTab === item.id ? 'text-kal-text' : 'text-kal-text-disabled group-hover:text-kal-text-muted'}`}>
                        {item.label}
                      </span>
                    </div>
                  </button>
                ))}
              </nav>
              <div className="p-6 border-t border-white/[0.03] space-y-1 opacity-60 shrink-0">
                <div className="text-[8px] technical-label text-kal-text-disabled opacity-30">{t('ENCRYPTION_ACTIVE')}</div>
                <div className="text-[8px] technical-label text-kal-text-disabled opacity-30">{t('PROTOCOL_MONARCH')}</div>
              </div>
            </aside>

            {/* Content Area */}
            <main className="flex-1 flex flex-col bg-kal-bg relative">
              {/* Header */}
              <div className="px-8 py-4 border-b border-white/[0.03] flex justify-between items-center bg-kal-surface/20 app-region-drag">
                <span className="text-[11px] technical-label text-kal-text-disabled">SECTION // {activeSettingsTab}</span>
                <button onClick={() => window.kalAPI.closeSettings()} className="text-kal-text-disabled hover:text-kal-text transition-colors app-region-no-drag"><X size={18} /></button>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar p-10 app-region-no-drag">
                {activeSettingsTab === 'SEARCH_ENGINE' && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <div className="space-y-2">
                      <h3 className="text-[14px] technical-label text-kal-text">{t('SEARCH_ENGINE')}</h3>
                      <p className="text-[10px] technical-label text-kal-text-disabled">Select the core search engine for all tactical queries.</p>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      {SEARCH_ENGINES.map(engine => (
                        <button 
                          key={engine.id}
                          onClick={() => setSearchEngine(engine.id)}
                          className={`flex items-center justify-between px-6 py-5 border transition-all group ${
                            searchEngineId === engine.id 
                              ? 'bg-kal-surface border-kal-border shadow-[inset_0_0_20px_rgba(0,0,0,0.4)]' 
                              : 'bg-white/[0.01] border-white/[0.03] hover:bg-white/[0.03] hover:border-white/[0.08]'
                          }`}
                        >
                          <div className="flex items-center gap-6">
                            <div className={`w-2 h-2 rounded-full ${searchEngineId === engine.id ? 'bg-kal-accent shadow-[0_0_10px_rgba(136,146,160,0.6)]' : 'bg-white/10 group-hover:bg-white/20'}`} />
                            <div className="text-left">
                              <span className={`text-[12px] technical-label block ${searchEngineId === engine.id ? 'text-kal-text' : 'text-kal-text-disabled group-hover:text-kal-text-muted'}`}>
                                {engine.name}
                              </span>
                              <span className="text-[9px] technical-label text-kal-text-disabled opacity-40">{engine.url}</span>
                            </div>
                          </div>
                          {searchEngineId === engine.id && (
                            <div className="px-3 py-1 border border-kal-accent/30 rounded text-[9px] technical-label text-kal-accent">ACTIVE</div>
                          )}
                        </button>
                      ))}
                    </div>

                    {/* DEFAULT BROWSER CONTROL */}
                    <div className="pt-8 border-t border-white/[0.03] space-y-6">
                      <div className="space-y-2">
                        <h3 className="text-[14px] technical-label text-kal-text">SYSTEM_INTEGRATION</h3>
                        <p className="text-[10px] technical-label text-kal-text-disabled">Establish Kal Browser as the primary handler for all tactical web links.</p>
                      </div>

                      <div className={`p-6 border rounded-md transition-all flex items-center justify-between ${
                        isDefaultBrowser 
                          ? 'bg-kal-accent/5 border-kal-accent/20' 
                          : 'bg-white/[0.01] border-white/[0.03]'
                      }`}>
                        <div className="flex items-center gap-4">
                          <div className={`w-2 h-2 rounded-full ${isDefaultBrowser ? 'bg-kal-accent shadow-[0_0_10px_rgba(136,146,160,0.6)]' : 'bg-red-500/50'}`} />
                          <div>
                            <h4 className="text-[11px] technical-label text-white">DEFAULT_BROWSER_STATUS</h4>
                            <p className="text-[9px] technical-label text-kal-text-disabled">
                              {isDefaultBrowser ? 'CURRENTLY_REGISTERED_AS_PRIMARY_CLIENT' : 'BROWSER_NOT_SET_AS_DEFAULT'}
                            </p>
                          </div>
                        </div>
                        {!isDefaultBrowser && (
                          <button 
                            onClick={handleSetDefaultBrowser}
                            className="px-6 py-2 bg-kal-accent/10 border border-kal-accent/30 hover:bg-kal-accent hover:text-black transition-all text-[9px] technical-label text-kal-accent font-bold"
                          >
                            SET_AS_DEFAULT
                          </button>
                        )}
                        {isDefaultBrowser && (
                          <div className="px-4 py-1.5 bg-kal-accent/10 border border-kal-accent/20 text-kal-accent text-[8px] technical-label">
                            INTEGRATED
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {activeSettingsTab === 'LANGUAGE' && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <div className="space-y-2">
                      <h3 className="text-[14px] technical-label text-kal-text">{t('SYSTEM_LANGUAGE')}</h3>
                      <p className="text-[10px] technical-label text-kal-text-disabled">Select the interface language and regional calibration.</p>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      {[
                        { id: 'en', label: 'ENGLISH (US)' },
                        { id: 'es', label: 'ESPAÑOL' },
                        { id: 'fr', label: 'FRANÇAIS' },
                        { id: 'de', label: 'DEUTSCH' },
                        { id: 'ja', label: '日本語' },
                        { id: 'zh', label: '中文 (简体)' },
                        { id: 'hi', label: 'हिन्दी' },
                      ].map(lang => (
                        <button 
                          key={lang.id} 
                          onClick={() => {
                            setLanguage(lang.id)
                            window.kalAPI.setSystemLanguage(lang.id)
                          }}
                          className={`flex items-center justify-between px-6 py-5 border transition-all group ${
                            language === lang.id 
                              ? 'bg-kal-surface border-kal-border shadow-[inset_0_0_20px_rgba(0,0,0,0.4)]' 
                              : 'bg-white/[0.01] border-white/[0.03] hover:bg-white/[0.03] hover:border-white/[0.08]'
                          }`}
                        >
                          <div className="flex items-center gap-6">
                            <div className={`w-2 h-2 rounded-full ${language === lang.id ? 'bg-kal-accent shadow-[0_0_10px_rgba(136,146,160,0.6)]' : 'bg-white/10 group-hover:bg-white/20'}`} />
                            <span className={`text-[12px] technical-label ${language === lang.id ? 'text-kal-text' : 'text-kal-text-disabled group-hover:text-kal-text-muted'}`}>{lang.label}</span>
                          </div>
                          {language === lang.id && (
                            <div className="px-3 py-1 border border-kal-accent/30 rounded text-[9px] technical-label text-kal-accent">ACTIVE</div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {activeSettingsTab === 'BOOKMARKS' && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <div className="flex justify-between items-center">
                      <div className="space-y-2">
                        <h3 className="text-[14px] technical-label text-kal-text">SAVED_NODES</h3>
                        <p className="text-[10px] technical-label text-kal-text-disabled">Repository of archived network nodes and tactical points.</p>
                      </div>
                      <button 
                        onClick={() => setShowAddGroup(!showAddGroup)}
                        className="flex items-center gap-2 px-4 py-2 bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05] transition-all rounded text-[9px] technical-label text-kal-text"
                      >
                        <Plus size={14} /> NEW_GROUP
                      </button>
                    </div>

                    {showAddGroup && (
                      <form onSubmit={handleAddGroup} className="p-6 border border-kal-accent/20 bg-kal-accent/5 rounded-md flex gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        <input 
                          autoFocus
                          value={newGroupName}
                          onChange={(e) => setNewGroupName(e.target.value)}
                          placeholder="ENTER GROUP NAME..."
                          className="flex-1 bg-transparent border-b border-kal-accent/30 text-[11px] technical-label text-kal-text outline-none focus:border-kal-accent"
                        />
                        <button type="submit" className="text-[9px] technical-label text-kal-accent hover:text-white transition-colors">INITIALIZE</button>
                        <button type="button" onClick={() => setShowAddGroup(false)} className="text-[9px] technical-label text-kal-text-disabled">ABORT</button>
                      </form>
                    )}

                    <div className="space-y-6">
                      {/* Groups List */}
                      {bookmarkGroups.map(group => (
                        <div key={group.id} className="space-y-3">
                          <div className="flex items-center justify-between border-b border-white/[0.03] pb-2">
                            <div className="flex items-center gap-3">
                              <LayoutGrid size={14} className="text-kal-accent" />
                              <span className="text-[11px] technical-label text-kal-text">{group.name}</span>
                              <span className="text-[8px] technical-label text-kal-text-disabled opacity-40">FOLDER_ID: {group.id}</span>
                            </div>
                            <button onClick={() => removeBookmarkGroup(group.id)} className="text-kal-text-disabled hover:text-red-400 transition-colors">
                              <X size={14} />
                            </button>
                          </div>
                          <div className="grid grid-cols-1 gap-2 pl-4">
                            {bookmarks.filter(b => b.groupId === group.id).map(bookmark => (
                              <div key={bookmark.id} className="flex items-center justify-between p-3 bg-white/[0.01] border border-white/[0.03] hover:bg-white/[0.02] transition-all group">
                                <div className="flex items-center gap-4">
                                  <div className="w-1.5 h-1.5 bg-kal-accent opacity-40" />
                                  <div>
                                    <span className="text-[10px] technical-label text-kal-text block truncate max-w-[300px]">{bookmark.title}</span>
                                    <div className="flex gap-4">
                                      <span className="text-[8px] technical-label text-kal-text-disabled opacity-40">{bookmark.url}</span>
                                      <span className="text-[8px] technical-label text-kal-accent opacity-60">ARCHIVED: {bookmark.date}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <select 
                                    onChange={(e) => moveBookmarkToGroup(bookmark.id, e.target.value || undefined)}
                                    className="bg-kal-bg border border-white/[0.1] text-[8px] technical-label text-kal-text outline-none px-2 py-1"
                                    value={bookmark.groupId || ''}
                                  >
                                    <option value="">NO_GROUP</option>
                                    {bookmarkGroups.map(g => (
                                      <option key={g.id} value={g.id}>{g.name}</option>
                                    ))}
                                  </select>
                                  <button onClick={() => removeBookmark(bookmark.id)} className="text-kal-text-disabled hover:text-red-400">
                                    <X size={14} />
                                  </button>
                                </div>
                              </div>
                            ))}
                            {bookmarks.filter(b => b.groupId === group.id).length === 0 && (
                              <span className="text-[9px] technical-label text-kal-text-disabled opacity-30 italic">NO NODES IN THIS SECTOR</span>
                            )}
                          </div>
                        </div>
                      ))}

                      {/* Ungrouped Bookmarks */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between border-b border-white/[0.03] pb-2">
                          <div className="flex items-center gap-3">
                            <Shield size={14} className="text-kal-text-disabled opacity-40" />
                            <span className="text-[11px] technical-label text-kal-text">UNASSIGNED_NODES</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                          {bookmarks.filter(b => !b.groupId).map(bookmark => (
                            <div key={bookmark.id} className="flex items-center justify-between p-3 bg-white/[0.01] border border-white/[0.03] hover:bg-white/[0.02] transition-all group">
                              <div className="flex items-center gap-4">
                                <div className="w-1.5 h-1.5 bg-white/20" />
                                <div>
                                  <span className="text-[10px] technical-label text-kal-text block truncate max-w-[300px]">{bookmark.title}</span>
                                  <div className="flex gap-4">
                                    <span className="text-[8px] technical-label text-kal-text-disabled opacity-40">{bookmark.url}</span>
                                    <span className="text-[8px] technical-label text-kal-accent opacity-60">ARCHIVED: {bookmark.date}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                <select 
                                  onChange={(e) => moveBookmarkToGroup(bookmark.id, e.target.value || undefined)}
                                  className="bg-kal-bg border border-white/[0.1] text-[8px] technical-label text-kal-text outline-none px-2 py-1"
                                  value={bookmark.groupId || ''}
                                >
                                  <option value="">ASSIGN_GROUP</option>
                                  {bookmarkGroups.map(g => (
                                    <option key={g.id} value={g.id}>{g.name}</option>
                                  ))}
                                </select>
                                <button onClick={() => removeBookmark(bookmark.id)} className="text-kal-text-disabled hover:text-red-400">
                                  <X size={14} />
                                </button>
                              </div>
                            </div>
                          ))}
                          {bookmarks.length === 0 && bookmarkGroups.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-20 border border-dashed border-white/[0.05] rounded-xl bg-white/[0.01]">
                              <Star size={40} className="text-kal-text-disabled opacity-20 mb-6" />
                              <span className="text-[11px] technical-label text-kal-text-disabled">ARCHIVE EMPTY</span>
                              <span className="text-[9px] technical-label text-kal-text-disabled opacity-40 mt-2">NO NODES MARKED FOR SURVEILLANCE</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeSettingsTab === 'EFFICIENCY' && (
                  <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <div className="space-y-2">
                      <h3 className="text-[14px] technical-label text-kal-text">RESOURCE_GOVERNANCE</h3>
                      <p className="text-[10px] technical-label text-kal-text-disabled">Calibrate system consumption and operational efficiency.</p>
                    </div>

                    <div className="grid grid-cols-1 gap-8">
                      {/* Efficiency Mode Selector */}
                      <div className="space-y-4">
                        <label className="text-[9px] technical-label text-kal-text-disabled opacity-60">OPERATIONAL_PRIORITY</label>
                        <div className="grid grid-cols-3 gap-2">
                          {['OFF', 'BALANCED', 'AGGRESSIVE'].map((mode) => (
                            <button
                              key={mode}
                              onClick={() => setEfficiencyMode(mode as any)}
                              className={`px-4 py-3 border text-[9px] technical-label transition-all ${
                                efficiencyMode === mode 
                                  ? 'bg-kal-accent/10 border-kal-accent text-kal-accent shadow-[0_0_15px_rgba(0,166,255,0.1)]' 
                                  : 'bg-white/[0.01] border-white/[0.03] text-kal-text-disabled hover:border-white/10'
                              }`}
                            >
                              {mode}
                            </button>
                          ))}
                        </div>
                        <p className="text-[8px] technical-label text-kal-text-disabled italic opacity-40">
                          {efficiencyMode === 'AGGRESSIVE' ? '// HIBERNATE_HIDDEN_TABS_IMMEDIATELY' : efficiencyMode === 'BALANCED' ? '// THROTTLE_IDLE_PROCESSES' : '// NO_THROTTLING_ACTIVE'}
                        </p>
                      </div>

                      {/* Network Limit */}
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <label className="text-[9px] technical-label text-kal-text-disabled opacity-60">BANDWIDTH_CEILING (KB/s)</label>
                          <span className="text-[10px] technical-label text-kal-accent">{netLimit === 0 ? 'UNLIMITED' : `${netLimit} KB/s`}</span>
                        </div>
                        <input 
                          type="range" min="0" max="25000" step="100"
                          value={netLimit}
                          onChange={(e) => setNetLimit(parseInt(e.target.value))}
                          className="w-full accent-kal-accent bg-white/5 h-1 rounded-full appearance-none cursor-pointer"
                        />
                      </div>

                      {/* Memory Limit */}
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <label className="text-[9px] technical-label text-kal-text-disabled opacity-60">MEMORY_CAP_THRESHOLD (MB)</label>
                          <span className="text-[10px] technical-label text-kal-danger">{ramLimit} MB</span>
                        </div>
                        <input 
                          type="range" min="512" max="8192" step="128"
                          value={ramLimit}
                          onChange={(e) => setRamLimit(parseInt(e.target.value))}
                          className="w-full accent-kal-danger bg-white/5 h-1 rounded-full appearance-none cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="p-4 border border-white/[0.03] bg-white/[0.01] flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-1.5 h-1.5 rounded-full bg-kal-accent animate-pulse" />
                        <span className="text-[9px] technical-label text-kal-text">DETECTED_SYSTEM_MEMORY</span>
                      </div>
                      <span className="text-[11px] technical-label text-white">{(navigator as any).deviceMemory || '8'}+ GB</span>
                    </div>
                  </div>
                )}

                {activeSettingsTab === 'ACCOUNTS' && (
                  <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <div className="space-y-2">
                      <h3 className="text-[14px] technical-label text-kal-text">ACCOUNTS_AND_PROFILES</h3>
                      <p className="text-[10px] technical-label text-kal-text-disabled">Manage isolated session profiles and email logins.</p>
                    </div>

                    {/* WEB IDENTITY SCANNER */}
                    <div className="p-6 border border-kal-accent/20 bg-kal-accent/5 rounded-md space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Globe size={18} className="text-kal-accent" />
                          <div>
                            <h4 className="text-[11px] technical-label text-white">SYNC_WEB_IDENTITIES</h4>
                            <p className="text-[9px] technical-label text-kal-text-disabled">DETECT_ACTIVE_SESSIONS_FROM_GOOGLE_YOUTUBE</p>
                          </div>
                        </div>
                        <button 
                          onClick={handleSyncIdentity}
                          className="px-6 py-2 bg-kal-accent/10 border border-kal-accent/30 hover:bg-kal-accent hover:text-black transition-all text-[9px] technical-label text-kal-accent font-bold"
                        >
                          SCAN_FOR_SESSIONS
                        </button>
                      </div>
                    </div>

                    {showAddProfile && (
                      <div className="p-6 border border-kal-accent/20 bg-kal-accent/5 rounded-md space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[8px] technical-label text-kal-accent">ENTITY_NAME</label>
                            <input 
                              autoFocus
                              value={newProfileName}
                              onChange={(e) => setNewProfileName(e.target.value)}
                              placeholder="E.G. WORK_CORE"
                              className="w-full bg-transparent border-b border-white/10 text-[11px] technical-label text-kal-text outline-none focus:border-kal-accent pb-2"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[8px] technical-label text-kal-accent">EMAIL_ASSOCIATION</label>
                            <input 
                              value={newProfileEmail}
                              onChange={(e) => setNewProfileEmail(e.target.value)}
                              placeholder="USER@DOMAIN.COM"
                              className="w-full bg-transparent border-b border-white/10 text-[11px] technical-label text-kal-text outline-none focus:border-kal-accent pb-2"
                            />
                          </div>
                        </div>
                        <div className="flex gap-4 pt-2">
                          <button 
                            onClick={() => {
                              if (newProfileName && newProfileEmail) {
                                addProfile(newProfileName, newProfileEmail)
                                setShowAddProfile(false)
                                setNewProfileName('')
                                setNewProfileEmail('')
                              }
                            }}
                            className="bg-kal-accent text-black text-[9px] technical-label px-6 py-2 rounded hover:bg-white transition-all font-bold"
                          >
                            INITIALIZE_PROFILE
                          </button>
                          <button onClick={() => setShowAddProfile(false)} className="text-[9px] technical-label text-kal-text-disabled hover:text-white transition-colors">ABORT</button>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 gap-4">
                      {profiles.map(profile => (
                        <div 
                          key={profile.id}
                          className={`flex items-center justify-between p-6 border transition-all ${
                            activeProfileId === profile.id 
                              ? 'bg-kal-accent/5 border-kal-accent/20' 
                              : 'bg-white/[0.01] border-white/[0.03] hover:bg-white/[0.03]'
                          }`}
                        >
                          <div className="flex items-center gap-6">
                            <div 
                              className="w-10 h-10 rounded flex items-center justify-center text-[14px] technical-label font-bold"
                              style={{ backgroundColor: `${profile.avatarColor}33`, color: profile.avatarColor, border: `1px solid ${profile.avatarColor}44` }}
                            >
                              {profile.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-3">
                                <span className="text-[12px] technical-label text-kal-text">{profile.name}</span>
                                {activeProfileId === profile.id && (
                                  <span className="text-[8px] px-1.5 py-0.5 bg-kal-accent/20 text-kal-accent rounded border border-kal-accent/30 tracking-tighter">ACTIVE</span>
                                )}
                              </div>
                              <span className="text-[9px] technical-label text-kal-text-disabled opacity-60 tracking-wider uppercase">{profile.email}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {activeProfileId !== profile.id && (
                              <button 
                                onClick={() => setActiveProfile(profile.id)}
                                className="px-4 py-2 bg-white/[0.02] border border-white/[0.05] hover:bg-kal-accent/10 hover:border-kal-accent/30 transition-all text-[9px] technical-label text-kal-text"
                              >
                                SWITCH_TO
                              </button>
                            )}
                            {profile.id !== 'default' && (
                              <button 
                                onClick={() => removeProfile(profile.id)}
                                className="p-2 text-kal-text-disabled hover:text-red-400 transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {!showAddProfile && (
                      <button 
                        onClick={() => setShowAddProfile(true)}
                        className="w-full py-4 border border-dashed border-white/10 hover:border-kal-accent/30 hover:bg-kal-accent/5 transition-all text-[10px] technical-label text-kal-text-disabled hover:text-kal-accent flex items-center justify-center gap-3"
                      >
                        <Plus size={16} /> ADD_NEW_PROFILE_ENTITY
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="px-8 py-6 border-t border-white/[0.03] flex justify-end bg-kal-surface/10 gap-4 app-region-no-drag">
                <button onClick={() => window.kalAPI.closeSettings()} className="text-kal-text-disabled hover:text-kal-text text-[10px] technical-label px-6 transition-colors">CANCEL</button>
                <button onClick={() => window.kalAPI.closeSettings()} className="bg-kal-surface border border-kal-border text-kal-text text-[11px] technical-label px-10 py-3 rounded-lg hover:bg-kal-surface-alt transition-all shadow-[0_0_20px_rgba(0,0,0,0.2)]">COMMIT_CHANGES</button>
              </div>
            </main>
        </div>
    </div>
  )
}

function DownloadsMode() {
  const { downloads, removeDownload } = useDownloadStore()
  
  const handleOpen = (path?: string) => {
    if (path) window.kalAPI.openFile(path)
  }

  const handleShowInFolder = (path?: string) => {
    if (path) window.kalAPI.showInFolder(path)
  }

  const handleDelete = async (id: string, path?: string) => {
    if (path) {
      const success = await window.kalAPI.deleteFile(path)
      if (success) removeDownload(id)
    } else {
      removeDownload(id)
    }
  }

  return (
    <div className="h-screen w-screen bg-kal-bg/95 border border-kal-border rounded-lg shadow-2xl flex flex-col overflow-hidden weathered-surface selection:bg-kal-accent selection:text-black font-sans">
      <div className="px-6 py-4 border-b border-white/[0.03] flex justify-between items-center bg-kal-surface/50 app-region-drag">
        <div className="flex items-center gap-2">
          <span className="text-[11px] technical-label text-kal-text">DOWNLOAD_STREAM</span>
          <span className="text-[8px] technical-label text-kal-accent opacity-50 px-1.5 py-0.5 border border-kal-accent/20 rounded">LOCAL_FS</span>
        </div>
        <button onClick={() => window.kalAPI.closeDownloads()} className="text-kal-text-disabled hover:text-kal-text transition-colors app-region-no-drag"><X size={16} /></button>
      </div>
      <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-3 app-region-no-drag">
        {downloads.map(d => (
          <div 
            key={d.id} 
            className="p-4 bg-white/[0.01] border border-white/[0.03] rounded group relative hover:bg-white/[0.02] transition-all cursor-default"
            onDoubleClick={() => handleOpen(d.path)}
          >
            <div className="flex justify-between items-start mb-3">
              <div className="min-w-0 flex-1">
                <span className="text-[10px] technical-label text-kal-text block truncate group-hover:text-kal-accent transition-colors">{d.name}</span>
                <span className="text-[8px] technical-label text-kal-text-disabled opacity-40">{d.date} // {d.size}</span>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                {d.path && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleShowInFolder(d.path); }}
                    className="p-1.5 hover:bg-white/[0.05] rounded text-kal-text-disabled hover:text-kal-accent transition-colors"
                    title="Show in folder"
                  >
                    <Folder size={12} />
                  </button>
                )}
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDelete(d.id, d.path); }}
                  className="p-1.5 hover:bg-white/[0.05] rounded text-kal-text-disabled hover:text-red-400 transition-colors"
                  title="Delete file"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
            
            {d.status === 'active' ? (
              <div className="space-y-2">
                <div className="h-1 bg-white/[0.05] rounded-full overflow-hidden">
                  <div className="h-full bg-kal-accent transition-all duration-500" style={{ width: `${d.progress}%` }} />
                </div>
                <div className="flex justify-between text-[8px] technical-label text-kal-accent opacity-60">
                  <span>TRANSFERRED: {d.progress}%</span>
                  <span className="animate-pulse">STREAMING...</span>
                </div>
              </div>
            ) : d.status === 'completed' ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-kal-accent shadow-[0_0_5px_rgba(0,255,255,0.5)]" />
                  <span className="text-[8px] technical-label text-kal-accent opacity-60 uppercase tracking-widest">VERIFIED_COMPLETE</span>
                </div>
                {d.path && <ExternalLink size={10} className="text-kal-text-disabled opacity-30" />}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-red-500" />
                <span className="text-[8px] technical-label text-red-500 opacity-60 uppercase">STREAM_FAILED</span>
              </div>
            )}
          </div>
        ))}
        {downloads.length === 0 && (
          <div className="py-12 flex flex-col items-center justify-center opacity-20">
            <Download size={32} />
            <span className="text-[9px] technical-label mt-4">NO_ACTIVE_STREAMS</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default function App() {
  const isSettingsRoute = window.location.hash === '#settings'
  const isDownloadsRoute = window.location.hash === '#downloads'
  
  if (isSettingsRoute) return <SettingsMode />
  if (isDownloadsRoute) return <DownloadsMode />

  const { tabs, activeTabId, addTab, removeTab, setActiveTab, updateTab } = useTabStore()
  const { 
    searchEngineId, bookmarks, activeProfileId, 
    isSidebarCollapsed, setSidebarCollapsed, ramLimit, 
    addBookmark, toggleBookmark, removeBookmark,
    language
  } = useSettingsStore()
  const { getPermission } = usePermissionStore()
  const { addDownload, updateDownload } = useDownloadStore()

  const t = (key: string) => (translations[language || 'en'] || translations['en'])[key] || key
  
  // Sync settings across windows (Settings window vs Main window)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'kal-settings') {
        // Force the store to re-read from localStorage
        useSettingsStore.persist.rehydrate()
      }
    }
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])
  
  const activeTab = tabs.find(t => t.id === activeTabId)
  const isBookmarked = activeTab && bookmarks.find(b => b.url === activeTab.url)
  const getSafeHostname = (url: string) => {
    try {
      return new URL(url).hostname
    } catch {
      return 'google.com'
    }
  }
  
  const [inputValue, setInputValue] = useState('')
  const [isInputFocused, setIsInputFocused] = useState(false)
  const [isMaximized, setIsMaximized] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [metrics, setMetrics] = useState({ network: 0, memory: 0 })
  const [pendingPermission, setPendingPermission] = useState<{ requestId: string, origin: string, permission: string } | null>(null)
  const [showAddBookmark, setShowAddBookmark] = useState(false)
  const [newBookmarkName, setNewBookmarkName] = useState('')
  const [newBookmarkUrl, setNewBookmarkUrl] = useState('')
  const [isZoomVisible, setIsZoomVisible] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(1.0)

  const handleZoom = (direction: 'in' | 'out' | 'reset') => {
    let newLevel = zoomLevel
    if (direction === 'in') newLevel = Math.min(zoomLevel + 0.1, 3.0)
    else if (direction === 'out') newLevel = Math.max(zoomLevel - 0.1, 0.5)
    else newLevel = 1.0

    setZoomLevel(newLevel)
    if (activeTabId) {
      window.kalAPI.setZoom(activeTabId, newLevel)
    }
  }

  // Reset zoom state when tab changes
  useEffect(() => {
    setZoomLevel(1.0)
    setIsZoomVisible(false)
  }, [activeTabId])
  const [isBookmarkDropdownOpen, setIsBookmarkDropdownOpen] = useState(false)
  const addBookmarkBtnRef = React.useRef<HTMLDivElement>(null)
  const sidebarRef = React.useRef<HTMLElement>(null)

  const [tabSnapshot, setTabSnapshot] = useState<string | null>(null)

  // Manage BrowserView visibility when modal or dropdown is open
  useEffect(() => {
    const syncVisibility = async () => {
      const isVisible = !showAddBookmark && !isBookmarkDropdownOpen && !pendingPermission;
      
      if (!isVisible) {
        // 1. Capture snapshot while view is still visible
        if (activeTabId) {
          try {
            const snapshot = await window.kalAPI.captureTab(activeTabId);
            if (snapshot) setTabSnapshot(snapshot);
          } catch (e) {
            console.error('[SNAPSHOT_ERROR]', e);
          }
        }
        // 2. ONLY THEN hide the actual native views
        window.kalAPI.setGlobalVisibility(false);
      } else {
        // Restoration: hide snapshot and show views
        setTabSnapshot(null);
        window.kalAPI.setGlobalVisibility(true);
      }
    };

    syncVisibility();
  }, [showAddBookmark, isBookmarkDropdownOpen, pendingPermission, activeTabId])

  const hasInitialized = React.useRef(false)
  const currentEngine = SEARCH_ENGINES.find(e => e.id === searchEngineId) || SEARCH_ENGINES[0]

  const formatUrl = useCallback((input: string) => {
    if (!input) return currentEngine.url
    if (input.includes('://')) return input
    if (input.includes('.') && !input.includes(' ')) return `https://${input}`
    return `${currentEngine.searchUrl}${encodeURIComponent(input)}`
  }, [currentEngine])

    // Session Restoration
    useEffect(() => {
      if (hasInitialized.current) return
      hasInitialized.current = true
      
      const params = new URLSearchParams(window.location.search)
      const initialUrl = params.get('url')

      if (initialUrl) {
        // Create a fresh tab for the new window
        const id = Math.random().toString(36).substring(2, 11)
        addTab({ id, url: initialUrl, title: 'KAL_STREAM', profileId: activeProfileId })
        window.kalAPI.createTab(initialUrl, id, activeProfileId)
      } else if (tabs.length > 0) {
        // Rehydrate existing tabs
        tabs.forEach(tab => {
          window.kalAPI.createTab(tab.url, tab.id, tab.profileId || activeProfileId)
        })
      } else {
        // Create default tab if empty
        const id = Math.random().toString(36).substring(2, 11)
        addTab({ id, url: currentEngine.url, title: 'NEW_STREAM', profileId: activeProfileId })
        window.kalAPI.createTab(currentEngine.url, id, activeProfileId)
      }

      // Initial layout sync
      setTimeout(() => updateEngineBounds(true), 500)
    }, [])

    // Jump List & CLI Handlers
    useEffect(() => {
      const unlisten = window.kalAPI.on('new-tab-requested', (url?: string) => {
        const targetUrl = url || currentEngine.url
        const id = Math.random().toString(36).substring(2, 11)
        addTab({ id, title: 'NEW_STREAM', url: targetUrl, profileId: activeProfileId })
        window.kalAPI.createTab(targetUrl, id, activeProfileId)
        setActiveTab(id)
      })
      return unlisten
    }, [currentEngine, addTab, activeProfileId, setActiveTab])
  const currentWidth = isSidebarCollapsed ? 72 : 280;

  const frameRef = React.useRef<number>(null);
  const updateEngineBounds = useCallback((forceRepaint = false) => {
    if (activeTabId) {
      // If a modal or popover is open, we should not move the view back into the viewport
      if (showAddBookmark || isBookmarkDropdownOpen || pendingPermission) return;

      // CRITICAL: Do not steal focus from the address bar if the user is typing or has it selected
      const isUIFocused = document.activeElement?.tagName === 'INPUT' || isInputFocused;
      const shouldForceFocus = forceRepaint && !isUIFocused;

      const physicalWidth = sidebarRef.current ? sidebarRef.current.getBoundingClientRect().width : (isSidebarCollapsed ? 72 : 280)
      
      window.kalAPI.updateBounds(activeTabId, {
        x: physicalWidth,
        y: 54, // Match the header height
        width: window.innerWidth - physicalWidth,
        height: window.innerHeight - 54
      }, shouldForceFocus)
    }
  }, [activeTabId, isSidebarCollapsed, isInputFocused, showAddBookmark, isBookmarkDropdownOpen, pendingPermission])

  // IPC Listeners
  useEffect(() => {
    const unsubTitle = window.kalAPI.on('tab-title-updated', (id: string, title: string) => updateTab(id, { title }))
    const unsubUrl = window.kalAPI.on('tab-url-updated', (id: string, url: string) => updateTab(id, { url }))
    const unsubLoading = window.kalAPI.on('tab-loading-updated', (id: string, loading: boolean) => updateTab(id, { loading }))
    const unsubFavicon = window.kalAPI.on('tab-favicon-updated', (id: string, favicon: string) => updateTab(id, { favicon }))
    const unsubExternalTab = window.kalAPI.on('tab-created-external', (id: string, url: string) => addTab({ id, url, title: 'NEW_STREAM' }))
    const unsubHistory = window.kalAPI.on('tab-history-updated', (id: string, history: { canGoBack: boolean, canGoForward: boolean }) => updateTab(id, history))
    const unsubMaximized = window.kalAPI.on('window-maximized', (maximized: boolean) => setIsMaximized(maximized))
    const unsubLayout = window.kalAPI.on('force-layout-update', (forceRepaint: boolean) => updateEngineBounds(forceRepaint))
    
    const unsubDownloadStarted = window.kalAPI.on('download-started', (d: any) => {
      addDownload(d)
      setIsDownloading(true)
    })
    
    const unsubDownloadUpdated = window.kalAPI.on('download-updated', (id: string, updates: any) => {
      updateDownload(id, updates)
      if (updates.status === 'completed' || updates.status === 'failed') {
        setTimeout(() => setIsDownloading(false), 2000)
      }
    })

    const unsubMetrics = window.kalAPI.on('system-metrics', (m: any) => setMetrics(m))

    // Recovery: Focus listener
    const handleFocus = () => updateEngineBounds(true)
    window.addEventListener('focus', handleFocus)

    // Permission Listener
    window.kalAPI.on('permission-requested', ({ requestId, origin, permission }) => {
      const state = getPermission(origin, permission as keyof WebsitePermissions)
      if (state === 'allow') {
        window.kalAPI.respondToPermission(requestId, true)
      } else if (state === 'deny') {
        window.kalAPI.respondToPermission(requestId, false)
      } else {
        setPendingPermission({ requestId, origin, permission })
      }
    })

    return () => { 
      unsubTitle(); unsubUrl(); unsubLoading(); unsubFavicon(); unsubExternalTab(); unsubHistory(); unsubMaximized();
      unsubLayout()
      unsubDownloadStarted()
      unsubDownloadUpdated()
      unsubMetrics()
      window.removeEventListener('focus', handleFocus)
    }
  }, [updateTab, addTab, getPermission, updateEngineBounds])

  // Session & View Management
  useEffect(() => {
    if (activeTabId) {
      window.kalAPI.setActiveTab(activeTabId)
    }
  }, [activeTabId])

  // Address Bar Sync: Prevents overwriting user input while typing
  useEffect(() => {
    if (!isInputFocused) {
      if (activeTabId) {
        const activeTab = tabs.find(t => t.id === activeTabId)
        if (activeTab) {
          setInputValue(activeTab.url.toUpperCase())
        }
      } else {
        setInputValue('')
      }
    }
  }, [activeTabId, tabs, isInputFocused])


  // Modern Resize Sync: Use ResizeObserver for buttery smooth viewport updates
  useEffect(() => {
    if (!sidebarRef.current || !activeTabId) return;

    const observer = new ResizeObserver(() => {
      updateEngineBounds();
    });

    observer.observe(sidebarRef.current);
    
    // Initial sync for state changes
    updateEngineBounds();

    return () => {
      observer.disconnect();
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [activeTabId, updateEngineBounds])

  useEffect(() => {
    const handleResize = () => updateEngineBounds()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [updateEngineBounds])

  const handleNewTab = async () => {
    const id = Math.random().toString(36).substring(2, 11)
    addTab({ id, title: currentEngine.name, url: currentEngine.url, profileId: activeProfileId })
    await window.kalAPI.createTab(currentEngine.url, id, activeProfileId)
  }

  const handleNavigate = async (e: React.FormEvent) => {
    e.preventDefault()
    const url = formatUrl(inputValue)
    if (!activeTabId) {
      const id = await window.kalAPI.createTab(url)
      addTab({ id, title: 'NEW TAB', url })
      return
    }
    setInputValue(url); updateTab(activeTabId, { url })
    await window.kalAPI.navigateTab(activeTabId, url)
  }
  
  const handleRemoveTab = async (id: string) => {
    if (tabs.length === 1) {
      // If it's the last tab, don't just remove it, replace it with a fresh one
      const newId = Math.random().toString(36).substring(2, 11)
      removeTab(id)
      addTab({ id: newId, title: currentEngine.name, url: currentEngine.url })
      window.kalAPI.createTab(currentEngine.url, newId)
    } else {
      removeTab(id)
    }
  }

  return (
    <div className="h-screen w-screen flex bg-kal-bg text-kal-text overflow-hidden weathered-surface selection:bg-kal-accent selection:text-black font-sans">
      <div className="hud-grid" />
      <div className="hud-dots" />
      <div className="vignette-heavy" />
      
      {/* SIDEBAR */}
      <aside 
        ref={sidebarRef}
        style={{ width: currentWidth }}
        className={`flex flex-col relative z-20 select-none border-r border-white/[0.03] ${!isMaximized ? 'app-region-drag' : ''}`}
      >
        <div className={`h-[64px] flex items-center px-6 shrink-0 ${isSidebarCollapsed ? 'justify-center px-0' : 'justify-start'}`}>
          <div 
            onClick={() => setSidebarCollapsed(!isSidebarCollapsed)} 
            className="flex items-center cursor-pointer hover:opacity-80 transition-opacity app-region-no-drag group"
          >
            <img src="logo.png" className="w-6 h-6 object-contain drop-shadow-[0_0_10px_rgba(0,166,255,0.4)] transition-transform group-hover:scale-110" alt="Kal Logo" />
            {!isSidebarCollapsed && (
              <span className="ml-4 text-[12px] technical-label text-white tracking-[0.2em] font-bold">KAL BROWSER</span>
            )}
          </div>
        </div>

        <div className={`px-4 py-4 app-region-no-drag shrink-0 ${isSidebarCollapsed ? 'flex justify-center px-0' : ''}`}>
          <button 
            onClick={handleNewTab}
            className={`flex items-center justify-center border border-white/[0.03] bg-white/[0.01] hover:bg-white/[0.04] transition-all text-[11px] technical-label text-kal-text-muted hover:text-white ${
              isSidebarCollapsed ? 'w-10 h-10 rounded-lg' : 'w-full h-[48px] space-x-4 rounded-lg'
            }`}
          >
            <Plus size={16} className="text-kal-accent" />
            {!isSidebarCollapsed && <span className="tracking-[0.1em]">NEW TAB</span>}
          </button>
        </div>

        <div className="flex-1 relative overflow-y-auto no-scrollbar app-region-no-drag py-4">
          {!isSidebarCollapsed && (
            <div className="section-header px-6"><span>{t('OPEN_TABS')}</span></div>
          )}
          <div className={`space-y-1 ${isSidebarCollapsed ? 'px-2' : 'px-4'}`}>
            {tabs.map(tab => (
              <div 
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`group flex items-center h-[48px] cursor-pointer border rounded-md relative ${
                  isSidebarCollapsed ? 'justify-center px-0' : 'px-4 space-x-4'
                } ${
                  activeTabId === tab.id 
                    ? 'bg-kal-accent/5 border-kal-accent/20 active-indicator' 
                    : 'bg-transparent border-transparent hover:bg-white/[0.02]'
                }`}
              >
                <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center relative">
                  {tab.loading ? (
                    <div className="w-4 h-4 border-2 border-kal-accent/30 border-t-kal-accent rounded-full animate-spin" />
                  ) : tab.favicon ? (
                    <img src={tab.favicon} className="w-4 h-4 rounded-sm" />
                  ) : (
                    <Globe size={16} className={activeTabId === tab.id ? 'text-kal-accent' : 'text-kal-text-disabled'} />
                  )}
                  {isSidebarCollapsed && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleRemoveTab(tab.id); }} 
                      className={`absolute inset-0 flex items-center justify-center bg-kal-bg/80 opacity-0 transition-all rounded-sm text-red-400 pointer-events-none ${
                        activeTabId === tab.id ? 'group-hover:opacity-100 group-hover:pointer-events-auto' : ''
                      }`}
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
                {!isSidebarCollapsed && (
                  <>
                    <div className="flex-1 min-w-0">
                      <span className={`text-[11px] technical-label truncate block ${activeTabId === tab.id ? 'text-kal-text' : 'text-kal-text-disabled'}`}>
                        {tab.title || 'MONARCH OS'}
                      </span>
                      {tab.loading && (
                        <span className="text-[8px] technical-label text-kal-accent animate-pulse block">{t('CONNECTING')}</span>
                      )}
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleRemoveTab(tab.id); }} 
                      className="opacity-0 group-hover:opacity-100 p-1 hover:text-white transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar Dock */}
        <div className={`border-t border-white/[0.02] flex transition-all duration-300 relative p-4 gap-3 ${
          isSidebarCollapsed ? 'flex-col items-center' : 'items-center'
        }`}>
          <div 
            className={`flex items-center justify-center border border-white/[0.03] bg-white/[0.02] hover:border-kal-accent/30 hover:bg-white/[0.04] transition-all cursor-pointer rounded-lg ${
              isSidebarCollapsed ? 'w-10 h-10' : 'flex-1 h-12'
            }`} 
            onClick={() => window.kalAPI.openSettings()}
          >
            <Settings size={18} className="text-kal-text-disabled group-hover:text-kal-accent" />
          </div>
          <div 
            className={`flex items-center justify-center border border-white/[0.03] bg-white/[0.02] hover:border-kal-accent/30 hover:bg-white/[0.04] transition-all cursor-pointer rounded-lg ${
              isSidebarCollapsed ? 'w-10 h-10' : 'flex-1 h-12'
            }`}
            onClick={() => window.kalAPI.openDownloads()}
          >
            <Download size={18} className={`transition-all duration-300 ${isDownloading ? 'text-kal-accent animate-pulse scale-110' : 'text-kal-text-disabled hover:text-kal-accent'}`} />
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 bg-transparent relative">
        
        {/* TOP BAR */}
        <header className="h-[54px] flex items-center px-6 border-b border-white/[0.02] relative z-20">
          {/* Draggable handle for non-maximized state */}
          {!isMaximized && <div className="absolute inset-0 app-region-drag" />}
          
          <div className="flex items-center space-x-6 mr-8 app-region-no-drag relative z-30">
            <ChevronLeft 
              size={20} 
              className={`transition-colors ${activeTab?.canGoBack ? 'text-kal-accent hover:text-white cursor-pointer' : 'text-kal-text-disabled cursor-not-allowed opacity-30'}`} 
              onClick={() => activeTab?.canGoBack && window.kalAPI.goBack(activeTabId!)} 
            />
            <ChevronRight 
              size={20} 
              className={`transition-colors ${activeTab?.canGoForward ? 'text-kal-accent hover:text-white cursor-pointer' : 'text-kal-text-disabled cursor-not-allowed opacity-30'}`} 
              onClick={() => activeTab?.canGoForward && window.kalAPI.goForward(activeTabId!)} 
            />
            <RotateCcw size={18} className="text-kal-accent hover:text-white cursor-pointer transition-colors" onClick={() => activeTabId && window.kalAPI.reload(activeTabId)} />
          </div>

          <form onSubmit={handleNavigate} className="flex-1 max-w-3xl app-region-no-drag mx-auto relative group z-30">
            <div className="absolute inset-0 bg-black/40 border border-white/[0.05] rounded-full transition-all group-focus-within:border-kal-accent/30 shadow-inner pointer-events-none" />
            <div className="relative h-[36px] flex items-center px-6 gap-4">
              <Lock size={14} className="text-kal-accent opacity-60" />
              <input 
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setIsInputFocused(false)}
                onMouseDown={(e) => {
                  e.stopPropagation()
                  const target = e.currentTarget
                  setTimeout(() => target.focus(), 10)
                }}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                placeholder={t('SEARCH_PLACEHOLDER')}
                className="flex-1 bg-transparent text-[10px] technical-label text-white outline-none placeholder:text-kal-text-disabled/40 app-region-no-drag pointer-events-auto"
              />
              <RotateCcw size={14} className="text-kal-text-disabled hover:text-kal-accent cursor-pointer" onClick={() => activeTabId && window.kalAPI.reload(activeTabId)} />
            </div>
          </form>

          <div className="flex items-center space-x-8 app-region-no-drag ml-auto pl-8 relative z-30">
            <div className="flex items-center space-x-6 pr-8 border-r border-white/[0.05]">
              <div className="flex items-center gap-4" ref={addBookmarkBtnRef}>
                <Star 
                  size={18} 
                  className={`cursor-pointer transition-all ${isBookmarked ? 'text-kal-accent drop-shadow-[0_0_8px_rgba(136,146,160,0.4)]' : 'text-kal-text-disabled hover:text-kal-text'}`} 
                  onClick={() => {
                    if (activeTab) toggleBookmark(activeTab.url, activeTab.title)
                  }}
                />
                <Plus 
                  size={18} 
                  className="text-kal-text-disabled hover:text-kal-accent cursor-pointer transition-all" 
                  onClick={() => {
                    if (!showAddBookmark) {
                      setNewBookmarkUrl(activeTab?.url || '')
                      setNewBookmarkName(activeTab?.title || '')
                    }
                    setShowAddBookmark(!showAddBookmark)
                  }}
                />
              </div>

              {/* TACTICAL STATIONS (BOOKMARKS) */}
              <div className="flex items-center gap-3 ml-2 border-l border-white/[0.05] pl-6 max-w-[600px] relative">
                {bookmarks.slice(0, 4).map(bookmark => (
                  <div key={bookmark.id} className="relative group shrink-0">
                    <div 
                      onClick={() => {
                        setInputValue(bookmark.url)
                        if (activeTabId) window.kalAPI.navigateTab(activeTabId, bookmark.url)
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 bg-white/[0.06] border border-white/[0.08] hover:bg-kal-accent/10 hover:border-kal-accent/40 cursor-pointer transition-all rounded-md group shrink-0"
                    >
                      <img 
                        src={`https://www.google.com/s2/favicons?domain=${getSafeHostname(bookmark.url)}&sz=32`} 
                        className="w-3.5 h-3.5 opacity-80 group-hover:opacity-100 transition-opacity" 
                        onError={(e) => { (e.target as HTMLImageElement).src = 'https://www.google.com/s2/favicons?domain=google.com&sz=32' }}
                      />
                      <span className="text-[8px] technical-label text-white/90 group-hover:text-white truncate max-w-[60px] tracking-wider font-bold">
                        {bookmark.title.toUpperCase()}
                      </span>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        removeBookmark(bookmark.id);
                      }}
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#1a1c20] border border-white/10 text-white/40 hover:text-red-500 hover:border-red-500/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-20 shadow-lg"
                    >
                      <X size={8} />
                    </button>
                  </div>
                ))}

                {bookmarks.length > 4 && (
                  <div className="relative">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsBookmarkDropdownOpen(!isBookmarkDropdownOpen);
                      }}
                      className="flex items-center gap-1 px-2 py-1.5 bg-white/[0.06] border border-white/[0.08] hover:bg-white/[0.1] text-white/90 hover:text-white transition-all rounded-md"
                    >
                      <span className="text-[8px] technical-label">+{bookmarks.length - 4}</span>
                      <ChevronDown size={10} />
                    </button>

                    {isBookmarkDropdownOpen && (
                      <div className="absolute top-full right-0 mt-2 w-48 bg-[#0a0c10] border border-white/10 rounded-xl shadow-2xl z-[110] py-2 animate-in fade-in slide-in-from-top-1">
                        {bookmarks.slice(4).map(bookmark => (
                          <div 
                            key={bookmark.id}
                            className="relative group"
                          >
                            <div 
                              onClick={() => {
                                setInputValue(bookmark.url)
                                if (activeTabId) window.kalAPI.navigateTab(activeTabId, bookmark.url)
                                setIsBookmarkDropdownOpen(false)
                              }}
                              className="flex items-center gap-3 px-4 py-2 hover:bg-white/[0.03] cursor-pointer group transition-colors"
                            >
                              <img 
                                src={`https://www.google.com/s2/favicons?domain=${getSafeHostname(bookmark.url)}&sz=32`} 
                                className="w-3 h-3 opacity-60 group-hover:opacity-100" 
                              />
                              <span className="text-[10px] technical-label text-white/80 group-hover:text-white truncate">
                                {bookmark.title.toUpperCase()}
                              </span>
                            </div>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                removeBookmark(bookmark.id);
                              }}
                              className="absolute top-1/2 -translate-y-1/2 right-3 w-5 h-5 text-white/20 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-6 ml-2 border-l border-white/[0.05] pl-6 h-8">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-[7px] technical-label text-kal-accent font-bold">NET</span>
                    <div className="flex gap-[1px]">
                      {[1, 2, 3].map(i => (
                        <div key={i} className={`w-[3px] h-[3px] rounded-full ${metrics.network > (i * 1024 * 100) ? 'bg-kal-accent animate-pulse' : 'bg-white/10'}`} />
                      ))}
                    </div>
                  </div>
                  <span className="text-[9px] technical-label text-kal-accent">
                    {(metrics.network / 1024).toFixed(1)} KB/S
                  </span>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className={`text-[7px] technical-label font-bold ${metrics.memory > ramLimit ? 'text-kal-danger animate-pulse' : 'text-white/40'}`}>RAM</span>
                    <div className={`w-[3px] h-[3px] rounded-full ${metrics.memory > ramLimit ? 'bg-kal-danger animate-pulse' : 'bg-white/20'}`} />
                  </div>
                  <span className={`text-[9px] technical-label ${metrics.memory > ramLimit ? 'text-kal-danger' : 'text-white/40'}`}>
                    {metrics.memory} MB
                  </span>
                </div>
              </div>

              {/* ZOOM CONTROLS */}
              <div className="flex items-center gap-2 border-l border-white/[0.05] pl-6 h-8">
                <button 
                  onClick={() => setIsZoomVisible(!isZoomVisible)}
                  className={`p-1.5 rounded-md transition-all ${isZoomVisible ? 'bg-kal-accent/10 text-kal-accent' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                  title="MAGNIFICATION_CONTROL"
                >
                  <Search size={14} />
                </button>

                {isZoomVisible && (
                  <div className="flex items-center gap-3 bg-white/[0.03] border border-white/[0.05] rounded-lg px-2 py-1 animate-in fade-in slide-in-from-right-4 duration-300">
                    <button 
                      onClick={() => handleZoom('out')}
                      className="p-1 text-white/40 hover:text-white transition-colors"
                    >
                      <Minus size={12} />
                    </button>
                    <span 
                      className="text-[9px] technical-label text-kal-accent min-w-[35px] text-center cursor-pointer hover:text-white transition-colors"
                      onClick={() => handleZoom('reset')}
                    >
                      {Math.round(zoomLevel * 100)}%
                    </span>
                    <button 
                      onClick={() => handleZoom('in')}
                      className="p-1 text-white/40 hover:text-white transition-colors"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center -mr-6 border-l border-white/[0.03]">
              {/* MINIMIZE */}
              <button 
                onClick={() => window.kalAPI.windowControls('minimize')}
                className="group w-[48px] h-[54px] flex items-center justify-center transition-all hover:bg-white/[0.03] relative app-region-no-drag"
                title={t('MINIMIZE_SYSTEM')}
              >
                <div className="w-[12px] h-[1px] bg-kal-text-disabled group-hover:bg-kal-accent group-hover:shadow-[0_0_8px_rgba(0,166,255,0.4)] transition-all" />
              </button>
              
              {/* MAXIMIZE */}
              <button 
                onClick={() => window.kalAPI.windowControls('maximize')}
                className="group w-[48px] h-[54px] flex items-center justify-center transition-all hover:bg-white/[0.03] app-region-no-drag"
                title={t('RESCALE_VIEWPORT')}
              >
                <div className="w-[10px] h-[10px] border border-kal-text-disabled group-hover:border-kal-accent group-hover:shadow-[0_0_8px_rgba(0,166,255,0.4)] transition-all rounded-[1px]" />
              </button>
              
              {/* TERMINATE */}
              <button 
                onClick={() => window.kalAPI.windowControls('close')}
                className="group w-[52px] h-[54px] flex items-center justify-center transition-all hover:bg-kal-danger relative app-region-no-drag"
                title={t('TERMINATE_PROCESS')}
              >
                <X size={16} strokeWidth={2} className="text-kal-text-disabled group-hover:text-white transition-all" />
              </button>
            </div>

            {/* ADD BOOKMARK POPOVER */}
            {showAddBookmark && (
              <div 
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                className="absolute z-[100] w-72 bg-[#0a0c10] border border-white/10 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] p-6 space-y-6 app-region-no-drag"
                style={{ 
                  top: '56px', 
                  right: '180px' 
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Star className="text-kal-accent" size={16} />
                    <h2 className="text-[10px] font-bold text-white tracking-[0.2em] technical-label">{t('STATION_LINK')}</h2>
                  </div>
                  <X 
                    size={14}
                    className="text-kal-text-disabled hover:text-white cursor-pointer" 
                    onClick={() => setShowAddBookmark(false)} 
                  />
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[8px] technical-label text-kal-text-disabled ml-1">{t('IDENTIFIER')}</label>
                    <div className="relative group">
                      <div className="absolute inset-0 bg-white/[0.02] border border-white/[0.05] rounded-lg group-focus-within:border-kal-accent/30 transition-all" />
                      <input 
                        type="text"
                        autoFocus
                        value={newBookmarkName}
                        onChange={(e) => setNewBookmarkName(e.target.value)}
                        placeholder={`${t('IDENTIFIER')}...`}
                        className="relative w-full bg-transparent px-3 py-2 text-[10px] technical-label text-white outline-none placeholder:text-kal-text-disabled/20"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[8px] technical-label text-kal-text-disabled ml-1">{t('COORDINATES')}</label>
                    <div className="relative group">
                      <div className="absolute inset-0 bg-white/[0.02] border border-white/[0.05] rounded-lg group-focus-within:border-kal-accent/30 transition-all" />
                      <input 
                        type="text"
                        value={newBookmarkUrl}
                        onChange={(e) => setNewBookmarkUrl(e.target.value)}
                        placeholder="URL..."
                        className="relative w-full bg-transparent px-3 py-2 text-[10px] technical-label text-white outline-none placeholder:text-kal-text-disabled/20"
                      />
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => {
                    if (newBookmarkUrl) {
                      addBookmark(newBookmarkUrl, newBookmarkName)
                      setShowAddBookmark(false)
                      setNewBookmarkName('')
                      setNewBookmarkUrl('')
                    }
                  }}
                  className="w-full h-10 bg-kal-accent/10 border border-kal-accent/20 hover:bg-kal-accent hover:text-black transition-all rounded-lg text-[10px] font-bold technical-label text-kal-accent tracking-[0.1em]"
                >
                  {t('CONFIRM_LINK')}
                </button>
              </div>
            )}
          </div>
        </header>


        {/* CONTENT VIEWPORT */}
        <main className={`flex-1 relative overflow-hidden flex flex-col items-center justify-center bg-transparent`}>
          {tabSnapshot && (
            <div className="absolute inset-0 z-0 animate-in fade-in duration-500">
              <img 
                src={tabSnapshot} 
                className="w-full h-full object-cover blur-md brightness-50 scale-105" 
                alt="Tab Snapshot"
              />
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            </div>
          )}

          {!activeTabId && (
            <>
              <div className="vignette-heavy" />
              <div className="rain-layer" />
            <div className="relative z-10 flex flex-col items-center space-y-8 animate-in fade-in zoom-in-95 duration-1000">
              <div className="relative">
                <div className="absolute inset-0 blur-2xl bg-kal-accent/20 rounded-full" />
                <img src="logo.png" className="w-32 h-32 object-contain relative z-10 drop-shadow-[0_0_20px_rgba(0,166,255,0.3)]" alt="Kal Logo" />
              </div>
              <div className="flex flex-col items-center space-y-2">
                <h1 className="text-[24px] font-bold text-white tracking-[0.4em] technical-label">KAL_OS</h1>
                <p className="text-[10px] technical-label text-kal-accent opacity-40 animate-pulse tracking-[0.2em]">{t('AWAITING_COMMAND')}</p>
              </div>
              <div className="flex items-center gap-12 pt-12">
                <div className="flex flex-col items-center space-y-2">
                  <span className="text-[8px] technical-label text-white/20">SYSTEM_STATUS</span>
                  <span className="text-[10px] technical-label text-kal-accent">OPERATIONAL</span>
                </div>
                <div className="w-[1px] h-8 bg-white/5" />
                <div className="flex flex-col items-center space-y-2">
                  <span className="text-[8px] technical-label text-white/20">SECURITY_LAYER</span>
                  <span className="text-[10px] technical-label text-kal-accent">ENCRYPTED</span>
                </div>
              </div>
            </div>
          </>
          )}

          {/* Permission Overlay */}
          {pendingPermission && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
              <div className="w-[400px] bg-kal-bg border border-kal-accent/30 p-8 rounded-lg shadow-2xl weathered-surface relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[2px] bg-kal-accent animate-pulse" />
                <div className="flex items-center gap-4 mb-8">
                  <Shield size={24} className="text-kal-accent" />
                  <div>
                    <h3 className="text-[14px] technical-label text-white tracking-widest">{t('SECURITY_INTERCEPT')}</h3>
                    <p className="text-[9px] technical-label text-kal-text-disabled">{t('PERMISSION_PENDING')}</p>
                  </div>
                </div>
                
                <div className="space-y-6 mb-10">
                  <div className="p-4 bg-white/[0.02] border border-white/[0.05] rounded">
                    <span className="text-[9px] technical-label text-kal-text-disabled block mb-1">{t('ORIGIN_NODE')}</span>
                    <span className="text-[11px] technical-label text-white break-all">{pendingPermission.origin}</span>
                  </div>
                  <div className="p-4 bg-white/[0.02] border border-white/[0.05] rounded">
                    <span className="text-[9px] technical-label text-kal-text-disabled block mb-1">{t('REQUESTED_MODULE')}</span>
                    <span className="text-[11px] technical-label text-kal-accent">{pendingPermission.permission.toUpperCase()}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => {
                      window.kalAPI.respondToPermission(pendingPermission.requestId, false)
                      setPendingPermission(null)
                    }}
                    className="py-3 border border-white/10 hover:bg-white/5 text-[10px] technical-label text-kal-text-disabled transition-all"
                  >
                    {t('DENY_ACCESS')}
                  </button>
                  <button 
                    onClick={() => {
                      window.kalAPI.respondToPermission(pendingPermission.requestId, true)
                      setPendingPermission(null)
                    }}
                    className="py-3 bg-kal-accent/10 border border-kal-accent/40 hover:bg-kal-accent/20 text-[10px] technical-label text-kal-accent transition-all"
                  >
                    {t('GRANT_ACCESS')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

    </div>
  );
}
