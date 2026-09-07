/* =========================================================
   SRI KUMAR STORES - CUSTOMER WEBSITE SCRIPT
   =========================================================
   PRODUCTS:
   PostgreSQL / Flask API
          ↓
   /api/products
          ↓
   Customer Website

   ORDERS:
   Customer Website
          ↓
   Customer Details
          ↓
   POST /api/orders
          ↓
   Flask
          ↓
   PostgreSQL / Aiven

   CONTACT:
   Got in Touch Form
          ↓
   POST /api/contact-messages
          ↓
   Flask
          ↓
   PostgreSQL / Aiven

   CART / WISHLIST:
   localStorage
   ========================================================= */


/* =========================================================
   CONFIG
   ========================================================= */

const API_BASE = "https://sri-kumar-stores-hovt-64kf3ef54-mohanam.vercel.app";

const PRODUCT_KEY = "textel_products";
const CART_KEY = "textel_cart";
const POST_KEY = "textel_posts";
const WISHLIST_KEY = "textel_wishlist";
const CONTACT_KEY = "textel_contacts";
const ORDERS_KEY = "textel_orders";


/* =========================================================
   PRODUCT CACHE
   ========================================================= */

let productsCache = [];
let productsLoaded = false;
let productsLoading = false;


/* =========================================================
   STATIC PRODUCTS
   ========================================================= */

const STATIC_PRODUCTS = [];


/* =========================================================
   BASIC HELPERS
   ========================================================= */

function safeNumber(value, fallback = 0) {

    const number = Number(value);

    return Number.isFinite(number)
        ? number
        : fallback;
}


function escapeHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function showToast(message) {

    let toast =
        document.getElementById(
            "textel-toast"
        );

    if (!toast) {

        toast =
            document.createElement("div");

        toast.id =
            "textel-toast";

        toast.style.position =
            "fixed";

        toast.style.bottom =
            "25px";

        toast.style.left =
            "50%";

        toast.style.transform =
            "translateX(-50%)";

        toast.style.background =
            "#222";

        toast.style.color =
            "#fff";

        toast.style.padding =
            "12px 20px";

        toast.style.borderRadius =
            "8px";

        toast.style.zIndex =
            "99999";

        toast.style.fontSize =
            "14px";

        toast.style.boxShadow =
            "0 5px 20px rgba(0,0,0,.25)";

        toast.style.transition =
            "opacity .3s ease";

        document.body.appendChild(toast);
    }

    toast.textContent =
        message;

    toast.style.opacity =
        "1";

    clearTimeout(
        toast._timer
    );

    toast._timer =
        setTimeout(() => {

            toast.style.opacity =
                "0";

        }, 2500);
}


/* =========================================================
   DATE HELPER
   ========================================================= */

function getDateValue(value) {

    if (!value) {
        return 0;
    }

    if (typeof value === "number") {
        return value;
    }

    const parsed =
        Date.parse(value);

    return Number.isNaN(parsed)
        ? 0
        : parsed;
}


/* =========================================================
   PRODUCT IMAGE
   ========================================================= */

function getProductImage(product) {

    if (!product) {
        return "assets/women.jpg";
    }

    return (
        product.image_url ||
        product.image ||
        product.photo ||
        product.imageUrl ||
        "assets/women.jpg"
    );
}


/* =========================================================
   NORMALIZE SIZE DATA
   ========================================================= */

function normalizeSizes(product) {

    if (!product) {
        return {};
    }


    /* Backend object format */

    if (
        product.sizes &&
        typeof product.sizes === "object" &&
        !Array.isArray(product.sizes)
    ) {

        const result = {};

        Object.entries(
            product.sizes
        ).forEach(([size, stock]) => {

            result[size] =
                safeNumber(stock);

        });

        return result;
    }


    /* Backend array format */

    if (
        Array.isArray(
            product.size_stocks
        )
    ) {

        const result = {};

        product.size_stocks.forEach(
            item => {

                if (!item) {
                    return;
                }

                if (!item.size) {
                    return;
                }

                result[item.size] =
                    safeNumber(
                        item.stock
                    );
            }
        );

        return result;
    }


    if (
        Array.isArray(
            product.sizeStocks
        )
    ) {

        const result = {};

        product.sizeStocks.forEach(
            item => {

                if (!item) {
                    return;
                }

                if (!item.size) {
                    return;
                }

                result[item.size] =
                    safeNumber(
                        item.stock
                    );
            }
        );

        return result;
    }

    return {};
}


/* =========================================================
   NORMALIZE PRODUCT
   ========================================================= */

function normalizeProduct(product) {

    if (!product) {
        return null;
    }

    const sizes =
        normalizeSizes(product);

    return {

        id:
            product.id,

        product_code:
            product.product_code ||
            product.productCode ||
            product.code ||
            "",

        code:
            product.code ||
            product.product_code ||
            product.productCode ||
            "",

        name:
            product.name ||
            product.title ||
            "Unnamed Product",

        category:
            product.category ||
            "Women",

        price:
            safeNumber(
                product.price
            ),

        description:
            product.description ||
            "",

        image_url:
            product.image_url ||
            product.image ||
            product.photo ||
            product.imageUrl ||
            "",

        image:
            product.image ||
            product.image_url ||
            product.photo ||
            product.imageUrl ||
            "",

        photo:
            product.photo ||
            product.image ||
            product.image_url ||
            product.imageUrl ||
            "",

        stock:
            safeNumber(
                product.stock
            ),

        sizes:
            sizes,

        size_stocks:
            Array.isArray(
                product.size_stocks
            )
                ? product.size_stocks
                : Object.entries(
                    sizes
                ).map(
                    ([size, stock]) => ({
                        size,
                        stock
                    })
                ),

        created_at:
            product.created_at ||
            product.createdAt ||
            "",

        createdAt:
            product.createdAt ||
            product.created_at ||
            "",

        updated_at:
            product.updated_at ||
            product.updatedAt ||
            "",

        outOfStock:
            Boolean(
                product.outOfStock
            )
    };
}


/* =========================================================
   LOCAL PRODUCT CACHE
   ========================================================= */

function getLocalProducts() {

    try {

        const raw =
            localStorage.getItem(
                PRODUCT_KEY
            );

        if (!raw) {
            return [];
        }

        const parsed =
            JSON.parse(raw);

        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed
            .map(normalizeProduct)
            .filter(Boolean);

    } catch (error) {

        console.error(
            "LOCAL PRODUCT LOAD ERROR:",
            error
        );

        return [];
    }
}


function saveLocalProducts(products) {

    try {

        localStorage.setItem(
            PRODUCT_KEY,
            JSON.stringify(products)
        );

    } catch (error) {

        console.warn(
            "LOCAL PRODUCT CACHE ERROR:",
            error
        );
    }
}


/* =========================================================
   GET PRODUCTS
   ========================================================= */

function getProducts() {

    if (productsLoaded) {
        return productsCache;
    }

    return getLocalProducts();
}


/* =========================================================
   LOAD PRODUCTS FROM FLASK
   ========================================================= */

async function loadProductsFromAPI() {

    if (productsLoading) {
        return productsCache;
    }

    productsLoading = true;

    try {

        console.log(
            "Loading products from:",
            `${API_BASE}/api/products`
        );

        const response =
            await fetch(
                `${API_BASE}/api/products`,
                {
                    method: "GET",
                    headers: {
                        "Content-Type":
                            "application/json"
                    }
                }
            );

        if (!response.ok) {

            throw new Error(
                `Server returned ${response.status}`
            );
        }

        const data =
            await response.json();

        console.log(
            "Products API response:",
            data
        );

        let apiProducts = [];

        if (Array.isArray(data)) {

            apiProducts =
                data;

        } else if (
            Array.isArray(
                data.products
            )
        ) {

            apiProducts =
                data.products;

        } else if (
            Array.isArray(
                data.data
            )
        ) {

            apiProducts =
                data.data;
        }

        productsCache =
            apiProducts
                .map(normalizeProduct)
                .filter(Boolean);

        productsLoaded =
            true;

        saveLocalProducts(
            productsCache
        );

        console.log(
            `Loaded ${productsCache.length} products from PostgreSQL.`
        );

        return productsCache;

    } catch (error) {

        console.error(
            "PRODUCT API LOAD ERROR:",
            error
        );

        const fallback =
            getLocalProducts();

        productsCache =
            fallback;

        productsLoaded =
            true;

        if (fallback.length > 0) {

            showToast(
                "Server unavailable. Showing saved products."
            );

        } else {

            showToast(
                "Unable to load products from server."
            );
        }

        return productsCache;

    } finally {

        productsLoading =
            false;
    }
}


/* =========================================================
   PRODUCT STOCK
   ========================================================= */

function getProductStock(product) {

    if (!product) {
        return 0;
    }


    /* Saree */

    if (
        String(
            product.category || ""
        )
        .toLowerCase()
        .includes("saree")
    ) {

        if (
            product.stock !== undefined &&
            product.stock !== null
        ) {

            return safeNumber(
                product.stock,
                1
            );
        }

        return 1;
    }


    const sizes =
        normalizeSizes(product);

    const values =
        Object.values(sizes)
            .map(
                value =>
                    safeNumber(value)
            )
            .filter(
                value =>
                    value >= 0
            );

    if (values.length > 0) {

        return values.reduce(
            (total, value) =>
                total + value,
            0
        );
    }

    return safeNumber(
        product.stock
    );
}


/* =========================================================
   PRODUCT AVAILABLE
   ========================================================= */

function isProductAvailable(product) {

    if (!product) {
        return false;
    }

    if (
        product.outOfStock === true
    ) {
        return false;
    }

    return (
        getProductStock(product) > 0
    );
}


/* =========================================================
   AVAILABLE SIZES
   ========================================================= */

function getAvailableSizes(product) {

    const sizes =
        normalizeSizes(product);

    return Object.entries(sizes)
        .filter(
            ([size, stock]) =>
                safeNumber(stock) > 0
        )
        .map(
            ([size]) => size
        );
}


/* =========================================================
   WISHLIST
   ========================================================= */

function getWishlist() {

    try {

        const raw =
            localStorage.getItem(
                WISHLIST_KEY
            );

        if (!raw) {
            return [];
        }

        const parsed =
            JSON.parse(raw);

        return Array.isArray(parsed)
            ? parsed
            : [];

    } catch (error) {

        console.error(
            "WISHLIST LOAD ERROR:",
            error
        );

        return [];
    }
}


function saveWishlist(wishlist) {

    localStorage.setItem(
        WISHLIST_KEY,
        JSON.stringify(wishlist)
    );
}


function isInWishlist(productId) {

    return getWishlist().some(
        id =>
            String(id) ===
            String(productId)
    );
}


function toggleWishlist(productId) {

    let wishlist =
        getWishlist();

    const index =
        wishlist.findIndex(
            id =>
                String(id) ===
                String(productId)
        );

    if (index >= 0) {

        wishlist.splice(
            index,
            1
        );

        showToast(
            "Removed from wishlist"
        );

    } else {

        wishlist.push(
            productId
        );

        showToast(
            "Added to wishlist ❤️"
        );
    }

    saveWishlist(
        wishlist
    );

    renderProducts();
}


/* =========================================================
   RENDER PRODUCTS
   ========================================================= */

function renderProducts(
    productsToRender = null
) {

    const container =
        document.getElementById(
            "product-list"
        ) ||
        document.getElementById(
            "productGrid"
        ) ||
        document.querySelector(
            ".product-grid"
        );

    if (!container) {
        return;
    }

    const products =
        productsToRender !== null
            ? productsToRender
            : getProducts();


    if (
        !productsLoaded &&
        products.length === 0
    ) {

        container.innerHTML = `
            <div class="no-products">
                <p>Loading products...</p>
            </div>
        `;

        return;
    }


    if (
        !products ||
        products.length === 0
    ) {

        container.innerHTML = `
            <div class="no-products">
                <p>No products found.</p>
            </div>
        `;

        return;
    }


    container.innerHTML =
        products.map(
            product => {

                const image =
                    getProductImage(
                        product
                    );

                const available =
                    isProductAvailable(
                        product
                    );

                const stock =
                    getProductStock(
                        product
                    );

                const sizes =
                    getAvailableSizes(
                        product
                    );

                const wishlistActive =
                    isInWishlist(
                        product.id
                    );

                const category =
                    escapeHTML(
                        product.category
                    );

                const name =
                    escapeHTML(
                        product.name
                    );

                const description =
                    escapeHTML(
                        product.description
                    );

                const imageURL =
                    escapeHTML(
                        image
                    );

                const isSaree =
                    String(
                        product.category || ""
                    )
                    .toLowerCase()
                    .includes("saree");


                /* Saree:
                   DON'T show Free Size */

                let sizeHTML = "";

                if (
                    !isSaree &&
                    sizes.length > 0
                ) {

                    sizeHTML = `
                        <div class="product-sizes">
                            <strong>Sizes:</strong>

                            ${sizes
                                .map(
                                    size =>
                                        `<span>${escapeHTML(size)}</span>`
                                )
                                .join("")}
                        </div>
                    `;
                }


                return `
                    <div
                        class="product-card"
                        data-product-id="${escapeHTML(product.id)}"
                    >

                        <div class="product-image-wrap">

                            <img
                                src="${imageURL}"
                                alt="${name}"
                                class="product-image"
                                loading="lazy"
                                onerror="this.src='assets/women.jpg'"
                            >

                            <button
                                class="wishlist-btn ${
                                    wishlistActive
                                        ? "active"
                                        : ""
                                }"
                                onclick="toggleWishlist('${escapeHTML(product.id)}')"
                                type="button"
                                aria-label="Wishlist"
                            >
                                ${
                                    wishlistActive
                                        ? "❤️"
                                        : "♡"
                                }
                            </button>

                            ${
                                !available
                                    ? `
                                        <div class="out-of-stock">
                                            OUT OF STOCK
                                        </div>
                                    `
                                    : ""
                            }

                        </div>


                        <div class="product-info">

                            <div class="product-category">
                                ${category}
                            </div>

                            <h3 class="product-name">
                                ${name}
                            </h3>

                            ${
                                description
                                    ? `
                                        <p class="product-description">
                                            ${description}
                                        </p>
                                    `
                                    : ""
                            }

                            <div class="product-price">
                                ₹${safeNumber(
                                    product.price
                                ).toFixed(2)}
                            </div>

                            ${
                                available
                                    ? `
                                        <div class="product-stock">
                                            Stock: ${stock}
                                        </div>
                                    `
                                    : ""
                            }

                            ${sizeHTML}

                            <button
                                class="add-to-cart-btn"
                                type="button"
                                onclick="addToCart('${escapeHTML(product.id)}')"
                                ${
                                    !available
                                        ? "disabled"
                                        : ""
                                }
                            >
                                ${
                                    available
                                        ? "Add to Cart"
                                        : "Out of Stock"
                                }
                            </button>

                        </div>

                    </div>
                `;
            }
        ).join("");
}


/* =========================================================
   FILTER PRODUCTS
   ========================================================= */

function getFilteredProductsWithoutRender() {

    let filtered =
        [...getProducts()];

    const searchInput =
        document.getElementById(
            "productSearch"
        );

    const categoryFilter =
        document.getElementById(
            "categoryFilter"
        );

    const sortFilter =
        document.getElementById(
            "sortFilter"
        );

    const priceRangeFilter =
        document.getElementById(
            "priceRangeFilter"
        );


    const search =
        searchInput
            ? searchInput.value
                .trim()
                .toLowerCase()
            : "";

    const category =
        categoryFilter
            ? categoryFilter.value
            : "";

    const sort =
        sortFilter
            ? sortFilter.value
            : "";

    const priceRange =
        priceRangeFilter
            ? priceRangeFilter.value
            : "";


    /* SEARCH */

    if (search) {

        filtered =
            filtered.filter(
                product => {

                    const text = `
                        ${product.name}
                        ${product.category}
                        ${product.description}
                        ${product.code}
                    `.toLowerCase();

                    return text.includes(
                        search
                    );
                }
            );
    }


    /* CATEGORY */

    if (
        category &&
        category !== "all"
    ) {

        filtered =
            filtered.filter(
                product =>
                    String(
                        product.category
                    ).toLowerCase() ===
                    String(
                        category
                    ).toLowerCase()
            );
    }


    /* PRICE */

    if (priceRange) {

        filtered =
            filtered.filter(
                product => {

                    const price =
                        safeNumber(
                            product.price
                        );

                    if (
                        priceRange.includes("+")
                    ) {

                        const min =
                            safeNumber(
                                priceRange.replace(
                                    "+",
                                    ""
                                )
                            );

                        return price >= min;
                    }

                    const parts =
                        priceRange.split("-");

                    if (
                        parts.length === 2
                    ) {

                        const min =
                            safeNumber(
                                parts[0]
                            );

                        const max =
                            safeNumber(
                                parts[1]
                            );

                        return (
                            price >= min &&
                            price <= max
                        );
                    }

                    return true;
                }
            );
    }


    /* SORT */

    if (
        sort === "low-high"
    ) {

        filtered.sort(
            (a, b) =>
                safeNumber(a.price) -
                safeNumber(b.price)
        );

    } else if (
        sort === "high-low"
    ) {

        filtered.sort(
            (a, b) =>
                safeNumber(b.price) -
                safeNumber(a.price)
        );

    } else if (
        sort === "newest"
    ) {

        filtered.sort(
            (a, b) =>
                getDateValue(
                    b.created_at
                ) -
                getDateValue(
                    a.created_at
                )
        );

    } else if (
        sort === "oldest"
    ) {

        filtered.sort(
            (a, b) =>
                getDateValue(
                    a.created_at
                ) -
                getDateValue(
                    b.created_at
                )
        );
    }

    return filtered;
}


function filterProducts() {

    renderProducts(
        getFilteredProductsWithoutRender()
    );
}


/* =========================================================
   SEARCH
   ========================================================= */

function setupSearch() {

    const search =
        document.getElementById(
            "productSearch"
        );

    if (!search) {
        return;
    }

    if (
        search.dataset.connected ===
        "true"
    ) {
        return;
    }

    search.dataset.connected =
        "true";

    search.addEventListener(
        "input",
        filterProducts
    );
}


/* =========================================================
   FILTERS
   ========================================================= */

function setupFilters() {

    [
        "categoryFilter",
        "sortFilter",
        "priceRangeFilter"
    ].forEach(id => {

        const element =
            document.getElementById(
                id
            );

        if (!element) {
            return;
        }

        if (
            element.dataset.connected ===
            "true"
        ) {
            return;
        }

        element.dataset.connected =
            "true";

        element.addEventListener(
            "change",
            filterProducts
        );
    });
}


/* =========================================================
   CATEGORY NAVIGATION
   ========================================================= */

function setupCategoryNavigation() {

    const buttons =
        document.querySelectorAll(
            "[data-category]"
        );

    buttons.forEach(
        button => {

            if (
                button.dataset.categoryConnected ===
                "true"
            ) {
                return;
            }

            button.dataset.categoryConnected =
                "true";

            button.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    const category =
                        button.getAttribute(
                            "data-category"
                        );

                    const filter =
                        document.getElementById(
                            "categoryFilter"
                        );

                    if (
                        filter &&
                        category
                    ) {

                        filter.value =
                            category;

                        filterProducts();
                    }

                    const section =
                        document.getElementById(
                            "product-list"
                        ) ||
                        document.getElementById(
                            "productGrid"
                        );

                    if (section) {

                        section.scrollIntoView({
                            behavior:
                                "smooth",
                            block:
                                "start"
                        });
                    }
                }
            );
        }
    );
}


/* =========================================================
   CART
   ========================================================= */

function getCart() {

    try {

        const raw =
            localStorage.getItem(
                CART_KEY
            );

        if (!raw) {
            return [];
        }

        const parsed =
            JSON.parse(raw);

        return Array.isArray(parsed)
            ? parsed
            : [];

    } catch (error) {

        console.error(
            "CART LOAD ERROR:",
            error
        );

        return [];
    }
}


function saveCart(cart) {

    try {

        localStorage.setItem(
            CART_KEY,
            JSON.stringify(cart)
        );

    } catch (error) {

        console.error(
            "CART SAVE ERROR:",
            error
        );
    }

    updateCartCount();

    renderCart();
}


/* =========================================================
   ADD TO CART
   ========================================================= */

function addToCart(productId) {

    const product =
        getProducts().find(
            p =>
                String(p.id) ===
                String(productId)
        );

    if (!product) {

        showToast(
            "Product not found"
        );

        return;
    }


    if (
        !isProductAvailable(
            product
        )
    ) {

        showToast(
            "Product is out of stock"
        );

        return;
    }


    let selectedSize = "";

    const availableSizes =
        getAvailableSizes(
            product
        );


    /* Saree = Free Size internally,
       but not displayed on product card */

    if (
        String(
            product.category
        )
        .toLowerCase()
        .includes("saree")
    ) {

        selectedSize =
            "Free Size";

    } else if (
        availableSizes.length > 0
    ) {

        selectedSize =
            availableSizes[0];

    } else {

        selectedSize =
            "Free Size";
    }


    let cart =
        getCart();


    const existingIndex =
        cart.findIndex(
            item =>
                String(
                    item.productId
                ) ===
                String(
                    product.id
                ) &&
                String(
                    item.size || ""
                ) ===
                String(
                    selectedSize || ""
                )
        );


    if (existingIndex >= 0) {

        const currentQuantity =
            safeNumber(
                cart[existingIndex]
                    .quantity,
                1
            );

        const availableStock =
            getProductStock(
                product
            );

        if (
            currentQuantity >=
            availableStock
        ) {

            showToast(
                "Maximum available stock reached"
            );

            return;
        }

        cart[
            existingIndex
        ].quantity =
            currentQuantity + 1;

    } else {

        cart.push({

            productId:
                product.id,

            id:
                product.id,

            name:
                product.name,

            category:
                product.category,

            price:
                safeNumber(
                    product.price
                ),

            image:
                getProductImage(
                    product
                ),

            size:
                selectedSize,

            quantity:
                1
        });
    }


    saveCart(
        cart
    );

    showToast(
        `${product.name} added to cart`
    );
}


/* =========================================================
   REMOVE CART ITEM
   ========================================================= */

function removeFromCart(index) {

    const cart =
        getCart();

    if (
        index < 0 ||
        index >= cart.length
    ) {
        return;
    }

    cart.splice(
        index,
        1
    );

    saveCart(
        cart
    );
}


/* =========================================================
   CHANGE CART QUANTITY
   ========================================================= */

function changeCartQuantity(
    index,
    change
) {

    const cart =
        getCart();

    if (!cart[index]) {
        return;
    }


    const product =
        getProducts().find(
            p =>
                String(p.id) ===
                String(
                    cart[index]
                        .productId ||
                    cart[index].id
                )
        );


    let quantity =
        safeNumber(
            cart[index].quantity,
            1
        ) + change;


    if (
        quantity <= 0
    ) {

        cart.splice(
            index,
            1
        );

        saveCart(
            cart
        );

        return;
    }


    if (product) {

        const maxStock =
            getProductStock(
                product
            );

        if (
            quantity > maxStock
        ) {

            quantity =
                maxStock;

            showToast(
                "Maximum available stock reached"
            );
        }
    }


    cart[index].quantity =
        quantity;

    saveCart(
        cart
    );
}


/* =========================================================
   CART TOTAL
   ========================================================= */

function getCartTotal() {

    return getCart().reduce(
        (total, item) => {

            return (
                total +
                safeNumber(
                    item.price
                ) *
                safeNumber(
                    item.quantity,
                    1
                )
            );

        },
        0
    );
}


/* =========================================================
   RENDER CART
   ========================================================= */

function renderCart() {

    const container =
        document.getElementById(
            "cartItems"
        );

    const totalElement =
        document.getElementById(
            "cartTotal"
        );

    if (!container) {
        return;
    }


    const cart =
        getCart();


    if (
        cart.length === 0
    ) {

        container.innerHTML = `
            <div class="empty-cart">
                <p>Your cart is empty.</p>
            </div>
        `;

        if (totalElement) {
            totalElement.textContent =
                "₹0.00";
        }

        return;
    }


    container.innerHTML =
        cart.map(
            (item, index) => {

                const image =
                    item.image ||
                    item.photo ||
                    "assets/women.jpg";

                const quantity =
                    safeNumber(
                        item.quantity,
                        1
                    );

                const price =
                    safeNumber(
                        item.price
                    );

                const subtotal =
                    price *
                    quantity;


                return `
                    <div class="cart-item">

                        <img
                            src="${escapeHTML(image)}"
                            alt="${escapeHTML(item.name)}"
                            onerror="this.src='assets/women.jpg'"
                        >

                        <div class="cart-item-info">

                            <h4>
                                ${escapeHTML(item.name)}
                            </h4>

                            ${
                                item.size
                                    ? `
                                        <div>
                                            Size:
                                            ${escapeHTML(item.size)}
                                        </div>
                                    `
                                    : ""
                            }

                            <div>
                                ₹${price.toFixed(2)}
                            </div>

                            <div class="cart-quantity">

                                <button
                                    type="button"
                                    onclick="changeCartQuantity(${index}, -1)"
                                >
                                    −
                                </button>

                                <span>
                                    ${quantity}
                                </span>

                                <button
                                    type="button"
                                    onclick="changeCartQuantity(${index}, 1)"
                                >
                                    +
                                </button>

                            </div>

                            <div>
                                Subtotal:
                                ₹${subtotal.toFixed(2)}
                            </div>

                            <button
                                type="button"
                                onclick="removeFromCart(${index})"
                                class="remove-cart-item"
                            >
                                Remove
                            </button>

                        </div>

                    </div>
                `;
            }
        ).join("");


    if (totalElement) {

        totalElement.textContent =
            `₹${getCartTotal().toFixed(2)}`;
    }
}


/* =========================================================
   CART COUNT
   ========================================================= */

function updateCartCount() {

    const count =
        getCart().reduce(
            (total, item) =>
                total +
                safeNumber(
                    item.quantity,
                    1
                ),
            0
        );

    const cartCount =
        document.getElementById(
            "cartCount"
        );

    if (cartCount) {

        cartCount.textContent =
            count;
    }
}


/* =========================================================
   CART BUTTON
   ========================================================= */

function setupCartButton() {

    const cartButton =
        document.getElementById(
            "cartBtn"
        ) ||
        document.getElementById(
            "cartButton"
        ) ||
        document.querySelector(
            "[data-cart]"
        );

    const cartPanel =
        document.getElementById(
            "cartPanel"
        );

    if (
        !cartButton ||
        !cartPanel
    ) {
        return;
    }


    if (
        cartButton.dataset.connected ===
        "true"
    ) {
        return;
    }

    cartButton.dataset.connected =
        "true";


    cartButton.addEventListener(
        "click",
        event => {

            event.preventDefault();

            cartPanel.classList.toggle(
                "active"
            );

            renderCart();
        }
    );


    const closeButton =
        document.getElementById(
            "closeCart"
        );

    if (closeButton) {

        closeButton.addEventListener(
            "click",
            () => {

                cartPanel.classList.remove(
                    "active"
                );
            }
        );
    }


    const closeButtons =
        cartPanel.querySelectorAll(
            ".close-cart, [data-close-cart]"
        );

    closeButtons.forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    cartPanel.classList.remove(
                        "active"
                    );
                }
            );
        }
    );
}


/* =========================================================
   CONTACT FORM
   ========================================================= */

function setupContactForm() {

    const form =
        document.querySelector(
            "#contactForm"
        );

    if (!form) {
        return;
    }


    if (
        form.dataset.contactConnected === "true"
    ) {
        return;
    }

    form.dataset.contactConnected =
        "true";


    form.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            const formData =
                new FormData(form);


            const name =
                String(
                    formData.get("name") ||
                    document.getElementById(
                        "contactName"
                    )?.value ||
                    ""
                ).trim();


            const email =
                String(
                    formData.get("email") ||
                    document.getElementById(
                        "contactEmail"
                    )?.value ||
                    ""
                ).trim();


            const phone =
                String(
                    formData.get("phone") ||
                    document.getElementById(
                        "contactPhone"
                    )?.value ||
                    ""
                ).trim();


            const message =
                String(
                    formData.get("message") ||
                    document.getElementById(
                        "contactMessage"
                    )?.value ||
                    ""
                ).trim();


            if (!name) {

                showToast(
                    "Please enter your name."
                );

                return;
            }


            if (!message) {

                showToast(
                    "Please enter your message."
                );

                return;
            }


            const contactPayload = {

                name:
                    name,

                email:
                    email,

                phone:
                    phone,

                message:
                    message
            };


            const submitButton =
                form.querySelector(
                    'button[type="submit"], input[type="submit"]'
                );


            const originalText =
                submitButton
                    ? submitButton.textContent
                    : "";


            if (submitButton) {

                submitButton.disabled =
                    true;

                submitButton.textContent =
                    "Sending...";
            }


            try {

                console.log(
                    "Sending contact message:",
                    contactPayload
                );


                const response =
                    await fetch(
                        `${API_BASE}/api/contact-messages`,
                        {
                            method:
                                "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify(
                                    contactPayload
                                )
                        }
                    );


                let data = {};

                try {

                    data =
                        await response.json();

                } catch (jsonError) {

                    console.warn(
                        "Contact response was not JSON:",
                        jsonError
                    );
                }


                console.log(
                    "CONTACT API RESPONSE:",
                    data
                );


                if (
                    !response.ok ||
                    data.success !== true
                ) {

                    throw new Error(
                        data.message ||
                        `Message save failed (${response.status})`
                    );
                }


                console.log(
                    "CONTACT MESSAGE SAVED TO DATABASE:",
                    data
                );


                /* LOCAL BACKUP */

                try {

                    let contacts = [];

                    try {

                        contacts =
                            JSON.parse(
                                localStorage.getItem(
                                    CONTACT_KEY
                                )
                            ) || [];

                    } catch {

                        contacts = [];
                    }


                    contacts.push({

                        id:
                            data.message?.id ||
                            Date.now(),

                        name:
                            name,

                        email:
                            email,

                        phone:
                            phone,

                        message:
                            message,

                        createdAt:
                            new Date()
                                .toISOString()
                    });


                    localStorage.setItem(
                        CONTACT_KEY,
                        JSON.stringify(
                            contacts
                        )
                    );

                } catch (localError) {

                    console.warn(
                        "Contact local cache error:",
                        localError
                    );
                }


                form.reset();


                showToast(
                    "Message sent successfully!"
                );


            } catch (error) {

                console.error(
                    "CONTACT MESSAGE SAVE ERROR:",
                    error
                );


                showToast(
                    "Message could not be sent. Please try again."
                );


            } finally {

                if (submitButton) {

                    submitButton.disabled =
                        false;

                    submitButton.textContent =
                        originalText;
                }
            }
        }
    );
}


/* =========================================================
   CHECKOUT CUSTOMER MODAL
   =========================================================
   
   FLOW:

   Cart
      ↓
   Checkout
      ↓
   Customer Details
      ↓
   Name + Phone
      ↓
   Submit Order
      ↓
   POST /api/orders
      ↓
   PostgreSQL
      ↓
   Thank You Popup
   ========================================================= */


/* =========================================================
   OPEN CUSTOMER MODAL
   ========================================================= */

function openCheckoutCustomerModal() {

    const modal =
        document.getElementById(
            "checkoutCustomerModal"
        );

    const form =
        document.getElementById(
            "checkoutCustomerForm"
        );

    const nameInput =
        document.getElementById(
            "checkoutCustomerName"
        );

    const status =
        document.getElementById(
            "checkoutCustomerStatus"
        );


    if (!modal) {

        showToast(
            "Checkout form is not available."
        );

        return;
    }


    if (form) {

        form.dataset.submitting =
            "false";
    }


    if (status) {

        status.textContent =
            "";

        status.className =
            "checkout-customer-status";
    }


    modal.classList.add(
        "active"
    );

    modal.setAttribute(
        "aria-hidden",
        "false"
    );


    setTimeout(
        () => {

            if (nameInput) {

                nameInput.focus();
            }

        },
        100
    );
}


/* =========================================================
   CLOSE CUSTOMER MODAL
   ========================================================= */

function closeCheckoutCustomerModal() {

    const modal =
        document.getElementById(
            "checkoutCustomerModal"
        );

    const form =
        document.getElementById(
            "checkoutCustomerForm"
        );

    if (!modal) {
        return;
    }


    if (
        form &&
        form.dataset.submitting ===
        "true"
    ) {

        return;
    }


    modal.classList.remove(
        "active"
    );

    modal.setAttribute(
        "aria-hidden",
        "true"
    );


    if (form) {

        form.reset();

        form.dataset.submitting =
            "false";
    }


    const status =
        document.getElementById(
            "checkoutCustomerStatus"
        );

    if (status) {

        status.textContent =
            "";
    }
}


/* =========================================================
   CUSTOMER MODAL STATUS
   ========================================================= */

function showCheckoutCustomerStatus(
    message,
    isError = false
) {

    const status =
        document.getElementById(
            "checkoutCustomerStatus"
        );

    if (!status) {
        return;
    }


    status.textContent =
        message;


    status.className =
        isError
            ? "checkout-customer-status error"
            : "checkout-customer-status";
}


/* =========================================================
   SUBMIT CUSTOMER ORDER
   ========================================================= */

async function submitCustomerOrder(event) {

    event.preventDefault();


    const form =
        event.currentTarget;


    if (
        form.dataset.submitting ===
        "true"
    ) {

        return;
    }


    const cart =
        getCart();


    /* ---------------------------------------------
       CART CHECK
       --------------------------------------------- */

    if (
        cart.length === 0
    ) {

        showCheckoutCustomerStatus(
            "Your cart is empty.",
            true
        );

        return;
    }


    /* ---------------------------------------------
       INPUTS
       --------------------------------------------- */

    const nameInput =
        document.getElementById(
            "checkoutCustomerName"
        );

    const phoneInput =
        document.getElementById(
            "checkoutCustomerPhone"
        );


    const submitButton =
        document.getElementById(
            "checkoutCustomerSubmit"
        );


    const name =
        nameInput
            ? nameInput.value.trim()
            : "";


    const phone =
        phoneInput
            ? phoneInput.value.trim()
            : "";


    /* ---------------------------------------------
       NAME VALIDATION
       --------------------------------------------- */

    if (!name) {

        showCheckoutCustomerStatus(
            "Please enter your name.",
            true
        );

        if (nameInput) {

            nameInput.focus();
        }

        return;
    }


    if (
        name.length < 2
    ) {

        showCheckoutCustomerStatus(
            "Please enter a valid name.",
            true
        );

        if (nameInput) {

            nameInput.focus();
        }

        return;
    }


    /* ---------------------------------------------
       PHONE VALIDATION
       --------------------------------------------- */

    const phoneDigits =
        phone.replace(
            /\D/g,
            ""
        );


    if (
        phoneDigits.length < 10 ||
        phoneDigits.length > 15
    ) {

        showCheckoutCustomerStatus(
            "Please enter a valid phone number.",
            true
        );

        if (phoneInput) {

            phoneInput.focus();
        }

        return;
    }


    /* ---------------------------------------------
       SUBMITTING
       --------------------------------------------- */

    form.dataset.submitting =
        "true";


    if (submitButton) {

        submitButton.disabled =
            true;

        submitButton.textContent =
            "Submitting...";
    }


    showCheckoutCustomerStatus(
        "Placing your order...",
        false
    );


    try {

        /* -----------------------------------------
           TOTAL
           ----------------------------------------- */

        const total =
            cart.reduce(
                (
                    sum,
                    item
                ) => {

                    return (
                        sum +
                        safeNumber(
                            item.price
                        ) *
                        safeNumber(
                            item.quantity,
                            1
                        )
                    );

                },
                0
            );


        /* -----------------------------------------
           ORDER ID
           ----------------------------------------- */

        const orderId =
            `ORD-${Date.now()}`;


        /* -----------------------------------------
           ORDER PAYLOAD
           ----------------------------------------- */

        const orderPayload = {

            order_id:
                orderId,

            customer_name:
                name,

            customer_phone:
                phone,

            customer_email:
                "",

            items:
                cart,

            total:
                total,

            status:
                "Pending"
        };


        console.log(
            "CUSTOMER ORDER PAYLOAD:",
            orderPayload
        );


        /* -----------------------------------------
           SEND TO FLASK
           ----------------------------------------- */

        const response =
            await fetch(
                `${API_BASE}/api/orders`,
                {
                    method:
                        "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(
                            orderPayload
                        )
                }
            );


        /* -----------------------------------------
           READ RESPONSE
           ----------------------------------------- */

        let data = {};

        try {

            data =
                await response.json();

        } catch (jsonError) {

            console.warn(
                "Order response was not JSON:",
                jsonError
            );
        }


        console.log(
            "ORDER API RESPONSE:",
            data
        );


        /* -----------------------------------------
           CHECK SUCCESS
           ----------------------------------------- */

        if (
            !response.ok ||
            data.success !== true
        ) {

            throw new Error(
                data.message ||
                data.error ||
                `Order save failed (${response.status})`
            );
        }


        console.log(
            "ORDER SAVED TO POSTGRESQL:",
            data
        );


        /* -----------------------------------------
           LOCAL ORDER BACKUP
           ----------------------------------------- */

        try {

            let localOrders = [];


            try {

                localOrders =
                    JSON.parse(
                        localStorage.getItem(
                            ORDERS_KEY
                        )
                    ) || [];

            } catch {

                localOrders =
                    [];
            }


            localOrders.unshift({

                id:
                    orderId,

                order_id:
                    orderId,

                customer_name:
                    name,

                customer_phone:
                    phone,

                customer_email:
                    "",

                items:
                    cart,

                total:
                    total,

                status:
                    "Pending",

                createdAt:
                    new Date()
                        .toISOString()
            });


            localStorage.setItem(
                ORDERS_KEY,
                JSON.stringify(
                    localOrders
                )
            );


        } catch (localError) {

            console.warn(
                "Local order backup error:",
                localError
            );
        }


        /* -----------------------------------------
           CLEAR CART
           ----------------------------------------- */

        localStorage.removeItem(
            CART_KEY
        );


        updateCartCount();

        renderCart();


        /* -----------------------------------------
           CLOSE CUSTOMER MODAL
           ----------------------------------------- */

        form.dataset.submitting =
            "false";


        closeCheckoutCustomerModal();


        /* -----------------------------------------
           SHOW THANK YOU POPUP
           ----------------------------------------- */

        showCheckoutSuccess(
            orderId
        );


    } catch (error) {

        console.error(
            "ORDER SAVE ERROR:",
            error
        );


        /*
         * IMPORTANT:
         * Cart is NOT cleared if order fails.
         */

        showCheckoutCustomerStatus(
            error.message ||
            "Order could not be saved. Please try again.",
            true
        );


        form.dataset.submitting =
            "false";


    } finally {

        if (submitButton) {

            submitButton.disabled =
                false;

            submitButton.textContent =
                "Submit Order";
        }
    }
}


/* =========================================================
   SETUP CUSTOMER MODAL
   ========================================================= */

function setupCheckoutCustomerModal() {

    const modal =
        document.getElementById(
            "checkoutCustomerModal"
        );

    const form =
        document.getElementById(
            "checkoutCustomerForm"
        );

    const closeButton =
        document.getElementById(
            "checkoutCustomerClose"
        );


    if (
        !modal ||
        !form
    ) {

        console.warn(
            "Checkout customer modal not found in HTML."
        );

        return;
    }


    if (
        form.dataset.checkoutConnected ===
        "true"
    ) {

        return;
    }


    form.dataset.checkoutConnected =
        "true";


    form.dataset.submitting =
        "false";


    /* ---------------------------------------------
       FORM SUBMIT
       --------------------------------------------- */

    form.addEventListener(
        "submit",
        submitCustomerOrder
    );


    /* ---------------------------------------------
       X BUTTON
       --------------------------------------------- */

    if (closeButton) {

        closeButton.addEventListener(
            "click",
            () => {

                closeCheckoutCustomerModal();
            }
        );
    }


    /* ---------------------------------------------
       BACKGROUND CLICK
       --------------------------------------------- */

    modal.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                modal
            ) {

                closeCheckoutCustomerModal();
            }
        }
    );


    /* ---------------------------------------------
       ESCAPE
       --------------------------------------------- */

    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key !==
                "Escape"
            ) {

                return;
            }


            if (
                modal.classList.contains(
                    "active"
                )
            ) {

                closeCheckoutCustomerModal();
            }
        }
    );
}


/* =========================================================
   CHECKOUT
   ========================================================= */

function setupCheckout() {

    const checkoutButton =
        document.getElementById(
            "checkoutBtn"
        ) ||
        document.querySelector(
            "[data-checkout]"
        );


    if (!checkoutButton) {

        console.warn(
            "Checkout button not found."
        );

        return;
    }


    if (
        checkoutButton.dataset.checkoutConnected ===
        "true"
    ) {

        return;
    }


    checkoutButton.dataset.checkoutConnected =
        "true";


    checkoutButton.addEventListener(
        "click",
        event => {

            event.preventDefault();


            /* -----------------------------------------
               CHECK CART
               ----------------------------------------- */

            const cart =
                getCart();


            if (
                cart.length === 0
            ) {

                showToast(
                    "Your cart is empty."
                );

                return;
            }


            /* -----------------------------------------
               OPEN CUSTOMER FORM
               ----------------------------------------- */

            openCheckoutCustomerModal();
        }
    );
}


/* =========================================================
   CHECKOUT SUCCESS POPUP
   ========================================================= */

function showCheckoutSuccess(
    orderId
) {

    const popup =
        document.getElementById(
            "checkoutSuccess"
        );

    const popupOrderId =
        document.getElementById(
            "checkoutOrderId"
        );


    if (popupOrderId) {

        popupOrderId.textContent =
            orderId;
    }


    if (!popup) {

        showToast(
            "Order placed successfully!"
        );

        return;
    }


    popup.classList.add(
        "active"
    );

    popup.setAttribute(
        "aria-hidden",
        "false"
    );
}


/* =========================================================
   CHECKOUT SUCCESS POPUP SETUP
   ========================================================= */

function setupCheckoutPopup() {

    const popup =
        document.getElementById(
            "checkoutSuccess"
        );

    if (!popup) {
        return;
    }


    if (
        popup.dataset.checkoutPopupConnected ===
        "true"
    ) {

        return;
    }


    popup.dataset.checkoutPopupConnected =
        "true";


    function closePopup() {

        popup.classList.remove(
            "active"
        );

        popup.setAttribute(
            "aria-hidden",
            "true"
        );
    }


    /* ---------------------------------------------
       NEW CLOSE BUTTON
       --------------------------------------------- */

    const closeButton =
        document.getElementById(
            "checkoutSuccessClose"
        );


    if (closeButton) {

        closeButton.addEventListener(
            "click",
            closePopup
        );
    }


    /* ---------------------------------------------
       OLD CLOSE BUTTON SUPPORT
       --------------------------------------------- */

    const oldCloseButton =
        document.getElementById(
            "closeCheckoutSuccess"
        );


    if (
        oldCloseButton &&
        oldCloseButton !== closeButton
    ) {

        oldCloseButton.addEventListener(
            "click",
            closePopup
        );
    }


    /* ---------------------------------------------
       THANK YOU BUTTON
       --------------------------------------------- */

    const okButton =
        document.getElementById(
            "checkoutSuccessOk"
        );


    if (okButton) {

        okButton.addEventListener(
            "click",
            closePopup
        );
    }


    /* ---------------------------------------------
       OTHER CLOSE BUTTONS
       --------------------------------------------- */

    popup.querySelectorAll(
        ".close-popup, [data-close-popup], .popup-close"
    ).forEach(
        button => {

            button.addEventListener(
                "click",
                closePopup
            );
        }
    );


    /* ---------------------------------------------
       BACKGROUND
       --------------------------------------------- */

    popup.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                popup
            ) {

                closePopup();
            }
        }
    );


    /* ---------------------------------------------
       ESC
       --------------------------------------------- */

    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key ===
                "Escape" &&
                popup.classList.contains(
                    "active"
                )
            ) {

                closePopup();
            }
        }
    );
}


/* =========================================================
   CLEAN CART
   ========================================================= */

function cleanCart() {

    const cart =
        getCart();

    const products =
        getProducts();


    if (
        cart.length === 0 ||
        products.length === 0
    ) {
        return;
    }


    const validCart =
        cart.filter(
            item => {

                const product =
                    products.find(
                        p =>
                            String(p.id) ===
                            String(
                                item.productId ||
                                item.id
                            )
                    );

                return Boolean(
                    product
                );
            }
        );


    if (
        validCart.length !==
        cart.length
    ) {

        saveCart(
            validCart
        );
    }
}


/* =========================================================
   STORE AD
   ========================================================= */

async function setupStoreAd() {

    const video =
        document.getElementById(
            "storeVideo"
        ) ||
        document.querySelector(
            "[data-store-video]"
        );

    if (!video) {
        return;
    }


    try {

        const savedVideo =
            localStorage.getItem(
                "textel_store_video"
            );

        if (savedVideo) {

            video.src =
                savedVideo;
        }

    } catch (error) {

        console.warn(
            "Store video load error:",
            error
        );
    }
}


/* =========================================================
   STORAGE EVENT
   ========================================================= */

window.addEventListener(
    "storage",
    event => {

        /* CART */

        if (
            event.key ===
            CART_KEY
        ) {

            updateCartCount();

            renderCart();
        }


        /* WISHLIST */

        if (
            event.key ===
            WISHLIST_KEY
        ) {

            renderProducts();
        }


        /* PRODUCTS */

        if (
            event.key ===
            PRODUCT_KEY
        ) {

            productsLoaded =
                false;

            productsCache =
                [];

            loadProductsFromAPI()
                .then(() => {

                    filterProducts();

                });
        }
    }
);


/* =========================================================
   CLICK OUTSIDE CART
   ========================================================= */

document.addEventListener(
    "click",
    event => {

        const cartPanel =
            document.getElementById(
                "cartPanel"
            );

        if (!cartPanel) {
            return;
        }

        if (
            !cartPanel.classList.contains(
                "active"
            )
        ) {
            return;
        }


        const clickedInside =
            cartPanel.contains(
                event.target
            );


        const cartButton =
            event.target.closest(
                "#cartBtn, #cartButton, [data-cart]"
            );


        if (
            !clickedInside &&
            !cartButton
        ) {

            cartPanel.classList.remove(
                "active"
            );
        }
    }
);


/* =========================================================
   INITIALIZE WEBSITE
   ========================================================= */

async function initializeTextel() {

    console.log(
        "Sri Kumar Stores website initializing..."
    );


    /* ---------------------------------------------
       LOADING MESSAGE
       --------------------------------------------- */

    const productContainer =
        document.getElementById(
            "product-list"
        ) ||
        document.getElementById(
            "productGrid"
        ) ||
        document.querySelector(
            ".product-grid"
        );


    if (productContainer) {

        productContainer.innerHTML = `
            <div class="no-products">
                <p>Loading products...</p>
            </div>
        `;
    }


    /* ---------------------------------------------
       EXISTING UI
       --------------------------------------------- */

    setupSearch();

    setupFilters();

    setupCategoryNavigation();

    setupCartButton();

    setupContactForm();

    setupCheckout();

    setupCheckoutCustomerModal();

    setupCheckoutPopup();

    setupStoreAd();


    /* ---------------------------------------------
       LOAD POSTGRESQL PRODUCTS
       --------------------------------------------- */

    await loadProductsFromAPI();


    /* ---------------------------------------------
       RENDER
       --------------------------------------------- */

    filterProducts();


    /* ---------------------------------------------
       CART
       --------------------------------------------- */

    cleanCart();

    renderCart();

    updateCartCount();


    console.log(
        "Sri Kumar Stores website initialized."
    );
}


/* =========================================================
   START
   ========================================================= */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeTextel
    );

} else {

    initializeTextel();
}


/* =========================================================
   GLOBAL FUNCTIONS
   ========================================================= */

window.getProducts =
    getProducts;

window.loadProductsFromAPI =
    loadProductsFromAPI;

window.renderProducts =
    renderProducts;

window.filterProducts =
    filterProducts;

window.addToCart =
    addToCart;

window.removeFromCart =
    removeFromCart;

window.changeCartQuantity =
    changeCartQuantity;

window.toggleWishlist =
    toggleWishlist;

window.getCart =
    getCart;

window.saveCart =
    saveCart;

window.renderCart =
    renderCart;

window.updateCartCount =
    updateCartCount;

window.getCartTotal =
    getCartTotal;

window.getProductStock =
    getProductStock;

window.getAvailableSizes =
    getAvailableSizes;

window.isProductAvailable =
    isProductAvailable;

window.openCheckoutCustomerModal =
    openCheckoutCustomerModal;

window.closeCheckoutCustomerModal =
    closeCheckoutCustomerModal;

window.showCheckoutSuccess =
    showCheckoutSuccess;
