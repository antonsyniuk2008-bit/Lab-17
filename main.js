// ==========================================================================
// 1. Початкові дані та константи
// ==========================================================================
let globalStoreProducts = [
    { id: 1, title: "Fjallraven - Foldsack No. 1 Backpack", price: 109.95, category: "men's clothing", rating: { rate: 3.9, count: 120 }, image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=300" },
    { id: 2, title: "Mens Casual Premium Slim Fit T-Shirts", price: 22.30, category: "men's clothing", rating: { rate: 4.1, count: 259 }, image: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=300" },
    { id: 3, title: "Mens Cotton Jacket - Куртка", price: 55.99, category: "men's clothing", rating: { rate: 4.7, count: 500 }, image: "https://images.unsplash.com/photo-1544441893-675973e31985?w=300" },
    { id: 4, title: "Mens Casual Slim Fit - Штани", price: 15.99, category: "men's clothing", rating: { rate: 2.1, count: 430 }, image: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=300" },
    { id: 5, title: "Apple MacBook Pro 16", price: 2499.00, category: "electronics", rating: { rate: 4.9, count: 310 }, image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=300" },
    { id: 6, title: "Samsung Galaxy S24 Ultra", price: 1199.00, category: "electronics", rating: { rate: 4.8, count: 420 }, image: "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=300" },
    { id: 7, title: "Sony WH-1000XM5", price: 349.99, category: "electronics", rating: { rate: 4.6, count: 180 }, image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300" },
    { id: 8, title: "Монітор LG UltraGear 27", price: 299.50, category: "electronics", rating: { rate: 4.5, count: 95 }, image: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=300" },
    { id: 9, title: "Миша Razer DeathAdder Essential", price: 29.99, category: "electronics", rating: { rate: 4.3, count: 640 }, image: "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=300" }
];

const KEYS = { THEME: 'techshop_theme', CART: 'techshop_cart', FAV: 'techshop_favorites', DRAFT: 'techshop_checkout_draft' };
const CATALOG_DEFAULTS = Object.freeze({ q: '', category: 'all', sort: 'default', page: 1, perPage: 6, minPrice: '', maxPrice: '' });
const ALLOWED = { SORTS: ['default', 'price_asc', 'price_desc', 'title_asc', 'rating_desc'], PER_PAGE: [4, 6, 8, 12] };

let catalogState = { ...CATALOG_DEFAULTS };
let cart = [], favoriteProductIds = [];

// DOM Елементи
const $ = (id) => document.getElementById(id);
const productsGrid = document.querySelector(".products-grid");
const paginationContainer = $('pagination');
const catalogInfo = $('catalogInfo');
const categorySelect = $('categorySelect');

// DOM Елементи Кошика та Модалки
const cartButton = document.querySelector(".btn-cart");
const cartCounter = document.querySelector(".cart-counter");
const cartOverlay = $('cartOverlay');
const closeCartBtn = $('closeCartBtn');
const cartItemsContainer = $('cartItemsContainer');
const cartTotalSum = $('cartTotalSum');
const orderForm = $('checkoutOrderForm');

// ==========================================================================
// 2. URL State & URLSearchParams (ЛР №17)
// ==========================================================================
function readStateFromURL() {
    const p = new URLSearchParams(window.location.search);
    const parseNum = (val, isFloat = false) => {
        const num = isFloat ? parseFloat(val) : parseInt(val, 10);
        return !isNaN(num) && num >= 0 ? num : '';
    };

    return {
        q: (p.get('q') || '').trim().slice(0, 50),
        category: p.get('category') || CATALOG_DEFAULTS.category,
        sort: ALLOWED.SORTS.includes(p.get('sort')) ? p.get('sort') : CATALOG_DEFAULTS.sort,
        page: parseNum(p.get('page')) || CATALOG_DEFAULTS.page,
        perPage: ALLOWED.PER_PAGE.includes(parseNum(p.get('perPage'))) ? parseNum(p.get('perPage')) : CATALOG_DEFAULTS.perPage,
        minPrice: parseNum(p.get('minPrice'), true),
        maxPrice: parseNum(p.get('maxPrice'), true)
    };
}

function syncURL(mode = 'push') {
    const url = new URL(window.location.href);
    const p = new URLSearchParams();

    Object.entries(catalogState).forEach(([key, val]) => {
        if (val !== '' && val !== CATALOG_DEFAULTS[key]) p.set(key, String(val));
    });

    url.search = p.toString();
    if (url.href !== window.location.href) {
        history[mode === 'replace' ? 'replaceState' : 'pushState']({ ...catalogState }, '', url);
    }
}

// ==========================================================================
// 3. Конвеєр обробки товарів
// ==========================================================================
function processProducts() {
    let result = globalStoreProducts.filter(p => {
        const matchQ = p.title.toLowerCase().includes(catalogState.q.toLowerCase());
        const matchCat = catalogState.category === 'all' || p.category === catalogState.category;
        const matchMin = catalogState.minPrice === '' || p.price >= Number(catalogState.minPrice);
        const matchMax = catalogState.maxPrice === '' || p.price <= Number(catalogState.maxPrice);
        return matchQ && matchCat && matchMin && matchMax;
    });

    const sortMap = {
        price_asc: (a, b) => a.price - b.price,
        price_desc: (a, b) => b.price - a.price,
        title_asc: (a, b) => a.title.localeCompare(b.title),
        rating_desc: (a, b) => (b.rating?.rate ?? 0) - (a.rating?.rate ?? 0)
    };
    if (sortMap[catalogState.sort]) result.sort(sortMap[catalogState.sort]);

    const totalItems = result.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / catalogState.perPage));
    catalogState.page = Math.min(Math.max(catalogState.page, 1), totalPages);

    const start = (catalogState.page - 1) * catalogState.perPage;
    return { items: result.slice(start, start + catalogState.perPage), totalItems, totalPages, start };
}

function updateCatalog(historyMode = null) {
    const { items, totalItems, totalPages, start } = processProducts();

    renderProducts(items);
    renderPagination(catalogState.page, totalPages);

    if (catalogInfo) {
        catalogInfo.textContent = totalItems === 0
            ? 'Товарів не знайдено'
            : `Показано ${start + 1}–${start + items.length} з ${totalItems} товарів`;
    }

    if (historyMode) syncURL(historyMode);
}

// ==========================================================================
// 4. Рендеринг DOM
// ==========================================================================
function renderProducts(items) {
    if (!productsGrid) return;
    if (!items.length) {
        productsGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted);">Товарів не знайдено</p>';
        return;
    }

    productsGrid.innerHTML = items.map(p => {
        const rate = p.rating?.rate ?? 0;
        const stars = '★'.repeat(Math.round(rate)) + '☆'.repeat(5 - Math.round(rate));
        return `
            <article class="product-card" draggable="true" data-id="${p.id}">
                <img src="${p.image}" alt="${p.title}" draggable="false" onerror="this.src='https://via.placeholder.com/200?text=TechShop'">
                <h3 title="${p.title}">${p.title}</h3>
                <div class="product-rating"><span>${stars}</span> <strong>${rate}</strong> (${p.rating?.count ?? 0})</div>
                <p class="price">$${p.price}</p>
                <button class="btn-buy" data-id="${p.id}">Купити</button>
            </article>`;
    }).join('');
}

function renderPagination(current, total) {
    if (!paginationContainer) return;
    if (total <= 1) { paginationContainer.innerHTML = ''; return; }

    let html = `<button class="page-btn" data-page="${current - 1}" ${current === 1 ? 'disabled' : ''}>‹</button>`;
    for (let i = 1; i <= total; i++) {
        html += `<button class="page-btn ${i === current ? 'is-active' : ''}" data-page="${i}">${i}</button>`;
    }
    html += `<button class="page-btn" data-page="${current + 1}" ${current === total ? 'disabled' : ''}>›</button>`;
    paginationContainer.innerHTML = html;
}

function applyStateToControls() {
    if ($('searchInput')) $('searchInput').value = catalogState.q;
    if (categorySelect) categorySelect.value = catalogState.category;
    if ($('sortSelect')) $('sortSelect').value = catalogState.sort;
    if ($('perPageSelect')) $('perPageSelect').value = catalogState.perPage;
    if ($('minPriceInput')) $('minPriceInput').value = catalogState.minPrice;
    if ($('maxPriceInput')) $('maxPriceInput').value = catalogState.maxPrice;
}

// ==========================================================================
// 5. Логіка Кошика
// ==========================================================================
function updateCartSummary() {
    const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    if (cartCounter) cartCounter.textContent = totalCount;
    if (cartTotalSum) cartTotalSum.textContent = totalPrice.toFixed(2);
}

function saveCart() {
    localStorage.setItem(KEYS.CART, JSON.stringify(cart));
    updateCartSummary();
}

function addToCart(productId) {
    const product = globalStoreProducts.find(p => p.id === productId);
    if (!product) return;

    const existing = cart.find(item => item.id === productId);
    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({ ...product, quantity: 1 });
    }
    saveCart();
    if (cartOverlay && !cartOverlay.classList.contains('hidden')) renderCartItems();
}

function renderCartItems() {
    if (!cartItemsContainer) return;
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = "<p>Кошик порожній.</p>";
        return;
    }
    cartItemsContainer.innerHTML = cart.map(item => `
        <div class="cart-item">
            <span><strong>${item.title}</strong></span>
            <span>$${item.price} x ${item.quantity}</span>
        </div>
    `).join("");
}

cartButton?.addEventListener('click', () => {
    renderCartItems();
    cartOverlay?.classList.remove('hidden');
});

closeCartBtn?.addEventListener('click', () => cartOverlay?.classList.add('hidden'));

cartOverlay?.addEventListener('click', (e) => {
    if (e.target === cartOverlay) cartOverlay.classList.add('hidden');
});

// Клік на кнопку "Купити" у сітці товарів
productsGrid?.addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-buy')) {
        addToCart(Number(e.target.dataset.id));
    }
});

// ==========================================================================
// 6. Події Панелі та Debounce
// ==========================================================================
const debounce = (fn, delay = 300) => {
    let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
};

$('searchInput')?.addEventListener('input', debounce(e => {
    catalogState.q = e.target.value.trim().slice(0, 50);
    catalogState.page = 1;
    updateCatalog('replace');
}));

const handleFilterChange = (key, parseNum = false) => (e) => {
    catalogState[key] = parseNum ? Number(e.target.value) : e.target.value;
    catalogState.page = 1;
    updateCatalog('push');
};

$('categorySelect')?.addEventListener('change', handleFilterChange('category'));
$('sortSelect')?.addEventListener('change', handleFilterChange('sort'));
$('perPageSelect')?.addEventListener('change', handleFilterChange('perPage', true));

const handlePrice = debounce(() => {
    catalogState.minPrice = parseFloat($('minPriceInput')?.value) || '';
    catalogState.maxPrice = parseFloat($('maxPriceInput')?.value) || '';
    catalogState.page = 1;
    updateCatalog('push');
}, 400);

$('minPriceInput')?.addEventListener('input', handlePrice);
$('maxPriceInput')?.addEventListener('input', handlePrice);

$('resetFiltersBtn')?.addEventListener('click', () => {
    catalogState = { ...CATALOG_DEFAULTS };
    applyStateToControls();
    updateCatalog('push');
});

$('shareLinkBtn')?.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(location.href); alert('Посилання скопійовано!'); } 
    catch { prompt('Скопіюйте посилання:', location.href); }
});

paginationContainer?.addEventListener('click', (e) => {
    const btn = e.target.closest('.page-btn');
    if (!btn || btn.disabled) return;
    catalogState.page = Number(btn.dataset.page);
    updateCatalog('push');
});

window.addEventListener('popstate', () => {
    catalogState = readStateFromURL();
    applyStateToControls();
    updateCatalog();
});

document.addEventListener('keydown', (e) => {
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
    if (e.key === 'ArrowLeft') { catalogState.page--; updateCatalog('push'); }
    if (e.key === 'ArrowRight') { catalogState.page++; updateCatalog('push'); }
});

// ==========================================================================
// 7. Тема, Чернетка та Drag & Drop
// ==========================================================================
function initTheme() {
    const theme = localStorage.getItem(KEYS.THEME) || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark-theme', theme === 'dark');
    document.body.classList.toggle('dark-theme', theme === 'dark');
}

$('themeToggleBtn')?.addEventListener('click', () => {
    const isDark = document.body.classList.toggle('dark-theme');
    document.documentElement.classList.toggle('dark-theme', isDark);
    localStorage.setItem(KEYS.THEME, isDark ? 'dark' : 'light');
});

// Drag & Drop
const favZone = $('favoritesZone');
productsGrid?.addEventListener('dragstart', e => e.dataTransfer.setData('text/plain', e.target.closest('.product-card')?.dataset.id));
favZone?.addEventListener('dragover', e => e.preventDefault());
favZone?.addEventListener('drop', e => {
    e.preventDefault();
    const id = Number(e.dataTransfer.getData('text/plain'));
    if (id && !favoriteProductIds.includes(id)) {
        favoriteProductIds.push(id);
        localStorage.setItem(KEYS.FAV, JSON.stringify(favoriteProductIds));
        renderFavs();
    }
});

function renderFavs() {
    if (!favZone) return;
    if (favoriteProductIds.length === 0) {
        favZone.innerHTML = '<p class="empty-fav">Перетягніть сюди товари в Улюблене</p>';
        return;
    }
    const favoriteItems = globalStoreProducts.filter(p => favoriteProductIds.includes(p.id));
    favZone.innerHTML = `
        <h4 style="margin: 0 0 10px 0;">Обрані товари (${favoriteProductIds.length}):</h4>
        <div class="fav-chips" style="display:flex; gap:8px; flex-wrap:wrap; justify-content:center;">
            ${favoriteItems.map(item => `
                <span class="fav-chip" style="background:var(--bg-primary); border:1px solid var(--border-color); padding:4px 12px; border-radius:20px; font-size:13px; font-weight:bold;">
                    ❤️ ${item.title.length > 18 ? item.title.slice(0, 18) + '...' : item.title}
                    <button class="btn-remove-fav" data-id="${item.id}" style="border:none; background:none; cursor:pointer; color:red; font-weight:bold; margin-left:4px;">×</button>
                </span>
            `).join('')}
        </div>
    `;
}

favZone?.addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-remove-fav')) {
        const idToRemove = Number(e.target.dataset.id);
        favoriteProductIds = favoriteProductIds.filter(id => id !== idToRemove);
        localStorage.setItem(KEYS.FAV, JSON.stringify(favoriteProductIds));
        renderFavs();
    }
});

// Синхронізація між вкладками
window.addEventListener('storage', (e) => {
    if (e.key === KEYS.CART) {
        cart = JSON.parse(e.newValue || '[]');
        updateCartSummary();
        if (cartOverlay && !cartOverlay.classList.contains('hidden')) renderCartItems();
    }
    if (e.key === KEYS.FAV) {
        favoriteProductIds = JSON.parse(e.newValue || '[]');
        renderFavs();
    }
});

// ==========================================================================
// 8. Ініціалізація
// ==========================================================================
async function initShop() {
    initTheme();
    cart = JSON.parse(localStorage.getItem(KEYS.CART) || '[]');
    favoriteProductIds = JSON.parse(localStorage.getItem(KEYS.FAV) || '[]');
    
    updateCartSummary();
    renderFavs();

    if (categorySelect) {
        const cats = [...new Set(globalStoreProducts.map(p => p.category))];
        categorySelect.innerHTML = '<option value="all">Усі категорії</option>' + 
            cats.map(c => `<option value="${c}">${c}</option>`).join('');
    }

    catalogState = readStateFromURL();
    applyStateToControls();
    updateCatalog('replace');
}

document.addEventListener('DOMContentLoaded', initShop);