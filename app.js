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
        PLAYER_MODE: 'm3u_player_mode'
    }
};

// ===== Theme Manager =====
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

// ===== Router =====
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

// ===== Utilities =====
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

// ===== M3U Parser =====
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

// ===== Favorites System =====
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

// ===== Watch History =====
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

// ===== Library Management =====
const Library = {
    render() {
        const playlists = Utils.getStorage(CONFIG.STORAGE_KEYS.PLAYLISTS) || {};
        const favorites = Favorites.getFavorites();
        const history = WatchHistory.getHistory();
        
        document.getElementById('library-playlists-count').textContent = Object.keys(playlists).length;
        document.getElementById('library-favorites-count').textContent = favorites.length;
        document.getElementById('library-history-count').textContent = history.length;
        
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
        
        document.getElementById('library-playlists').innerHTML = playlistsHtml;
        
        const favoritesHtml = Favorites.getAll().slice(0, 12).map(item => `
            <div class="card favorite" onclick="Player.playEpisodeByUrl('${Utils.escapeHtml(item.url)}')">
                ${item.tvgLogo ? `<img src="${Utils.escapeHtml(item.tvgLogo)}" style="max-width: 80px; margin-bottom: 10px; border-radius: 8px;" alt="">` : ''}
                <h4>${Utils.escapeHtml(item.title)}</h4>
                <p style="color: var(--text-secondary); font-size: 0.9rem; margin-top: 8px;">${Utils.escapeHtml(item.group)}</p>
            </div>
        `).join('') || '<div class="empty-state"><span class="material-icons">star_border</span><p>No favorites yet</p></div>';
        
        document.getElementById('library-favorites').innerHTML = favoritesHtml;
        
        const historyHtml = history.slice(0, 12).map(item => `
            <div class="card" onclick="Player.playEpisodeByUrl('${Utils.escapeHtml(item.url)}')">
                ${item.tvgLogo ? `<img src="${Utils.escapeHtml(item.tvgLogo)}" style="max-width: 70px; margin-bottom: 10px; border-radius: 8px;" alt="">` : ''}
                <h4>${Utils.escapeHtml(item.title)}</h4>
                <p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 8px;">${new Date(item.watchedAt).toLocaleString()}</p>
            </div>
        `).join('') || '<div class="empty-state"><span class="material-icons">history</span><p>No watch history</p></div>';
        
        document.getElementById('library-history').innerHTML = historyHtml;
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

// ===== Statistics Dashboard =====
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
            `).join('') || '<p class="empty-state">No viewing data yet</p>';
        
        document.getElementById('stats-top-categories').innerHTML = topGroups;
        
        const recentActivity = history.slice(0, 8).map(item => `
            <div style="padding: 12px; border-bottom: 1px solid var(--border);">
                <strong>${Utils.escapeHtml(item.title)}</strong><br>
                <small style="color: var(--text-muted);">${new Date(item.watchedAt).toLocaleString()}</small>
            </div>
        `).join('') || '<p class="empty-state">No recent activity</p>';
        
        document.getElementById('stats-recent').innerHTML = recentActivity;
    }
};

// ===== Settings =====
const Settings = {
    render() {
        const settings = Utils.getStorage(CONFIG.STORAGE_KEYS.SETTINGS) || {
            autoplay: true,
            quality: 'auto',
            autoNext: true
        };
        
        document.getElementById('setting-autoplay').checked = settings.autoplay;
        document.getElementById('setting-quality').value = settings.quality;
        document.getElementById('setting-auto-next').checked = settings.autoNext;
    },
    
    save() {
        const settings = {
            autoplay: document.getElementById('setting-autoplay').checked,
            quality: document.getElementById('setting-quality').value,
            autoNext: document.getElementById('setting-auto-next').checked
        };
        
        Utils.setStorage(CONFIG.STORAGE_KEYS.SETTINGS, settings);
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

// ===== Player (Core) =====
const Player = {
    currentPlaylist: [],
    currentIndex: -1,
    hlsInstance: null,
    playerjsInstance: null,
    currentPlayerMode: 'native',
    positionSaveInterval: null,
    searchTerm: '',
    filterGroup: 'all',
    // প্লেলিস্ট সেভ করা হয়েছে কিনা ট্র্যাক করার জন্য নতুন ভ্যারিয়েবল
    isSavedPlaylist: false, 
    
    init() {
        const savedMode = localStorage.getItem(CONFIG.STORAGE_KEYS.PLAYER_MODE) || 'native';
        this.currentPlayerMode = savedMode;
        
        const videoPlayer = document.getElementById('video-player');
        if (videoPlayer) {
            videoPlayer.addEventListener('timeupdate', () => this.saveProgress());
            videoPlayer.addEventListener('ended', () => {
                const settings = Utils.getStorage(CONFIG.STORAGE_KEYS.SETTINGS) || {};
                if (settings.autoNext !== false) {
                    this.nextEpisode();
                }
            });
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
        
        // সেভ বাটন ইনিশিয়ালাইজেশন: শুরুতে হাইড থাকবে
        this.updateSaveButtonVisibility(false);
    },
    
    updatePlayerUI() {
        const nativeContainer = document.getElementById('native-player-container');
        const playerjsContainer = document.getElementById('playerjs-player-container');
        const switchBtn = document.getElementById('player-switch-btn');
        
        if (this.currentPlayerMode === 'native') {
            if (nativeContainer) nativeContainer.style.display = 'block';
            if (playerjsContainer) playerjsContainer.style.display = 'none';
            if (switchBtn) switchBtn.textContent = '🎬 Switch to Player Two (Live)';
        } else {
            if (nativeContainer) nativeContainer.style.display = 'none';
            if (playerjsContainer) playerjsContainer.style.display = 'block';
            if (switchBtn) switchBtn.textContent = '📺 Switch to Player One (Native)';
        }
    },
    
    // *** নতুন ফাংশন: সেভ বাটনের দৃশ্যমানতা নিয়ন্ত্রণ ***
    updateSaveButtonVisibility(isVisible) {
        const saveBtn = document.getElementById('playlist-save-btn');
        if (saveBtn) {
            saveBtn.style.display = isVisible ? 'inline-flex' : 'none';
        }
    },
    // *** নতুন ফাংশন শেষ ***

    // প্লেলিস্ট লোড করার জন্য পরিবর্তিত ফাংশন
    loadPlaylist(episodes, name, isSaved = false) {
        this.currentPlaylist = episodes;
        this.currentIndex = -1;
        this.isSavedPlaylist = isSaved; // সেভ করা প্লেলিস্ট কিনা
        
        // যদি সেভ করা প্লেলিস্ট না হয়, তবেই সেভ বাটন দেখাও
        this.updateSaveButtonVisibility(!isSaved); 

        Utils.showToast(`Loaded ${episodes.length} channels from "${name}"`, 'success');
        Router.navigate('player');
        this.populateGroupFilter();
        this.renderEpisodes();
    },
    
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
    
    playEpisode(index) {
        const episode = this.currentPlaylist[index];
        if (!episode) return;
        
        this.currentIndex = index;
        WatchHistory.addToHistory(episode);
        
        const playerContainer = document.getElementById('player-container');
        if (playerContainer) playerContainer.style.display = 'block';
        
        const resumeData = Utils.getStorage(CONFIG.STORAGE_KEYS.RESUME_DATA) || {};
        const startTime = resumeData[episode.url]?.time || 0;
        
        this.updatePlayerUI();
        
        if (this.currentPlayerMode === 'native') {
            this.playNative(episode, startTime);
        } else {
            this.playPlayerJS(episode, startTime);
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
    
    playNative(episode, startTime) {
        const videoPlayer = document.getElementById('video-player');
        
        if (this.hlsInstance) {
            this.hlsInstance.destroy();
            this.hlsInstance = null;
        }
        
        if (this.playerjsInstance) {
            try {
                this.playerjsInstance.api('destroy');
            } catch (e) {}
            this.playerjsInstance = null;
        }
        
        if (episode.url.includes('.m3u8')) {
            if (typeof Hls !== 'undefined' && Hls.isSupported()) {
                this.hlsInstance = new Hls();
                this.hlsInstance.loadSource(episode.url);
                this.hlsInstance.attachMedia(videoPlayer);
                this.hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
                    videoPlayer.currentTime = startTime;
                    videoPlayer.play();
                });
            } else if (videoPlayer.canPlayType('application/vnd.apple.mpegurl')) {
                videoPlayer.src = episode.url;
                videoPlayer.currentTime = startTime;
                videoPlayer.play();
            }
        } else {
            videoPlayer.src = episode.url;
            videoPlayer.currentTime = startTime;
            videoPlayer.play();
        }
    },
    
    playPlayerJS(episode, startTime) {
        if (this.hlsInstance) {
            this.hlsInstance.destroy();
            this.hlsInstance = null;
        }
        
        if (typeof Playerjs === 'undefined') {
            Utils.showToast('PlayerJS not loaded. Switching to native player.', 'error');
            this.currentPlayerMode = 'native';
            this.playNative(episode, startTime);
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
            start: Math.floor(startTime)
        });
        
        this.startPositionSaver();
    },
    
    startPositionSaver() {
        this.stopPositionSaver();
        this.positionSaveInterval = setInterval(() => {
            if (this.playerjsInstance && this.currentIndex >= 0) {
                try {
                    const episode = this.currentPlaylist[this.currentIndex];
                    const time = this.playerjsInstance.api('time');
                    const duration = this.playerjsInstance.api('duration');
                    
                    if (time && duration) {
                        const resumeData = Utils.getStorage(CONFIG.STORAGE_KEYS.RESUME_DATA) || {};
                        resumeData[episode.url] = { time, duration };
                        Utils.setStorage(CONFIG.STORAGE_KEYS.RESUME_DATA, resumeData);
                    }
                } catch (e) {}
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
        if (this.currentIndex < 0) return;
        const episode = this.currentPlaylist[this.currentIndex];
        const videoPlayer = document.getElementById('video-player');
        if (!videoPlayer || !episode) return;
        
        const resumeData = Utils.getStorage(CONFIG.STORAGE_KEYS.RESUME_DATA) || {};
        resumeData[episode.url] = {
            time: videoPlayer.currentTime,
            duration: videoPlayer.duration
        };
        Utils.setStorage(CONFIG.STORAGE_KEYS.RESUME_DATA, resumeData);
    },
    
    closePlayer() {
        const videoPlayer = document.getElementById('video-player');
        if (videoPlayer) {
            videoPlayer.pause();
            videoPlayer.src = '';
        }
        
        if (this.hlsInstance) {
            this.hlsInstance.destroy();
            this.hlsInstance = null;
        }
        
        if (this.playerjsInstance) {
            try {
                this.playerjsInstance.api('destroy');
            } catch (e) {}
            this.playerjsInstance = null;
        }
        
        this.stopPositionSaver();
        
        const playerContainer = document.getElementById('player-container');
        if (playerContainer) playerContainer.style.display = 'none';
        
        this.currentIndex = -1;
        this.renderEpisodes();
    },
    
    // loadFromURL পরিবর্তিত
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
            
            // ডিফল্ট লোড হলে isSaved = true (অর্থাৎ সেভ বাটন হাইড থাকবে)
            this.loadPlaylist(episodes, name || 'Playlist', isDefault); 
        } catch (error) {
            Utils.showToast('Failed to load playlist from URL. Try paste or upload.', 'error');
        }
    },
    
    // loadFromText পরিবর্তিত
    loadFromText(content, name) {
        if (!content.trim()) {
            Utils.showToast('Please paste M3U content', 'error');
            return;
        }
        const episodes = M3UParser.parse(content);
        // টেক্সট থেকে লোড হলে isSaved = false (অর্থাৎ সেভ বাটন দেখাবে)
        this.loadPlaylist(episodes, name || 'Pasted Playlist', false); 
    },
    
    // loadFromFile পরিবর্তিত
    loadFromFile(file) {
        Utils.showToast(`Loading ${file.name}...`, 'info');
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            const episodes = M3UParser.parse(content);
            // ফাইল থেকে লোড হলে isSaved = false (অর্থাৎ সেভ বাটন দেখাবে)
            this.loadPlaylist(episodes, file.name.replace(/\.[^/.]+$/, ""), false);
        };
        reader.readAsText(file);
    },
    
    // loadSavedPlaylist পরিবর্তিত (isSaved = true)
    loadSavedPlaylist(name) {
        const playlists = Utils.getStorage(CONFIG.STORAGE_KEYS.PLAYLISTS) || {};
        if (playlists[name]) {
            this.loadPlaylist(playlists[name].episodes, name, true); // সেভ করা প্লেলিস্ট লোড হলে বাটন হাইড
        }
    },
    
    // *** পরিবর্তিত ফাংশন: সেভ বাটন ক্লিক হলে নাম ইনপুট চাওয়া হবে ***
    saveCurrentPlaylist() {
        if (this.currentPlaylist.length === 0) {
            Utils.showToast('Load a playlist first!', 'error');
            return;
        }
        
        // প্লেলিস্টের নাম জিজ্ঞাসা করা
        const defaultName = this.currentPlaylist.playlistName || 'My New Playlist';
        const newName = prompt("Enter a name for the playlist:", defaultName);
        
        if (newName === null || newName.trim() === '') {
            Utils.showToast('Playlist save cancelled.', 'info');
            return;
        }
        
        const name = newName.trim();
        
        const playlists = Utils.getStorage(CONFIG.STORAGE_KEYS.PLAYLISTS) || {};
        
        // সেভ করার লজিক
        playlists[name] = { name, episodes: this.currentPlaylist };
        Utils.setStorage(CONFIG.STORAGE_KEYS.PLAYLISTS, playlists);
        
        // সেভ করার পর সেভ বাটন হাইড করা
        this.isSavedPlaylist = true;
        this.updateSaveButtonVisibility(false);
        
        Utils.showToast(`Saved "${name}" ✓`, 'success');
    }
    // *** পরিবর্তিত ফাংশন শেষ ***
};

// ===== Mobile Menu =====
function toggleMobileMenu() {
    document.getElementById('nav-menu').classList.toggle('active');
}

// ===== Tab System =====
function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');
    document.getElementById(`${tabName}-tab`)?.classList.add('active');
}

// ===== File Upload Handlers =====
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

// ===== Initialize App =====
document.addEventListener('DOMContentLoaded', () => {
    ThemeManager.init();
    Router.init();
    Player.init();
    setupFileUpload();
    
    Utils.showToast('Welcome to Flixoura! 🎬', 'info');
    
    setTimeout(() => {
        // ডিফল্ট প্লেলিস্ট লোড করার সময় isDefault = true সেট করা হয়েছে
        Player.loadFromURL(CONFIG.DEFAULT_PLAYLIST_URL, CONFIG.DEFAULT_PLAYLIST_NAME, true); 
    }, 500);
});

// ===== Keyboard Shortcuts =====
document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    
    if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        Player.nextEpisode();
    } else if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        Player.previousEpisode();
    } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        Player.switchPlayer();
    }
});
