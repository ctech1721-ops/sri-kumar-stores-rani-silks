document.addEventListener("DOMContentLoaded", () => {

    // =========================================================
    // CONFIG
    // =========================================================

    const API_BASE = "https://sri-kumar-stores-hovt-64kf3ef54-mohanam.vercel.app";

    const PRODUCTS_API =
        `${API_BASE}/api/products`;

    const ADMIN_PRODUCTS_API =
        `${API_BASE}/api/admin/products`;

    const ORDERS_API =
        `${API_BASE}/api/orders`;

    // NEW: CONTACT MESSAGES API
    const CONTACT_MESSAGES_API =
        `${API_BASE}/api/contact-messages`;


    // =========================================================
    // CLOUDINARY
    // =========================================================

    const CLOUDINARY_CLOUD_NAME =
        "pkcwlvir";

    const CLOUDINARY_UPLOAD_PRESET =
        "sri_kumar_products";

    const CLOUDINARY_UPLOAD_URL =
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;


    // =========================================================
    // STORAGE
    // =========================================================

    const PRODUCTS_KEY =
        "textel_products";

    const AUTH_KEY =
        "textel_owner_logged_in";


    // =========================================================
    // STATE
    // =========================================================

    let productsCache = [];

    let currentImage = "";

    let editingProductId = null;

    let isUploadingImage = false;

    let isSavingProduct = false;


    // =========================================================
    // ELEMENTS
    // =========================================================

    const loginPage =
        document.getElementById("loginPage");

    const dashboardPage =
        document.getElementById("dashboardPage");

    const loginForm =
        document.getElementById("loginForm");

    const ownerUsername =
        document.getElementById("ownerUsername");

    const ownerPassword =
        document.getElementById("ownerPassword");

    const loginError =
        document.getElementById("loginError");

    const logoutBtn =
        document.getElementById("logoutBtn");


    // =========================================================
    // PRODUCT ELEMENTS
    // =========================================================

    const productForm =
        document.getElementById("productForm");

    const productName =
        document.getElementById("productName");

    const productCategory =
        document.getElementById("productCategory");

    const productPrice =
        document.getElementById("productPrice");

    const productCode =
        document.getElementById("productCode");

    const productDescription =
        document.getElementById("productDescription");

    const productImage =
        document.getElementById("productImage");

    const imagePreview =
        document.getElementById("imagePreview");

    const uploadPlaceholder =
        document.getElementById("uploadPlaceholder");

    const chooseImageBtn =
        document.getElementById("chooseImageBtn");

    const resetProductBtn =
        document.getElementById("resetProductBtn");

    const productMessage =
        document.getElementById("productMessage");

    const ownerProductList =
        document.getElementById("ownerProductList");

    const emptyProducts =
        document.getElementById("emptyProducts");

    const productCountText =
        document.getElementById("productCountText");


    // =========================================================
    // DASHBOARD COUNT ELEMENTS
    // =========================================================

    const totalProducts =
        document.getElementById("totalProducts");

    const womenProducts =
        document.getElementById("womenProducts");

    const menProducts =
        document.getElementById("menProducts");

    const kidsBabyProducts =
        document.getElementById("kidsBabyProducts");


    // =========================================================
    // ORDER ELEMENTS
    // =========================================================

    const ordersList =
        document.getElementById("ordersList");

    const emptyOrders =
        document.getElementById("emptyOrders");

    const orderCountText =
        document.getElementById("orderCountText");


    // =========================================================
    // CONTACT MESSAGE ELEMENTS
    // =========================================================

    const contactMessagesList =
        document.getElementById("contactMessagesList");

    const emptyContactMessages =
        document.getElementById("emptyContactMessages");

    const contactMessageCountText =
        document.getElementById("contactMessageCountText");


    // =========================================================
    // HTML ESCAPE
    // =========================================================

    function escapeHTML(value) {

        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    // =========================================================
    // MONEY
    // =========================================================

    function money(value) {

        return "₹" +
            (Number(value) || 0).toLocaleString(
                "en-IN",
                {
                    maximumFractionDigits: 2
                }
            );
    }


    // =========================================================
    // PRODUCTS CACHE
    // =========================================================

    function getProducts() {

        return Array.isArray(productsCache)
            ? productsCache
            : [];
    }


    function setProducts(products) {

        productsCache =
            Array.isArray(products)
                ? products
                : [];


        try {

            localStorage.setItem(
                PRODUCTS_KEY,
                JSON.stringify(productsCache)
            );

        } catch (error) {

            console.warn(
                "Could not save product cache:",
                error
            );
        }
    }


    // =========================================================
    // API REQUEST
    // =========================================================

    async function apiRequest(
        url,
        options = {}
    ) {

        const requestOptions = {
            ...options,

            headers: {

                ...(options.body
                    ? {
                        "Content-Type":
                            "application/json"
                    }
                    : {}),

                ...(options.headers || {})
            }
        };


        const response =
            await fetch(
                url,
                requestOptions
            );


        let data = {};


        try {

            data =
                await response.json();

        } catch (error) {

            data = {};
        }


        if (!response.ok) {

            throw new Error(
                data.message ||
                data.error ||
                `Request failed (${response.status})`
            );
        }


        return data;
    }


    // =========================================================
    // NORMALIZE PRODUCT
    // =========================================================

    function normalizeProduct(product) {

        const sizes =
            product?.sizes &&
            typeof product.sizes === "object"
                ? product.sizes
                : {};


        const sizeStock =
            Object.values(sizes)
                .reduce(
                    (total, value) =>
                        total +
                        (Number(value) || 0),
                    0
                );


        const stock =
            product?.stock !== undefined &&
            product?.stock !== null
                ? Number(product.stock)
                : sizeStock;


        return {

            id:
                product?.id,

            product_code:
                product?.product_code ||
                product?.code ||
                "",

            code:
                product?.code ||
                product?.product_code ||
                "",

            name:
                product?.name ||
                "",

            category:
                product?.category ||
                "",

            price:
                Number(product?.price) || 0,

            description:
                product?.description ||
                "",

            image:
                product?.image ||
                product?.image_url ||
                product?.photo ||
                "",

            image_url:
                product?.image_url ||
                product?.image ||
                product?.photo ||
                "",

            photo:
                product?.photo ||
                product?.image ||
                product?.image_url ||
                "",

            sizes:
                sizes,

            stock:
                stock,

            outOfStock:
                stock <= 0,

            created_at:
                product?.created_at ||
                null,

            updated_at:
                product?.updated_at ||
                null
        };
    }


    // =========================================================
    // LOAD PRODUCTS FROM POSTGRESQL
    // =========================================================

    async function loadProductsFromAPI() {

        try {

            const data =
                await apiRequest(
                    PRODUCTS_API
                );


            const products =
                Array.isArray(data)
                    ? data
                    : Array.isArray(data.products)
                        ? data.products
                        : [];


            setProducts(
                products.map(
                    normalizeProduct
                )
            );


            renderProducts();

            updateDashboard();


            console.log(
                "Products loaded:",
                productsCache.length
            );


            return productsCache;

        } catch (error) {

            console.error(
                "PRODUCT LOAD ERROR:",
                error
            );


            try {

                const cached =
                    localStorage.getItem(
                        PRODUCTS_KEY
                    );


                if (cached) {

                    const parsed =
                        JSON.parse(cached);


                    if (Array.isArray(parsed)) {

                        productsCache =
                            parsed.map(
                                normalizeProduct
                            );
                    }
                }

            } catch (cacheError) {

                console.error(
                    "CACHE ERROR:",
                    cacheError
                );
            }


            renderProducts();

            updateDashboard();


            return productsCache;
        }
    }


    // =========================================================
    // SIZE STOCK IDS
    // =========================================================

    const STOCK_FIELDS = {

        "XS": "stockXS",

        "S": "stockS",

        "M": "stockM",

        "L": "stockL",

        "XL": "stockXL",

        "XXL": "stockXXL",

        "0-3M": "stock0to3M",

        "3-6M": "stock3to6M",

        "6-12M": "stock6to12M",

        "1-2Y": "stock1to2Y",

        "2-3Y": "stock2to3Y",

        "4-5Y": "stock4to5Y",

        "6-7Y": "stock6to7Y",

        "8-9Y": "stock8to9Y",

        "10-11Y": "stock10to11Y"
    };


    // =========================================================
    // GET SIZE STOCK
    // =========================================================

    function getSizeStock() {

        const sizes = {};


        Object.entries(
            STOCK_FIELDS
        ).forEach(
            ([size, elementId]) => {

                const element =
                    document.getElementById(
                        elementId
                    );


                sizes[size] =
                    Math.max(
                        0,
                        Number(
                            element?.value || 0
                        )
                    );
            }
        );


        return sizes;
    }


    // =========================================================
    // FILL SIZE STOCK
    // =========================================================

    function fillSizeStock(
        sizes = {}
    ) {

        Object.entries(
            STOCK_FIELDS
        ).forEach(
            ([size, elementId]) => {

                const element =
                    document.getElementById(
                        elementId
                    );


                if (element) {

                    element.value =
                        Number(
                            sizes[size] || 0
                        );
                }
            }
        );
    }


    // =========================================================
    // TOTAL STOCK
    // =========================================================

    function getStockTotal(
        sizes = {}
    ) {

        return Object.values(
            sizes
        ).reduce(
            (total, value) =>
                total +
                (Number(value) || 0),
            0
        );
    }


    // =========================================================
    // LOGIN
    // =========================================================

    function showLogin() {

        if (loginPage) {

            loginPage.style.display =
                "flex";
        }


        if (dashboardPage) {

            dashboardPage.style.display =
                "none";
        }
    }


    // =========================================================
    // SHOW DASHBOARD
    // =========================================================

    async function showDashboard() {

        if (loginPage) {

            loginPage.style.display =
                "none";
        }


        if (dashboardPage) {

            dashboardPage.style.display =
                "flex";
        }


        updateDashboard();

        renderProducts();


        // =====================================================
        // LOAD ALL DASHBOARD DATA
        // =====================================================

        await loadProductsFromAPI();

        await loadOrdersFromAPI();

        await loadContactMessagesFromAPI();
    }


    // =========================================================
    // LOGIN SUBMIT
    // =========================================================

    if (loginForm) {

        loginForm.addEventListener(
            "submit",
            async event => {

                event.preventDefault();


                const username =
                    ownerUsername
                        ? ownerUsername.value.trim()
                        : "";


                const password =
                    ownerPassword
                        ? ownerPassword.value
                        : "";


                if (
                    username === "owner" &&
                    password === "textel@123"
                ) {

                    sessionStorage.setItem(
                        AUTH_KEY,
                        "true"
                    );


                    if (loginError) {

                        loginError.textContent =
                            "";
                    }


                    await showDashboard();

                } else {

                    if (loginError) {

                        loginError.textContent =
                            "Invalid username or password.";
                    }
                }
            }
        );
    }


    // =========================================================
    // LOGOUT
    // =========================================================

    if (logoutBtn) {

        logoutBtn.addEventListener(
            "click",
            () => {

                sessionStorage.removeItem(
                    AUTH_KEY
                );


                editingProductId =
                    null;


                currentImage =
                    "";


                showLogin();
            }
        );
    }


    // =========================================================
    // CHOOSE IMAGE
    // =========================================================

    if (
        chooseImageBtn &&
        productImage
    ) {

        chooseImageBtn.addEventListener(
            "click",
            event => {

                event.preventDefault();

                event.stopPropagation();


                if (!isUploadingImage) {

                    productImage.click();
                }
            }
        );
    }


    // =========================================================
    // IMAGE CHANGE
    // =========================================================

    if (productImage) {

        productImage.addEventListener(
            "change",
            async function () {

                const file =
                    this.files?.[0];


                if (!file) {

                    return;
                }


                const allowedTypes = [

                    "image/jpeg",

                    "image/png",

                    "image/webp"

                ];


                if (
                    !allowedTypes.includes(
                        file.type
                    )
                ) {

                    showProductMessage(
                        "Please select JPG, PNG or WEBP image.",
                        "error"
                    );


                    this.value =
                        "";


                    return;
                }


                if (
                    file.size >
                    5 * 1024 * 1024
                ) {

                    showProductMessage(
                        "Image size must be less than 5MB.",
                        "error"
                    );


                    this.value =
                        "";


                    return;
                }


                isUploadingImage =
                    true;


                if (chooseImageBtn) {

                    chooseImageBtn.disabled =
                        true;

                    chooseImageBtn.textContent =
                        "Uploading...";
                }


                try {

                    const compressed =
                        await compressImage(
                            file
                        );


                    if (imagePreview) {

                        imagePreview.src =
                            compressed;

                        imagePreview.style.display =
                            "block";
                    }


                    if (uploadPlaceholder) {

                        uploadPlaceholder.style.display =
                            "none";
                    }


                    const url =
                        await uploadToCloudinary(
                            compressed
                        );


                    currentImage =
                        url;


                    if (imagePreview) {

                        imagePreview.src =
                            url;
                    }


                    if (chooseImageBtn) {

                        chooseImageBtn.style.display =
                            "none";
                    }


                    showProductMessage(
                        "Image uploaded successfully!",
                        "success"
                    );


                } catch (error) {

                    console.error(
                        "IMAGE UPLOAD ERROR:",
                        error
                    );


                    currentImage =
                        "";


                    resetImagePreview();


                    showProductMessage(
                        error.message ||
                        "Image upload failed.",
                        "error"
                    );

                } finally {

                    isUploadingImage =
                        false;


                    if (chooseImageBtn) {

                        chooseImageBtn.disabled =
                            false;

                        chooseImageBtn.textContent =
                            "Choose Image";
                    }
                }
            }
        );
    }


    // =========================================================
    // COMPRESS IMAGE
    // =========================================================

    function compressImage(file) {

        return new Promise(
            (resolve, reject) => {

                const reader =
                    new FileReader();


                reader.onload =
                    event => {

                        const img =
                            new Image();


                        img.onload =
                            () => {

                                const MAX_SIZE =
                                    1200;


                                let width =
                                    img.width;

                                let height =
                                    img.height;


                                if (
                                    width >
                                    MAX_SIZE ||
                                    height >
                                    MAX_SIZE
                                ) {

                                    if (
                                        width >
                                        height
                                    ) {

                                        height =
                                            Math.round(
                                                height *
                                                MAX_SIZE /
                                                width
                                            );

                                        width =
                                            MAX_SIZE;

                                    } else {

                                        width =
                                            Math.round(
                                                width *
                                                MAX_SIZE /
                                                height
                                            );

                                        height =
                                            MAX_SIZE;
                                    }
                                }


                                const canvas =
                                    document.createElement(
                                        "canvas"
                                    );


                                canvas.width =
                                    width;

                                canvas.height =
                                    height;


                                const ctx =
                                    canvas.getContext(
                                        "2d"
                                    );


                                ctx.drawImage(
                                    img,
                                    0,
                                    0,
                                    width,
                                    height
                                );


                                resolve(
                                    canvas.toDataURL(
                                        "image/jpeg",
                                        0.75
                                    )
                                );
                            };


                        img.onerror =
                            () => {

                                reject(
                                    new Error(
                                        "Unable to process image."
                                    )
                                );
                            };


                        img.src =
                            event.target.result;
                    };


                reader.onerror =
                    () => {

                        reject(
                            new Error(
                                "Unable to read image."
                            )
                        );
                    };


                reader.readAsDataURL(file);
            }
        );
    }


    // =========================================================
    // CLOUDINARY UPLOAD
    // =========================================================

    async function uploadToCloudinary(
        base64Image
    ) {

        const formData =
            new FormData();


        formData.append(
            "file",
            base64Image
        );


        formData.append(
            "upload_preset",
            CLOUDINARY_UPLOAD_PRESET
        );


        formData.append(
            "folder",
            "sri-kumar-stores/products"
        );


        const response =
            await fetch(
                CLOUDINARY_UPLOAD_URL,
                {
                    method:
                        "POST",

                    body:
                        formData
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.error?.message ||
                "Cloudinary upload failed."
            );
        }


        if (!data.secure_url) {

            throw new Error(
                "Cloudinary image URL not received."
            );
        }


        return data.secure_url;
    }


    // =========================================================
    // RESET IMAGE
    // =========================================================

    function resetImagePreview() {

        currentImage =
            "";


        if (productImage) {

            productImage.value =
                "";
        }


        if (imagePreview) {

            imagePreview.src =
                "";

            imagePreview.style.display =
                "none";
        }


        if (uploadPlaceholder) {

            uploadPlaceholder.style.display =
                "block";
        }


        if (chooseImageBtn) {

            chooseImageBtn.style.display =
                "block";

            chooseImageBtn.disabled =
                false;

            chooseImageBtn.textContent =
                "Choose Image";
        }
    }


    // =========================================================
    // PRODUCT MESSAGE
    // =========================================================

    function showProductMessage(
        message,
        type = ""
    ) {

        if (!productMessage) {

            return;
        }


        productMessage.textContent =
            message;


        productMessage.className =
            "product-message";


        if (type) {

            productMessage.classList.add(
                type
            );
        }


        setTimeout(
            () => {

                if (productMessage) {

                    productMessage.textContent =
                        "";

                    productMessage.className =
                        "product-message";
                }

            },
            3500
        );
    }


    // =========================================================
    // PRODUCT FORM
    // =========================================================

    if (productForm) {

        productForm.addEventListener(
            "submit",
            async event => {

                event.preventDefault();


                if (isSavingProduct) {

                    return;
                }


                if (isUploadingImage) {

                    showProductMessage(
                        "Please wait for image upload.",
                        "error"
                    );

                    return;
                }


                const name =
                    productName?.value.trim() ||
                    "";


                const category =
                    productCategory?.value ||
                    "";


                const price =
                    Number(
                        productPrice?.value || 0
                    );


                const code =
                    productCode?.value.trim() ||
                    "";


                const description =
                    productDescription?.value.trim() ||
                    "";


                if (!name) {

                    showProductMessage(
                        "Please enter product name.",
                        "error"
                    );

                    return;
                }


                if (!category) {

                    showProductMessage(
                        "Please select category.",
                        "error"
                    );

                    return;
                }


                if (
                    !price ||
                    price <= 0
                ) {

                    showProductMessage(
                        "Please enter valid price.",
                        "error"
                    );

                    return;
                }


                if (
                    !currentImage &&
                    !editingProductId
                ) {

                    showProductMessage(
                        "Please upload product image.",
                        "error"
                    );

                    return;
                }


                const sizes =
                    getSizeStock();


                const stock =
                    getStockTotal(
                        sizes
                    );


                const productData = {

                    name:
                        name,

                    category:
                        category,

                    price:
                        price,

                    code:
                        code,

                    description:
                        description,

                    image:
                        currentImage,

                    sizes:
                        sizes,

                    stock:
                        stock
                };


                isSavingProduct =
                    true;


                const submitButton =
                    productForm.querySelector(
                        'button[type="submit"]'
                    );


                const oldText =
                    submitButton
                        ? submitButton.textContent
                        : "";


                if (submitButton) {

                    submitButton.disabled =
                        true;

                    submitButton.textContent =
                        editingProductId
                            ? "Updating..."
                            : "Publishing...";
                }


                try {

                    let data;


                    // =========================================
                    // UPDATE
                    // =========================================

                    if (editingProductId) {

                        data =
                            await apiRequest(
                                `${ADMIN_PRODUCTS_API}/${editingProductId}`,
                                {
                                    method:
                                        "PUT",

                                    body:
                                        JSON.stringify(
                                            productData
                                        )
                                }
                            );


                        const updated =
                            normalizeProduct(
                                data.product ||
                                data
                            );


                        productsCache =
                            productsCache.map(
                                product =>
                                    String(
                                        product.id
                                    ) ===
                                    String(
                                        editingProductId
                                    )
                                        ? updated
                                        : product
                            );


                        showProductMessage(
                            "Product updated successfully!",
                            "success"
                        );

                    }

                    // =========================================
                    // CREATE
                    // =========================================

                    else {

                        data =
                            await apiRequest(
                                ADMIN_PRODUCTS_API,
                                {
                                    method:
                                        "POST",

                                    body:
                                        JSON.stringify(
                                            productData
                                        )
                                }
                            );


                        const created =
                            normalizeProduct(
                                data.product ||
                                data
                            );


                        productsCache.unshift(
                            created
                        );


                        showProductMessage(
                            "Product published successfully!",
                            "success"
                        );
                    }


                    setProducts(
                        productsCache
                    );


                    editingProductId =
                        null;


                    productForm.reset();

                    resetImagePreview();

                    fillSizeStock({});

                    renderProducts();

                    updateDashboard();


                } catch (error) {

                    console.error(
                        "PRODUCT SAVE ERROR:",
                        error
                    );


                    showProductMessage(
                        error.message ||
                        "Product could not be saved.",
                        "error"
                    );

                } finally {

                    isSavingProduct =
                        false;


                    if (submitButton) {

                        submitButton.disabled =
                            false;

                        submitButton.textContent =
                            oldText ||
                            "Publish Product";
                    }
                }
            }
        );
    }


    // =========================================================
    // RESET PRODUCT
    // =========================================================

    if (resetProductBtn) {

        resetProductBtn.addEventListener(
            "click",
            () => {

                editingProductId =
                    null;


                productForm?.reset();

                resetImagePreview();

                fillSizeStock({});
            }
        );
    }


    // =========================================================
    // DASHBOARD COUNTS
    // =========================================================

    function updateDashboard() {

        const products =
            getProducts();


        if (totalProducts) {

            totalProducts.textContent =
                products.length;
        }


        const women =
            products.filter(
                product =>
                    String(
                        product.category
                    ).toLowerCase() ===
                    "women"
            ).length;


        const men =
            products.filter(
                product =>
                    String(
                        product.category
                    ).toLowerCase() ===
                    "men"
            ).length;


        const kidsBaby =
            products.filter(
                product => {

                    const category =
                        String(
                            product.category
                        ).toLowerCase();


                    return (
                        category === "kids" ||
                        category === "baby" ||
                        category === "babies"
                    );
                }
            ).length;


        if (womenProducts) {

            womenProducts.textContent =
                women;
        }


        if (menProducts) {

            menProducts.textContent =
                men;
        }


        if (kidsBabyProducts) {

            kidsBabyProducts.textContent =
                kidsBaby;
        }


        if (productCountText) {

            productCountText.textContent =
                `${products.length} ${
                    products.length === 1
                        ? "product"
                        : "products"
                }`;
        }
    }


    // =========================================================
    // RENDER PRODUCTS
    // =========================================================

    function renderProducts() {

        if (!ownerProductList) {

            return;
        }


        ownerProductList.innerHTML =
            "";


        const products =
            getProducts();


        if (!products.length) {

            ownerProductList.innerHTML = `

                <div class="empty-products">

                    <div class="empty-icon">
                        🛍️
                    </div>

                    <h3>
                        No Products Yet
                    </h3>

                    <p>
                        Add your first product.
                    </p>

                </div>

            `;


            return;
        }


        products.forEach(
            product => {

                const card =
                    document.createElement(
                        "div"
                    );


                card.className =
                    "owner-product-card";


                const image =
                    product.image ||
                    product.image_url ||
                    product.photo ||
                    "";


                const name =
                    escapeHTML(
                        product.name
                    );


                const category =
                    escapeHTML(
                        product.category
                    );


                const code =
                    escapeHTML(
                        product.code ||
                        product.product_code ||
                        "-"
                    );


                const sizes =
                    product.sizes || {};


                const stock =
                    Number(
                        product.stock || 0
                    );


                const sizeEntries =
                    Object.entries(
                        sizes
                    )
                        .filter(
                            ([, value]) =>
                                Number(value) > 0
                        );


                const sizeHTML =
                    sizeEntries.length
                        ? sizeEntries.map(
                            ([size, quantity]) =>
                                `
                                <span>
                                    ${escapeHTML(size)}:
                                    ${quantity}
                                </span>
                                `
                        ).join("")
                        : "<span>No stock</span>";


                card.innerHTML = `

                    <div class="owner-product-image">

                        ${
                            image
                                ? `
                                    <img
                                        src="${escapeHTML(image)}"
                                        alt="${name}"
                                        loading="lazy"
                                    >
                                  `
                                : `
                                    <div class="no-product-image">
                                        📷
                                    </div>
                                  `
                        }

                    </div>


                    <div class="owner-product-info">

                        <div
                            class="owner-product-top"
                            style="
                                display:flex;
                                justify-content:space-between;
                                align-items:center;
                                gap:10px;
                            "
                        >

                            <span class="product-category">
                                ${category}
                            </span>


                            <div
                                style="
                                    display:flex;
                                    gap:6px;
                                "
                            >

                                <button
                                    type="button"
                                    class="edit-product-btn"
                                    data-id="${escapeHTML(product.id)}"
                                >
                                    ✏️
                                </button>


                                <button
                                    type="button"
                                    class="delete-product-btn"
                                    data-id="${escapeHTML(product.id)}"
                                >
                                    🗑️
                                </button>

                            </div>

                        </div>


                        <h3>
                            ${name}
                        </h3>


                        <p>
                            Code: ${code}
                        </p>


                        <strong>
                            ${money(product.price)}
                        </strong>


                        <div class="owner-product-stock">

                            <div>
                                Stock:
                                <strong>
                                    ${stock}
                                </strong>
                            </div>


                            <div class="stock-size-list">

                                ${sizeHTML}

                            </div>

                        </div>

                    </div>

                `;


                ownerProductList.appendChild(
                    card
                );
            }
        );


        // =====================================================
        // EDIT BUTTON
        // =====================================================

        ownerProductList
            .querySelectorAll(
                ".edit-product-btn"
            )
            .forEach(
                button => {

                    button.addEventListener(
                        "click",
                        () => {

                            editProduct(
                                button.dataset.id
                            );
                        }
                    );
                }
            );


        // =====================================================
        // DELETE BUTTON
        // =====================================================

        ownerProductList
            .querySelectorAll(
                ".delete-product-btn"
            )
            .forEach(
                button => {

                    button.addEventListener(
                        "click",
                        async () => {

                            await deleteProduct(
                                button.dataset.id
                            );
                        }
                    );
                }
            );
    }


    // =========================================================
    // EDIT PRODUCT
    // =========================================================

    function editProduct(
        productId
    ) {

        const product =
            getProducts().find(
                item =>
                    String(item.id) ===
                    String(productId)
            );


        if (!product) {

            showProductMessage(
                "Product not found.",
                "error"
            );

            return;
        }


        editingProductId =
            product.id;


        if (productName) {

            productName.value =
                product.name || "";
        }


        if (productCategory) {

            productCategory.value =
                product.category || "";
        }


        if (productPrice) {

            productPrice.value =
                product.price || "";
        }


        if (productCode) {

            productCode.value =
                product.code ||
                product.product_code ||
                "";
        }


        if (productDescription) {

            productDescription.value =
                product.description || "";
        }


        fillSizeStock(
            product.sizes || {}
        );


        currentImage =
            product.image ||
            product.image_url ||
            product.photo ||
            "";


        if (imagePreview) {

            imagePreview.src =
                currentImage;

            imagePreview.style.display =
                currentImage
                    ? "block"
                    : "none";
        }


        if (uploadPlaceholder) {

            uploadPlaceholder.style.display =
                currentImage
                    ? "none"
                    : "block";
        }


        if (chooseImageBtn) {

            chooseImageBtn.style.display =
                currentImage
                    ? "none"
                    : "block";
        }


        if (productForm) {

            productForm.scrollIntoView(
                {
                    behavior:
                        "smooth",

                    block:
                        "start"
                }
            );
        }


        showProductMessage(
            "Editing product...",
            "success"
        );
    }


    // =========================================================
    // DELETE PRODUCT
    // =========================================================

    async function deleteProduct(
        productId
    ) {

        const confirmed =
            confirm(
                "Are you sure you want to delete this product?"
            );


        if (!confirmed) {

            return;
        }


        try {

            await apiRequest(
                `${ADMIN_PRODUCTS_API}/${productId}`,
                {
                    method:
                        "DELETE"
                }
            );


            productsCache =
                productsCache.filter(
                    product =>
                        String(product.id) !==
                        String(productId)
                );


            setProducts(
                productsCache
            );


            renderProducts();

            updateDashboard();


            showProductMessage(
                "Product deleted successfully.",
                "success"
            );


        } catch (error) {

            console.error(
                "DELETE PRODUCT ERROR:",
                error
            );


            showProductMessage(
                error.message ||
                "Product could not be deleted.",
                "error"
            );
        }
    }


    // =========================================================
    // LOAD ORDERS
    // =========================================================

    async function loadOrdersFromAPI() {

        if (!ordersList) {

            return;
        }


        try {

            console.log(
                "Loading orders from PostgreSQL..."
            );


            const data =
                await apiRequest(
                    ORDERS_API
                );


            const orders =
                Array.isArray(data)
                    ? data
                    : Array.isArray(data.orders)
                        ? data.orders
                        : [];


            console.log(
                "Orders loaded:",
                orders.length
            );


            renderOrders(
                orders
            );


        } catch (error) {

            console.error(
                "ORDERS LOAD ERROR:",
                error
            );


            ordersList.innerHTML = `

                <div class="empty-products">

                    <div class="empty-icon">
                        ⚠️
                    </div>

                    <h3>
                        Unable to Load Orders
                    </h3>

                    <p>
                        ${escapeHTML(
                            error.message ||
                            "Please check backend."
                        )}
                    </p>

                </div>

            `;


            if (orderCountText) {

                orderCountText.textContent =
                    "0 Orders";
            }
        }
    }


    // =========================================================
    // RENDER ORDERS
    // =========================================================

    function renderOrders(
        orders = []
    ) {

        if (!ordersList) {

            return;
        }


        ordersList.innerHTML =
            "";


        if (
            !Array.isArray(orders) ||
            orders.length === 0
        ) {

            ordersList.innerHTML = `

                <div class="empty-products">

                    <div class="empty-icon">
                        🧾
                    </div>

                    <h3>
                        No Orders Yet
                    </h3>

                    <p>
                        Orders placed by customers at Checkout will appear here with their Order ID.
                    </p>

                </div>

            `;


            if (orderCountText) {

                orderCountText.textContent =
                    "0 Orders";
            }


            return;
        }


        if (orderCountText) {

            orderCountText.textContent =
                `${orders.length} ${
                    orders.length === 1
                        ? "Order"
                        : "Orders"
                }`;
        }


        orders.forEach(
            order => {

                const card =
                    document.createElement(
                        "div"
                    );


                card.className =
                    "owner-order-card";


                const orderId =
                    order.order_id ||
                    order.id ||
                    "-";


                const status =
                    order.status ||
                    "Pending";


                const customerName =
                    order.customer_name ||
                    "Guest Customer";


                const customerPhone =
                    order.customer_phone ||
                    "-";


                const customerEmail =
                    order.customer_email ||
                    "-";


                const total =
                    money(
                        order.total
                    );


                let orderDate =
                    "-";


                if (order.created_at) {

                    try {

                        orderDate =
                            new Date(
                                order.created_at
                            ).toLocaleString(
                                "en-IN",
                                {
                                    dateStyle:
                                        "medium",

                                    timeStyle:
                                        "short"
                                }
                            );

                    } catch {

                        orderDate =
                            order.created_at;
                    }
                }


                // =================================================
                // ORDER ITEMS
                // =================================================

                let items = [];


                try {

                    if (
                        Array.isArray(
                            order.items
                        )
                    ) {

                        items =
                            order.items;

                    } else if (
                        typeof order.items ===
                        "string"
                    ) {

                        items =
                            JSON.parse(
                                order.items
                            );
                    }

                } catch {

                    items =
                        [];
                }


                let itemsHTML =
                    "";


                if (
                    Array.isArray(items) &&
                    items.length
                ) {

                    itemsHTML =
                        items.map(
                            item => {

                                const itemName =
                                    escapeHTML(
                                        item.name ||
                                        item.title ||
                                        "Product"
                                    );


                                const quantity =
                                    Number(
                                        item.quantity ||
                                        item.qty ||
                                        1
                                    );


                                const itemPrice =
                                    money(
                                        item.price ||
                                        0
                                    );


                                const size =
                                    item.selectedSize ||
                                    item.size ||
                                    "";


                                const image =
                                    item.image ||
                                    item.image_url ||
                                    item.photo ||
                                    "";


                                return `

                                    <div
                                        class="owner-order-item"
                                        style="
                                            display:flex;
                                            align-items:center;
                                            justify-content:space-between;
                                            gap:12px;
                                            padding:10px 0;
                                            border-bottom:1px solid #eee;
                                        "
                                    >

                                        <div
                                            style="
                                                display:flex;
                                                align-items:center;
                                                gap:10px;
                                            "
                                        >

                                            ${
                                                image
                                                    ? `
                                                        <img
                                                            src="${escapeHTML(image)}"
                                                            alt="${itemName}"
                                                            style="
                                                                width:50px;
                                                                height:50px;
                                                                object-fit:cover;
                                                                border-radius:8px;
                                                            "
                                                        >
                                                      `
                                                    : `
                                                        <div
                                                            style="
                                                                width:50px;
                                                                height:50px;
                                                                display:flex;
                                                                align-items:center;
                                                                justify-content:center;
                                                                background:#f3f3f3;
                                                                border-radius:8px;
                                                            "
                                                        >
                                                            🛍️
                                                        </div>
                                                      `
                                            }


                                            <div>

                                                <strong>
                                                    ${itemName}
                                                </strong>


                                                <div
                                                    style="
                                                        font-size:13px;
                                                        color:#666;
                                                    "
                                                >

                                                    ${
                                                        size
                                                            ? `Size: ${escapeHTML(size)} · `
                                                            : ""
                                                    }

                                                    Qty:
                                                    ${quantity}

                                                </div>

                                            </div>

                                        </div>


                                        <strong>
                                            ${itemPrice}
                                        </strong>

                                    </div>

                                `;
                            }
                        ).join("");

                } else {

                    itemsHTML = `

                        <p>
                            No item details available.
                        </p>

                    `;
                }


                // =================================================
                // ORDER CARD
                // =================================================

                card.innerHTML = `

                    <div
                        class="owner-order-header"
                        style="
                            display:flex;
                            justify-content:space-between;
                            align-items:center;
                            gap:15px;
                            margin-bottom:15px;
                        "
                    >

                        <div>

                            <small
                                style="
                                    display:block;
                                    color:#777;
                                    margin-bottom:4px;
                                "
                            >
                                ORDER ID
                            </small>


                            <h3
                                style="
                                    margin:0;
                                "
                            >
                                ${escapeHTML(orderId)}
                            </h3>

                        </div>


                        <span
                            class="order-status"
                            style="
                                padding:6px 12px;
                                border-radius:20px;
                                background:#fff3cd;
                                color:#856404;
                                font-size:13px;
                                font-weight:600;
                            "
                        >
                            ${escapeHTML(status)}
                        </span>

                    </div>


                    <div
                        class="owner-order-customer"
                        style="
                            display:grid;
                            grid-template-columns:
                                repeat(auto-fit,minmax(150px,1fr));
                            gap:12px;
                            margin-bottom:15px;
                        "
                    >

                        <div>

                            <small>
                                Customer
                            </small>

                            <strong>
                                ${escapeHTML(customerName)}
                            </strong>

                        </div>


                        <div>

                            <small>
                                Phone
                            </small>

                            <strong>
                                ${escapeHTML(customerPhone)}
                            </strong>

                        </div>


                        <div>

                            <small>
                                Email
                            </small>

                            <strong>
                                ${escapeHTML(customerEmail)}
                            </strong>

                        </div>


                        <div>

                            <small>
                                Date
                            </small>

                            <strong>
                                ${escapeHTML(orderDate)}
                            </strong>

                        </div>

                    </div>


                    <div
                        class="owner-order-items"
                        style="
                            margin-bottom:15px;
                        "
                    >

                        <h4>
                            Ordered Products
                        </h4>


                        ${itemsHTML}

                    </div>


                    <div
                        class="owner-order-footer"
                        style="
                            display:flex;
                            justify-content:space-between;
                            align-items:center;
                            gap:15px;
                            padding-top:15px;
                            border-top:1px solid #eee;
                        "
                    >

                        <div>

                            <span>
                                Order Total
                            </span>


                            <strong
                                style="
                                    display:block;
                                    font-size:20px;
                                    margin-top:4px;
                                "
                            >
                                ${total}
                            </strong>

                        </div>


                        <button
                            type="button"
                            class="remove-order-btn"
                            data-order-id="${escapeHTML(orderId)}"
                            style="
                                border:0;
                                border-radius:8px;
                                padding:10px 16px;
                                cursor:pointer;
                                font-weight:600;
                                background:#dc3545;
                                color:white;
                            "
                        >
                            🗑️ Remove Order
                        </button>

                    </div>

                `;


                ordersList.appendChild(
                    card
                );
            }
        );


        // =====================================================
        // REMOVE ORDER
        // =====================================================

        ordersList
            .querySelectorAll(
                ".remove-order-btn"
            )
            .forEach(
                button => {

                    button.addEventListener(
                        "click",
                        async () => {

                            const orderId =
                                button.dataset.orderId;


                            if (!orderId) {

                                return;
                            }


                            const confirmed =
                                confirm(
                                    `Are you sure you want to remove Order ${orderId}?`
                                );


                            if (!confirmed) {

                                return;
                            }


                            button.disabled =
                                true;


                            button.textContent =
                                "Removing...";


                            try {

                                await apiRequest(
                                    `${ORDERS_API}/${encodeURIComponent(orderId)}`,
                                    {
                                        method:
                                            "DELETE"
                                    }
                                );


                                console.log(
                                    "Order removed:",
                                    orderId
                                );


                                await loadOrdersFromAPI();


                                showProductMessage(
                                    "Order removed successfully.",
                                    "success"
                                );


                            } catch (error) {

                                console.error(
                                    "REMOVE ORDER ERROR:",
                                    error
                                );


                                button.disabled =
                                    false;


                                button.textContent =
                                    "🗑️ Remove Order";


                                alert(
                                    error.message ||
                                    "Order could not be removed."
                                );
                            }
                        }
                    );
                }
            );
    }


    // =========================================================
    // LOAD CONTACT MESSAGES
    // =========================================================

    async function loadContactMessagesFromAPI() {

        if (!contactMessagesList) {

            console.warn(
                "contactMessagesList element not found."
            );

            return;
        }


        try {

            console.log(
                "Loading contact messages from PostgreSQL..."
            );


            const data =
                await apiRequest(
                    CONTACT_MESSAGES_API
                );


            const messages =
                Array.isArray(data)
                    ? data
                    : Array.isArray(data.messages)
                        ? data.messages
                        : [];


            console.log(
                "Contact messages loaded:",
                messages.length
            );


            renderContactMessages(
                messages
            );


        } catch (error) {

            console.error(
                "CONTACT MESSAGE LOAD ERROR:",
                error
            );


            contactMessagesList.innerHTML = `

                <div class="empty-products">

                    <div class="empty-icon">
                        ⚠️
                    </div>

                    <h3>
                        Unable to Load Messages
                    </h3>

                    <p>
                        ${escapeHTML(
                            error.message ||
                            "Please check backend."
                        )}
                    </p>

                </div>

            `;


            if (contactMessageCountText) {

                contactMessageCountText.textContent =
                    "0 Messages";
            }
        }
    }


    // =========================================================
    // RENDER CONTACT MESSAGES
    // =========================================================

    function renderContactMessages(
        messages = []
    ) {

        if (!contactMessagesList) {

            return;
        }


        contactMessagesList.innerHTML =
            "";


        if (
            !Array.isArray(messages) ||
            messages.length === 0
        ) {

            contactMessagesList.innerHTML = `

                <div class="empty-products">

                    <div class="empty-icon">
                        💬
                    </div>

                    <h3>
                        No Messages Yet
                    </h3>

                    <p>
                        Customer messages sent from the Contact Us form will appear here.
                    </p>

                </div>

            `;


            if (contactMessageCountText) {

                contactMessageCountText.textContent =
                    "0 Messages";
            }


            return;
        }


        if (contactMessageCountText) {

            contactMessageCountText.textContent =
                `${messages.length} ${
                    messages.length === 1
                        ? "Message"
                        : "Messages"
                }`;
        }


        messages.forEach(
            message => {

                const card =
                    document.createElement(
                        "div"
                    );


                card.className =
                    "owner-contact-message-card";


                const messageId =
                    message.id || "";


                const name =
                    escapeHTML(
                        message.name ||
                        "Customer"
                    );


                const email =
                    escapeHTML(
                        message.email ||
                        "-"
                    );


                const phone =
                    escapeHTML(
                        message.phone ||
                        "-"
                    );


                const messageText =
                    escapeHTML(
                        message.message ||
                        ""
                    );


                let messageDate =
                    "-";


                if (message.created_at) {

                    try {

                        messageDate =
                            new Date(
                                message.created_at
                            ).toLocaleString(
                                "en-IN",
                                {
                                    dateStyle:
                                        "medium",

                                    timeStyle:
                                        "short"
                                }
                            );

                    } catch {

                        messageDate =
                            message.created_at;
                    }
                }


                card.innerHTML = `

                    <div
                        class="owner-contact-header"
                        style="
                            display:flex;
                            justify-content:space-between;
                            align-items:flex-start;
                            gap:15px;
                            margin-bottom:15px;
                        "
                    >

                        <div>

                            <small
                                style="
                                    display:block;
                                    color:#777;
                                    margin-bottom:4px;
                                "
                            >
                                CUSTOMER MESSAGE
                            </small>


                            <h3
                                style="
                                    margin:0;
                                "
                            >
                                ${name}
                            </h3>

                        </div>


                        <button
                            type="button"
                            class="delete-contact-message-btn"
                            data-message-id="${escapeHTML(messageId)}"
                            style="
                                border:0;
                                border-radius:8px;
                                padding:9px 13px;
                                cursor:pointer;
                                font-weight:600;
                                background:#dc3545;
                                color:white;
                            "
                        >
                            🗑️ Delete
                        </button>

                    </div>


                    <div
                        style="
                            display:grid;
                            grid-template-columns:
                                repeat(auto-fit,minmax(180px,1fr));
                            gap:12px;
                            margin-bottom:15px;
                        "
                    >

                        <div>

                            <small>
                                Name
                            </small>

                            <strong
                                style="
                                    display:block;
                                    margin-top:4px;
                                "
                            >
                                ${name}
                            </strong>

                        </div>


                        <div>

                            <small>
                                Phone
                            </small>

                            <strong
                                style="
                                    display:block;
                                    margin-top:4px;
                                "
                            >
                                ${phone}
                            </strong>

                        </div>


                        <div>

                            <small>
                                Email
                            </small>

                            <strong
                                style="
                                    display:block;
                                    margin-top:4px;
                                    word-break:break-word;
                                "
                            >
                                ${email}
                            </strong>

                        </div>


                        <div>

                            <small>
                                Date
                            </small>

                            <strong
                                style="
                                    display:block;
                                    margin-top:4px;
                                "
                            >
                                ${escapeHTML(messageDate)}
                            </strong>

                        </div>

                    </div>


                    <div
                        style="
                            background:#f8f8f8;
                            border-radius:10px;
                            padding:15px;
                        "
                    >

                        <small
                            style="
                                display:block;
                                color:#777;
                                margin-bottom:7px;
                            "
                        >
                            Message
                        </small>


                        <p
                            style="
                                margin:0;
                                line-height:1.6;
                                white-space:pre-wrap;
                                word-break:break-word;
                            "
                        >
                            ${messageText}
                        </p>

                    </div>

                `;


                contactMessagesList.appendChild(
                    card
                );
            }
        );


        // =====================================================
        // DELETE CONTACT MESSAGE
        // =====================================================

        contactMessagesList
            .querySelectorAll(
                ".delete-contact-message-btn"
            )
            .forEach(
                button => {

                    button.addEventListener(
                        "click",
                        async () => {

                            const messageId =
                                button.dataset.messageId;


                            if (!messageId) {

                                return;
                            }


                            const confirmed =
                                confirm(
                                    "Are you sure you want to delete this customer message?"
                                );


                            if (!confirmed) {

                                return;
                            }


                            button.disabled =
                                true;


                            button.textContent =
                                "Deleting...";


                            try {

                                await apiRequest(
                                    `${CONTACT_MESSAGES_API}/${encodeURIComponent(messageId)}`,
                                    {
                                        method:
                                            "DELETE"
                                    }
                                );


                                console.log(
                                    "Contact message deleted:",
                                    messageId
                                );


                                await loadContactMessagesFromAPI();


                                showProductMessage(
                                    "Message deleted successfully.",
                                    "success"
                                );


                            } catch (error) {

                                console.error(
                                    "DELETE CONTACT MESSAGE ERROR:",
                                    error
                                );


                                button.disabled =
                                    false;


                                button.textContent =
                                    "🗑️ Delete";


                                alert(
                                    error.message ||
                                    "Message could not be deleted."
                                );
                            }
                        }
                    );
                }
            );
    }


    // =========================================================
    // ORDERS NAVIGATION
    // =========================================================

    const ordersNav =
        document.querySelector(
            'a[href="#orders"]'
        );


    if (ordersNav) {

        ordersNav.addEventListener(
            "click",
            () => {

                setTimeout(
                    () => {

                        loadOrdersFromAPI();

                    },
                    150
                );
            }
        );
    }


    // =========================================================
    // CONTACT MESSAGES NAVIGATION
    // =========================================================

    const contactMessagesNav =
        document.querySelector(
            'a[href="#contactMessages"],' +
            'a[href="#messages"],' +
            'a[href="#contact"]'
        );


    if (contactMessagesNav) {

        contactMessagesNav.addEventListener(
            "click",
            () => {

                setTimeout(
                    () => {

                        loadContactMessagesFromAPI();

                    },
                    150
                );
            }
        );
    }


    // =========================================================
    // STORAGE SYNC
    // =========================================================

    window.addEventListener(
        "storage",
        event => {

            if (
                event.key ===
                PRODUCTS_KEY
            ) {

                loadProductsFromAPI();
            }
        }
    );


    // =========================================================
    // LOGIN CHECK
    // =========================================================

    function checkOwnerLogin() {

        const loggedIn =
            sessionStorage.getItem(
                AUTH_KEY
            ) === "true";


        if (loggedIn) {

            showDashboard();

        } else {

            showLogin();
        }
    }


    // =========================================================
    // START
    // =========================================================

    checkOwnerLogin();

});