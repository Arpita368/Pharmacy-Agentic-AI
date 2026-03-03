/**
 * analytics.js — Charts, KPIs, and Predictions
 */
/**
 * analytics.js — Real DB Connected Analytics
 */

document.addEventListener('DOMContentLoaded', () => {

    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun',
                    'Jul','Aug','Sep','Oct','Nov','Dec'];

    const periodFilter = document.getElementById('period-filter');

    let revenues = [];
    let inventory = [];
    let totalOrders = 0;

    function getPeriod() {
        return parseInt(periodFilter.value);
    }

    async function fetchAnalytics() {
        try {
            const res = await fetch("http://127.0.0.1:8000/api/analytics");
            const data = await res.json();

            revenues = data.revenues;
            inventory = data.inventory;
            totalOrders = data.total_orders;

            renderAll();

        } catch (err) {
            console.error("Failed to fetch analytics:", err);
        }
    }

    /*function renderKPIs() {
        const months = getPeriod();
        const sliced = revenues.slice(-months);

        const totalRevenue = sliced.reduce((a,b)=>a+b,0);
        const avg = sliced.length
            ? Math.round(totalRevenue / sliced.length)
            : 0;

        const growth = sliced.length > 1
            ? (((sliced[sliced.length-1] - sliced[0]) /
                (sliced[0] || 1)) * 100).toFixed(1)
            : 0;

        const totalStock = inventory.reduce((a,b)=>a+b.stock,0);
        const outOfStock = inventory.filter(i=>i.stock===0).length;

        document.getElementById('kpi-row').innerHTML = `
            <div class="kpi-card">
                <div class="kpi-label">Total Revenue</div>
                <div class="kpi-value">$${totalRevenue.toLocaleString()}</div>
                <div class="kpi-change">${growth}% growth</div>
            </div>

            <div class="kpi-card">
                <div class="kpi-label">Avg Monthly</div>
                <div class="kpi-value">$${avg.toLocaleString()}</div>
                <div class="kpi-change">Last ${months} months</div>
            </div>

            <div class="kpi-card">
                <div class="kpi-label">Total Orders</div>
                <div class="kpi-value">${totalOrders}</div>
            </div>

            <div class="kpi-card">
                <div class="kpi-label">Stock Units</div>
                <div class="kpi-value">${totalStock}</div>
                <div class="kpi-change">${outOfStock} out of stock</div>
            </div>
        `;
    }*/
   function renderKPIs() {
    const monthsCount = getPeriod();

    const now = new Date();
    const currentMonth = now.getMonth();

    const sliced = [];

    for (let i = monthsCount - 1; i >= 0; i--) {
        const monthIndex = (currentMonth - i + 12) % 12;
        sliced.push(revenues[monthIndex] || 0);
    }

    const totalRevenue = sliced.reduce((a, b) => a + b, 0);
    const avg = sliced.length
        ? Math.round(totalRevenue / sliced.length)
        : 0;

    const growth = sliced.length > 1
        ? (((sliced[sliced.length - 1] - sliced[0]) /
            (sliced[0] || 1)) * 100).toFixed(1)
        : 0;

    const totalStock = inventory.reduce((a, b) => a + b.stock, 0);
    const outOfStock = inventory.filter(i => i.stock === 0).length;

    document.getElementById('kpi-row').innerHTML = `
        <div class="kpi-card">
            <div class="kpi-label">Total Revenue</div>
            <div class="kpi-value">$${totalRevenue.toLocaleString()}</div>
            <div class="kpi-change">${growth}% growth</div>
        </div>

        <div class="kpi-card">
            <div class="kpi-label">Avg Monthly</div>
            <div class="kpi-value">$${avg.toLocaleString()}</div>
            <div class="kpi-change">Last ${monthsCount} months</div>
        </div>

        <div class="kpi-card">
            <div class="kpi-label">Total Orders</div>
            <div class="kpi-value">${totalOrders}</div>
        </div>

        <div class="kpi-card">
            <div class="kpi-label">Stock Units</div>
            <div class="kpi-value">${totalStock}</div>
            <div class="kpi-change">${outOfStock} out of stock</div>
        </div>
    `;
}

    /*function renderBarChart() {
        const months = getPeriod();
        const labels = MONTHS.slice(-months);
        const vals = revenues.slice(-months);
        const max = Math.max(...vals, 1);

        const chart = document.getElementById('bar-chart');

        chart.innerHTML = labels.map((m,i)=>{
            const pct = (vals[i]/max)*100;

            return `
                <div class="bar-col">
                    <div class="bar-fill"
                        style="height:${pct}%"
                        data-val="$${vals[i].toLocaleString()}">
                    </div>
                    <div class="bar-label">${m}</div>
                </div>
            `;
        }).join('');

        if (vals.length > 1) {
            const change = ((vals[vals.length-1] - vals[vals.length-2]) /
                           (vals[vals.length-2] || 1) * 100).toFixed(1);

            document.getElementById('revenue-trend')
                .textContent = `${change>0?'↑':'↓'} ${Math.abs(change)}%`;
        }
    }*/
    function renderBarChart() {
    const monthsCount = getPeriod();

    const now = new Date();
    const currentMonth = now.getMonth(); // 0–11

    const labels = [];
    const vals = [];

    for (let i = monthsCount - 1; i >= 0; i--) {
        const monthIndex = (currentMonth - i + 12) % 12;

        labels.push(MONTHS[monthIndex]);
        vals.push(revenues[monthIndex] || 0);
    }

    const max = Math.max(...vals, 1);
    const chart = document.getElementById('bar-chart');

    chart.innerHTML = labels.map((m, i) => {
        const pct = (vals[i] / max) * 100;

        return `
            <div class="bar-col">
                <div class="bar-fill"
                    style="height:${pct}%"
                    data-val="$${vals[i].toLocaleString()}">
                </div>
                <div class="bar-label">${m}</div>
            </div>
        `;
    }).join('');

    // Trend calculation
    if (vals.length > 1) {
        const prev = vals[vals.length - 2] || 1;
        const last = vals[vals.length - 1];

        const change = (((last - prev) / prev) * 100).toFixed(1);

        document.getElementById('revenue-trend')
            .textContent = `${change > 0 ? '↑' : '↓'} ${Math.abs(change)}%`;
    }
}

    function renderHealthTable() {
        const max = Math.max(...inventory.map(i=>i.stock),1);
        const tbody = document.getElementById('health-body');

        tbody.innerHTML = inventory.map(item=>{
            const pct = (item.stock/max)*100;

            const status =
                item.stock===0 ? "Critical" :
                item.stock<50 ? "Low" : "Healthy";

            const runout =
                item.stock===0 ? "—" :
                `~${Math.round(item.stock/5)} days`;

            return `
                <tr>
                    <td><strong>${item.name}</strong></td>
                    <td>
                        <div class="health-bar-wrap">
                            <div class="health-bar">
                                <div class="health-bar-fill"
                                     style="width:${pct}%">
                                </div>
                            </div>
                            ${item.stock}
                        </div>
                    </td>
                    <td>$${item.price}</td>
                    <td>${status}</td>
                    <td>${runout}</td>
                </tr>
            `;
        }).join('');
    }

    function renderAll() {
        renderKPIs();
        renderBarChart();
        renderHealthTable();
    }

    periodFilter.addEventListener('change', renderAll);

    fetchAnalytics();
});
/*document.addEventListener('DOMContentLoaded', () => {

    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const periodFilter = document.getElementById('period-filter');

    let REVENUES = [];
    let inventory = [];
    let totalOrders = 0;

    function getPeriod() {
        return parseInt(periodFilter.value);
    }

    async function fetchAnalytics() {
        try {
            const res = await fetch("http://127.0.0.1:8000/api/analytics");
            const data = await res.json();

            REVENUES = data.revenues;
            inventory = data.inventory;
            totalOrders = data.total_orders;

            render();
        } catch (err) {
            console.error("Analytics fetch failed:", err);
        }
    }

    // ───────── KPIs ─────────
    function renderKPIs() {
        const months = getPeriod();
        const sliced = REVENUES.slice(-months);

        const totalRevenue = sliced.reduce((a, b) => a + b, 0);
        const avg = sliced.length ? (totalRevenue / sliced.length).toFixed(0) : 0;

        const growth = sliced.length > 1
            ? (((sliced[sliced.length - 1] - sliced[0]) / (sliced[0] || 1)) * 100).toFixed(1)
            : 0;

        const totalStock = inventory.reduce((a, b) => a + b.stock, 0);

        document.getElementById('kpi-row').innerHTML = `
            <div class="kpi-card">
                <div class="kpi-label">Total Revenue</div>
                <div class="kpi-value">$${totalRevenue.toLocaleString()}</div>
                <div class="kpi-change">${growth}% vs prior</div>
            </div>

            <div class="kpi-card">
                <div class="kpi-label">Avg Monthly</div>
                <div class="kpi-value">$${parseInt(avg).toLocaleString()}</div>
                <div class="kpi-change">Based on ${months} months</div>
            </div>

            <div class="kpi-card">
                <div class="kpi-label">Prescriptions</div>
                <div class="kpi-value">${totalOrders}</div>
                <div class="kpi-change">Total orders</div>
            </div>

            <div class="kpi-card">
                <div class="kpi-label">Total Stock Units</div>
                <div class="kpi-value">${totalStock}</div>
                <div class="kpi-change">${inventory.filter(i => i.stock === 0).length} out of stock</div>
            </div>
        `;
    }

    // ───────── Revenue Bar Chart ─────────
    function renderBarChart() {
        const months = getPeriod();
        const labels = MONTHS.slice(-months);
        const vals = REVENUES.slice(-months);

        const max = Math.max(...vals, 1);

        const wrap = document.getElementById('bar-chart');

        wrap.innerHTML = labels.map((m, i) => {
            const pct = ((vals[i] / max) * 100);
            return `
                <div class="bar-col">
                    <div class="bar-fill"
                        style="height:${pct}%"
                        data-val="$${vals[i].toLocaleString()}">
                    </div>
                    <div class="bar-label">${m}</div>
                </div>
            `;
        }).join('');

        const trendEl = document.getElementById('revenue-trend');
        if (vals.length > 1) {
            const change = ((vals[vals.length - 1] - vals[vals.length - 2]) / (vals[vals.length - 2] || 1) * 100).toFixed(1);
            trendEl.textContent = `${change > 0 ? '↑' : '↓'} ${Math.abs(change)}%`;
        }
    }

    // ───────── Stock Health Table ─────────
    function renderHealthTable() {
        const max = Math.max(...inventory.map(i => i.stock), 1);
        const tbody = document.getElementById('health-body');

        tbody.innerHTML = inventory.map(item => {
            const pct = ((item.stock / max) * 100);
            const color = item.stock === 0 ? 'var(--color-danger)'
                : item.stock < 50 ? 'var(--color-warning)'
                    : 'var(--blue-400)';

            const days = item.stock === 0 ? '—' : `~${Math.round(item.stock / 5)} days`;

            return `
                <tr>
                    <td><strong>${item.name}</strong></td>
                    <td>${item.category}</td>
                    <td>
                        <div class="health-bar-wrap">
                            <div class="health-bar">
                                <div class="health-bar-fill"
                                     style="width:${pct}%;background:${color}">
                                </div>
                            </div>
                            <span>${item.stock}</span>
                        </div>
                    </td>
                    <td>${item.stock === 0 ? 'Critical' : item.stock < 50 ? 'Low' : 'Healthy'}</td>
                    <td>${days}</td>
                </tr>
            `;
        }).join('');
    }

    function render() {
        renderKPIs();
        renderBarChart();
        renderHealthTable();
    }

    periodFilter.addEventListener('change', render);

    fetchAnalytics();
});*/
/*document.addEventListener('DOMContentLoaded', () => {
    const inventory = storageGet('pharma_inventory', [
        { id: 1, name: 'Amoxicillin 500mg', category: 'Antibiotics', stock: 150, price: 12.50 },
        { id: 2, name: 'Paracetamol 500mg', category: 'Analgesics', stock: 45, price: 5.00 },
        { id: 3, name: 'Atorvastatin 20mg', category: 'Cardio', stock: 200, price: 45.00 },
        { id: 4, name: 'Metformin 500mg', category: 'Diabetes', stock: 0, price: 18.20 },
        { id: 5, name: 'Loratadine 10mg', category: 'Antihistamine', stock: 85, price: 10.99 },
        { id: 6, name: 'Omeprazole 20mg', category: 'Gastro', stock: 12, price: 7.50 },
        { id: 7, name: 'Aspirin 75mg', category: 'Cardio', stock: 320, price: 3.20 },
        { id: 8, name: 'Vitamin D 1000IU', category: 'Supplements', stock: 65, price: 8.99 },
    ]);

    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const REVENUES = [8200, 9400, 7800, 11200, 10500, 12100, 9800, 13400, 11800, 14200, 12600, 15000];
    const CAT_COLORS = {
        Antibiotics: '#4A9BBE', Analgesics: '#7FB3C1', Cardio: '#2A7A9D',
        Diabetes: '#1A4D6D', Antihistamine: '#B3D7E0', Gastro: '#1A4D6D', Supplements: '#4A9BBE'
    };

    const periodFilter = document.getElementById('period-filter');

    function getPeriod() { return parseInt(periodFilter.value); }

    // ── KPIs ──────────────────────────────────────────────────
    function renderKPIs() {
        const months = getPeriod();
        const sliced = REVENUES.slice(-months);
        const total = sliced.reduce((a, b) => a + b, 0);
        const avg = (total / sliced.length).toFixed(0);
        const growth = (((sliced[sliced.length - 1] - sliced[0]) / sliced[0]) * 100).toFixed(1);
        const totalStock = inventory.reduce((a, b) => a + b.stock, 0);
        const rxCount = 340;

        document.getElementById('kpi-row').innerHTML = `
            <div class="kpi-card">
                <div class="kpi-label">Total Revenue</div>
                <div class="kpi-value" style="color:var(--blue-300)">$${total.toLocaleString()}</div>
                <div class="kpi-change up"><i class="fa-solid fa-arrow-trend-up"></i> +${growth}% vs prior period</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-label">Avg Monthly</div>
                <div class="kpi-value" style="color:var(--blue-400)">$${parseInt(avg).toLocaleString()}</div>
                <div class="kpi-change up"><i class="fa-solid fa-arrow-trend-up"></i> Steady growth</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-label">Prescriptions</div>
                <div class="kpi-value" style="color:var(--blue-200)">${rxCount}</div>
                <div class="kpi-change up"><i class="fa-solid fa-arrow-trend-up"></i> +12% this month</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-label">Total Stock Units</div>
                <div class="kpi-value" style="color:var(--blue-500)">${totalStock.toLocaleString()}</div>
                <div class="kpi-change ${inventory.filter(i => i.stock === 0).length > 0 ? 'down' : 'up'}">
                    <i class="fa-solid fa-${inventory.filter(i => i.stock === 0).length > 0 ? 'arrow-trend-down' : 'arrow-trend-up'}"></i>
                    ${inventory.filter(i => i.stock === 0).length} SKUs out of stock
                </div>
            </div>
        `;
    }

    // ── Bar Chart ─────────────────────────────────────────────
    function renderBarChart() {
        const months = getPeriod();
        const labels = MONTHS.slice(-months);
        const vals = REVENUES.slice(-months);
        const max = Math.max(...vals);

        const trendEl = document.getElementById('revenue-trend');
        const last2 = vals.slice(-2);
        const trendPct = (((last2[1] - last2[0]) / last2[0]) * 100).toFixed(1);
        trendEl.textContent = `${trendPct > 0 ? '↑' : '↓'} ${Math.abs(trendPct)}%`;

        const wrap = document.getElementById('bar-chart');
        wrap.innerHTML = labels.map((m, i) => {
            const pct = ((vals[i] / max) * 100).toFixed(1);
            return `<div class="bar-col">
                <div class="bar-fill" style="height:${pct}%" data-val="$${(vals[i] / 1000).toFixed(1)}k"></div>
                <div class="bar-label">${m}</div>
            </div>`;
        }).join('');

        document.getElementById('bar-legend').innerHTML =
            `<span>● Revenue ($) — last ${months} months</span><span style="margin-left:auto;font-weight:700;color:var(--blue-400)">Peak: $${(max / 1000).toFixed(1)}k</span>`;
    }

    // ── Donut Chart ───────────────────────────────────────────
    function renderDonut() {
        const catMap = {};
        inventory.forEach(item => { catMap[item.category] = (catMap[item.category] || 0) + item.stock; });
        const total = Object.values(catMap).reduce((a, b) => a + b, 0);
        const svg = document.getElementById('donut-svg');
        const cx = 100, cy = 100, r = 75, stroke = 28;

        if (total === 0) { svg.innerHTML = ''; return; }

        let angle = -90;
        let paths = '';
        const legendItems = [];

        Object.entries(catMap).forEach(([cat, val]) => {
            const pct = val / total;
            const sweep = pct * 360;
            const rad1 = (angle * Math.PI) / 180;
            const rad2 = ((angle + sweep) * Math.PI) / 180;
            const x1 = cx + r * Math.cos(rad1); const y1 = cy + r * Math.sin(rad1);
            const x2 = cx + r * Math.cos(rad2); const y2 = cy + r * Math.sin(rad2);
            const large = sweep > 180 ? 1 : 0;
            const color = CAT_COLORS[cat] || '#6BBF9A';
            paths += `<path d="M${cx},${cy} L${x1},${y1} A${r},${r},0,${large},1,${x2},${y2} Z"
                fill="${color}" opacity="0.85" stroke="var(--color-bg)" stroke-width="2"/>`;
            legendItems.push(`<div class="donut-legend-item"><div class="donut-legend-dot" style="background:${color}"></div><span>${cat}: ${val}</span></div>`);
            angle += sweep;
        });

        // center hole
        paths += `<circle cx="${cx}" cy="${cy}" r="${r - stroke}" fill="var(--color-surface)"/>`;
        svg.innerHTML = paths;

        document.getElementById('donut-center').innerHTML = `<strong>${inventory.length}</strong><span>SKUs</span>`;
        document.getElementById('donut-legend').innerHTML = legendItems.join('');
    }

    // ── Health Table ──────────────────────────────────────────
    function renderHealthTable() {
        const max = Math.max(...inventory.map(i => i.stock), 1);
        const tbody = document.getElementById('health-body');
        tbody.innerHTML = inventory.map(item => {
            const pct = ((item.stock / max) * 100).toFixed(0);
            const color = item.stock === 0 ? 'var(--color-danger)' : item.stock < 50 ? 'var(--color-warning)' : 'var(--blue-400)';
            const days = item.stock === 0 ? '—' : `~${Math.round(item.stock / 5)} days`;
            const badge = item.stock === 0 ? 'badge-danger' : item.stock < 50 ? 'badge-warn' : 'badge-green';
            const lbl = item.stock === 0 ? 'Critical' : item.stock < 50 ? 'Low' : 'Healthy';
            return `<tr>
                <td><strong>${item.name}</strong></td>
                <td><span class="badge badge-teal">${item.category}</span></td>
                <td>
                    <div class="health-bar-wrap">
                        <div class="health-bar"><div class="health-bar-fill" style="width:${pct}%;background:${color}"></div></div>
                        <span style="font-size:0.85rem;font-weight:600">${item.stock}</span>
                    </div>
                </td>
                <td><span class="badge ${badge}">${lbl}</span></td>
                <td style="color:var(--color-muted);font-size:0.85rem">${days}</td>
            </tr>`;
        }).join('');
    }

    function render() { renderKPIs(); renderBarChart(); renderDonut(); renderHealthTable(); }
    periodFilter.addEventListener('change', render);
    render();
});
*/