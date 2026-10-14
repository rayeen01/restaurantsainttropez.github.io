// ===== DEV Console — full low-level control =====

const DEV_USERNAME = 'dev';
const DEFAULT_DEV_PASSWORD = 'DevTropez#2026!Root';

const THEME_VARS = [
    { key: '--color-primary', label: 'Bordeaux principal' },
    { key: '--color-primary-light', label: 'Bordeaux clair' },
    { key: '--color-primary-dark', label: 'Bordeaux foncé' },
    { key: '--color-accent', label: 'Doré (accent)' },
    { key: '--color-accent-light', label: 'Doré clair' },
    { key: '--color-bg', label: 'Fond crème' }
];
const THEME_DEFAULTS = {
    '--color-primary': '#4a0e1c',
    '--color-primary-light': '#6b1a2d',
    '--color-primary-dark': '#2d0a12',
    '--color-accent': '#c9a96e',
    '--color-accent-light': '#e0c99a',
    '--color-bg': '#faf5f0'
};

// ===== Small helpers (standalone, no dependency on admin.js) =====
function devEsc(value) {
    if (value === null || value === undefined) return '';
    return String(value).replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;'
    }[c]));
}

function devRead(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
        return fallback;
    }
}

function devWrite(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

function getUsers() {
    const arr = devRead('saintTropezUsers', []);
    return Array.isArray(arr) ? arr : [];
}

function saveUsers(users) {
    devWrite('saintTropezUsers', users);
}

const devUsersReady = (async function seedDev() {
    const users = getUsers();
    if (!users.some(u => u.username === DEV_USERNAME)) {
        users.push({
            username: DEV_USERNAME,
            passHash: await SecuritySystem.hashPassword(DEFAULT_DEV_PASSWORD),
            role: 'developer',
            active: true,
            createdAt: new Date().toISOString()
        });
        saveUsers(users);
    }
})();

function devToast(message) {
    const toast = document.getElementById('dev-toast');
    document.getElementById('dev-toast-message').textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function devCurrentUser() {
    const session = SecuritySystem.getSession();
    if (!session) return null;
    const u = getUsers().find(x => x.username === session.username);
    return (u && u.active !== false && u.role === 'developer') ? u : null;
}

// ===== Login =====
const devLoginForm = document.getElementById('dev-login-form');
if (devLoginForm) {
    devLoginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await devUsersReady;

        if (SecuritySystem.isLockedOut()) {
            devToast(`Verrouillé. Réessayez dans ${SecuritySystem.getLockoutTimeRemaining()}s.`);
            return;
        }

        const username = document.getElementById('dev-username').value.trim().toLowerCase();
        const password = document.getElementById('dev-password').value;
        const user = getUsers().find(u => u.username === username);

        if (!user || user.active === false || user.role !== 'developer') {
            SecuritySystem.recordLoginAttempt();
            devToast('Accès développeur uniquement.');
            return;
        }

        if ((await SecuritySystem.hashPassword(password)) === user.passHash) {
            SecuritySystem.resetLoginAttempts();
            SecuritySystem.createSession(user.username, user.role);
            SecuritySystem.logAction('dev_login', { username: user.username });
            document.getElementById('dev-login-screen').style.display = 'none';
            document.getElementById('dev-panel').style.display = 'flex';
            initDev();
            devToast(`Bienvenue ${user.username} !`);
        } else {
            const attempts = SecuritySystem.recordLoginAttempt();
            devToast(attempts.locked ? 'Verrouillé 15 minutes !' : 'Mot de passe incorrect.');
        }
    });
}

const devLogoutBtn = document.getElementById('dev-logout-btn');
if (devLogoutBtn) {
    devLogoutBtn.addEventListener('click', () => {
        SecuritySystem.destroySession();
        document.getElementById('dev-panel').style.display = 'none';
        document.getElementById('dev-login-screen').style.display = 'flex';
    });
}

// ===== Tabs =====
const dTitles = {
    overview: ['Aperçu', 'État général'],
    theme: ['Thème & couleurs', 'Petits détails visuels'],
    sections: ['Sections', 'Afficher / masquer'],
    texts: ['Textes', 'Slogans FR / AR'],
    tables: ['Tables (détails)', 'Positions au pourcent près'],
    data: ['Données & danger', 'Export, import, reset'],
    users: ['Utilisateurs', 'Tous rôles']
};

document.querySelectorAll('.dnav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.dnav-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('#dev-panel .tab-content').forEach(c => c.classList.remove('active'));
        document.getElementById('dtab-' + btn.dataset.dtab).classList.add('active');
        const info = dTitles[btn.dataset.dtab];
        if (info) {
            document.getElementById('dev-page-title').textContent = info[0];
            document.getElementById('dev-page-subtitle').textContent = info[1];
        }
    });
});

// ===== Overview =====
function renderDevOverview() {
    const stats = document.getElementById('dev-stats');
    const store = document.getElementById('dev-storage-info');
    if (!stats) return;

    const count = (k) => {
        const v = devRead(k, null);
        if (Array.isArray(v)) return v.length;
        return v ? 1 : 0;
    };
    const tables = TableManagement.getTables();

    stats.innerHTML = `
        <div class="stat-card"><div class="stat-info"><span class="stat-value">${count('saintTropezReservations')}</span><span class="stat-label">Réservations</span></div></div>
        <div class="stat-card"><div class="stat-info"><span class="stat-value">${tables.length}</span><span class="stat-label">Tables</span></div></div>
        <div class="stat-card"><div class="stat-info"><span class="stat-value">${getUsers().length}</span><span class="stat-label">Utilisateurs</span></div></div>
        <div class="stat-card"><div class="stat-info"><span class="stat-value">${count('saintTropezAuditLog')}</span><span class="stat-label">Logs audit</span></div></div>
    `;

    let bytes = 0;
    for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        bytes += (localStorage.getItem(k) || '').length * 2;
    }
    const kb = Math.round(bytes / 1024);
    if (store) {
        store.innerHTML = `<p style="font-size:0.9rem;">Stockage local utilisé : <strong>${kb} KB</strong> / ~5000 KB ${kb > 4000 ? '⚠️ presque plein' : '✓'}</p>`;
    }
}

// ===== Theme =====
function renderThemeFields() {
    const wrap = document.getElementById('theme-fields');
    if (!wrap) return;
    const saved = devRead('saintTropezTheme', {});
    wrap.innerHTML = THEME_VARS.map(v => {
        const val = saved[v.key] || THEME_DEFAULTS[v.key];
        return `
        <div class="theme-row">
            <label>${v.label}</label>
            <input type="color" data-tkey="${v.key}" value="${val}">
            <code>${v.key}</code>
        </div>`;
    }).join('');

    wrap.querySelectorAll('input[type="color"]').forEach(input => {
        input.addEventListener('input', () => {
            document.documentElement.style.setProperty(input.dataset.tkey, input.value);
        });
    });
}

const themeSave = document.getElementById('theme-save');
if (themeSave) {
    themeSave.addEventListener('click', () => {
        const theme = {};
        document.querySelectorAll('#theme-fields input[type="color"]').forEach(input => {
            theme[input.dataset.tkey] = input.value;
        });
        devWrite('saintTropezTheme', theme);
        devToast('Thème enregistré — visible sur le site !');
    });
}

const themeReset = document.getElementById('theme-reset');
if (themeReset) {
    themeReset.addEventListener('click', () => {
        localStorage.removeItem('saintTropezTheme');
        Object.keys(THEME_DEFAULTS).forEach(k => document.documentElement.style.removeProperty(k));
        renderThemeFields();
        devToast('Thème réinitialisé.');
    });
}

// ===== Sections =====
function loadSections() {
    const s = devRead('saintTropezSections', {});
    ['video', 'events', 'gallery', 'reviews'].forEach(k => {
        const el = document.getElementById('sec-' + k);
        if (el) el.checked = s[k] !== false;
    });
}

const sectionsSave = document.getElementById('sections-save');
if (sectionsSave) {
    sectionsSave.addEventListener('click', () => {
        const s = {};
        ['video', 'events', 'gallery', 'reviews'].forEach(k => {
            const el = document.getElementById('sec-' + k);
            s[k] = el ? el.checked : true;
        });
        devWrite('saintTropezSections', s);
        devToast('Sections enregistrées !');
    });
}

// ===== Texts =====
function loadTexts() {
    const t = devRead('saintTropezI18n', { fr: {}, ar: {} });
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ''; };
    set('txt-fr-subtitle', (t.fr || {}).subtitle);
    set('txt-fr-tagline', (t.fr || {}).tagline);
    set('txt-ar-subtitle', (t.ar || {}).subtitle);
    set('txt-ar-tagline', (t.ar || {}).tagline);
}

const textsSave = document.getElementById('texts-save');
if (textsSave) {
    textsSave.addEventListener('click', () => {
        const v = (id) => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
        devWrite('saintTropezI18n', {
            fr: { subtitle: v('txt-fr-subtitle'), tagline: v('txt-fr-tagline') },
            ar: { subtitle: v('txt-ar-subtitle'), tagline: v('txt-ar-tagline') }
        });
        devToast('Textes enregistrés !');
    });
}

// ===== Tables (precise details) =====
function renderDevTables() {
    const list = document.getElementById('dev-tables-list');
    if (!list) return;
    const tables = TableManagement.getTables();
    list.innerHTML = `
        <div class="coord-grid" style="font-weight:700;color:var(--color-primary);">
            <span>Table</span><span>X %</span><span>Y %</span><span>Places</span><span></span>
        </div>` + tables.map(t => `
        <div class="coord-grid">
            <span><strong>${devEsc(t.name)}</strong><br><small>${t.isVip ? 'VIP' : t.isOutdoor ? 'Terrasse' : t.shape} · ${t.status}</small></span>
            <input type="number" id="dx-${t.id}" value="${t.x}" min="0" max="95">
            <input type="number" id="dy-${t.id}" value="${t.y}" min="0" max="90">
            <input type="number" id="dc-${t.id}" value="${t.capacity}" min="1" max="20">
            <button class="btn btn-primary" style="padding:8px 14px;" onclick="devApplyTable('${t.id}')">OK</button>
        </div>
    `).join('');
}

function devApplyTable(id) {
    const x = parseInt(document.getElementById('dx-' + id).value, 10);
    const y = parseInt(document.getElementById('dy-' + id).value, 10);
    const capacity = parseInt(document.getElementById('dc-' + id).value, 10);
    TableManagement.updateTable(id, {
        x: isNaN(x) ? 50 : Math.max(0, Math.min(95, x)),
        y: isNaN(y) ? 50 : Math.max(0, Math.min(90, y)),
        capacity: isNaN(capacity) ? 2 : Math.max(1, Math.min(20, capacity))
    });
    devToast('Table mise à jour !');
    renderDevTables();
}

// ===== Data tools =====
const dataExport = document.getElementById('data-export');
if (dataExport) {
    dataExport.addEventListener('click', () => {
        const dump = {};
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith('saintTropez')) dump[k] = localStorage.getItem(k);
        }
        const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'saint-tropez-backup-' + new Date().toISOString().split('T')[0] + '.json';
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 5000);
        devToast('Export téléchargé !');
    });
}

const dataImport = document.getElementById('data-import');
const dataImportFile = document.getElementById('data-import-file');
if (dataImport && dataImportFile) {
    dataImport.addEventListener('click', () => dataImportFile.click());
    dataImportFile.addEventListener('change', () => {
        const f = dataImportFile.files && dataImportFile.files[0];
        if (!f) return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const dump = JSON.parse(reader.result);
                if (!dump || typeof dump !== 'object') throw new Error('bad file');
                let n = 0;
                Object.keys(dump).forEach(k => {
                    if (k.startsWith('saintTropez') && typeof dump[k] === 'string') {
                        localStorage.setItem(k, dump[k]);
                        n++;
                    }
                });
                devToast(`Import OK : ${n} clés restaurées.`);
            } catch (e) {
                devToast('Fichier invalide.');
            }
            dataImportFile.value = '';
        };
        reader.readAsText(f);
    });
}

const dataWipe = document.getElementById('data-wipe');
if (dataWipe) {
    dataWipe.addEventListener('click', () => {
        if (!confirm('EFFACER TOUT ? Cette action est irréversible.')) return;
        if (!confirm('Vraiment tout effacer ?')) return;
        Object.keys(localStorage)
            .filter(k => k.startsWith('saintTropez'))
            .forEach(k => localStorage.removeItem(k));
        devToast('Tout effacé. Rechargez la page.');
    });
}

// ===== Users (all roles) =====
function renderDevUsers() {
    const list = document.getElementById('dev-users-list');
    if (!list) return;
    const users = getUsers();
    const me = devCurrentUser();
    const badge = (r) => `<span class="role-badge ${r}">${r.toUpperCase()}</span>`;
    list.innerHTML = users.map(u => `
        <div class="user-item">
            <div class="user-avatar">${devEsc(u.username.charAt(0).toUpperCase())}</div>
            <div class="user-meta">
                <h4>${devEsc(u.username)}</h4>
                <div class="user-pw">🔑 <code class="pw-val">••••••</code> <button type="button" class="pw-toggle" data-pw="${devEsc(u.pass || '')}" onclick="devTogglePw(this)">Voir</button></div>
                ${badge(u.role)}
                <span class="user-status ${u.active === false ? 'off' : 'on'}"> · ${u.active === false ? 'Désactivé' : 'Actif'}</span>
            </div>
            <div class="menu-item-actions">
                <button class="btn-icon btn-edit" onclick="devResetPw('${devEsc(u.username)}')" title="Mot de passe">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>
                </button>
                ${me && u.username !== me.username ? `
                <button class="btn-icon btn-edit" onclick="devToggle('${devEsc(u.username)}')" title="Activer/Désactiver">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/></svg>
                </button>
                <button class="btn-icon btn-delete" onclick="devDelete('${devEsc(u.username)}')" title="Supprimer">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                </button>` : ''}
            </div>
        </div>
    `).join('');
}

function devModal(title, html) {
    document.getElementById('dev-modal-title').textContent = title;
    document.getElementById('dev-modal-body').innerHTML = html;
    document.getElementById('dev-modal').classList.add('active');
}

function devCloseModal() {
    document.getElementById('dev-modal').classList.remove('active');
}

const devModalClose = document.getElementById('dev-modal-close');
if (devModalClose) devModalClose.addEventListener('click', devCloseModal);
document.querySelector('#dev-modal .modal-overlay').addEventListener('click', devCloseModal);

function devResetPw(username) {
    devModal('Mot de passe — ' + username, `
        <form id="dev-reset-form">
            <div class="form-group">
                <label>Nouveau mot de passe (min. 6)</label>
                <input type="password" id="dev-reset-value" required minlength="6">
            </div>
            <button type="submit" class="btn btn-primary">Enregistrer</button>
        </form>
    `);
    document.getElementById('dev-reset-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const pw = document.getElementById('dev-reset-value').value;
        if (pw.length < 6) return;
        const users = getUsers();
        const u = users.find(x => x.username === username);
        if (!u) return;
        u.passHash = await SecuritySystem.hashPassword(pw);
        u.pass = pw;
        saveUsers(users);
        devCloseModal();
        devToast('Mot de passe mis à jour !');
    });
}

function devTogglePw(btn) {
    const code = btn.parentElement.querySelector('.pw-val');
    if (!code) return;
    if (btn.dataset.open === '1') {
        code.textContent = '••••••';
        btn.textContent = 'Voir';
        btn.dataset.open = '0';
    } else {
        const real = btn.getAttribute('data-pw') || '';
        code.textContent = real || '(ancien — réinitialisez)';
        btn.textContent = 'Cacher';
        btn.dataset.open = '1';
    }
}

function devToggle(username) {
    const users = getUsers();
    const u = users.find(x => x.username === username);
    if (!u) return;
    const me = devCurrentUser();
    if (me && u.username === me.username) {
        devToast('Impossible sur soi-même.');
        return;
    }
    u.active = u.active === false ? true : false;
    saveUsers(users);
    renderDevUsers();
    devToast(u.active ? 'Activé.' : 'Désactivé.');
}

function devDelete(username) {
    const users = getUsers();
    const u = users.find(x => x.username === username);
    if (!u) return;
    const me = devCurrentUser();
    if (me && u.username === me.username) {
        devToast('Impossible sur soi-même.');
        return;
    }
    if (u.role === 'owner' && users.filter(x => x.role === 'owner' && x.active !== false).length <= 1) {
        devToast('Dernier OWNER protégé.');
        return;
    }
    if (u.role === 'developer' && users.filter(x => x.role === 'developer' && x.active !== false).length <= 1) {
        devToast('Dernier développeur protégé.');
        return;
    }
    if (!confirm(`Supprimer ${username} ?`)) return;
    saveUsers(users.filter(x => x.username !== username));
    renderDevUsers();
    devToast('Supprimé.');
}

const devAddUserForm = document.getElementById('dev-add-user-form');
if (devAddUserForm) {
    devAddUserForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('dev-new-username').value.trim().toLowerCase();
        const pw = document.getElementById('dev-new-password').value;
        const role = document.getElementById('dev-new-role').value;
        if (!/^[a-z0-9._-]{3,20}$/.test(username)) {
            devToast('Pseudo invalide.');
            return;
        }
        if (pw.length < 6) {
            devToast('6 caractères minimum.');
            return;
        }
        if (getUsers().some(u => u.username === username)) {
            devToast('Nom déjà pris.');
            return;
        }
        const users = getUsers();
        users.push({
            username,
            passHash: await SecuritySystem.hashPassword(pw),
            pass: pw,
            role,
            active: true,
            createdAt: new Date().toISOString()
        });
        saveUsers(users);
        devAddUserForm.reset();
        renderDevUsers();
        devToast(`Créé : ${username} (${role})`);
    });
}

// ===== Init =====
function initDev() {
    const me = devCurrentUser();
    const badge = document.getElementById('dev-user-badge');
    if (badge && me) {
        badge.style.display = 'inline-block';
        badge.innerHTML = `Connecté : <strong>${devEsc(me.username)}</strong> · <span class="role-developer" style="color:#4ade80;font-weight:700;">DEVELOPER</span>`;
    }
    renderDevOverview();
    renderThemeFields();
    loadSections();
    loadTexts();
    renderDevTables();
    renderDevUsers();
}

window.devTogglePw = devTogglePw;
window.devApplyTable = devApplyTable;
window.devResetPw = devResetPw;
window.devToggle = devToggle;
window.devDelete = devDelete;
