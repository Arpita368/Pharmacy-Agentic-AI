/**
 * scanner.js — Rx Prescription Scan Logic (AI Version)
 */

document.addEventListener('DOMContentLoaded', () => {

    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const browseBtn = document.getElementById('browse-btn');
    const rescanBtn = document.getElementById('rescan-btn');
    const dropIdle = document.getElementById('drop-idle');
    const dropScanning = document.getElementById('drop-scanning');
    const dropDone = document.getElementById('drop-done');
    const scanStatus = document.getElementById('scan-status');
    const resultPanel = document.getElementById('results-panel');
    const recentList = document.getElementById('recent-list');
    const addToCartBtn = document.getElementById('add-to-cart-btn');

    let recentScans = storageGet('recent_scans', []);
    let currentMeds = [];

    // ─────────────────────────
    // STATE HANDLING
    // ─────────────────────────
    function setState(state) {
        dropIdle.classList.toggle('hidden', state !== 'idle');
        dropScanning.classList.toggle('hidden', state !== 'scanning');
        dropDone.classList.toggle('hidden', state !== 'done');
    }

    // ─────────────────────────
    // START SCAN PROCESS
    // ─────────────────────────
    async function startScan(file) {

        setState('scanning');
        resultPanel.classList.add('hidden');

        const messages = [
            "Uploading prescription…",
            "AI analyzing handwriting…",
            "Extracting medicines…",
            "Checking inventory…"
        ];

        let i = 0;
        const interval = setInterval(() => {
            scanStatus.textContent = messages[i++ % messages.length];
        }, 700);

        try {

            if (!file) throw new Error("No file selected");

            const formData = new FormData();
            formData.append("file", file);

            const response = await fetch("http://127.0.0.1:8000/scan-prescription", {
                method: "POST",
                body: formData
            });

            const data = await response.json();
            clearInterval(interval);

            if (!response.ok || data.status !== "success") {
                throw new Error(data.message || "Scan failed");
            }

            setState('done');

            document.getElementById('filename-display').textContent =
                file?.name || "prescription.jpg";

            // ⭐ Map backend response
            currentMeds = (data.orders || []).map(o => ({
                name: o.product,
                price: Number(o.total_price || 0),
                rx: o.prescription_required || false,
                dosage: o.dosage || "As prescribed",
                available: o.available || false
            }));

            showResults(currentMeds, file?.name);
            saveRecent(file?.name, currentMeds.length);

        } catch (err) {
            console.error("Scan error:", err);
            clearInterval(interval);
            showToast(err.message || "Unable to process prescription", "error");
            setState('idle');
        }
    }

    // ─────────────────────────
    // DISPLAY RESULTS
    // ─────────────────────────
    function showResults(products, filename) {

    document.getElementById('results-date').textContent =
        `Scanned: ${new Date().toLocaleString()} — ${filename || ''}`;

    if (!products.length) {
        document.getElementById('detected-meds').innerHTML =
            "<p>No medicines detected.</p>";
        resultPanel.classList.remove('hidden');
        updateAddButtonState([]);
        return;
    }

    const html = products.map(p => {

        const badge = p.available
            ? `<span class="med-result-stock available">✓ Available</span>`
            : `<span class="med-result-stock unavailable">✗ Unavailable</span>`;

        return `
        <div class="med-result-card">
            <div class="med-result-info">
                <div class="med-result-name">${p.name}</div>
                <div class="med-result-dose">
                    ${p.available 
                        ? `₹${p.price}` 
                        : `<span style="color:var(--color-muted)">Not in inventory</span>`}
                    ${p.rx && p.available ? '<span class="badge badge-red">Rx Required</span>' : ''}
                </div>

                ${!p.available && p.dosage 
                    ? `<div style="font-size:0.8rem;color:var(--color-muted)">
                        ${p.dosage}
                       </div>`
                    : ''
                }
            </div>
            ${badge}
        </div>`;
    }).join('');

    document.getElementById('detected-meds').innerHTML = html;
    resultPanel.classList.remove('hidden');

    // ⭐ Update button state
    updateAddButtonState(products);
}
    /*function showResults(products, filename) {

        document.getElementById('results-date').textContent =
            `Scanned: ${new Date().toLocaleString()} — ${filename || ''}`;

        if (!products.length) {
            document.getElementById('detected-meds').innerHTML =
                "<p>No medicines detected.</p>";
            resultPanel.classList.remove('hidden');
            return;
        }

        const html = products.map(p => {

            const badge = p.available
                ? `<span class="med-result-stock available">✓ Available</span>`
                : `<span class="med-result-stock unavailable">✗ Unavailable</span>`;

            return `
            <div class="med-result-card">
                <div class="med-result-info">
                    <div class="med-result-name">${p.name}</div>
                    <div class="med-result-dose">
                        ${p.available ? `₹${p.price}` : `<span style="color:var(--color-muted)">Not in inventory</span>`}
                        ${p.rx && p.available ? '<span class="badge badge-red">Rx Required</span>' : ''}
                    </div>
                    <div style="font-size:0.8rem;color:var(--color-muted)">
                        ${p.dosage}
                    </div>
                </div>
                ${badge}
            </div>`;
        }).join('');

        document.getElementById('detected-meds').innerHTML = html;
        resultPanel.classList.remove('hidden');
    }*/
    function updateAddButtonState(products) {
    const availableCount = products.filter(p => p.available).length;

    if (availableCount === 0) {
        addToCartBtn.classList.add('disabled');
        addToCartBtn.style.pointerEvents = "none";
        addToCartBtn.style.opacity = "0.5";
    } else {
        addToCartBtn.classList.remove('disabled');
        addToCartBtn.style.pointerEvents = "auto";
        addToCartBtn.style.opacity = "1";
    }
}

    // ─────────────────────────
    // SAVE RECENT SCANS
    // ─────────────────────────
    function saveRecent(filename, count) {
        if (!filename) return;

        recentScans.unshift({
            name: filename,
            date: new Date().toLocaleString(),
            meds: count
        });

        recentScans = recentScans.slice(0, 5);
        storageSet('recent_scans', recentScans);
        renderRecents();
    }

    // ─────────────────────────
    // RENDER RECENT SCANS
    // ─────────────────────────
    function renderRecents() {

        if (!recentScans.length) {
            recentList.innerHTML =
                '<p style="font-size:0.82rem;color:var(--color-muted)">No recent scans.</p>';
            return;
        }

        recentList.innerHTML = recentScans.map((s, index) => `
            <div class="recent-item">
                <div>
                    <div class="recent-name">${s.name}</div>
                    <div class="recent-date">${s.date}</div>
                </div>

                <div style="display:flex;align-items:center;gap:8px;">
                    <span class="badge badge-teal">${s.meds} meds</span>
                    <button class="btn-icon delete-scan" data-index="${index}">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');

        attachDeleteEvents();
    }

    function attachDeleteEvents() {
        document.querySelectorAll('.delete-scan').forEach(btn => {
            btn.addEventListener('click', () => {
                const index = parseInt(btn.dataset.index);
                recentScans.splice(index, 1);
                storageSet('recent_scans', recentScans);
                renderRecents();
                showToast("Prescription deleted", "success");
            });
        });
    }

    // ─────────────────────────
    // ADD TO ORDER (ONLY AVAILABLE)
    // ─────────────────────────
    /*addToCartBtn.addEventListener('click', e => {
        e.preventDefault();

        const cart = storageGet('pharma_cart', []);

        const availableMeds = currentMeds.filter(p => p.available);

        availableMeds.forEach(p => {
            if (!cart.find(c => c.name === p.name)) {
                cart.push({
                    name: p.name,
                    qty: 1,
                    price: p.price,
                    rx: p.rx
                });
            }
        });

        storageSet('pharma_cart', cart);

        showToast(`${availableMeds.length} medicines added to order`, "success");

        setTimeout(() => window.location.href = "orders.html", 1200);
    });*/
    addToCartBtn.addEventListener('click', async e => {

    e.preventDefault();

    const availableMeds = currentMeds.filter(p => p.available);

    if (!availableMeds.length) {
        showToast("No medicines available", "error");
        return;
    }

    try {

        const res = await fetch(
            "http://127.0.0.1:8000/checkout-prescription",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    medicines: availableMeds,
                    conversation_id: 1
                })
            }
        );

        const data = await res.json();

        if (data.status === "success") {

            const address = window.prompt("Enter delivery address");

            if (!address) return;

            const orderRes = await fetch(
                "http://127.0.0.1:8000/confirm-prescription-order",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        address,
                        conversation_id: 1
                    })
                }
            );

            const orderData = await orderRes.json();

            if (orderData.status === "success") {
                showToast("Order placed successfully", "success");

                setTimeout(() => {
                    window.location.href = "orders.html";
                }, 1500);
            }

        }

    } catch (err) {
        showToast("Order failed", "error");
    }

});

    // ─────────────────────────
    // DRAG & DROP
    // ─────────────────────────
    dropZone.addEventListener('dragover', e => {
        e.preventDefault();
        dropZone.classList.add('dragging');
    });

    dropZone.addEventListener('dragleave', () =>
        dropZone.classList.remove('dragging')
    );

    dropZone.addEventListener('drop', e => {
        e.preventDefault();
        dropZone.classList.remove('dragging');
        if (e.dataTransfer.files[0]) startScan(e.dataTransfer.files[0]);
    });

    browseBtn.addEventListener('click', e => {
        e.stopPropagation();
        fileInput.click();
    });

    fileInput.addEventListener('change', () => {
        if (fileInput.files[0]) startScan(fileInput.files[0]);
    });

    rescanBtn.addEventListener('click', () => {
        setState('idle');
        resultPanel.classList.add('hidden');
        fileInput.value = '';
    });

    setState('idle');
    renderRecents();
});