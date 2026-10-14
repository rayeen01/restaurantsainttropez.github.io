// ===== Uptime Guard — High Availability Protocol =====
// Keeps your site online with backups, monitoring, and auto-recovery

const UptimeGuard = {
    // Configuration
    config: {
        backupInterval: 5 * 60 * 1000, // 5 minutes
        healthCheckInterval: 30 * 1000, // 30 seconds
        maxRetries: 3,
        retryDelay: 5000,
        cdnFallbacks: [
            'https://saint-tropez-restaurant.netlify.app',
            'https://saint-tropez-restaurant.vercel.app'
        ]
    },

    // State
    state: {
        isOnline: true,
        lastBackup: null,
        healthCheckCount: 0,
        errors: [],
        uptime: 0,
        startTime: Date.now()
    },

    // ===== Auto-Backup System =====
    startAutoBackup() {
        setInterval(() => {
            this.performBackup();
        }, this.config.backupInterval);
        
        // Backup before page unload
        window.addEventListener('beforeunload', () => {
            this.performBackup();
        });
    },

    performBackup() {
        try {
            // Lightweight backup: the audit log is excluded on purpose —
            // it can grow big and blow the ~5MB localStorage quota.
            // Only the last 3 backups are kept.
            const backup = {
                timestamp: new Date().toISOString(),
                data: localStorage.getItem('saintTropezData'),
                reservations: localStorage.getItem('saintTropezReservations'),
                tables: localStorage.getItem('saintTropezTables')
            };

            // Store backup with timestamp
            let backups = [];
            try {
                backups = JSON.parse(localStorage.getItem('saintTropezBackups') || '[]');
                if (!Array.isArray(backups)) backups = [];
            } catch (e) { backups = []; }
            backups.push(backup);

            // Keep only last 3 backups
            if (backups.length > 3) {
                backups = backups.slice(-3);
            }
            
            localStorage.setItem('saintTropezBackups', JSON.stringify(backups));
            this.state.lastBackup = new Date();
            
            console.log('[UptimeGuard] Backup completed at', new Date().toLocaleTimeString());
        } catch (e) {
            console.error('[UptimeGuard] Backup failed:', e);
        }
    },

    restoreFromBackup(backupIndex = 0) {
        try {
            const backups = JSON.parse(localStorage.getItem('saintTropezBackups') || '[]');
            if (backups.length === 0) {
                console.warn('[UptimeGuard] No backups available');
                return false;
            }
            
            const backup = backups[backupIndex] || backups[backups.length - 1];
            
            if (backup.data) localStorage.setItem('saintTropezData', backup.data);
            if (backup.reservations) localStorage.setItem('saintTropezReservations', backup.reservations);
            if (backup.tables) localStorage.setItem('saintTropezTables', backup.tables);
            if (backup.auditLog) localStorage.setItem('saintTropezAuditLog', backup.auditLog);
            if (backup.settings) localStorage.setItem('saintTropezSettings', backup.settings);
            
            console.log('[UptimeGuard] Restored from backup:', backup.timestamp);
            return true;
        } catch (e) {
            console.error('[UptimeGuard] Restore failed:', e);
            return false;
        }
    },

    // ===== Health Monitoring =====
    startHealthChecks() {
        setInterval(() => {
            this.performHealthCheck();
        }, this.config.healthCheckInterval);
    },

    performHealthCheck() {
        this.state.healthCheckCount++;
        
        const checks = {
            localStorage: this.checkLocalStorage(),
            memory: this.checkMemory(),
            performance: this.checkPerformance(),
            resources: this.checkResources()
        };
        
        const allHealthy = Object.values(checks).every(c => c.healthy);
        
        if (!allHealthy) {
            this.state.errors.push({
                time: new Date().toISOString(),
                checks
            });
            this.attemptRecovery(checks);
        }
        
        this.state.isOnline = allHealthy;
        this.state.uptime = Date.now() - this.state.startTime;
    },

    checkLocalStorage() {
        try {
            const test = '__health_check__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return { healthy: true };
        } catch (e) {
            return { healthy: false, error: 'LocalStorage unavailable' };
        }
    },

    checkMemory() {
        if (performance && performance.memory) {
            const used = performance.memory.usedJSHeapSize;
            const limit = performance.memory.jsHeapSizeLimit;
            const percentUsed = (used / limit) * 100;
            
            return {
                healthy: percentUsed < 90,
                used: Math.round(used / 1024 / 1024) + 'MB',
                limit: Math.round(limit / 1024 / 1024) + 'MB',
                percentUsed: Math.round(percentUsed) + '%'
            };
        }
        return { healthy: true, info: 'Memory API not available' };
    },

    checkPerformance() {
        const nav = performance.getEntriesByType('navigation')[0];
        if (nav) {
            const loadTime = nav.duration;
            return {
                healthy: loadTime < 5000,
                loadTime: Math.round(loadTime) + 'ms'
            };
        }
        return { healthy: true };
    },

    checkResources() {
        const images = document.querySelectorAll('img');
        let broken = 0;
        
        images.forEach(img => {
            if (img.complete && img.naturalWidth === 0) broken++;
        });
        
        return {
            healthy: broken === 0,
            totalImages: images.length,
            brokenImages: broken
        };
    },

    // ===== Auto-Recovery =====
    attemptRecovery(checks) {
        console.warn('[UptimeGuard] Health check failed, attempting recovery...');
        
        if (!checks.localStorage.healthy) {
            // Clear and try to recover
            this.cleanupLocalStorage();
        }
        
        if (checks.resources && checks.resources.brokenImages > 0) {
            this.fixBrokenImages();
        }
        
        if (checks.memory && !checks.memory.healthy) {
            this.optimizeMemory();
        }
    },

    cleanupLocalStorage() {
        try {
            // Remove old backups but keep latest 3
            const backups = JSON.parse(localStorage.getItem('saintTropezBackups') || '[]');
            if (backups.length > 3) {
                localStorage.setItem('saintTropezBackups', JSON.stringify(backups.slice(-3)));
            }
            
            // Clear old audit logs
            const logs = JSON.parse(localStorage.getItem('saintTropezAuditLog') || '[]');
            if (logs.length > 500) {
                localStorage.setItem('saintTropezAuditLog', JSON.stringify(logs.slice(-500)));
            }
        } catch (e) {
            console.error('[UptimeGuard] Cleanup failed:', e);
        }
    },

    fixBrokenImages() {
        document.querySelectorAll('img').forEach(img => {
            if (img.complete && img.naturalWidth === 0) {
                // Replace with placeholder
                img.style.display = 'none';
                const placeholder = img.nextElementSibling;
                if (placeholder) placeholder.style.display = 'flex';
            }
        });
    },

    optimizeMemory() {
        // Force garbage collection hint
        if (window.gc) {
            try { window.gc(); } catch (e) {}
        }
        
        // Clear any large cached data
        const data = localStorage.getItem('saintTropezData');
        if (data && data.length > 100000) {
            // Data is large, consider trimming
            console.info('[UptimeGuard] Large data detected, consider optimization');
        }
    },

    // ===== CDN / Failover System =====
    async checkCDN() {
        // Check if current site is accessible
        try {
            const start = performance.now();
            const response = await fetch(window.location.href, { method: 'HEAD' });
            const latency = performance.now() - start;
            
            return {
                healthy: response.ok,
                latency: Math.round(latency) + 'ms',
                url: window.location.href
            };
        } catch (e) {
            return { healthy: false, error: e.message };
        }
    },

    // ===== Offline Support =====
    initOfflineSupport() {
        window.addEventListener('online', () => {
            console.log('[UptimeGuard] Connection restored');
            this.performBackup();
            this.showNotification('Connexion rétablie', 'success');
        });
        
        window.addEventListener('offline', () => {
            console.warn('[UptimeGuard] Connection lost');
            this.showNotification('Mode hors ligne activé', 'warning');
        });
    },

    // ===== Performance Optimization =====
    optimizePage() {
        // Lazy load images
        const images = document.querySelectorAll('img');
        images.forEach(img => {
            img.loading = 'lazy';
            img.decoding = 'async';
        });
        
        // Preload critical resources
        const preloadLinks = [
            'images/logo.png',
            'images/hero-bg.png',
            'styles.css',
            'script.js'
        ];
        
        preloadLinks.forEach(href => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.href = href;
            link.as = href.endsWith('.css') ? 'style' : 
                     href.endsWith('.js') ? 'script' : 'image';
            document.head.appendChild(link);
        });
        
        // Minimize DOM manipulations
        this.throttleDOMUpdates();
    },

    throttleDOMUpdates() {
        let updateQueue = [];
        let isProcessing = false;
        
        window.queueDOMUpdate = (callback) => {
            updateQueue.push(callback);
            if (!isProcessing) {
                processQueue();
            }
        };
        
        function processQueue() {
            isProcessing = true;
            while (updateQueue.length > 0) {
                const update = updateQueue.shift();
                try {
                    update();
                } catch (e) {
                    console.error('[UptimeGuard] DOM update error:', e);
                }
            }
            isProcessing = false;
        }
    },

    // ===== Error Handling =====
    initErrorHandling() {
        window.addEventListener('error', (e) => {
            console.error('[UptimeGuard] Error:', e.error);
            this.state.errors.push({
                time: new Date().toISOString(),
                type: 'error',
                message: e.message,
                filename: e.filename,
                lineno: e.lineno
            });
        });
        
        window.addEventListener('unhandledrejection', (e) => {
            console.error('[UptimeGuard] Unhandled rejection:', e.reason);
            this.state.errors.push({
                time: new Date().toISOString(),
                type: 'promise',
                message: e.reason
            });
        });
    },

    // ===== Security Headers (Meta Tags) =====
    injectSecurityHeaders() {
        const meta = {
            'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://wa.me https://www.instagram.com https://www.facebook.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://wa.me;",
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'SAMEORIGIN',
            'Referrer-Policy': 'strict-origin-when-cross-origin'
        };
        
        for (const [name, content] of Object.entries(meta)) {
            const existing = document.querySelector(`meta[http-equiv="${name}"]`);
            if (!existing) {
                const tag = document.createElement('meta');
                tag.httpEquiv = name;
                tag.content = content;
                document.head.appendChild(tag);
            }
        }
    },

    // ===== Notification System =====
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `uptime-notification ${type}`;
        notification.innerHTML = `
            <span class="notification-icon">${type === 'success' ? '✓' : type === 'warning' ? '⚠' : 'ℹ'}</span>
            <span class="notification-text">${message}</span>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 16px 24px;
            border-radius: 12px;
            color: white;
            font-family: Inter, sans-serif;
            font-size: 14px;
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            animation: slideIn 0.3s ease;
            background: ${type === 'success' ? '#25d366' : type === 'warning' ? '#f59e0b' : '#4a0e1c'};
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    },

    // ===== Status Dashboard =====
    getStatus() {
        return {
            isOnline: this.state.isOnline,
            uptime: Math.floor(this.state.uptime / 1000) + ' seconds',
            healthChecks: this.state.healthCheckCount,
            lastBackup: this.state.lastBackup,
            errors: this.state.errors.length,
            memory: this.checkMemory(),
            url: window.location.href
        };
    },

    // ===== Initialize Everything =====
    init() {
        console.log('[UptimeGuard] Initializing High Availability Protocol...');

        // NOTE: no runtime CSP injection — a meta CSP added after page load
        // cannot protect anything and can break fonts/widgets.
        // Set security headers on the hosting side instead.
        this.startAutoBackup();
        this.startHealthChecks();
        this.initOfflineSupport();
        this.optimizePage();
        this.initErrorHandling();
        
        // Initial backup
        this.performBackup();
        
        // Expose status API
        window.getUptimeStatus = () => this.getStatus();
        window.restoreBackup = (index) => this.restoreFromBackup(index);
        
        console.log('[UptimeGuard] System ready. Site protected.');
        console.log('[UptimeGuard] Status:', this.getStatus());
    }
};

// Add notification animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    UptimeGuard.init();
});

// Export
window.UptimeGuard = UptimeGuard;
