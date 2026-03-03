// index.js — Landing page counter animations
document.addEventListener('DOMContentLoaded', () => {
    const counters = [
        { id: 'counter-1', target: 1200, suffix: '+' },
        { id: 'counter-2', target: 340, suffix: '' },
        { id: 'counter-3', target: 5800, suffix: '+' },
    ];

    function animateCounter(el, target, suffix) {
        let start = 0;
        const duration = 1800;
        const step = (timestamp) => {
            if (!step.startTime) step.startTime = timestamp;
            const progress = Math.min((timestamp - step.startTime) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            el.textContent = Math.floor(eased * target).toLocaleString() + suffix;
            if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            counters.forEach(({ id, target, suffix }) => {
                const el = document.getElementById(id);
                if (el) animateCounter(el, target, suffix);
            });
            observer.disconnect();
        });
    }, { threshold: 0.3 });

    const statsEl = document.querySelector('.hero-stats');
    if (statsEl) observer.observe(statsEl);
});
