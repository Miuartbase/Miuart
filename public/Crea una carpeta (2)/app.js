/* app.js - complet i autònom
   Funciones corregidas: 
   - Selector de variantes deshabilitado cuando no hay variantes
   - Botón siempre habilitado
   - Comportamiento correcto del selector según si hay variantes o no
   - Breadcrumb Navigation implementado
   - Sistema de comandas con notificación por email
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
// Reemplaça 'LA_TEVA_PUBLIC_KEY' amb la teva Public Key real
emailjs.init('UHPbtfKFspMstCYCj');

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
   FORMULARI DE CONTACTE (Actualitzat)
   --------------------------- */
if (contactForm) {
  contactForm.addEventListener('submit', function(event) {
    event.preventDefault();
    
    console.log('📧 Processant formulari de contacte...');

    // Obtenir les dades del formulari
    const formData = new FormData(this);
    const contactName = document.getElementById('contact-name').value;
    const contactEmail = document.getElementById('contact-email').value;
    const contactMessage = document.getElementById('contact-message').value;

    // Preparar les dades per EmailJS
    const templateParams = {
      from_name: contactName,
      from_email: contactEmail,
      message: contactMessage,
      date: new Date().toLocaleString('ca-ES'),
      to_email: 'miuartbase@gmail.com'
    };

    // ⚠️ REEMPLAÇA AMB LES TEVES CLAUS REALS PER AL CONTACTE
    const serviceID = 'service_z163vmr'; // Pot ser el mateix servei
    const templateID = 'template_353l90q'; // Template DIFERENT per al contacte

    console.log('Enviant email de contacte...', templateParams);

    // Enviar email
    emailjs.send(serviceID, templateID, templateParams)
      .then(() => {
        console.log('✅ Email de contacte enviat correctament');
        contactForm.reset();
        contactPopup.classList.remove('hidden');
      }, (error) => {
        console.error('❌ Error enviant email de contacte:', error);
        alert('Error al enviar el missatge. Si us plau, torna a intentar-ho.');
      });
  });
}

/* ---------------------------
   SISTEMA DE DESCUENTOS
   --------------------------- */

// NOVA FUNCIÓ: Generar codi alfanumèric de 5 dígits
function generarCodigoDescuento() {
  const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let codigo = '';
  for (let i = 0; i < 5; i++) {
    codigo += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
  }
  return codigo;
}

// NOVA FUNCIÓ: Mostrar pop-up de descompte
function mostrarPopupDescuento(subtotal) {
  if (descuentoPopup && descuentoMensaje && codigoDescuento) {
    const codigo = generarCodigoDescuento();
    
    descuentoMensaje.innerHTML = `Tu compra ha sido superior a <strong>${config.promocionCompraSuperiorA}€</strong>.<br>
                                 Has conseguido un cupón de descuento del <strong>${config.porcentajeDescuento}%</strong> en tu siguiente compra.`;
    
    codigoDescuento.textContent = codigo;
    
    descuentoPopup.classList.remove('hidden');
    
    // Guardar el codi a localStorage per a ús futur
    const cupones = JSON.parse(localStorage.getItem('miuart_cupones') || '[]');
    cupones.push({
      codigo: codigo,
      descuento: config.porcentajeDescuento,
      fecha: new Date().toISOString(),
      usado: false
    });
    localStorage.setItem('miuart_cupones', JSON.stringify(cupones));
  }
}

// NOVA FUNCIÓ: Comprovar si s'ha de mostrar el descompte
function comprobarDescuento(subtotal) {
  if (config.promocionCompraSuperiorA > 0 && 
      config.porcentajeDescuento > 0 && 
      subtotal >= config.promocionCompraSuperiorA) {
    mostrarPopupDescuento(subtotal);
  }
}

// Event listener per tancar el pop-up de descompte
if (descuentoPopupClose) {
  descuentoPopupClose.addEventListener('click', () => {
    if (descuentoPopup) {
      descuentoPopup.classList.add('hidden');
    }
  });
}

/* ---------------------------
   SISTEMA DE CUPONS AL CARRITO
   --------------------------- */

// Funció per validar un cupó
function validarCupon() {
  const codigo = cuponInput.value.trim().toUpperCase();
  
  if (!codigo) {
    cuponMensaje.textContent = 'Por favor, introduce un código';
    cuponMensaje.className = 'cupon-mensaje error';
    return;
  }
  
  // Obtenir cupons de localStorage
  const cupones = JSON.parse(localStorage.getItem('miuart_cupones') || '[]');
  
  // Buscar el cupó
  const cupon = cupones.find(c => c.codigo === codigo);
  
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
  
  // Cupón válido
  cuponAplicado = cupon;
  cuponMensaje.textContent = `Cupón válido: ${cupon.descuento}% de descuento aplicado`;
  cuponMensaje.className = 'cupon-mensaje success';
  
  // Amagar botó i mostrar checkmark
  validarCuponBtn.classList.add('hidden');
  cuponValidado.classList.remove('hidden');
  
  // Aplicar descompte al carrito
  aplicarDescuentoCarrito();
  // Y ahora llamamos a renderCart para actualizar la vista
  renderCart();
}

// Funció per aplicar el descompte al carrito
function aplicarDescuentoCarrito() {
  if (!cuponAplicado) return;
  
  // Calcular subtotal
  let subtotal = 0;
  carrito.forEach(item => {
    subtotal += Number(item.precio || 0) * (item.cantidad || 0);
  });
  
  // Calcular descompte
  descuentoAplicado = subtotal * (cuponAplicado.descuento / 100);
  
  // Re-renderitzar el carrito per mostrar el descompte
  // ELIMINAMOS la llamada a renderCart() desde aquí
}

// Funció per marcar un cupó com utilitzat
function marcarCuponUtilizado(codigo) {
  const cupones = JSON.parse(localStorage.getItem('miuart_cupones') || '[]');
  const cuponIndex = cupones.findIndex(c => c.codigo === codigo);
  
  if (cuponIndex !== -1) {
    cupones[cuponIndex].usado = true;
    localStorage.setItem('miuart_cupones', JSON.stringify(cupones));
  }
}

// Funció per resetear l'estat del cupó
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

// Inicialització del sistema de cupons
function initCuponSystem() {
  if (validarCuponBtn) {
    validarCuponBtn.addEventListener('click', validarCupon);
  }
  
  // També permetre validar amb la tecla Enter
  if (cuponInput) {
    cuponInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        validarCupon();
      }
    });
  }
}

/* ---------------------------
   FUNCIONES PARA COMANDAS Y NOTIFICACIONES
   --------------------------- */

// Funciones auxiliares para cálculos
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
  const envio = calcularEnvio();
  return subtotal - descuentoAplicado + envio;
}

/* ---------------------------
   GUARDAR COMANDA I ENVIAR EMAIL (EmailJS)
   --------------------------- */
async function guardarComanda(datosFormulario) {
  try {
    // 1. Preparar les dades de la comanda
    const comandaData = {
      fecha: new Date(),
      cliente: {
        nombre: datosFormulario.nombre,
        apellidos: datosFormulario.apellidos,
        direccion: datosFormulario.direccion,
        infoAdicional: datosFormulario['info-adicional'],
        codigoPostal: datosFormulario['codigo-postal'],
        ciudad: datosFormulario.ciudad,
        pais: datosFormulario.pais,
        telefono: datosFormulario.telefono,
        email: datosFormulario.email
      },
      productos: carrito.map(item => ({
        nombre: item.nombre,
        variante: item.variantNombre,
        precio: item.precio,
        cantidad: item.cantidad,
        imagen: item.imagen
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

    // 2. Intentar guardar a Firestore (opcional)
    let comandaId = 'COM' + Date.now();
    try {
      const docRef = await addDoc(collection(db, "comandas"), comandaData);
      comandaId = docRef.id;
      console.log("✅ Comanda guardada a Firestore:", comandaId);
    } catch (firestoreError) {
      console.log("ℹ️ Comanda no guardada a Firestore, pero email s'enviarà");
    }

    // 3. ENVIAR EMAIL amb EmailJS
    const listaProductos = comandaData.productos.map(producto => 
      `• ${producto.nombre} (${producto.variante}) - ${producto.cantidad} x ${formatPrice(producto.precio)} = ${formatPrice(producto.precio * producto.cantidad)}`
    ).join('\n');

    const templateParams = {
      comanda_id: comandaId,
      client_nom: `${datosFormulario.nombre} ${datosFormulario.apellidos}`,
      client_email: datosFormulario.email,
      client_telefon: datosFormulario.telefono,
      client_adreca: `
${datosFormulario.direccion}
${datosFormulario['info-adicional']}
${datosFormulario['codigo-postal']} ${datosFormulario.ciudad}
${datosFormulario.pais}
      `.trim(),
      llista_productes: listaProductos,
      subtotal: formatPrice(comandaData.totals.subtotal),
      descompte: formatPrice(comandaData.totals.descuento),
      envio: formatPrice(comandaData.totals.envio),
      iva: formatPrice(comandaData.totals.iva),
      total: formatPrice(comandaData.totals.total),
      data_comanda: new Date().toLocaleString('ca-ES')
    };

    // ⚠️ REEMPLAÇA AMB LES TEVES CLAUS REALS ⚠️
    const serviceID = 'service_z163vmr'; // Exemple: service_abc123
    const templateID = 'template_klvyj1r'; // Exemple: template_xyz789
    const publicKey = 'UHPbtfKFspMstCYCj'; // Exemple: user_123456789

    console.log('📧 Enviant email de comanda...');
    await emailjs.send(serviceID, templateID, templateParams);
    console.log('✅ Email enviat correctament a miuartbase@gmail.com');

    return comandaId;

  } catch (error) {
    console.error("Error en el procés de comanda: ", error);
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
      <button id="comprar-btn" class="btn primary">Comprar</button>
    </form>
  `;
  const form = document.getElementById("direccion-form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
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
    
    if (valid) {
      try {
        // Mostrar loading
        const comprarBtn = document.getElementById("comprar-btn");
        comprarBtn.textContent = "Procesando...";
        comprarBtn.disabled = true;

        // CALCULAR SUBTOTAL ANTES DE GUARDAR LA COMANDA Y VACIAR EL CARRITO
        const subtotal = calcularSubtotal();

        // Guardar comanda en Firestore
        const comandaId = await guardarComanda(formData);
        
        // Marcar cupón como usado si se aplicó
        if (cuponAplicado) {
          marcarCuponUtilizado(cuponAplicado.codigo);
        }

        alert(`¡Compra procesada correctamente! Número de pedido: ${comandaId}`);
        
        // COMPROBAR DESCUENTO PARA PRÓXIMA COMPRA CON EL SUBTOTAL CALCULADO
        comprobarDescuento(subtotal);

        // Esperar un poco para que se muestre el pop-up de descuento si aplica
        setTimeout(() => {
          // Limpiar carrito DESPUÉS de comprobar el descuento
          carrito = [];
          saveCart();
          renderCart();
          direccionFormContainer.innerHTML = "";
          resetearCupon();
        }, 100);
        
      } catch (error) {
        console.error("Error en el proceso de compra:", error);
        alert("Error al procesar la compra. Por favor, intenta nuevamente.");
      } finally {
        const comprarBtn = document.getElementById("comprar-btn");
        if (comprarBtn) {
          comprarBtn.textContent = "Comprar";
          comprarBtn.disabled = false;
        }
      }
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