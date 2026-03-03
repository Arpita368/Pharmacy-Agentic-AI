/**
 * Agentic Pharma AI - Core Application Logic
 * Handled features: Navigation, Inventory CRUD, AI Chat Simulation, Rx Scanner, Order Summary.
 */
import { startListening, speak } from "./voice";
document.addEventListener('DOMContentLoaded', () => {
  // --- State Management ---
  let state = {
    inventory: JSON.parse(localStorage.getItem('pharma_inventory')) || [
      { id: 1, name: 'Amoxicillin 500mg', category: 'Antibiotics', stock: 150, price: 12.50, status: 'In Stock' },
      { id: 2, name: 'Paracetamol 500mg', category: 'Analgesics', stock: 45, price: 5.00, status: 'Low Stock' },
      { id: 3, name: 'Atorvastatin 20mg', category: 'Cardio', stock: 200, price: 45.00, status: 'In Stock' },
      { id: 4, name: 'Metformin 500mg', category: 'Diabetes', stock: 0, price: 18.20, status: 'Out of Stock' },
      { id: 5, name: 'Loratadine 10mg', category: 'Antihistamine', stock: 85, price: 10.99, status: 'In Stock' }
    ],
    cart: [],
    currentView: 'view-chat',
    isDark: document.documentElement.getAttribute('data-theme') === 'dark'
  };

  // --- Selectors ---
  const body = document.body;
  const introContainer = document.getElementById('intro-container');
  const mainApp = document.getElementById('main-app');
  const enterBtn = document.getElementById('enter-btn');
  const navItems = document.querySelectorAll('.nav-item');
  const viewSections = document.querySelectorAll('.view-section');
  const themeToggle = document.getElementById('theme-toggle');
  const menuToggle = document.getElementById('menu-toggle');
  const sidebar = document.querySelector('.sidebar');
  const pageTitle = document.getElementById('page-title');

  // --- Initialization ---
  init();

  function init() {
    if (window.location.pathname.includes('app.html')) {
      renderInventory();
      setupNavigation();
      setupInventoryListeners();
      setupChat();
      setupScanner();
      setupOrder();
    } else if (introContainer) {
      enterBtn.addEventListener('click', () => {
        window.location.href = 'app.html';
      });
    }

    if (themeToggle) {
      themeToggle.addEventListener('click', toggleTheme);
    }

    if (menuToggle) {
      menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('active');
      });
    }
  }
//Talk to agent
async function talkToAgent(setUserMessage, setAgentMessage) {
  startListening(async (userText) => {

    // 1️⃣ Show user voice text in chat UI
    setUserMessage(userText);

    // 2️⃣ Send to your existing backend
    const response = await fetch("http://localhost:8000/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ message: userText })
    });

    const data = await response.json();

    // 3️⃣ Show agent reply in UI
    setAgentMessage(data.reply);

    // 4️⃣ Speak the reply
    speak(data.reply);
  });
}
  // --- Navigation Logic ---
  function setupNavigation() {
    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const viewId = item.getAttribute('data-view');
        switchView(viewId);

        // Active link UI
        navItems.forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');

        // Mobile sidebar close
        if (window.innerWidth <= 1024) {
          sidebar.classList.remove('active');
        }
      });
    });
  }

  function switchView(viewId) {
    viewSections.forEach(section => {
      section.classList.remove('active');
      if (section.id === viewId) {
        section.classList.add('active');
      }
    });

    // Update header title
    const titles = {
      'view-chat': 'AI Health Agent',
      'view-inventory': 'Stock Management',
      'view-analytics': 'Business Intelligence',
      'view-scanner': 'Prescription AI',
      'view-order': 'Finalizing Order'
    };
    pageTitle.textContent = titles[viewId] || 'Agent Active';
    state.currentView = viewId;

    if (viewId === 'view-analytics') updateAnalytics();
  }

  // --- Theme Logic ---
  function toggleTheme() {
    state.isDark = !state.isDark;
    const theme = state.isDark ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    themeToggle.querySelector('i').className = state.isDark ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    localStorage.setItem('pharma_theme', theme);
  }

  // --- Inventory Logic ---
  function renderInventory(filteredData = state.inventory) {
    const tbody = document.querySelector('#view-inventory tbody');
    if (!tbody) return;

    tbody.innerHTML = '';
    filteredData.forEach(item => {
      const tr = document.createElement('tr');
      const statusClass = item.stock === 0 ? 'danger' : (item.stock < 50 ? 'warning' : 'success');

      tr.innerHTML = `
                <td>#${item.id}</td>
                <td><strong>${item.name}</strong></td>
                <td><span class="category-tag">${item.category}</span></td>
                <td>${item.stock} units</td>
                <td>$${item.price.toFixed(2)}</td>
                <td><span class="status-indicator ${statusClass}"></span> ${item.status}</td>
                <td class="actions">
                    <button class="icon-btn small edit-btn" data-id="${item.id}"><i class="fa-solid fa-pen"></i></button>
                    <button class="icon-btn small delete-btn" data-id="${item.id}"><i class="fa-solid fa-trash"></i></button>
                </td>
            `;
      tbody.appendChild(tr);
    });

    // Re-attach listeners for dynamically created buttons
    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', () => deleteItem(parseInt(btn.dataset.id)));
    });
  }

  function setupInventoryListeners() {
    const addBtn = document.getElementById('add-stock-btn');
    const modal = document.getElementById('action-modal');
    const searchInput = document.getElementById('inventory-search');
    const form = document.getElementById('inventory-form');
    const cancelBtn = document.getElementById('cancel-modal-btn');
    const closeBtn = document.getElementById('close-modal-btn');

    addBtn.addEventListener('click', () => {
      form.reset();
      document.getElementById('item-id').value = '';
      document.getElementById('modal-title').textContent = 'Add New Medicine';
      modal.classList.remove('hidden');
    });

    [cancelBtn, closeBtn].forEach(b => b.addEventListener('click', () => modal.classList.add('hidden')));

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const id = document.getElementById('item-id').value;
      const itemData = {
        name: document.getElementById('item-name').value,
        category: document.getElementById('item-category').value,
        stock: parseInt(document.getElementById('item-stock').value),
        price: parseFloat(document.getElementById('item-price').value),
      };
      itemData.status = itemData.stock === 0 ? 'Out of Stock' : (itemData.stock < 50 ? 'Low Stock' : 'In Stock');

      if (id) {
        // Edit
        const index = state.inventory.findIndex(i => i.id == id);
        state.inventory[index] = { ...state.inventory[index], ...itemData };
        showToast('Item updated successfully');
      } else {
        // Add
        itemData.id = state.inventory.length > 0 ? Math.max(...state.inventory.map(i => i.id)) + 1 : 1;
        state.inventory.push(itemData);
        showToast('New item added to inventory');
      }

      saveState();
      renderInventory();
      modal.classList.add('hidden');
    });

    searchInput.addEventListener('input', (e) => {
      const term = e.target.value.toLowerCase();
      const filtered = state.inventory.filter(i =>
        i.name.toLowerCase().includes(term) ||
        i.category.toLowerCase().includes(term)
      );
      renderInventory(filtered);
    });
  }

  function deleteItem(id) {
    if (confirm('Are you sure you want to remove this item?')) {
      state.inventory = state.inventory.filter(i => i.id !== id);
      saveState();
      renderInventory();
      showToast('Item deleted');
    }
  }

  // --- AI Chat Logic ---
  function setupChat() {
    const chatHistory = document.getElementById('chat-history');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const micBtn = document.getElementById('mic-btn');

    const addMsg = (text, type) => {
      const div = document.createElement('div');
      div.className = `msg ${type}`;
      div.innerHTML = `<div class="bubble">${text}</div>`;
      chatHistory.appendChild(div);
      chatHistory.scrollTop = chatHistory.scrollHeight;
    };

    const botReply = (query) => {
      const q = query.toLowerCase();
      let response = "I'm analyzing your request... I can help you find medicines in stock or check for drug interactions.";

      if (q.includes('stock') || q.includes('have') || q.includes('find')) {
        const found = state.inventory.find(i => q.includes(i.name.toLowerCase().split(' ')[0]));
        if (found) {
          response = `Yes, we have <strong>${found.name}</strong>. Currently <strong>${found.stock}</strong> units in stock at <strong>$${found.price}</strong> each. Would you like to add it to your order?`;
        } else {
          response = "I couldn't find that specific medicine in our current inventory. Should I check our supplier database?";
        }
      } else if (q.includes('hello') || q.includes('hi')) {
        response = "Hello! I am your Agentic Pharma Assistant. How can I help you today?";
      }

      setTimeout(() => addMsg(response, 'bot'), 600);
    };

    sendBtn.addEventListener('click', () => {
      const val = userInput.value.trim();
      if (!val) return;
      addMsg(val, 'user');
      userInput.value = '';
      botReply(val);
    });

    userInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') sendBtn.click();
    });

    micBtn.addEventListener('click', () => {
      showToast('Voice recognition started...');
      // In a real app, Web Speech API would go here
      setTimeout(() => showToast('Listening...', 2000), 1000);
    });

    // Initial message
    addMsg("Hello! How can I assist with the pharmacy operations today?", "bot");
  }

  // --- Rx Scanner Logic ---
  function setupScanner() {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const result = document.getElementById('scan-result');

    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.style.borderColor = 'var(--brand)';
    });

    dropZone.addEventListener('dragleave', () => {
      dropZone.style.borderColor = 'var(--border)';
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      handleScan();
    });

    fileInput.addEventListener('change', handleScan);

    function handleScan() {
      dropZone.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Account Analysis in progress...';
      setTimeout(() => {
        dropZone.innerHTML = `
                    <i class="fa-solid fa-check-circle" style="color:var(--accent)"></i>
                    <h3>Scan Complete</h3>
                    <p>Prescription verified successfully</p>
                `;
        result.classList.remove('hidden');
        showToast('Prescription analyzed by AI');
      }, 2000);
    }
  }

  // --- Order Summary Logic ---
  function setupOrder() {
    const orderTable = document.getElementById('order-table-body');
    const confirmBtn = document.getElementById('confirm-order-btn');

    // Mock some items for the order
    state.cart = [
      { name: 'Amoxicillin 500mg', qty: 2, price: 12.50, rx: true },
      { name: 'Paracetamol 500mg', qty: 1, price: 5.00, rx: false }
    ];

    renderOrder();

    confirmBtn.addEventListener('click', () => {
      confirmBtn.disabled = true;
      confirmBtn.querySelector('.btn-text').textContent = 'Processing...';
      confirmBtn.querySelector('.spinner').classList.remove('hidden');

      setTimeout(() => {
        confirmBtn.classList.add('hidden');
        document.getElementById('confirmation-msg').classList.remove('hidden');
        showToast('Order confirmed and sent to fulfillment');
      }, 2500);
    });
  }

  function renderOrder() {
    const tbody = document.getElementById('order-table-body');
    if (!tbody) return;

    let total = 0;
    let rxNeeded = 0;
    tbody.innerHTML = '';

    state.cart.forEach(item => {
      total += item.price * item.qty;
      if (item.rx) rxNeeded++;

      const tr = document.createElement('tr');
      tr.innerHTML = `
                <td>${item.name} ${item.rx ? '<span class="ai-tag">Rx</span>' : ''}</td>
                <td>${item.qty}</td>
                <td><span class="status-indicator success"></span> Validated</td>
            `;
      tbody.appendChild(tr);
    });

    document.getElementById('order-total-price').textContent = `$${total.toFixed(2)}`;
    document.getElementById('order-total-items').textContent = `${state.cart.length} items`;
    document.getElementById('order-needs-rx').textContent = rxNeeded > 0 ? `${rxNeeded} require Rx` : '0 require Rx';

    if (rxNeeded > 0) {
      document.getElementById('prescription-section').classList.remove('hidden');
      document.getElementById('safety-alerts').innerHTML = `
                <div class="alert warning">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    Regulatory Check: Prescription required for Antibiotics.
                </div>
            `;
    }

    document.getElementById('confirm-order-btn').disabled = false;
  }

  // --- Helpers ---
  function saveState() {
    localStorage.setItem('pharma_inventory', JSON.stringify(state.inventory));
  }

  function showToast(msg, duration = 3000) {
    const toast = document.createElement('div');
    toast.className = 'glass-panel toast';
    toast.style.padding = '0.75rem 1.25rem';
    toast.style.zIndex = '9999';
    toast.innerHTML = `<i class="fa-solid fa-info-circle" style="color:var(--brand)"></i> ${msg}`;
    document.getElementById('toast-container').appendChild(toast);

    setTimeout(() => toast.remove(), duration);
  }

  function updateAnalytics() {
    // Just a visual flash to show "update"
    const cards = document.querySelectorAll('.stat-card');
    cards.forEach(c => {
      c.style.opacity = '0.5';
      setTimeout(() => c.style.opacity = '1', 300);
    });
  }
});
