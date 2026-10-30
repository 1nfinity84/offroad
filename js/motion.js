/**
 * EXTREME OFFROAD — Motion, Scroll Choreography & Pinned Parallax Engine
 * Pure 60fps compositor transforms (translate3d, scale, rotate, opacity)
 */

(function () {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const hasFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    const clamp = (val, min, max) => Math.min(max, Math.max(min, val));
    const easeOutExpo = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

    /* ======================================================================
       1. SPLIT-LINE WRAPPING FOR SECTION HEADLINES (.eo-section-title)
       ====================================================================== */
    function initSplitHeadlines() {
        const titles = document.querySelectorAll('.eo-section-title:not(.is-split)');
        titles.forEach((title) => {
            const rawHtml = title.innerHTML.trim();
            const parts = rawHtml.split(/<br\s*\/?>/i);
            title.innerHTML = parts
                .map((part, idx) => `<span class="eo-line"><span class="eo-line-inner" style="--i: ${idx};">${part.trim()}</span></span>`)
                .join('');
            title.classList.add('is-split');
        });
    }

    /* ======================================================================
       2. SCROLL-TRIGGERED REVEAL OBSERVER (IntersectionObserver)
       ====================================================================== */
    function initScrollReveals() {
        const revealGroups = [
            { selector: '.eo-grid-3 .eo-card-minimal', stagger: true },
            { selector: '.eo-steps .eo-step-item', stagger: true },
            { selector: '.eo-spec-row > div', stagger: true },
            { selector: '.eo-check-list li', stagger: true },
            { selector: '.eo-faq-item', stagger: true },
            { selector: '.eo-subtag:not(.fx-intro)', stagger: false },
            { selector: '.eo-lead', stagger: false },
            { selector: '.eo-voucher-showcase', stagger: false },
            { selector: '.eo-glass-panel', stagger: false }
        ];

        revealGroups.forEach(({ selector, stagger }) => {
            const nodes = document.querySelectorAll(selector);
            nodes.forEach((node, idx) => {
                node.classList.add('eo-reveal');
                if (stagger) {
                    const siblingIndex = Array.from(node.parentElement ? node.parentElement.children : []).indexOf(node);
                    node.style.setProperty('--i', String(Math.max(0, siblingIndex) % 6));
                } else {
                    node.style.setProperty('--i', String(idx % 3));
                }
            });
        });

        const observedTargets = document.querySelectorAll(
            '.eo-reveal, .eo-section-title.is-split, .eo-media-rounded'
        );

        if (prefersReducedMotion || !('IntersectionObserver' in window)) {
            observedTargets.forEach((el) => el.classList.add('is-inview'));
            return;
        }

        const observer = new IntersectionObserver(
            (entries, obs) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('is-inview');
                        obs.unobserve(entry.target);
                    }
                });
            },
            {
                rootMargin: '0px 0px -8% 0px',
                threshold: 0.08
            }
        );

        observedTargets.forEach((el) => observer.observe(el));
    }

    /* ======================================================================
       3. ANIMATED STAT COUNTERS ([data-count])
       ====================================================================== */
    function initStatCounters() {
        const counters = document.querySelectorAll('[data-count]');
        if (!counters.length || prefersReducedMotion) return;

        const animateCounter = (el) => {
            const target = parseInt(el.getAttribute('data-count') || '0', 10);
            if (!target || el.dataset.counted === '1') return;
            el.dataset.counted = '1';

            const duration = 1450;
            const start = performance.now();

            const step = (now) => {
                const elapsed = now - start;
                const progress = clamp(elapsed / duration, 0, 1);
                const current = Math.round(target * easeOutExpo(progress));
                el.textContent = String(current);
                if (progress < 1) {
                    requestAnimationFrame(step);
                } else {
                    el.textContent = String(target);
                }
            };

            requestAnimationFrame(step);
        };

        if (!('IntersectionObserver' in window)) {
            counters.forEach(animateCounter);
            return;
        }

        const io = new IntersectionObserver(
            (entries, obs) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        animateCounter(entry.target);
                        obs.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.35 }
        );

        counters.forEach((c) => io.observe(c));
    }

    /* ======================================================================
       4. SMART HEADER HIDE / REVEAL ON SCROLL DIRECTION
       ====================================================================== */
    function initSmartHeader() {
        const header = document.querySelector('header.eo-header');
        const nav = document.getElementById('main-nav');
        if (!header) return;

        let lastY = window.scrollY;
        window.addEventListener(
            'scroll',
            () => {
                const y = window.scrollY;
                const delta = y - lastY;
                const menuOpen = nav && nav.classList.contains('is-open');

                if (y <= 380 || menuOpen) {
                    header.classList.remove('is-hidden');
                } else if (delta > 9) {
                    header.classList.add('is-hidden');
                } else if (delta < -6) {
                    header.classList.remove('is-hidden');
                }

                lastY = y;
            },
            { passive: true }
        );
    }

    /* ======================================================================
       5. SCROLL PROGRESS, HERO DEPTH & PINNED DRIVE-BY PARALLAX ENGINE
       ====================================================================== */
    function initScrollParallaxEngine() {
        if (prefersReducedMotion) return;

        const docBar = document.querySelector('.eo-scroll-progress[data-fx="doc"]');
        const heroSection = document.getElementById('homepage');
        const heroImg = document.querySelector('.fx-hero-img');
        const heroContent = document.querySelector('.fx-hero-content');
        const drivebySection = document.getElementById('na-plny-plyn');
        const garazSection = document.getElementById('garaz');
        const stepsScope = document.querySelector('.eo-steps[data-fx-scope]');
        const bannerSection = document.getElementById('daruj_voucher');
        const mediaContainers = Array.from(document.querySelectorAll('.eo-media-rounded'));

        let ticking = false;

        const updateFrame = () => {
            const vh = window.innerHeight || 1;
            const scrollY = window.scrollY || window.pageYOffset || 0;
            const maxScroll = Math.max(1, document.documentElement.scrollHeight - vh);

            // 1. Document Reading Progress Fallback
            if (docBar) {
                const docP = clamp(scrollY / maxScroll, 0, 1);
                docBar.style.setProperty('--fx-p', docP.toFixed(4));
            }

            // 2. Hero Scroll Depth Parallax
            if (heroSection) {
                const hRect = heroSection.getBoundingClientRect();
                if (hRect.bottom > 0 && hRect.top < vh) {
                    const heroP = clamp(-hRect.top / Math.max(1, hRect.height), 0, 1);
                    const val = heroP.toFixed(4);
                    if (heroImg) heroImg.style.setProperty('--fx-p', val);
                    if (heroContent) heroContent.style.setProperty('--fx-p', val);
                }
            }

            // 3. Pinned Drive-By Scene (#na-plny-plyn): Buggy Jumps Across Screen
            if (drivebySection) {
                const rect = drivebySection.getBoundingClientRect();
                if (rect.bottom > -vh * 0.25 && rect.top < vh * 1.25) {
                    const totalRunway = Math.max(1, rect.height - vh * 0.65);
                    const p = clamp((vh * 0.15 - rect.top) / totalRunway, 0, 1);
                    const arc = Math.sin(p * Math.PI); // 0 -> 1 (apex) -> 0

                    const dbX = ((p - 0.5) * 72).toFixed(2) + 'vw';
                    const dbY = (-arc * 64 + (1 - p) * 14).toFixed(1) + 'px';
                    const dbRot = (-8.5 + p * 15).toFixed(2) + 'deg';
                    const dbScale = (0.96 + arc * 0.11).toFixed(3);
                    const shadowScale = (1 - arc * 0.34).toFixed(3);

                    drivebySection.style.setProperty('--fx-p', p.toFixed(4));
                    drivebySection.style.setProperty('--db-x', dbX);
                    drivebySection.style.setProperty('--db-y', dbY);
                    drivebySection.style.setProperty('--db-rot', dbRot);
                    drivebySection.style.setProperty('--db-scale', dbScale);
                    drivebySection.style.setProperty('--db-shadow-scale', shadowScale);
                }
            }

            // 4. Garáž Big Watermark Text (#garaz)
            if (garazSection) {
                const rect = garazSection.getBoundingClientRect();
                if (rect.bottom > 0 && rect.top < vh) {
                    const p = clamp((vh - rect.top) / (vh + rect.height), 0, 1);
                    garazSection.style.setProperty('--fx-p', p.toFixed(4));
                }
            }

            // 5. Vertical Steps Timeline Progress (#jak_zazitek_probiha .eo-steps)
            if (stepsScope) {
                const rect = stepsScope.getBoundingClientRect();
                if (rect.bottom > 0 && rect.top < vh) {
                    const startPoint = vh * 0.72;
                    const p = clamp((startPoint - rect.top) / Math.max(1, rect.height * 0.88), 0, 1);
                    stepsScope.style.setProperty('--fx-p', p.toFixed(4));
                }
            }

            // 6. Daruj Voucher Full-Bleed Parallax Banner
            if (bannerSection) {
                const rect = bannerSection.getBoundingClientRect();
                if (rect.bottom > 0 && rect.top < vh) {
                    const p = clamp((vh - rect.top) / (vh + rect.height), 0, 1);
                    bannerSection.style.setProperty('--fx-p', p.toFixed(4));
                }
            }

            // 7. Rounded Media Windows Inner Image Parallax
            for (let i = 0; i < mediaContainers.length; i++) {
                const box = mediaContainers[i];
                const rect = box.getBoundingClientRect();
                if (rect.bottom > 0 && rect.top < vh) {
                    const p = clamp((vh - rect.top) / (vh + rect.height), 0, 1);
                    box.style.setProperty('--fx-p', p.toFixed(4));
                }
            }

            ticking = false;
        };

        const onScrollOrResize = () => {
            if (!ticking) {
                requestAnimationFrame(updateFrame);
                ticking = true;
            }
        };

        window.addEventListener('scroll', onScrollOrResize, { passive: true });
        window.addEventListener('resize', onScrollOrResize, { passive: true });
        updateFrame();
    }

    /* ======================================================================
       6. DESKTOP POINTER MICRO-INTERACTIONS (3D Card Tilt & Magnetic Buttons)
       ====================================================================== */
    function initPointerMicroInteractions() {
        if (prefersReducedMotion || !hasFinePointer) return;

        // Subtle 3D tilt on minimalist feature cards
        document.querySelectorAll('.eo-card-minimal').forEach((card) => {
            card.addEventListener('pointermove', (e) => {
                const rect = card.getBoundingClientRect();
                const nx = (e.clientX - rect.left) / rect.width - 0.5;
                const ny = (e.clientY - rect.top) / rect.height - 0.5;
                const rx = (-ny * 5.5).toFixed(2) + 'deg';
                const ry = (nx * 6.5).toFixed(2) + 'deg';
                card.style.setProperty('--rx', rx);
                card.style.setProperty('--ry', ry);
            });

            card.addEventListener('pointerleave', () => {
                card.style.setProperty('--rx', '0deg');
                card.style.setProperty('--ry', '0deg');
            });
        });

        // Subtle magnetic pull on primary CTA buttons
        document.querySelectorAll('.eo-btn-primary').forEach((btn) => {
            btn.addEventListener('pointermove', (e) => {
                const rect = btn.getBoundingClientRect();
                const mx = ((e.clientX - (rect.left + rect.width / 2)) * 0.14).toFixed(1) + 'px';
                const my = ((e.clientY - (rect.top + rect.height / 2)) * 0.22).toFixed(1) + 'px';
                btn.style.setProperty('--mx', mx);
                btn.style.setProperty('--my', my);
            });

            btn.addEventListener('pointerleave', () => {
                btn.style.setProperty('--mx', '0px');
                btn.style.setProperty('--my', '0px');
            });
        });
    }

    /* ======================================================================
       BOOTSTRAP
       ====================================================================== */
    function boot() {
        initSplitHeadlines();
        initScrollReveals();
        initStatCounters();
        initSmartHeader();
        initScrollParallaxEngine();
        initPointerMicroInteractions();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
