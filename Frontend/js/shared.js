/**
 * shared.js — Utilities shared across all pages
 * Theme, Sidebar, Toast, Navigation highlighting, API helper
 */

(function () {
    'use strict';

    // ─────────────────────────────────────────────
    // 🌐 API HELPER  (⭐ REQUIRED FOR BACKEND CALLS)
    // ─────────────────────────────────────────────
    window.apiFetch = async function (url, options = {}) {
        try {
            const response = await fetch("http://127.0.0.1:8000" + url, {
                headers: {
                    "Content-Type": "application/json"
                },
                ...options
            });

            if (!response.ok) {
                throw new Error("Server error");
            }

            return await response.json();
        } catch (err) {
            console.error("API ERROR:", err);
            showToast("Server connection error", "error");
            throw err;
        }
    };

    // ─────────────────────────────────────────────
    // 🎨 Theme
    // ─────────────────────────────────────────────
    const savedTheme = localStorage.getItem('pharma_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);

    function initTheme() {
        const btn = document.getElementById('theme-toggle');
        if (!btn) return;
        const icon = btn.querySelector('i');

        const updateIcon = () => {
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            if (icon) icon.className = isDark ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
        };

        updateIcon();

        btn.addEventListener('click', () => {
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            const next = isDark ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', next);
            localStorage.setItem('pharma_theme', next);
            updateIcon();
        });
    }

    // ─────────────────────────────────────────────
    // Sidebar
    // ─────────────────────────────────────────────
    function initSidebar() {
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.querySelector('.sidebar-overlay');
        const hamburger = document.querySelector('.hamburger');
        if (!sidebar) return;

        const open = () => {
            sidebar.classList.add('open');
            overlay && overlay.classList.add('open');
        };

        const close = () => {
            sidebar.classList.remove('open');
            overlay && overlay.classList.remove('open');
        };

        hamburger && hamburger.addEventListener('click', open);
        overlay && overlay.addEventListener('click', close);
    }

    // ─────────────────────────────────────────────
    // Highlight active nav link
    // ─────────────────────────────────────────────
    function highlightNav() {
        const links = document.querySelectorAll('.nav-link');
        const curr = window.location.pathname.split('/').pop() || 'index.html';

        links.forEach(link => {
            const href = (link.getAttribute('href') || '').split('/').pop();
            link.classList.toggle('active', href === curr);
        });
    }

    // ─────────────────────────────────────────────
    // Toast
    // ─────────────────────────────────────────────
    window.showToast = function (msg, type = 'info', duration = 3500) {
        let container = document.getElementById('toast-container');

        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            document.body.appendChild(container);
        }

        const icons = {
            info: 'fa-circle-info',
            success: 'fa-circle-check',
            warn: 'fa-triangle-exclamation',
            error: 'fa-circle-xmark'
        };

        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `<i class="fa-solid ${icons[type]}"></i> <span>${msg}</span>`;

        container.appendChild(toast);
        setTimeout(() => toast.remove(), duration);
    };

    // ─────────────────────────────────────────────
    // LocalStorage helpers
    // ─────────────────────────────────────────────
    window.storageGet = (key, def = null) => {
        try {
            const v = localStorage.getItem(key);
            return v ? JSON.parse(v) : def;
        } catch {
            return def;
        }
    };

    window.storageSet = (key, val) => {
        try {
            localStorage.setItem(key, JSON.stringify(val));
        } catch {}
    };

    // ─────────────────────────────────────────────
    // INIT
    // ─────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', () => {
        initTheme();
        initSidebar();
        highlightNav();
    });

})();