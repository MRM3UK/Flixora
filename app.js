// Flixoura - Advanced M3U Player App

// ===== Configuration =====
const CONFIG = {
    DEFAULT_PLAYLIST_URL: "https://raw.githubusercontent.com/MRM3UK/New-try/refs/heads/main/playlist5.m3u",
    DEFAULT_PLAYLIST_NAME: "BDIX Movies Project 2",
    EPISODES_PER_LOAD: 50,
    STORAGE_KEYS: {
        PLAYLISTS: 'm3u_playlists',
        FAVORITES: 'm3u_favorites',
        WATCH_HISTORY: 'm3u_watch_history',
        RESUME_DATA: 'm3u_resume_data',
        THEME: 'm3u_theme',
        SETTINGS: 'm3u_settings',
    }
};

// ===== Theme Manager (No change) =====
const ThemeManager = {
    init() {
        const theme = localStorage.getItem(CONFIG.STORAGE_KEYS.THEME) || 'dark';
        this.setTheme(theme);
    },
    
    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem(CONFIG.STORAGE_KEYS.THEME, theme);
        const icon = document.getElementById('theme-icon');
        if (icon) {
            icon.textContent = theme === 'dark' ? 'light_mode' : 'dark_mode';
        }
    },
    
    toggle() {
        const current = document.documentElement.getAttribute('data-theme');
        this.setTheme(current === 'dark' ? 'light' : 'dark');
        Utils.showToast(`Switched to ${current === 'dark' ? 'light' : 'dark'} mode`, 'info');
    }
};

// ===== Router (No change) =====
const Router = {
    currentPage: 'home',
    
    init() {
        window.addEventListener('popstate', () => this.loadPage(window.location.hash.slice(1) || 'home'));
        this.loadPage(window.location.hash.slice(1) || 'home');
        
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.getAttribute('data-page');
                this.navigate(page);
            });
        });
    },
    
    navigate(page) {
        window.location.hash = page;
        this.loadPage(page);
    },
    
    loadPage(page) {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        
        const pageElement = document.getElementById(`${page}-page`);
        const navLink = document.querySelector(`.nav-link[data-page="${page}"]`);
        
        if (pageElement) {
            pageElement.classList.add('active');
            if (navLink) navLink.classList.add('active');
            this.currentPage = page;
            
            if (page === 'library') Library.render();
            else if (page === 'stats') Stats.render();
            else if (page === 'settings') Settings.render();
            else if (page === 'player') Player.renderEpisodes();
        }
        
        if (window.innerWidth <= 768) {
            document.getElementById('nav-menu')?.classList.remove('active');
        }
    }
};

// ===== Utilities (No change) =====
const Utils = {
    showToast(message, type = 'info', duration = 3000) {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 400);
        }, duration);
    },
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    formatDuration(seconds) {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        return hrs > 0 ? `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}` 
                       : `${mins}:${secs.toString().padStart(2, '0')}`;
    },
    
    getStorage(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch {
            return null;
        }
    },
    
    setStorage(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch {
            return false;
        }
    }
};

// ===== M3U Parser (No change) =====
const M3UParser = {
    parse(content) {
        const lines = content.split('\n').map(l => l.trim()).filter(l => l);
        const episodes = [];
        let currentEpisode = null;

        for (let line of lines) {
            if (line.startsWith('#EXTINF:')) {
                const tvgLogoMatch = line.match(/tvg-logo="([^"]*)"/);
                const groupMatch = line.match(/group-title="([^"]*)"/);
                const titleMatch = line.match(/,(.+)$/);

                currentEpisode = {
                    tvgLogo: tvgLogoMatch ? tvgLogoMatch[1] : '',
                    group: groupMatch ? groupMatch[1] : 'Uncategorized',
                    title: titleMatch ? titleMatch[1].trim() : 'Untitled',
                    url: ''
                };
            } else if (line && !line.startsWith('#') && currentEpisode) {
                currentEpisode.url = line;
                episodes.push(currentEpisode);
                currentEpisode = null;
            }
        }

        return episodes;
    }
};

// ===== Favorites System (No change) =====
const Favorites = {
    getFavorites() {
        return Utils.getStorage(CONFIG.STORAGE_KEYS.FAVORITES) || [];
    },
    
    isFavorite(url) {
        return this.getFavorites().includes(url);
    },
    
    toggle(episode) {
        const favorites = this.getFavorites();
        const index = favorites.indexOf(episode.url);
        
        if (index > -1) {
            favorites.splice(index, 1);
            Utils.showToast('Removed from favorites', 'info');
        } else {
            favorites.push(episode.url);
            Utils.showToast('Added to favorites ⭐', 'success');
        }
        
        Utils.setStorage(CONFIG.STORAGE_KEYS.FAVORITES, favorites);
        Player.renderEpisodes();
        return index === -1;
    },
    
    getAll() {
        const favorites = this.getFavorites();
        return Player.currentPlaylist.filter(ep => favorites.includes(ep.url));
    }
};

// ===== Watch History (No change) =====
const WatchHistory = {
    addToHistory(episode) {
        const history = Utils.getStorage(CONFIG.STORAGE_KEYS.WATCH_HISTORY) || [];
        const entry = {
            ...episode,
            watchedAt: Date.now()
        };
        
        const existing = history.findIndex(h => h.url === episode.url);
        if (existing > -1) {
            history.splice(existing, 1);
        }
        
        history.unshift(entry);
        Utils.setStorage(CONFIG.STORAGE_KEYS.WATCH_HISTORY, history.slice(0, 100));
    },
    
    getHistory() {
        return Utils.getStorage(CONFIG.STORAGE_KEYS.WATCH_HISTORY) || [];
    },
    
    clearHistory() {
        Utils.setStorage(CONFIG.STORAGE_KEYS.WATCH_HISTORY, []);
        Utils.showToast('Watch history cleared', 'success');
        Library.render();
    }
};

// ===== Library Management (Renders added for new sections) =====
const Library = {
    render() {
        const playlists = Utils.getStorage(CONFIG.STORAGE_KEYS.PLAYLISTS) || {};
        const favorites = Favorites.getFavorites();
        const history = WatchHistory.getHistory();
        
        document.getElementById('library-playlists-count').textContent = Object.keys(playlists).length;
        document.getElementById('library-favorites-count').textContent = favorites.length;
        document.getElementById('library-history-count').textContent = history.length;
        
        // --- Playlists Render ---
        const playlistsHtml = Object.keys(playlists).map(name => {
            const playlist = playlists[name];
            return `
                <div class="card" onclick="Player.loadSavedPlaylist('${Utils.escapeHtml(name)}')">
                    <h3>📺 ${Utils.escapeHtml(name)}</h3>
                    <p style="color: var(--text-secondary); margin: 10px 0;">${playlist.episodes.length} channels</p>
                    <div style="display: flex; gap: 10px; margin-top: 15px;">
                        <button class="btn btn-small" onclick="event.stopPropagation(); Player.loadSavedPlaylist('${Utils.escapeHtml(name)}')">
                            <span class="material-icons" style="font-size: 16px;">play_arrow</span> Load
                        </button>
                        <button class="btn btn-small btn-secondary" onclick="event.stopPropagation(); Library.deletePlaylist('${Utils.escapeHtml(name)}')">
                            <span class="material-icons" style="font-size: 16px;">delete</span> Delete
                        </button>
                    </div>
                </div>
            `;
        }).join('') || '<div class="empty-state"><span class="material-icons">playlist_remove</span><p>No saved playlists yet</p></div>';
        
        document.getElementById('library-playlists-grid').innerHTML = playlistsHtml; 
        
        // --- Favorites Render (New Section) ---
        const favoritesHtml = Favorites.getAll().slice(0, 12).map(item => `
            <div class="card favorite" onclick="Player.playEpisodeByUrl('${Utils.escapeHtml(item.url)}')">
                ${item.tvgLogo ? `<img src="${Utils.escapeHtml(item.tvgLogo)}" style="max-width: 80px; margin-bottom: 10px; border-radius: 8px;" alt="">` : ''}
                <h4>${Utils.escapeHtml(item.title)}</h4>
                <p style="color: var(--text-secondary); font-size: 0.9rem; margin-top: 8px;">${Utils.escapeHtml(item.group)}</p>
            </div>
        `).join('') || '<div class="empty-state"><span class="material-icons">star_border</span><p>No favorites yet</p></div>';
        
        document.getElementById('library-favorites-grid').innerHTML = favoritesHtml; 
        
        // --- History Render (New Section) ---
        const historyHtml = history.slice(0, 12).map(item => `
            <div class="card" onclick="Player.playEpisodeByUrl('${Utils.escapeHtml(item.url)}')">
                ${item.tvgLogo ? `<img src="${Utils.escapeHtml(item.tvgLogo)}" style="max-width: 70px; margin-bottom: 10px; border-radius: 8px;" alt="">` : ''}
                <h4>${Utils.escapeHtml(item.title)}</h4>
                <p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 8px;">${new Date(item.watchedAt).toLocaleString()}</p>
            </div>
        `).join('') || '<div class="empty-state"><span class="material-icons">history</span><p>No watch history</p></div>';
        
        document.getElementById('library-history-grid').innerHTML = historyHtml; 
    },
    
    deletePlaylist(name) {
        if (!confirm(`Delete playlist "${name}"?`)) return;
        const playlists = Utils.getStorage(CONFIG.STORAGE_KEYS.PLAYLISTS) || {};
        delete playlists[name];
        Utils.setStorage(CONFIG.STORAGE_KEYS.PLAYLISTS, playlists);
        this.render();
        Utils.showToast(`Deleted "${name}"`, 'success');
    }
};

// ===== Statistics Dashboard (Renders added for new sections) =====
const Stats = {
    render() {
        const playlists = Utils.getStorage(CONFIG.STORAGE_KEYS.PLAYLISTS) || {};
        const history = WatchHistory.getHistory();
        const favorites = Favorites.getFavorites();
        
        const totalChannels = Object.values(playlists).reduce((sum, p) => sum + p.episodes.length, 0);
        const totalPlaylists = Object.keys(playlists).length;
        const totalWatched = history.length;
        const totalFavorites = favorites.length;
        
        document.getElementById('stats-playlists').textContent = totalPlaylists;
        document.getElementById('stats-channels').textContent = totalChannels;
        document.getElementById('stats-watched').textContent = totalWatched;
        document.getElementById('stats-favorites').textContent = totalFavorites;
        
        const groupStats = {};
        history.forEach(item => {
            groupStats[item.group] = (groupStats[item.group] || 0) + 1;
        });
        
        const topGroups = Object.entries(groupStats)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([group, count]) => `
                <div style="padding: 12px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between;">
                    <strong>${Utils.escapeHtml(group)}</strong>
                    <span style="color: var(--primary);">${count} videos</span>
                </div>
            `).join('') || '<p class="empty-state" style="padding: 10px;">No viewing data yet</p>';
        
        document.getElementById('stats-top-categories')?.innerHTML = topGroups;
        
        const recentActivity = history.slice(0, 8).map(item => `
            <div style="padding: 12px; border-bottom: 1px solid var(--border);">
                <strong>${Utils.escapeHtml(item.title)}</strong><br>
                <small style="color: var(--text-muted);">${new Date(item.watchedAt).toLocaleString()}</small>
            </div>
        `).join('') || '<p class="empty-state" style="padding: 10px;">No recent activity</p>';
        
        document.getElementById('stats-recent-activity')?.innerHTML = recentActivity;
    }
};

// ===== Settings (FIXED: Save logic updated) =====
const Settings = {
    defaultSettings: {
        autoplay: true,
        quality: 'auto',
        autoNext: true,
        playerMode: 'native' // Default player mode
    },

    getSettings() {
        const saved = Utils.getStorage(CONFIG.STORAGE_KEYS.SETTINGS);
        return { ...this.defaultSettings, ...saved };
    },

    render() {
        const settings = this.getSettings();
        
        document.getElementById('setting-autoplay').checked = settings.autoplay;
        document.getElementById('setting-quality').value = settings.quality;
        document.getElementById('setting-auto-next').checked = settings.autoNext;
        document.getElementById('setting-player').value = settings.playerMode; // Player Mode
    },
    
    save() {
        const oldSettings = this.getSettings(); // সেভ করার আগের সেটিংস
        
        const settings = {
            autoplay: document.getElementById('setting-autoplay').checked,
            quality: document.getElementById('setting-quality').value,
            autoNext: document.getElementById('setting-auto-next').checked,
            playerMode: document.getElementById('setting-player').value 
        };
        
        Utils.setStorage(CONFIG.STORAGE_KEYS.SETTINGS, settings);
        
        // Player Mode পরিবর্তন হলে Player-কে আপডেট করা
        if (oldSettings.playerMode !== settings.playerMode) {
            Player.currentPlayerMode = settings.playerMode;
            Player.destroyAllPlayers(); 
            Player.updatePlayerVisibility(); 
            // যদি কোনো ভিডিও বর্তমানে প্লে হচ্ছিল, তবে নতুন প্লেয়ারে সেটি আবার প্লে করা
            if (Player.currentIndex >= 0) {
                 Player.playEpisode(Player.currentIndex, true);
            }
            Utils.showToast(`Player set to ${settings.playerMode.toUpperCase()}`, 'info');
        }

        Utils.showToast('Settings saved successfully ✓', 'success');
    },
    
    clearAllData() {
        if (!confirm('⚠️ Are you sure? This will delete all playlists, favorites, and watch history. This action cannot be undone.')) return;
        
        localStorage.clear();
        Utils.showToast('All data cleared successfully', 'success');
        setTimeout(() => location.reload(), 1500);
    },
    
    exportData() {
        const data = {
            playlists: Utils.getStorage(CONFIG.STORAGE_KEYS.PLAYLISTS),
            favorites: Utils.getStorage(CONFIG.STORAGE_KEYS.FAVORITES),
            history: Utils.getStorage(CONFIG.STORAGE_KEYS.WATCH_HISTORY),
            settings: Utils.getStorage(CONFIG.STORAGE_KEYS.SETTINGS)
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `flixoura-backup-${Date.now()}.json`;
        a.click();
        Utils.showToast('Data exported successfully', 'success');
    }
};

// ===== Player (Core) - FIXED Error Handling and Switching =====
const Player = {
    currentPlaylist: [],
    currentIndex: -1,
    hlsInstance: null,
    playerjsInstance: null,
    clapprInstance: null, 
    currentPlayerMode: 'native',
    positionSaveInterval: null,
    searchTerm: '',
    filterGroup: 'all',
    isSavedPlaylist: false,
    handleErrorBound: null, 
    
    init() {
        const settings = Settings.getSettings();
        this.currentPlayerMode = settings.playerMode;

        const videoPlayer = document.getElementById('video-player');
        if (videoPlayer) {
            videoPlayer.addEventListener('timeupdate', () => this.saveProgress());
            videoPlayer.addEventListener('ended', () => {
                const currentSettings = Settings.getSettings();
                if (currentSettings.autoNext !== false) {
                    this.nextEpisode();
                }
            });
            // Error handling binding for easy removal
            this.handleErrorBound = this.handlePlaybackError.bind(this);
            videoPlayer.addEventListener('error', this.handleErrorBound);
        }
        
        const saveBtn = document.getElementById('playlist-save-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveCurrentPlaylist());
        }
        
        const searchInput = document.getElementById('player-search');
        const groupFilter = document.getElementById('player-group-filter');
        
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value.toLowerCase();
                this.renderEpisodes();
            });
        }
        
        if (groupFilter) {
            groupFilter.addEventListener('change', (e) => {
                this.filterGroup = e.target.value;
                this.renderEpisodes();
            });
        }
        
        this.updateSaveButtonVisibility(false);
    },

    destroyAllPlayers() {
        // Native (HLS)
        const videoPlayer = document.getElementById('video-player');
        if (videoPlayer) {
            videoPlayer.pause();
            videoPlayer.src = '';
            videoPlayer.load(); 
            videoPlayer.removeEventListener('error', this.handleErrorBound); // Remove listener to prevent memory leaks/multiple calls
        }
        if (this.hlsInstance) {
            this.hlsInstance.destroy();
            this.hlsInstance = null;
        }

        // PlayerJS
        if (this.playerjsInstance) {
            try {
                this.playerjsInstance.api('destroy');
            } catch (e) {}
            this.playerjsInstance = null;
            document.getElementById('playerjs-player-container').innerHTML = '<div id="player"></div>';
        }
        
        // Clappr
        if (this.clapprInstance) {
            this.clapprInstance.destroy();
            this.clapprInstance = null;
            document.getElementById('clappr-player-container').innerHTML = '<div id="clappr-player"></div>';
        }

        this.stopPositionSaver();
    },

    updatePlayerVisibility() {
        const containers = {
            native: document.getElementById('native-player-container'),
            playerjs: document.getElementById('playerjs-player-container'),
            clappr: document.getElementById('clappr-player-container')
        };

        for (const mode in containers) {
            if (containers[mode]) {
                containers[mode].style.display = (mode === this.currentPlayerMode) ? 'block' : 'none';
            }
        }
    },
    
    updateSaveButtonVisibility(isVisible) {
        const saveBtn = document.getElementById('playlist-save-btn');
        if (saveBtn) {
            saveBtn.style.display = isVisible ? 'inline-flex' : 'none';
        }
    },
    
    // FIXED: Now switches, updates settings, and restarts playback
    switchPlayer(auto = false) {
        const modes = ['native', 'playerjs', 'clappr'];
        const currentIdx = modes.indexOf(this.currentPlayerMode);
        const nextIdx = (currentIdx + 1) % modes.length;
        const nextMode = modes[nextIdx];
        
        this.currentPlayerMode = nextMode;

        // Settings-এ নতুন মোড সেভ করা
        const settings = Settings.getSettings();
        settings.playerMode = nextMode;
        Utils.setStorage(CONFIG.STORAGE_KEYS.SETTINGS, settings);
        
        if (!auto) {
            Utils.showToast(`Switched to ${nextMode.toUpperCase()} Player 🔄`, 'info');
        }

        // প্লেয়ার মোড পরিবর্তন করে প্লেব্যাক আবার শুরু করা
        if (this.currentIndex >= 0) {
            this.playEpisode(this.currentIndex, true); // true মানে switching হচ্ছে, যাতে এরর লুপ না হয়
        } else {
            this.updatePlayerVisibility();
        }
    },

    loadPlaylist(episodes, name, isSaved = false) {
        this.currentPlaylist = episodes;
        this.currentIndex = -1;
        this.isSavedPlaylist = isSaved;
        
        this.updateSaveButtonVisibility(!isSaved); 

        Utils.showToast(`Loaded ${episodes.length} channels from "${name}"`, 'success');
        Router.navigate('player');
        this.populateGroupFilter();
        this.renderEpisodes();
    },
    
    // ... (populateGroupFilter and renderEpisodes are unchanged)
    populateGroupFilter() {
        const select = document.getElementById('player-group-filter');
        if (!select) return;
        
        const groups = new Set(this.currentPlaylist.map(e => e.group));
        select.innerHTML = '<option value="all">All Categories</option>';
        
        Array.from(groups).sort().forEach(group => {
            const option = document.createElement('option');
            option.value = group;
            option.textContent = group;
            select.appendChild(option);
        });
    },
    
    renderEpisodes() {
        const grid = document.getElementById('player-episodes-grid');
        if (!grid) return;
        
        let filtered = this.currentPlaylist;
        
        if (this.searchTerm) {
            filtered = filtered.filter(ep => 
                ep.title.toLowerCase().includes(this.searchTerm) ||
                ep.group.toLowerCase().includes(this.searchTerm) ||
                ep.url.toLowerCase().includes(this.searchTerm)
            );
        }
        
        if (this.filterGroup && this.filterGroup !== 'all') {
            filtered = filtered.filter(ep => ep.group === this.filterGroup);
        }
        
        const resumeData = Utils.getStorage(CONFIG.STORAGE_KEYS.RESUME_DATA) || {};
        
        const html = filtered.map((episode, idx) => {
            const originalIndex = this.currentPlaylist.indexOf(episode);
            const isPlaying = originalIndex === this.currentIndex;
            const isFavorite = Favorites.isFavorite(episode.url);
            const hasResume = resumeData[episode.url] && resumeData[episode.url].time > 5;
            
            return `
                <div class="card ${isPlaying ? 'playing' : ''} ${isFavorite ? 'favorite' : ''}" onclick="Player.playEpisode(${originalIndex})">
                    ${episode.tvgLogo ? `<img src="${Utils.escapeHtml(episode.tvgLogo)}" style="max-width: 100%; height: 120px; object-fit: cover; border-radius: 12px; margin-bottom: 12px;" alt="">` : ''}
                    <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 8px; font-weight: 700;">${Utils.escapeHtml(episode.group)}</div>
                    <h4 style="margin-bottom: 12px; line-height: 1.4;">${Utils.escapeHtml(episode.title)}</h4>
                    ${hasResume ? '<div style="font-size: 0.8rem; color: var(--warning); margin-bottom: 8px;">⏱ Resume available</div>' : ''}
                    <div style="display: flex; gap: 8px; margin-top: auto;">
                        <button class="btn btn-small" onclick="event.stopPropagation(); Player.playEpisode(${originalIndex})" style="flex: 1;">
                            <span class="material-icons" style="font-size: 16px;">${isPlaying ? 'pause' : 'play_arrow'}</span>
                            ${isPlaying ? 'Playing' : hasResume ? 'Resume' : 'Play'}
                        </button>
                        <button class="favorite-btn ${isFavorite ? 'active' : ''}" onclick="event.stopPropagation(); Favorites.toggle(Player.currentPlaylist[${originalIndex}])">
                            <span class="material-icons" style="font-size: 16px;">${isFavorite ? 'star' : 'star_border'}</span>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        grid.innerHTML = html || '<div class="empty-state"><span class="material-icons">search_off</span><p>No channels found</p></div>';
        
        const countEl = document.getElementById('player-count');
        if (countEl) countEl.textContent = `${filtered.length} channels`;
    },
    
    playEpisode(index, isSwitching = false) {
        const episode = this.currentPlaylist[index];
        if (!episode) return;
        
        this.currentIndex = index;
        WatchHistory.addToHistory(episode);
        
        const playerContainer = document.getElementById('player-container');
        if (playerContainer) playerContainer.style.display = 'block';
        
        const resumeData = Utils.getStorage(CONFIG.STORAGE_KEYS.RESUME_DATA) || {};
        const startTime = resumeData[episode.url]?.time || 0;
        
        this.destroyAllPlayers(); 
        this.updatePlayerVisibility(); 

        // প্লেয়ার মোড অনুযায়ী প্লে ফাংশন কল করা
        if (this.currentPlayerMode === 'native') {
            this.playNative(episode, startTime, isSwitching); 
        } else if (this.currentPlayerMode === 'playerjs') {
            this.playPlayerJS(episode, startTime);
        } else if (this.currentPlayerMode === 'clappr') {
            this.playClappr(episode, startTime);
        }
        
        document.getElementById('current-title').textContent = episode.title;
        const logoEl = document.getElementById('current-logo');
        if (logoEl) {
            if (episode.tvgLogo) {
                logoEl.src = episode.tvgLogo;
                logoEl.style.display = 'block';
            } else {
                logoEl.style.display = 'none';
            }
        }
        
        this.renderEpisodes();
        playerContainer?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    
    // FIXED: Enhanced Error Handler
    handlePlaybackError(event) {
        // Only attempt to switch if a channel is currently loaded
        if (this.currentIndex !== -1) {
            Utils.showToast(`${this.currentPlayerMode.toUpperCase()} Player Error. Switching player...`, 'error');
            this.switchPlayer(true); 
        }
    },

    playNative(episode, startTime, isSwitching = false) {
        const videoPlayer = document.getElementById('video-player');
        
        // Error handler re-added for the current instance (important for native player)
        videoPlayer.removeEventListener('error', this.handleErrorBound);
        videoPlayer.addEventListener('error', this.handleErrorBound);

        if (episode.url.includes('.m3u8')) {
            if (typeof Hls !== 'undefined' && Hls.isSupported()) {
                this.hlsInstance = new Hls();
                this.hlsInstance.loadSource(episode.url);
                this.hlsInstance.attachMedia(videoPlayer);
                this.hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
                    videoPlayer.currentTime = startTime;
                    videoPlayer.play().catch(e => {
                        if (e.name === 'NotAllowedError' && !isSwitching) {
                            Utils.showToast('Autoplay blocked. Tap to play.', 'warning');
                        }
                    });
                });
            } else if (videoPlayer.canPlayType('application/vnd.apple.mpegurl')) {
                videoPlayer.src = episode.url;
                videoPlayer.currentTime = startTime;
                videoPlayer.play();
            }
        } else {
            videoPlayer.src = episode.url;
            videoPlayer.currentTime = startTime;
            videoPlayer.play().catch(e => {
                if (e.name === 'NotAllowedError' && !isSwitching) {
                    Utils.showToast('Autoplay blocked. Tap to play.', 'warning');
                } else if (e.name === 'MediaError' && !isSwitching) {
                     // Native media error handling: try to switch player
                     this.handlePlaybackError({ target: videoPlayer });
                }
            });
        }
        
        this.startPositionSaver(videoPlayer);
    },
    
    playPlayerJS(episode, startTime) {
        if (typeof Playerjs === 'undefined') {
            Utils.showToast('PlayerJS not loaded. Switching player.', 'error');
            this.switchPlayer(true);
            return;
        }
        
        const container = document.getElementById('playerjs-player-container');
        container.innerHTML = '<div id="player"></div>';
        
        this.playerjsInstance = new Playerjs({
            id: "player",
            file: episode.url,
            title: episode.title,
            poster: episode.tvgLogo,
            autoplay: 1,
            start: Math.floor(startTime),
        });
        
        this.startPositionSaver(this.playerjsInstance);
    },

    // FIXED: Clappr Start Time Fix
    playClappr(episode, startTime) {
        if (typeof Clappr === 'undefined') {
            Utils.showToast('Clappr not loaded. Switching player.', 'error');
            this.switchPlayer(true);
            return;
        }

        const container = document.getElementById('clappr-player-container');
        container.innerHTML = '<div id="clappr-player"></div>';

        this.clapprInstance = new Clappr.Player({
            source: episode.url,
            parentId: '#clappr-player',
            poster: episode.tvgLogo,
            plugins: [window.HlsjsPlayback],
            autoPlay: true,
            width: '100%',
            height: '100%',
            // Clappr এর বিল্ট-ইন seek ফাংশন ব্যবহার করব
        });
        
        // Clappr-এর জন্য পজিশন সেভার এবং seek
        this.clapprInstance.on(Clappr.Events.PLAYER_PLAY, () => {
             // শুধুমাত্র প্রথমবার প্লে হওয়ার সময় seek করবে
             if (startTime > 0) {
                 this.clapprInstance.seek(startTime); 
             }
             this.startPositionSaver(this.clapprInstance);
        });

        this.clapprInstance.on(Clappr.Events.PLAYER_ERROR, () => {
             Utils.showToast(`Clappr Player Error. Switching player...`, 'error');
             this.switchPlayer(true);
        });

        this.clapprInstance.on(Clappr.Events.PLAYER_ENDED, () => {
            const currentSettings = Settings.getSettings();
            if (currentSettings.autoNext !== false) {
                this.nextEpisode();
            }
        });
    },
    
    startPositionSaver(player) {
        this.stopPositionSaver();

        if (!player) return;
        
        this.positionSaveInterval = setInterval(() => {
            if (this.currentIndex < 0) return;
            const episode = this.currentPlaylist[this.currentIndex];
            let time, duration;

            if (player instanceof HTMLVideoElement) { // Native
                time = player.currentTime;
                duration = player.duration;
            } else if (player.api) { // PlayerJS
                time = player.api('time');
                duration = player.api('duration');
            } else if (player.getCurrentTime) { // Clappr
                time = player.getCurrentTime();
                duration = player.getDuration();
            }

            if (time > 0 && duration > 0) {
                const resumeData = Utils.getStorage(CONFIG.STORAGE_KEYS.RESUME_DATA) || {};
                resumeData[episode.url] = { time, duration };
                Utils.setStorage(CONFIG.STORAGE_KEYS.RESUME_DATA, resumeData);
            }
        }, 3000);
    },
    
    stopPositionSaver() {
        if (this.positionSaveInterval) {
            clearInterval(this.positionSaveInterval);
            this.positionSaveInterval = null;
        }
    },
    
    playEpisodeByUrl(url) {
        const index = this.currentPlaylist.findIndex(e => e.url === url);
        if (index > -1) {
            this.playEpisode(index);
            Router.navigate('player');
        }
    },
    
    nextEpisode() {
        if (this.currentPlaylist.length === 0) return;
        const nextIndex = (this.currentIndex + 1) % this.currentPlaylist.length;
        this.playEpisode(nextIndex);
    },
    
    previousEpisode() {
        if (this.currentPlaylist.length === 0) return;
        const prevIndex = this.currentIndex - 1 < 0 ? this.currentPlaylist.length - 1 : this.currentIndex - 1;
        this.playEpisode(prevIndex);
    },
    
    saveProgress() {
        // Native Player এর জন্য progress সেভ, PlayerJS এবং Clappr এর জন্য startPositionSaver এ হ্যান্ডেল করা হয়েছে
        if (this.currentPlayerMode === 'native' && this.currentIndex >= 0) {
            this.startPositionSaver(document.getElementById('video-player'));
        }
    },

    closePlayer() {
        this.destroyAllPlayers();

        const playerContainer = document.getElementById('player-container');
        if (playerContainer) playerContainer.style.display = 'none';
        
        this.currentIndex = -1;
        this.renderEpisodes();
    },
    
    // FIXED: loadFromURL now passes isDefault to loadPlaylist
    async loadFromURL(url, name, isDefault = false) {
        if (!url) {
            Utils.showToast('Please enter a URL', 'error');
            return;
        }
        
        try {
            Utils.showToast('Loading playlist...', 'info');
            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to fetch');
            const content = await response.text();
            const episodes = M3UParser.parse(content);
            
            // isDefault পাস করা হয়েছে
            this.loadPlaylist(episodes, name || 'Playlist', isDefault); 
        } catch (error) {
            Utils.showToast('Failed to load playlist from URL. Try paste or upload.', 'error');
        }
    },
    
    loadFromText(content, name) {
        if (!content.trim()) {
            Utils.showToast('Please paste M3U content', 'error');
            return;
        }
        const episodes = M3UParser.parse(content);
        this.loadPlaylist(episodes, name || 'Pasted Playlist', false); 
    },
    
    loadFromFile(file) {
        Utils.showToast(`Loading ${file.name}...`, 'info');
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            const episodes = M3UParser.parse(content);
            this.loadPlaylist(episodes, file.name.replace(/\.[^/.]+$/, ""), false);
        };
        reader.readAsText(file);
    },
    
    loadSavedPlaylist(name) {
        const playlists = Utils.getStorage(CONFIG.STORAGE_KEYS.PLAYLISTS) || {};
        if (playlists[name]) {
            this.loadPlaylist(playlists[name].episodes, name, true);
        }
    },
    
    saveCurrentPlaylist() {
        if (this.currentPlaylist.length === 0) {
            Utils.showToast('Load a playlist first!', 'error');
            return;
        }
        
        const defaultName = this.currentPlaylist.playlistName || 'My New Playlist';
        const newName = prompt("Enter a name for the playlist:", defaultName);
        
        if (newName === null || newName.trim() === '') {
            Utils.showToast('Playlist save cancelled.', 'info');
            return;
        }
        
        const name = newName.trim();
        
        const playlists = Utils.getStorage(CONFIG.STORAGE_KEYS.PLAYLISTS) || {};
        
        playlists[name] = { name, episodes: this.currentPlaylist };
        Utils.setStorage(CONFIG.STORAGE_KEYS.PLAYLISTS, playlists);
        
        this.isSavedPlaylist = true;
        this.updateSaveButtonVisibility(false);
        
        Utils.showToast(`Saved "${name}" ✓`, 'success');
    }
};

// ===== Mobile Menu (No change) =====
function toggleMobileMenu() {
    document.getElementById('nav-menu').classList.toggle('active');
}

// ===== Tab System (No change) =====
function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');
    document.getElementById(`${tabName}-tab`)?.classList.add('active');
}

// ===== File Upload Handlers (No change) =====
function setupFileUpload() {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    
    if (!dropZone || !fileInput) return;
    
    dropZone.addEventListener('click', () => fileInput.click());
    
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });
    
    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
    });
    
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            Player.loadFromFile(files[0]);
        }
    });
    
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            Player.loadFromFile(e.target.files[0]);
        }
    });
}

// ===== Initialize App (FIXED: Default Load order) =====
document.addEventListener('DOMContentLoaded', () => {
    ThemeManager.init();
    Router.init();
    Player.init();
    setupFileUpload();
    Player.updatePlayerVisibility(); // Initial visibility set

    // Default Load - ensure it's not trying to load on non-home/player pages on initial load
    if (window.location.hash === '' || window.location.hash === '#home' || window.location.hash === '#player') {
        Utils.showToast('Welcome to Flixoura! 🎬', 'info');
        // setTimeout-এ রাখা হয়েছে যাতে অন্যান্য UI রেডি হওয়ার সুযোগ পায়
        setTimeout(() => {
            Player.loadFromURL(CONFIG.DEFAULT_PLAYLIST_URL, CONFIG.DEFAULT_PLAYLIST_NAME, true); 
        }, 500);
    }
});

// ===== Keyboard Shortcuts (No change) =====
document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT'
