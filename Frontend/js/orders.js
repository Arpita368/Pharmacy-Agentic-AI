document.addEventListener('DOMContentLoaded', async () => {

    let cart = [];

    const API = "http://127.0.0.1:8000";

    const tbody = document.getElementById('cart-table-body');
    const emptyState = document.getElementById('cart-empty');
    const confirmBtn = document.getElementById('confirm-order-btn');

    const paymentModal = document.getElementById('payment-modal');
    const confirmationModal = document.getElementById('confirmation-modal');

    const cancelPaymentBtn = document.getElementById('cancel-payment-btn');
    const processPaymentBtn = document.getElementById('process-payment-btn');

    const onlineDetails = document.getElementById("online-payment-details");
    const qrCode = document.getElementById("upi-qr-code");
    const utrInput = document.getElementById('utr-input');

    /* ---------------- LOAD CART ---------------- */

    async function loadCart() {
        try {
            const res = await fetch(`${API}/cart`);
            const data = await res.json();

            if (!Array.isArray(data)) return;

            cart = data.map(item => ({
                id: item.product_id,
                name: item.product_name || "Unknown",
                qty: Number(item.quantity) || 1,
                price: Number(item.price) || 0,
                rx: item.prescription_required || false
            }));

            renderTable();
        } catch (err) {
            console.error("Cart load error:", err);
            showToast("Unable to load cart", "error");
        }
    }

    await loadCart();

    /* ---------------- RENDER TABLE ---------------- */

    function renderTable() {

        tbody.innerHTML = '';
        emptyState.classList.toggle('hidden', cart.length > 0);

        cart.forEach((item, i) => {

            const total = item.price * item.qty;

            const tr = document.createElement('tr');

            tr.innerHTML = `
                <td>
                    <div class="med-name">${item.name}</div>
                    ${item.rx ? '<span class="badge badge-teal">Rx Required</span>' : ''}
                </td>
                <td>${item.qty}</td>
                <td>$${item.price.toFixed(2)}</td>
                <td><strong>$${total.toFixed(2)}</strong></td>
                <td><span class="dot dot-green"></span> Ready</td>
                <td>
                    <button class="remove-btn" data-i="${i}">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            `;

            tbody.appendChild(tr);
        });

        document.querySelectorAll('.remove-btn').forEach(btn => {
            btn.onclick = () => {
                cart.splice(btn.dataset.i, 1);
                renderTable();
            };
        });

        updateTotals();
    }

    /* ---------------- TOTALS ---------------- */

    function updateTotals() {

        const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
        const tax = subtotal * 0.05;
        const total = subtotal + tax;

        document.getElementById('summary-subtotal').textContent = `$${subtotal.toFixed(2)}`;
        document.getElementById('summary-tax').textContent = `$${tax.toFixed(2)}`;
        document.getElementById('summary-total').textContent = `$${total.toFixed(2)}`;

        confirmBtn.disabled = cart.length === 0;
    }

    /* ---------------- OPEN PAYMENT ---------------- */

    confirmBtn.onclick = () => {
        paymentModal.classList.remove('hidden');

        qrCode.src =
            "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=pharma@upi";
    };

    /* ---------------- PAYMENT OPTION ---------------- */

    document.querySelectorAll('input[name="payment_method"]').forEach(r => {
        r.onchange = e => {
            onlineDetails.classList.toggle('hidden', e.target.value !== "ONLINE");
        };
    });

    cancelPaymentBtn.onclick = () => paymentModal.classList.add('hidden');

    /* ---------------- PROCESS PAYMENT ---------------- */

    processPaymentBtn.onclick = async () => {

        const method = document.querySelector('input[name="payment_method"]:checked').value;
        function downloadInvoice(cartItems) {

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const invoiceId = "INV-" + Math.floor(Math.random() * 1000000);
    const today = new Date().toLocaleString();

    let y = 20;

    doc.setFontSize(18);
    doc.text("PharmaAI - Invoice", 14, y);

    y += 10;
    doc.setFontSize(11);
    doc.text(`Invoice ID: ${invoiceId}`, 14, y);
    y += 6;
    doc.text(`Date: ${today}`, 14, y);

    y += 12;
    doc.setFontSize(12);
    doc.text("Medicine", 14, y);
    doc.text("Qty", 110, y);
    doc.text("Price", 130, y);
    doc.text("Total", 160, y);

    y += 5;
    doc.line(14, y, 195, y);
    y += 8;

    let subtotal = 0;

    cartItems.forEach(item => {
        const total = item.price * item.qty;
        subtotal += total;

        doc.text(item.name, 14, y);
        doc.text(String(item.qty), 110, y);
        doc.text(`$${item.price.toFixed(2)}`, 130, y);
        doc.text(`$${total.toFixed(2)}`, 160, y);

        y += 8;
    });

    const tax = subtotal * 0.05;
    const grandTotal = subtotal + tax;

    y += 5;
    doc.line(14, y, 195, y);
    y += 10;

    doc.text(`Subtotal: $${subtotal.toFixed(2)}`, 140, y);
    y += 6;
    doc.text(`Tax (5%): $${tax.toFixed(2)}`, 140, y);
    y += 6;
    doc.setFontSize(13);
    doc.text(`Total: $${grandTotal.toFixed(2)}`, 140, y);

    doc.save(`${invoiceId}.pdf`);
}
        if (method === "ONLINE" && utrInput.value.trim().length < 12) {
            showToast("Enter valid UTR", "error");
            return;
        }

        processPaymentBtn.disabled = true;
        processPaymentBtn.innerHTML = "Processing...";

        try {
            const res = await fetch(`${API}/orders/checkout`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ payment_method: method })
            });

            const result = await res.json();

            if (!result || result.status !== "success") {
                throw new Error("Checkout failed");
            }

            paymentModal.classList.add('hidden');

// 🔥 DOWNLOAD INVOICE BEFORE SHOWING CONFIRMATION
downloadInvoice(cart);

// THEN SHOW CONFIRMATION
confirmationModal.classList.remove('hidden');

            document.getElementById('finish-btn').onclick = () => {
                window.location.href = "dashboard.html";
            };

            showToast("Order placed successfully ✅", "success");

        } catch (err) {
            console.error(err);
            showToast("Checkout failed", "error");
        }

        processPaymentBtn.disabled = false;
        processPaymentBtn.innerHTML = "Place Order";
    };

});