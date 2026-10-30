/**
 * EXTREME OFFROAD (.CZ) — Minimalist Sunrace-Inspired Application & Parallax Engine
 */

const EO_PRODUCTS = {
    3: {
        id: 3,
        slug: 'gold',
        name: 'GOLD',
        subtitle: '30 minut divoké jízdy v dakarské buggyně Can-Am Maverick X RS Turbo RR 2021',
        price: 4990,
        stock: 'SKLADEM',
        image: 'images/generated/voucher-gold-luxury.jpg',
        originalImage: 'assets/original/3-O-voucher-gold.jpg'
    }
};

const EO_TRANSPORTS = {
    '16': { id: '16', name: 'Zásilkovna', price: 53 },
    '4':  { id: '4',  name: 'Osobní převzetí Praha', price: 0 },
    '15': { id: '15', name: 'Pouze e-mailem (elektronický voucher ihned)', price: 0 }
};

const EO_PAYMENTS = {
    '17': { id: '17', name: 'Dobírka ( zásilkovna )', price: 20 },
    '16': { id: '16', name: 'ON-LINE platba kartou', price: 0 }
};

const FREE_SHIPPING_LIMIT = 6000;

class ExtremeOffroadApp {
    constructor() {
        this.cart = JSON.parse(localStorage.getItem('eo_cart') || '{"3": 0}');
        this.favorites = JSON.parse(localStorage.getItem('eo_favs') || '[]');
        this.user = JSON.parse(localStorage.getItem('eo_user') || 'null');
        this.orders = JSON.parse(localStorage.getItem('eo_orders') || '[]');
        this.coupon = localStorage.getItem('eo_coupon') || '';
        this.checkoutStep = 1;
        this.selectedTransport = '16';
        this.selectedPayment = '17';
        this.customerData = {
            titul: '', jmeno: '', prijmeni: '', adresa: '', mesto: '', psc: '', telefon: '', email: '',
            dodStejna: '1', dod_jmeno: '', dod_prijmeni: '', dod_firma: '', dod_adresa: '', dod_mesto: '', dod_psc: '', dod_telefon: '',
            naFirmu: '1', firma: '', ico: '', dic: ''
        };

        this.initShrinkingHeaderFallback();
        this.initDialogLightDismissFallback();
        this.initNavigation();
        this.initCartAndCheckout();
        this.initForms();
        this.initCookieConsent();
        this.renderHeaderCart();
        this.renderFavoritesState();
        this.renderCustomerZone();
    }

    formatPrice(num) {
        return Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ',- Kč';
    }

    initShrinkingHeaderFallback() {
        if (!CSS.supports('(animation-timeline: scroll()) and (animation-range: 0% 100%)')) {
            const header = document.querySelector('header.eo-header');
            if (!header) return;
            window.addEventListener('scroll', () => {
                const p = Math.min(1, window.scrollY / 80);
                header.style.height = `${92 - 24 * p}px`;
            }, { passive: true });
        }
    }

    initDialogLightDismissFallback() {
        document.querySelectorAll('dialog.eo-dialog').forEach((dialog) => {
            if (!('closedBy' in HTMLDialogElement.prototype)) {
                dialog.addEventListener('click', (event) => {
                    if (event.target === dialog) dialog.close();
                });
            }
        });

        document.querySelectorAll('[data-open-dialog]').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const id = btn.getAttribute('data-open-dialog');
                const dlg = document.getElementById(id);
                if (dlg && typeof dlg.showModal === 'function') dlg.showModal();
            });
        });

        document.querySelectorAll('[data-close-dialog]').forEach((btn) => {
            btn.addEventListener('click', () => {
                btn.closest('dialog')?.close();
            });
        });
    }

    initNavigation() {
        const menuBtn = document.getElementById('mobile-menu-toggle');
        const nav = document.getElementById('main-nav');
        if (menuBtn && nav) {
            menuBtn.addEventListener('click', () => {
                const isOpen = nav.classList.toggle('is-open');
                menuBtn.setAttribute('aria-expanded', String(isOpen));
            });
            nav.querySelectorAll('a').forEach(link => {
                link.addEventListener('click', () => {
                    nav.classList.remove('is-open');
                    menuBtn.setAttribute('aria-expanded', 'false');
                });
            });
        }

        document.querySelectorAll('[data-faq-filter]').forEach(btn => {
            btn.addEventListener('click', () => {
                const cat = btn.getAttribute('data-faq-filter');
                document.querySelectorAll('[data-faq-filter]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                document.querySelectorAll('[data-faq-category]').forEach(item => {
                    item.style.display = (cat === 'all' || item.getAttribute('data-faq-category') === cat) ? '' : 'none';
                });
            });
        });
    }

    /* ==========================================================================
       CART & 4-STEP CHECKOUT (/objednavka)
       ========================================================================== */
    getCartTotalGoods() {
        let sum = 0;
        Object.keys(this.cart).forEach(id => {
            const count = parseInt(this.cart[id] || 0, 10);
            if (count > 0 && EO_PRODUCTS[id]) sum += EO_PRODUCTS[id].price * count;
        });
        return sum;
    }

    getCartCount() {
        return Object.values(this.cart).reduce((a, b) => a + (parseInt(b, 10) || 0), 0);
    }

    getDiscountAmount(goodsTotal) {
        if (!this.coupon) return 0;
        const code = this.coupon.trim().toUpperCase();
        if (code === 'GOLDVIP' || code === 'SLEVA10' || code === 'EXTREME10') {
            return Math.round(goodsTotal * 0.1);
        }
        return 0;
    }

    saveCart() {
        localStorage.setItem('eo_cart', JSON.stringify(this.cart));
        this.renderHeaderCart();
        this.renderCheckout();
    }

    addToCart(productId, qty = 1) {
        const current = parseInt(this.cart[productId] || 0, 10);
        this.cart[productId] = Math.max(1, current + qty);
        this.saveCart();
        document.getElementById('addToCartDialog')?.showModal();
    }

    setCartQty(productId, qty) {
        const parsed = parseInt(qty, 10);
        if (isNaN(parsed) || parsed <= 0) delete this.cart[productId];
        else this.cart[productId] = parsed;
        this.saveCart();
    }

    initCartAndCheckout() {
        document.querySelectorAll('.js-add-to-cart-form').forEach(form => {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const id = form.querySelector('[name="id_item"]').value || '3';
                const countInput = form.querySelector('[name="items_to_cart_count"]');
                const qty = Math.max(1, parseInt(countInput ? countInput.value : '1', 10) || 1);
                this.addToCart(id, qty);
            });
        });

        document.querySelectorAll('.js-toggle-fav').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const id = btn.getAttribute('data-id') || '3';
                const idx = this.favorites.indexOf(id);
                if (idx >= 0) this.favorites.splice(idx, 1);
                else this.favorites.push(id);
                localStorage.setItem('eo_favs', JSON.stringify(this.favorites));
                this.renderFavoritesState();
            });
        });

        document.querySelectorAll('[data-checkout-step]').forEach(btn => {
            btn.addEventListener('click', () => {
                const targetStep = parseInt(btn.getAttribute('data-checkout-step'), 10);
                if (targetStep > 1 && this.getCartCount() === 0) {
                    this.showToast('V košíku nemáte žádné produkty.');
                    return;
                }
                this.checkoutStep = targetStep;
                this.renderCheckout();
            });
        });

        this.renderCheckout();
    }

    renderFavoritesState() {
        const isFav = this.favorites.includes('3');
        document.querySelectorAll('.js-fav-text').forEach(el => {
            el.textContent = isFav ? 'V oblíbených' : 'Oblíbené';
        });
    }

    renderHeaderCart() {
        const total = this.getCartTotalGoods();
        const count = this.getCartCount();
        const discount = this.getDiscountAmount(total);
        const finalGoods = Math.max(0, total - discount);

        document.querySelectorAll('.js-header-cart-Label').forEach(el => {
            el.textContent = count === 0 ? 'Košík (0)' : `${count}× (${this.formatPrice(finalGoods)})`;
        });
    }

    renderCheckout() {
        const container = document.getElementById('checkout-dynamic-container');
        if (!container) return;

        document.querySelectorAll('[data-breadcrumb-step]').forEach(el => {
            const s = parseInt(el.getAttribute('data-breadcrumb-step'), 10);
            el.style.color = s === this.checkoutStep ? 'var(--main)' : (s < this.checkoutStep ? 'var(--text-dark)' : 'var(--text-muted)');
            el.style.fontWeight = s === this.checkoutStep ? '700' : '500';
        });

        const count = this.getCartCount();
        const goodsTotal = this.getCartTotalGoods();
        const discount = this.getDiscountAmount(goodsTotal);
        const goodsAfterDiscount = Math.max(0, goodsTotal - discount);
        const remainingForFreeShipping = Math.max(0, FREE_SHIPPING_LIMIT - goodsAfterDiscount);

        const transportObj = EO_TRANSPORTS[this.selectedTransport] || EO_TRANSPORTS['16'];
        const paymentObj = EO_PAYMENTS[this.selectedPayment] || EO_PAYMENTS['17'];
        const transportCost = remainingForFreeShipping === 0 ? 0 : transportObj.price;
        const paymentCost = paymentObj.price;
        const grandTotal = goodsAfterDiscount + transportCost + paymentCost;

        if (count === 0 && this.checkoutStep !== 4) {
            container.innerHTML = `
                <div class="eo-glass-panel" style="background: var(--sand); text-align:center; padding: 3.5rem 2rem;">
                    <span class="material-symbols-outlined icon-xl" style="color: var(--main); margin-bottom: 0.75rem;">shopping_bag</span>
                    <h3 class="eo-card-title" style="margin-bottom: 0.5rem;">Váš košík je zatím prázdný</h3>
                    <p style="color: var(--text-muted); margin: 0 auto 1.75rem; max-width: 460px;">
                        Vyberte si zážitkový voucher GOLD s moto kuklou zdarma a dárkovým balením.
                    </p>
                    <button type="button" class="eo-btn-primary" id="quick-add-gold-btn">
                        <span class="material-symbols-outlined icon-sm">add_shopping_cart</span>
                        <span>Vložit voucher GOLD (4 990,- Kč)</span>
                    </button>
                </div>
            `;
            document.getElementById('quick-add-gold-btn')?.addEventListener('click', () => this.addToCart('3', 1));
            return;
        }

        if (this.checkoutStep === 1) {
            const itemCount = this.cart['3'] || 1;
            const itemTotal = itemCount * EO_PRODUCTS[3].price;
            container.innerHTML = `
                <div class="eo-glass-panel" style="background: var(--sand);">
                    <div style="overflow-x:auto;">
                        <table style="width:100%; border-collapse: collapse; text-align:left;">
                            <thead>
                                <tr style="border-bottom: 1px solid var(--border-light); color: var(--text-muted); font-size: 0.8rem; text-transform:uppercase;">
                                    <th style="padding: 0.75rem;">Produkt</th>
                                    <th style="padding: 0.75rem;">Název</th>
                                    <th style="padding: 0.75rem;">Počet</th>
                                    <th style="padding: 0.75rem;">Cena celkem</th>
                                    <th style="padding: 0.75rem; text-align:right;">Akce</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr style="border-bottom: 1px solid var(--border-light);">
                                    <td style="padding: 1rem 0.75rem;">
                                        <img src="${EO_PRODUCTS[3].image}" alt="GOLD" width="90" height="60" loading="lazy" decoding="async" style="border-radius: 10px; object-fit: cover;">
                                    </td>
                                    <td style="padding: 1rem 0.75rem;">
                                        <strong style="font-size: 1.05rem;">Voucher GOLD — Can-Am Maverick X3</strong>
                                        <div style="font-size: 0.85rem; color: var(--text-muted);">30 min jízdy s instruktorem + kukla zdarma + dárkové balení</div>
                                    </td>
                                    <td style="padding: 1rem 0.75rem; max-width: 110px;">
                                        <input type="number" min="1" max="20" value="${itemCount}" id="cart-qty-input" class="eo-input" style="width: 82px; text-align:center; background: var(--white);">
                                    </td>
                                    <td style="padding: 1rem 0.75rem; font-weight:700; color: var(--main); font-size: 1.15rem;">
                                        ${this.formatPrice(itemTotal)}
                                    </td>
                                    <td style="padding: 1rem 0.75rem; text-align:right;">
                                        <button type="button" id="cart-remove-item" class="eo-action-btn">
                                            <span class="material-symbols-outlined icon-sm">delete</span>
                                            <span>Odebrat</span>
                                        </button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div style="margin-top: 1.5rem; padding: 1.5rem; background: var(--white); border-radius: 16px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem;">
                            <strong>Zboží celkem:</strong>
                            <span style="font-size: 1.5rem; font-weight:700; color: var(--main);">${this.formatPrice(goodsAfterDiscount)}</span>
                        </div>
                        ${discount > 0 ? `<div style="display:flex; justify-content:space-between; color: #15803d; font-size:0.9rem; margin-top:0.35rem;"><span>Slevový kupón (${this.coupon.toUpperCase()}):</span><span>−${this.formatPrice(discount)}</span></div>` : ''}
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-top: 0.5rem; font-size: 0.9rem; color: var(--text-muted);">
                            <span>Do dopravy zdarma zbývá:</span>
                            <strong>${remainingForFreeShipping === 0 ? 'Doprava zdarma splněna' : this.formatPrice(remainingForFreeShipping)}</strong>
                        </div>
                    </div>

                    <form id="coupon-form" style="margin-top: 1.25rem; display:flex; gap: 0.75rem; flex-wrap:wrap; align-items:center; justify-content:space-between;">
                        <label for="kod_sleva" style="font-size: 0.9rem; color: var(--text-muted);">
                            Máte slevový kupón? (Tip: <code style="color:var(--main); font-weight:700;">GOLDVIP</code>):
                        </label>
                        <div style="display:flex; gap: 0.5rem; flex: 1; max-width: 360px;">
                            <input type="text" id="kod_sleva" value="${this.coupon}" placeholder="Kód kupónu" class="eo-input" style="background: var(--white);">
                            <button type="submit" class="eo-action-btn" style="white-space:nowrap;">Uplatnit</button>
                        </div>
                    </form>

                    <div style="margin-top: 2rem; display:flex; justify-content:flex-end;">
                        <button type="button" class="eo-btn-primary" id="go-step-2-btn">
                            <span>Pokračovat k dodacím údajům</span>
                            <span class="material-symbols-outlined icon-sm">arrow_forward</span>
                        </button>
                    </div>
                </div>
            `;

            document.getElementById('cart-qty-input')?.addEventListener('change', (e) => this.setCartQty('3', e.target.value));
            document.getElementById('cart-remove-item')?.addEventListener('click', () => this.setCartQty('3', 0));
            document.getElementById('coupon-form')?.addEventListener('submit', (e) => {
                e.preventDefault();
                const val = document.getElementById('kod_sleva').value.trim();
                this.coupon = val;
                localStorage.setItem('eo_coupon', val);
                this.saveCart();
                this.showToast(this.getDiscountAmount(goodsTotal) > 0 ? 'Slevový kupón 10 % uplatněn!' : 'Kupón uložen.');
            });
            document.getElementById('go-step-2-btn')?.addEventListener('click', () => {
                this.checkoutStep = 2;
                this.renderCheckout();
            });
        } else if (this.checkoutStep === 2) {
            const c = this.customerData;
            container.innerHTML = `
                <form id="checkout-step2-form" class="eo-glass-panel" style="background: var(--sand);">
                    <div class="eo-grid-2" style="align-items:start; gap: 2.5rem;">
                        <div>
                            <h3 class="eo-card-title" style="margin-bottom: 1rem;">Osobní údaje</h3>
                            <div style="display:grid; grid-template-columns: 1fr 2fr; gap: 0.75rem; margin-bottom: 0.75rem;">
                                <div>
                                    <label class="eo-label">Titul</label>
                                    <input type="text" name="titul" value="${c.titul}" class="eo-input" style="background:var(--white);" placeholder="Ing.">
                                </div>
                                <div>
                                    <label class="eo-label">Jméno *</label>
                                    <input type="text" name="jmeno" value="${c.jmeno}" class="eo-input" style="background:var(--white);" required placeholder="Jan">
                                </div>
                            </div>
                            <div style="margin-bottom: 0.75rem;">
                                <label class="eo-label">Příjmení *</label>
                                <input type="text" name="prijmeni" value="${c.prijmeni}" class="eo-input" style="background:var(--white);" required placeholder="Novák">
                            </div>
                            <div style="margin-bottom: 0.75rem;">
                                <label class="eo-label">Adresa (ulice a č.p.) *</label>
                                <input type="text" name="adresa" value="${c.adresa}" class="eo-input" style="background:var(--white);" required placeholder="Na Folimance 2155/15">
                            </div>
                            <div style="display:grid; grid-template-columns: 2fr 1fr; gap: 0.75rem; margin-bottom: 0.75rem;">
                                <div>
                                    <label class="eo-label">Město *</label>
                                    <input type="text" name="mesto" value="${c.mesto}" class="eo-input" style="background:var(--white);" required placeholder="Praha 2">
                                </div>
                                <div>
                                    <label class="eo-label">PSČ *</label>
                                    <input type="text" name="psc" value="${c.psc}" minlength="5" class="eo-input" style="background:var(--white);" required placeholder="12000">
                                </div>
                            </div>
                            <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
                                <div>
                                    <label class="eo-label">Telefon *</label>
                                    <input type="tel" name="telefon" value="${c.telefon}" class="eo-input" style="background:var(--white);" required placeholder="+420 736 10 88 10">
                                </div>
                                <div>
                                    <label class="eo-label">E-mail *</label>
                                    <input type="email" name="email" value="${c.email}" class="eo-input" style="background:var(--white);" required placeholder="jan.novak@email.cz">
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 class="eo-card-title" style="margin-bottom: 1rem;">Způsob dopravy a platby</h3>
                            <div style="padding: 1.25rem; background: var(--white); border-radius: 16px; margin-bottom: 1rem;">
                                <strong style="display:block; margin-bottom: 0.65rem;">Doprava (Česká republika)</strong>
                                ${Object.values(EO_TRANSPORTS).map(t => `
                                    <label style="display:flex; justify-content:space-between; padding: 0.45rem 0; cursor:pointer;">
                                        <span>
                                            <input type="radio" name="id_transport" value="${t.id}" ${this.selectedTransport === t.id ? 'checked' : ''}>
                                            ${t.name}
                                        </span>
                                        <strong>${remainingForFreeShipping === 0 ? '0,- Kč' : t.price + ',- Kč'}</strong>
                                    </label>
                                `).join('')}
                            </div>

                            <div style="padding: 1.25rem; background: var(--white); border-radius: 16px;">
                                <strong style="display:block; margin-bottom: 0.65rem;">Platba</strong>
                                ${Object.values(EO_PAYMENTS).map(p => `
                                    <label style="display:flex; justify-content:space-between; padding: 0.45rem 0; cursor:pointer;">
                                        <span>
                                            <input type="radio" name="id_payment" value="${p.id}" ${this.selectedPayment === p.id ? 'checked' : ''}>
                                            ${p.name}
                                        </span>
                                        <strong>${p.price},- Kč</strong>
                                    </label>
                                `).join('')}
                            </div>
                        </div>
                    </div>

                    <div style="margin-top: 2rem; display:flex; justify-content:space-between; flex-wrap:wrap; gap: 1rem;">
                        <button type="button" class="eo-action-btn" id="back-step-1-btn">
                            <span class="material-symbols-outlined icon-sm">arrow_back</span>
                            <span>Zpět na košík</span>
                        </button>
                        <button type="submit" class="eo-btn-primary">
                            <span>Pokračovat na souhrn</span>
                            <span class="material-symbols-outlined icon-sm">arrow_forward</span>
                        </button>
                    </div>
                </form>
            `;

            const form = document.getElementById('checkout-step2-form');
            form?.querySelectorAll('[name="id_transport"]').forEach(r => {
                r.addEventListener('change', (e) => { this.selectedTransport = e.target.value; });
            });
            form?.querySelectorAll('[name="id_payment"]').forEach(r => {
                r.addEventListener('change', (e) => { this.selectedPayment = e.target.value; });
            });
            document.getElementById('back-step-1-btn')?.addEventListener('click', () => {
                this.checkoutStep = 1;
                this.renderCheckout();
            });
            form?.addEventListener('submit', (e) => {
                e.preventDefault();
                const fd = new FormData(form);
                fd.forEach((val, key) => { this.customerData[key] = String(val); });
                this.checkoutStep = 3;
                this.renderCheckout();
            });
        } else if (this.checkoutStep === 3) {
            const c = this.customerData;
            container.innerHTML = `
                <div class="eo-glass-panel" style="background: var(--sand);">
                    <h3 class="eo-card-title" style="margin-bottom: 1.25rem;">Souhrn objednávky</h3>
                    <div class="eo-grid-2" style="align-items:start; gap: 1.5rem; margin-bottom: 1.5rem;">
                        <div style="padding: 1.5rem; background: var(--white); border-radius: 16px;">
                            <strong>Odběratel:</strong>
                            <p style="margin: 0.5rem 0 0; color: var(--text-muted);">
                                ${c.titul ? c.titul + ' ' : ''}${c.jmeno} ${c.prijmeni}<br>
                                ${c.adresa}, ${c.psc} ${c.mesto}<br>
                                Tel.: ${c.telefon} | E-mail: ${c.email}
                            </p>
                        </div>
                        <div style="padding: 1.5rem; background: var(--white); border-radius: 16px;">
                            <strong>Doprava, platba a celková cena:</strong>
                            <p style="margin: 0.5rem 0 0; color: var(--text-muted);">
                                Doprava: <strong>${transportObj.name} (${this.formatPrice(transportCost)})</strong><br>
                                Platba: <strong>${paymentObj.name} (${this.formatPrice(paymentCost)})</strong><br>
                                Celkem k úhradě: <strong style="color:var(--main); font-size: 1.35rem;">${this.formatPrice(grandTotal)}</strong>
                            </p>
                        </div>
                    </div>
                    <label style="display:flex; align-items:center; gap: 0.6rem; cursor:pointer; margin-bottom: 1.5rem;">
                        <input type="checkbox" id="confirm-terms-checkbox" checked>
                        <span>Souhlasím s <a href="#" data-open-dialog="termsDialog" style="color:var(--main);">obchodními podmínkami</a> a <a href="#" data-open-dialog="privacyDialog" style="color:var(--main);">zpracováním osobních údajů</a>.</span>
                    </label>
                    <div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap: 1rem;">
                        <button type="button" class="eo-action-btn" id="back-step-2-btn">
                            <span class="material-symbols-outlined icon-sm">arrow_back</span>
                            <span>Upravit údaje</span>
                        </button>
                        <button type="button" class="eo-btn-primary" id="finish-order-btn">
                            <span class="material-symbols-outlined icon-sm">verified</span>
                            <span>Závazně dokončit objednávku</span>
                        </button>
                    </div>
                </div>
            `;
            this.initDialogLightDismissFallback();
            document.getElementById('back-step-2-btn')?.addEventListener('click', () => {
                this.checkoutStep = 2;
                this.renderCheckout();
            });
            document.getElementById('finish-order-btn')?.addEventListener('click', () => {
                const chk = document.getElementById('confirm-terms-checkbox');
                if (chk && !chk.checked) {
                    this.showToast('Pro pokračování je třeba souhlasit s obchodními podmínkami.');
                    return;
                }
                const orderCode = 'EO-' + Math.floor(100000 + Math.random() * 900000);
                const newOrder = {
                    code: orderCode,
                    date: new Date().toLocaleDateString('cs-CZ'),
                    qty: this.getCartCount(),
                    total: grandTotal,
                    transport: transportObj.name
                };
                this.orders.unshift(newOrder);
                localStorage.setItem('eo_orders', JSON.stringify(this.orders));
                this.lastCompletedOrder = newOrder;
                this.cart = { '3': 0 };
                this.saveCart();
                this.checkoutStep = 4;
                this.renderCheckout();
                this.renderCustomerZone();
            });
        } else if (this.checkoutStep === 4) {
            const ord = this.lastCompletedOrder || { code: 'EO-202601' };
            container.innerHTML = `
                <div class="eo-glass-panel" style="background: var(--sand); text-align:center; padding: 3.5rem 2rem;">
                    <span class="material-symbols-outlined icon-xl" style="color: var(--main); margin-bottom: 0.75rem;">check_circle</span>
                    <h3 class="eo-card-title" style="font-size: 2.4rem;">Objednávka ${ord.code} byla přijata</h3>
                    <p style="max-width: 520px; margin: 0 auto 1.75rem; color: var(--text-muted);">
                        Děkujeme za objednávku dárkového voucheru GOLD včetně moto kukly zdarma. Potvrzení jsme odeslali na váš e-mail.
                    </p>
                    <button type="button" class="eo-btn-primary" id="new-order-reset-btn">Zpět do e-shopu</button>
                </div>
            `;
            document.getElementById('new-order-reset-btn')?.addEventListener('click', () => {
                this.checkoutStep = 1;
                this.renderCheckout();
            });
        }
    }

    /* ==========================================================================
       FORMS & CUSTOMER ZONE
       ========================================================================== */
    initForms() {
        const contactForm = document.getElementById('form_kontaktni_formular');
        if (contactForm) {
            contactForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.showToast('Zpráva byla odeslána na zazitek@extremeoffroad.cz.');
                contactForm.reset();
            });
        }

        const loginForm = document.getElementById('login-modal-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const username = loginForm.querySelector('[name="login_user"]').value.trim();
                this.user = { login: username, email: username.includes('@') ? username : `${username}@extremeoffroad.cz` };
                localStorage.setItem('eo_user', JSON.stringify(this.user));
                document.getElementById('loginDialog')?.close();
                this.renderCustomerZone();
                this.showToast(`Vítejte, ${username}!`);
            });
        }

        const regForm = document.getElementById('registraceForm');
        if (regForm) {
            regForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const pass1 = regForm.querySelector('[name="passwd"]').value;
                const pass2 = regForm.querySelector('[name="passwd_confirm"]').value;
                if (pass1 !== pass2) {
                    this.showToast('Hesla se neshodují!');
                    return;
                }
                const login = regForm.querySelector('[name="login"]').value.trim();
                const email = regForm.querySelector('[name="email"]').value.trim();
                this.user = { login, email };
                localStorage.setItem('eo_user', JSON.stringify(this.user));
                document.getElementById('registerDialog')?.close();
                this.renderCustomerZone();
                this.showToast(`Registrace účtu ${login} byla dokončena!`);
            });
        }

        const lostPassForm = document.getElementById('lost_pass_form');
        if (lostPassForm) {
            lostPassForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const email = lostPassForm.querySelector('[name="lost_pass_email"]').value;
                document.getElementById('lostPassDialog')?.close();
                this.showToast(`Odkaz pro obnovu hesla byl odeslán na ${email}.`);
            });
        }
    }

    renderCustomerZone() {
        const authBtnText = document.getElementById('header-auth-label');
        if (authBtnText) {
            authBtnText.textContent = this.user ? this.user.login : 'Účet';
        }

        const zoneBox = document.getElementById('customer-zone-content');
        if (!zoneBox) return;

        if (!this.user) {
            zoneBox.innerHTML = `
                <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap: 1rem;">
                    <div>
                        <strong style="font-size: 1.1rem;">Správa objednávek a zákaznický účet</strong>
                        <p style="margin: 0.2rem 0 0; color: var(--text-muted); font-size: 0.92rem;">
                            Přihlaste se pro přehled zakoupených voucherů a oblíbených balíčků.
                        </p>
                    </div>
                    <div style="display:flex; gap: 0.75rem; flex-wrap:wrap;">
                        <button type="button" class="eo-btn-primary" data-open-dialog="loginDialog">Přihlásit se</button>
                        <button type="button" class="eo-action-btn" style="background: var(--white);" data-open-dialog="registerDialog">Registrace</button>
                    </div>
                </div>
            `;
            this.initDialogLightDismissFallback();
        } else {
            zoneBox.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap: 1rem;">
                    <div>
                        <strong>Přihlášený uživatel: ${this.user.login} (${this.user.email})</strong>
                        <div style="font-size: 0.9rem; color: var(--text-muted);">
                            Počet objednávek: ${this.orders.length} | Oblíbené: ${this.favorites.length ? 'Voucher GOLD' : 'žádné'}
                        </div>
                    </div>
                    <button type="button" class="eo-action-btn" style="background: var(--white);" id="logout-btn">Odhlásit se</button>
                </div>
            `;
            document.getElementById('logout-btn')?.addEventListener('click', () => {
                this.user = null;
                localStorage.removeItem('eo_user');
                this.renderCustomerZone();
                this.showToast('Byli jste odhlášeni.');
            });
        }
    }

    initCookieConsent() {
        const banner = document.getElementById('cookie-consent-banner');
        const btn = document.getElementById('cookie-consent-accept');
        if (!banner || !btn) return;
        if (localStorage.getItem('eo_cookies_accepted') === '1') {
            banner.style.display = 'none';
        }
        btn.addEventListener('click', () => {
            localStorage.setItem('eo_cookies_accepted', '1');
            banner.style.display = 'none';
        });
    }

    showToast(msg) {
        let toast = document.getElementById('eo-toast-notification');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'eo-toast-notification';
            toast.style.cssText = 'position:fixed; top:100px; right:24px; z-index:9999; background:#1c110e; color:#ffffff; padding:0.9rem 1.4rem; border-radius:999px; box-shadow:0 16px 40px rgba(0,0,0,0.3); font-weight:600; font-size:0.9rem; transition:opacity 0.3s ease;';
            document.body.appendChild(toast);
        }
        toast.textContent = msg;
        toast.style.opacity = '1';
        clearTimeout(this.toastTimer);
        this.toastTimer = setTimeout(() => { toast.style.opacity = '0'; }, 3500);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.extremeOffroadApp = new ExtremeOffroadApp();
});
