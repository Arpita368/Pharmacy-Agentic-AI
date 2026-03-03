/**
 * inventory.js — AI Powered Inventory Intelligence
 */

document.addEventListener('DOMContentLoaded', () => {

    let inventory = [];

    const tbody = document.getElementById('inventory-body');
    const statsRow = document.getElementById('inv-stats');
    const searchInput = document.getElementById('search-input');
    const statusFilter = document.getElementById('filter-status');
    const emptyState = document.getElementById('empty-state');

    // ===============================
    // 🔥 FETCH PRODUCTS FROM BACKEND
    // ===============================
    async function loadProducts() {
        try {
            const res = await fetch("http://127.0.0.1:8000/products");
            inventory = await res.json();

            inventory = inventory.map(p => ({
                id: p.id,
                name: p.product_name || p.name,
                stock: p.stock ?? 0,
                price: p.price_rec ?? p.price ?? 0,
                package: p.package_size || "-",
                rx: p.prescription_required || false
            }));

            renderStats();
            renderTable();

        } catch (err) {
            console.error("Error loading products:", err);
            showToast("Server connection error", "error");
        }
    }

    // ===============================
    // 📊 AI DEMAND LOGIC
    // ===============================
    function getDemandLevel(stock) {
        if (stock <= 10) return { label: "HIGH", color: "red" };
        if (stock <= 40) return { label: "MEDIUM", color: "orange" };
        return { label: "LOW", color: "green" };
    }

    function getReorderSuggestion(stock) {
        if (stock <= 10) return 150;
        if (stock <= 40) return 60;
        return 0;
    }

    function getStatus(stock) {
        if (stock === 0) return { label: 'Out of Stock', cls: 'badge-danger' };
        if (stock <= 40) return { label: 'Low Stock', cls: 'badge-warn' };
        return { label: 'In Stock', cls: 'badge-green' };
    }

    // ===============================
    // 📊 STATS
    // ===============================
    function renderStats() {
        const total = inventory.length;
        const low = inventory.filter(i => i.stock <= 40 && i.stock > 0).length;
        const out = inventory.filter(i => i.stock === 0).length;

        statsRow.innerHTML = `
            <div class="inv-stat-card">
                <div class="inv-stat-val">${total}</div>
                <div class="inv-stat-label">Total Medicines</div>
            </div>
            <div class="inv-stat-card">
                <div class="inv-stat-val">${low}</div>
                <div class="inv-stat-label">Low Stock</div>
            </div>
            <div class="inv-stat-card">
                <div class="inv-stat-val">${out}</div>
                <div class="inv-stat-label">Out of Stock</div>
            </div>
            <div class="inv-stat-card">
                <div class="inv-stat-val">AI</div>
                <div class="inv-stat-label">Inventory Intelligence</div>
            </div>
        `;
    }

    // ===============================
    // 📋 TABLE RENDER
    // ===============================
    function renderTable() {

        const query = searchInput.value.toLowerCase();
        const statusVal = statusFilter.value;

        const filtered = inventory.filter(item => {
            const matchQ = item.name.toLowerCase().includes(query);
            const matchStatus = !statusVal || getStatus(item.stock).label === statusVal;
            return matchQ && matchStatus;
        });

        tbody.innerHTML = '';
        emptyState.classList.toggle('hidden', filtered.length > 0);

        filtered.forEach(item => {

            const demand = getDemandLevel(item.stock);
            const reorder = getReorderSuggestion(item.stock);
            const status = getStatus(item.stock);

            const tr = document.createElement('tr');

            tr.innerHTML = `
                <td>
                    <div class="med-name">
                        ${item.name}
                        ${item.rx ? '<span class="badge badge-teal">Rx</span>' : ''}
                    </div>
                    <div class="med-id">#${item.id}</div>
                </td>

                <td>${item.package}</td>

                <td><strong>${item.stock}</strong></td>

                <td>
                    <span style="color:${demand.color}; font-weight:700">
                        ${demand.label}
                    </span>
                </td>

                <td>
                    ${reorder > 0
                        ? `<span style="color:orange;font-weight:700">${reorder}</span>`
                        : '<span style="color:green">OK</span>'}
                </td>

                <td>
                    <span class="badge ${status.cls}">
                        ${status.label}
                    </span>
                </td>
            `;

            tbody.appendChild(tr);
        });
    }

    // ===============================
    // 🔎 FILTER EVENTS
    // ===============================
    searchInput.addEventListener('input', renderTable);
    statusFilter.addEventListener('change', renderTable);

    // ===============================
    // 🚀 INIT
    // ===============================
    loadProducts();


  // ── Modal ──────────────────────────────────────────────────
    function openModal(title = 'Add Medicine') {
        document.getElementById('modal-title').textContent = title;
        modal.classList.remove('hidden');
    }
    function closeModal() { modal.classList.add('hidden'); form.reset(); editingId = null; }

    function openEdit(id) {
        const item = inventory.find(i => i.id === id);
        if (!item) return;
        editingId = id;
        document.getElementById('f-name').value = item.name;
        document.getElementById('f-cat').value = item.category;
        document.getElementById('f-stock').value = item.stock;
        document.getElementById('f-price').value = item.price;
        document.getElementById('f-rx').value = String(item.rx);
        openModal('Edit Medicine');
    }

    function deleteItem(id) {
        inventory = inventory.filter(i => i.id !== id);
        save(); renderStats(); renderTable();
        showToast('Medicine removed', 'warn');
    }

    // ── Form Submit ────────────────────────────────────────────
    form.addEventListener('submit', e => {
        e.preventDefault();
        const stock = parseInt(document.getElementById('f-stock').value);
        const item = {
            name: document.getElementById('f-name').value.trim(),
            category: document.getElementById('f-cat').value,
            stock,
            price: parseFloat(document.getElementById('f-price').value),
            rx: document.getElementById('f-rx').value === 'true',
        };
        if (editingId) {
            const idx = inventory.findIndex(i => i.id === editingId);
            inventory[idx] = { ...inventory[idx], ...item };
            showToast('Medicine updated', 'success');
        } else {
            item.id = nextId++;
            inventory.push(item);
            showToast('Medicine added', 'success');
        }
        save(); renderStats(); renderTable(); closeModal();
    });

    // ── Events ────────────────────────────────────────────────
    document.getElementById('add-btn').addEventListener('click', openModal);
    document.getElementById('modal-close').addEventListener('click', closeModal);
    document.getElementById('modal-cancel').addEventListener('click', closeModal);
    modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
    [searchInput, catFilter, statusFilter].forEach(el => el.addEventListener('input', renderTable));

    function save() { storageSet('pharma_inventory', inventory); }

    renderStats();
    renderTable();
});