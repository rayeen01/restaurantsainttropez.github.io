// ===== Table Management System =====

const TableManagement = {
    // Default table layout for Saint Tropez
    defaultTables: [
        { id: 'T1', name: 'Table 1', capacity: 2, x: 10, y: 15, shape: 'round', status: 'available' },
        { id: 'T2', name: 'Table 2', capacity: 2, x: 25, y: 15, shape: 'round', status: 'available' },
        { id: 'T3', name: 'Table 3', capacity: 4, x: 45, y: 10, shape: 'square', status: 'available' },
        { id: 'T4', name: 'Table 4', capacity: 4, x: 60, y: 10, shape: 'square', status: 'available' },
        { id: 'T5', name: 'Table 5', capacity: 6, x: 80, y: 10, shape: 'rectangular', status: 'available' },
        { id: 'T6', name: 'Table 6', capacity: 2, x: 10, y: 40, shape: 'round', status: 'available' },
        { id: 'T7', name: 'Table 7', capacity: 2, x: 25, y: 40, shape: 'round', status: 'available' },
        { id: 'T8', name: 'Table 8', capacity: 4, x: 45, y: 35, shape: 'square', status: 'available' },
        { id: 'T9', name: 'Table 9', capacity: 4, x: 60, y: 35, shape: 'square', status: 'available' },
        { id: 'T10', name: 'Table 10', capacity: 8, x: 80, y: 35, shape: 'rectangular', status: 'available' },
        { id: 'T11', name: 'VIP 1', capacity: 6, x: 15, y: 65, shape: 'rectangular', status: 'available', isVip: true },
        { id: 'T12', name: 'VIP 2', capacity: 6, x: 35, y: 65, shape: 'rectangular', status: 'available', isVip: true },
        { id: 'T13', name: 'Terrace 1', capacity: 4, x: 60, y: 60, shape: 'square', status: 'available', isOutdoor: true },
        { id: 'T14', name: 'Terrace 2', capacity: 4, x: 80, y: 60, shape: 'square', status: 'available', isOutdoor: true }
    ],

    _safeParse(raw) {
        try {
            if (!raw) return null;
            const v = JSON.parse(raw);
            return Array.isArray(v) ? v : null;
        } catch (e) {
            return null;
        }
    },

    getTables() {
        const saved = this._safeParse(localStorage.getItem('saintTropezTables'));
        if (saved) return saved.map(t => ({ ...t }));
        // Return a copy so callers can never mutate the defaults
        return this.defaultTables.map(t => ({ ...t }));
    },

    saveTables(tables) {
        localStorage.setItem('saintTropezTables', JSON.stringify(tables));
    },

    getTable(id) {
        if (!id) return null;
        return this.getTables().find(t => t.id === id) || null;
    },

    tableLabel(id) {
        const t = this.getTable(id);
        return t ? t.name : '—';
    },

    updateTable(id, updates) {
        const tables = this.getTables();
        const index = tables.findIndex(t => t.id === id);
        if (index !== -1) {
            tables[index] = { ...tables[index], ...updates };
            this.saveTables(tables);
            return tables[index];
        }
        return null;
    },

    addTable(table) {
        const tables = this.getTables();
        table.id = 'T' + Date.now();
        table.status = 'available';
        tables.push(table);
        this.saveTables(tables);
        return table;
    },

    deleteTable(id) {
        const tables = this.getTables().filter(t => t.id !== id);
        this.saveTables(tables);
    },

    getAvailableTables(guests = 1) {
        const n = Math.max(1, parseInt(guests, 10) || 1);
        return this.getTables().filter(t =>
            t.status === 'available' && t.capacity >= n
        );
    },

    // STRICT seating rule: a table seats (capacity-1) to capacity ONLY.
    // Table 2 → 1-2 pers. | Table 4 → 3-4 pers. | Table 6 → 5-6 pers.
    minGuestsFor(capacity) {
        const c = Math.max(1, parseInt(capacity, 10) || 1);
        return c <= 1 ? 1 : c - 1;
    },

    fitsGuests(table, guests) {
        if (!table) return false;
        const g = parseInt(guests, 10);
        if (!g || g < 1) return false;
        const c = parseInt(table.capacity, 10) || 0;
        return g >= this.minGuestsFor(c) && g <= c;
    },

    rangeLabel(table) {
        const c = parseInt(table.capacity, 10) || 0;
        return `${this.minGuestsFor(c)}–${c} pers.`;
    },

    // Only FREE tables that STRICTLY fit the party
    getFittingTables(guests = 1) {
        return this.getTables()
            .filter(t => t.status === 'available' && this.fitsGuests(t, guests))
            .sort((a, b) => a.capacity - b.capacity);
    },

    // Smallest free table that STRICTLY fits the party (best fit)
    findBestTable(guests = 1) {
        const fitting = this.getFittingTables(guests);
        return fitting.length ? fitting[0] : null;
    },

    getTablesByStatus(status) {
        return this.getTables().filter(t => t.status === status);
    },

    // Assign reservation to table
    assignTable(reservationId, tableId) {
        const table = this.getTable(tableId);
        if (!table) return null;

        this.updateTable(tableId, {
            status: 'reserved',
            reservationId: reservationId
        });
        return table;
    },

    // Free a table
    freeTable(tableId) {
        if (!tableId) return null;
        return this.updateTable(tableId, {
            status: 'available',
            reservationId: null
        });
    },

    // Get stats
    getStats() {
        const tables = this.getTables();
        return {
            total: tables.length,
            available: tables.filter(t => t.status === 'available').length,
            reserved: tables.filter(t => t.status === 'reserved').length,
            occupied: tables.filter(t => t.status === 'occupied').length,
            totalCapacity: tables.reduce((sum, t) => sum + (parseInt(t.capacity, 10) || 0), 0),
            vipTables: tables.filter(t => t.isVip).length,
            outdoorTables: tables.filter(t => t.isOutdoor).length
        };
    }
};

// Export
window.TableManagement = TableManagement;
