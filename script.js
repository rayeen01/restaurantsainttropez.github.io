// ===== Data Store =====
const defaultData = {
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
        plusCode: "PQM8+9W Sfax",
        notifyEmail: "",
        videoUrl: "",
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

// Translations
const translations = {
    fr: {
        subtitle: "Restaurant de Fruits de Mer — Sfax",
        tagline: "Un dîner au Saint Tropez, là où les regards se croisent et les âmes se rapprochent."
    },
    ar: {
        subtitle: "مطعم المأكولات البحرية — صفاقس",
        tagline: "عشاء في سان تروباز، حيث تلتقي الأنظار وتقترب الأرواح."
    }
};

let currentLang = 'fr';

// ===== Safe storage helpers (never crash on corrupted data) =====
function getData() {
    try {
        const saved = localStorage.getItem('saintTropezData');
        if (!saved) return JSON.parse(JSON.stringify(defaultData));
        const parsed = JSON.parse(saved);
        if (!parsed || typeof parsed !== 'object') throw new Error('bad data');
        return parsed;
    } catch (e) {
        return JSON.parse(JSON.stringify(defaultData));
    }
}

function saveData(data) {
    try {
        localStorage.setItem('saintTropezData', JSON.stringify(data));
    } catch (e) { /* quota full — site keeps working */ }
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

// Escape HTML on output (prevents broken layout / XSS, keeps typing intact)
function esc(value) {
    if (value === null || value === undefined) return '';
    return String(value).replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;'
    }[c]));
}

// ===== Render Functions =====
function renderMenu(filter = '') {
    const data = getData();
    const grid = document.getElementById('menu-grid');
    if (!grid) return;

    const q = filter.toLowerCase();
    const filtered = data.menu.filter(item =>
        String(item.name).toLowerCase().includes(q) ||
        String(item.description).toLowerCase().includes(q)
    );

    if (filtered.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--color-text-light); padding: 40px;">Aucun plat trouvé</p>';
        return;
    }

    grid.innerHTML = filtered.map(item => `
        <div class="menu-card">
            ${item.badge ? `<div class="menu-badge">${esc(item.badge)}</div>` : ''}
            <div class="menu-image">
                <img src="${esc(item.image)}" alt="${esc(item.name)}" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                <div class="menu-image-placeholder" style="display: none;">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                </div>
            </div>
            <div class="menu-info">
                <h3>${esc(item.name)}</h3>
                <p>${esc(item.description)}</p>
                <div class="menu-footer">
                    <span class="menu-price">${esc(item.price)}</span>
                </div>
            </div>
        </div>
    `).join('');
}

function renderGallery() {
    const data = getData();
    const grid = document.getElementById('gallery-grid');
    if (!grid) return;

    grid.innerHTML = data.gallery.map(item => `
        <div class="gallery-item">
            <img src="${esc(item.image)}" alt="${esc(item.alt)}" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
            <div class="gallery-placeholder" style="display: none;">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
            </div>
        </div>
    `).join('');
}

function renderEvents() {
    const data = getData();
    const grid = document.querySelector('.events-grid');
    if (!grid || !Array.isArray(data.events)) return;

    grid.innerHTML = data.events.map(event => `
        <div class="event-card">
            <div class="event-date">
                <span class="event-day">${esc(event.day)}</span>
                <span class="event-month">${esc(event.month)}</span>
            </div>
            <div class="event-info">
                <h3>${esc(event.title)}</h3>
                <p>${esc(event.description)}</p>
                <span class="event-price">${esc(event.price)}</span>
            </div>
        </div>
    `).join('');
}

function renderReviews() {
    const data = getData();
    const grid = document.getElementById('reviews-grid');
    if (!grid) return;

    grid.innerHTML = data.reviews.map(review => {
        const stars = Math.max(1, Math.min(5, parseInt(review.stars, 10) || 5));
        return `
        <div class="review-card">
            <div class="review-header">
                <div class="review-avatar">${esc(String(review.name).charAt(0))}</div>
                <div>
                    <h4>${esc(review.name)}</h4>
                    <span class="review-meta">${esc(review.meta)}</span>
                </div>
            </div>
            <div class="review-stars">${'★'.repeat(stars)}${'☆'.repeat(5 - stars)}</div>
            <p class="review-text">"${esc(review.text)}"</p>
        </div>
    `; }).join('');
}

// ===== Navbar scroll effect =====
const navbar = document.getElementById('navbar');
if (navbar) {
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
}

// ===== Mobile menu toggle =====
const hamburger = document.getElementById('hamburger');
const navLinks = document.querySelector('.nav-links');

if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        hamburger.classList.toggle('active');
    });
}

// ===== Smooth scroll =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href.length < 2) return;
        const target = document.querySelector(href);
        if (target) {
            e.preventDefault();
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        if (navLinks && navLinks.classList.contains('active')) {
            navLinks.classList.remove('active');
            if (hamburger) hamburger.classList.remove('active');
        }
    });
});

// ===== Menu Search =====
const menuSearch = document.getElementById('menu-search');
if (menuSearch) {
    menuSearch.addEventListener('input', (e) => {
        renderMenu(e.target.value);
    });
}

// ===== Live customizations (Developer console) =====
function getTheme() {
    try { return JSON.parse(localStorage.getItem('saintTropezTheme') || '{}'); }
    catch (e) { return {}; }
}

function applyTheme() {
    const theme = getTheme();
    Object.keys(theme).forEach(k => {
        if (/^--[a-z-]+$/.test(k)) {
            try { document.documentElement.style.setProperty(k, theme[k]); } catch (e) {}
        }
    });
}

function getStrings(lang) {
    let over = {};
    try { over = JSON.parse(localStorage.getItem('saintTropezI18n') || '{}')[lang] || {}; } catch (e) {}
    return { ...translations[lang], ...over };
}

function applyStrings(lang) {
    const t = getStrings(lang);
    if (!t) return;
    document.querySelectorAll('[data-i18n="subtitle"]').forEach(el => {
        if (t.subtitle) el.textContent = t.subtitle;
    });
    document.querySelectorAll('[data-i18n="tagline"]').forEach(el => {
        if (t.tagline) el.textContent = t.tagline;
    });
}

function applySections() {
    let s = {};
    try { s = JSON.parse(localStorage.getItem('saintTropezSections') || '{}'); } catch (e) {}
    const map = { video: 'video', events: 'evenements', gallery: 'galerie', reviews: 'avis' };
    Object.keys(map).forEach(k => {
        if (s[k] === false) {
            const el = document.getElementById(map[k]);
            if (el) el.style.display = 'none';
        }
    });
}

// ===== Language Toggle =====
const langToggle = document.getElementById('lang-toggle');
if (langToggle) {
    langToggle.addEventListener('click', () => {
        currentLang = currentLang === 'fr' ? 'ar' : 'fr';
        applyStrings(currentLang);

        document.documentElement.dir = currentLang === 'ar' ? 'rtl' : 'ltr';
    });
}

// Client floor background (imported in owner admin, 'MAP', or default file)
function getFloorBg() {
    try { return localStorage.getItem('saintTropezFloorBg') || 'images/floor-plan.png'; }
    catch (e) { return 'images/floor-plan.png'; }
}

const MAP_EMBED_URL = 'https://maps.google.com/maps?q=Restaurant%20Saint%20Tropez%2C%20Rue%20Tazarka%2C%203000%20Sfax%2C%20Tunisie&t=&z=17&ie=UTF8&iwloc=&output=embed';

// ===== Client table picker (visual floor plan, same tracing as admin) =====
let clientTableId = null;

function guestsNeeded() {
    const guestsEl = document.getElementById('guests');
    if (!guestsEl || !guestsEl.value) return 0;
    return Math.max(1, parseInt(guestsEl.value, 10) || 1);
}

function renderClientTables() {
    const picker = document.getElementById('table-picker');
    const hint = document.getElementById('table-picker-hint');
    const hidden = document.getElementById('selected-table');
    const phoneBox = document.getElementById('table-phone-box');
    if (!picker) return;

    const bg = getFloorBg();
    if (bg === 'MAP') {
        picker.style.backgroundImage = 'none';
    } else {
        picker.style.backgroundImage = bg ? `url("${bg}")` : 'none';
    }
    const mapBg = bg === 'MAP'
        ? `<iframe class="client-map-bg" title="Fond carte" src="${MAP_EMBED_URL}" loading="lazy" tabindex="-1"></iframe>`
        : '';

    const TM = window.TableManagement;
    if (!TM) {
        if (hint) hint.textContent = 'Choix de table indisponible — une table vous sera assignée sur place.';
        picker.innerHTML = '';
        if (phoneBox) phoneBox.style.display = 'none';
        return;
    }

    const tables = TM.getTables();
    if (!tables.length) {
        picker.innerHTML = '';
        if (hint) hint.textContent = 'Aucune table configurée pour le moment — appelez-nous au 74 203 355.';
        return;
    }

    const rangeOf = (t) => TM.rangeLabel ? TM.rangeLabel(t) : ((t.capacity || '?') + 'p');
    const needed = guestsNeeded();

    // The plan is ALWAYS visible. Before guests are chosen, tables are
    // shown locked so the client sees the tracing (with persons per table).
    if (!needed) {
        if (hint) hint.textContent = 'Voici notre plan de salle — chaque table affiche ses places (ex : 1–2 pers., Table 10 = 7–8 pers.). Sélectionnez le nombre de personnes pour réserver en ligne.';
        picker.innerHTML = mapBg + tables.map(t => `
        <button type="button" class="cf-table ${t.status === 'available' ? 'cf-small' : 'cf-' + t.status}"
                style="left: ${t.x}%; top: ${t.y}%;"
                disabled title="${esc(t.name)} — choisissez d'abord le nombre de personnes">
            <span class="tp-name">${esc(t.name)}</span>
            <span class="tp-cap">${rangeOf(t)} · ${t.isVip ? 'VIP' : t.isOutdoor ? 'Terrasse' : 'Std'}</span>
        </button>`).join('');
        if (hidden) hidden.value = '';
        clientTableId = null;
        if (phoneBox) phoneBox.style.display = 'none';
        return;
    }

    const fittingAvailable = tables.some(t => t.status === 'available' && TM.fitsGuests(t, needed));

    if (hint) hint.textContent = fittingAvailable
        ? 'Touchez une table VERTE sur le plan pour la choisir.'
        : `Aucune table libre pour ${needed} personne(s) en ligne — réservez par téléphone ci-dessous.`;

    picker.innerHTML = mapBg + tables.map(t => {
        const free = t.status === 'available';
        const fits = TM.fitsGuests(t, needed);
        const tooSmall = free && !fits && needed > t.capacity;
        const ok = free && fits;
        const cls = !free ? ('cf-' + t.status) : (fits ? '' : 'cf-small');
        const range = rangeOf(t);
        const label = !free
            ? (t.status === 'reserved' ? 'Réservée' : 'Occupée')
            : (fits ? `Libre — ${range}, touchez pour choisir` : (tooSmall ? 'Trop petite pour votre groupe' : `Trop grande — ${range} uniquement`));
        return `
        <button type="button" class="cf-table ${cls} ${clientTableId === t.id ? 'selected' : ''}"
                style="left: ${t.x}%; top: ${t.y}%;"
                data-table="${t.id}" ${ok ? '' : 'disabled'}
                title="${esc(t.name)} — ${label}">
            <span class="tp-name">${esc(t.name)}</span>
            <span class="tp-cap">${range} · ${t.isVip ? 'VIP' : t.isOutdoor ? 'Terrasse' : 'Std'}</span>
        </button>`;
    }).join('');

    // Big groups / no fitting table → phone reservation box (shown to the client)
    if (phoneBox) {
        if (!fittingAvailable) {
            phoneBox.style.display = 'block';
            phoneBox.innerHTML = `
                <strong>📞 Groupes de ${needed} — réservation par téléphone</strong>
                <p>Aucune table en ligne pour ce nombre. Appelez-nous, on vous prépare une place !</p>
                <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:10px;">
                    <a href="tel:+21674203355" class="btn btn-gold">74 203 355</a>
                    <a href="https://wa.me/21674203355?text=${encodeURIComponent('Bonjour, nous sommes ' + needed + ' personnes, je veux réserver une table.')}" target="_blank" rel="noopener" class="btn btn-whatsapp">WhatsApp</a>
                </div>`;
        } else {
            phoneBox.style.display = 'none';
            phoneBox.innerHTML = '';
        }
    }

    picker.querySelectorAll('.cf-table:not(:disabled)').forEach(btn => {
        btn.addEventListener('click', () => {
            clientTableId = btn.dataset.table;
            if (hidden) hidden.value = clientTableId;
            picker.querySelectorAll('.cf-table').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
        });
    });
}

const guestsSelect = document.getElementById('guests');
if (guestsSelect) {
    guestsSelect.addEventListener('change', () => {
        clientTableId = null;
        const hidden = document.getElementById('selected-table');
        if (hidden) hidden.value = '';
        renderClientTables();
    });
}

// ===== Professional email notification (no backend needed) =====
async function sendReservationEmail(to, reservation, tableName) {
    if (!to) return 'skipped';
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 9000);
        const response = await fetch('https://formsubmit.co/ajax/' + encodeURIComponent(to), {
            method: 'POST',
            signal: controller.signal,
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({
                _subject: `Nouvelle réservation — ${reservation.name} | ${reservation.date} ${reservation.time}`,
                _template: 'table',
                _captcha: 'false',
                'Restaurant': 'Saint Tropez — Sfax',
                ...(reservation.email ? { _replyto: reservation.email } : {}),
                'Référence': reservation.id,
                'Nom': reservation.name,
                'Téléphone': reservation.phone,
                'Email client': reservation.email || '—',
                'Date': reservation.date,
                'Heure': reservation.time,
                'Personnes': reservation.guests,
                'Table': tableName || 'À assigner sur place',
                'Message': reservation.message || '—'
            })
        });
        clearTimeout(timeout);
        return response.ok ? 'sent' : 'failed';
    } catch (e) {
        return 'failed';
    }
}

// ===== Reservation Form =====
const reservationForm = document.getElementById('reservation-form');
if (reservationForm) {
    reservationForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const name = document.getElementById('name').value.trim();
        const phone = document.getElementById('phone').value.trim();
        const emailEl = document.getElementById('client-email');
        const email = emailEl ? emailEl.value.trim() : '';
        const date = document.getElementById('date').value;
        const time = document.getElementById('time').value;
        const guests = document.getElementById('guests').value;
        const message = document.getElementById('message').value.trim();

        if (!name || !phone || !date || !time || !guests) {
            alert('Veuillez remplir tous les champs obligatoires.');
            return;
        }
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            alert('Veuillez entrer un email valide (ou laissez vide).');
            return;
        }

        const TM = window.TableManagement;
        const needed = Math.max(1, parseInt(guests, 10) || 1);
        let tableId = null;
        let tableName = null;

        if (TM) {
            const chosen = clientTableId ? TM.getTable(clientTableId) : null;
            if (chosen) {
                if (chosen.status !== 'available') {
                    alert(`La ${chosen.name} n'est plus libre. Choisissez une autre table.`);
                    clientTableId = null;
                    renderClientTables();
                    return;
                }
                if (!TM.fitsGuests(chosen, needed)) {
                    alert(`Impossible : la ${chosen.name} (${chosen.capacity} places) accepte uniquement ${TM.rangeLabel(chosen)}.\nVous êtes ${needed} personne(s) — choisissez une table adaptée.`);
                    return;
                }
                tableId = chosen.id;
                tableName = chosen.name;
            } else {
                const best = TM.findBestTable(needed);
                if (best) {
                    tableId = best.id;
                    tableName = best.name;
                } else {
                    alert(`Aucune table libre pour ${needed} personne(s).\nRègle : table 2 = 1-2 pers., table 4 = 3-4 pers., table 6 = 5-6 pers.\nAppelez-nous au 74 203 355, on vous trouvera une place !`);
                    return;
                }
            }
        }

        const reservation = {
            id: 'R' + Date.now().toString(36).toUpperCase(),
            name, phone, email, date, time, guests, message,
            tableId, tableName,
            status: 'pending',
            submittedAt: new Date().toISOString()
        };

        const reservations = getReservations();
        reservations.push(reservation);
        try {
            localStorage.setItem('saintTropezReservations', JSON.stringify(reservations));
        } catch (err) {
            alert('Stockage plein — appelez-nous directement au 74 203 355.');
            return;
        }

        if (TM && tableId) {
            TM.assignTable(reservation.id, tableId);
        }

        // WhatsApp confirmation link
        const waText =
            `Bonjour Saint Tropez, je souhaite réserver une table.\n\n` +
            `Réf: ${reservation.id}\nNom: ${name}\nTél: ${phone}\n` +
            `Date: ${date}\nHeure: ${time}\nPersonnes: ${guests}\n` +
            `Table: ${tableName || 'À assigner'}\n` +
            (message ? `Message: ${message}` : '');
        const waLink = 'https://wa.me/21674203355?text=' + encodeURIComponent(waText);

        // Show confirmation immediately, then send the email
        this.style.display = 'none';
        const confirmation = document.getElementById('reservation-confirmation');
        if (confirmation) {
            confirmation.style.display = 'block';
            confirmation.innerHTML = `
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                <p>Merci <strong>${esc(name)}</strong> ! Votre demande <strong>${esc(reservation.id)}</strong> est enregistrée.</p>
                <div class="booking-summary">
                    <div><span>Date</span><strong>${esc(date)} à ${esc(time)}</strong></div>
                    <div><span>Personnes</span><strong>${esc(guests)}</strong></div>
                    <div><span>Table</span><strong>${esc(tableName || 'Assignée sur place')}</strong></div>
                </div>
                <p style="margin-top: 12px; font-size: 0.9rem;">Confirmez aussi via WhatsApp :</p>
                <a href="${waLink}" target="_blank" rel="noopener" class="btn btn-whatsapp" style="margin-top: 8px;">
                    Confirmer via WhatsApp
                </a>
                <p class="email-status" id="email-status">Envoi de la notification email…</p>
            `;
        }

        // Professional email to the restaurant (configured in admin).
        // If NO email is set in admin → nothing is sent, ever.
        const notifyTo = (getData().restaurant.notifyEmail || '').trim();
        const emailStatus = document.getElementById('email-status');
        const persistEmailStatus = (st) => {
            reservation.emailStatus = st;
            try {
                const all = getReservations();
                const i = all.findIndex(r => r.id === reservation.id);
                if (i !== -1) {
                    all[i].emailStatus = st;
                    all[i].tableName = reservation.tableName;
                    localStorage.setItem('saintTropezReservations', JSON.stringify(all));
                }
            } catch (err) {}
        };
        if (!notifyTo) {
            persistEmailStatus('skipped');
            if (emailStatus) emailStatus.textContent = '';
        } else {
            const result = await sendReservationEmail(notifyTo, reservation, tableName);
            persistEmailStatus(result === 'sent' ? 'sent' : 'failed');
            if (emailStatus) {
                emailStatus.textContent = result === 'sent'
                    ? '✓ Le restaurant a reçu votre demande par email.'
                    : '⚠ Email en attente (hors ligne ou activation requise) — renvoi automatique. Utilisez WhatsApp pour confirmer.';
            }
        }
    });
}

// ===== Retry pending email notifications (so NOTHING is lost) =====
async function retryPendingEmails() {
    try {
        if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
        const notifyTo = (getData().restaurant.notifyEmail || '').trim();
        if (!notifyTo) return; // no email set → never send
        const all = getReservations();
        const pending = all.filter(r => r.emailStatus === 'failed' || r.emailStatus === 'pending');
        if (!pending.length) return;
        let changed = false;
        for (const r of pending) {
            const result = await sendReservationEmail(notifyTo, r, r.tableName);
            const st = result === 'sent' ? 'sent' : 'failed';
            if (r.emailStatus !== st) {
                r.emailStatus = st;
                changed = true;
            }
        }
        if (changed) {
            try { localStorage.setItem('saintTropezReservations', JSON.stringify(all)); } catch (e) {}
        }
    } catch (e) { /* silent */ }
}

// ===== Video section (imported file or link, hidden if none) =====
async function initVideo() {
    const section = document.getElementById('video');
    const video = document.getElementById('restaurant-video');
    if (!section || !video) return;
    const data = getData();
    const url = ((data.restaurant && data.restaurant.videoUrl) || '').trim();
    if (!url) {
        section.style.display = 'none';
        return;
    }
    const src = (typeof resolveMediaURL === 'function') ? await resolveMediaURL(url) : url;
    if (!src) {
        section.style.display = 'none';
        return;
    }
    section.style.display = '';
    video.src = src;
    const poster = ((data.restaurant && data.restaurant.videoPoster) || '').trim();
    if (poster) {
        const psrc = (typeof resolveMediaURL === 'function') ? await resolveMediaURL(poster) : poster;
        if (psrc) video.poster = psrc;
    }
    try { video.load(); } catch (e) {}
}

// ===== Initialize =====
document.addEventListener('DOMContentLoaded', () => {
    applyTheme();
    applyStrings('fr');
    applySections();
    renderMenu();
    renderGallery();
    renderEvents();
    renderReviews();
    renderClientTables();
    initVideo();
    retryPendingEmails();
    window.addEventListener('online', retryPendingEmails);

    const dateInput = document.getElementById('date');
    if (dateInput) {
        try {
            dateInput.min = new Date().toISOString().split('T')[0];
        } catch (e) {}
    }
});
