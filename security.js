// ===== Security System for Saint Tropez Restaurant =====

const SecuritySystem = {
    // Configuration
    config: {
        maxLoginAttempts: 5,
        lockoutDuration: 15 * 60 * 1000, // 15 minutes
        sessionTimeout: 30 * 60 * 1000, // 30 minutes
        passwordMinLength: 6,
        hashSalt: 'SaintTropez2026@Secure'
    },

    // ===== Password Hashing (SHA-256 with fallback for file://) =====
    async hashPassword(password) {
        const salted = this.config.hashSalt + password + this.config.hashSalt;
        try {
            if (window.crypto && crypto.subtle) {
                const encoder = new TextEncoder();
                const data = encoder.encode(salted);
                const hashBuffer = await crypto.subtle.digest('SHA-256', data);
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            }
        } catch (e) {
            // fall through to fallback hash below
        }
        // Fallback hash (FNV-1a + salt) for non-secure contexts like file://
        let h1 = 0x811c9dc5, h2 = 0x01000193;
        for (let i = 0; i < salted.length; i++) {
            const c = salted.charCodeAt(i);
            h1 = Math.imul(h1 ^ c, 16777619);
            h2 = Math.imul(h2 ^ (c + i), 16777619);
        }
        return 'fb_' + (h1 >>> 0).toString(16) + (h2 >>> 0).toString(16);
    },

    // ===== Session Management =====
    createSession(username, role = 'admin') {
        const session = {
            username,
            role,
            loginTime: Date.now(),
            lastActivity: Date.now(),
            sessionId: this.generateSessionId()
        };
        localStorage.setItem('saintTropezSession', JSON.stringify(session));
        return session;
    },

    getSession() {
        const session = localStorage.getItem('saintTropezSession');
        if (!session) return null;
        
        const parsed = JSON.parse(session);
        const now = Date.now();
        
        // Check session timeout
        if (now - parsed.lastActivity > this.config.sessionTimeout) {
            this.destroySession();
            return null;
        }
        
        // Update last activity
        parsed.lastActivity = now;
        localStorage.setItem('saintTropezSession', JSON.stringify(parsed));
        
        return parsed;
    },

    destroySession() {
        localStorage.removeItem('saintTropezSession');
    },

    isAuthenticated() {
        return this.getSession() !== null;
    },

    generateSessionId() {
        return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    },

    // ===== Login Attempt Limiting =====
    getLoginAttempts() {
        const attempts = localStorage.getItem('saintTropezLoginAttempts');
        return attempts ? JSON.parse(attempts) : { count: 0, lastAttempt: 0, locked: false };
    },

    recordLoginAttempt() {
        const attempts = this.getLoginAttempts();
        const now = Date.now();
        
        // Reset if lockout duration has passed
        if (attempts.locked && now - attempts.lastAttempt > this.config.lockoutDuration) {
            attempts.count = 0;
            attempts.locked = false;
        }
        
        attempts.count++;
        attempts.lastAttempt = now;
        
        if (attempts.count >= this.config.maxLoginAttempts) {
            attempts.locked = true;
        }
        
        localStorage.setItem('saintTropezLoginAttempts', JSON.stringify(attempts));
        return attempts;
    },

    isLockedOut() {
        const attempts = this.getLoginAttempts();
        if (!attempts.locked) return false;
        
        const now = Date.now();
        if (now - attempts.lastAttempt > this.config.lockoutDuration) {
            // Auto-unlock after duration
            attempts.count = 0;
            attempts.locked = false;
            localStorage.setItem('saintTropezLoginAttempts', JSON.stringify(attempts));
            return false;
        }
        
        return true;
    },

    getLockoutTimeRemaining() {
        const attempts = this.getLoginAttempts();
        if (!attempts.locked) return 0;
        
        const now = Date.now();
        const remaining = this.config.lockoutDuration - (now - attempts.lastAttempt);
        return Math.ceil(remaining / 1000); // Return seconds
    },

    resetLoginAttempts() {
        localStorage.removeItem('saintTropezLoginAttempts');
    },

    // ===== Input Sanitization (XSS Prevention) =====
    sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;',
            '/': '&#x2F;',
            '`': '&#x60;'
        };
        
        return input.replace(/[&<>"'/`]/g, char => map[char]);
    },

    sanitizeObject(obj) {
        const sanitized = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                sanitized[key] = this.sanitizeInput(obj[key]);
            }
        }
        return sanitized;
    },

    // ===== Audit Logging =====
    logAction(action, details = {}) {
        const session = this.getSession();
        const logEntry = {
            timestamp: new Date().toISOString(),
            action,
            user: session ? session.username : 'anonymous',
            ip: 'client-side', // In real app, this would be server-side
            details
        };
        
        const logs = JSON.parse(localStorage.getItem('saintTropezAuditLog') || '[]');
        logs.push(logEntry);
        
        // Keep only last 1000 entries
        if (logs.length > 1000) {
            logs.shift();
        }
        
        localStorage.setItem('saintTropezAuditLog', JSON.stringify(logs));
    },

    getAuditLog() {
        return JSON.parse(localStorage.getItem('saintTropezAuditLog') || '[]');
    },

    clearAuditLog() {
        localStorage.removeItem('saintTropezAuditLog');
    },

    // ===== Role-Based Access =====
    hasPermission(requiredRole) {
        const session = this.getSession();
        if (!session) return false;
        
        const roles = {
            'superadmin': 3,
            'admin': 2,
            'staff': 1
        };
        
        const userLevel = roles[session.role] || 0;
        const requiredLevel = roles[requiredRole] || 0;
        
        return userLevel >= requiredLevel;
    },

    // ===== Secure Data Storage =====
    secureSet(key, value) {
        try {
            const encrypted = this.encryptData(JSON.stringify(value));
            localStorage.setItem(key, encrypted);
        } catch (e) {
            console.error('Secure storage error:', e);
        }
    },

    secureGet(key) {
        try {
            const encrypted = localStorage.getItem(key);
            if (!encrypted) return null;
            const decrypted = this.decryptData(encrypted);
            return JSON.parse(decrypted);
        } catch (e) {
            console.error('Secure retrieval error:', e);
            return null;
        }
    },

    // Simple encryption (for demonstration - use proper encryption in production)
    encryptData(data) {
        return btoa(encodeURIComponent(data));
    },

    decryptData(encrypted) {
        return decodeURIComponent(atob(encrypted));
    },

    // ===== CSRF Protection =====
    generateCSRFToken() {
        const token = 'csrf_' + Date.now() + '_' + Math.random().toString(36).substr(2, 12);
        sessionStorage.setItem('saintTropezCSRFToken', token);
        return token;
    },

    validateCSRFToken(token) {
        const stored = sessionStorage.getItem('saintTropezCSRFToken');
        return stored === token;
    },

    // ===== Rate Limiting =====
    rateLimiter: {},
    
    checkRateLimit(action, maxRequests = 10, windowMs = 60000) {
        const now = Date.now();
        const key = action;
        
        if (!this.rateLimiter[key]) {
            this.rateLimiter[key] = [];
        }
        
        // Remove old entries
        this.rateLimiter[key] = this.rateLimiter[key].filter(
            timestamp => now - timestamp < windowMs
        );
        
        if (this.rateLimiter[key].length >= maxRequests) {
            return false; // Rate limited
        }
        
        this.rateLimiter[key].push(now);
        return true;
    },

    // ===== Form Validation =====
    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },

    validatePhone(phone) {
        const re = /^[\d\s+\-()]{8,20}$/;
        return re.test(phone);
    },

    validateRequired(value) {
        return value && value.trim().length > 0;
    },

    // ===== Security Headers (for reference - should be set server-side) =====
    getSecurityHeaders() {
        return {
            'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' https://fonts.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com;",
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
            'X-XSS-Protection': '1; mode=block',
            'Referrer-Policy': 'strict-origin-when-cross-origin'
        };
    },

    // ===== Output escaping (use on render, never while typing) =====
    escapeHtml(input) {
        if (typeof input !== 'string') return input;
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;'
        };
        return input.replace(/[&<>"']/g, char => map[char]);
    },

    // ===== Initialize Security =====
    init() {
        // NOTE: no live input sanitization on purpose — it corrupts URLs
        // (encodes "/") and breaks typing. Sanitize/escape only on output.

        // Periodic session check — admin page only. Never reload the
        // public site; just send back to the login screen on the admin page.
        const isAdminPage = /admin\.html$/.test(window.location.pathname);
        if (isAdminPage) {
            setInterval(() => {
                const raw = localStorage.getItem('saintTropezSession');
                if (raw) {
                    try {
                        const parsed = JSON.parse(raw);
                        if (Date.now() - parsed.lastActivity > this.config.sessionTimeout) {
                            this.destroySession();
                            const panel = document.getElementById('admin-panel');
                            const login = document.getElementById('login-screen');
                            if (panel) panel.style.display = 'none';
                            if (login) login.style.display = 'flex';
                        }
                    } catch (e) {
                        this.destroySession();
                    }
                }
            }, 60000); // Check every minute
        }
    }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    SecuritySystem.init();
});

// Export for use in other scripts
window.SecuritySystem = SecuritySystem;
