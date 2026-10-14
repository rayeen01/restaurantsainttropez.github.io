// ===== Admin Dashboard JavaScript =====

// ===== Multi-User Authentication (Owner + Staff) =====
const USERS_KEY = 'saintTropezUsers';
const OWNER_USERNAME = 'owner';
// MOT DE PASSE SPECIAL DU OWNER — changez-le après la première connexion (Paramètres)
const DEFAULT_OWNER_PASSWORD = 'TropezOwner#2026';

// Tabs allowed per role. Owner = accès total, staff = limité.
const TAB_PERMISSIONS = {
    dashboard: ['owner', 'staff'],
    reservations: ['owner', 'staff'],
    tables: ['owner', 'staff'],
    reviews: ['owner', 'staff'],
    info: ['owner'],
    menu: ['owner'],
    gallery: ['owner'],
    events: ['owner'],
    video: ['owner'],
    security: ['owner'],
    users: ['owner'],
    settings: ['owner']
};

function getUsers() {
    try {
        const raw = localStorage.getItem(USERS_KEY);
        const arr = raw ? JSON.parse(raw) : [];
        return Array.isArray(arr) ? arr : [];
    } catch (e) {
        return [];
    }
}

function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function findUser(username) {
    if (!username) return null;
    return getUsers().find(u => u.username === String(username).toLowerCase()) || null;
}

// Seed the owner account on first load
const usersReady = (async function seedOwner() {
    const users = getUsers();
    if (!users.some(u => u.role === 'owner' && u.active !== false)) {
        const hash = await SecuritySystem.hashPassword(DEFAULT_OWNER_PASSWORD);
        users.push({
            username: OWNER_USERNAME,
            passHash: hash,
            role: 'owner',
            active: true,
            createdAt: new Date().toISOString()
        });
        saveUsers(users);
    }
})();

function currentUser() {
    const session = SecuritySystem.getSession();
    if (!session) return null;
    const u = findUser(session.username);
    if (!u || u.active === false) return null;
    return u;
}

function isOwner() {
    const u = currentUser();
    return !!u && u.role === 'owner';
}

function canAccess(tab) {
    const u = currentUser();
    if (!u) return false;
    if (u.role === 'owner') return true;
    return (TAB_PERMISSIONS[tab] || []).includes(u.role);
}

function applyPermissions() {
    const u = currentUser();
    const badge = document.getElementById('user-badge');
    if (badge && u) {
        badge.style.display = 'inline-block';
        badge.innerHTML = `Connecté : <strong>${esc(u.username)}</strong> · <span class="role-${u.role}">${u.role === 'owner' ? 'OWNER' : 'STAFF'}</span>`;
    } else if (badge) {
        badge.style.display = 'none';
    }
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.style.display = canAccess(btn.dataset.tab) ? '' : 'none';
    });
    // If the visible tab is not allowed, fall back to dashboard
    const activeBtn = document.querySelector('.nav-btn.active');
    if (activeBtn && !canAccess(activeBtn.dataset.tab)) {
        const dash = document.querySelector('.nav-btn[data-tab="dashboard"]');
        if (dash) dash.click();
    }
}

// Login handler with security
const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        await usersReady;

        // Check if locked out
        if (SecuritySystem.isLockedOut()) {
            const remaining = SecuritySystem.getLockoutTimeRemaining();
            showToast(`Compte verrouillé. Réessayez dans ${remaining} secondes.`);
            return;
        }

        const username = document.getElementById('username').value.trim().toLowerCase();
        const password = document.getElementById('password').value;
        const user = findUser(username);

        if (!user || user.active === false) {
            SecuritySystem.recordLoginAttempt();
            SecuritySystem.logAction('login_failed', { username, reason: 'unknown_or_disabled' });
            showToast('Utilisateur inconnu ou désactivé.');
            return;
        }

        if (user.role === 'developer') {
            showToast('Compte développeur : connectez-vous via dev.html.');
            return;
        }

        const hashedInput = await SecuritySystem.hashPassword(password);

        if (hashedInput === user.passHash) {
            // Successful login
            SecuritySystem.resetLoginAttempts();
            SecuritySystem.createSession(user.username, user.role);
            SecuritySystem.logAction('login_success', { username: user.username, role: user.role });

            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('admin-panel').style.display = 'flex';
            initDashboard();
            showToast(`Bienvenue ${user.username} !`);
        } else {
            // Failed login
            const attempts = SecuritySystem.recordLoginAttempt();
            SecuritySystem.logAction('login_failed', { username, attempt: attempts.count });

            if (attempts.locked) {
                showToast('Compte verrouillé pendant 15 minutes!');
            } else {
                const remaining = 5 - attempts.count;
                showToast(`Mot de passe incorrect. ${remaining} tentatives restantes.`);
            }
        }
    });
}

// Logout handler
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', function() {
        const me = currentUser();
        SecuritySystem.logAction('logout', { username: me ? me.username : 'unknown' });
        SecuritySystem.destroySession();
        document.getElementById('admin-panel').style.display = 'none';
        document.getElementById('login-screen').style.display = 'flex';
        showToast('Déconnexion réussie');
    });
}

// ===== Tab Navigation =====
const navBtns = document.querySelectorAll('.nav-btn');
const tabContents = document.querySelectorAll('.tab-content');
const pageTitle = document.getElementById('page-title');
const pageSubtitle = document.getElementById('page-subtitle');

const tabInfo = {
    dashboard: { title: 'Dashboard', subtitle: "Vue d'ensemble de votre restaurant" },
    info: { title: 'Infos Restaurant', subtitle: 'Modifiez les informations de votre restaurant' },
    menu: { title: 'Menu', subtitle: 'Gérez vos plats et cartes' },
    gallery: { title: 'Galerie', subtitle: 'Gérez vos photos' },
    events: { title: 'Événements', subtitle: 'Gérez vos événements spéciaux' },
    video: { title: 'Vidéos', subtitle: 'Gérez vos vidéos de présentation' },
    reviews: { title: 'Avis', subtitle: 'Gérez les avis clients' },
    reservations: { title: 'Réservations', subtitle: 'Consultez les demandes de réservation' },
    tables: { title: 'Tables', subtitle: 'Gérez les tables et le plan de la salle' },
    security: { title: 'Sécurité', subtitle: 'État de la sécurité et journal d\'audit' },
    users: { title: 'Utilisateurs', subtitle: 'Le OWNER gère les accès' },
    settings: { title: 'Paramètres', subtitle: 'Configuration du dashboard' }
};

navBtns.forEach(btn => {
    btn.addEventListener('click', function() {
        const tab = this.dataset.tab;

        if (!canAccess(tab)) {
            showToast('Accès réservé au OWNER.');
            return;
        }

        navBtns.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        
        tabContents.forEach(content => content.classList.remove('active'));
        document.getElementById('tab-' + tab).classList.add('active');
        
        if (tabInfo[tab]) {
            pageTitle.textContent = tabInfo[tab].title;
            pageSubtitle.textContent = tabInfo[tab].subtitle;
        }
    });
});

// ===== Data Management =====
function getData() {
    const saved = localStorage.getItem('saintTropezData');
    return saved ? JSON.parse(saved) : getDefaultData();
}

function saveData(data) {
    try {
        localStorage.setItem('saintTropezData', JSON.stringify(data));
    } catch (e) {
        showToast('Stockage plein : image trop lourde. Importez une image plus petite.');
        throw e;
    }
}

function getDefaultData() {
    return {
        restaurant: {
            name: "Saint Tropez",
            tagline: "Un dîner au Saint Tropez, là où les regards se croisent et les âmes se rapprochent.",
            subtitle: "Restaurant de Fruits de Mer — Sfax",
            rating: "4.0",
            reviewCount: 69,
            price: "+100 DT",
            hours: "Ouvert · Ferme à 00:00",
            address: "28-30 Rue Tazarka, près de la Gare, Sfax 3000, Tunisie",
            phone1: "74 203 355",
            phone2: "26 264 646",
            phone3: "53 733 000",
            instagram: "@restaurant_saint_tropez_sfax",
            instagramUrl: "https://www.instagram.com/restaurant_saint_tropez_sfax/",
            facebook: "Restaurant Saint Tropez",
            facebookUrl: "https://www.facebook.com/restaurant.saint.tropez.sfax",
            notifyEmail: "",
            plusCode: "PQM8+9W Sfax",
            videoUrl: "videos/presentation.mp4.mp4",
            videoPoster: "images/video-poster.png",
            videoTitle: "Découvrez notre restaurant"
        },
        menu: [
            { name: "Brique Fruits de Mer", description: "Feuille de brick croustillante garnie d'un mélange de fruits de mer frais, sauce maison aux herbes.", price: "Sur demande", badge: "Populaire", image: "images/menu-brique.png" },
            { name: "Spaghetti Fruits de Mer", description: "Spaghetti frais accompagnés de crevettes, moules et calamars dans une sauce tomate provençale.", price: "Sur demande", badge: "Populaire", image: "images/menu-spaghetti.png" },
            { name: "Plateau de Fruits de Mer", description: "Assortiment de fruits de mer frais du jour : crevettes, huîtres, moules, crabes et langoustines.", price: "Sur demande", badge: "", image: "images/menu-plateau.png" },
            { name: "Poisson du Jour", description: "Poisson frais grillé ou en sauce, accompagné de légumes de saison et riz basmati.", price: "Sur demande", badge: "", image: "images/menu-poisson.png" },
            { name: "Salade Méditerranéenne", description: "Salade fraîche aux légumes croquants, olives, feta et vinaigrette à l'huile d'olive extra vierge.", price: "Sur demande", badge: "", image: "images/menu-salade.png" },
            { name: "Cave à Vins", description: "Sélection de vins tunisiens et internationaux pour accompagner vos repas avec élégance.", price: "Sur demande", badge: "", image: "images/menu-vins.jpg" }
        ],
        gallery: [
            { image: "images/gallery-1.jpg", alt: "Plat de fruits de mer" },
            { image: "images/gallery-2.jpg", alt: "Plat principal" },
            { image: "images/gallery-3.jpg", alt: "Dîner romantique" },
            { image: "images/gallery-4.jpg", alt: "Soupe de poisson" },
            { image: "images/gallery-5.jpg", alt: "Poulpe grillé" },
            { image: "images/gallery-6.jpg", alt: "Dessert" },
            { image: "images/gallery-7.jpg", alt: "Ambiance restaurant" },
            { image: "images/gallery-8.jpg", alt: "Plat du jour" }
        ],
        events: [
            { title: "Saint-Valentin", description: "Une soirée romantique inoubliable avec menu spécial, décorations aux chandelles et ambiance feutrée.", day: "14", month: "Fév", price: "Sur réservation" },
            { title: "Réveillon du Nouvel An", description: "Célébrez la nouvelle année avec un dîner gastronomique et une ambiance festive.", day: "31", month: "Déc", price: "Sur réservation" },
            { title: "Soirée Dégustation", description: "Découvrez notre menu dégustation avec accords mets et vins, chaque samedi soir.", day: "Sam", month: "Soir", price: "Sur réservation" }
        ],
        reviews: [
            { name: "Robert Szafirowski", meta: "Local Guide · il y a 2 ans", stars: 5, text: "Exceptionally good food!!" },
            { name: "Seokoh Ma", meta: "Local Guide · il y a 6 ans", stars: 5, text: "Cozy atmosphere and nice food." },
            { name: "Hichem Triki", meta: "Local Guide · il y a 8 ans", stars: 5, text: "Excellent restaurant. Des plats succulents. Les fruits de mer sont frais. La cuisine est raffinée. La décoration est splendide. Le service est digne d'un restaurant étoilé." }
        ]
    };
}

// ===== Helpers: safe storage + HTML escaping =====
function esc(value) {
    if (value === null || value === undefined) return '';
    return String(value).replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;'
    }[c]));
}

function getReservations() {
    try {
        const raw = localStorage.getItem('saintTropezReservations');
        const arr = raw ? JSON.parse(raw) : [];
        return Array.isArray(arr) ? arr : [];
    } catch (e) {
        return [];
    }
}

function saveReservations(reservations) {
    localStorage.setItem('saintTropezReservations', JSON.stringify(reservations));
}

// ===== Toast Notification =====
function showToast(message) {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    toastMessage.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ===== Modal =====
const modal = document.getElementById('edit-modal');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');
const modalClose = document.getElementById('modal-close');

function openModal(title, content) {
    modalTitle.textContent = title;
    modalBody.innerHTML = content;
    modal.classList.add('active');
}

function closeModal() {
    modal.classList.remove('active');
}

modalClose.addEventListener('click', closeModal);
modal.querySelector('.modal-overlay').addEventListener('click', closeModal);

// ===== Dashboard Stats =====
function updateStats() {
    const data = getData();
    const reservations = getReservations();
    
    document.getElementById('stat-rating').textContent = data.restaurant.rating;
    document.getElementById('stat-reservations').textContent = reservations.length;
    document.getElementById('stat-menu-items').textContent = data.menu.length;
    document.getElementById('stat-gallery').textContent = data.gallery.length;
}

function renderRecentReservations() {
    const reservations = getReservations();
    const list = document.getElementById('recent-reservations-list');
    if (!list) return;

    if (reservations.length === 0) {
        list.innerHTML = '<p class="empty-state">Aucune réservation pour le moment</p>';
        return;
    }

    const recent = reservations.slice(-5).reverse();
    list.innerHTML = recent.map(res => `
        <div class="reservation-item">
            <div class="res-info">
                <h4>${esc(res.name)}</h4>
                <p>${esc(res.phone)} · ${esc(String(res.guests))} personne(s)${res.tableName ? ' · ' + esc(res.tableName) : ''}</p>
            </div>
            <div class="res-date">${esc(res.date)} à ${esc(res.time)}</div>
        </div>
    `).join('');
}

// ===== Info Form =====
function loadInfoForm() {
    const data = getData();
    const r = data.restaurant;
    
    document.getElementById('info-name').value = r.name;
    document.getElementById('info-subtitle').value = r.subtitle;
    document.getElementById('info-tagline').value = r.tagline;
    document.getElementById('info-phone1').value = r.phone1;
    document.getElementById('info-phone2').value = r.phone2;
    document.getElementById('info-phone3').value = r.phone3;
    document.getElementById('info-address').value = r.address;
    document.getElementById('info-hours').value = r.hours;
    document.getElementById('info-pluscode').value = r.plusCode;
    document.getElementById('info-instagram').value = r.instagram;
    document.getElementById('info-instagram-url').value = r.instagramUrl;
    document.getElementById('info-facebook').value = r.facebook;
    document.getElementById('info-facebook-url').value = r.facebookUrl;
    document.getElementById('info-notify-email').value = r.notifyEmail || '';
}

const infoForm = document.getElementById('info-form');
if (infoForm) {
    infoForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const data = getData();
        
        data.restaurant.name = document.getElementById('info-name').value;
        data.restaurant.subtitle = document.getElementById('info-subtitle').value;
        data.restaurant.tagline = document.getElementById('info-tagline').value;
        data.restaurant.phone1 = document.getElementById('info-phone1').value;
        data.restaurant.phone2 = document.getElementById('info-phone2').value;
        data.restaurant.phone3 = document.getElementById('info-phone3').value;
        data.restaurant.address = document.getElementById('info-address').value;
        data.restaurant.hours = document.getElementById('info-hours').value;
        data.restaurant.plusCode = document.getElementById('info-pluscode').value;
        data.restaurant.instagram = document.getElementById('info-instagram').value;
        data.restaurant.instagramUrl = document.getElementById('info-instagram-url').value;
        data.restaurant.facebook = document.getElementById('info-facebook').value;
        data.restaurant.facebookUrl = document.getElementById('info-facebook-url').value;
        data.restaurant.notifyEmail = document.getElementById('info-notify-email').value.trim();
        
        saveData(data);
        showToast('Informations enregistrées avec succès!');
    });
}

// ===== Media import (file upload, compressed) — no URLs needed =====
function compressImageFile(file, maxDim = 900, quality = 0.78) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            try {
                const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
                const w = Math.max(1, Math.round(img.width * scale));
                const h = Math.max(1, Math.round(img.height * scale));
                const canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                URL.revokeObjectURL(url);
                resolve(canvas.toDataURL('image/jpeg', quality));
            } catch (e) {
                URL.revokeObjectURL(url);
                reject(e);
            }
        };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('bad image')); };
        img.src = url;
    });
}

function imageFieldHTML(id, current) {
    return `
    <div class="form-group">
        <label>Image (import depuis votre appareil)</label>
        <div class="media-field">
            <img id="${id}-preview" class="media-preview" src="${esc(current || '')}" alt="Aperçu" ${current ? '' : 'style="display:none;"'}>
            <div class="media-field-actions">
                <input type="file" id="${id}-file" accept="image/*" style="display: none;">
                <button type="button" class="btn btn-primary" id="${id}-btn">Importer une image</button>
                <input type="hidden" id="${id}" value="${esc(current || '')}">
            </div>
        </div>
    </div>`;
}

function bindImageField(id) {
    const fileInput = document.getElementById(id + '-file');
    const btn = document.getElementById(id + '-btn');
    const hidden = document.getElementById(id);
    const preview = document.getElementById(id + '-preview');
    if (!fileInput || !btn || !hidden) return;
    btn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => {
        const f = fileInput.files && fileInput.files[0];
        fileInput.value = '';
        if (!f) return;
        if (!f.type.startsWith('image/')) {
            showToast('Choisissez un fichier image.');
            return;
        }
        if (typeof openCropper !== 'function') {
            showToast('Module recadrage manquant.');
            return;
        }
        // Frame the photo FIRST, then import it
        openCropper(f, { ratios: ['1:1', '4:3', '16:9'], maxDim: 900, quality: 0.8 }, (dataUrl) => {
            if (!dataUrl) return;
            hidden.value = dataUrl;
            if (preview) {
                preview.src = dataUrl;
                preview.style.display = 'block';
            }
            showToast('Photo encadrée et importée !');
        });
    });
}

// ===== Menu Management =====
function renderMenuList() {
    const data = getData();
    const list = document.getElementById('admin-menu-list');
    
    list.innerHTML = data.menu.map((item, index) => `
        <div class="menu-admin-item">
            <img src="${item.image}" alt="${item.name}" class="menu-item-image" onerror="this.style.display='none';">
            <div class="menu-item-info">
                <h4>${item.name}</h4>
                <p>${item.description}</p>
                <span class="menu-item-price">${item.price}</span>
            </div>
            <div class="menu-item-actions">
                <button class="btn-icon btn-edit" onclick="editMenuItem(${index})" title="Modifier">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                </button>
                <button class="btn-icon btn-delete" onclick="deleteMenuItem(${index})" title="Supprimer">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                </button>
            </div>
        </div>
    `).join('');
}

function editMenuItem(index) {
    const data = getData();
    const item = data.menu[index];
    
    openModal('Modifier le plat', `
        <form id="edit-menu-form">
            <div class="form-group">
                <label>Nom du plat</label>
                <input type="text" id="edit-name" value="${item.name}" required>
            </div>
            <div class="form-group">
                <label>Description</label>
                <textarea id="edit-description" rows="3" required>${item.description}</textarea>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Prix</label>
                    <input type="text" id="edit-price" value="${item.price}">
                </div>
                <div class="form-group">
                    <label>Badge</label>
                    <input type="text" id="edit-badge" value="${item.badge}" placeholder="Populaire">
                </div>
            </div>
            ${imageFieldHTML('edit-image', item.image)}
            <button type="submit" class="btn btn-primary">Enregistrer</button>
        </form>
    `);

    bindImageField('edit-image');

    document.getElementById('edit-menu-form').addEventListener('submit', function(e) {
        e.preventDefault();
        data.menu[index] = {
            name: document.getElementById('edit-name').value,
            description: document.getElementById('edit-description').value,
            price: document.getElementById('edit-price').value,
            badge: document.getElementById('edit-badge').value,
            image: document.getElementById('edit-image').value
        };
        saveData(data);
        renderMenuList();
        closeModal();
        showToast('Plat modifié avec succès!');
    });
}

function deleteMenuItem(index) {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce plat?')) {
        const data = getData();
        data.menu.splice(index, 1);
        saveData(data);
        renderMenuList();
        showToast('Plat supprimé!');
    }
}

const addMenuItemBtn = document.getElementById('add-menu-item');
if (addMenuItemBtn) {
    addMenuItemBtn.addEventListener('click', function() {
        openModal('Ajouter un plat', `
            <form id="add-menu-form">
                <div class="form-group">
                    <label>Nom du plat</label>
                    <input type="text" id="add-name" required>
                </div>
                <div class="form-group">
                    <label>Description</label>
                    <textarea id="add-description" rows="3" required></textarea>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Prix</label>
                        <input type="text" id="add-price" value="Sur demande">
                    </div>
                    <div class="form-group">
                        <label>Badge</label>
                        <input type="text" id="add-badge" placeholder="Populaire">
                    </div>
                </div>
                ${imageFieldHTML('add-image', '')}
                <button type="submit" class="btn btn-primary">Ajouter</button>
            </form>
        `);
        
        bindImageField('add-image');

        document.getElementById('add-menu-form').addEventListener('submit', function(e) {
            e.preventDefault();
            const data = getData();
            data.menu.push({
                name: document.getElementById('add-name').value,
                description: document.getElementById('add-description').value,
                price: document.getElementById('add-price').value,
                badge: document.getElementById('add-badge').value,
                image: document.getElementById('add-image').value
            });
            saveData(data);
            renderMenuList();
            closeModal();
            showToast('Plat ajouté avec succès!');
        });
    });
}

// ===== Gallery Management =====
function renderGalleryList() {
    const data = getData();
    const list = document.getElementById('admin-gallery-list');
    
    list.innerHTML = data.gallery.map((item, index) => `
        <div class="gallery-admin-item">
            <img src="${item.image}" alt="${item.alt}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22%23c9a96e%22><path d=%22M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z%22/></svg>';">
            <div class="gallery-item-overlay">
                <button class="btn-icon btn-edit" onclick="editGalleryItem(${index})">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                </button>
                <button class="btn-icon btn-delete" onclick="deleteGalleryItem(${index})">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                </button>
            </div>
        </div>
    `).join('');
}

function editGalleryItem(index) {
    const data = getData();
    const item = data.gallery[index];
    
    openModal('Modifier la photo', `
        <form id="edit-gallery-form">
            ${imageFieldHTML('edit-gallery-image', item.image)}
            <div class="form-group">
                <label>Texte alternatif</label>
                <input type="text" id="edit-gallery-alt" value="${item.alt}">
            </div>
            <button type="submit" class="btn btn-primary">Enregistrer</button>
        </form>
    `);
    
    bindImageField('edit-gallery-image');

    document.getElementById('edit-gallery-form').addEventListener('submit', function(e) {
        e.preventDefault();
        data.gallery[index] = {
            image: document.getElementById('edit-gallery-image').value,
            alt: document.getElementById('edit-gallery-alt').value
        };
        saveData(data);
        renderGalleryList();
        closeModal();
        showToast('Photo modifiée!');
    });
}

function deleteGalleryItem(index) {
    if (confirm('Supprimer cette photo?')) {
        const data = getData();
        data.gallery.splice(index, 1);
        saveData(data);
        renderGalleryList();
        showToast('Photo supprimée!');
    }
}

const addGalleryItemBtn = document.getElementById('add-gallery-item');
if (addGalleryItemBtn) {
    addGalleryItemBtn.addEventListener('click', function() {
        openModal('Ajouter une photo', `
            <form id="add-gallery-form">
                <div class="form-group">
                    ${imageFieldHTML('add-gallery-image', '')}
                <div class="form-group">
                    <label>Texte alternatif</label>
                    <input type="text" id="add-gallery-alt" placeholder="Description de la photo">
                </div>
                <button type="submit" class="btn btn-primary">Ajouter</button>
            </form>
        `);
        
        bindImageField('add-gallery-image');

        document.getElementById('add-gallery-form').addEventListener('submit', function(e) {
            e.preventDefault();
            const data = getData();
            data.gallery.push({
                image: document.getElementById('add-gallery-image').value,
                alt: document.getElementById('add-gallery-alt').value
            });
            saveData(data);
            renderGalleryList();
            closeModal();
            showToast('Photo ajoutée!');
        });
    });
}

// ===== Events Management =====
function renderEventsList() {
    const data = getData();
    const list = document.getElementById('admin-events-list');
    
    list.innerHTML = data.events.map((event, index) => `
        <div class="event-admin-item">
            <div class="event-date">
                <span class="day">${event.day}</span>
                <span class="month">${event.month}</span>
            </div>
            <div class="event-info">
                <h4>${event.title}</h4>
                <p>${event.description}</p>
            </div>
            <div class="menu-item-actions">
                <button class="btn-icon btn-edit" onclick="editEvent(${index})">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                </button>
                <button class="btn-icon btn-delete" onclick="deleteEvent(${index})">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                </button>
            </div>
        </div>
    `).join('');
}

function editEvent(index) {
    const data = getData();
    const event = data.events[index];
    
    openModal("Modifier l'événement", `
        <form id="edit-event-form">
            <div class="form-group">
                <label>Titre</label>
                <input type="text" id="edit-event-title" value="${event.title}" required>
            </div>
            <div class="form-group">
                <label>Description</label>
                <textarea id="edit-event-description" rows="3" required>${event.description}</textarea>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Jour</label>
                    <input type="text" id="edit-event-day" value="${event.day}">
                </div>
                <div class="form-group">
                    <label>Mois</label>
                    <input type="text" id="edit-event-month" value="${event.month}">
                </div>
            </div>
            <div class="form-group">
                <label>Prix</label>
                <input type="text" id="edit-event-price" value="${event.price}">
            </div>
            <button type="submit" class="btn btn-primary">Enregistrer</button>
        </form>
    `);
    
    document.getElementById('edit-event-form').addEventListener('submit', function(e) {
        e.preventDefault();
        data.events[index] = {
            title: document.getElementById('edit-event-title').value,
            description: document.getElementById('edit-event-description').value,
            day: document.getElementById('edit-event-day').value,
            month: document.getElementById('edit-event-month').value,
            price: document.getElementById('edit-event-price').value
        };
        saveData(data);
        renderEventsList();
        closeModal();
        showToast('Événement modifié!');
    });
}

function deleteEvent(index) {
    if (confirm('Supprimer cet événement?')) {
        const data = getData();
        data.events.splice(index, 1);
        saveData(data);
        renderEventsList();
        showToast('Événement supprimé!');
    }
}

const addEventBtn = document.getElementById('add-event');
if (addEventBtn) {
    addEventBtn.addEventListener('click', function() {
        openModal('Ajouter un événement', `
            <form id="add-event-form">
                <div class="form-group">
                    <label>Titre</label>
                    <input type="text" id="add-event-title" required>
                </div>
                <div class="form-group">
                    <label>Description</label>
                    <textarea id="add-event-description" rows="3" required></textarea>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Jour</label>
                        <input type="text" id="add-event-day" placeholder="14">
                    </div>
                    <div class="form-group">
                        <label>Mois</label>
                        <input type="text" id="add-event-month" placeholder="Fév">
                    </div>
                </div>
                <div class="form-group">
                    <label>Prix</label>
                    <input type="text" id="add-event-price" value="Sur réservation">
                </div>
                <button type="submit" class="btn btn-primary">Ajouter</button>
            </form>
        `);
        
        document.getElementById('add-event-form').addEventListener('submit', function(e) {
            e.preventDefault();
            const data = getData();
            data.events.push({
                title: document.getElementById('add-event-title').value,
                description: document.getElementById('add-event-description').value,
                day: document.getElementById('add-event-day').value,
                month: document.getElementById('add-event-month').value,
                price: document.getElementById('add-event-price').value
            });
            saveData(data);
            renderEventsList();
            closeModal();
            showToast('Événement ajouté!');
        });
    });
}

// ===== Video Management =====
const videoForm = document.getElementById('video-form');
if (videoForm) {
    videoForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const data = getData();
        
        data.restaurant.videoUrl = document.getElementById('video-url').value;
        data.restaurant.videoPoster = document.getElementById('video-poster').value;
        data.restaurant.videoTitle = document.getElementById('video-title').value;
        
        saveData(data);
        showToast('Vidéo enregistrée!');
        refreshAdminVideoPreview();
    });
}

// ===== Video import (file stored on device, or link) =====
async function refreshAdminVideoPreview() {
    const urlInput = document.getElementById('video-url');
    const preview = document.getElementById('admin-video-preview');
    const status = document.getElementById('video-file-status');
    const url = urlInput ? urlInput.value.trim() : '';

    if (status) {
        if (url.startsWith('indexeddb:')) {
            let meta = null;
            try { meta = await MediaStore.info(url.slice('indexeddb:'.length)); } catch (e) {}
            status.textContent = meta
                ? `📁 Importée : ${meta.name} (${Math.round(meta.size / 1024 / 1024)} Mo) — pensez à Enregistrer.`
                : '📁 Vidéo importée — pensez à Enregistrer.';
        } else if (url) {
            status.textContent = '🔗 Lien / fichier : ' + url;
        } else {
            status.textContent = 'Aucune vidéo — la section sera masquée sur le site.';
        }
    }

    if (preview) {
        const src = (typeof resolveMediaURL === 'function') ? await resolveMediaURL(url) : (url || null);
        const posterInput = document.getElementById('video-poster');
        const poster = posterInput ? posterInput.value.trim() : '';
        if (src) {
            preview.src = src;
            if (poster) preview.poster = poster;
            try { preview.load(); } catch (e) {}
        } else {
            preview.removeAttribute('src');
        }
    }
}

const videoFileInput = document.getElementById('video-file');
const videoImportBtn = document.getElementById('video-import-btn');
if (videoImportBtn && videoFileInput) {
    videoImportBtn.addEventListener('click', () => videoFileInput.click());
    videoFileInput.addEventListener('change', async () => {
        const f = videoFileInput.files && videoFileInput.files[0];
        videoFileInput.value = '';
        if (!f) return;
        if (!f.type.startsWith('video/')) {
            showToast('Choisissez un fichier vidéo (MP4, WebM).');
            return;
        }
        if (f.size > 200 * 1024 * 1024) {
            showToast('Vidéo trop lourde (max 200 Mo).');
            return;
        }
        showToast('Import vidéo en cours…');
        try {
            await MediaStore.put('video-main', f);
            document.getElementById('video-url').value = 'indexeddb:video-main';
            await refreshAdminVideoPreview();
            showToast('Vidéo importée ! Cliquez Enregistrer.');
        } catch (e) {
            showToast('Import impossible sur cet appareil.');
        }
    });
}

function loadVideoForm() {
    const data = getData();
    document.getElementById('video-url').value = data.restaurant.videoUrl || '';
    document.getElementById('video-poster').value = data.restaurant.videoPoster || '';
    document.getElementById('video-title').value = data.restaurant.videoTitle || '';

    const posterPreview = document.getElementById('video-poster-preview');
    if (posterPreview) {
        if (data.restaurant.videoPoster) {
            posterPreview.src = data.restaurant.videoPoster;
            posterPreview.style.display = 'block';
        } else {
            posterPreview.style.display = 'none';
        }
    }

    refreshAdminVideoPreview();
}

// ===== Reviews Management =====
function renderReviewsList() {
    const data = getData();
    const list = document.getElementById('admin-reviews-list');
    
    list.innerHTML = data.reviews.map((review, index) => `
        <div class="review-admin-item">
            <div class="review-avatar">${review.name.charAt(0)}</div>
            <div class="review-content">
                <h4>${review.name}</h4>
                <span class="review-meta">${review.meta}</span>
                <div class="review-stars">${'★'.repeat(review.stars)}${'☆'.repeat(5 - review.stars)}</div>
                <p class="review-text">"${review.text}"</p>
            </div>
            <div class="menu-item-actions">
                <button class="btn-icon btn-edit" onclick="editReview(${index})">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                </button>
                <button class="btn-icon btn-delete" onclick="deleteReview(${index})">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                </button>
            </div>
        </div>
    `).join('');
}

function editReview(index) {
    const data = getData();
    const review = data.reviews[index];
    
    openModal("Modifier l'avis", `
        <form id="edit-review-form">
            <div class="form-group">
                <label>Nom</label>
                <input type="text" id="edit-review-name" value="${review.name}" required>
            </div>
            <div class="form-group">
                <label>Méta</label>
                <input type="text" id="edit-review-meta" value="${review.meta}">
            </div>
            <div class="form-group">
                <label>Note (1-5)</label>
                <input type="number" id="edit-review-stars" min="1" max="5" value="${review.stars}">
            </div>
            <div class="form-group">
                <label>Texte de l'avis</label>
                <textarea id="edit-review-text" rows="3" required>${review.text}</textarea>
            </div>
            <button type="submit" class="btn btn-primary">Enregistrer</button>
        </form>
    `);
    
    document.getElementById('edit-review-form').addEventListener('submit', function(e) {
        e.preventDefault();
        data.reviews[index] = {
            name: document.getElementById('edit-review-name').value,
            meta: document.getElementById('edit-review-meta').value,
            stars: parseInt(document.getElementById('edit-review-stars').value),
            text: document.getElementById('edit-review-text').value
        };
        saveData(data);
        renderReviewsList();
        closeModal();
        showToast('Avis modifié!');
    });
}

function deleteReview(index) {
    if (confirm('Supprimer cet avis?')) {
        const data = getData();
        data.reviews.splice(index, 1);
        saveData(data);
        renderReviewsList();
        showToast('Avis supprimé!');
    }
}

const addReviewBtn = document.getElementById('add-review');
if (addReviewBtn) {
    addReviewBtn.addEventListener('click', function() {
        openModal('Ajouter un avis', `
            <form id="add-review-form">
                <div class="form-group">
                    <label>Nom</label>
                    <input type="text" id="add-review-name" required>
                </div>
                <div class="form-group">
                    <label>Méta</label>
                    <input type="text" id="add-review-meta" placeholder="Local Guide · il y a 2 ans">
                </div>
                <div class="form-group">
                    <label>Note (1-5)</label>
                    <input type="number" id="add-review-stars" min="1" max="5" value="5">
                </div>
                <div class="form-group">
                    <label>Texte de l'avis</label>
                    <textarea id="add-review-text" rows="3" required></textarea>
                </div>
                <button type="submit" class="btn btn-primary">Ajouter</button>
            </form>
        `);
        
        document.getElementById('add-review-form').addEventListener('submit', function(e) {
            e.preventDefault();
            const data = getData();
            data.reviews.push({
                name: document.getElementById('add-review-name').value,
                meta: document.getElementById('add-review-meta').value,
                stars: parseInt(document.getElementById('add-review-stars').value),
                text: document.getElementById('add-review-text').value
            });
            saveData(data);
            renderReviewsList();
            closeModal();
            showToast('Avis ajouté!');
        });
    });
}

// ===== Reservations Table (with table assignment + status) =====
function tableUsedElsewhere(tableId, exceptIdx) {
    if (!tableId) return false;
    const reservations = getReservations();
    return reservations.some((r, i) =>
        i !== exceptIdx &&
        r.tableId === tableId &&
        !['cancelled', 'done'].includes(r.status || 'pending')
    );
}

function renderReservationsTable() {
    const reservations = getReservations();
    const tbody = document.getElementById('reservations-table-body');
    if (!tbody) return;
    const tables = window.TableManagement ? TableManagement.getTables() : [];

    if (reservations.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="empty-state">Aucune réservation</td></tr>';
        return;
    }

    const statusLabels = {
        pending: 'En attente',
        confirmed: 'Confirmée',
        seated: 'Installée',
        done: 'Terminée',
        cancelled: 'Annulée'
    };

    tbody.innerHTML = reservations.map((res, idx) => {
        const tableOptions = '<option value="">—</option>' + tables.map(t =>
            `<option value="${t.id}" ${res.tableId === t.id ? 'selected' : ''}>${esc(t.name)} (${t.capacity}p)</option>`
        ).join('');
        const statusOptions = Object.keys(statusLabels).map(s =>
            `<option value="${s}" ${(res.status || 'pending') === s ? 'selected' : ''}>${statusLabels[s]}</option>`
        ).join('');
        let received = '-';
        try { received = res.submittedAt ? new Date(res.submittedAt).toLocaleDateString('fr-FR') : '-'; } catch (e) {}

        return `
        <tr class="res-status-${res.status || 'pending'}">
            <td>${esc(res.name)}<br><small style="color:var(--color-text-light)">${esc(res.id || '')}</small><br><small>${emailBadge(res)}</small></td>
            <td>${esc(res.phone)}${res.email ? '<br><small>' + esc(res.email) + '</small>' : ''}</td>
            <td>${esc(res.date)}</td>
            <td>${esc(res.time)}</td>
            <td>${esc(String(res.guests))}</td>
            <td>
                <select class="res-select" onchange="assignReservationTable(${idx}, this.value)">
                    ${tableOptions}
                </select>
                <div class="res-table-name">${esc(res.tableName || '')}</div>
            </td>
            <td>
                <select class="res-select status-${res.status || 'pending'}" onchange="setReservationStatus(${idx}, this.value)">
                    ${statusOptions}
                </select>
            </td>
            <td>${esc(res.message || '-')}</td>
            <td>${received}</td>
            <td>
                <button class="btn-icon btn-edit" onclick="resendReservationEmail(${idx})" title="Renvoyer l'email de notification">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
                </button>
                <button class="btn-icon btn-delete" onclick="deleteReservation(${idx})" title="Supprimer">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                </button>
            </td>
        </tr>`;
    }).join('');
}

function assignReservationTable(idx, tableId) {
    const reservations = getReservations();
    const res = reservations[idx];
    if (!res || !window.TableManagement) return;
    const oldTable = res.tableId;
    const t = tableId ? TableManagement.getTable(tableId) : null;

    if (t && !TableManagement.fitsGuests(t, res.guests)) {
        showToast(`Refusé : ${t.name} accepte uniquement ${TableManagement.rangeLabel(t)} (client : ${res.guests} pers.).`);
        renderReservationsTable();
        return;
    }

    res.tableId = tableId || null;
    res.tableName = t ? t.name : null;

    const st = res.status || 'pending';
    if (t && st !== 'cancelled' && st !== 'done') {
        TableManagement.assignTable(res.id || ('R' + idx), tableId);
    }
    if (oldTable && oldTable !== tableId && !tableUsedElsewhere(oldTable, idx)) {
        TableManagement.freeTable(oldTable);
    }

    saveReservations(reservations);
    SecuritySystem.logAction('reservation_table_assigned', { index: idx, tableId });
    renderReservationsTable();
    renderRecentReservations();
    if (typeof renderFloorPlan === 'function') renderFloorPlan();
    showToast('Table assignée !');
}

function setReservationStatus(idx, status) {
    const reservations = getReservations();
    const res = reservations[idx];
    if (!res) return;

    res.status = status;
    if ((status === 'cancelled' || status === 'done') && res.tableId && !tableUsedElsewhere(res.tableId, idx)) {
        if (window.TableManagement) TableManagement.freeTable(res.tableId);
    }
    if ((status === 'confirmed' || status === 'seated' || status === 'pending') && res.tableId && window.TableManagement) {
        TableManagement.assignTable(res.id || ('R' + idx), res.tableId);
    }

    saveReservations(reservations);
    SecuritySystem.logAction('reservation_status_changed', { index: idx, status });
    renderReservationsTable();
    renderRecentReservations();
    if (typeof renderFloorPlan === 'function') renderFloorPlan();
    showToast('Statut mis à jour !');
}

function deleteReservation(idx) {
    const reservations = getReservations();
    const res = reservations[idx];
    if (!res) return;
    if (!confirm(`Supprimer la réservation de ${res.name} ?`)) return;

    if (res.tableId && !tableUsedElsewhere(res.tableId, idx) && window.TableManagement) {
        TableManagement.freeTable(res.tableId);
    }
    reservations.splice(idx, 1);
    saveReservations(reservations);
    SecuritySystem.logAction('reservation_deleted', { index: idx });
    renderReservationsTable();
    renderRecentReservations();
    updateStats();
    if (typeof renderFloorPlan === 'function') renderFloorPlan();
    showToast('Réservation supprimée !');
}

const clearReservationsBtn = document.getElementById('clear-reservations');
if (clearReservationsBtn) {
    clearReservationsBtn.addEventListener('click', function() {
        if (confirm('Effacer toutes les réservations?')) {
            localStorage.removeItem('saintTropezReservations');
            renderReservationsTable();
            updateStats();
            showToast('Réservations effacées!');
        }
    });
}

// ===== Security Dashboard =====
function updateSecurityStatus() {
    const session = SecuritySystem.getSession();
    const attempts = SecuritySystem.getLoginAttempts();
    const status = UptimeGuard.getStatus();
    
    const sessionEl = document.getElementById('security-session');
    if (sessionEl) {
        if (session) {
            sessionEl.textContent = `Active (${session.username})`;
            sessionEl.className = 'status-value success';
        } else {
            sessionEl.textContent = 'Inactive';
            sessionEl.className = 'status-value warning';
        }
    }
    
    const lockoutEl = document.getElementById('security-lockout');
    if (lockoutEl) {
        if (SecuritySystem.isLockedOut()) {
            lockoutEl.textContent = `Verrouillé (${SecuritySystem.getLockoutTimeRemaining()}s)`;
            lockoutEl.className = 'status-value danger';
        } else {
            lockoutEl.textContent = 'Déverrouillé';
            lockoutEl.className = 'status-value success';
        }
    }
    
    const attemptsEl = document.getElementById('security-attempts');
    if (attemptsEl) {
        attemptsEl.textContent = `${attempts.count}/5`;
        attemptsEl.className = attempts.count > 0 ? 'status-value warning' : 'status-value success';
    }
    
    const backupEl = document.getElementById('security-backup');
    if (backupEl) {
        if (UptimeGuard.state.lastBackup) {
            backupEl.textContent = new Date(UptimeGuard.state.lastBackup).toLocaleTimeString('fr-FR');
            backupEl.className = 'status-value success';
        } else {
            backupEl.textContent = 'Aucune';
            backupEl.className = 'status-value warning';
        }
    }
    
    const uptimeEl = document.getElementById('security-uptime');
    if (uptimeEl) {
        const hours = Math.floor(status.uptime / 3600);
        const minutes = Math.floor((status.uptime % 3600) / 60);
        uptimeEl.textContent = `${hours}h ${minutes}m`;
        uptimeEl.className = 'status-value success';
    }
    
    const errorsEl = document.getElementById('security-errors');
    if (errorsEl) {
        errorsEl.textContent = status.errors.toString();
        errorsEl.className = status.errors > 0 ? 'status-value danger' : 'status-value success';
    }
}

function renderAuditLog() {
    const list = document.getElementById('audit-log-list');
    if (!list) return;
    
    const logs = SecuritySystem.getAuditLog();
    
    if (logs.length === 0) {
        list.innerHTML = '<p class="empty-state">Aucune entrée dans le journal</p>';
        return;
    }
    
    const recent = logs.slice(-50).reverse();
    list.innerHTML = recent.map(log => `
        <div class="audit-log-item">
            <div class="log-time">${new Date(log.timestamp).toLocaleString('fr-FR')}</div>
            <div class="log-action">${log.action}</div>
            <div class="log-user">Par: ${log.user}</div>
        </div>
    `).join('');
}

const refreshSecurityBtn = document.getElementById('refresh-security-status');
if (refreshSecurityBtn) {
    refreshSecurityBtn.addEventListener('click', () => {
        updateSecurityStatus();
        renderAuditLog();
        showToast('Statut actualisé!');
    });
}

const clearAuditLogBtn = document.getElementById('clear-audit-log');
if (clearAuditLogBtn) {
    clearAuditLogBtn.addEventListener('click', () => {
        if (confirm('Effacer tout le journal d\'audit?')) {
            SecuritySystem.clearAuditLog();
            renderAuditLog();
            showToast('Journal effacé!');
        }
    });
}

const forceBackupBtn = document.getElementById('force-backup');
if (forceBackupBtn) {
    forceBackupBtn.addEventListener('click', () => {
        UptimeGuard.performBackup();
        updateSecurityStatus();
        showToast('Sauvegarde effectuée!');
    });
}

// ===== Tables Management =====
let selectedTableId = null;

function renderFloorPlan() {
    const plan = document.getElementById('floor-plan');
    if (!plan) return;

    const bg = (typeof getFloorBg === 'function') ? getFloorBg() : null;
    if (bg === 'MAP') {
        plan.style.backgroundImage = 'none';
    } else if (bg) {
        plan.style.backgroundImage = `url("${bg}")`;
        plan.style.backgroundSize = 'cover';
        plan.style.backgroundPosition = 'center';
    }

    const tables = TableManagement.getTables();
    
    plan.innerHTML = tables.map(table => {
        const shapeClass = table.shape || 'round';
        const typeClass = table.isVip ? 'vip' : table.isOutdoor ? 'outdoor' : '';
        const statusClass = table.status;
        
        return `
            <div class="floor-table ${shapeClass} ${statusClass} ${typeClass} ${selectedTableId === table.id ? 'selected' : ''}"
                 style="left: ${table.x}%; top: ${table.y}%;"
                 data-table-id="${table.id}"
                 title="${table.name} - ${table.capacity} personnes (glisser pour déplacer)">
                <span class="table-label">${table.name}</span>
                <span class="table-capacity">${table.capacity}p</span>
            </div>
        `;
    }).join('');

    const mapBg = (typeof getFloorBg === 'function' && getFloorBg() === 'MAP')
        ? '<iframe class="floor-map-bg" title="Fond carte" src="https://maps.google.com/maps?q=Restaurant%20Saint%20Tropez%2C%20Rue%20Tazarka%2C%203000%20Sfax%2C%20Tunisie&t=&z=17&ie=UTF8&iwloc=&output=embed" loading="lazy" tabindex="-1"></iframe>'
        : '';

    plan.innerHTML = mapBg + plan.innerHTML;

    renderTablesStats();
}

function renderTablesStats() {
    const container = document.getElementById('tables-stats');
    if (!container) return;
    
    const stats = TableManagement.getStats();
    
    container.innerHTML = `
        <div class="table-stat">
            <div class="stat-number">${stats.total}</div>
            <div class="stat-label">Total</div>
        </div>
        <div class="table-stat">
            <div class="stat-number" style="color: #22c55e;">${stats.available}</div>
            <div class="stat-label">Disponibles</div>
        </div>
        <div class="table-stat">
            <div class="stat-number" style="color: #f59e0b;">${stats.reserved}</div>
            <div class="stat-label">Réservées</div>
        </div>
        <div class="table-stat">
            <div class="stat-number" style="color: #ef4444;">${stats.occupied}</div>
            <div class="stat-label">Occupées</div>
        </div>
        <div class="table-stat">
            <div class="stat-number">${stats.totalCapacity}</div>
            <div class="stat-label">Capacité</div>
        </div>
        <div class="table-stat">
            <div class="stat-number" style="color: #8b5cf6;">${stats.vipTables}</div>
            <div class="stat-label">VIP</div>
        </div>
    `;
}

function selectTable(tableId) {
    selectedTableId = tableId;
    renderFloorPlan();
    showTableDetails(tableId);
}

function showTableDetails(tableId) {
    const card = document.getElementById('table-details-card');
    const details = document.getElementById('table-details');
    if (!card || !details) return;
    
    const table = TableManagement.getTable(tableId);
    if (!table) {
        card.style.display = 'none';
        return;
    }
    
    card.style.display = 'block';
    
    const statusLabels = {
        available: 'Disponible',
        reserved: 'Réservée',
        occupied: 'Occupée'
    };
    
    details.innerHTML = `
        <div class="table-details-content">
            <div class="table-detail-row">
                <strong>Nom:</strong> <span>${table.name}</span>
            </div>
            <div class="table-detail-row">
                <strong>Capacité:</strong> <span>${table.capacity} personnes</span>
            </div>
            <div class="table-detail-row">
                <strong>Forme:</strong> <span>${table.shape}</span>
            </div>
            <div class="table-detail-row">
                <strong>Type:</strong> <span>${table.isVip ? 'VIP' : table.isOutdoor ? 'Terrasse' : 'Standard'}</span>
            </div>
            <div class="table-detail-row">
                <strong>Statut:</strong> <span>${statusLabels[table.status] || table.status}</span>
            </div>
            <div class="table-detail-row">
                <strong>Position:</strong> <span>X:${table.x}% Y:${table.y}%</span>
            </div>
            <div class="table-detail-actions">
                <button class="btn btn-gold" onclick="editTable('${tableId}')">Modifier</button>
                <button class="btn btn-primary" onclick="setTableStatus('${tableId}', 'available')">Disponible</button>
                <button class="btn btn-gold" onclick="setTableStatus('${tableId}', 'reserved')">Réservée</button>
                <button class="btn btn-danger" onclick="setTableStatus('${tableId}', 'occupied')">Occupée</button>
                <button class="btn btn-danger" onclick="deleteTable('${tableId}')">Supprimer</button>
            </div>
        </div>
    `;
}

function editTable(tableId) {
    if (!isOwner()) {
        showToast('Accès réservé au OWNER.');
        return;
    }
    const table = TableManagement.getTable(tableId);
    if (!table) return;

    const currentType = table.isVip ? 'vip' : (table.isOutdoor ? 'outdoor' : 'standard');

    openModal(`Modifier — ${table.name}`, `
        <form id="edit-table-form">
            <div class="form-row">
                <div class="form-group">
                    <label>Nom</label>
                    <input type="text" id="edit-table-name" value="${esc(table.name)}" required>
                </div>
                <div class="form-group">
                    <label>Places (capacité)</label>
                    <input type="number" id="edit-table-capacity" min="1" max="20" value="${table.capacity}" required>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Forme</label>
                    <select id="edit-table-shape">
                        <option value="round" ${table.shape === 'round' ? 'selected' : ''}>Ronde</option>
                        <option value="square" ${table.shape === 'square' ? 'selected' : ''}>Carrée</option>
                        <option value="rectangular" ${table.shape === 'rectangular' ? 'selected' : ''}>Rectangulaire</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Type</label>
                    <select id="edit-table-type">
                        <option value="standard" ${currentType === 'standard' ? 'selected' : ''}>Standard</option>
                        <option value="vip" ${currentType === 'vip' ? 'selected' : ''}>VIP</option>
                        <option value="outdoor" ${currentType === 'outdoor' ? 'selected' : ''}>Terrasse</option>
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Position X (%)</label>
                    <input type="number" id="edit-table-x" min="0" max="95" value="${table.x}">
                </div>
                <div class="form-group">
                    <label>Position Y (%)</label>
                    <input type="number" id="edit-table-y" min="0" max="92" value="${table.y}">
                </div>
            </div>
            <p style="font-size:0.8rem;color:var(--color-text-light);">Règle auto : ${table.capacity} places = ${TableManagement.rangeLabel(table)} uniquement.</p>
            <button type="submit" class="btn btn-primary">Enregistrer</button>
        </form>
    `);

    document.getElementById('edit-table-form').addEventListener('submit', function(e) {
        e.preventDefault();
        const type = document.getElementById('edit-table-type').value;
        TableManagement.updateTable(tableId, {
            name: document.getElementById('edit-table-name').value.trim() || table.name,
            capacity: Math.max(1, Math.min(20, parseInt(document.getElementById('edit-table-capacity').value, 10) || table.capacity)),
            shape: document.getElementById('edit-table-shape').value,
            isVip: type === 'vip',
            isOutdoor: type === 'outdoor',
            x: Math.max(0, Math.min(95, parseInt(document.getElementById('edit-table-x').value, 10) || 0)),
            y: Math.max(0, Math.min(92, parseInt(document.getElementById('edit-table-y').value, 10) || 0))
        });
        SecuritySystem.logAction('table_edited', { tableId });
        closeModal();
        renderFloorPlan();
        showTableDetails(tableId);
        showToast('Table modifiée !');
    });
}

function setTableStatus(tableId, status) {
    TableManagement.updateTable(tableId, { status });
    SecuritySystem.logAction('table_status_changed', { tableId, status });
    renderFloorPlan();
    showTableDetails(tableId);
    showToast(`Table mise à jour: ${status}`);
}

function deleteTable(tableId) {
    if (confirm('Supprimer cette table?')) {
        TableManagement.deleteTable(tableId);
        SecuritySystem.logAction('table_deleted', { tableId });
        selectedTableId = null;
        renderFloorPlan();
        document.getElementById('table-details-card').style.display = 'none';
        showToast('Table supprimée!');
    }
}

const addTableForm = document.getElementById('add-table-form');
if (addTableForm) {
    addTableForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const type = document.getElementById('table-type').value;
        const table = {
            name: document.getElementById('table-name').value,
            capacity: parseInt(document.getElementById('table-capacity').value),
            shape: document.getElementById('table-shape').value,
            x: parseInt(document.getElementById('table-x').value),
            y: parseInt(document.getElementById('table-y').value),
            isVip: type === 'vip',
            isOutdoor: type === 'outdoor'
        };
        
        TableManagement.addTable(table);
        SecuritySystem.logAction('table_added', { name: table.name });
        
        this.reset();
        document.getElementById('table-capacity').value = 4;
        
        renderFloorPlan();
        showToast('Table ajoutée avec succès!');
    });
}

// Make functions global
window.selectTable = selectTable;
window.setTableStatus = setTableStatus;
window.deleteTable = deleteTable;

// ===== Drag & drop tables on the floor plan (arrange like the real restaurant) =====
function initFloorDrag() {
    const plan = document.getElementById('floor-plan');
    if (!plan || plan.dataset.dragBound) return;
    plan.dataset.dragBound = '1';

    plan.addEventListener('pointerdown', (e) => {
        const el = e.target.closest('.floor-table');
        if (!el || !el.dataset.tableId) return;
        e.preventDefault();
        const id = el.dataset.tableId;
        const table = TableManagement.getTable(id);
        if (!table) return;

        const rect = plan.getBoundingClientRect();
        const startX = e.clientX, startY = e.clientY;
        const origX = parseFloat(table.x), origY = parseFloat(table.y);
        let moved = false;
        el.classList.add('dragging');
        try { el.setPointerCapture(e.pointerId); } catch (err) {}

        const onMove = (ev) => {
            if (Math.abs(ev.clientX - startX) + Math.abs(ev.clientY - startY) > 6) moved = true;
            if (!moved) return;
            const dx = ((ev.clientX - startX) / rect.width) * 100;
            const dy = ((ev.clientY - startY) / rect.height) * 100;
            el.style.left = Math.max(0, Math.min(95, origX + dx)) + '%';
            el.style.top = Math.max(0, Math.min(92, origY + dy)) + '%';
        };
        const onUp = () => {
            el.classList.remove('dragging');
            el.removeEventListener('pointermove', onMove);
            el.removeEventListener('pointerup', onUp);
            el.removeEventListener('pointercancel', onUp);
            if (!moved) {
                selectTable(id);
                return;
            }
            const nx = Math.round(parseFloat(el.style.left));
            const ny = Math.round(parseFloat(el.style.top));
            TableManagement.updateTable(id, { x: nx, y: ny });
            SecuritySystem.logAction('table_moved', { tableId: id, x: nx, y: ny });
            if (selectedTableId === id) showTableDetails(id);
            showToast('Position enregistrée !');
        };
        el.addEventListener('pointermove', onMove);
        el.addEventListener('pointerup', onUp);
        el.addEventListener('pointercancel', onUp);
    });
}

// ===== Users Management (OWNER only) =====
function renderUsersList() {
    const list = document.getElementById('admin-users-list');
    if (!list) return;
    if (!isOwner()) {
        list.innerHTML = '<p class="empty-state">Accès réservé au OWNER.</p>';
        return;
    }
    const users = getUsers();
    const me = currentUser();
    list.innerHTML = users.map(u => `
        <div class="user-item">
            <div class="user-avatar">${esc(u.username.charAt(0).toUpperCase())}</div>
            <div class="user-meta">
                <h4>${esc(u.username)}</h4>
                <div class="user-pw">🔑 <code class="pw-val">••••••</code> <button type="button" class="pw-toggle" data-pw="${esc(u.pass || '')}" onclick="togglePw(this)">Voir</button></div>
                <span class="role-badge ${u.role}">${u.role === 'owner' ? 'OWNER' : 'STAFF'}</span>
                <span class="user-status ${u.active === false ? 'off' : 'on'}"> · ${u.active === false ? 'Désactivé' : 'Actif'}</span>
            </div>
            <div class="menu-item-actions">
                <button class="btn-icon btn-edit" onclick="resetUserPassword('${esc(u.username)}')" title="Changer le mot de passe">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>
                </button>
                ${me && u.username !== me.username ? `
                <button class="btn-icon btn-edit" onclick="toggleUserActive('${esc(u.username)}')" title="Activer / Désactiver">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
                </button>
                <button class="btn-icon btn-delete" onclick="deleteUserAccount('${esc(u.username)}')" title="Supprimer">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                </button>` : ''}
            </div>
        </div>
    `).join('');
}

async function resetUserPassword(username) {
    if (!isOwner()) {
        showToast('Accès réservé au OWNER.');
        return;
    }
    openModal('Mot de passe — ' + username, `
        <form id="reset-pw-form">
            <div class="form-group">
                <label>Nouveau mot de passe (min. 6 caractères)</label>
                <input type="password" id="reset-pw-value" required minlength="6">
            </div>
            <button type="submit" class="btn btn-primary">Enregistrer</button>
        </form>
    `);
    document.getElementById('reset-pw-form').addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const pw = document.getElementById('reset-pw-value').value;
        if (pw.length < 6) {
            showToast('6 caractères minimum.');
            return;
        }
        const users = getUsers();
        const u = users.find(x => x.username === username);
        if (!u) return;
        u.passHash = await SecuritySystem.hashPassword(pw);
        u.pass = pw;
        saveUsers(users);
        SecuritySystem.logAction('user_password_reset', { target: username });
        closeModal();
        showToast('Mot de passe mis à jour !');
    });
}

function togglePw(btn) {
    const code = btn.parentElement.querySelector('.pw-val');
    if (!code) return;
    if (btn.dataset.open === '1') {
        code.textContent = '••••••';
        btn.textContent = 'Voir';
        btn.dataset.open = '0';
    } else {
        const real = btn.getAttribute('data-pw') || '';
        code.textContent = real || '(ancien — réinitialisez le mot de passe)';
        btn.textContent = 'Cacher';
        btn.dataset.open = '1';
    }
}

function toggleUserActive(username) {
    if (!isOwner()) return;
    const users = getUsers();
    const u = users.find(x => x.username === username);
    if (!u) return;
    const me = currentUser();
    if (me && u.username === me.username) {
        showToast('Vous ne pouvez pas vous désactiver.');
        return;
    }
    u.active = u.active === false ? true : false;
    saveUsers(users);
    SecuritySystem.logAction('user_toggled', { target: username, active: u.active });
    renderUsersList();
    showToast(u.active ? 'Utilisateur activé.' : 'Utilisateur désactivé.');
}

function deleteUserAccount(username) {
    if (!isOwner()) return;
    const users = getUsers();
    const u = users.find(x => x.username === username);
    if (!u) return;
    const me = currentUser();
    if (me && u.username === me.username) {
        showToast('Vous ne pouvez pas vous supprimer.');
        return;
    }
    const activeOwners = users.filter(x => x.role === 'owner' && x.active !== false);
    if (u.role === 'owner' && activeOwners.length <= 1) {
        showToast('Impossible : dernier OWNER actif.');
        return;
    }
    if (!confirm(`Supprimer l'utilisateur ${username} ?`)) return;
    saveUsers(users.filter(x => x.username !== username));
    SecuritySystem.logAction('user_deleted', { target: username });
    renderUsersList();
    showToast('Utilisateur supprimé.');
}

const addUserForm = document.getElementById('add-user-form');
if (addUserForm) {
    addUserForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        if (!isOwner()) {
            showToast('Accès réservé au OWNER.');
            return;
        }
        const username = document.getElementById('new-username').value.trim().toLowerCase();
        const pw = document.getElementById('new-user-password').value;
        const role = document.getElementById('new-user-role').value;
        if (!/^[a-z0-9._-]{3,20}$/.test(username)) {
            showToast('Pseudo : 3-20 caractères (a-z 0-9 . _ -).');
            return;
        }
        if (pw.length < 6) {
            showToast('Mot de passe : 6 caractères minimum.');
            return;
        }
        if (findUser(username)) {
            showToast('Ce nom existe déjà.');
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
        SecuritySystem.logAction('user_created', { target: username, role });
        this.reset();
        renderUsersList();
        showToast(`Utilisateur ${username} créé !`);
    });
}

// ===== Email notifications (sent to the address set in Infos Restaurant) =====
async function postNotificationEmail(to, subject, body) {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 9000);
        const response = await fetch('https://formsubmit.co/ajax/' + encodeURIComponent(to), {
            method: 'POST',
            signal: controller.signal,
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({
                _subject: subject,
                _template: 'table',
                _captcha: 'false',
                ...body
            })
        });
        clearTimeout(timeout);
        return response.ok;
    } catch (e) {
        return false;
    }
}

function emailBadge(res) {
    const st = res.emailStatus || 'none';
    if (st === 'sent') return '✉ email envoyé';
    if (st === 'failed') return '✉ échec — à renvoyer';
    if (st === 'skipped') return '✉ non configuré';
    if (st === 'pending') return '✉ en attente';
    return '✉ —';
}

async function resendReservationEmail(idx) {
    const data = getData();
    const to = ((data.restaurant && data.restaurant.notifyEmail) || '').trim();
    if (!to) {
        showToast('Aucun email configuré (Infos Restaurant).');
        return;
    }
    const reservations = getReservations();
    const res = reservations[idx];
    if (!res) return;
    showToast("Envoi de l'email…");
    const ok = await postNotificationEmail(to,
        `Réservation ${res.id || ''} — ${res.name} | ${res.date} ${res.time} (renvoi)`,
        {
            'Restaurant': 'Saint Tropez — Sfax',
            ...(res.email ? { _replyto: res.email } : {}),
            'Référence': res.id || '—',
            'Nom': res.name,
            'Téléphone': res.phone,
            'Email client': res.email || '—',
            'Date': res.date,
            'Heure': res.time,
            'Personnes': res.guests,
            'Table': res.tableName || '—',
            'Statut': res.status || 'pending',
            'Message': res.message || '—'
        }
    );
    res.emailStatus = ok ? 'sent' : 'failed';
    saveReservations(reservations);
    renderReservationsTable();
    showToast(ok ? 'Email renvoyé !' : 'Échec — connexion ou activation requise.');
}

const testNotifyBtn = document.getElementById('test-notify-email');
if (testNotifyBtn) {
    testNotifyBtn.addEventListener('click', async () => {
        if (!isOwner()) {
            showToast('Accès réservé au OWNER.');
            return;
        }
        const input = document.getElementById('info-notify-email');
        const to = (input.value || '').trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
            showToast('Entrez un email valide.');
            return;
        }
        const data = getData();
        data.restaurant.notifyEmail = to;
        saveData(data);
        showToast('Envoi du test…');
        const ok = await postNotificationEmail(to,
            'Test — notifications Saint Tropez',
            {
                'Restaurant': 'Saint Tropez — Sfax',
                'Message': 'Ceci est un email de test. Les prochaines réservations arriveront ici automatiquement. (1ère fois : cliquez « Activer » dans cet email.)'
            }
        );
        showToast(ok ? 'Email de test envoyé ! Vérifiez la boîte.' : 'Échec — vérifiez la connexion Internet.');
    });
}

// ===== Floor plan background: uploaded image OR live map =====
function getFloorBg() {
    try { return localStorage.getItem('saintTropezFloorBg') || 'images/floor-plan.png'; }
    catch (e) { return 'images/floor-plan.png'; }
}

function renderFloorBgPreview() {
    const el = document.getElementById('floor-bg-preview');
    if (!el) return;
    let bg = null;
    try { bg = localStorage.getItem('saintTropezFloorBg'); } catch (e) {}
    if (bg === 'MAP') {
        el.innerHTML = '<p class="floor-bg-mode">🗺️ Fond actuel : <strong>Carte (Maps)</strong> — les tables sont posées sur la carte.</p>';
    } else if (bg) {
        el.innerHTML = `<img src="${esc(bg)}" alt="Fond du plan">`;
    } else {
        el.innerHTML = '<p class="empty-state">Aucun fond importé (fond par défaut).</p>';
    }
}

function setFloorBg(value) {
    try {
        if (value) localStorage.setItem('saintTropezFloorBg', value);
        else localStorage.removeItem('saintTropezFloorBg');
    } catch (e) {
        showToast('Stockage plein : image trop lourde.');
        return;
    }
    renderFloorBgPreview();
    if (typeof renderFloorPlan === 'function') renderFloorPlan();
    showToast(value === 'MAP' ? 'Fond carte activé !' : value ? 'Fond importé !' : 'Fond supprimé.');
}

const floorBgInput = document.getElementById('floor-bg-input');
const floorBgUpload = document.getElementById('floor-bg-upload');
const floorBgMap = document.getElementById('floor-bg-map');
const floorBgRemove = document.getElementById('floor-bg-remove');
if (floorBgUpload && floorBgInput) {
    floorBgUpload.addEventListener('click', () => floorBgInput.click());
    floorBgInput.addEventListener('change', () => {
        const f = floorBgInput.files && floorBgInput.files[0];
        floorBgInput.value = '';
        if (!f) return;
        if (!f.type.startsWith('image/')) {
            showToast('Choisissez une image.');
            return;
        }
        if (typeof openCropper !== 'function') {
            showToast('Module recadrage manquant.');
            return;
        }
        openCropper(f, { ratios: ['16:9', '4:3', '1:1', 'Libre'], maxDim: 1400, quality: 0.8 }, (dataUrl) => {
            if (!dataUrl) return;
            setFloorBg(dataUrl);
        });
    });
}
if (floorBgMap) floorBgMap.addEventListener('click', () => setFloorBg('MAP'));
if (floorBgRemove) floorBgRemove.addEventListener('click', () => setFloorBg(null));

// ===== Settings =====
const resetDataBtn = document.getElementById('reset-data');
if (resetDataBtn) {
    resetDataBtn.addEventListener('click', function() {
        if (confirm('Réinitialiser toutes les données par défaut? Cette action est irréversible.')) {
            localStorage.removeItem('saintTropezData');
            localStorage.removeItem('saintTropezReservations');
            showToast('Données réinitialisées!');
            initDashboard();
        }
    });
}

const passwordForm = document.getElementById('password-form');
if (passwordForm) {
    passwordForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const me = currentUser();
        if (!me) {
            showToast('Reconnectez-vous.');
            return;
        }
        const newPassword = document.getElementById('new-password').value;
        if (newPassword.length >= SecuritySystem.config.passwordMinLength) {
            const users = getUsers();
            const u = users.find(x => x.username === me.username);
            if (u) {
                u.passHash = await SecuritySystem.hashPassword(newPassword);
                u.pass = newPassword;
                saveUsers(users);
            }
            SecuritySystem.logAction('password_changed', { username: me.username });
            document.getElementById('new-password').value = '';
            showToast('Votre mot de passe a été changé !');
        } else {
            showToast(`Le mot de passe doit contenir au moins ${SecuritySystem.config.passwordMinLength} caractères`);
        }
    });
}

// ===== Initialize Dashboard =====
function initDashboard() {
    applyPermissions();
    updateStats();
    renderRecentReservations();
    loadInfoForm();
    renderMenuList();
    renderGalleryList();
    renderEventsList();
    loadVideoForm();
    renderReviewsList();
    renderReservationsTable();
    renderFloorPlan();
    renderFloorBgPreview();
    initFloorDrag();
    bindImageField('video-poster');
    renderUsersList();
    updateSecurityStatus();
    renderAuditLog();
}

// Make functions globally available for onclick handlers
window.editMenuItem = editMenuItem;
window.deleteMenuItem = deleteMenuItem;
window.editGalleryItem = editGalleryItem;
window.deleteGalleryItem = deleteGalleryItem;
window.editEvent = editEvent;
window.deleteEvent = deleteEvent;
window.editReview = editReview;
window.deleteReview = deleteReview;
window.assignReservationTable = assignReservationTable;
window.setReservationStatus = setReservationStatus;
window.deleteReservation = deleteReservation;
window.resendReservationEmail = resendReservationEmail;
window.resetUserPassword = resetUserPassword;
window.toggleUserActive = toggleUserActive;
window.deleteUserAccount = deleteUserAccount;
