/* app.js - complet i autònom - VERSIÓ CORREGIDA EMAILS + CUPONS + VARIABLES SEGURES */
/* Funciones corregidas: 
   - Sistema de emails corregit: contacte usa template adminasync function enviarConfirmacionCliente(comandaData, comandaId) {
   - Confirmació client amb variables assegures (sense undefined)
   - Cupons de descompte inclosos al email de confirmació al client
   - Selector de variantes deshabilitado cuando no hay variantes
   - Botón siempre habilitado
   - Comportamiento correcto del selector según si hay variantes o no
   - Breadcrumb Navigation implementado
   - Sistema de comandas con notificación por email
   - Confirmación al cliente usando solo 2 templates
*/

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import {
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import {
  getFirestore, collection, getDocs, getDoc, addDoc, updateDoc, deleteDoc, doc, query, orderBy, limit, setDoc
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

/* ---------------------------
   CONFIGURACIÓ FIREBASE
   --------------------------- */
const firebaseConfig = {
  apiKey: "AIzaSyDb58CXjRXmaZptQJQiGG-5QV8NsNS6n-4",
  authDomain: "botigamiuart.firebaseapp.com",
  projectId: "botigamiuart",
  storageBucket: "botigamiuart.firebasestorage.app",
  messagingSenderId: "426623387823",
  appId: "1:426623387823:web:d6756869da1231ed4d2c5a"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* ---------------------------
   INICIALITZACIÓ EMAILJS
   --------------------------- */
// Inicialització única amb el compte principal
emailjs.init('UHPbtfKFspMstCYCj');

/* ---------------------------
   CONFIGURACIÓ NETLIFY + RESEND
   --------------------------- */
const NETLIFY_FUNCTION_URL = 'https://miuartclientes.netlify.app/.netlify/functions/enviar-contacto';
// ⚠️ REEMPLAÇA amb la teva URL real de Netlify quan la tinguis

/* ---------------------------
   SELECTORS / GLOBALS
   --------------------------- */
const paginas = document.querySelectorAll(".pagina");
const navMenu = document.getElementById("nav-menu");
const menuToggle = document.getElementById("menu-toggle");
const searchInput = document.getElementById("search-input");

// NOU: Selectors per al nou cercador
const searchResultsPopup = document.getElementById("search-results-popup");
const searchResultsContent = document.getElementById("search-results-content");

// NOU: Selector per al breadcrumb
const breadcrumb = document.getElementById("breadcrumb");

const listaProductos = document.getElementById("lista-productos");
const listaNovedades = document.getElementById("lista-novedades");
const cabeceraSlider = document.getElementById("cabecera-slider");
const cabeceraSliderDetalle = document.getElementById("cabecera-slider-detalle");
const cabeceraLista = document.getElementById("cabecera-lista");
const formularioImagenesCabecera = document.getElementById("formulario-imagenes-cabecera");

const detalleContenido = document.getElementById("detalle-contenido");
const formularioProducto = document.getElementById("formulario-producto");
const formularioEditar = document.getElementById("formulario-editar-producto");
const formularioConfiguracion = document.getElementById("formulario-configuracion");

const loginForm = document.getElementById("formulario-login");
const errorLogin = document.getElementById("error-login");

const authLink = document.getElementById("auth-link-a");
const usuarioInfo = document.getElementById("usuario-info");
const agregarProductoLink = document.getElementById("agregar-producto-link");
const imagenesCabeceraLink = document.getElementById("imagenes-cabecera-link");
const configuracionLink = document.getElementById("configuracion-link");

const cartCountEl = document.getElementById("cart-count");
const carritoContenido = document.getElementById("carrito-contenido");
const carritoSummaryEl = document.getElementById("carrito-summary");
const vaciarCarritoBtn = document.getElementById("vaciar-carrito");
const addDireccionBtn = document.getElementById("add-direccion");
const direccionFormContainer = document.getElementById("direccion-form-container");

const cartPopup = document.getElementById("cart-popup");

// Video i logo
const videoContainerWrapper = document.getElementById('video-container-wrapper');
const heroVideo = document.getElementById('hero-video');
const headerLogoImg = document.getElementById('header-logo-img');

// Formulari de contacte
const contactForm = document.getElementById('contact-form');
const contactPopup = document.getElementById('contact-popup');
const contactPopupClose = document.getElementById('contact-popup-close');

// Slider promocional
const sliderPromocional = document.getElementById("slider-promocional");
const sliderPromocionalText = document.getElementById("slider-promocional-text");

// NOU: Selectors per a "Quiénes somos"
const quienesSomosImagen = document.getElementById("quienes-somos-imagen");
const quienesSomosTitulo = document.getElementById("quienes-somos-titulo");
const quienesSomosTexto = document.getElementById("quienes-somos-texto");

// NOU: Selectors per al sistema de descomptes
const descuentoPopup = document.getElementById('descuento-popup');
const descuentoMensaje = document.getElementById('descuento-mensaje');
const codigoDescuento = document.getElementById('codigo-descuento');
const descuentoPopupClose = document.getElementById('descuento-popup-close');

// NOU: Selectors per al sistema de cupons
const cuponInput = document.getElementById('cupon-input');
const validarCuponBtn = document.getElementById('validar-cupon');
const cuponValidado = document.getElementById('cupon-validado');
const cuponMensaje = document.getElementById('cupon-mensaje');

/* Carrito guardat a localStorage */
const CART_KEY = "miuart_cart_v1";
let carrito = JSON.parse(localStorage.getItem(CART_KEY) || "[]");

/* Valors de configuració general */
let config = {
    envioEstandar: 5.00,
    enviamentGratisDesDe: 50.00,
    sliderPromocionalTexto: "",
    videoUrl: "",
    logoUrl: "",
    imagenNovedades: "",
    imagenColeccion: "",
    // NOU: Configuració per a les noves imatges
    imagenEspecialidad: "",
    imagenPromocion: "",
    // NOU: Configuració per a "Quiénes somos"
    imagenQuienesSomos: "",
    tituloQuienesSomos: "",
    textoQuienesSomos: "",
    // NOU: Configuració de descomptes
    promocionCompraSuperiorA: 0,
    porcentajeDescuento: 0
};

/* ---------------------------
   SISTEMA DE CUPONS
   --------------------------- */
let cuponAplicado = null;
let descuentoAplicado = 0;

/* ---------------------------
   UTILS
   --------------------------- */
function formatPrice(n) {
  if (typeof n !== "number") n = Number(n) || 0;
  return n.toFixed(2) + " €";
}
function saveCart() {
  localStorage.setItem(CART_KEY, JSON.stringify(carrito));
  renderCartCount();
}
function renderCartCount() {
  const count = carrito.reduce((s, i) => s + (i.cantidad || 0), 0);
  if (cartCountEl) cartCountEl.textContent = count;
}
function escapeHtml(str) {
  if (!str && str !== 0) return "";
  return String(str).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[m]);
}
function escapeAttr(s) { return escapeHtml(s).replace(/"/g, "&quot;"); }

/* ---------------------------
   BREADCRUMB NAVIGATION
   --------------------------- */
function updateBreadcrumb(pageId, productName = null) {
  if (!breadcrumb) return;
  
  const breadcrumbList = breadcrumb.querySelector('.breadcrumb-list');
  if (!breadcrumbList) return;
  
  // Mapeo de IDs de página a nombres amigables
  const pageNames = {
    'inicio': 'Inicio',
    'tienda': 'Tienda',
    'novedades': 'Novedades',
    'carrito': 'Carrito',
    'login-section': 'Iniciar Sesión',
    'agregar-producto': 'Agregar Producto',
    'editar-producto': 'Editar Producto',
    'imagenes-cabecera': 'Imágenes Cabecera',
    'configuracion': 'Configuración',
    'detalle-producto': 'Detalle Producto',
    'quienes-somos': 'Quiénes Somos',
    'contacto': 'Contacto',
    'envio-devoluciones': 'Envío y Devoluciones',
    'terminos-condiciones': 'Términos y Condiciones',
    'politica-privacidad': 'Política de Privacidad'
  };
  
  let breadcrumbItems = [];
  
  // Siempre empezamos con Inicio
  breadcrumbItems.push({
    name: 'Inicio',
    href: '#inicio'
  });
  
  // Para páginas específicas, añadimos los elementos correspondientes
  if (pageId === 'detalle-producto' && productName) {
    // Para detalle de producto: Inicio > Tienda > Nombre del Producto
    breadcrumbItems.push({
      name: 'Tienda',
      href: '#tienda'
    });
    breadcrumbItems.push({
      name: productName,
      href: null // Último elemento, sin enlace
    });
  } else if (pageId === 'editar-producto' && productName) {
    // Para editar producto: Inicio > Editar Producto > Nombre del Producto
    breadcrumbItems.push({
      name: 'Editar Producto',
      href: null
    });
    breadcrumbItems.push({
      name: productName,
      href: null
    });
  } else if (pageId === 'novedades') {
    // Para novedades: Inicio > Novedades
    breadcrumbItems.push({
      name: 'Novedades',
      href: null
    });
  } else {
    // Para otras páginas: Inicio > Nombre de la página
    const pageName = pageNames[pageId] || pageId;
    breadcrumbItems.push({
      name: pageName,
      href: pageId === 'inicio' ? null : `#${pageId}`
    });
  }
  
  // Generar HTML del breadcrumb
  breadcrumbList.innerHTML = breadcrumbItems.map((item, index) => {
    const isLast = index === breadcrumbItems.length - 1;
    const linkClass = isLast ? 'breadcrumb-link current' : 'breadcrumb-link';
    const href = isLast ? '#' : item.href;
    
    return `
      <li class="breadcrumb-item">
        ${isLast ? 
          `<span class="${linkClass}" aria-current="page">${escapeHtml(item.name)}</span>` :
          `<a href="${href || '#'}" class="${linkClass}">${escapeHtml(item.name)}</a>`
        }
      </li>
    `;
  }).join('');
  
  // Mostrar u ocultar el breadcrumb según la página
  if (pageId === 'inicio') {
    breadcrumb.style.display = 'none';
  } else {
    breadcrumb.style.display = 'block';
  }
}

/* ---------------------------
   CONFIGURACIÓ GENERAL (Slider, Video, Logo, etc.)
   --------------------------- */
function updateUIFromConfig() {
  // Slider promocional
  if (sliderPromocionalText && sliderPromocional) {
    if (config.sliderPromocionalTexto.trim() === "") {
      sliderPromocional.style.display = "none";
      document.querySelector("header").style.top = "0px";
    } else {
      sliderPromocional.style.display = "flex";
      sliderPromocionalText.textContent = config.sliderPromocionalTexto;
      document.querySelector("header").style.top = "35px";
    }
  }
  // Logo
  if (headerLogoImg && config.logoUrl) {
    headerLogoImg.src = config.logoUrl;
  }
  // Video (només es mostra a la pàgina d'inici)
  if (location.hash === '' || location.hash === '#inicio') {
    if (heroVideo && videoContainerWrapper && config.videoUrl) {
      heroVideo.src = config.videoUrl;
      videoContainerWrapper.style.display = 'block';
    } else if (videoContainerWrapper) {
      videoContainerWrapper.style.display = 'none';
    }
  } else if (videoContainerWrapper) {
    videoContainerWrapper.style.display = 'none';
  }
  
  // NOU: Actualitzar imatges de la home
  updateHomeImages();
  
  // NOU: Actualitzar secció "Quiénes somos"
  updateQuienesSomosSection();
}

// NOVA FUNCIÓ: Actualitzar imatges de la home
function updateHomeImages() {
  const imagenNovedades = document.getElementById('imagen-novedades');
  const imagenColeccion = document.getElementById('imagen-coleccion');
  const imagenEspecialidad = document.getElementById('imagen-especialidad');
  const imagenPromocion = document.getElementById('imagen-promocion');
  
  if (imagenNovedades && config.imagenNovedades) {
    imagenNovedades.src = config.imagenNovedades;
  }
  if (imagenColeccion && config.imagenColeccion) {
    imagenColeccion.src = config.imagenColeccion;
  }
  if (imagenEspecialidad && config.imagenEspecialidad) {
    imagenEspecialidad.src = config.imagenEspecialidad;
  }
  if (imagenPromocion && config.imagenPromocion) {
    imagenPromocion.src = config.imagenPromocion;
  }
}

// NOVA FUNCIÓ: Actualitzar secció "Quiénes somos"
function updateQuienesSomosSection() {
  if (quienesSomosImagen && config.imagenQuienesSomos) {
    quienesSomosImagen.src = config.imagenQuienesSomos;
  }
  if (quienesSomosTitulo && config.tituloQuienesSomos) {
    quienesSomosTitulo.textContent = config.tituloQuienesSomos;
  }
  if (quienesSomosTexto && config.textoQuienesSomos) {
    quienesSomosTexto.textContent = config.textoQuienesSomos;
  }
}

/* ---------------------------
   ROUTING
   --------------------------- */
function showPage(id) {
  paginas.forEach(p => { p.classList.remove("active"); p.style.display = "none"; });
  const target = document.getElementById(id);
  if (target) { target.classList.add("active"); target.style.display = "block"; }

  // Controla la visibilitat del video
  if (id === 'inicio') {
      updateUIFromConfig(); // Això mostrarà el vídeo si té URL
  } else if (videoContainerWrapper) {
      videoContainerWrapper.style.display = 'none';
  }

  // Actualizar breadcrumb
  updateBreadcrumb(id);

  // acciones por página
  if (id === "tienda") {
    loadHeaderImages();
    loadProducts();
  } else if (id === "novedades") { // NOU: Carregar novedades
    loadNovedades();
  } else if (id === "carrito") {
    renderCart();
  } else if (id === "imagenes-cabecera") {
    loadHeaderList();
  } else if (id === "configuracion") {
    loadConfigForm();
  } else if (id === "detalle-producto") {
    loadHeaderImagesDetalle();
  }
  
  // NOU: Amagar el pop-up de cerca quan canviem de pàgina
  hideSearchResults();
}
window.addEventListener("hashchange", () => {
  const h = location.hash.replace("#", "") || "inicio";
  if (h.startsWith("detalle-producto/")) {
    const docId = h.split("/")[1];
    showPage("detalle-producto");
    showProductDetail(docId);
    return;
  } else if (h.startsWith("editar-producto/")) {
    const docId = h.split("/")[1];
    showPage("editar-producto");
    loadEditForm(docId);
    return;
  }
  showPage(h || "inicio");
});
showPage(location.hash.replace("#", "") || "inicio");

/* ---------------------------
   NAV MENU (mobiles)
   --------------------------- */
if (menuToggle && navMenu) {
  menuToggle.addEventListener("click", () => navMenu.classList.toggle("active"));
  navMenu.querySelectorAll("a").forEach(a => a.addEventListener("click", () => navMenu.classList.remove("active")));
}

/* ---------------------------
   NOU: CERCADOR EN TEMPS REAL
   --------------------------- */
function initSearch() {
  if (!searchInput) return;
  
  // Amagar pop-up quan es fa clic fora
  document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !searchResultsPopup.contains(e.target)) {
      hideSearchResults();
    }
  });
  
  // Event listener per a l'entrada de text
  searchInput.addEventListener("input", handleSearchInput);
  
  // Event listener per a la tecla Escape
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hideSearchResults();
      searchInput.blur();
    }
  });
}

function handleSearchInput(e) {
  const searchTerm = e.target.value.trim().toLowerCase();
  
  if (searchTerm.length === 0) {
    hideSearchResults();
    return;
  }
  
  // Filtrar productes per nom o ID
  const results = productsCache.filter(product => {
    const nombreMatch = (product.nom || "").toLowerCase().includes(searchTerm);
    const idMatch = (product.id || "").toLowerCase().includes(searchTerm);
    return nombreMatch || idMatch;
  });
  
  displaySearchResults(results, searchTerm);
}

function displaySearchResults(results, searchTerm) {
  if (!searchResultsContent) return;
  
  searchResultsContent.innerHTML = '';
  
  if (results.length === 0) {
    searchResultsContent.innerHTML = '<div class="no-results">No se encontraron productos</div>';
    showSearchResults();
    return;
  }
  
  // Mostrar màxim 10 resultats
  const limitedResults = results.slice(0, 10);
  
  limitedResults.forEach(product => {
    const variant = (product.variants && product.variants[0]) ? product.variants[0] : { nom: "", preu: 0, stock: 0, imatges: [] };
    const firstImg = (variant.imatges && variant.imatges[0]) ? variant.imatges[0] : "https://via.placeholder.com/600x400?text=Sin+imagen";
    
    const resultItem = document.createElement('a');
    resultItem.href = `#detalle-producto/${product._docId}`;
    resultItem.className = 'search-result-item';
    resultItem.innerHTML = `
      <img src="${firstImg}" alt="${product.nom}">
      <div class="search-result-info">
        <div class="search-result-name">${escapeHtml(product.nom || "Producto")}</div>
        <div class="search-result-id">ID: ${escapeHtml(product.id || '')}</div>
      </div>
      <div class="search-result-price">${formatPrice(Number(variant.preu || 0))}</div>
    `;
    
    searchResultsContent.appendChild(resultItem);
  });
  
  showSearchResults();
}

function showSearchResults() {
  if (searchResultsPopup) {
    searchResultsPopup.classList.add('active');
  }
}

function hideSearchResults() {
  if (searchResultsPopup) {
    searchResultsPopup.classList.remove('active');
  }
}

/* ---------------------------
   AUTH (login/logout/state)
   --------------------------- */
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorLogin.textContent = "";
    const email = document.getElementById("email").value.trim();
    const pass = document.getElementById("contrasena").value;
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      location.hash = "#tienda";
    } catch (err) {
      console.error("Login error:", err);
      errorLogin.textContent = err.message || "Error al iniciar sesión";
    }
  });
}
onAuthStateChanged(auth, (user) => {
  if (user) {
    usuarioInfo.textContent = user.email;
    authLink.textContent = "Logout";
    authLink.href = "#inicio";
    authLink.onclick = async (e) => { e.preventDefault(); await signOut(auth); };
    agregarProductoLink.style.display = "inline-block";
    imagenesCabeceraLink.style.display = "inline-block";
    configuracionLink.style.display = "inline-block";
  } else {
    usuarioInfo.textContent = "";
    authLink.textContent = "Login";
    authLink.href = "#login-section";
    authLink.onclick = null;
    agregarProductoLink.style.display = "none";
    imagenesCabeceraLink.style.display = "none";
    configuracionLink.style.display = "none";
  }
  loadProducts();
  loadConfig();
});

/* ---------------------------
   CARGA PRODUCTOS
   --------------------------- */
let productsCache = [];
async function loadProducts() {
  if (!listaProductos) return;
  listaProductos.innerHTML = `<p>Cargando productos...</p>`;
  try {
    const q = query(collection(db, "productes"), orderBy("nom"), limit(1000));
    const snap = await getDocs(q);
    const arr = [];
    snap.forEach(d => {
      arr.push({ _docId: d.id, ...d.data() });
    });
    productsCache = arr;
    renderProductGrid(arr);
    
    // NOU: Si estem a la pàgina de novedades, actualitzar-les també
    if (location.hash === "#novedades") {
      loadNovedades();
    }
  } catch (err) {
    console.error("Error cargando productos:", err);
    listaProductos.innerHTML = `<p>Error al cargar productos: ${err.message || err}</p>`;
  }
}

// NOVA FUNCIÓ: Carregar productes a la secció de novedades
async function loadNovedades() {
  const listaNovedades = document.getElementById("lista-novedades");
  if (!listaNovedades) return;
  
  listaNovedades.innerHTML = `<p>Cargando novedades...</p>`;
  
  try {
    const novedades = productsCache.filter(p => p.novedades && !p.ocult);
    
    if (!novedades.length) {
      listaNovedades.innerHTML = "<p>No hay novedades disponibles.</p>";
      return;
    }
    
    renderProductGridNovedades(novedades, listaNovedades);
  } catch (err) {
    console.error("Error cargando novedades:", err);
    listaNovedades.innerHTML = `<p>Error al cargar novedades: ${err.message || err}</p>`;
  }
}

// FUNCIÓN CORREGIDA: Renderitzar grid de productos con selector de variantes corregido
function renderProductGrid(products) {
  if (!listaProductos) return;
  listaProductos.innerHTML = "";
  const search = (searchInput?.value || "").trim().toLowerCase();
  const isAdmin = !!auth.currentUser;
  const visibleProducts = products.filter(p => {
    if (isAdmin) {
      if (!search) return true;
      return (p.nom || "").toLowerCase().includes(search) || (p.descripcio || "").toLowerCase().includes(search) || (p.id || "").toLowerCase().includes(search);
    }
    if (p.ocult) return false;
    if (!search) return true;
    return (p.nom || "").toLowerCase().includes(search) || (p.descripcio || "").toLowerCase().includes(search) || (p.id || "").toLowerCase().includes(search);
  });

  if (!visibleProducts.length) {
    listaProductos.innerHTML = "<p>No hay productos disponibles.</p>";
    return;
  }

  visibleProducts.forEach(p => {
    const variants = p.variants || [];
    const hasVariants = variants.length > 0;
    const mainVariant = hasVariants ? variants[0] : { nom: "", preu: 0, stock: 0, imatges: [], tipus: "" };
    const firstImg = (mainVariant.imatges && mainVariant.imatges[0]) ? mainVariant.imatges[0] : "https://via.placeholder.com/600x400?text=Sin+imagen";
    
    // CORRECCIÓN: Determinar si debe mostrar "Sin variantes" o las variantes
    const shouldShowVariants = hasVariants && variants.length > 1;
    const variantLabel = shouldShowVariants ? (mainVariant.tipus || "Variante") : "Variante";
    
    const card = document.createElement("div");
    card.className = `producte${p.ocult ? ' producte-ocult' : ''}`;
    card.innerHTML = `
      <a href="#detalle-producto/${p._docId}" class="product-link">
        <img loading="lazy" src="${firstImg}" alt="${p.nom}">
        <div class="content">
          <h3>${escapeHtml(p.nom || "Producto")}</h3>
        </div>
      </a>
      <div class="product-variant-section">
        <div class="variant-label">${escapeHtml(variantLabel)}</div>
        <div class="variant-selector">
          <select class="variant-select" data-docid="${p._docId}" ${!shouldShowVariants ? 'disabled' : ''}>
            ${!hasVariants ? 
              '<option value="0" selected>Sin variantes</option>' : 
              variants.length === 1 ?
                '<option value="0" selected>Sin variantes</option>' :
                variants.map((v, idx) => 
                  `<option value="${idx}">${escapeHtml(v.nom || `Variante ${idx + 1}`)}</option>`
                ).join('')
            }
          </select>
        </div>
        <div class="meta">
          <div class="price">${formatPrice(Number(mainVariant.preu || 0))}</div>
          <div class="stock" style="color:${mainVariant.stock <= 3 ? '#c0392b' : 'var(--muted)'}">${mainVariant.stock <= 3 ? 'Quedan ' + mainVariant.stock : 'Stock: ' + mainVariant.stock}</div>
        </div>
      </div>
      <div class="producte-botons">
        ${auth.currentUser ? `<button class="btn secondary" data-delete="${p._docId}">Eliminar</button>
        <button class="btn secondary" data-edit="${p._docId}">Editar</button>
        <button class="btn secondary" data-toggle="${p._docId}">${p.ocult ? 'Mostrar' : 'Ocultar'}</button>` : ""}
        <button class="btn primary add-to-cart" data-docid="${p._docId}" data-variant="0">Añadir al carrito</button>
      </div>
    `;
    listaProductos.appendChild(card);

    // Event listener para el cambio de variante (solo si hay más de una variante)
    if (shouldShowVariants) {
      const variantSelect = card.querySelector('.variant-select');
      const priceEl = card.querySelector('.price');
      const stockEl = card.querySelector('.stock');
      const addToCartBtn = card.querySelector('.add-to-cart');

      variantSelect.addEventListener('change', function() {
        const variantIndex = parseInt(this.value);
        const selectedVariant = variants[variantIndex];
        
        // Actualizar precio y stock
        priceEl.textContent = formatPrice(Number(selectedVariant.preu || 0));
        
        const stockColor = selectedVariant.stock <= 3 ? '#c0392b' : 'var(--muted)';
        const stockText = selectedVariant.stock <= 3 ? 'Quedan ' + selectedVariant.stock : 'Stock: ' + selectedVariant.stock;
        stockEl.textContent = stockText;
        stockEl.style.color = stockColor;
        
        // Actualizar el data-variant del botón
        addToCartBtn.dataset.variant = variantIndex;
      });
    }

    // Event listener para el botón añadir al carrito
    const addToCartBtn = card.querySelector('.add-to-cart');
    addToCartBtn.addEventListener("click", () => {
      const docId = addToCartBtn.dataset.docid;
      const variantIndex = parseInt(addToCartBtn.dataset.variant || 0);
      addToCart(docId, variantIndex, 1);
    });
  });

  // Event listeners para botones de admin
  listaProductos.querySelectorAll("button[data-delete]").forEach(b => b.addEventListener("click", async () => {
    if (!confirm("¿Eliminar producto? Esta acción es irreversible.")) return;
    try {
      await deleteDoc(doc(db, "productes", b.dataset.delete));
      await loadProducts();
    } catch (err) { alert("Error al eliminar: " + (err.message || err)); console.error(err); }
  }));
  listaProductos.querySelectorAll("button[data-edit]").forEach(b => b.addEventListener("click", () => {
    const id = b.dataset.edit;
    location.hash = "#editar-producto/" + id;
  }));
  listaProductos.querySelectorAll("button[data-toggle]").forEach(b => b.addEventListener("click", async () => {
    const id = b.dataset.toggle;
    try {
      const ref = doc(db, "productes", id);
      const snap = await getDoc(ref);
      if (!snap.exists()) return;
      const data = snap.data();
      await updateDoc(ref, { ocult: !data.ocult });
      loadProducts();
    } catch (err) { console.error(err); alert("Error actualizando visibilidad"); }
  }));
}

// FUNCIÓN CORREGIDA: Renderitzar grid de novedades con selector de variantes corregido
function renderProductGridNovedades(products, container) {
  container.innerHTML = "";
  
  products.forEach(p => {
    const variants = p.variants || [];
    const hasVariants = variants.length > 0;
    const mainVariant = hasVariants ? variants[0] : { nom: "", preu: 0, stock: 0, imatges: [], tipus: "" };
    const firstImg = (mainVariant.imatges && mainVariant.imatges[0]) ? mainVariant.imatges[0] : "https://via.placeholder.com/600x400?text=Sin+imagen";
    
    // CORRECCIÓN: Determinar si debe mostrar "Sin variantes" o las variantes
    const shouldShowVariants = hasVariants && variants.length > 1;
    const variantLabel = shouldShowVariants ? (mainVariant.tipus || "Variante") : "Variante";
    
    const card = document.createElement("div");
    card.className = "producte";
    card.innerHTML = `
      <a href="#detalle-producto/${p._docId}" class="product-link">
        <img loading="lazy" src="${firstImg}" alt="${p.nom}">
        <div class="content">
          <h3>${escapeHtml(p.nom || "Producto")}</h3>
        </div>
      </a>
      <div class="product-variant-section">
        <div class="variant-label">${escapeHtml(variantLabel)}</div>
        <div class="variant-selector">
          <select class="variant-select" data-docid="${p._docId}" ${!shouldShowVariants ? 'disabled' : ''}>
            ${!hasVariants ? 
              '<option value="0" selected>Sin variantes</option>' : 
              variants.length === 1 ?
                '<option value="0" selected>Sin variantes</option>' :
                variants.map((v, idx) => 
                  `<option value="${idx}">${escapeHtml(v.nom || `Variante ${idx + 1}`)}</option>`
                ).join('')
            }
          </select>
        </div>
        <div class="meta">
          <div class="price">${formatPrice(Number(mainVariant.preu || 0))}</div>
          <div class="stock" style="color:${mainVariant.stock <= 3 ? '#c0392b' : 'var(--muted)'}">${mainVariant.stock <= 3 ? 'Quedan ' + mainVariant.stock : 'Stock: ' + mainVariant.stock}</div>
        </div>
      </div>
      <div class="producte-botons">
        <button class="btn primary add-to-cart" data-docid="${p._docId}" data-variant="0">Añadir al carrito</button>
      </div>
    `;
    container.appendChild(card);

    // Event listener para el cambio de variante (novedades, solo si hay más de una variante)
    if (shouldShowVariants) {
      const variantSelect = card.querySelector('.variant-select');
      const priceEl = card.querySelector('.price');
      const stockEl = card.querySelector('.stock');
      const addToCartBtn = card.querySelector('.add-to-cart');

      variantSelect.addEventListener('change', function() {
        const variantIndex = parseInt(this.value);
        const selectedVariant = variants[variantIndex];
        
        // Actualizar precio y stock
        priceEl.textContent = formatPrice(Number(selectedVariant.preu || 0));
        
        const stockColor = selectedVariant.stock <= 3 ? '#c0392b' : 'var(--muted)';
        const stockText = selectedVariant.stock <= 3 ? 'Quedan ' + selectedVariant.stock : 'Stock: ' + selectedVariant.stock;
        stockEl.textContent = stockText;
        stockEl.style.color = stockColor;
        
        // Actualizar el data-variant del botón
        addToCartBtn.dataset.variant = variantIndex;
      });
    }

    // Event listener para el botón añadir al carrito (novedades)
    const addToCartBtn = card.querySelector('.add-to-cart');
    addToCartBtn.addEventListener("click", () => {
      const docId = addToCartBtn.dataset.docid;
      const variantIndex = parseInt(addToCartBtn.dataset.variant || 0);
      addToCart(docId, variantIndex, 1);
    });
  });
}

/* ---------------------------
   DETALLE PRODUCTO
   --------------------------- */
async function showProductDetail(docId) {
  detalleContenido.innerHTML = "<p>Cargando producto...</p>";
  try {
    const ref = doc(db, "productes", docId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      detalleContenido.innerHTML = "<p>Producto no encontrado.</p>";
      return;
    }
    const data = { _docId: snap.id, ...snap.data() };
    const variants = data.variants || [];
    const mainVariant = variants[0] || { nom: "", preu: 0, stock: 0, imatges: [], tipus: "" };
    const imgs = (mainVariant.imatges && mainVariant.imatges.length) ? mainVariant.imatges : ["https://via.placeholder.com/800x600?text=Sin+imagen"];
    const variantTypeLabel = escapeHtml(mainVariant.tipus || "Variante");

    // Actualizar breadcrumb con el nombre del producto
    updateBreadcrumb('detalle-producto', data.nom || "Producto");

    detalleContenido.innerHTML = `
      <div class="product-gallery" role="region">
        <div class="main-image-container">
          <img id="main-img" src="${escapeAttr(imgs[0])}" alt="${escapeAttr(data.nom || '')}" />
          <div class="thumbnails" id="thumbnails"></div>
        </div>
        <div class="product-details">
          <h2>${escapeHtml(data.nom || "")}</h2>
          <div class="price" id="detail-price">${formatPrice(Number(mainVariant.preu || 0))}</div>
          <p class="muted">${escapeHtml(data.descripcio || "")}</p>
          <div class="variant-selection">
            <label for="variant-select">${variantTypeLabel}</label>
            <select id="variant-select"></select>
          </div>
          <div class="detail-actions" style="margin-top:0.6rem;">
            <button id="add-to-cart-btn" class="btn primary">Añadir al carrito</button>
          </div>
          <div style="margin-top:0.6rem;color:var(--muted)">ID interno: ${escapeHtml(data.id || '')}</div>
        </div>
      </div>
    `;

    const thumbs = document.getElementById("thumbnails");
    imgs.forEach((u, i) => {
      const im = document.createElement("img");
      im.src = u;
      im.alt = `${data.nom} ${i + 1}`;
      im.className = "thumb" + (i === 0 ? " active" : "");
      im.addEventListener("click", () => {
        document.getElementById("main-img").src = u;
        thumbs.querySelectorAll(".thumb").forEach(t => t.classList.remove("active"));
        im.classList.add("active");
      });
      thumbs.appendChild(im);
    });

    const variantSelect = document.getElementById("variant-select");
    variants.forEach((v, idx) => {
      const opt = document.createElement("option");
      opt.value = idx;
      opt.textContent = v.nom || 'Default';
      variantSelect.appendChild(opt);
    });

    variantSelect.addEventListener("change", () => {
      const v = variants[Number(variantSelect.value)];
      if (!v) return;
      document.getElementById("main-img").src = (v.imatges && v.imatges[0]) ? v.imatges[0] : imgs[0];
      document.getElementById("detail-price").textContent = formatPrice(Number(v.preu || 0));
    });

    document.getElementById("add-to-cart-btn").addEventListener("click", () => {
      const vidx = Number(document.getElementById("variant-select").value || 0);
      addToCart(data._docId, vidx, 1);
    });
  } catch (err) {
    console.error("Error detalle producto:", err);
    detalleContenido.innerHTML = `<p>Error: ${err.message || err}</p>`;
  }
}

/* ---------------------------
   AGREGAR PRODUCTOS (form dinámico) - VERSIÓ CORREGIDA
   --------------------------- */
function buildAddProductForm() {
  if (!formularioProducto) return;
  formularioProducto.innerHTML = `
    <label for="id">ID (código interno)</label>
    <input id="id" type="text" required>
    <label for="nom">Nombre</label>
    <input id="nom" type="text" required>
    <label for="descripcio">Descripción</label>
    <textarea id="descripcio" rows="3"></textarea>
    
    <!-- NOU: Checkbox per a novedades -->
    <div class="form-row" style="align-items: center; gap: 0.5rem;">
      <input id="novedades" type="checkbox" style="width: auto;">
      <label for="novedades" style="margin: 0;">Producto en Novedades</label>
    </div>
    
    <label for="cantidad-variantes">Número de variantes</label>
    <select id="cantidad-variantes">
      <option value="0">0 (sin variantes)</option>
      <option value="1">1</option>
      <option value="2">2</option>
      <option value="3">3</option>
    </select>
    <div id="variantes-container"></div>
    <div class="form-row">
      <button id="btn-guardar-producto" class="btn primary">Guardar producto</button>
      <button id="btn-reset-producto" class="btn secondary" type="button">Reset</button>
    </div>
    <p id="msg-guardar-producto" class="muted"></p>
  `;
  const cantSel = document.getElementById("cantidad-variantes");
  const cont = document.getElementById("variantes-container");
  cantSel.addEventListener("change", () => generateVariantFields(cantSel.value, cont));
  generateVariantFields(cantSel.value, cont);

  document.getElementById("btn-guardar-producto").addEventListener("click", async (e) => {
    e.preventDefault();
    try {
      const idIntern = document.getElementById("id").value.trim();
      const nom = document.getElementById("nom").value.trim();
      const descripcio = document.getElementById("descripcio").value.trim();
      
      // CORRECCIÓ: Llegir directament el valor del checkbox sense verificacions redundants
      const novedades = document.getElementById("novedades").checked;
      
      const cant = Number(document.getElementById("cantidad-variantes").value || 0);
      const variants = [];
      if (cant === 0) {
        const preu = Number(document.getElementById("preu-default")?.value || 0);
        const stock = Number(document.getElementById("stock-default")?.value || 0);
        const imgs = [
          document.getElementById("imatge-1-default")?.value.trim(),
          document.getElementById("imatge-2-default")?.value.trim(),
          document.getElementById("imatge-3-default")?.value.trim()
        ].filter(Boolean);
        variants.push({ tipus: "", nom: "", preu, stock, imatges: imgs });
      } else {
        for (let i = 0; i < cant; i++) {
          const tipus = document.getElementById(`tipus-variant-${i}`)?.value.trim() || "";
          const nomV = document.getElementById(`nom-variant-${i}`)?.value.trim() || "";
          const preu = Number(document.getElementById(`preu-variant-${i}`)?.value || 0);
          const stock = Number(document.getElementById(`stock-variant-${i}`)?.value || 0);
          const imgs = [
            document.getElementById(`imatge-1-variant-${i}`)?.value.trim(),
            document.getElementById(`imatge-2-variant-${i}`)?.value.trim(),
            document.getElementById(`imatge-3-variant-${i}`)?.value.trim()
          ].filter(Boolean);
          variants.push({ tipus, nom: nomV, preu, stock, imatges: imgs });
        }
      }
      
      // CORRECCIÓ: Assegurar que el camp novedades sempre és un booleà
      const docData = { 
        id: idIntern, 
        nom, 
        descripcio, 
        variants, 
        ocult: false, 
        novedades: Boolean(novedades),
        createdAt: new Date() 
      };
      
      await addDoc(collection(db, "productes"), docData);
      document.getElementById("msg-guardar-producto").textContent = "Producto guardado correctamente.";
      formularioProducto.reset();
      generateVariantFields(0, document.getElementById("variantes-container"));
      loadProducts();
      setTimeout(() => document.getElementById("msg-guardar-producto").textContent = "", 2000);
    } catch (err) {
      console.error("Error guardar producto:", err);
      alert("Error al guardar producto: " + (err.message || err));
    }
  });
  document.getElementById("btn-reset-producto").addEventListener("click", () => formularioProducto.reset());
}

function generateVariantFields(n, container, prefix = "") {
  container.innerHTML = "";
  const cnt = Number(n) || 0;
  if (cnt === 0) {
    const d = document.createElement("div");
    d.innerHTML = `
      <h4>Producto sin variantes</h4>
      <label>Precio</label><input id="${prefix}preu-default" type="number" step="0.01" value="0">
      <label>Stock</label><input id="${prefix}stock-default" type="number" value="0">
      <label>Imagen principal (URL)</label><input id="${prefix}imatge-1-default" type="url" placeholder="https://...">
      <label>Imagen secundaria (opcional)</label><input id="${prefix}imatge-2-default" type="url">
      <label>Imagen terciaria (opcional)</label><input id="${prefix}imatge-3-default" type="url">
    `;
    container.appendChild(d);
    return;
  }
  for (let i = 0; i < cnt; i++) {
    const d = document.createElement("div");
    d.className = "variant";
    d.innerHTML = `
      <h4>Variante ${i + 1}</h4>
      <label>Tipo</label>
      <input id="${prefix}tipus-variant-${i}" type="text" placeholder="Ej. Color, Talla, Material">
      <label>Nombre variante</label>
      <input id="${prefix}nom-variant-${i}" type="text">
      <label>Precio</label><input id="${prefix}preu-variant-${i}" type="number" step="0.01" value="0">
      <label>Stock</label><input id="${prefix}stock-variant-${i}" type="number" value="0">
      <label>Imagen 1 (URL)</label><input id="${prefix}imatge-1-variant-${i}" type="url" placeholder="https://...">
      <label>Imagen 2 (opcional)</label><input id="${prefix}imatge-2-variant-${i}" type="url">
      <label>Imagen 3 (opcional)</label><input id="${prefix}imatge-3-variant-${i}" type="url">
    `;
    container.appendChild(d);
  }
}

/* ---------------------------
   EDIT PRODUCT (fill & save)
   --------------------------- */
async function loadEditForm(docId) {
  if (!formularioEditar) return;
  formularioEditar.innerHTML = `<p>Cargando producto...</p>`;
  try {
    const ref = doc(db, "productes", docId);
    const snap = await getDoc(ref);
    if (!snap.exists()) { formularioEditar.innerHTML = "<p>No encontrado</p>"; return; }
    const data = { _docId: snap.id, ...snap.data() };

    // Actualizar breadcrumb con el nombre del producto
    updateBreadcrumb('editar-producto', data.nom || "Producto");

    formularioEditar.innerHTML = `
      <label>ID interno</label>
      <input id="edit-id" type="text" value="${escapeAttr(data.id || '')}">
      <label>Nombre</label>
      <input id="edit-nom" type="text" value="${escapeAttr(data.nom || '')}">
      <label>Descripción</label>
      <textarea id="edit-descripcio">${escapeHtml(data.descripcio || '')}</textarea>
      
      <!-- NOU: Checkbox per a novedades a l'edició -->
      <div class="form-row" style="align-items: center; gap: 0.5rem;">
        <input id="edit-novedades" type="checkbox" ${data.novedades ? "checked" : ""} style="width: auto;">
        <label for="edit-novedades" style="margin: 0;">Producto en Novedades</label>
      </div>
      
      <label>Oculto para clientes</label>
      <input id="edit-ocult" type="checkbox" ${data.ocult ? "checked" : ""}>
      <label>Número de variantes</label>
      <select id="edit-cantidad-variantes">
        <option value="0">0</option>
        <option value="1">1</option>
        <option value="2">2</option>
        <option value="3">3</option>
      </select>
      <div id="edit-variantes-container"></div>
      <div class="form-row">
        <button id="btn-guardar-editar" class="btn primary">Guardar cambios</button>
      </div>
      <p id="msg-edit"></p>
    `;

    const editCant = document.getElementById("edit-cantidad-variantes");
    const editCont = document.getElementById("edit-variantes-container");
    editCant.value = (data.variants ? data.variants.length : 0);
    generateVariantFields(editCant.value, editCont, "edit-");

    setTimeout(() => {
      const variants = data.variants || [];
      variants.forEach((v, i) => {
        const tipus = document.getElementById(`edit-tipus-variant-${i}`);
        const nom = document.getElementById(`edit-nom-variant-${i}`);
        const preu = document.getElementById(`edit-preu-variant-${i}`);
        const stock = document.getElementById(`edit-stock-variant-${i}`);
        const img1 = document.getElementById(`edit-imatge-1-variant-${i}`);
        const img2 = document.getElementById(`edit-imatge-2-variant-${i}`);
        const img3 = document.getElementById(`edit-imatge-3-variant-${i}`);
        if (tipus) tipus.value = v.tipus || "";
        if (nom) nom.value = v.nom || "";
        if (preu) preu.value = Number(v.preu || 0);
        if (stock) stock.value = Number(v.stock || 0);
        if (img1) img1.value = v.imatges && v.imatges[0] || "";
        if (img2) img2.value = v.imatges && v.imatges[1] || "";
        if (img3) img3.value = v.imatges && v.imatges[2] || "";
      });
    }, 120);

    editCant.addEventListener("change", () => generateVariantFields(editCant.value, editCont, "edit-"));

    document.getElementById("btn-guardar-editar").addEventListener("click", async (e) => {
      e.preventDefault();
      try {
        const idIntern = document.getElementById("edit-id").value.trim();
        const nom = document.getElementById("edit-nom").value.trim();
        const descripcio = document.getElementById("edit-descripcio").value.trim();
        const ocult = document.getElementById("edit-ocult").checked;
        
        // CORRECCIÓ: Llegir directament el valor del checkbox
        const novedades = document.getElementById("edit-novedades").checked;
        
        const cant = Number(document.getElementById("edit-cantidad-variantes").value || 0);
        const variants = [];
        if (cant === 0) {
          const preu = Number(document.getElementById("edit-preu-default")?.value || 0);
          const stock = Number(document.getElementById("edit-stock-default")?.value || 0);
          const imgs = [
            document.getElementById("edit-imatge-1-default")?.value.trim(),
            document.getElementById("edit-imatge-2-default")?.value.trim(),
            document.getElementById("edit-imatge-3-default")?.value.trim()
          ].filter(Boolean);
          variants.push({ tipus: "", nom: "", preu, stock, imatges: imgs });
        } else {
          for (let i = 0; i < cant; i++) {
            const tipus = document.getElementById(`edit-tipus-variant-${i}`)?.value.trim() || "";
            const nomV = document.getElementById(`edit-nom-variant-${i}`)?.value.trim() || "";
            const preu = Number(document.getElementById(`edit-preu-variant-${i}`)?.value || 0);
            const stock = Number(document.getElementById(`edit-stock-variant-${i}`)?.value || 0);
            const imgs = [
              document.getElementById(`edit-imatge-1-variant-${i}`)?.value.trim(),
              document.getElementById(`edit-imatge-2-variant-${i}`)?.value.trim(),
              document.getElementById(`edit-imatge-3-variant-${i}`)?.value.trim()
            ].filter(Boolean);
            variants.push({ tipus, nom: nomV, preu, stock, imatges: imgs });
          }
        }
        await updateDoc(doc(db, "productes", data._docId), { 
          id: idIntern, 
          nom, 
          descripcio, 
          variants, 
          ocult, 
          novedades: Boolean(novedades)
        });
        document.getElementById("msg-edit").textContent = "Producto actualizado.";
        loadProducts();
        setTimeout(() => document.getElementById("msg-edit").textContent = "", 1800);
      } catch (err) {
        console.error("Error editando producto:", err);
        alert("Error actualizando: " + (err.message || err));
      }
    });
  } catch (err) {
    console.error("Error cargando editar:", err);
    formularioEditar.innerHTML = `<p>Error: ${err.message || err}</p>`;
  }
}

/* ---------------------------
   SLIDER CABECERA (tienda y detalle)
   --------------------------- */
let headerImgs = [];
let headerInterval = null;
async function loadHeaderImages() {
  try {
    const snap = await getDocs(collection(db, "imagenesCabeceraTienda"));
    headerImgs = [];
    snap.forEach(d => headerImgs.push({ _docId: d.id, url: d.data().url }));
    renderHeaderSlider();
  } catch (err) {
    console.error("Error cargando header images:", err);
  }
}
async function loadHeaderImagesDetalle() {
  try {
    const snap = await getDocs(collection(db, "imagenesCabeceraTienda"));
    headerImgs = [];
    snap.forEach(d => headerImgs.push({ _docId: d.id, url: d.data().url }));
    renderHeaderSliderDetalle();
  } catch (err) {
    console.error("Error cargando header images (detalle):", err);
  }
}
function renderHeaderSlider() {
  if (!cabeceraSlider) return;
  cabeceraSlider.innerHTML = "";
  headerImgs.forEach((it, idx) => {
    const img = document.createElement("img");
    img.src = it.url;
    img.alt = "Cabecera " + (idx + 1);
    if (idx === 0) img.classList.add("active");
    cabeceraSlider.appendChild(img);
  });
  if (headerInterval) clearInterval(headerInterval);
  if (headerImgs.length <= 1) return;
  let idx = 0;
  headerInterval = setInterval(() => {
    const nodes = cabeceraSlider.querySelectorAll("img");
    if (!nodes.length) return;
    nodes.forEach(n => n.classList.remove("active", "prev"));
    nodes[idx].classList.add("prev");
    idx = (idx + 1) % nodes.length;
    nodes[idx].classList.add("active");
  }, 4000);
}
function renderHeaderSliderDetalle() {
  if (!cabeceraSliderDetalle) return;
  cabeceraSliderDetalle.innerHTML = "";
  headerImgs.forEach((it, idx) => {
    const img = document.createElement("img");
    img.src = it.url;
    img.alt = "Cabecera " + (idx + 1);
    if (idx === 0) img.classList.add("active");
    cabeceraSliderDetalle.appendChild(img);
  });
  if (headerInterval) clearInterval(headerInterval);
  if (headerImgs.length <= 1) return;
  let idx = 0;
  headerInterval = setInterval(() => {
    const nodes = cabeceraSliderDetalle.querySelectorAll("img");
    if (!nodes.length) return;
    nodes.forEach(n => n.classList.remove("active", "prev"));
    nodes[idx].classList.add("prev");
    idx = (idx + 1) % nodes.length;
    nodes[idx].classList.add("active");
  }, 4000);
}

/* Admin: cargar lista imágenes cabecera y permitir eliminar */
async function loadHeaderList() {
  if (!cabeceraLista) return;
  cabeceraLista.innerHTML = "<p>Cargando imágenes...</p>";
  try {
    const snap = await getDocs(collection(db, "imagenesCabeceraTienda"));
    cabeceraLista.innerHTML = "";
    snap.forEach(d => {
      const url = d.data().url;
      const div = document.createElement("div");
      div.className = "cab-item";
      div.innerHTML = `<img src="${escapeAttr(url)}" alt="img" style="max-width:200px;border-radius:8px;margin-right:10px;"><button class="btn secondary" data-id="${d.id}">Eliminar</button>`;
      cabeceraLista.appendChild(div);
      div.querySelector("button").addEventListener("click", async () => {
        if (!confirm("¿Eliminar imagen?")) return;
        try {
          await deleteDoc(doc(db, "imagenesCabeceraTienda", d.id));
          loadHeaderList();
          loadHeaderImages();
          loadHeaderImagesDetalle();
        } catch (err) {
          console.error("Error eliminar imagen:", err);
          alert("Error al eliminar la imagen");
        }
      });
    });
  } catch (err) {
    console.error("Error cargar lista cabecera:", err);
    cabeceraLista.innerHTML = `<p>Error: ${err.message || err}</p>`;
  }
}

/* Añadir imagen cabecera (solo admin) */
if (formularioImagenesCabecera) {
  formularioImagenesCabecera.addEventListener("submit", async (e) => {
    e.preventDefault();
    const url = document.getElementById("cabecera-url").value.trim();
    if (!url || !url.startsWith("https://res.cloudinary.com")) {
      return alert("Introduce una URL válida de Cloudinary");
    }
    try {
      await addDoc(collection(db, "imagenesCabeceraTienda"), { url });
      formularioImagenesCabecera.reset();
      loadHeaderList();
      loadHeaderImages();
      loadHeaderImagesDetalle();
      alert("Imagen agregada");
    } catch (err) {
      console.error("Error agregar imagen cabecera:", err);
      alert("Error al guardar la imagen: " + (err.message || err));
    }
  });
}

/* ---------------------------
   CONFIGURACIÓ (Carregar i editar)
   --------------------------- */
async function loadConfig() {
  try {
    const ref = doc(db, "config", "general");
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data();
      config.envioEstandar = Number(data.enviament || 5.00);
      config.enviamentGratisDesDe = Number(data.enviamentGratisDesDe || 50.00);
      config.sliderPromocionalTexto = data.sliderPromociones || "";
      config.videoUrl = data.videoUrl || "";
      config.logoUrl = data.logoUrl || "";
      // NOU: Carregar URLs de les imatges
      config.imagenNovedades = data.imagenNovedades || "";
      config.imagenColeccion = data.imagenColeccion || "";
      // NOU: Carregar les noves imatges
      config.imagenEspecialidad = data.imagenEspecialidad || "";
      config.imagenPromocion = data.imagenPromocion || "";
      // NOU: Carregar configuració de "Quiénes somos"
      config.imagenQuienesSomos = data.imagenQuienesSomos || "";
      config.tituloQuienesSomos = data.tituloQuienesSomos || "";
      config.textoQuienesSomos = data.textoQuienesSomos || "";
      // NOU: Carregar configuració de descomptes
      config.promocionCompraSuperiorA = Number(data.promocionCompraSuperiorA || 0);
      config.porcentajeDescuento = Number(data.porcentajeDescuento || 0);
    } else {
      // Si no existeix, el creem amb valors per defecte
      await setDoc(ref, { 
        enviament: 5.00, 
        enviamentGratisDesDe: 50.00,
        sliderPromociones: "¡Envío gratis a partir de 50€!",
        videoUrl: "",
        logoUrl: "",
        // NOU: Valors per defecte per les imatges
        imagenNovedades: "",
        imagenColeccion: "",
        // NOU: Valors per defecte per les noves imatges
        imagenEspecialidad: "",
        imagenPromocion: "",
        // NOU: Valors per defecte per "Quiénes somos"
        imagenQuienesSomos: "",
        tituloQuienesSomos: "",
        textoQuienesSomos: "",
        // NOU: Valors per defecte per descomptes
        promocionCompraSuperiorA: 0,
        porcentajeDescuento: 0
      });
    }
    updateUIFromConfig();
  } catch (err) {
    console.error("Error cargando config:", err);
  }
}

async function loadConfigForm() {
  await loadConfig();
  if (formularioConfiguracion) {
    document.getElementById("logo-url").value = config.logoUrl;
    document.getElementById("video-url").value = config.videoUrl;
    document.getElementById("envio-valor").value = config.envioEstandar;
    document.getElementById("envio-gratis-desde").value = config.enviamentGratisDesDe;
    document.getElementById("slider-promociones").value = config.sliderPromocionalTexto;
    // NOU: Carregar els camps d'imatges
    document.getElementById("imagen-novedades-url").value = config.imagenNovedades;
    document.getElementById("imagen-coleccion-url").value = config.imagenColeccion;
    // NOU: Carregar els nous camps
    document.getElementById("imagen-especialidad-url").value = config.imagenEspecialidad;
    document.getElementById("imagen-promocion-url").value = config.imagenPromocion;
    // NOU: Carregar camps de "Quiénes somos"
    document.getElementById("imagen-quienes-somos").value = config.imagenQuienesSomos;
    document.getElementById("titulo-quienes-somos").value = config.tituloQuienesSomos;
    document.getElementById("texto-quienes-somos").value = config.textoQuienesSomos;
    // NOU: Carregar camps de descomptes
    document.getElementById("promocion-compra-superior").value = config.promocionCompraSuperiorA;
    document.getElementById("porcentaje-descuento").value = config.porcentajeDescuento;
  }
}

if (formularioConfiguracion) {
  formularioConfiguracion.addEventListener("submit", async (e) => {
    e.preventDefault();
    const newConfig = {
        logoUrl: document.getElementById("logo-url").value.trim(),
        videoUrl: document.getElementById("video-url").value.trim(),
        // NOU: Afegir les URLs d'imatges
        imagenNovedades: document.getElementById("imagen-novedades-url").value.trim(),
        imagenColeccion: document.getElementById("imagen-coleccion-url").value.trim(),
        // NOU: Afegir les noves URLs
        imagenEspecialidad: document.getElementById("imagen-especialidad-url").value.trim(),
        imagenPromocion: document.getElementById("imagen-promocion-url").value.trim(),
        // NOU: Afegir configuració de "Quiénes somos"
        imagenQuienesSomos: document.getElementById("imagen-quienes-somos").value.trim(),
        tituloQuienesSomos: document.getElementById("titulo-quienes-somos").value.trim(),
        textoQuienesSomos: document.getElementById("texto-quienes-somos").value.trim(),
        // NOU: Afegir configuració de descomptes
        promocionCompraSuperiorA: Number(document.getElementById("promocion-compra-superior").value || 0),
        porcentajeDescuento: Number(document.getElementById("porcentaje-descuento").value || 0),
        enviament: Number(document.getElementById("envio-valor").value || 0),
        enviamentGratisDesDe: Number(document.getElementById("envio-gratis-desde").value || 0),
        sliderPromociones: document.getElementById("slider-promociones").value.trim()
    };
    try {
      await setDoc(doc(db, "config", "general"), newConfig);
      // Actualitzem la configuració local
      config.logoUrl = newConfig.logoUrl;
      config.videoUrl = newConfig.videoUrl;
      config.imagenNovedades = newConfig.imagenNovedades;
      config.imagenColeccion = newConfig.imagenColeccion;
      config.imagenEspecialidad = newConfig.imagenEspecialidad;
      config.imagenPromocion = newConfig.imagenPromocion;
      config.imagenQuienesSomos = newConfig.imagenQuienesSomos;
      config.tituloQuienesSomos = newConfig.tituloQuienesSomos;
      config.textoQuienesSomos = newConfig.textoQuienesSomos;
      // NOU: Actualitzar configuració de descomptes
      config.promocionCompraSuperiorA = newConfig.promocionCompraSuperiorA;
      config.porcentajeDescuento = newConfig.porcentajeDescuento;
      config.envioEstandar = newConfig.enviament;
      config.enviamentGratisDesDe = newConfig.enviamentGratisDesDe;
      config.sliderPromocionalTexto = newConfig.sliderPromociones;
      
      updateUIFromConfig(); // Actualitzem la UI amb les noves dades
      document.getElementById("msg-config").textContent = "Configuración guardada.";
      setTimeout(() => document.getElementById("msg-config").textContent = "", 2000);
      if (location.hash === "#carrito") renderCart();
    } catch (err) {
      console.error("Error guardando config:", err);
      alert("Error al guardar: " + (err.message || err));
    }
  });
}

/* ---------------------------
   FORMULARI DE CONTACTE (VERSIÓ DEFINITIVA)
   --------------------------- */
if (contactForm) {
  contactForm.addEventListener('submit', async function(event) {
    event.preventDefault();
    
    console.log('📧 Processant formulari de contacte amb Resend...');

    const contactName = document.getElementById('contact-name').value.trim();
    const contactEmail = document.getElementById('contact-email').value.trim();
    const contactMessage = document.getElementById('contact-message').value.trim();

    // Validacions bàsiques
    if (!contactName || !contactEmail || !contactMessage) {
      alert('Por favor, completa todos los campos obligatorios.');
      return;
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contactEmail)) {
      alert('Por favor, introduce un email válido.');
      return;
    }

    // Mostrar loading
    const submitBtn = contactForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Enviando...';
    submitBtn.disabled = true;

    // Enviar amb Resend
    const success = await enviarEmailResend({
      nombre: contactName,
      email: contactEmail,
      mensaje: contactMessage
    });

    // Restaurar botó
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;

    if (success) {
      console.log('✅ Email de contacte enviat correctament a admin');
      contactForm.reset();
      contactPopup.classList.remove('hidden');
    } else {
      alert('Error al enviar el mensaje. Por favor, intenta de nuevo.');
    }
  });
}

/* ---------------------------
   SISTEMA DE DESCUENTOS (HÍBRIDO MEJORADO)
   --------------------------- */

// FUNCIÓN QUE FALTABA - Generar codi alfanumèric de 5 dígits
function generarCodigoDescuento() {
  const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let codigo = '';
  for (let i = 0; i < 5; i++) {
    codigo += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
  }
  return codigo;
}

// Funciones Firebase (preparadas para futuro)
async function guardarCuponFirestore(cupon, emailCliente = null) {
  try {
    // TODO: Cuando quieras implementar Firebase, descomenta esto:
    /*
    await addDoc(collection(db, "cupones"), {
      ...cupon,
      email: emailCliente,
      fechaCreacion: new Date().toISOString(),
      fechaCaducidad: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    });
    */
    console.log('Cupón preparado para Firestore:', cupon.codigo);
    return true;
  } catch (error) {
    console.error('Error guardando cupón en Firestore:', error);
    return false;
  }
}

async function buscarCuponFirestore(codigo, emailCliente = null) {
  try {
    // TODO: Cuando quieras implementar Firebase, descomenta esto:
    /*
    const q = query(
      collection(db, "cupones"), 
      where("codigo", "==", codigo),
      where("usado", "==", false)
    );
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      const cupon = doc.data();
      // Si tiene email, verificar que coincida
      if (!cupon.email || cupon.email === emailCliente) {
        return cupon;
      }
    }
    */
    return null;
  } catch (error) {
    console.error('Error buscando cupón en Firestore:', error);
    return null;
  }
}

// Función mejorada para generar cupones
async function generarCuponHibrido(descuento) {
  const codigo = generarCodigoDescuento();
  const cupon = {
    codigo: codigo,
    descuento: descuento,
    usado: false,
    fecha: new Date().toISOString(),
    fechaCaducidad: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 días
  };
  
  // ✅ GUARDAR EN AMBOS SISTEMAS (localStorage inmediato, Firestore async)
  guardarCuponLocalStorage(cupon);
  
  // Firestore en segundo plano (no bloqueante)
  guardarCuponFirestore(cupon).catch(error => 
    console.error('Error background Firestore:', error)
  );
  
  return cupon;
}

function guardarCuponLocalStorage(cupon) {
  const cupones = JSON.parse(localStorage.getItem('miuart_cupones') || '[]');
  // Evitar duplicados
  const existe = cupones.find(c => c.codigo === cupon.codigo);
  if (!existe) {
    cupones.push(cupon);
    localStorage.setItem('miuart_cupones', JSON.stringify(cupones));
  }
}

// Función mejorada para mostrar popup (usa la nueva generación)
async function mostrarPopupDescuento(subtotal) {
  if (descuentoPopup && descuentoMensaje && codigoDescuento) {
    const cupon = await generarCuponHibrido(config.porcentajeDescuento);
    
    descuentoMensaje.innerHTML = `Tu compra ha sido superior a <strong>${config.promocionCompraSuperiorA}€</strong>.<br>
                                 Has conseguido un cupón de descuento del <strong>${config.porcentajeDescuento}%</strong> en tu siguiente compra.`;
    
    codigoDescuento.textContent = cupon.codigo;
    descuentoPopup.classList.remove('hidden');
    
    console.log('Cupón generado:', cupon.codigo);
  }
}

// Comprovar si s'ha de mostrar el descompte (MANTENIDO)
function comprobarDescuento(subtotal) {
  if (config.promocionCompraSuperiorA > 0 && 
      config.porcentajeDescuento > 0 && 
      subtotal >= config.promocionCompraSuperiorA) {
    mostrarPopupDescuento(subtotal);
  }
}

// Event listener per tancar el pop-up de descompte (MANTENIDO)
if (descuentoPopupClose) {
  descuentoPopupClose.addEventListener('click', () => {
    if (descuentoPopup) {
      descuentoPopup.classList.add('hidden');
    }
  });
}

/* ---------------------------
   SISTEMA DE CUPONS AL CARRITO (HÍBRIDO MEJORADO)
   --------------------------- */

// Función mejorada para validar cupones
async function validarCupon() {
  const codigo = cuponInput.value.trim().toUpperCase();
  
  if (!codigo) {
    cuponMensaje.textContent = 'Por favor, introduce un código';
    cuponMensaje.className = 'cupon-mensaje error';
    return;
  }
  
  // ✅ BUSQUEDA HÍBRIDA MEJORADA
  let cupon = null;
  
  // Primero buscar en localStorage (rápido)
  const cuponLocal = buscarCuponLocalStorage(codigo);
  if (cuponLocal && !cuponLocal.usado) {
    cupon = cuponLocal;
  } else {
    // Si no está en localStorage, intentar en Firestore
    try {
      const cuponFirestore = await buscarCuponFirestore(codigo);
      if (cuponFirestore && !cuponFirestore.usado) {
        cupon = cuponFirestore;
        // Guardar localmente para próximas búsquedas
        guardarCuponLocalStorage(cuponFirestore);
      }
    } catch (error) {
      console.log("Firestore no disponible, continuando con localStorage...");
    }
  }
  
  if (!cupon) {
    cuponMensaje.textContent = 'Código no válido';
    cuponMensaje.className = 'cupon-mensaje error';
    return;
  }
  
  if (cupon.usado) {
    cuponMensaje.textContent = 'Este código ya ha sido utilizado';
    cuponMensaje.className = 'cupon-mensaje error';
    return;
  }
  
  // Verificar caducidad si existe
  if (cupon.fechaCaducidad && new Date(cupon.fechaCaducidad) < new Date()) {
    cuponMensaje.textContent = 'Este código ha expirado';
    cuponMensaje.className = 'cupon-mensaje error';
    return;
  }
  
  // Cupón válido → APLICAR DESCUENTO
  cuponAplicado = cupon;
  descuentoAplicado = 0;

  // ✅ MARCAR COMO USADO EN AMBOS SISTEMAS
  await marcarCuponUtilizadoHibrido(codigo);

  // UI
  cuponMensaje.textContent = `Cupón válido: ${cupon.descuento}% de descuento aplicado`;
  cuponMensaje.className = 'cupon-mensaje success';
  validarCuponBtn.classList.add('hidden');
  cuponValidado.classList.remove('hidden');

  // Actualizar carrito
  aplicarDescuentoCarrito();
  renderCart();

  console.log('Cupón aplicado y marcado como usado:', cupon.codigo);
}

// Función auxiliar para buscar en localStorage
function buscarCuponLocalStorage(codigo) {
  const cupones = JSON.parse(localStorage.getItem('miuart_cupones') || '[]');
  return cupones.find(c => c.codigo === codigo);
}

// Función mejorada para marcar cupones como usados
async function marcarCuponUtilizadoHibrido(codigo) {
  // Marcar en localStorage
  const cupones = JSON.parse(localStorage.getItem('miuart_cupones') || '[]');
  const cuponIndex = cupones.findIndex(c => c.codigo === codigo);
  
  if (cuponIndex !== -1) {
    cupones[cuponIndex].usado = true;
    cupones[cuponIndex].fechaUso = new Date().toISOString();
    localStorage.setItem('miuart_cupones', JSON.stringify(cupones));
  }
  
  // Marcar en Firestore (en segundo plano)
  try {
    // TODO: Cuando implementes Firebase, descomenta esto:
    /*
    const q = query(collection(db, "cupones"), where("codigo", "==", codigo));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const docRef = doc(db, "cupones", querySnapshot.docs[0].id);
      await updateDoc(docRef, {
        usado: true,
        fechaUso: new Date().toISOString()
      });
    }
    */
  } catch (error) {
    console.error('Error marcando cupón en Firestore:', error);
  }
}

// Función para aplicar el descuento al carrito (MANTENIDA)
function aplicarDescuentoCarrito() {
  if (!cuponAplicado) return;
  
  let subtotal = 0;
  carrito.forEach(item => {
    subtotal += Number(item.precio || 0) * (item.cantidad || 0);
  });
  
  descuentoAplicado = subtotal * (cuponAplicado.descuento / 100);
}

// Función para resetear el estado del cupón (MANTENIDA)
function resetearCupon() {
  cuponAplicado = null;
  descuentoAplicado = 0;
  
  if (cuponInput) cuponInput.value = '';
  if (validarCuponBtn) validarCuponBtn.classList.remove('hidden');
  if (cuponValidado) cuponValidado.classList.add('hidden');
  if (cuponMensaje) {
    cuponMensaje.textContent = '';
    cuponMensaje.className = 'cupon-mensaje';
  }
}

// Inicialización del sistema de cupones (MANTENIDA)
function initCuponSystem() {
  if (validarCuponBtn) {
    validarCuponBtn.addEventListener('click', validarCupon);
  }
  
  if (cuponInput) {
    cuponInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') validarCupon();
    });
  }
}

/* ---------------------------
   SISTEMA DE CONTACTO CON RESEND
   --------------------------- */
async function enviarEmailResend(datosContacto) {
  try {
    console.log('📤 Enviant email de contacte via Netlify...', datosContacto);

    // URL de la teva Netlify Function (REEMPLAÇA amb la teva URL real)
    const NETLIFY_FUNCTION_URL = 'https://miuartclientes.netlify.app/.netlify/functions/enviar-contacto';

    const response = await fetch(NETLIFY_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        nombre: datosContacto.nombre,
        email: datosContacto.email,
        mensaje: datosContacto.mensaje,
        volNewsletter: document.getElementById('newsletterCheck')?.checked || false
})
    });

    // Verificar resposta
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error del servidor: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    if (result.success) {
      console.log('✅ Email de contacte enviat correctament:', result);
      return true;
    } else {
      throw new Error(result.error || 'Error desconegut del servidor');
    }
    
  } catch (error) {
    console.error('❌ Error enviant email amb Netlify:', error);
    
    // Missatges d'error específics
    if (error.message.includes('Failed to fetch')) {
      console.error('❌ Error de connexió - assegura\'t que la Netlify Function està desplegada');
    } else if (error.message.includes('404')) {
      console.error('❌ URL incorrecta - verifica la URL de la Netlify Function');
    }
    
    return false;
  }
}


function generarHTMLContacto(datos) {
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Nuevo Mensaje de Contacto - MiUArt</title>
      <style>
        body { font-family: Arial, sans-serif; background:#f4f4f4; margin:0; padding:0; }
        .container { max-width:600px; margin:20px auto; background:white; border-radius:8px; overflow:hidden; box-shadow:0 0 10px rgba(0,0,0,0.1); }
        .header { background:#e9acc8; color:white; padding:20px; text-align:center; }
        .header h1 { margin:0; font-size:24px; }
        .content { padding:25px; }
        .section { margin-bottom:20px; }
        .section h2 { color:#e9acc8; border-bottom:1px solid #eee; padding-bottom:8px; font-size:18px; }
        .info-item { margin-bottom:12px; }
        .label { font-weight:bold; color:#555; display:inline-block; width:80px; }
        .message-box { background:#f8f9fa; border:1px solid #e9ecef; border-radius:8px; padding:15px; margin:15px 0; }
        .footer { background:#f8f9fa; padding:15px; text-align:center; font-size:12px; color:#666; }
        .action-btn { background:#e9acc8; color:white; padding:8px 16px; text-decoration:none; border-radius:5px; display:inline-block; margin:5px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📧 Nuevo Mensaje de Contacto</h1>
          <p>Has recibido un nuevo mensaje desde MiUArt</p>
        </div>
        
        <div class="content">
          <div class="section">
            <h2>Información del Contacto</h2>
            <div class="info-item">
              <span class="label">Nombre:</span> ${escapeHtml(datos.nombre)}
            </div>
            <div class="info-item">
              <span class="label">Email:</span> ${escapeHtml(datos.email)}
            </div>
            <div class="info-item">
              <span class="label">Fecha:</span> ${new Date().toLocaleString('es-ES')}
            </div>
          </div>
          
          <div class="section">
            <h2>Mensaje</h2>
            <div class="message-box">
              ${escapeHtml(datos.mensaje).replace(/\n/g, '<br>')}
            </div>
          </div>

          <div style="text-align:center; margin:20px 0;">
            <a href="mailto:${escapeHtml(datos.email)}" class="action-btn">📧 Responder</a>
            <a href="https://miuart.com/admin" class="action-btn">🔧 Panel Admin</a>
          </div>
        </div>

        <div class="footer">
          <p>© 2025 MiUArt | Sistema de Contacto Automático</p>
          <p><small>Email enviado via Resend</small></p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/* -------------------------------------------------
   CONFIRMACIÓ AL CLIENT - HTML GENERAT AL JS (FINAL)
   ------------------------------------------------- */
async function enviarConfirmacionCliente(comandaData, comandaId) {
  try {
  // === PRODUCTES HTML ===
  let productosHTML = `
    <table style="width:100%; border-collapse:collapse; margin:15px 0; font-size:14px;">
    <thead>
      <tr style="background:#f8f9fa;">
      <th style="text-align:left; padding:10px; font-weight:bold;">Producto</th>
      <th style="text-align:left; padding:10px; font-weight:bold;">Variante</th>
      <th style="text-align:center; padding:10px; font-weight:bold;">Cant.</th>
      <th style="text-align:right; padding:10px; font-weight:bold;">Precio</th>
      </tr>
    </thead>
    <tbody>
  `;

  for (const p of comandaData.productos) {
    const subtotal = p.precio * p.cantidad;
    productosHTML += `
      <tr>
      <td style="padding:10px; border-bottom:1px solid #eee; font-weight:600;">${p.nombre}</td>
      <td style="padding:10px; border-bottom:1px solid #eee;">${p.variante}</td>
      <td style="padding:10px; border-bottom:1px solid #eee; text-align:center;">${p.cantidad}</td>
      <td style="padding:10px; border-bottom:1px solid #eee; text-align:right;">${formatPrice(p.precio)}</td>
      </tr>
      <tr style="background:#fdf2f8;">
      <td colspan="3" style="padding:8px 10px; text-align:right; font-weight:500; color:#d63384;">Subtotal</td>
      <td style="padding:8px 10px; text-align:right; font-weight:600; color:#d63384;">${formatPrice(subtotal)}</td>
      </tr>
    `;
  }

  productosHTML += `</tbody></table>`;

  // === CUPÓ: NOMÉS LLEGIR, NO GENERAR ===
  let cuponHTML = '';
  const cupones = JSON.parse(localStorage.getItem('miuart_cupones') || '[]');
  const ultimo = cupones.length > 0 ? cupones[cupones.length - 1] : null;
  if (ultimo && !ultimo.usado) {
    cuponHTML = `
      <div style="background:#d4edda; border:1px solid #c3e6cb; border-radius:8px; padding:15px; text-align:center; margin:20px 0;">
      <h3 style="margin:0 0 10px; color:#155724; font-size:18px;">¡Cupón para tu próxima compra!</h3>
      <p style="margin:5px 0;">Has ganado un <strong>${ultimo.descuento}%</strong> por superar ${formatPrice(config.promocionCompraSuperiorA)}.</p>
      <div style="font-size:24px; font-weight:bold; color:#28a745; background:white; padding:8px 16px; border-radius:6px; display:inline-block; margin:8px 0;">
        ${ultimo.codigo}
      </div>
      </div>
    `;
  }

  // === DADES CLIENT ===
  const nombre = `${comandaData.cliente.nombre} ${comandaData.cliente.apellidos}`.trim();
  const direccion = [comandaData.cliente.direccion, comandaData.cliente.infoAdicional, `${comandaData.cliente.codigoPostal} ${comandaData.cliente.ciudad}`, comandaData.cliente.pais].filter(Boolean).join('\n');

  // === ENVIAR EMAIL ===
  await emailjs.send('service_z163vmr', 'template_353l90q', {
    client_email: comandaData.cliente.email,
    order_id: comandaId,
    client_name: nombre,
    client_phone: comandaData.cliente.telefono,
    client_address: direccion,
    date: new Date().toLocaleDateString('es-ES'),
    subtotal: formatPrice(comandaData.totals.subtotal),
    envio: formatPrice(comandaData.totals.envio),
    iva: formatPrice(comandaData.totals.iva),
    total: formatPrice(comandaData.totals.total),
    productos_html: productosHTML,
    cupon_html: cuponHTML
  });

  console.log('Email enviat al client');
  return true;

  } catch (error) {
  console.error('Error email client:', error);
  return false;
  }
}

/* ---------------------------
   EMAIL NOTIFICACIÓ COMANDA ADMIN (NOVA VERSIÓ)
   --------------------------- */

async function enviarNotificacionAdmin(comandaData, comandaId) {
  try {
    console.log('📦 Preparant notificació admin per comanda:', comandaId);

    // === GENERAR HTML DELS PRODUCTES (igual que al client) ===
    let productosHTML = `
      <div style="margin: 20px 0; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <table style="width:100%; border-collapse:collapse; font-size:14px;">
          <thead>
            <tr style="background:#f8f9fa;">
              <th style="text-align:left; padding:12px; font-weight:bold; border-bottom:1px solid #dee2e6;">Producto</th>
              <th style="text-align:left; padding:12px; font-weight:bold; border-bottom:1px solid #dee2e6;">Variante</th>
              <th style="text-align:center; padding:12px; font-weight:bold; border-bottom:1px solid #dee2e6;">Cant.</th>
              <th style="text-align:right; padding:12px; font-weight:bold; border-bottom:1px solid #dee2e6;">Precio</th>
            </tr>
          </thead>
          <tbody>
    `;

    // Llista de productes
    for (const p of comandaData.productos) {
      const subtotal = p.precio * p.cantidad;
      productosHTML += `
        <tr>
          <td style="padding:12px; border-bottom:1px solid #eee; font-weight:600;">${escapeHtml(p.nombre)}</td>
          <td style="padding:12px; border-bottom:1px solid #eee;">${escapeHtml(p.variante)}</td>
          <td style="padding:12px; border-bottom:1px solid #eee; text-align:center;">${p.cantidad}</td>
          <td style="padding:12px; border-bottom:1px solid #eee; text-align:right;">${formatPrice(p.precio)}</td>
        </tr>
        <tr style="background:#fdf2f8;">
          <td colspan="3" style="padding:10px 12px; text-align:right; font-weight:500; color:#d63384; border-bottom:1px solid #eee;">Subtotal producto</td>
          <td style="padding:10px 12px; text-align:right; font-weight:600; color:#d63384; border-bottom:1px solid #eee;">${formatPrice(subtotal)}</td>
        </tr>
      `;
    }

    productosHTML += `</tbody></table></div>`;

    // === INFORMACIÓ DEL CLIENT ===
    const nombreCliente = `${comandaData.cliente.nombre} ${comandaData.cliente.apellidos}`.trim();
    const direccionCliente = [
      comandaData.cliente.direccion,
      comandaData.cliente.infoAdicional,
      `${comandaData.cliente.codigoPostal} ${comandaData.cliente.ciudad}`,
      comandaData.cliente.pais
    ].filter(Boolean).join('\n');

    // === RESUM DE LA COMANDA ===
    const resumenHTML = `
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top:0; color:#333;">Resumen de la Comanda</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <div style="font-weight:500;">Subtotal:</div>
          <div style="text-align:right;">${formatPrice(comandaData.totals.subtotal)}</div>
          ${comandaData.totals.descuento > 0 ? `
            <div style="font-weight:500; color:#d63384;">Descuento:</div>
            <div style="text-align:right; color:#d63384;">-${formatPrice(comandaData.totals.descuento)}</div>
          ` : ''}
          <div style="font-weight:500;">Envío:</div>
          <div style="text-align:right;">${formatPrice(comandaData.totals.envio)}</div>
          <div style="font-weight:500;">IVA (21%):</div>
          <div style="text-align:right;">${formatPrice(comandaData.totals.iva)}</div>
          <div style="font-weight:700; border-top:1px solid #ccc; padding-top:8px; margin-top:8px;">TOTAL:</div>
          <div style="text-align:right; font-weight:700; border-top:1px solid #ccc; padding-top:8px; margin-top:8px;">${formatPrice(comandaData.totals.total)}</div>
        </div>
      </div>
    `;

    // === ENVIAR EMAIL AMB LES NOVES VARIABLES ===
    await emailjs.send('service_z163vmr', 'template_klvyj1r', {
      // Variables necessàries per al template
      asunto: `🛒 Nueva Comanda #${comandaId}`,
      comanda_id: comandaId,
      client_nom: nombreCliente,
      client_email: comandaData.cliente.email,
      client_telefon: comandaData.cliente.telefono || 'No proporcionado',
      client_adreca: direccionCliente,
      data_comanda: new Date().toLocaleString('es-ES', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      productos_html: productosHTML,
      resumen_html: resumenHTML,
      subtotal: formatPrice(comandaData.totals.subtotal),
      descompte: formatPrice(comandaData.totals.descuento),
      envio: formatPrice(comandaData.totals.envio),
      iva: formatPrice(comandaData.totals.iva),
      total: formatPrice(comandaData.totals.total),
      
      // Variables addicionals per consistència
      tipo_mensaje: 'Nova comanda', // Mantenim per compatibilitat
      llista_productes: comandaData.productos.map(p => 
        `• ${p.nombre} (${p.variante}) - ${p.cantidad} x ${formatPrice(p.precio)}`
      ).join('\n')
    });

    console.log('✅ Notificación admin enviada correctamente');
    return true;

  } catch (error) {
    console.error('❌ Error enviando notificación admin:', error);
    return false;
  }
}

/* ---------------------------
   FUNCIONES PARA COMANDAS Y NOTIFICACIONES
   --------------------------- */

function calcularSubtotal() {
  return carrito.reduce((total, item) => total + (item.precio * item.cantidad), 0);
}

function calcularEnvio() {
  const subtotal = calcularSubtotal();
  return subtotal >= config.enviamentGratisDesDe ? 0 : config.envioEstandar;
}

function calcularIVA() {
  const subtotal = calcularSubtotal();
  return (subtotal - descuentoAplicado) * 0.21;
}

function calcularTotal() {
  const subtotal = calcularSubtotal();
  const envio = calcularEnvio(); // ← CORREGIT: usar la función que calcula el envío correctamente
  return subtotal - descuentoAplicado + envio;
}

/* ---------------------------
   GUARDAR COMANDA I ENVIAR EMAIL (EmailJS) - VERSIÓ DEFINITIVA
   --------------------------- */
async function guardarComanda(datosFormulario) {
  try {
    // 1. Preparar dades (aquest apartat està correcte)
    const comandaData = {
      fecha: new Date(),
      cliente: {
        nombre: datosFormulario.nombre || '',
        apellidos: datosFormulario.apellidos || '',
        direccion: datosFormulario.direccion || '',
        infoAdicional: datosFormulario['info-adicional'] || '',
        codigoPostal: datosFormulario['codigo-postal'] || '',
        ciudad: datosFormulario.ciudad || '',
        pais: datosFormulario.pais || 'España',
        telefono: datosFormulario.telefono || '',
        email: datosFormulario.email || ''
      },
      productos: carrito.map(item => ({
        nombre: item.nombre || 'Producto',
        variante: item.variantNombre || 'Sin variante',
        precio: item.precio || 0,
        cantidad: item.cantidad || 0,
        imagen: item.imagen || ''
      })),
      totals: {
        subtotal: calcularSubtotal(),
        descuento: descuentoAplicado,
        envio: calcularEnvio(),
        iva: calcularIVA(),
        total: calcularTotal()
      },
      cuponAplicado: cuponAplicado ? {
        codigo: cuponAplicado.codigo,
        descuento: cuponAplicado.descuento
      } : null,
      estado: 'pendiente'
    };

    // === GENERAR CUPÓ (NUEVA VERSIÓN HÍBRIDA) ===
const subtotal = calcularSubtotal();
if (subtotal >= config.promocionCompraSuperiorA && config.porcentajeDescuento > 0) {
  // Usar la nueva función híbrida
  const cupon = await generarCuponHibrido(config.porcentajeDescuento);
  mostrarPopupDescuento(subtotal);
  console.log('Cupón generado en compra:', cupon.codigo);
}

    // 2. Firestore (aquest apartat està correcte)
    let comandaId = 'COM' + Date.now();
    try {
      const docRef = await addDoc(collection(db, "comandas"), comandaData);
      comandaId = docRef.id;
      console.log("Comanda guardada:", comandaId);
    } catch (e) {
      console.log("Firestore falló, pero email s'enviarà");
    }

    // 3. Email admin - NOVA VERSIÓ ESPECIALITZADA
    await enviarNotificacionAdmin(comandaData, comandaId);

    // 4. Email client (aquest apartat està correcte - NO tocar)
    await enviarConfirmacionCliente(comandaData, comandaId);

    return comandaId;

  } catch (error) {
    console.error("Error en guardarComanda:", error);
    throw error;
  }
}

/* ---------------------------
   CARRITO (add / + / - / eliminar / persist)
   --------------------------- */
function addToCart(docId, variantIndex = 0, qty = 1) {
  const product = productsCache.find(p => p._docId === docId) || null;
  if (!product) {
    alert("Producto no encontrado en caché.");
    return;
  }
  const variant = (product.variants && product.variants[variantIndex]) ? product.variants[variantIndex] : { nom: "", preu: 0, imatges: [] };
  const key = `${docId}::${variantIndex}`;

  const existing = carrito.find(i => i.key === key);
  if (existing) {
    existing.cantidad = (existing.cantidad || 0) + qty;
  } else {
    carrito.push({
      key,
      docId,
      variantIndex,
      nombre: product.nom || "",
      variantNombre: variant.nom || "",
      precio: Number(variant.preu || 0),
      imagen: (variant.imatges && variant.imatges[0]) ? variant.imatges[0] : "https://via.placeholder.com/80x80?text=Sin+imagen",
      cantidad: qty
    });
  }
  saveCart();
  renderCartCount();
  showCartPopup(product, variantIndex);
}

function showCartPopup(product, variantIndex) {
  const variant = (product.variants && product.variants[variantIndex]) ? product.variants[variantIndex] : { nom: "", preu: 0, imatges: [] };
  const imgSrc = (variant.imatges && variant.imatges[0]) ? variant.imatges[0] : "https://via.placeholder.com/80x80?text=Sin+imagen";
  
  cartPopup.style.display = "flex";
  cartPopup.classList.remove("active");
  
  cartPopup.innerHTML = `
    <h3>¡AÑADIDO AL CARRITO!</h3>
    <div class="cart-popup-content">
      <img src="${escapeAttr(imgSrc)}" alt="${escapeAttr(product.nom || '')}">
      <div class="cart-popup-details">
        <div>${escapeHtml(product.nom || '')}</div>
        <div class="muted">${escapeHtml(variant.nom || 'Sin variante')}</div>
        <div class="price">${formatPrice(Number(variant.preu || 0))}</div>
      </div>
    </div>
    <div class="cart-popup-actions">
      <button class="btn secondary" id="seguir-comprando">Seguir comprando</button>
      <button class="btn primary" id="ver-carrito">Ver carrito</button>
    </div>
  `;
  
  cartPopup.offsetHeight; 
  cartPopup.classList.add("active");

  const closePopup = () => {
    cartPopup.classList.remove("active");
    setTimeout(() => {
      cartPopup.style.display = "none";
    }, 300); 
  };

  const seguirBtn = document.getElementById("seguir-comprando");
  const carritoBtn = document.getElementById("ver-carrito");

  seguirBtn.addEventListener("click", () => {
    closePopup();
  }, { once: true });

  carritoBtn.addEventListener("click", () => {
    closePopup();
    location.hash = "#carrito";
  }, { once: true });

  setTimeout(closePopup, 5000);
}

function renderCart() {
  if (!carritoContenido) return;
  carritoContenido.innerHTML = "";
  direccionFormContainer.innerHTML = "";
  
  // Resetear secció de cupó si no hi ha carrito
  if (!carrito.length) {
    carritoContenido.innerHTML = "<p>Tu carrito está vacío.</p>";
    carritoSummaryEl.innerHTML = "";
    resetearCupon();
    return;
  }
  
  let subtotal = 0;
  carrito.forEach((item, idx) => {
    const subtotalItem = Number(item.precio || 0) * (item.cantidad || 0);
    subtotal += subtotalItem;
    const div = document.createElement("div");
    div.className = "carrito-item";
    div.innerHTML = `
      <img src="${escapeAttr(item.imagen)}" alt="${escapeAttr(item.nombre)}" class="carrito-item-image" data-docid="${escapeAttr(item.docId)}">
      <div class="carrito-item-info">
        <div class="carrito-item-name">${escapeHtml(item.nombre)}</div>
        <div class="carrito-item-variant">${escapeHtml(item.variantNombre)}</div>
      </div>
      <div class="carrito-item-controls">
        <div class="carrito-controls">
          <button class="btn secondary btn-minus" data-idx="${idx}">-</button>
          <div class="cantidad">${item.cantidad}</div>
          <button class="btn primary btn-plus" data-idx="${idx}">+</button>
        </div>
        <button class="btn-delete-icon btn-remove" data-idx="${idx}" title="Eliminar producto">🗑️</button>
        <div class="carrito-item-price">${formatPrice(subtotalItem)}</div>
      </div>
    `;
    carritoContenido.appendChild(div);
  });

  let envioCalculado = subtotal >= config.enviamentGratisDesDe ? 0 : config.envioEstandar;
  const iva = (subtotal - descuentoAplicado) * 0.21;
  const total = subtotal - descuentoAplicado + envioCalculado;
  
  carritoSummaryEl.innerHTML = `
    <div class="carrito-summary">
      <div class="cart-line">
        <span>Subtotal</span>
        <strong>${formatPrice(subtotal)}</strong>
      </div>
      ${descuentoAplicado > 0 ? `
      <div class="cart-line descuento-line">
        <span>Descuento</span>
        <strong>-${formatPrice(descuentoAplicado)}</strong>
      </div>
      ` : ''}
      <div class="cart-line">
        <span>Envío (Gratis a partir de ${formatPrice(config.enviamentGratisDesDe)})</span>
        <strong>${formatPrice(envioCalculado)}</strong>
      </div>
      <div class="cart-line">
        <span>Total</span>
        <div class="price-info">
          <div class="iva-info">(incluye ${formatPrice(iva)} IVA)</div>
          <div class="total-price">${formatPrice(total)}</div>
        </div>
      </div>
    </div>
  `;

  // Event listeners per als botons del carrito
  carritoContenido.querySelectorAll(".btn-plus").forEach(b => b.addEventListener("click", (e) => {
    const i = Number(b.dataset.idx);
    carrito[i].cantidad++;
    saveCart();
    aplicarDescuentoCarrito(); // Recalcular descompte si hi ha cupó
    renderCart(); // Actualizar la vista
  }));
  
  carritoContenido.querySelectorAll(".btn-minus").forEach(b => b.addEventListener("click", (e) => {
    const i = Number(b.dataset.idx);
    if (carrito[i].cantidad > 1) carrito[i].cantidad--;
    else carrito.splice(i, 1);
    saveCart();
    aplicarDescuentoCarrito(); // Recalcular descompte si hi ha cupó
    renderCart(); // Actualizar la vista
  }));
  
  carritoContenido.querySelectorAll(".btn-remove").forEach(b => b.addEventListener("click", (e) => {
    const i = Number(b.dataset.idx);
    carrito.splice(i, 1);
    saveCart();
    aplicarDescuentoCarrito(); // Recalcular descompte si hi ha cupó
    renderCart(); // Actualizar la vista
  }));
  
  carritoContenido.querySelectorAll(".carrito-item-image").forEach(img => img.addEventListener("click", (e) => {
    const docId = img.dataset.docid;
    location.hash = "#detalle-producto/" + docId;
  }));

  if (addDireccionBtn) {
    addDireccionBtn.onclick = showAddressForm;
  }
}

function showAddressForm() {
  // Tu información personal - RELLENA ESTOS DATOS
  console.log("🔄 showAddressForm() ejecutándose...");
  const tuTelefonoBizum = "+34 600 000 000"; // Tu teléfono para Bizum
  const tuIBAN = "ES00 0000 0000 0000 0000 0000"; // Tu IBAN para transferencias
  console.log("💰 Carrito actual:", carrito);
  console.log("💰 Subtotal calculado:", calcularSubtotal());
  console.log("💰 Total calculado:", calcularTotal());
  console.log("💰 Descuento aplicado:", descuentoAplicado);


  direccionFormContainer.innerHTML = `
    <form id="direccion-form" class="direccion-form">
      <label for="nombre">Nombre</label>
      <input id="nombre" type="text" placeholder="Nombre" required>
      <label for="apellidos">Apellidos</label>
      <input id="apellidos" type="text" placeholder="Apellidos" required>
      <label for="direccion">Dirección</label>
      <input id="direccion" type="text" placeholder="Dirección" required>
      <label for="info-adicional">Información adicional (planta, puerta...)</label>
      <input id="info-adicional" type="text" placeholder="Información adicional (planta, puerta...)" required>
      <label for="codigo-postal">Código postal</label>
      <input id="codigo-postal" type="text" placeholder="Código postal" required>
      <label for="ciudad">Ciudad</label>
      <input id="ciudad" type="text" placeholder="Ciudad" required>
      <label for="pais">País</label>
      <input id="pais" type="text" value="España" readonly required>
      <label for="telefono">Teléfono</label>
      <input id="telefono" type="tel" placeholder="Teléfono" required>
      <label for="email">E-mail</label>
      <input id="email" type="email" placeholder="E-mail" required>
    </form>

    <div class="opciones-pago-particular">
      <h3>Elige método de pago:</h3>
      
      <!-- Pago Online con PayPal (Tarjetas, Apple Pay, Google Pay) -->
      <div class="opcion-pago destaque">
        <div class="pago-header">
          <h4>💳 Pago Online Seguro</h4>
          <div class="metodos-pago-icons">
            <span class="metodo-icon">🍎 Apple Pay</span>
            <span class="metodo-icon">📱 Google Pay</span> 
            <span class="metodo-icon">💳 Tarjetas</span>
            <span class="metodo-icon">📧 PayPal</span>
          </div>
        </div>
        <p class="pago-descripcion">Pago instantáneo y seguro con redirección a PayPal</p>
        <div id="paypal-button-container"></div>
      </div>

      <!-- Bizum -->
      <div class="opcion-pago">
        <div class="pago-header">
          <h4>📱 Bizum</h4>
        </div>
        <p class="pago-descripcion">Pago instantáneo desde tu app bancaria</p>
        <div class="pago-datos">
          <div class="dato-pago">
            <span class="dato-label">Teléfono:</span>
            <span class="dato-valor">${tuTelefonoBizum}</span>
          </div>
          <div class="dato-pago">
            <span class="dato-label">Importe:</span>
            <span class="dato-valor">${formatPrice(calcularTotal())}</span>
          </div>
        </div>
        <button id="confirmar-bizum" class="btn secondary">
          ✅ Confirmar Pedido con Bizum
        </button>
      </div>

      <!-- Transferencia Bancaria -->
      <div class="opcion-pago">
        <div class="pago-header">
          <h4>🏦 Transferencia Bancaria</h4>
        </div>
        <p class="pago-descripcion">Transferencia bancaria tradicional</p>
        <div class="pago-datos">
          <div class="dato-pago">
            <span class="dato-label">IBAN:</span>
            <span class="dato-valor">${tuIBAN}</span>
          </div>
          <div class="dato-pago">
            <span class="dato-label">Importe:</span>
            <span class="dato-valor">${formatPrice(calcularTotal())}</span>
          </div>
          <div class="dato-pago">
            <span class="dato-label">Concepto:</span>
            <span class="dato-valor">Pedido MiUArt</span>
          </div>
        </div>
        <button id="confirmar-transferencia" class="btn secondary">
          ✅ Confirmar Pedido con Transferencia
        </button>
      </div>
    </div>
  `;

  // Obtener referencia al formulario
  const form = document.getElementById("direccion-form");

  // Función para validar formulario
  function validarFormulario() {
    const fields = ["nombre", "apellidos", "direccion", "info-adicional", "codigo-postal", "ciudad", "pais", "telefono", "email"];
    let valid = true;
    const formData = {};
    
    fields.forEach(field => {
      const input = document.getElementById(field);
      formData[field] = input.value.trim();
      if (!formData[field]) {
        valid = false;
        input.style.borderColor = "#c0392b";
      } else {
        input.style.borderColor = "";
      }
    });
    
    return valid ? formData : null;
  }

  // Función para procesar pedido exitoso
  async function procesarPedidoExitoso(formData, metodoPago = 'PayPal') {
    try {
      const comandaId = await guardarComanda(formData);
      
      // Marcar cupón como usado si se aplicó
      if (cuponAplicado) {
        marcarCuponUtilizado(cuponAplicado.codigo);
      }

      alert(`¡Pedido ${metodoPago !== 'PayPal' ? 'confirmado' : 'completado'}! Número de pedido: ${comandaId}`);
      
      // Limpiar carrito después de la compra
      setTimeout(() => {
        carrito = [];
        saveCart();
        renderCart();
        direccionFormContainer.innerHTML = "";
        resetearCupon();
      }, 100);
      
    } catch (error) {
      console.error("Error en el proceso de compra:", error);
      alert("Error al procesar la compra. Por favor, intenta nuevamente.");
    }
  }

  // ========== CONFIGURACIÓN PAYPAL ==========
  paypal.Buttons({
    style: {
      layout: 'vertical',
      color:  'gold',
      shape:  'rect',
      label:  'paypal'
    },
    
    createOrder: (data, actions) => {
      // Validar formulario antes de proceder con PayPal
      const formData = validarFormulario();
      if (!formData) {
        alert("Por favor, completa todos los campos obligatorios antes de pagar.");
        return false;
      }

      return actions.order.create({
        purchase_units: [{
          amount: {
            value: calcularTotal().toFixed(2),
            currency_code: 'EUR'
          },
          description: 'Compra en MiUArt'
        }]
      });
    },

    onApprove: async (data, actions) => {
      try {
        const detalles = await actions.order.capture();
        const formData = validarFormulario();
        
        if (formData) {
          await procesarPedidoExitoso(formData, 'PayPal');
        }
      } catch (error) {
        console.error('Error en pago PayPal:', error);
        alert('Error al procesar el pago con PayPal. Por favor, intenta de nuevo.');
      }
    },

    onError: (err) => {
      console.error('Error en el pago con PayPal:', err);
      alert('Ocurrió un error al procesar el pago con PayPal. Por favor, intenta de nuevo.');
    },

    onCancel: (data) => {
      console.log('Pago cancelado por el usuario');
    }

  }).render('#paypal-button-container');

  // ========== EVENT LISTENERS PARA BIZUM Y TRANSFERENCIA ==========
  
  // Bizum
  document.getElementById("confirmar-bizum").addEventListener("click", async (e) => {
    e.preventDefault();
    const formData = validarFormulario();
    
    if (formData) {
      // Mostrar loading
      const bizumBtn = document.getElementById("confirmar-bizum");
      const originalText = bizumBtn.textContent;
      bizumBtn.textContent = "Procesando...";
      bizumBtn.disabled = true;

      await procesarPedidoExitoso(formData, 'Bizum');

      // Restaurar botón
      bizumBtn.textContent = originalText;
      bizumBtn.disabled = false;
    } else {
      alert("Por favor, completa todos los campos obligatorios.");
    }
  });

  // Transferencia
  document.getElementById("confirmar-transferencia").addEventListener("click", async (e) => {
    e.preventDefault();
    const formData = validarFormulario();
    
    if (formData) {
      // Mostrar loading
      const transferenciaBtn = document.getElementById("confirmar-transferencia");
      const originalText = transferenciaBtn.textContent;
      transferenciaBtn.textContent = "Procesando...";
      transferenciaBtn.disabled = true;

      await procesarPedidoExitoso(formData, 'Transferencia');

      // Restaurar botón
      transferenciaBtn.textContent = originalText;
      transferenciaBtn.disabled = false;
    } else {
      alert("Por favor, completa todos los campos obligatorios.");
    }
  });
}

if (vaciarCarritoBtn) vaciarCarritoBtn.addEventListener("click", () => {
  if (!confirm("¿Vaciar carrito?")) return;
  carrito = [];
  saveCart();
  renderCart();
  resetearCupon();
});

/* ---------------------------
   INICIALIZACIONES
   --------------------------- */
buildAddProductForm();
saveCart();
loadProducts();
loadHeaderImages();
loadConfig();

// NOU: Inicialitzar el cercador
initSearch();

// NOU: Inicialitzar el sistema de cupons
initCuponSystem();

if (searchInput) searchInput.addEventListener("input", () => {
  renderProductGrid(productsCache);
});

window._miuart = {
  db, auth, loadProducts, loadHeaderImages, loadHeaderImagesDetalle, carrito, saveCart, showCartPopup, showAddressForm
};