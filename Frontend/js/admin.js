document.addEventListener('DOMContentLoaded', async () => {
    const listContainer = document.getElementById('pending-list');

    // Simple secret extraction from query param
    const urlParams = new URLSearchParams(window.location.search);
    const secret = urlParams.get('secret');

    if (!secret || secret !== 'admin123') {
        listContainer.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-lock fa-3x" style="color:var(--red-400)"></i>
                <h3>Unauthorized Access</h3>
                <p>Please provide the correct admin secret in the URL (?secret=xxx).</p>
            </div>
        `;
        return;
    }

    async function fetchPending() {
        try {
            const data = await window.apiFetch(`/admin/orders/pending?secret=${secret}`);
            renderPending(data);
        } catch (e) {
            console.error(e);
            listContainer.innerHTML = `<div class="empty-state">Failed to load pending orders.</div>`;
        }
    }

    function renderPending(orders) {
        if (!orders || orders.length === 0) {
            listContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-check-double fa-3x" style="color:var(--green-400)"></i>
                    <h3>All Caught Up!</h3>
                    <p>No pending UTR verifications at the moment.</p>
                </div>
            `;
            return;
        }

        listContainer.innerHTML = '';
        orders.forEach(order => {
            const el = document.createElement('div');
            el.className = 'pending-card';
            el.innerHTML = `
                <div class="pending-details">
                    <h4>Invoice: ${order.invoice_id}</h4>
                    <p><strong>UTR:</strong> <span style="font-family:monospace; color:var(--text-main); font-size:1.1em;">${order.utr_number}</span></p>
                    <p><strong>Total:</strong> $${order.total_amount.toFixed(2)}</p>
                    <p><strong>Items:</strong> ${order.items.join(', ')}</p>
                </div>
                <div class="pending-actions">
                    <button class="btn btn-outline verify-btn reject-btn" data-id="${order.invoice_id}" data-action="REJECT" style="color:var(--red-500); border-color:var(--red-500);">
                        <i class="fa-solid fa-xmark"></i> Reject
                    </button>
                    <button class="btn btn-primary verify-btn approve-btn" data-id="${order.invoice_id}" data-action="APPROVE">
                        <i class="fa-solid fa-check"></i> Approve
                    </button>
                </div>
            `;
            listContainer.appendChild(el);
        });

        // Attach listeners
        document.querySelectorAll('.verify-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const target = e.currentTarget;
                const invoiceId = target.dataset.id;
                const action = target.dataset.action;

                target.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
                target.disabled = true;

                try {
                    const result = await window.apiFetch(`/admin/orders/verify?secret=${secret}`, {
                        method: 'POST',
                        body: JSON.stringify({ invoice_id: invoiceId, action: action })
                    });

                    if (result && result.status === 'success') {
                        showToast(`Order ${invoiceId} ${action === 'APPROVE' ? 'approved' : 'rejected'}.`, 'success');
                        fetchPending(); // Reload
                    } else {
                        showToast('Verification failed.', 'error');
                        fetchPending(); // Reload
                    }
                } catch (err) {
                    console.error(err);
                    showToast('API error during verification.', 'error');
                    fetchPending();
                }
            });
        });
    }

    fetchPending();
});

