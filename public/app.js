/* app.js - complet i autònom - VERSIÓ CORREGIDA EMAILS + CUPONS + VARIABLES SEGURES + PROMOCIONES */
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
   - NUEVO: Sección Promociones implementada
*/

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import {
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import {
  getFirestore, collection, getDocs, getDoc, addDoc, updateDoc, deleteDoc, doc, query, orderBy, limit, setDoc, where
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

/* ---------------------------
   CONFIGURACIÓ FIREBASE
   --------------------------- */
import { firebaseConfig } from './config.js';
import traduccions from './traduccions.js';
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* ---------------------------
   SISTEMA D'IDIOMES
   --------------------------- */
let idiomaActiu = 'es';
let cookieBannerText = "";
let seccionsCachejades = [];
let seccionsJaRenderitzades = false;
let ordenActiu = 'referencia';

function t(clau) {
  return (traduccions[idiomaActiu] && traduccions[idiomaActiu][clau]) 
    || (traduccions['es'] && traduccions['es'][clau]) 
    || clau;
}

function aplicarIdioma(idioma) {
  idiomaActiu = idioma;
  localStorage.setItem('tradenfy_idioma', idioma);

  // Actualitzar slider promocional i altres elements de config
  if (typeof updateUIFromConfig === 'function') {
    updateUIFromConfig();
  }

  // Navegació desktop
  document.querySelector('#nav-menu a[href="#inicio"]').textContent = t('nav_inicio');
  document.querySelector('#nav-menu a[href="#tienda"]')?.closest('li')?.querySelector('a.tienda-nav-link, a[href="#tienda"]') && 
    (document.querySelector('#nav-menu a[href="#tienda"]').textContent = t('nav_tienda'));
  const novedadesLink = document.querySelector('#novedades-link a');
  if (novedadesLink) novedadesLink.textContent = t('nav_novedades');

  // Navegació top
  const quienesSomosLink = document.querySelector('#quienes-somos-link a');
  if (quienesSomosLink) quienesSomosLink.textContent = t('nav_quienes_somos');
  const contactoLink = document.querySelector('#nav-top a[href="#contacto"]');
  if (contactoLink) contactoLink.textContent = t('nav_contacto');
  const authLinkEl = document.getElementById('auth-link-a');
  if (authLinkEl) authLinkEl.textContent = auth.currentUser ? t('nav_logout') : t('nav_login');

  // Overlay mòbil
  const menuOverlayLinks = document.querySelectorAll('#menu-overlay-list a');
  menuOverlayLinks.forEach(a => {
    if (a.getAttribute('href') === '#inicio') a.textContent = t('nav_inicio');
    if (a.getAttribute('href') === '#tienda') a.textContent = t('nav_tienda');
    if (a.getAttribute('href') === '#novedades') a.textContent = t('nav_novedades');
  });

  // Cerca
  const searchInputEl = document.getElementById('search-input');
  if (searchInputEl) searchInputEl.placeholder = t('cerca_placeholder');
  const searchInputMob = document.getElementById('search-input-mobile');
  if (searchInputMob) searchInputMob.placeholder = t('cerca_placeholder');

  // Seccions
  const novedadesTitol = document.querySelector('#novedades h2');
  if (novedadesTitol) novedadesTitol.textContent = t('novedades_titulo');
  const quienesSomosTitol = document.querySelector('#quienes-somos h2');
  if (quienesSomosTitol) quienesSomosTitol.textContent = t('quienes_somos_titulo');
  const contactoTitol = document.querySelector('#contacto h2');
  if (contactoTitol) contactoTitol.textContent = t('contacto_titulo');
  const loginTitol = document.querySelector('#login-section h2');
  if (loginTitol) loginTitol.textContent = t('login_titulo');
  const carritoTitol = document.querySelector('#carrito h2');
  if (carritoTitol) carritoTitol.textContent = t('carrito_titulo');
  const envioTitol = document.querySelector('#envio-devoluciones h2');
  if (envioTitol) envioTitol.textContent = t('envio_titulo');
  const terminosTitol = document.querySelector('#terminos-condiciones h2');
  if (terminosTitol) terminosTitol.textContent = t('terminos_titulo');
  const privacidadTitol = document.querySelector('#politica-privacidad h2');
  if (privacidadTitol) privacidadTitol.textContent = t('privacidad_titulo');

  // Formulari contacte
  const contactNomLabel = document.querySelector('label[for="contact-name"]');
  if (contactNomLabel) contactNomLabel.textContent = t('contacto_nombre');
  const contactEmailLabel = document.querySelector('label[for="contact-email"]');
  if (contactEmailLabel) contactEmailLabel.textContent = t('contacto_email');
  const contactMsgLabel = document.querySelector('label[for="contact-message"]');
  if (contactMsgLabel) contactMsgLabel.textContent = t('contacto_mensaje');
  const contactConsent = document.querySelector('#contact-consent + label, label[for="contact-consent"]');
  if (contactConsent) contactConsent.textContent = t('contacto_consentimiento');
  const contactBtn = document.querySelector('#contact-form button[type="submit"]');
  if (contactBtn) contactBtn.textContent = t('contacto_enviar');

  // Formulari login
  const loginEmailLabel = document.querySelector('label[for="email"]');
  if (loginEmailLabel) loginEmailLabel.textContent = t('login_correo');
  const loginPassLabel = document.querySelector('label[for="contrasena"]');
  if (loginPassLabel) loginPassLabel.textContent = t('login_contrasena');
  const loginBtn = document.querySelector('#formulario-login button');
  if (loginBtn) loginBtn.textContent = t('login_entrar');

  // Carrito
  const vaciarBtn = document.getElementById('vaciar-carrito');
  if (vaciarBtn) vaciarBtn.textContent = t('carrito_vaciar');
  const direccioBtn = document.getElementById('add-direccion');
  if (direccioBtn) direccioBtn.textContent = t('carrito_añadir_direccion');
  const cuponLabel = document.querySelector('label[for="cupon-input"]');
  if (cuponLabel) cuponLabel.textContent = t('carrito_codigo_descuento');
  const cuponInput = document.getElementById('cupon-input');
  if (cuponInput) cuponInput.placeholder = t('carrito_introduce_codigo');
  const validarBtn = document.getElementById('validar-cupon');
  if (validarBtn) validarBtn.textContent = t('carrito_validar');
  const newsletterCheck = document.querySelector('.newsletter-consent label');
  if (newsletterCheck) newsletterCheck.innerHTML = `<input type="checkbox" id="newsletterCheck"> ${t('carrito_newsletter')}`;

  // Footer
  const footerCopy = document.querySelector('footer p');
  if (footerCopy) footerCopy.textContent = t('footer_copyright');
  const footerEnvio = document.querySelector('.footer-nav a[href="#envio-devoluciones"]');
  if (footerEnvio) footerEnvio.textContent = t('footer_envio');
  const footerTerminos = document.querySelector('.footer-nav a[href="#terminos-condiciones"]');
  if (footerTerminos) footerTerminos.textContent = t('footer_terminos');
  const footerPrivacidad = document.querySelector('.footer-nav a[href="#politica-privacidad"]');
  if (footerPrivacidad) footerPrivacidad.textContent = t('footer_privacidad');
  const footerCookies = document.getElementById('gestionar-cookies-link');
  if (footerCookies) footerCookies.textContent = t('footer_cookies');

  // Cookies banner
  const cookieRechazar = document.getElementById('cookie-rechazar');
  if (cookieRechazar) cookieRechazar.textContent = t('cookie_rechazar');
  const cookieConfigurar = document.getElementById('cookie-configurar');
  if (cookieConfigurar) cookieConfigurar.textContent = t('cookie_configurar');
  const cookieAceptar = document.getElementById('cookie-aceptar');
  if (cookieAceptar) cookieAceptar.textContent = t('cookie_aceptar');
  const cookieTitol = document.querySelector('#cookie-panel h3');
  if (cookieTitol) cookieTitol.textContent = t('cookie_titulo');
  const cookieGuardar = document.getElementById('cookie-panel-guardar');
  if (cookieGuardar) cookieGuardar.textContent = t('cookie_guardar');
  const cookieCancelar = document.getElementById('cookie-panel-cancelar');
  if (cookieCancelar) cookieCancelar.textContent = t('cookie_cancelar');

  // Banner cookies - enllaç més informació
  const bannerP = document.getElementById("cookie-banner-p");
  if (bannerP && cookieBannerText) {
    bannerP.innerHTML = `${cookieBannerText} <a href="#politica-privacidad" id="cookie-privacidad-link">${t('cookie_mas_info')}</a>`;
  }
  
  if (typeof initCookieBanner === 'function') {
    initCookieBanner();
  }
  if (typeof loadCookiesAdmin === 'function' && document.getElementById('cookie-categories-admin')) {
    loadCookiesAdmin();
  }
  
  // Textos legales
  if (typeof renderTextosLegales === 'function') {
    renderTextosLegales();
  }
  if (typeof loadTextosLegales === 'function' && document.getElementById('quill-container-envio')) {
    loadTextosLegales();
  }

  // Tienda filtres i ordenar
  const btnFiltres = document.getElementById('btn-filtres-toggle');
  if (btnFiltres) btnFiltres.querySelector('span').textContent = t('tienda_filtrar');
  const btnOrdenar = document.getElementById('btn-ordenar-toggle');
  if (btnOrdenar) btnOrdenar.querySelector('span').textContent = t('tienda_ordenar');
  const ordenarOpcions = document.querySelectorAll('.ordenar-option');
  const ordenarClaus = ['tienda_orden_referencia', 'tienda_orden_alfabetic', 'tienda_orden_preu_asc', 'tienda_orden_preu_desc', 'tienda_orden_novedades'];
  ordenarOpcions.forEach((op, i) => { if (ordenarClaus[i]) op.textContent = t(ordenarClaus[i]); });

  // Tienda
  if (typeof renderProductGrid === 'function' && document.getElementById('lista-productos')) {
    renderProductGrid(productsCache);
  }

  // Actualitzar detall producte si estem a aquesta pàgina
  const paginaActiva = document.querySelector('.pagina.active');
  if (paginaActiva && paginaActiva.id === 'detalle-producto') {
  const docId = location.hash.split('/')[1];
  if (docId) showProductDetail(docId);
  }

  // Popup cupó
  const popupTitle = document.querySelector('#descuento-popup h3');
  if (popupTitle) popupTitle.textContent = t('popup_compra_realizada');
  const popupAgradecimiento = document.querySelector('#descuento-popup .agradecimiento');
  if (popupAgradecimiento) popupAgradecimiento.textContent = t('popup_gracias');

  // Breadcrumb
  const breadcrumbInici = document.querySelector('.breadcrumb-link[href="#inicio"]');
  if (breadcrumbInici) breadcrumbInici.textContent = t('breadcrumb_inicio');

  // Overlay admin mòbil
  const adminLinks = [
    { id: 'agregar-producto-link-mob', clau: 'admin_agregar_producto' },
    { id: 'editor-inicio-link-mob',    clau: 'admin_editor_secciones' },
    { id: 'configuracion-link-mob',    clau: 'admin_configuracion' },
    { id: 'colores-link-mob',          clau: 'admin_editor_colores' },
    { id: 'newsletter-link-mob',       clau: 'admin_newsletter' },
    { id: 'emails-link-mob',           clau: 'admin_emails' },
    { id: 'estadisticas-link-mob',     clau: 'admin_estadisticas' },
    { id: 'stock-link-mob',            clau: 'admin_stock' },
    { id: 'pedidos-link-mob',          clau: 'admin_pedidos' },
    { id: 'pedidos-enviados-link-mob', clau: 'admin_pedidos_enviados' },
    { id: 'cupones-link-mob',          clau: 'admin_cupones' },
    { id: 'ressenyes-link-mob',        clau: 'admin_resenyes' },
    { id: 'integraciones-link-mob',    clau: 'admin_integraciones' },
  ];
  adminLinks.forEach(item => {
    const li = document.getElementById(item.id);
    if (li) li.querySelector('a').textContent = t(item.clau);
  });

  // Header top admin desktop
  const adminLinksDesktop = [
    { id: 'agregar-producto-link', clau: 'admin_agregar_producto' },
    { id: 'editor-inicio-link',    clau: 'admin_editor_secciones' },
    { id: 'configuracion-link',    clau: 'admin_configuracion' },
    { id: 'colores-link',          clau: 'admin_editor_colores' },
    { id: 'newsletter-link',       clau: 'admin_newsletter' },
    { id: 'emails-link',           clau: 'admin_emails' },
    { id: 'estadisticas-link',     clau: 'admin_estadisticas' },
    { id: 'stock-link',            clau: 'admin_stock' },
    { id: 'pedidos-link',          clau: 'admin_pedidos' },
    { id: 'pedidos-enviados-link', clau: 'admin_pedidos_enviados' },
    { id: 'cupones-link',          clau: 'admin_cupones' },
    { id: 'ressenyes-link',        clau: 'admin_resenyes' },
    { id: 'integraciones-link',    clau: 'admin_integraciones' },
  ];
  adminLinksDesktop.forEach(item => {
    const li = document.getElementById(item.id);
    if (li) li.querySelector('a').textContent = t(item.clau);
  });

  // Admin - Configuración General
  const configTitol = document.querySelector('#configuracion h2');
  if (configTitol) configTitol.textContent = t('admin_configuracion');
  const logoLabel = document.querySelector('label[for="logo-url"]');
  if (logoLabel) logoLabel.textContent = t('config_logo_url');
  const logoSubirBtn = document.querySelector('button[onclick="subirImagenLogo()"]');
  if (logoSubirBtn) logoSubirBtn.textContent = '📷 ' + t('editor_subir');
  const cabeceraH3 = document.getElementById('cabecera-titulo-h3');
  if (cabeceraH3) cabeceraH3.textContent = t('config_imagenes_cabecera');
  const cabeceraBtn = document.querySelector('button[onclick="subirIAfegirImagenCabecera()"]');
  if (cabeceraBtn) cabeceraBtn.textContent = '📷 ' + t('editor_subir');
  const descuentosH3 = document.getElementById('descuentos-titulo-h3');
  if (descuentosH3) descuentosH3.textContent = t('config_descuentos');
  const promocionLabel = document.querySelector('label[for="promocion-compra-superior"]');
  if (promocionLabel) promocionLabel.textContent = t('config_promocion');
  const porcentajeLabel = document.querySelector('label[for="porcentaje-descuento"]');
  if (porcentajeLabel) porcentajeLabel.textContent = t('config_porcentaje');
  const envioValorLabel = document.querySelector('label[for="envio-valor"]');
  if (envioValorLabel) envioValorLabel.textContent = t('config_envio');
  const envioGratisLabel = document.querySelector('label[for="envio-gratis-desde"]');
  if (envioGratisLabel) envioGratisLabel.textContent = t('config_envio_gratis');
  const sliderActivoLabel = document.querySelector('label[for="slider-activo"]');
  if (sliderActivoLabel) sliderActivoLabel.textContent = t('config_slider_activo');
  const resenyesH3 = document.querySelector('#configuracion h3:nth-of-type(3)');
  if (resenyesH3) resenyesH3.textContent = t('config_resenyes');
  const resenyesActivesLabel = document.querySelector('label[for="resenyes-actives"]');
  if (resenyesActivesLabel) resenyesActivesLabel.textContent = t('config_resenyes_actives');
  const resenyesModeLabel = document.querySelector('label[for="resenyes-mode"]');
  if (resenyesModeLabel) resenyesModeLabel.textContent = t('config_resenyes_mode');
  const resenyesModeSelect = document.getElementById('resenyes-mode');
  if (resenyesModeSelect) {
    resenyesModeSelect.options[0].textContent = t('config_resenyes_tothom');
    resenyesModeSelect.options[1].textContent = t('config_resenyes_compradors');
  }
  document.querySelectorAll('#configuracion [data-t]').forEach(el => {
    const key = el.getAttribute('data-t');
    if (key) el.textContent = t(key);
  });
  const agregarTitulo = document.querySelector('#agregar-producto h2');
  if (agregarTitulo) agregarTitulo.textContent = t('admin_agregar_producto');
  
  // Actualitzar selector d'idioma
  const selectorActual = document.getElementById('idioma-actual-text');
  if (selectorActual) {
    const idiomes = getIdiomes();
    const idioma = idiomes.find(i => i.codi === idiomaActiu);
    if (idioma) selectorActual.innerHTML = `<img src="${idioma.bandera}" alt="${idioma.nom}" style="width:20px; height:15px; object-fit:cover; border-radius:2px; vertical-align:middle;"> ${idioma.codi.toUpperCase()}`;
  }

  // Regenerar formulari agregar producto
  if (typeof buildAddProductForm === 'function' && document.getElementById('formulario-producto')) {
    buildAddProductForm();
  }

  // Admin - Editar producto
  const editarTitulo = document.querySelector('#editar-producto h2');
  if (editarTitulo) editarTitulo.textContent = t('admin_editar_producto');

  // Admin - Editor secciones
  const editorTitulo = document.querySelector('#editor-inicio h2');
  if (editorTitulo) editorTitulo.textContent = t('editor_titulo_pagina');
  const btnAñadirSeccion = document.querySelector('button[onclick="abrirModalSeccio()"]');
  if (btnAñadirSeccion) btnAñadirSeccion.textContent = t('editor_añadir_seccion');
  const modalTitulo = document.querySelector('#modal-seccio h3');
  if (modalTitulo) modalTitulo.textContent = t('editor_añadir_seccion_modal_titulo');
  const modalDesc = document.querySelector('#modal-seccio p');
  if (modalDesc) modalDesc.textContent = t('editor_añadir_seccion_modal_desc');
  const plantillesNoms = document.querySelectorAll('.plantilla-option-name');
  const plantillesDesc = document.querySelectorAll('.plantilla-option-desc');
  const plantillesNomClaus = ['editor_plantilla_texto_imagen','editor_plantilla_texto_video','editor_plantilla_galeria','editor_plantilla_solo_texto'];
  const plantillesDescClaus = ['editor_plantilla_texto_imagen_desc','editor_plantilla_texto_video_desc','editor_plantilla_galeria_desc','editor_plantilla_solo_texto_desc'];
  plantillesNoms.forEach((el, i) => { if (plantillesNomClaus[i]) el.textContent = t(plantillesNomClaus[i]); });
  plantillesDesc.forEach((el, i) => { if (plantillesDescClaus[i]) el.textContent = t(plantillesDescClaus[i]); });
  const modalCancelar = document.querySelector('button[onclick="tancarModalSeccio()"]');
  if (modalCancelar) modalCancelar.textContent = t('editor_cancelar');
  const modalConfirmar = document.querySelector('button[onclick="confirmarAfegirSeccio()"]');
  if (modalConfirmar) modalConfirmar.textContent = t('editor_añadir_seccion');
  const secPersonalizadasH3 = document.getElementById('editor-sec-personalizadas-h3');
  if (secPersonalizadasH3) secPersonalizadasH3.textContent = t('editor_secciones_personalizadas');
  const textosLegalesH3 = document.getElementById('editor-textos-legales-h3');
  if (textosLegalesH3) textosLegalesH3.textContent = t('editor_textos_legales');
  const redesH3 = document.getElementById('editor-redes-h3');
  if (redesH3) redesH3.textContent = t('editor_redes_sociales');
  const secOpcionalesH3 = document.getElementById('editor-secciones-opcionales-h3');
  if (secOpcionalesH3) secOpcionalesH3.textContent = t('editor_secciones_opcionales');
  const qsTextoLabel = document.getElementById('editor-qs-texto-label');
  if (qsTextoLabel) qsTextoLabel.textContent = t('editor_texto');
  const qsImagenLabel = document.getElementById('editor-qs-imagen-label');
  if (qsImagenLabel) qsImagenLabel.textContent = t('editor_imagen');
  const videoH3 = document.getElementById('editor-video-h3');
  if (videoH3) videoH3.textContent = t('editor_video_fondo');
  const videoLabel = document.querySelector('label[for="video-activo"]');
  if (videoLabel) videoLabel.textContent = t('editor_mostrar_video_label');
  const videoSubirBtn = document.querySelector('button[onclick="subirVideoInicio()"]');
  if (videoSubirBtn) videoSubirBtn.textContent = t('editor_subir_video');
  const mostrarQSLabel = document.querySelector('label[for="mostrar-quienes-somos"]');
  if (mostrarQSLabel) mostrarQSLabel.textContent = t('editor_mostrar_qs');
  const mostrarNovLabel = document.querySelector('label[for="mostrar-novedades"]');
  if (mostrarNovLabel) mostrarNovLabel.textContent = t('editor_mostrar_nov');
  const guardarConfigBtn = document.getElementById('guardar-config-inicio');
  if (guardarConfigBtn) guardarConfigBtn.textContent = t('editor_guardar_config');
  const imagenesInicioH3 = document.getElementById('editor-imagenes-inicio-h3');
  if (imagenesInicioH3) imagenesInicioH3.textContent = t('editor_imagenes_inicio');
  const agregarImagenBtn = document.querySelector('button[onclick="agregarImagenInicio()"]');
  if (agregarImagenBtn) agregarImagenBtn.textContent = t('editor_agregar_imagen');
  const qsH3 = document.getElementById('editor-qs-h3');
  if (qsH3) qsH3.textContent = t('editor_seccion_qs');
  const qsTituloLabel = document.getElementById('editor-qs-titulo-label');
  if (qsTituloLabel) qsTituloLabel.textContent = t('editor_titulo');
  const qsTituloInput = document.getElementById('qs-titulo');
  if (qsTituloInput) qsTituloInput.placeholder = t('editor_qs_titulo_input');
  const qsTextoInput = document.getElementById('qs-texto');
  if (qsTextoInput) qsTextoInput.placeholder = t('editor_qs_texto_input');
  const qsImagenInput = document.getElementById('qs-imagen-url');
  if (qsImagenInput) qsImagenInput.placeholder = t('editor_qs_imagen_url');
  const qsSubirBtn = document.querySelector('button[onclick="subirImagenQS()"]');
  if (qsSubirBtn) qsSubirBtn.textContent = '📷 ' + t('editor_subir');
  const guardarQSBtn = document.getElementById('guardar-quienes-somos');
  if (guardarQSBtn) guardarQSBtn.textContent = t('editor_guardar');
  const tabEnvio = document.querySelector('button[onclick="canviarTabLegal(\'envio\', this)"]');
  if (tabEnvio) tabEnvio.textContent = t('editor_envio_dev');
  const tabTerminos = document.querySelector('button[onclick="canviarTabLegal(\'terminos\', this)"]');
  if (tabTerminos) tabTerminos.textContent = t('editor_terminos');
  const tabPrivacidad = document.querySelector('button[onclick="canviarTabLegal(\'privacidad\', this)"]');
  if (tabPrivacidad) tabPrivacidad.textContent = t('editor_privacidad');
  const tabCookies = document.querySelector('button[onclick="canviarTabLegal(\'cookies\', this)"]');
  if (tabCookies) tabCookies.textContent = t('editor_gestionar_cookies');
  const guardarLegalBtn = document.getElementById('btn-guardar-legal');
  if (guardarLegalBtn) guardarLegalBtn.textContent = t('editor_guardar');
  const cookieBannerLabel = document.querySelector('label[for="cookie-banner-text-edit"]') || document.querySelector('#tab-legal-cookies label');
  if (cookieBannerLabel) cookieBannerLabel.textContent = t('editor_cookie_banner_texto');
  const cookieBannerInput = document.getElementById('cookie-banner-text-edit');
  if (cookieBannerInput) cookieBannerInput.placeholder = t('editor_cookie_banner_placeholder');
  const cookieCategoriasLabel = document.querySelectorAll('#tab-legal-cookies label')[1];
  if (cookieCategoriasLabel) cookieCategoriasLabel.textContent = t('editor_cookie_categorias');
  const cookieAñadirBtn = document.querySelector('button[onclick="afegirCategoriaCookie()"]');
  if (cookieAñadirBtn) cookieAñadirBtn.textContent = t('editor_cookie_añadir');
  const guardarRedesBtn = document.getElementById('guardar-redes-sociales');
  if (guardarRedesBtn) guardarRedesBtn.textContent = t('editor_guardar_redes');
  if (typeof aplicarIdiomaASeccions === 'function' && seccionsCachejades.length > 0) {
    aplicarIdiomaASeccions();
  }
  if (typeof updateQuienesSomosSection === 'function') {
    updateQuienesSomosSection();
  }
  if (typeof carregarQuienesSomos === 'function' && document.getElementById('qs-titols-container')) {
    carregarQuienesSomos();
  }
  if (typeof carregarSeccionsPersonalitzades === 'function' && document.getElementById('seccions-personalitzades-lista')) {
    carregarSeccionsPersonalitzades();
  }
  if (typeof renderCategoriasNav === 'function' && typeof productsCache !== 'undefined' && productsCache.length > 0) {
    renderCategoriasNav();
    renderProductGrid(productsCache);
  }
  if (typeof updateHomeImages === 'function') {
    updateHomeImages();
  }
  if (typeof carregarSeccionsPersonalitzades === 'function' && document.getElementById('seccions-personalitzades-lista')) {
    carregarSeccionsPersonalitzades();
  }
  if (typeof loadColoresForm === 'function' && document.getElementById('colores')?.classList.contains('active')) {
    loadColoresForm();
  }
  if (typeof loadStock === 'function' && document.getElementById('stock')?.classList.contains('active')) {
    loadStock();
  }
  if (typeof loadPedidos === 'function' && document.getElementById('pedidos')?.classList.contains('active')) {
    loadPedidos();
  }
  if (typeof loadPedidosEnviados === 'function' && document.getElementById('pedidos-enviados')?.classList.contains('active')) {
    loadPedidosEnviados();
  }
  if (typeof renderCart === 'function' && document.getElementById('carrito')?.classList.contains('active')) {
    renderCart();
    if (typeof showAddressForm === 'function' && document.getElementById('direccion-form')) {
      showAddressForm();
    }
  }
  if (typeof carregarImagenesInicio === 'function' && document.getElementById('imagenes-inicio-lista')) {
    carregarImagenesInicio();
  }
  if (typeof loadConfigForm === 'function' && document.getElementById('slider-promociones-container')) {
    loadConfigForm();
  }

  // Admin - Editor de colores
  const coloresTitulo = document.querySelector('#colores h2');
  if (coloresTitulo) coloresTitulo.textContent = t('admin_editor_colores');
  const coloresDesc = document.querySelector('#colores p');
  if (coloresDesc) coloresDesc.textContent = t('colores_descripcio');
  const guardarColoresBtn = document.getElementById('guardar-colores');
  if (guardarColoresBtn) guardarColoresBtn.textContent = t('colores_guardar');
  document.querySelectorAll('#colores [data-t]').forEach(el => {
    const key = el.getAttribute('data-t');
    if (key) el.textContent = t(key);
  });

  // Admin - Reseñas
  const resenyes_titulo = document.querySelector('#ressenyes-admin h2');
  if (resenyes_titulo) resenyes_titulo.textContent = t('admin_resenyes');
  const resenyesPendentsH3 = document.getElementById('resenyes-pendents-h3');
  if (resenyesPendentsH3) resenyesPendentsH3.textContent = t('resenyes_pendents');
  const resenyesAprovadeH3 = document.getElementById('resenyes-aprovades-h3');
  if (resenyesAprovadeH3) resenyesAprovadeH3.textContent = t('resenyes_aprovades');
  if (typeof loadRessenyes === 'function' && document.getElementById('ressenyes-pendents')) {
    loadRessenyes();
  }

  // Admin - Newsletter
  const newsletterTitulo = document.querySelector('#newsletter h2');
  if (newsletterTitulo) newsletterTitulo.textContent = t('admin_newsletter');
  const newsletterConfigH3 = document.getElementById('newsletter-config-h3');
  if (newsletterConfigH3) newsletterConfigH3.textContent = t('newsletter_config');
  const newsletterAsuntoLabel = document.getElementById('newsletter-asunto-label');
  if (newsletterAsuntoLabel) newsletterAsuntoLabel.textContent = t('newsletter_asunto');
  const newsletterAsuntoInput = document.getElementById('newsletter-asunto');
  if (newsletterAsuntoInput) newsletterAsuntoInput.placeholder = t('newsletter_asunto_placeholder');
  const newsletterIntroLabel = document.getElementById('newsletter-intro-label');
  if (newsletterIntroLabel) newsletterIntroLabel.textContent = t('newsletter_intro');
  const newsletterIntroInput = document.getElementById('newsletter-intro');
  if (newsletterIntroInput) newsletterIntroInput.placeholder = t('newsletter_intro_placeholder');
  const newsletterPromoLabel = document.getElementById('newsletter-promo-label');
  if (newsletterPromoLabel) newsletterPromoLabel.textContent = t('newsletter_promo');
  const newsletterPromoInput = document.getElementById('newsletter-promo');
  if (newsletterPromoInput) newsletterPromoInput.placeholder = t('newsletter_promo_placeholder');
  const newsletterColoresH3 = document.getElementById('newsletter-colores-h3');
  if (newsletterColoresH3) newsletterColoresH3.textContent = t('newsletter_colors');
  const colorNames = document.querySelectorAll('#newsletter .color-name');
  const colorClaus = ['newsletter_color_cabecera', 'newsletter_color_boton', 'newsletter_color_precios', 'newsletter_color_accent'];
  colorNames.forEach((el, i) => { if (colorClaus[i]) el.textContent = t(colorClaus[i]); });
  const guardarNewsletterBtn = document.getElementById('guardar-newsletter-config');
  if (guardarNewsletterBtn) guardarNewsletterBtn.textContent = t('newsletter_guardar_config');
  const newsletterEnviarH3 = document.getElementById('newsletter-enviar-h3');
  if (newsletterEnviarH3) newsletterEnviarH3.textContent = t('newsletter_enviar');
  const newsletterEnviarDesc = document.querySelector('#newsletter-enviar-h3 + p');
  if (newsletterEnviarDesc) newsletterEnviarDesc.textContent = t('newsletter_enviar_desc');
  const enviarNewsletterBtn = document.getElementById('enviar-newsletter-btn');
  if (enviarNewsletterBtn) enviarNewsletterBtn.textContent = t('newsletter_enviar_ahora');
  const newsletterSuscriptoresH3 = document.getElementById('newsletter-suscriptores-h3');
  if (newsletterSuscriptoresH3) newsletterSuscriptoresH3.textContent = t('newsletter_subscriptors');
  const newsletterPreviewH3 = document.getElementById('newsletter-preview-h3');
  if (newsletterPreviewH3) newsletterPreviewH3.textContent = t('newsletter_preview');

  // Newsletter - textos estàtics
  const nlConfigTitle = document.getElementById('nl-config-general-title');
  if (nlConfigTitle) nlConfigTitle.textContent = t('nl_config_general');
  const nlColorFondoLabel = document.getElementById('nl-color-fondo-label');
  if (nlColorFondoLabel) nlColorFondoLabel.textContent = t('nl_color_fondo');
  const nlAsuntoLabel = document.getElementById('nl-asunto-label');
  if (nlAsuntoLabel) nlAsuntoLabel.textContent = t('nl_asunto');
  const nlAñadirTitle = document.getElementById('nl-añadir-bloque-title');
  if (nlAñadirTitle) nlAñadirTitle.textContent = t('nl_añadir_bloque');
  const nlAddBtns = document.querySelectorAll('.nl-add-btn');
  const nlBtnClaus = ['nl_bloque_cabecera','nl_bloque_texto','nl_bloque_imagen','nl_bloque_img_texto','nl_bloque_boton','nl_bloque_productos','nl_bloque_descuento','nl_bloque_redes','nl_bloque_firma','nl_bloque_separador','nl_bloque_footer'];
  nlAddBtns.forEach((btn, i) => { if (nlBtnClaus[i]) btn.textContent = t(nlBtnClaus[i]); });
  const guardarNlBtn = document.getElementById('guardar-newsletter-config');
  if (guardarNlBtn) guardarNlBtn.textContent = t('nl_guardar');
  if (typeof nlRenderBlocks === 'function' && document.getElementById('nl-blocks-list')) {
    nlRenderBlocks();
  }
  
  // Newsletter - textos enviament i subscriptors
  const nlEnviarH3 = document.getElementById('newsletter-enviar-h3');
  if (nlEnviarH3) nlEnviarH3.textContent = t('nl_enviar_titulo');
  const nlEnviarDesc = document.getElementById('nl-enviar-desc');
  if (nlEnviarDesc) nlEnviarDesc.textContent = t('nl_enviar_desc');
  const nlEnviarBtn = document.getElementById('enviar-newsletter-btn');
  if (nlEnviarBtn) nlEnviarBtn.textContent = t('nl_enviar_btn');
  if (typeof loadNewsletter === 'function' && document.getElementById('newsletter-count')) {
    loadNewsletter();
  }

  // Admin - Estadísticas
  const estadisticasTitulo = document.querySelector('#estadisticas h2');
  if (estadisticasTitulo) estadisticasTitulo.textContent = t('admin_estadisticas');
  if (typeof loadEstadisticas === 'function' && document.getElementById('estadisticas-contenido')) {
    loadEstadisticas();
  }
  
  // Admin - Stock
  const stockTitulo = document.querySelector('#stock h2');
  if (stockTitulo) stockTitulo.textContent = t('admin_stock');
  if (typeof loadStock === 'function' && document.getElementById('stock-contenido')) {
    loadStock();
  }

  // Admin - Pedidos Abiertos
  const pedidosTitulo = document.querySelector('#pedidos h2');
  if (pedidosTitulo) pedidosTitulo.textContent = t('admin_pedidos');
  if (typeof loadPedidos === 'function' && document.getElementById('pedidos-contenido')) {
    loadPedidos();
  }
  
  // Admin - Pedidos Enviados
  const pedidosEnviadosTitulo = document.querySelector('#pedidos-enviados h2');
  if (pedidosEnviadosTitulo) pedidosEnviadosTitulo.textContent = t('admin_pedidos_enviados');
  if (typeof loadPedidosEnviados === 'function' && document.getElementById('pedidos-enviados-contenido')) {
    loadPedidosEnviados();
  }

  // Admin - Cupones
  const cuponesTitulo = document.querySelector('#cupones h2');
  if (cuponesTitulo) cuponesTitulo.textContent = t('admin_cupones');
  if (typeof loadCupones === 'function' && document.getElementById('cupones-contenido')) {
    loadCupones();
  }

  // Admin - Integraciones
  const integracionesTitulo = document.querySelector('#integraciones h2');
  if (integracionesTitulo) integracionesTitulo.textContent = t('admin_integraciones');
  if (typeof loadIntegraciones === 'function' && document.getElementById('integraciones-contenido')) {
    loadIntegraciones();
  }

  if (typeof renderCategoriasNav === 'function') {
    renderCategoriasNav();
  }

// Actualitzar breadcrumb amb l'idioma nou
  const hashActual = location.hash.replace('#', '') || 'inicio';
  updateBreadcrumb(hashActual);

// Recarregar secció emails si està activa
  if (location.hash === '#emails') loadEmails();
}

  if (location.hash.startsWith('#detalle-producto')) {
    const docId = location.hash.split('/')[1];
    if (docId) showProductDetail(docId);
}


function getIdiomes() {
  const tots = [
    { codi: 'es',  nom: 'Español',    bandera: './flags/es.svg' },
    { codi: 'cat', nom: 'Català',      bandera: './flags/cat.svg' },
    { codi: 'en',  nom: 'English',     bandera: './flags/gb.svg' },
    { codi: 'fr',  nom: 'Français',    bandera: './flags/fr.svg' },
    { codi: 'de',  nom: 'Deutsch',     bandera: './flags/de.svg' },
    { codi: 'it',  nom: 'Italiano',    bandera: './flags/it.svg' },
    { codi: 'pt',  nom: 'Português',   bandera: './flags/pt.svg' },
    { codi: 'sv',  nom: 'Svenska',     bandera: './flags/se.svg' },
    { codi: 'da',  nom: 'Dansk',       bandera: './flags/dk.svg' },
    { codi: 'pl',  nom: 'Polski',      bandera: './flags/pl.svg' },
    { codi: 'fi',  nom: 'Suomi',       bandera: './flags/fi.svg' },
    { codi: 'no',  nom: 'Norsk',       bandera: './flags/no.svg' },
  ];
  const actius = config.idiomasActivos || ['es'];
  return tots.filter(i => actius.includes(i.codi));
}

function renderIdiomaDropdown() {
  const dropdown = document.getElementById('idioma-dropdown');
  if (!dropdown) return;
  const idiomes = getIdiomes();
  dropdown.innerHTML = idiomes.map(i => `
    <div onclick="canviarIdioma('${i.codi}')" style="padding:0.5rem 1rem; cursor:pointer; font-size:0.85rem; display:flex; align-items:center; gap:0.5rem; color:var(--text);"
    onmouseover="this.style.background='var(--bg)'" onmouseout="this.style.background='none'">
      <img src="${i.bandera}" alt="${i.nom}" style="width:20px; height:15px; object-fit:cover; border-radius:2px;">
      <span>${i.nom}</span>
    </div>
  `).join('');
}

function inicialitzarIdioma(idiomaDefecte = 'es') {
  const idiomaGuardat = localStorage.getItem('tradenfy_idioma');
  idiomaActiu = idiomaGuardat || idiomaDefecte;
  aplicarIdioma(idiomaActiu);
}

function renderIdiomaDefecteSelector() {
  const idiomes = getIdiomes();
  const valorActual = document.getElementById('idioma-defecto')?.value || config.idiomaDefecte || 'es';
  const tots = [
    { codi: 'es',  nom: 'Español',    bandera: './flags/es.svg' },
    { codi: 'cat', nom: 'Català',      bandera: './flags/cat.svg' },
    { codi: 'en',  nom: 'English',     bandera: './flags/gb.svg' },
    { codi: 'fr',  nom: 'Français',    bandera: './flags/fr.svg' },
    { codi: 'de',  nom: 'Deutsch',     bandera: './flags/de.svg' },
    { codi: 'it',  nom: 'Italiano',    bandera: './flags/it.svg' },
    { codi: 'pt',  nom: 'Português',   bandera: './flags/pt.svg' },
    { codi: 'sv',  nom: 'Svenska',     bandera: './flags/se.svg' },
    { codi: 'da',  nom: 'Dansk',       bandera: './flags/dk.svg' },
    { codi: 'pl',  nom: 'Polski',      bandera: './flags/pl.svg' },
    { codi: 'fi',  nom: 'Suomi',       bandera: './flags/fi.svg' },
    { codi: 'no',  nom: 'Norsk',       bandera: './flags/no.svg' },
  ];
  const idiomaActual = tots.find(i => i.codi === valorActual) || tots[0];
  const actual = document.getElementById('idioma-defecto-actual');
  if (actual) actual.innerHTML = `<img src="${idiomaActual.bandera}" style="width:20px; height:15px; object-fit:cover; border-radius:2px;"> ${idiomaActual.nom}`;
  const dropdown = document.getElementById('idioma-defecto-dropdown');
  if (dropdown) {
    dropdown.innerHTML = tots.map(i => `
      <div onclick="seleccionarIdiomaDefecte('${i.codi}')" style="padding:0.5rem 0.75rem; cursor:pointer; display:flex; align-items:center; gap:0.5rem; font-size:0.9rem; ${i.codi === valorActual ? 'background:var(--bg);' : ''}"
        onmouseover="this.style.background='var(--bg)'" onmouseout="this.style.background='${i.codi === valorActual ? 'var(--bg)' : 'none'}'">
        <img src="${i.bandera}" style="width:20px; height:15px; object-fit:cover; border-radius:2px;"> ${i.nom}
      </div>
    `).join('');
  }
}

window.toggleIdiomaDefecteDropdown = function() {
  const dd = document.getElementById('idioma-defecto-dropdown');
  if (!dd) return;
  dd.style.display = dd.style.display === 'none' ? 'block' : 'none';
  setTimeout(() => {
    document.addEventListener('click', function handler(e) {
      if (!e.target.closest('#idioma-defecto-selector')) {
        dd.style.display = 'none';
        document.removeEventListener('click', handler);
      }
    });
  }, 0);
};

window.seleccionarIdiomaDefecte = function(codi) {
  document.getElementById('idioma-defecto').value = codi;
  document.getElementById('idioma-defecto-dropdown').style.display = 'none';
  renderIdiomaDefecteSelector();
};

window.renderIdiomaDefecteSelector = renderIdiomaDefecteSelector;

window.aplicarIdioma = aplicarIdioma;
window.canviarIdioma = function(codi) {
  aplicarIdioma(codi);
  document.getElementById('idioma-dropdown').style.display = 'none';
};
window.toggleIdiomaDropdown = function() {
  const dd = document.getElementById('idioma-dropdown');
  dd.style.display = dd.style.display === 'none' ? 'block' : 'none';
  setTimeout(() => {
    document.addEventListener('click', function handler(e) {
      if (!e.target.closest('#idioma-selector')) {
        dd.style.display = 'none';
        document.removeEventListener('click', handler);
      }
    });
  }, 0);
};

/* ---------------------------
   CONFIGURACIÓ CLOUDFLARE WORKERS
   --------------------------- */
const NETLIFY_FUNCTION_URL = 'https://miuart-functions.miuart.workers.dev/enviar-contacto';

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
const editorInicioLink = document.getElementById("editor-inicio-link");
const configuracionLink = document.getElementById("configuracion-link");
const coloresLink = document.getElementById("colores-link");
const newsletterLink = document.getElementById("newsletter-link");
const emailsLink = document.getElementById("emails-link");
const estadisticasLink = document.getElementById("estadisticas-link");
const stockLink = document.getElementById("stock-link");
const pedidosLink = document.getElementById("pedidos-link");
const pedidosEnviadosLink = document.getElementById("pedidos-enviados-link");
const integracionesLink = document.getElementById("integraciones-link");
const cuponesLink = document.getElementById("cupones-link");
const resenyesLink = document.getElementById("ressenyes-link");
const resenyesLinkMob = document.getElementById("ressenyes-link-mob");

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
const CART_KEY = "tradenfy_cart_v1";
let carrito = JSON.parse(localStorage.getItem(CART_KEY) || "[]");

const COOKIE_KEY = "tradenfy_cookies_v1";
const COOKIE_EXPIRY_DAYS = 180;

/* Valors de configuració general */
let config = {
    envioEstandar: 6.00,
    enviamentGratisDesDe: 35.00,
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
    // NOVA: Configuració per a "Nuestra Especialidad"
    imagenEspecialidad1: "",
    imagenEspecialidad2: "",
    imagenEspecialidad3: "",
    imagenEspecialidad4: "",
    imagenEspecialidad5: "",
    tituloNuestraEspecialidad: "",
    textoNuestraEspecialidad: "",
    // NUEVO: Configuración para "Promociones"
    imagenPromociones1: "",
    imagenPromociones2: "",
    imagenPromociones3: "",
    imagenPromociones4: "",
    // NOU: Configuració de descomptes
    promocionCompraSuperiorA: 0,
    porcentajeDescuento: 0
};

/* ---------------------------
   SUSCRIPTORES NEWSLETTER
   --------------------------- */
let newsletterConsentActiu = false;

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

  const pageNames = {
    'inicio':               t('breadcrumb_inicio'),
    'tienda':               t('breadcrumb_tienda'),
    'novedades':            t('breadcrumb_novedades'),
    'carrito':              t('breadcrumb_carrito'),
    'login-section':        t('breadcrumb_login'),
    'agregar-producto':     t('breadcrumb_agregar_producto'),
    'editar-producto':      t('breadcrumb_editar_producto'),
    'configuracion':        t('breadcrumb_configuracion'),
    'detalle-producto':     t('breadcrumb_detalle_producto'),
    'quienes-somos':        t('breadcrumb_quienes_somos'),
    'contacto':             t('breadcrumb_contacto'),
    'envio-devoluciones':   t('breadcrumb_envio'),
    'terminos-condiciones': t('breadcrumb_terminos'),
    'politica-privacidad':  t('breadcrumb_privacidad'),
    'editor-inicio':        t('breadcrumb_editor_secciones'),
    'colores':              t('breadcrumb_colores'),
    'estadisticas':         t('breadcrumb_estadisticas'),
    'stock':                t('breadcrumb_stock'),
    'pedidos':              t('breadcrumb_pedidos'),
    'pedidos-enviados':     t('breadcrumb_pedidos_enviados'),
    'cupones':              t('breadcrumb_cupones'),
    'ressenyes-admin':      t('breadcrumb_resenyes'),
    'integraciones':        t('breadcrumb_integraciones'),
    'newsletter':           t('admin_newsletter'),
  };

  let breadcrumbItems = [];

  breadcrumbItems.push({
    name: t('breadcrumb_inicio'),
    href: '#inicio'
  });

  if (pageId === 'detalle-producto' && productName) {
    breadcrumbItems.push({ name: t('breadcrumb_tienda'), href: '#tienda' });
    breadcrumbItems.push({ name: productName, href: null });
  } else if (pageId === 'editar-producto' && productName) {
    breadcrumbItems.push({ name: t('breadcrumb_editar_producto'), href: null });
    breadcrumbItems.push({ name: productName, href: null });
  } else if (pageId === 'novedades') {
    breadcrumbItems.push({ name: t('breadcrumb_novedades'), href: null });
  } else {
    let pageName = pageNames[pageId];
    if (!pageName) {
      const secEl = document.getElementById(pageId);
      const h2 = secEl?.querySelector('h2');
      pageName = h2?.textContent || pageId.replace(/-/g, ' ');
    }
    breadcrumbItems.push({
      name: pageName,
      href: pageId === 'inicio' ? null : `#${pageId}`
    });
  }

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

  breadcrumb.style.display = pageId === 'inicio' ? 'none' : 'block';
}

/* ---------------------------
   CONFIGURACIÓ GENERAL (Slider, Video, Logo, etc.)
   --------------------------- */
function updateUIFromConfig() {
  // Slider promocional
  if (sliderPromocionalText && sliderPromocional) {
    const sliderText = (config.sliderPromocions && config.sliderPromocions[idiomaActiu]) || config.sliderPromocionalTexto || '';
    if (!config.sliderActivo || sliderText.trim() === "") {
      sliderPromocional.style.display = "none";
      document.querySelector("header").style.top = "0px";
    } else {
      sliderPromocional.style.display = "flex";
      sliderPromocionalText.textContent = sliderText;
      document.querySelector("header").style.top = "35px";
    }
  }
  // Logo
  if (headerLogoImg && config.logoUrl) {
    headerLogoImg.src = config.logoUrl;
  }
  // Video (només es mostra a la pàgina d'inici)
  if (location.hash === '' || location.hash === '#inicio') {
    const videoRef = doc(db, "seccionInicio", "video");
    getDoc(videoRef).then(snap => {
      if (snap.exists() && snap.data().activo && snap.data().url) {
        if (heroVideo) heroVideo.src = snap.data().url;
        if (videoContainerWrapper) videoContainerWrapper.style.display = 'block';
      } else if (videoContainerWrapper) {
        videoContainerWrapper.style.display = 'none';
      }
    });
  } else if (videoContainerWrapper) {
    videoContainerWrapper.style.display = 'none';
  }
  
  // NOU: Actualitzar imatges de la home
  updateHomeImages();
  
  // NOU: Actualitzar secció "Quiénes somos"
  updateQuienesSomosSection();
  }

// NOVA FUNCIÓ: Actualitzar imatges de la home
async function updateHomeImages() {
  const container = document.getElementById('home-images-container');
  if (!container) return;

  try {
    const snap = await getDocs(collection(db, "imagenesInicio"));
    const imatges = [];
    snap.forEach(d => imatges.push({ id: d.id, ...d.data() }));
    imatges.sort((a, b) => (a.orden || 0) - (b.orden || 0));

    container.innerHTML = '';

    imatges.forEach(img => {
      if (!img.url) return;
      const div = document.createElement('div');
      div.className = 'home-image-section';
      div.innerHTML = `
        <div class="home-image-wrapper">
          <img src="${img.url}" alt="">
          ${img.tieneBoton ? `
            <div class="home-image-overlay">
              <button class="btn primary home-image-btn" onclick="location.hash='${img.destino}'">${(img.textosBoton && img.textosBoton[idiomaActiu]) || img.textoBoton || ''}</button>
            </div>
          ` : ''}
        </div>
      `;
      container.appendChild(div);
    });
  } catch (err) {
    console.error("Error carregant imatges inicio:", err);
  }
}

// NOVA FUNCIÓ: Actualitzar secció "Quiénes somos"
async function updateQuienesSomosSection() {
  try {
    const ref = doc(db, "seccionInicio", "configuracion");
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data();
      const titol = (data.qsTitols && data.qsTitols[idiomaActiu]) || data.qsTitulo || '';
      const text = (data.qsTextos && data.qsTextos[idiomaActiu]) || data.qsTexto || '';
      if (quienesSomosTitulo) quienesSomosTitulo.textContent = titol;
      if (quienesSomosTexto) quienesSomosTexto.textContent = text;
      if (quienesSomosImagen && data.qsImagenUrl) quienesSomosImagen.src = data.qsImagenUrl;
    }
  } catch (err) {
    console.error("Error actualitzant Quiénes somos:", err);
  }
}
  
    
/* ---------------------------
   ROUTING
   --------------------------- */
function showPage(id) {
  const adminSections = ['agregar-producto', 'editar-producto', 'editor-inicio', 'configuracion', 'colores', 'newsletter', 'estadisticas', 'stock', 'pedidos', 'pedidos-enviados', 'cupones', 'integraciones', 'ressenyes-admin', 'emails'];
if (adminSections.includes(id)) {
  document.body.style.background = '#ffffff';
} else {
  document.body.style.removeProperty('background');
}
  document.querySelectorAll('.pagina').forEach(p => { p.classList.remove("active"); p.style.display = "none"; });
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
  } else if (id === "editor-inicio") {
    loadEditorInicio();
  } else if (id === "configuracion") {
    loadConfigForm();
    loadHeaderList();
  } else if (id === "colores") {
    loadColoresForm();
  } else if (id === "newsletter") {
    loadNewsletter();
  } else if (id === "emails") {
    loadEmails();
  } else if (id === "detalle-producto") {
    loadHeaderImagesDetalle();
  } else if (id === "estadisticas") {
    loadEstadisticas();
  } else if (id === "stock") {
    loadStock();
  } else if (id === "pedidos") {
    loadPedidos();
  } else if (id === "pedidos-enviados") {
    loadPedidosEnviados();
  } else if (id === "integraciones") {
    loadIntegraciones();
  } else if (id === "cupones") {
    loadCupones();
  } else if (id === "ressenyes-admin") {
    loadRessenyes();
  }
 

  // NOU: Amagar el pop-up de cerca quan canviem de pàgina
  hideSearchResults();

  // Registrar visita (no registrem pàgines d'admin)
  const paginasAdmin = ["agregar-producto", "editor-inicio", "editar-producto", "imagenes-cabecera", "configuracion", "colores", "newsletter", "emails", "estadisticas", "stock", "pedidos", "pedidos-enviados", "cupones", "integraciones", "login-section"];
  if (!paginasAdmin.includes(id)) {
    registrarVisita(id);
  }
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
  const paginaExistent = document.getElementById(h);
  if (paginaExistent) {
    showPage(h);
  } else {
    // Secció personalitzada — buscar i mostrar
    const seccioEl = document.getElementById(h);
    if (seccioEl) {
      showPage(h);
    } else {
      showPage("inicio");
    }
  }
});

const initialHash = location.hash.replace("#", "") || "inicio";
if (initialHash.startsWith("detalle-producto/")) {
  const docId = initialHash.split("/")[1];
  showPage("detalle-producto");
  showProductDetail(docId);
} else if (initialHash.startsWith("editar-producto/")) {
  const docId = initialHash.split("/")[1];
  showPage("editar-producto");
  loadEditForm(docId);
} else {
  // Esperar que loadConfig carregui les seccions personalitzades
  const esperarSeccio = (intents = 0) => {
    const paginaExistent = document.getElementById(initialHash);
    if (paginaExistent) {
      showPage(initialHash);
    } else if (intents < 20) {
      setTimeout(() => esperarSeccio(intents + 1), 100);
    } else {
      showPage("inicio");
    }
  };
  esperarSeccio();
}

/* ---------------------------
   NAV MENU (mobiles)
   --------------------------- */
const menuOverlay = document.getElementById("menu-overlay");
const menuIconOpen = document.getElementById("menu-icon-open");
const menuIconClose = document.getElementById("menu-icon-close");

function openMenu() {
  menuOverlay.classList.add("active");
  menuIconOpen.style.display = "none";
  menuIconClose.style.display = "block";
}

function closeMenu() {
  menuOverlay.classList.remove("active");
  menuIconOpen.style.display = "block";
  menuIconClose.style.display = "none";
}

if (menuToggle && menuOverlay) {
  menuToggle.addEventListener("click", () => {
    menuOverlay.classList.contains("active") ? closeMenu() : openMenu();
  });
  menuOverlay.addEventListener("click", (e) => {
    if (e.target === menuOverlay) closeMenu();
  });
  menuOverlay.querySelectorAll("a").forEach(a => {
    a.addEventListener("click", () => closeMenu());
  });
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
    editorInicioLink.style.display = "inline-block";
    configuracionLink.style.display = "inline-block";
    coloresLink.style.display = "inline-block";
    newsletterLink.style.display = "inline-block";
    emailsLink.style.display = "inline-block";
    estadisticasLink.style.display = "inline-block";
    stockLink.style.display = "inline-block";
    pedidosLink.style.display = "inline-block";
    pedidosEnviadosLink.style.display = "inline-block";
    integracionesLink.style.display = "inline-block";
    cuponesLink.style.display = "inline-block";
    resenyesLink.style.display = "inline-block";
    if (resenyesLinkMob) resenyesLinkMob.style.display = "block";
    // Mòbil: mostrar icona admin
    const adminBtn = document.getElementById("admin-toggle-btn");
    if (adminBtn) adminBtn.style.display = "flex";
  } else {
    usuarioInfo.textContent = "";
    authLink.textContent = "Login";
    authLink.href = "#login-section";
    authLink.onclick = null;
    agregarProductoLink.style.display = "none";
    editorInicioLink.style.display = "none";
    configuracionLink.style.display = "none";
    coloresLink.style.display = "none";
    newsletterLink.style.display = "none";
    emailsLink.style.display = "none";
    estadisticasLink.style.display = "none";
    stockLink.style.display = "none";
    pedidosLink.style.display = "none";
    pedidosEnviadosLink.style.display = "none";
    integracionesLink.style.display = "none";
    cuponesLink.style.display = "none";
    resenyesLink.style.display = "none";
    if (resenyesLinkMob) resenyesLinkMob.style.display = "none";
    // Mòbil: ocultar icona admin i tancar overlay
    const adminBtn = document.getElementById("admin-toggle-btn");
    if (adminBtn) adminBtn.style.display = "none";
    if (adminOverlay) adminOverlay.classList.remove("active");
  }
  loadCloudinaryConfig();
  loadProducts();
  loadConfig();
  loadEmailConfig();
  renderTextosLegales();
});

/* ---------------------------
   CARGA PRODUCTOS
   --------------------------- */
let productsCache = [];
async function loadProducts() {
  if (!listaProductos) return;
  listaProductos.innerHTML = `<p>${t('editor_cargando')}</p>`;
  try {
    const q = query(collection(db, "productes"), orderBy("nom"), limit(1000));
    const snap = await getDocs(q);
    const arr = [];
    snap.forEach(d => {
      arr.push({ _docId: d.id, ...d.data() });
    });
    productsCache = arr;
    renderProductGrid(arr);
    await renderCategoriasNav();
    if (location.hash === "#novedades") {
      loadNovedades();
    }
  } catch (err) {
    console.error("Error cargando productos:", err);
    listaProductos.innerHTML = `<p>Error al cargar productos: ${err.message || err}</p>`;
  }
}

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


// Helpers multiidioma per productes
function getNomProducte(p) {
  return (p.noms && p.noms[idiomaActiu]) || p.nom || '';
}
function getDescripcioProducte(p) {
  return (p.descripcions && p.descripcions[idiomaActiu]) || p.descripcio || '';
}

function getTipusVariant(v) {
  return (v.tipusPerIdioma && v.tipusPerIdioma[idiomaActiu]) || v.tipus || '';
}
function getNomVariant(v) {
  return (v.nomPerIdioma && v.nomPerIdioma[idiomaActiu]) || v.nom || '';
}
function getCategoriaProducte(p) {
  return (p.categories && p.categories[idiomaActiu]) || p.categoria || '';
}

function renderProductGrid(products) {
  if (!listaProductos) return;
  listaProductos.innerHTML = "";
  const search = (searchInput?.value || "").trim().toLowerCase();
  const isAdmin = !!auth.currentUser;

  // Generar filtres de categories
  const categoriasFiltres = document.getElementById("categorias-filtres");
  if (categoriasFiltres) {
  const categories = [...new Set(products.filter(p => getCategoriaProducte(p)).map(p => getCategoriaProducte(p)))].sort();
  const filtresBar = document.getElementById("filtres-bar");
  if (categories.length > 0) {
    if (filtresBar) filtresBar.style.display = "block";
    categoriasFiltres.style.display = "none";
    categoriasFiltres.innerHTML = `
      <button class="btn-categoria active" onclick="filtrarCategoria('', this)">${t('tienda_todos')}</button>
      ${categories.map(c => `<button class="btn-categoria" onclick="filtrarCategoria('${c}', this)">${c}</button>`).join('')}
    `;
  } else {
    if (filtresBar) filtresBar.style.display = "none";
    categoriasFiltres.innerHTML = "";
  }
}

// Ordenar productes
let productsSorted = [...products];
if (ordenActiu === 'alfabetic') {
  productsSorted.sort((a, b) => (a.nom || '').localeCompare(b.nom || ''));
} else if (ordenActiu === 'preu-asc') {
  productsSorted.sort((a, b) => Number(a.variants?.[0]?.preu || 0) - Number(b.variants?.[0]?.preu || 0));
} else if (ordenActiu === 'preu-desc') {
  productsSorted.sort((a, b) => Number(b.variants?.[0]?.preu || 0) - Number(a.variants?.[0]?.preu || 0));
} else if (ordenActiu === 'novedades') {
  productsSorted.sort((a, b) => (b.novedades ? 1 : 0) - (a.novedades ? 1 : 0));
} else {
  productsSorted.sort((a, b) => (a.id || '').localeCompare(b.id || ''));
}

  const visibleProducts = productsSorted.filter(p => {
    if (categoriaActiva && p.categoria !== categoriaActiva) return false;
    if (isAdmin) {
      if (!search) return true;
      return (getNomProducte(p) || "").toLowerCase().includes(search) || (getDescripcioProducte(p) || "").toLowerCase().includes(search) || (p.id || "").toLowerCase().includes(search);
    }
    if (p.ocult) return false;
    if (!search) return true;
    return (getNomProducte(p) || "").toLowerCase().includes(search) || (getDescripcioProducte(p) || "").toLowerCase().includes(search) || (p.id || "").toLowerCase().includes(search);
  });

  if (!visibleProducts.length) {
    listaProductos.innerHTML = `<p>${t('tienda_sin_productos')}</p>`;
    return;
  }

  visibleProducts.forEach(p => {
    const variants = p.variants || [];
    const hasVariants = variants.length > 0;
    const mainVariant = hasVariants ? variants[0] : { nom: "", preu: 0, stock: 0, imatges: [], tipus: "" };
    const firstImg = (mainVariant.imatges && mainVariant.imatges[0]) ? mainVariant.imatges[0] : "https://via.placeholder.com/600x400?text=Sin+imagen";
    const shouldShowVariants = hasVariants && variants.length > 1;
    const variantLabel = shouldShowVariants ? (getTipusVariant(mainVariant) || t('tienda_variante')) : t('tienda_variante');

    const card = document.createElement("div");
    card.className = `producte${p.ocult ? ' producte-ocult' : ''}`;
    card.innerHTML = `
      <a href="#detalle-producto/${p._docId}" class="product-link">
        <img loading="lazy" src="${firstImg}" alt="${getNomProducte(p)}">
        <div class="content">
          <h3>${escapeHtml(getNomProducte(p) || "Producto")}</h3>
        </div>
      </a>
      <div class="product-variant-section">
        <div class="variant-label">${escapeHtml(variantLabel)}</div>
        <div class="variant-selector">
          <select class="variant-select" data-docid="${p._docId}" ${!shouldShowVariants ? 'disabled' : ''}>
            ${!hasVariants ? 
              `<option value="0" selected>${t('tienda_sin_variantes')}</option>` :
              variants.length === 1 ?
                `<option value="0" selected>${t('tienda_sin_variantes')}</option>` :
                variants.map((v, idx) => 
                  `<option value="${idx}">${escapeHtml(getNomVariant(v) || `Variante ${idx + 1}`)}</option>`
                ).join('')
            }
          </select>
        </div>
        <div class="meta">
          <div class="price">${formatPrice(Number(mainVariant.preu || 0))}</div>
          <div class="stock" style="color:${mainVariant.stock <= 3 ? '#c0392b' : 'var(--muted)'}">${mainVariant.stock <= 3 ? t('tienda_quedan') + ' ' + mainVariant.stock : t('tienda_stock_label') + ' ' + mainVariant.stock}</div>
        </div>
      </div>
      <div class="producte-botons">
        ${auth.currentUser ? `<button class="btn secondary" data-delete="${p._docId}">${t('tienda_eliminar')}</button>
        <button class="btn secondary" data-edit="${p._docId}">${t('tienda_editar')}</button>
        <button class="btn secondary" data-toggle="${p._docId}">${p.ocult ? t('tienda_mostrar') : t('tienda_ocultar')}</button>` : ""}
        <button class="btn primary add-to-cart" data-docid="${p._docId}" data-variant="0">${t('tienda_añadir_carrito')}</button>
      </div>
    `;
    listaProductos.appendChild(card);
    if (p.ocult) {
      const badge = document.createElement('span');
      badge.className = 'producte-ocult-badge';
      badge.textContent = t('stock_oculto');
      card.appendChild(badge);
    }

    if (shouldShowVariants) {
      const variantSelect = card.querySelector('.variant-select');
      const priceEl = card.querySelector('.price');
      const stockEl = card.querySelector('.stock');
      const addToCartBtn = card.querySelector('.add-to-cart');
      variantSelect.addEventListener('change', function() {
        const variantIndex = parseInt(this.value);
        const selectedVariant = variants[variantIndex];
        priceEl.textContent = formatPrice(Number(selectedVariant.preu || 0));
        const stockColor = selectedVariant.stock <= 3 ? '#c0392b' : 'var(--muted)';
        const stockText = selectedVariant.stock <= 3 ? t('tienda_quedan') + ' ' + selectedVariant.stock : t('tienda_stock_label') + ' ' + selectedVariant.stock;
        stockEl.textContent = stockText;
        stockEl.style.color = stockColor;
        addToCartBtn.dataset.variant = variantIndex;
      });
    }

    const addToCartBtn = card.querySelector('.add-to-cart');
    addToCartBtn.addEventListener("click", () => {
      const docId = addToCartBtn.dataset.docid;
      const variantIndex = parseInt(addToCartBtn.dataset.variant || 0);
      addToCart(docId, variantIndex, 1);
    });
  });

  listaProductos.querySelectorAll("button[data-delete]").forEach(b => b.addEventListener("click", async () => {
    if (!confirm(t('tienda_confirmar_eliminar'))) return;
    try {
      await deleteDoc(doc(db, "productes", b.dataset.delete));
      await loadProducts();
    } catch (err) { alert(t('tienda_error_eliminar') + ' ' + (err.message || err)); console.error(err); }
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
    } catch (err) { console.error(err); alert(t('tienda_error_visibilidad')); }
  }));
}

function renderProductGridNovedades(products, container) {
  container.innerHTML = "";
  products.forEach(p => {
    const variants = p.variants || [];
    const hasVariants = variants.length > 0;
    const mainVariant = hasVariants ? variants[0] : { nom: "", preu: 0, stock: 0, imatges: [], tipus: "" };
    const firstImg = (mainVariant.imatges && mainVariant.imatges[0]) ? mainVariant.imatges[0] : "https://via.placeholder.com/600x400?text=Sin+imagen";
    const shouldShowVariants = hasVariants && variants.length > 1;
    const variantLabel = shouldShowVariants ? (getTipusVariant(mainVariant) || t('tienda_variante')) : t('tienda_variante');

    const card = document.createElement("div");
    card.className = "producte";
    card.innerHTML = `
      <a href="#detalle-producto/${p._docId}" class="product-link">
        <img loading="lazy" src="${firstImg}" alt="${getNomProducte(p)}">
        <div class="content">
          <h3>${escapeHtml(getNomProducte(p) || "Producto")}</h3>
        </div>
      </a>
      <div class="product-variant-section">
        <div class="variant-label">${escapeHtml(variantLabel)}</div>
        <div class="variant-selector">
          <select class="variant-select" data-docid="${p._docId}" ${!shouldShowVariants ? 'disabled' : ''}>
            ${!hasVariants ? 
              `<option value="0" selected>${t('tienda_sin_variantes')}</option>` : 
              variants.length === 1 ?
                `<option value="0" selected>${t('tienda_sin_variantes')}</option>` :
                variants.map((v, idx) => 
                  `<option value="${idx}">${escapeHtml(getNomVariant(v) || `Variante ${idx + 1}`)}</option>`
                ).join('')
            }
          </select>
        </div>
        <div class="meta">
          <div class="price">${formatPrice(Number(mainVariant.preu || 0))}</div>
          <div class="stock" style="color:${mainVariant.stock <= 3 ? '#c0392b' : 'var(--muted)'}">${mainVariant.stock <= 3 ? t('tienda_quedan') + ' ' + mainVariant.stock : t('tienda_stock_label') + ' ' + mainVariant.stock}</div>
        </div>
      </div>
      <div class="producte-botons">
        <button class="btn primary add-to-cart" data-docid="${p._docId}" data-variant="0">${t('tienda_añadir_carrito')}</button>
      </div>
    `;
    container.appendChild(card);

    if (shouldShowVariants) {
      const variantSelect = card.querySelector('.variant-select');
      const priceEl = card.querySelector('.price');
      const stockEl = card.querySelector('.stock');
      const addToCartBtn = card.querySelector('.add-to-cart');
      variantSelect.addEventListener('change', function() {
        const variantIndex = parseInt(this.value);
        const selectedVariant = variants[variantIndex];
        priceEl.textContent = formatPrice(Number(selectedVariant.preu || 0));
        const stockColor = selectedVariant.stock <= 3 ? '#c0392b' : 'var(--muted)';
        const stockText = selectedVariant.stock <= 3 ? t('tienda_quedan') + ' ' + selectedVariant.stock : t('tienda_stock_label') + ' ' + selectedVariant.stock;
        stockEl.textContent = stockText;
        stockEl.style.color = stockColor;
        addToCartBtn.dataset.variant = variantIndex;
      });
    }

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
  detalleContenido.innerHTML = `<p>${t('detalle_cargando')}</p>`;
  try {
    const ref = doc(db, "productes", docId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      detalleContenido.innerHTML = `<p>${t('detalle_no_encontrado')}</p>`;
      return;
    }
    const data = { _docId: snap.id, ...snap.data() };
    const variants = data.variants || [];
    const mainVariant = variants[0] || { nom: "", preu: 0, stock: 0, imatges: [], tipus: "" };
    const imgs = (mainVariant.imatges && mainVariant.imatges.length) ? mainVariant.imatges : ["https://via.placeholder.com/800x600?text=Sin+imagen"];
    const variantTypeLabel = escapeHtml(getTipusVariant(mainVariant) || t('tienda_sin_variantes'));

    updateBreadcrumb('detalle-producto', getNomProducte(data) || t('detalle_no_encontrado'));

    detalleContenido.innerHTML = `
      <div class="product-gallery" role="region">
        <div class="main-image-container">
          <img id="main-img" src="${escapeAttr(imgs[0])}" alt="${escapeAttr(getNomProducte(data) || '')}" />
          <div class="thumbnails" id="thumbnails"></div>
        </div>
        <div class="product-details">
          <h2>${escapeHtml(getNomProducte(data) || "")}</h2>
          <div class="price" id="detail-price">${formatPrice(Number(mainVariant.preu || 0))}</div>
          <p class="muted">${escapeHtml(getDescripcioProducte(data) || "")}</p>
          <div class="variant-selection">
            <label for="variant-select">${variantTypeLabel}</label>
            <select id="variant-select"></select>
          </div>
          <div class="detail-actions" style="margin-top:0.6rem;">
            <button id="add-to-cart-btn" class="btn primary">${t('tienda_añadir_carrito')}</button>
          </div>
          <div style="margin-top:0.6rem;color:var(--muted)">${t('detalle_id_interno')} ${escapeHtml(data.id || '')}</div>
        </div>
      </div>
    `;

    const thumbs = document.getElementById("thumbnails");
    imgs.forEach((u, i) => {
      const im = document.createElement("img");
      im.src = u;
      im.alt = `${getNomProducte(data)} ${i + 1}`;
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
      opt.textContent = getNomVariant(v) || 'Default';
      variantSelect.appendChild(opt);
    });

    variantSelect.addEventListener("change", () => {
      const v = variants[Number(variantSelect.value)];
      if (!v) return;
      document.getElementById("detail-price").textContent = formatPrice(Number(v.preu || 0));
      const novasImgs = (v.imatges && v.imatges.length)
        ? v.imatges
        : ["https://via.placeholder.com/800x600?text=Sin+imagen"];
      document.getElementById("main-img").src = novasImgs[0];
      const thumbs = document.getElementById("thumbnails");
      thumbs.innerHTML = '';
      novasImgs.forEach((u, i) => {
        const im = document.createElement("img");
        im.src = u;
        im.alt = `${getNomVariant(v) || ''} ${i + 1}`;
        im.className = "thumb" + (i === 0 ? " active" : "");
        im.addEventListener("click", () => {
          document.getElementById("main-img").src = u;
          thumbs.querySelectorAll(".thumb").forEach(t => t.classList.remove("active"));
          im.classList.add("active");
        });
        thumbs.appendChild(im);
      });
    });

    document.getElementById("add-to-cart-btn").addEventListener("click", () => {
      const vidx = Number(document.getElementById("variant-select").value || 0);
      addToCart(data._docId, vidx, 1);
    });

    await renderRessenyes(docId);
  } catch (err) {
    console.error("Error detalle producto:", err);
    detalleContenido.innerHTML = `<p>${t('detalle_error')} ${err.message || err}</p>`;
  }
}

/* ---------------------------
   AGREGAR PRODUCTOS
   --------------------------- */
function buildAddProductForm() {
  if (!formularioProducto) return;
  formularioProducto.innerHTML = `
    <label for="id">${t('producto_id')}</label>
    <input id="id" type="text" required>
    ${(config.idiomasActivos || ['es']).map(idioma => `
      <label style="font-size:0.85rem; color:var(--muted);">${idioma.toUpperCase()} — ${t('producto_categoria')}</label>
      <input id="categoria-${idioma}" type="text" placeholder="" style="margin-bottom:0.25rem;">
    `).join('')}
    ${(config.idiomasActivos || ['es']).map(idioma => `
      <label style="font-size:0.85rem; color:var(--muted);">${idioma.toUpperCase()} — ${t('producto_nombre')}</label>
      <input id="nom-${idioma}" type="text" style="margin-bottom:0.25rem;">
    `).join('')}
    ${(config.idiomasActivos || ['es']).map(idioma => `
      <label style="font-size:0.85rem; color:var(--muted);">${idioma.toUpperCase()} — ${t('producto_descripcion')}</label>
      <textarea id="descripcio-${idioma}" rows="3" style="margin-bottom:0.25rem;"></textarea>
    `).join('')}
    <div class="form-row" style="align-items: center; gap: 0.5rem;">
      <input id="nuevo-novedades" type="checkbox" style="width: auto;">
      <label for="nuevo-novedades" style="margin: 0;">${t('producto_novedades')}</label>
    </div>
    <label for="cantidad-variantes">${t('producto_num_variantes')}</label>
    <select id="cantidad-variantes">
      <option value="0">${t('producto_sin_variantes')}</option>
      <option value="1">1</option>
      <option value="2">2</option>
      <option value="3">3</option>
    </select>
    <div id="variantes-container"></div>
    <div class="form-row">
      <button id="btn-guardar-producto" class="btn primary">${t('producto_guardar')}</button>
      <button id="btn-reset-producto" class="btn secondary" type="button">${t('producto_reset')}</button>
    </div>
    <p id="msg-guardar-producto" class="muted"></p>
  `;
  const cantSel = document.getElementById("cantidad-variantes");
  const cont = document.getElementById("variantes-container");
  cantSel.addEventListener("change", () => generateVariantFields(cantSel.value, cont, ""));
  generateVariantFields(cantSel.value, cont, "");

  document.getElementById("btn-guardar-producto").addEventListener("click", async (e) => {
    e.preventDefault();

    try {
      const idIntern = document.getElementById("id").value.trim();
      const idiomasActivos = config.idiomasActivos || ['es'];
      const idiomaDefecte = config.idiomaDefecte || 'es';
      const categories = {};
      const noms = {};
      const descripcions = {};
      idiomasActivos.forEach(idioma => {
        categories[idioma] = document.getElementById(`categoria-${idioma}`)?.value.trim() || '';
        noms[idioma] = document.getElementById(`nom-${idioma}`)?.value.trim() || '';
        descripcions[idioma] = document.getElementById(`descripcio-${idioma}`)?.value.trim() || '';
      });
      const categoria = categories[idiomaDefecte] || categories[idiomasActivos[0]] || '';
      const nom = noms[idiomaDefecte] || noms[idiomasActivos[0]] || '';
      const descripcio = descripcions[idiomaDefecte] || descripcions[idiomasActivos[0]] || '';
      const novedades = document.getElementById("nuevo-novedades").checked;
      const cant = Number(document.getElementById("cantidad-variantes").value || 0);
      const variants = [];
      if (cant === 0) {
        const preu = Number(document.getElementById("preu-default")?.value || 0);
        const stock = Number(document.getElementById("stock-default")?.value || 0);
        const imgs = Array.from(document.querySelectorAll(".imatge-url-default")).map(el => el.value);
        variants.push({ tipus: "", nom: "", preu, stock, imatges: imgs });
      } else {
        for (let i = 0; i < cant; i++) {
          const idiomasActivos2 = config.idiomasActivos || ['es'];
          const idiomaDefecte2 = config.idiomaDefecte || 'es';
          const tipusPerIdioma = {};
          const nomPerIdioma = {};
          idiomasActivos2.forEach(idioma => {
            tipusPerIdioma[idioma] = document.getElementById(`tipus-variant-${i}-${idioma}`)?.value.trim() || '';
            nomPerIdioma[idioma] = document.getElementById(`nom-variant-${i}-${idioma}`)?.value.trim() || '';
          });
          const tipus = tipusPerIdioma[idiomaDefecte2] || tipusPerIdioma[idiomasActivos2[0]] || '';
          const nomV = nomPerIdioma[idiomaDefecte2] || nomPerIdioma[idiomasActivos2[0]] || '';
          const preu = Number(document.getElementById(`preu-variant-${i}`)?.value || 0);
          const stock = Number(document.getElementById(`stock-variant-${i}`)?.value || 0);
          const imgs = Array.from(document.querySelectorAll(`.imatge-url-variant-${i}`)).map(el => el.value);
          variants.push({ tipus, tipusPerIdioma, nom: nomV, nomPerIdioma, preu, stock, imatges: imgs });
        }
      }
      const docData = {
        id: idIntern,
        categoria,
        categories,
        nom,
        noms,
        descripcio,
        descripcions,
        variants,
        ocult: false,
        novedades: Boolean(novedades),
        createdAt: new Date()
      };
      await addDoc(collection(db, "productes"), docData);
      document.getElementById("msg-guardar-producto").textContent = t('producto_guardado');
      formularioProducto.reset();
      generateVariantFields(0, document.getElementById("variantes-container"), "");
      loadProducts();
      setTimeout(() => document.getElementById("msg-guardar-producto").textContent = "", 2000);
    } catch (err) {
      console.error("Error guardar producto:", err);
      alert("Error al guardar producto: " + (err.message || err));
    }
  });
  document.getElementById("btn-reset-producto").addEventListener("click", () => {
    formularioProducto.reset();
    generateVariantFields(0, document.getElementById("variantes-container"), "");
  });
}

function generateVariantFields(n, container, prefix = "") {
  container.innerHTML = "";
  const cnt = Number(n) || 0;
  function buildImagenesBlock(variantKey) {
    return `
      <label>${t('producto_imagenes')}</label>
      <div id="imatges-block-${variantKey}" style="display:flex; flex-wrap:wrap; gap:0.5rem; margin-bottom:0.5rem;"></div>
      <button type="button" class="btn secondary" onclick="subirImatgeVariant('${variantKey}')">📷 ${t('producto_subir_imagen')}</button>
    `;
  }
  if (cnt === 0) {
    const d = document.createElement("div");
    d.innerHTML = `
      <h4>${t('producto_sin_variantes')}</h4>
      <label>${t('producto_precio')}</label><input id="${prefix}preu-default" type="number" step="0.01" value="0">
      <label>${t('producto_stock')}</label><input id="${prefix}stock-default" type="number" value="0">
      ${buildImagenesBlock(`${prefix}default`)}
    `;
    container.appendChild(d);
    return;
  }
  for (let i = 0; i < cnt; i++) {
    const variantKey = `${prefix}variant-${i}`;
    const d = document.createElement("div");
    d.className = "variant";
    d.innerHTML = `
      <h4>${t('producto_variante')} ${i + 1}</h4>
      ${(config.idiomasActivos || ['es']).map(idioma => `
        <label style="font-size:0.85rem; color:var(--muted);">${idioma.toUpperCase()} — ${t('producto_tipo_variante')}</label>
        <input id="${prefix}tipus-variant-${i}-${idioma}" type="text" placeholder="${t('producto_tipo_placeholder')}" style="margin-bottom:0.25rem;">
      `).join('')}
      ${(config.idiomasActivos || ['es']).map(idioma => `
        <label style="font-size:0.85rem; color:var(--muted);">${idioma.toUpperCase()} — ${t('producto_nombre_variante')}</label>
        <input id="${prefix}nom-variant-${i}-${idioma}" type="text" style="margin-bottom:0.25rem;">
      `).join('')}
      <label>${t('producto_precio')}</label><input id="${prefix}preu-variant-${i}" type="number" step="0.01" value="0">
      <label>${t('producto_stock')}</label><input id="${prefix}stock-variant-${i}" type="number" value="0">
      ${buildImagenesBlock(variantKey)}
    `;
    container.appendChild(d);
  }
}

function subirImatgeVariant(variantKey) {
  abrirCloudinaryWidget((url) => {
    const block = document.getElementById(`imatges-block-${variantKey}`);
    if (block) {
      const div = document.createElement("div");
      div.style.cssText = "position:relative; display:inline-block;";
      div.innerHTML = `
        <img src="${url}" style="width:70px; height:70px; object-fit:cover; border-radius:8px;">
        <button type="button" onclick="this.parentElement.remove()" style="position:absolute; top:-6px; right:-6px; background:red; color:white; border:none; border-radius:50%; width:18px; height:18px; cursor:pointer; font-size:0.7rem; line-height:1;">✕</button>
        <input type="hidden" class="imatge-url-${variantKey}" value="${url}">
      `;
      block.appendChild(div);
    }
  });
}

function renderImatgesExistents(variantKey, imatges) {
  const block = document.getElementById(`imatges-block-${variantKey}`);
  if (!block) return;
  block.innerHTML = '';
  (imatges || []).forEach(url => {
    if (!url) return;
    const div = document.createElement("div");
    div.style.cssText = "position:relative; display:inline-block;";
    div.innerHTML = `
      <img src="${url}" style="width:70px; height:70px; object-fit:cover; border-radius:8px;">
      <button type="button" onclick="this.parentElement.remove()" style="position:absolute; top:-6px; right:-6px; background:red; color:white; border:none; border-radius:50%; width:18px; height:18px; cursor:pointer; font-size:0.7rem; line-height:1;">✕</button>
      <input type="hidden" class="imatge-url-${variantKey}" value="${url}">
    `;
    block.appendChild(div);
  });
}

/* ---------------------------
   EDIT PRODUCT (fill & save)
   --------------------------- */
async function loadEditForm(docId) {
  if (!formularioEditar) return;
  formularioEditar.innerHTML = `<p>${t('detalle_cargando')}</p>`;
  try {
    const ref = doc(db, "productes", docId);
    const snap = await getDoc(ref);
    if (!snap.exists()) { formularioEditar.innerHTML = `<p>${t('detalle_no_encontrado')}</p>`; return; }
    const data = { _docId: snap.id, ...snap.data() };

    updateBreadcrumb('editar-producto', data.nom || "Producto");

    formularioEditar.innerHTML = `
      <label>${t('producto_id')}</label>
      <input id="edit-id" type="text" value="${escapeAttr(data.id || '')}">
      ${(config.idiomasActivos || ['es']).map(idioma => `
        <label style="font-size:0.85rem; color:var(--muted);">${idioma.toUpperCase()} — ${t('producto_categoria')}</label>
        <input id="edit-categoria-idioma-${idioma}" type="text" value="${escapeAttr((data.categories && data.categories[idioma]) || (idioma === (config.idiomaDefecte || 'es') ? data.categoria || '' : ''))}"" style="margin-bottom:0.25rem;">
      `).join('')}
      ${(config.idiomasActivos || ['es']).map(idioma => `
        <label style="font-size:0.85rem; color:var(--muted);">${idioma.toUpperCase()} — ${t('producto_nombre')}</label>
        <input id="edit-nom-idioma-${idioma}" type="text" value="${escapeAttr((data.noms && data.noms[idioma]) || (idioma === (config.idiomaDefecte || 'es') ? data.nom || '' : ''))}" style="margin-bottom:0.25rem;">
      `).join('')}
      ${(config.idiomasActivos || ['es']).map(idioma => `
        <label style="font-size:0.85rem; color:var(--muted);">${idioma.toUpperCase()} — ${t('producto_descripcion')}</label>
        <textarea id="edit-descripcio-idioma-${idioma}" rows="3" style="margin-bottom:0.25rem;">${escapeHtml((data.descripcions && data.descripcions[idioma]) || (idioma === (config.idiomaDefecte || 'es') ? data.descripcio || '' : ''))}</textarea>
      `).join('')}
      <div class="form-row" style="align-items: center; gap: 0.5rem;">
        <input id="edit-novedades" type="checkbox" ${data.novedades ? "checked" : ""} style="width: auto;">
        <label for="edit-novedades" style="margin: 0;">${t('producto_novedades')}</label>
      </div>
      <div class="form-row" style="align-items: center; gap: 0.5rem;">
        <input id="edit-ocult" type="checkbox" ${data.ocult ? "checked" : ""} style="width: auto;">
        <label for="edit-ocult" style="margin: 0;">${t('producto_ocult')}</label>
      </div>
      <label>${t('producto_num_variantes')}</label>
      <select id="edit-cantidad-variantes">
        <option value="0">0</option>
        <option value="1">1</option>
        <option value="2">2</option>
        <option value="3">3</option>
      </select>
      <div id="edit-variantes-container"></div>
      <div class="form-row">
        <button id="btn-guardar-editar" class="btn primary">${t('producto_guardar_cambios')}</button>
      </div>
      <p id="msg-edit"></p>
    `;

    const editCant = document.getElementById("edit-cantidad-variantes");
    const editCont = document.getElementById("edit-variantes-container");
    editCant.value = (data.variants ? data.variants.length : 0);
    generateVariantFields(editCant.value, editCont, "edit-");

    setTimeout(() => {
      const variants = data.variants || [];
      if (variants.length === 0) {
        const preu = document.getElementById("edit-preu-default");
        const stock = document.getElementById("edit-stock-default");
        if (preu) preu.value = 0;
        if (stock) stock.value = 0;
        renderImatgesExistents("edit-default", []);
      } else {
        variants.forEach((v, i) => {
          const tipus = document.getElementById(`edit-tipus-variant-${i}`);
          const nom = document.getElementById(`edit-nom-variant-${i}`);
          const preu = document.getElementById(`edit-preu-variant-${i}`);
          const stock = document.getElementById(`edit-stock-variant-${i}`);
          if (tipus) tipus.value = v.tipus || "";
          if (nom) nom.value = v.nom || "";
          // Carregar valors multiidioma
          (config.idiomasActivos || ['es']).forEach(idioma => {
            const tipusEl = document.getElementById(`edit-tipus-variant-${i}-${idioma}`);
            const nomEl = document.getElementById(`edit-nom-variant-${i}-${idioma}`);
            if (tipusEl) tipusEl.value = (v.tipusPerIdioma && v.tipusPerIdioma[idioma]) || (idioma === (config.idiomaDefecte || 'es') ? v.tipus || '' : '');
            if (nomEl) nomEl.value = (v.nomPerIdioma && v.nomPerIdioma[idioma]) || (idioma === (config.idiomaDefecte || 'es') ? v.nom || '' : '');
          });
          if (preu) preu.value = Number(v.preu || 0);
          if (stock) stock.value = Number(v.stock || 0);
          renderImatgesExistents(`edit-variant-${i}`, v.imatges || []);
        });
      }
    }, 120);

    editCant.addEventListener("change", () => generateVariantFields(editCant.value, editCont, "edit-"));

    document.getElementById("btn-guardar-editar").addEventListener("click", async (e) => {
      e.preventDefault();
      try {
        const idIntern = document.getElementById("edit-id").value.trim();
        const idiomasActivos = config.idiomasActivos || ['es'];
        const idiomaDefecte = config.idiomaDefecte || 'es';
        const categories = {};
        const noms = {};
        const descripcions = {};
        idiomasActivos.forEach(idioma => {
          categories[idioma] = document.getElementById(`edit-categoria-idioma-${idioma}`)?.value.trim() || '';
          noms[idioma] = document.getElementById(`edit-nom-idioma-${idioma}`)?.value.trim() || '';
          descripcions[idioma] = document.getElementById(`edit-descripcio-idioma-${idioma}`)?.value.trim() || '';
        });
        const categoria = categories[idiomaDefecte] || categories[idiomasActivos[0]] || '';
        const nom = noms[idiomaDefecte] || noms[idiomasActivos[0]] || '';
        const descripcio = descripcions[idiomaDefecte] || descripcions[idiomasActivos[0]] || '';
        const ocult = document.getElementById("edit-ocult").checked;
        const novedades = document.getElementById("edit-novedades").checked;
        const cant = Number(document.getElementById("edit-cantidad-variantes").value || 0);
        const variants = [];
        if (cant === 0) {
          const preu = Number(document.getElementById("edit-preu-default")?.value || 0);
          const stock = Number(document.getElementById("edit-stock-default")?.value || 0);
          const imgs = Array.from(document.querySelectorAll(".imatge-url-edit-default")).map(el => el.value);
          variants.push({ tipus: "", nom: "", preu, stock, imatges: imgs });
        } else {
          for (let i = 0; i < cant; i++) {
            const idiomasActivos3 = config.idiomasActivos || ['es'];
            const idiomaDefecte3 = config.idiomaDefecte || 'es';
            const tipusPerIdioma = {};
            const nomPerIdioma = {};
            idiomasActivos3.forEach(idioma => {
              tipusPerIdioma[idioma] = document.getElementById(`edit-tipus-variant-${i}-${idioma}`)?.value.trim() || '';
              nomPerIdioma[idioma] = document.getElementById(`edit-nom-variant-${i}-${idioma}`)?.value.trim() || '';
            });
            const tipus = tipusPerIdioma[idiomaDefecte3] || tipusPerIdioma[idiomasActivos3[0]] || '';
            const nomV = nomPerIdioma[idiomaDefecte3] || nomPerIdioma[idiomasActivos3[0]] || '';
            const preu = Number(document.getElementById(`edit-preu-variant-${i}`)?.value || 0);
            const stock = Number(document.getElementById(`edit-stock-variant-${i}`)?.value || 0);
            const imgs = Array.from(document.querySelectorAll(`.imatge-url-edit-variant-${i}`)).map(el => el.value);
            variants.push({ tipus, tipusPerIdioma, nom: nomV, nomPerIdioma, preu, stock, imatges: imgs });
          }
        }
        await updateDoc(doc(db, "productes", data._docId), {
          id: idIntern,
          categoria,
          categories,
          nom,
          noms,
          descripcio,
          descripcions,
          variants,
          ocult,
          novedades: Boolean(novedades)
        });
        document.getElementById("msg-edit").textContent = t('producto_actualizado');
        loadProducts();
        setTimeout(() => document.getElementById("msg-edit").textContent = "", 1800);
      } catch (err) {
        console.error("Error editando producto:", err);
        alert(t('producto_error_actualizar') + ' ' + (err.message || err));
      }
    });
  } catch (err) {
    console.error("Error cargando editar:", err);
    formularioEditar.innerHTML = `<p>${t('detalle_error')} ${err.message || err}</p>`;
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
    else img.classList.add("next");
    cabeceraSlider.appendChild(img);
  });
  if (headerInterval) clearInterval(headerInterval);
  if (headerImgs.length <= 1) return;
  let idx = 0;
  headerInterval = setInterval(() => {
    const nodes = cabeceraSlider.querySelectorAll("img");
    if (!nodes.length) return;
    const prevIdx = idx;
    idx = (idx + 1) % nodes.length;

    // Primer reposicionem les imatges que no participen, sense transició
    nodes.forEach((n, i) => {
      if (i !== prevIdx && i !== idx) {
        n.style.transition = "none";
        n.classList.remove("active", "prev", "next");
        n.classList.add("next");
      }
    });

    // Forcem reflow perquè el navegador processi el canvi sense transició
    cabeceraSlider.offsetHeight;

    // Ara fem l'animació de la imatge que surt i la que entra
    nodes[prevIdx].style.transition = "left 0.75s ease";
    nodes[prevIdx].classList.remove("active");
    nodes[prevIdx].classList.add("prev");

    nodes[idx].style.transition = "left 0.75s ease";
    nodes[idx].classList.remove("next");
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
    else img.classList.add("next");
    cabeceraSliderDetalle.appendChild(img);
  });
  if (headerInterval) clearInterval(headerInterval);
  if (headerImgs.length <= 1) return;
  let idx = 0;
  headerInterval = setInterval(() => {
    const nodes = cabeceraSliderDetalle.querySelectorAll("img");
    if (!nodes.length) return;
    const prevIdx = idx;
    idx = (idx + 1) % nodes.length;

    // Primer reposicionem les imatges que no participen, sense transició
    nodes.forEach((n, i) => {
      if (i !== prevIdx && i !== idx) {
        n.style.transition = "none";
        n.classList.remove("active", "prev", "next");
        n.classList.add("next");
      }
    });

    // Forcem reflow perquè el navegador processi el canvi sense transició
    cabeceraSliderDetalle.offsetHeight;

    // Ara fem l'animació de la imatge que surt i la que entra
    nodes[prevIdx].style.transition = "left 0.75s ease";
    nodes[prevIdx].classList.remove("active");
    nodes[prevIdx].classList.add("prev");

    nodes[idx].style.transition = "left 0.75s ease";
    nodes[idx].classList.remove("next");
    nodes[idx].classList.add("active");

  }, 4000);
}

/* Admin: cargar lista imágenes cabecera y permitir eliminar */
async function loadHeaderList() {
  if (!cabeceraLista) return;
  cabeceraLista.innerHTML = `<p>${t('admin_config_cabecera_cargando')}</p>`;
  try {
    const snap = await getDocs(collection(db, "imagenesCabeceraTienda"));
    cabeceraLista.innerHTML = "";
    snap.forEach(d => {
      const url = d.data().url;
      const div = document.createElement("div");
      div.className = "cab-item";
      div.innerHTML = `<img src="${escapeAttr(url)}" alt="img" style="max-width:200px;border-radius:8px;margin-right:10px;"><button class="btn secondary" data-id="${d.id}">${t('tienda_eliminar')}</button>`;
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
function subirIAfegirImagenCabecera() {
  abrirCloudinaryWidget(async (url) => {
    try {
      await addDoc(collection(db, "imagenesCabeceraTienda"), { url });
      loadHeaderList();
      loadHeaderImages();
      loadHeaderImagesDetalle();
    } catch (err) {
      console.error("Error agregar imagen cabecera:", err);
      alert("Error al guardar la imagen: " + (err.message || err));
    }
  });
}

window.subirIAfegirImagenCabecera = subirIAfegirImagenCabecera;

async function loadConfig() {
  try {
    const ref = doc(db, "config", "general");
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data();
      config.envioEstandar = Number(data.enviament || 5.00);
      config.enviamentGratisDesDe = Number(data.enviamentGratisDesDe || 50.00);
      config.sliderPromocionalTexto = data.sliderPromociones || "";
      config.sliderPromocions = data.sliderPromocions || {};
      config.sliderActivo = data.sliderActivo === true;
      config.resenyesActives = data.resenyesActives !== false;
      config.resenyesMode = data.resenyesMode || 'tothom';
      config.idiomaDefecte = data.idiomaDefecte || 'es';
      config.idiomasActivos = data.idiomasActivos || ['es'];
      config.logoUrl = data.logoUrl || "";
      config.promocionCompraSuperiorA = Number(data.promocionCompraSuperiorA || 0);
      config.porcentajeDescuento = Number(data.porcentajeDescuento || 0);
      const colorVars = {
  '--bg': data.colorBg,
  '--card': data.colorCard,
  '--text': data.colorText,
  '--muted': data.colorMuted,
  '--accent': data.colorAccent,
  '--accent-2': data.colorAccent2,
  '--color-cart-counter-bg': data.colorCartCounterBg,
  '--color-cart-counter-text': data.colorCartCounterText,
  '--color-primary': data.colorPrimary,
  '--color-primary-hover': data.colorPrimaryHover,
  '--color-primary-text': data.colorPrimaryText,
  '--color-secondary': data.colorSecondary,
  '--color-secondary-hover': data.colorSecondaryHover,
  '--color-secondary-text': data.colorSecondaryText,
  '--color-cookie-btn': data.colorCookieBtn,
  '--color-promo-slider': data.colorPromoSlider,
  '--color-promo-slider-text': data.colorPromoSliderText,
  '--color-header-top-bg': data.colorHeaderTopBg,
  '--color-header-top-text': data.colorHeaderTopText,
  '--color-header-bg': data.colorHeaderBg,
  '--color-header-text': data.colorHeaderText,
  '--color-footer-bg': data.colorFooterBg,
  '--color-footer-text': data.colorFooterText,
  '--color-nav-overlay-bg': data.colorNavOverlayBg,
  '--color-nav-overlay-text': data.colorNavOverlayText,
  '--color-cookie-btn-hover': data.colorCookieBtnHover,
  '--color-cookie-aceptar-text': data.colorCookieAceptarText,
  '--color-cookie-configurar-bg': data.colorCookieConfigurarBg,
  '--color-cookie-configurar-hover': data.colorCookieConfigurarHover,
  '--color-cookie-configurar-border': data.colorCookieConfigurarBorder,
  '--color-cookie-configurar-text': data.colorCookieConfigurarText,
  '--color-cookie-rechazar-bg': data.colorCookieRechazarBg,
  '--color-cookie-rechazar-hover': data.colorCookieRechazarHover,
  '--color-cookie-rechazar-border': data.colorCookieRechazarBorder,
  '--color-cookie-rechazar-text': data.colorCookieRechazarText,
  '--color-cookie-guardar-bg': data.colorCookieGuardarBg,
  '--color-cookie-guardar-hover': data.colorCookieGuardarHover,
  '--color-cookie-guardar-text': data.colorCookieGuardarText,
  '--color-cookie-cancelar-bg': data.colorCookieCancelarBg,
  '--color-cookie-cancelar-hover': data.colorCookieCancelarHover,
  '--color-cookie-cancelar-border': data.colorCookieCancelarBorder,
  '--color-cookie-cancelar-text': data.colorCookieCancelarText,
};
Object.entries(colorVars).forEach(([key, value]) => {
  if (value) document.documentElement.style.setProperty(key, value);
});
localStorage.setItem('tradenfy_colors', JSON.stringify(colorVars));
      await renderRedesSociales();
      updateUIFromConfig();
      aplicarConfigSeccionInicio();
      renderIdiomaDropdown();
      await renderSeccionsPersonalitzades();
      inicialitzarIdioma(data.idiomaDefecte || 'es');
    } else {
      await setDoc(ref, {
        enviament: 6.00,
        enviamentGratisDesDe: 35.00,
        sliderPromociones: "",
        logoUrl: "",
        promocionCompraSuperiorA: 0,
        porcentajeDescuento: 0
      });
      renderIdiomaDropdown();
      inicialitzarIdioma('es');
    }
  } catch (err) {
    console.error("Error cargando config:", err);
  }
}
async function loadConfigForm() {
  if (formularioConfiguracion) {
    // Recarregar sliderPromocions i idiomasActivos frescos de Firestore
    const snapConfig = await getDoc(doc(db, "config", "general"));
    if (snapConfig.exists()) {
      const d = snapConfig.data();
      config.sliderPromocions = d.sliderPromocions || {};
      config.idiomasActivos = d.idiomasActivos || ['es'];
      config.idiomaDefecte = d.idiomaDefecte || 'es';
    }
    document.getElementById("logo-url").value = config.logoUrl;
    document.getElementById("promocion-compra-superior").value = config.promocionCompraSuperiorA;
    document.getElementById("porcentaje-descuento").value = config.porcentajeDescuento;
    document.getElementById("envio-valor").value = config.envioEstandar;
    document.getElementById("envio-gratis-desde").value = config.enviamentGratisDesDe;
    const idiomasActivos = config.idiomasActivos || ['es'];
    const sliderContainer = document.getElementById('slider-promociones-container');
    if (sliderContainer) {
      sliderContainer.innerHTML = idiomasActivos.map(idioma => `
        <div style="margin-bottom:0.5rem;">
          <label style="font-size:0.8rem; color:var(--muted);">${idioma.toUpperCase()} — ${t('config_slider_placeholder')}</label>
          <input type="text" id="slider-promociones-${idioma}" value="${(config.sliderPromocions && config.sliderPromocions[idioma]) || (idioma === (config.idiomaDefecte || 'es') ? config.sliderPromocionalTexto || '' : '')}" placeholder="${t('config_slider_placeholder')}" style="width:100%;">
        </div>
      `).join('');
    }
    document.getElementById("resenyes-actives").checked = config.resenyesActives !== false;
    document.getElementById("resenyes-mode").value = config.resenyesMode || 'tothom';
    document.getElementById("slider-activo").checked = config.sliderActivo === true;
    const idiomaDefecteInput = document.getElementById("idioma-defecto");
    if (idiomaDefecteInput) idiomaDefecteInput.value = config.idiomaDefecte || 'es';
    renderIdiomaDefecteSelector();
    // Carregar idiomes actius
    document.querySelectorAll('input[name="idioma-activo"]').forEach(cb => {
      cb.checked = idiomasActivos.includes(cb.value);
    });
  }
}

if (formularioConfiguracion) {
  formularioConfiguracion.addEventListener("submit", async (e) => {
    e.preventDefault();
    const newConfig = {
      logoUrl: document.getElementById("logo-url").value.trim(),
      promocionCompraSuperiorA: Number(document.getElementById("promocion-compra-superior").value || 0),
      porcentajeDescuento: Number(document.getElementById("porcentaje-descuento").value || 0),
      enviament: Number(document.getElementById("envio-valor").value || 0),
      enviamentGratisDesDe: Number(document.getElementById("envio-gratis-desde").value || 0),
      sliderPromocions: (() => {
        const sp = {};
        (config.idiomasActivos || ['es']).forEach(idioma => {
          sp[idioma] = document.getElementById(`slider-promociones-${idioma}`)?.value.trim() || '';
        });
        return sp;
      })(),
      sliderPromociones: (() => {
        const idDef = config.idiomaDefecte || 'es';
        return document.getElementById(`slider-promociones-${idDef}`)?.value.trim() || '';
      })(),
      resenyesActives: document.getElementById("resenyes-actives").checked,
      resenyesMode: document.getElementById("resenyes-mode").value,
      sliderActivo: document.getElementById("slider-activo").checked,
      idiomaDefecte: document.getElementById("idioma-defecto").value,
      idiomasActivos: Array.from(document.querySelectorAll('input[name="idioma-activo"]:checked')).map(cb => cb.value),
    };
    try {
      await setDoc(doc(db, "config", "general"), newConfig, { merge: true });
      config.logoUrl = newConfig.logoUrl;
      config.promocionCompraSuperiorA = newConfig.promocionCompraSuperiorA;
      config.porcentajeDescuento = newConfig.porcentajeDescuento;
      config.envioEstandar = newConfig.enviament;
      config.enviamentGratisDesDe = newConfig.enviamentGratisDesDe;
      config.sliderPromocionalTexto = newConfig.sliderPromociones;
      config.sliderPromocions = newConfig.sliderPromocions;
      config.resenyesActives = newConfig.resenyesActives;
      config.resenyesMode = newConfig.resenyesMode;
      config.sliderActivo = newConfig.sliderActivo;
      config.idiomaDefecte = newConfig.idiomaDefecte;
      config.idiomasActivos = newConfig.idiomasActivos;
      renderIdiomaDropdown();
      updateUIFromConfig();
      localStorage.setItem('tradenfy_idioma', newConfig.idiomaDefecte);
      aplicarIdioma(newConfig.idiomaDefecte);
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

if (contactPopupClose) {
  contactPopupClose.addEventListener('click', function() {
    contactPopup.classList.add('hidden');
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
async function guardarCuponFirestore(cupon, emailCliente = null, comandaId = null) {
  try {
    await addDoc(collection(db, "cupones"), {
      ...cupon,
      email: emailCliente,
      comandaId: comandaId,
      fechaCreacion: new Date().toISOString(),
      fechaCaducidad: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    });
    console.log('Cupón guardat a Firestore:', cupon.codigo);
    return true;
  } catch (error) {
    console.error('Error guardando cupón en Firestore:', error);
    return false;
  }
}

async function buscarCuponFirestore(codigo) {
  try {
    const q = query(
      collection(db, "cupones"),
      where("codigo", "==", codigo),
      where("usado", "==", false)
    );
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      return querySnapshot.docs[0].data();
    }
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
  
  return cupon;
}

function guardarCuponLocalStorage(cupon) {
  const cupones = JSON.parse(localStorage.getItem('tradenfy_cupones') || '[]');
  // Evitar duplicados
  const existe = cupones.find(c => c.codigo === cupon.codigo);
  if (!existe) {
    cupones.push(cupon);
    localStorage.setItem('tradenfy_cupones', JSON.stringify(cupones));
  }
}

// Función mejorada para mostrar popup (usa la nueva generación)
async function mostrarPopupDescuento(subtotal, cuponExistent) {
  if (descuentoPopup && descuentoMensaje && codigoDescuento) {
    const cupon = cuponExistent || await generarCuponHibrido(config.porcentajeDescuento);
    
    descuentoMensaje.innerHTML = t('popup_cupon_mensaje')
      .replace('{importe}', config.promocionCompraSuperiorA + '€')
      .replace('{descuento}', config.porcentajeDescuento + '%');
    
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
    cuponMensaje.textContent = t('cupon_introduce');
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
    cuponMensaje.textContent = t('cupon_no_valido');
    cuponMensaje.className = 'cupon-mensaje error';
    return;
  }
  
  if (cupon.usado) {
    cuponMensaje.textContent = t('cupon_ya_usado');
    cuponMensaje.className = 'cupon-mensaje error';
    return;
  }
  
  // Verificar caducidad si existe
  if (cupon.fechaCaducidad && new Date(cupon.fechaCaducidad) < new Date()) {
    cuponMensaje.textContent = t('cupon_expirado');
    cuponMensaje.className = 'cupon-mensaje error';
    return;
  }
  
  // Cupón válido → APLICAR DESCUENTO
  cuponAplicado = cupon;
  descuentoAplicado = 0;

  // ✅ MARCAR COMO USADO EN AMBOS SISTEMAS
  await marcarCuponUtilizadoHibrido(codigo);

  // UI
  cuponMensaje.textContent = `${t('cupon_valido')} ${cupon.descuento}${t('cupon_descuento_aplicado')}`;
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
  const cupones = JSON.parse(localStorage.getItem('tradenfy_cupones') || '[]');
  return cupones.find(c => c.codigo === codigo);
}

// Función mejorada para marcar cupones como usados
async function marcarCuponUtilizadoHibrido(codigo, comandaId = null) {
  // Marcar en localStorage
  const cupones = JSON.parse(localStorage.getItem('tradenfy_cupones') || '[]');
  const cuponIndex = cupones.findIndex(c => c.codigo === codigo);
  if (cuponIndex !== -1) {
    cupones[cuponIndex].usado = true;
    cupones[cuponIndex].fechaUso = new Date().toISOString();
    localStorage.setItem('tradenfy_cupones', JSON.stringify(cupones));
  }

  // Marcar en Firestore
  try {
    const q = query(collection(db, "cupones"), where("codigo", "==", codigo));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const docRef = doc(db, "cupones", querySnapshot.docs[0].id);
      await updateDoc(docRef, {
        usado: true,
        fechaUso: new Date().toISOString(),
        comandaCanjeado: comandaId
      });
    }
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
    const NETLIFY_FUNCTION_URL = 'https://miuart-functions.miuart.workers.dev/enviar-contacto';

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
      <title>Nuevo Mensaje de Contacto - Tradenfy</title>
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
          <p>Has recibido un nuevo mensaje desde Tradenfy</p>
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
          <p>© 2026 Tradenfy | Sistema de Contacto Automático</p>
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
      <th style="text-align:left; padding:10px; font-weight:bold;">${t('email_confirmacion_producto')}</th>
      <th style="text-align:left; padding:10px; font-weight:bold;">${t('email_confirmacion_variante')}</th>
      <th style="text-align:center; padding:10px; font-weight:bold;">${t('email_confirmacion_cant')}</th>
      <th style="text-align:right; padding:10px; font-weight:bold;">${t('email_confirmacion_precio')}</th>
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
      <tr style="background:${config.emailColorSubtotalBg || '#fdf2f8'};">
      <td colspan="3" style="text-align:right; font-weight:500; color:${config.emailColorSubtotalText || '#d63384'};">Subtotal</td>
      <td style="text-align:right; font-weight:600; color:${config.emailColorSubtotalText || '#d63384'};">${formatPrice(subtotal)}</td>
      </tr>
    `;
  }
  productosHTML += `</tbody></table>`;

  // === CUPÓ: NOMÉS LLEGIR, NO GENERAR ===
  let cuponHTML = '';
  const cupones = JSON.parse(localStorage.getItem('tradenfy_cupones') || '[]');
  const ultimo = cupones.length > 0 ? cupones[cupones.length - 1] : null;
  if (ultimo && !ultimo.usado) {
    cuponHTML = `
      <div style="background:#d4edda; border:1px solid #c3e6cb; border-radius:8px; padding:15px; text-align:center; margin:20px 0;">
      <h3 style="margin:0 0 10px; color:#155724; font-size:18px;">${t('email_cupon_titulo')}</h3>
      <p style="margin:5px 0;">${t('email_cupon_mensaje').replace('{descuento}', ultimo.descuento + '%').replace('{importe}', formatPrice(config.promocionCompraSuperiorA))}</p>
      <div style="font-size:24px; font-weight:bold; color:#28a745; background:white; padding:8px 16px; border-radius:6px; display:inline-block; margin:8px 0;">
        ${ultimo.codigo}
      </div>
      </div>
    `;
  }

  // === DADES CLIENT ===
  const nombre = `${comandaData.cliente.nombre} ${comandaData.cliente.apellidos}`.trim();
  const direccion = [comandaData.cliente.direccion, comandaData.cliente.infoAdicional, `${comandaData.cliente.codigoPostal} ${comandaData.cliente.ciudad}`, comandaData.cliente.pais].filter(Boolean).join('\n');

  // === ENVIAR EMAIL VIA NETLIFY + RESEND ===
  const response = await fetch('https://miuart-functions.miuart.workers.dev/enviar-confirmacion', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_email: comandaData.cliente.email,
      order_id: comandaId.slice(-8).toUpperCase(),
      client_name: nombre,
      client_phone: comandaData.cliente.telefono,
      client_address: direccion,
      date: new Date().toLocaleDateString('es-ES'),
      idioma: idiomaActiu,
      subtotal: formatPrice(comandaData.totals.subtotal),
      envio: formatPrice(comandaData.totals.envio),
      iva: formatPrice(comandaData.totals.iva),
      total: formatPrice(comandaData.totals.total),
      productos_html: productosHTML,
      cupon_html: cuponHTML
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error('Error Worker: ' + JSON.stringify(errorData));
  }

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
    let productos_html = `
      <table style="width:100%; border-collapse:collapse; margin:15px 0; font-size:14px;">
      <thead>
        <tr style="background:#f8f9fa;">
        <th style="text-align:left; padding:10px; font-weight:bold;">${t('email_confirmacion_producto')}</th>
        <th style="text-align:left; padding:10px; font-weight:bold;">${t('email_confirmacion_variante')}</th>
        <th style="text-align:center; padding:10px; font-weight:bold;">${t('email_confirmacion_cant')}</th>
        <th style="text-align:right; padding:10px; font-weight:bold;">${t('email_confirmacion_precio')}</th>
        </tr>
      </thead>
      <tbody>
    `;
    for (const p of comandaData.productos) {
      const subtotalProd = p.precio * p.cantidad;
      productos_html += `
        <tr>
        <td style="padding:10px; border-bottom:1px solid #eee; font-weight:600;">${p.nombre}</td>
        <td style="padding:10px; border-bottom:1px solid #eee;">${p.variante}</td>
        <td style="padding:10px; border-bottom:1px solid #eee; text-align:center;">${p.cantidad}</td>
        <td style="padding:10px; border-bottom:1px solid #eee; text-align:right;">${p.precio.toFixed(2)}€</td>
        </tr>
        <tr style="background:${config.adminEmailColorSubtotalBg || '#fdf2f8'};">
        <td colspan="3" style="text-align:right; font-weight:500; color:${config.adminEmailColorSubtotalText || '#d63384'};">Subtotal</td>
        <td style="text-align:right; font-weight:600; color:${config.adminEmailColorSubtotalText || '#d63384'};">${subtotalProd.toFixed(2)}€</td>
        </tr>
      `;
    }
    productos_html += `</tbody></table>`;
    const response = await fetch('https://miuart-functions.miuart.workers.dev/nueva-comanda-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_id: comandaId,
        date: new Date().toLocaleDateString('es-ES'),
        client_name: `${comandaData.cliente.nombre} ${comandaData.cliente.apellidos}`,
        client_email: comandaData.cliente.email,
        client_phone: comandaData.cliente.telefono,
        client_address: `${comandaData.cliente.direccion}, ${comandaData.cliente.codigoPostal} ${comandaData.cliente.ciudad}, ${comandaData.cliente.pais}`,
        productos_html,
        subtotal: comandaData.totals.subtotal.toFixed(2) + '€',
        envio: comandaData.totals.envio.toFixed(2) + '€',
        iva: comandaData.totals.iva.toFixed(2) + '€',
        total: comandaData.totals.total.toFixed(2) + '€',
        idioma: config.idiomaDefecte || 'es'
      })
    });
    const resData = await response.json();
    console.log('Resposta admin:', JSON.stringify(resData));
    return true;
  } catch (error) {
    console.error('❌ Error enviant notificació admin:', error);
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
        variante: item.variantNombre || t('email_confirmacion_sin_variante'),
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
      estado: 'pendiente',
      idioma: idiomaActiu || 'es'
    };

    // === GENERAR CUPÓ (NUEVA VERSIÓN HÍBRIDA) ===
    const subtotal = calcularSubtotal();
    if (subtotal >= config.promocionCompraSuperiorA && config.porcentajeDescuento > 0) {
      const cupon = await generarCuponHibrido(config.porcentajeDescuento);
      comandaData.cuponGenerado = {
        codigo: cupon.codigo,
        descuento: cupon.descuento,
        fechaCaducidad: cupon.fechaCaducidad
      };
      mostrarPopupDescuento(subtotal, cupon);
      console.log('Cupón generado en compra:', cupon.codigo);
      // Guardar cupó a Firestore amb comandaId (després de tenir l'ID)
      window.guardarCuponFirestoreAmbComanda = async (cId) => {
        await guardarCuponFirestore(cupon, comandaData.cliente.email, cId);
      };
    }


    // 2. Firestore (aquest apartat està correcte)
    let comandaId = 'COM' + Date.now();
    try {
      const docRef = await addDoc(collection(db, "comandas"), comandaData);
      comandaId = docRef.id;
      console.log("Comanda guardada:", comandaId);
      // Guardar cupó amb comandaId
      if (typeof window.guardarCuponFirestoreAmbComanda === 'function') {
        await window.guardarCuponFirestoreAmbComanda(comandaId);
        window.guardarCuponFirestoreAmbComanda = null;
      }
    } catch (e) {
      console.log("Firestore falló, pero email s'enviarà");
    }

    // 3. Email admin - NOVA VERSIÓ ESPECIALITZADA
    await enviarNotificacionAdmin(comandaData, comandaId);

   // 4. Email client (aquest apartat està correcte - NO tocar)
    await enviarConfirmacionCliente(comandaData, comandaId);

    // 5. Subscripció newsletter si el client ha marcat la casella
    const newsletterChecked = newsletterConsentActiu;
    if (newsletterChecked && datosFormulario.email) {
      try {
        await setDoc(doc(db, "newsletter", datosFormulario.email), {
          email: datosFormulario.email,
          activo: true,
          fecha: new Date()
        });
      } catch(e) {
        console.error('Error guardant subscriptor newsletter:', e);
      }
    }

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
    <h3>${t('popup_añadido')}</h3>
    <div class="cart-popup-content">
      <img src="${escapeAttr(imgSrc)}" alt="${escapeAttr(product.nom || '')}">
      <div class="cart-popup-details">
        <div>${escapeHtml(product.nom || '')}</div>
        <div class="muted">${escapeHtml(variant.nom || t('popup_sin_variante'))}</div>
        <div class="price">${formatPrice(Number(variant.preu || 0))}</div>
      </div>
    </div>
    <div class="cart-popup-actions">
      <button class="btn secondary" id="seguir-comprando">${t('popup_seguir')}</button>
      <button class="btn primary" id="ver-carrito">${t('popup_ver_carrito')}</button>
    </div>
  `;
  cartPopup.offsetHeight;
  cartPopup.classList.add("active");
  const closePopup = () => {
    cartPopup.classList.remove("active");
    setTimeout(() => { cartPopup.style.display = "none"; }, 300);
  };
  document.getElementById("seguir-comprando").addEventListener("click", () => { closePopup(); }, { once: true });
  document.getElementById("ver-carrito").addEventListener("click", () => { closePopup(); location.hash = "#carrito"; }, { once: true });
  setTimeout(closePopup, 5000);
}

function getPaisosOptions() {
  const paisos = {
    es: [
      ['ES', 'España'], ['AD', 'Andorra'], ['AR', 'Argentina'], ['AU', 'Australia'],
      ['AT', 'Austria'], ['BE', 'Bélgica'], ['BO', 'Bolivia'], ['BR', 'Brasil'],
      ['CA', 'Canadá'], ['CL', 'Chile'], ['CN', 'China'], ['CO', 'Colombia'],
      ['CR', 'Costa Rica'], ['CU', 'Cuba'], ['CZ', 'República Checa'], ['DK', 'Dinamarca'],
      ['DO', 'República Dominicana'], ['EC', 'Ecuador'], ['EG', 'Egipto'], ['SV', 'El Salvador'],
      ['FI', 'Finlandia'], ['FR', 'Francia'], ['DE', 'Alemania'], ['GR', 'Grecia'],
      ['GT', 'Guatemala'], ['HN', 'Honduras'], ['HK', 'Hong Kong'], ['HU', 'Hungría'],
      ['IN', 'India'], ['ID', 'Indonesia'], ['IE', 'Irlanda'], ['IL', 'Israel'],
      ['IT', 'Italia'], ['JP', 'Japón'], ['MX', 'México'], ['MA', 'Marruecos'],
      ['NL', 'Países Bajos'], ['NZ', 'Nueva Zelanda'], ['NI', 'Nicaragua'], ['NO', 'Noruega'],
      ['PA', 'Panamá'], ['PY', 'Paraguay'], ['PE', 'Perú'], ['PH', 'Filipinas'],
      ['PL', 'Polonia'], ['PT', 'Portugal'], ['PR', 'Puerto Rico'], ['RO', 'Rumanía'],
      ['RU', 'Rusia'], ['SA', 'Arabia Saudí'], ['ZA', 'Sudáfrica'], ['KR', 'Corea del Sur'],
      ['SE', 'Suecia'], ['CH', 'Suiza'], ['TW', 'Taiwán'], ['TH', 'Tailandia'],
      ['TR', 'Turquía'], ['UA', 'Ucrania'], ['GB', 'Reino Unido'], ['US', 'Estados Unidos'],
      ['UY', 'Uruguay'], ['VE', 'Venezuela'], ['VN', 'Vietnam']
    ],
    cat: [
      ['ES', 'Espanya'], ['AD', 'Andorra'], ['AR', 'Argentina'], ['AU', 'Austràlia'],
      ['AT', 'Àustria'], ['BE', 'Bèlgica'], ['BO', 'Bolívia'], ['BR', 'Brasil'],
      ['CA', 'Canadà'], ['CL', 'Xile'], ['CN', 'Xina'], ['CO', 'Colòmbia'],
      ['CR', 'Costa Rica'], ['CU', 'Cuba'], ['CZ', 'República Txeca'], ['DK', 'Dinamarca'],
      ['DO', 'República Dominicana'], ['EC', 'Equador'], ['EG', 'Egipte'], ['SV', 'El Salvador'],
      ['FI', 'Finlàndia'], ['FR', 'França'], ['DE', 'Alemanya'], ['GR', 'Grècia'],
      ['GT', 'Guatemala'], ['HN', 'Hondures'], ['HK', 'Hong Kong'], ['HU', 'Hongria'],
      ['IN', 'Índia'], ['ID', 'Indonèsia'], ['IE', 'Irlanda'], ['IL', 'Israel'],
      ['IT', 'Itàlia'], ['JP', 'Japó'], ['MX', 'Mèxic'], ['MA', 'Marroc'],
      ['NL', 'Països Baixos'], ['NZ', 'Nova Zelanda'], ['NI', 'Nicaragua'], ['NO', 'Noruega'],
      ['PA', 'Panamà'], ['PY', 'Paraguai'], ['PE', 'Perú'], ['PH', 'Filipines'],
      ['PL', 'Polònia'], ['PT', 'Portugal'], ['PR', 'Puerto Rico'], ['RO', 'Romania'],
      ['RU', 'Rússia'], ['SA', 'Aràbia Saudita'], ['ZA', 'Sud-àfrica'], ['KR', 'Corea del Sud'],
      ['SE', 'Suècia'], ['CH', 'Suïssa'], ['TW', 'Taiwan'], ['TH', 'Tailàndia'],
      ['TR', 'Turquia'], ['UA', 'Ucraïna'], ['GB', 'Regne Unit'], ['US', 'Estats Units'],
      ['UY', 'Uruguai'], ['VE', 'Veneçuela'], ['VN', 'Vietnam']
    ],
    en: [
      ['ES', 'Spain'], ['AD', 'Andorra'], ['AR', 'Argentina'], ['AU', 'Australia'],
      ['AT', 'Austria'], ['BE', 'Belgium'], ['BO', 'Bolivia'], ['BR', 'Brazil'],
      ['CA', 'Canada'], ['CL', 'Chile'], ['CN', 'China'], ['CO', 'Colombia'],
      ['CR', 'Costa Rica'], ['CU', 'Cuba'], ['CZ', 'Czech Republic'], ['DK', 'Denmark'],
      ['DO', 'Dominican Republic'], ['EC', 'Ecuador'], ['EG', 'Egypt'], ['SV', 'El Salvador'],
      ['FI', 'Finland'], ['FR', 'France'], ['DE', 'Germany'], ['GR', 'Greece'],
      ['GT', 'Guatemala'], ['HN', 'Honduras'], ['HK', 'Hong Kong'], ['HU', 'Hungary'],
      ['IN', 'India'], ['ID', 'Indonesia'], ['IE', 'Ireland'], ['IL', 'Israel'],
      ['IT', 'Italy'], ['JP', 'Japan'], ['MX', 'Mexico'], ['MA', 'Morocco'],
      ['NL', 'Netherlands'], ['NZ', 'New Zealand'], ['NI', 'Nicaragua'], ['NO', 'Norway'],
      ['PA', 'Panama'], ['PY', 'Paraguay'], ['PE', 'Peru'], ['PH', 'Philippines'],
      ['PL', 'Poland'], ['PT', 'Portugal'], ['PR', 'Puerto Rico'], ['RO', 'Romania'],
      ['RU', 'Russia'], ['SA', 'Saudi Arabia'], ['ZA', 'South Africa'], ['KR', 'South Korea'],
      ['SE', 'Sweden'], ['CH', 'Switzerland'], ['TW', 'Taiwan'], ['TH', 'Thailand'],
      ['TR', 'Turkey'], ['UA', 'Ukraine'], ['GB', 'United Kingdom'], ['US', 'United States'],
      ['UY', 'Uruguay'], ['VE', 'Venezuela'], ['VN', 'Vietnam']
    ],
    fr: [
      ['ES', 'Espagne'], ['AD', 'Andorre'], ['AR', 'Argentine'], ['AU', 'Australie'],
      ['AT', 'Autriche'], ['BE', 'Belgique'], ['BO', 'Bolivie'], ['BR', 'Brésil'],
      ['CA', 'Canada'], ['CL', 'Chili'], ['CN', 'Chine'], ['CO', 'Colombie'],
      ['CR', 'Costa Rica'], ['CU', 'Cuba'], ['CZ', 'République tchèque'], ['DK', 'Danemark'],
      ['DO', 'République dominicaine'], ['EC', 'Équateur'], ['EG', 'Égypte'], ['SV', 'Salvador'],
      ['FI', 'Finlande'], ['FR', 'France'], ['DE', 'Allemagne'], ['GR', 'Grèce'],
      ['GT', 'Guatemala'], ['HN', 'Honduras'], ['HK', 'Hong Kong'], ['HU', 'Hongrie'],
      ['IN', 'Inde'], ['ID', 'Indonésie'], ['IE', 'Irlande'], ['IL', 'Israël'],
      ['IT', 'Italie'], ['JP', 'Japon'], ['MX', 'Mexique'], ['MA', 'Maroc'],
      ['NL', 'Pays-Bas'], ['NZ', 'Nouvelle-Zélande'], ['NI', 'Nicaragua'], ['NO', 'Norvège'],
      ['PA', 'Panama'], ['PY', 'Paraguay'], ['PE', 'Pérou'], ['PH', 'Philippines'],
      ['PL', 'Pologne'], ['PT', 'Portugal'], ['PR', 'Porto Rico'], ['RO', 'Roumanie'],
      ['RU', 'Russie'], ['SA', 'Arabie saoudite'], ['ZA', 'Afrique du Sud'], ['KR', 'Corée du Sud'],
      ['SE', 'Suède'], ['CH', 'Suisse'], ['TW', 'Taïwan'], ['TH', 'Thaïlande'],
      ['TR', 'Turquie'], ['UA', 'Ukraine'], ['GB', 'Royaume-Uni'], ['US', 'États-Unis'],
      ['UY', 'Uruguay'], ['VE', 'Venezuela'], ['VN', 'Viêt Nam']
    ],
    de: [
      ['ES', 'Spanien'], ['AD', 'Andorra'], ['AR', 'Argentinien'], ['AU', 'Australien'],
      ['AT', 'Österreich'], ['BE', 'Belgien'], ['BO', 'Bolivien'], ['BR', 'Brasilien'],
      ['CA', 'Kanada'], ['CL', 'Chile'], ['CN', 'China'], ['CO', 'Kolumbien'],
      ['CR', 'Costa Rica'], ['CU', 'Kuba'], ['CZ', 'Tschechien'], ['DK', 'Dänemark'],
      ['DO', 'Dominikanische Republik'], ['EC', 'Ecuador'], ['EG', 'Ägypten'], ['SV', 'El Salvador'],
      ['FI', 'Finnland'], ['FR', 'Frankreich'], ['DE', 'Deutschland'], ['GR', 'Griechenland'],
      ['GT', 'Guatemala'], ['HN', 'Honduras'], ['HK', 'Hongkong'], ['HU', 'Ungarn'],
      ['IN', 'Indien'], ['ID', 'Indonesien'], ['IE', 'Irland'], ['IL', 'Israel'],
      ['IT', 'Italien'], ['JP', 'Japan'], ['MX', 'Mexiko'], ['MA', 'Marokko'],
      ['NL', 'Niederlande'], ['NZ', 'Neuseeland'], ['NI', 'Nicaragua'], ['NO', 'Norwegen'],
      ['PA', 'Panama'], ['PY', 'Paraguay'], ['PE', 'Peru'], ['PH', 'Philippinen'],
      ['PL', 'Polen'], ['PT', 'Portugal'], ['PR', 'Puerto Rico'], ['RO', 'Rumänien'],
      ['RU', 'Russland'], ['SA', 'Saudi-Arabien'], ['ZA', 'Südafrika'], ['KR', 'Südkorea'],
      ['SE', 'Schweden'], ['CH', 'Schweiz'], ['TW', 'Taiwan'], ['TH', 'Thailand'],
      ['TR', 'Türkei'], ['UA', 'Ukraine'], ['GB', 'Vereinigtes Königreich'], ['US', 'Vereinigte Staaten'],
      ['UY', 'Uruguay'], ['VE', 'Venezuela'], ['VN', 'Vietnam']
    ],
    it: [
      ['ES', 'Spagna'], ['AD', 'Andorra'], ['AR', 'Argentina'], ['AU', 'Australia'],
      ['AT', 'Austria'], ['BE', 'Belgio'], ['BO', 'Bolivia'], ['BR', 'Brasile'],
      ['CA', 'Canada'], ['CL', 'Cile'], ['CN', 'Cina'], ['CO', 'Colombia'],
      ['CR', 'Costa Rica'], ['CU', 'Cuba'], ['CZ', 'Repubblica Ceca'], ['DK', 'Danimarca'],
      ['DO', 'Repubblica Dominicana'], ['EC', 'Ecuador'], ['EG', 'Egitto'], ['SV', 'El Salvador'],
      ['FI', 'Finlandia'], ['FR', 'Francia'], ['DE', 'Germania'], ['GR', 'Grecia'],
      ['GT', 'Guatemala'], ['HN', 'Honduras'], ['HK', 'Hong Kong'], ['HU', 'Ungheria'],
      ['IN', 'India'], ['ID', 'Indonesia'], ['IE', 'Irlanda'], ['IL', 'Israele'],
      ['IT', 'Italia'], ['JP', 'Giappone'], ['MX', 'Messico'], ['MA', 'Marocco'],
      ['NL', 'Paesi Bassi'], ['NZ', 'Nuova Zelanda'], ['NI', 'Nicaragua'], ['NO', 'Norvegia'],
      ['PA', 'Panama'], ['PY', 'Paraguay'], ['PE', 'Perù'], ['PH', 'Filippine'],
      ['PL', 'Polonia'], ['PT', 'Portogallo'], ['PR', 'Porto Rico'], ['RO', 'Romania'],
      ['RU', 'Russia'], ['SA', 'Arabia Saudita'], ['ZA', 'Sudafrica'], ['KR', 'Corea del Sud'],
      ['SE', 'Svezia'], ['CH', 'Svizzera'], ['TW', 'Taiwan'], ['TH', 'Tailandia'],
      ['TR', 'Turchia'], ['UA', 'Ucraina'], ['GB', 'Regno Unito'], ['US', 'Stati Uniti'],
      ['UY', 'Uruguay'], ['VE', 'Venezuela'], ['VN', 'Vietnam']
    ],
    pt: [
      ['ES', 'Espanha'], ['AD', 'Andorra'], ['AR', 'Argentina'], ['AU', 'Austrália'],
      ['AT', 'Áustria'], ['BE', 'Bélgica'], ['BO', 'Bolívia'], ['BR', 'Brasil'],
      ['CA', 'Canadá'], ['CL', 'Chile'], ['CN', 'China'], ['CO', 'Colômbia'],
      ['CR', 'Costa Rica'], ['CU', 'Cuba'], ['CZ', 'República Checa'], ['DK', 'Dinamarca'],
      ['DO', 'República Dominicana'], ['EC', 'Equador'], ['EG', 'Egito'], ['SV', 'El Salvador'],
      ['FI', 'Finlândia'], ['FR', 'França'], ['DE', 'Alemanha'], ['GR', 'Grécia'],
      ['GT', 'Guatemala'], ['HN', 'Honduras'], ['HK', 'Hong Kong'], ['HU', 'Hungria'],
      ['IN', 'Índia'], ['ID', 'Indonésia'], ['IE', 'Irlanda'], ['IL', 'Israel'],
      ['IT', 'Itália'], ['JP', 'Japão'], ['MX', 'México'], ['MA', 'Marrocos'],
      ['NL', 'Países Baixos'], ['NZ', 'Nova Zelândia'], ['NI', 'Nicarágua'], ['NO', 'Noruega'],
      ['PA', 'Panamá'], ['PY', 'Paraguai'], ['PE', 'Peru'], ['PH', 'Filipinas'],
      ['PL', 'Polônia'], ['PT', 'Portugal'], ['PR', 'Porto Rico'], ['RO', 'Romênia'],
      ['RU', 'Rússia'], ['SA', 'Arábia Saudita'], ['ZA', 'África do Sul'], ['KR', 'Coreia do Sul'],
      ['SE', 'Suécia'], ['CH', 'Suíça'], ['TW', 'Taiwan'], ['TH', 'Tailândia'],
      ['TR', 'Turquia'], ['UA', 'Ucrânia'], ['GB', 'Reino Unido'], ['US', 'Estados Unidos'],
      ['UY', 'Uruguai'], ['VE', 'Venezuela'], ['VN', 'Vietnã']
    ],
    sv: [
      ['ES', 'Spanien'], ['AD', 'Andorra'], ['AR', 'Argentina'], ['AU', 'Australien'],
      ['AT', 'Österrike'], ['BE', 'Belgien'], ['BO', 'Bolivia'], ['BR', 'Brasilien'],
      ['CA', 'Kanada'], ['CL', 'Chile'], ['CN', 'Kina'], ['CO', 'Colombia'],
      ['CR', 'Costa Rica'], ['CU', 'Kuba'], ['CZ', 'Tjeckien'], ['DK', 'Danmark'],
      ['DO', 'Dominikanska republiken'], ['EC', 'Ecuador'], ['EG', 'Egypten'], ['SV', 'El Salvador'],
      ['FI', 'Finland'], ['FR', 'Frankrike'], ['DE', 'Tyskland'], ['GR', 'Grekland'],
      ['GT', 'Guatemala'], ['HN', 'Honduras'], ['HK', 'Hongkong'], ['HU', 'Ungern'],
      ['IN', 'Indien'], ['ID', 'Indonesien'], ['IE', 'Irland'], ['IL', 'Israel'],
      ['IT', 'Italien'], ['JP', 'Japan'], ['MX', 'Mexiko'], ['MA', 'Marocko'],
      ['NL', 'Nederländerna'], ['NZ', 'Nya Zeeland'], ['NI', 'Nicaragua'], ['NO', 'Norge'],
      ['PA', 'Panama'], ['PY', 'Paraguay'], ['PE', 'Peru'], ['PH', 'Filippinerna'],
      ['PL', 'Polen'], ['PT', 'Portugal'], ['PR', 'Puerto Rico'], ['RO', 'Rumänien'],
      ['RU', 'Ryssland'], ['SA', 'Saudiarabien'], ['ZA', 'Sydafrika'], ['KR', 'Sydkorea'],
      ['SE', 'Sverige'], ['CH', 'Schweiz'], ['TW', 'Taiwan'], ['TH', 'Thailand'],
      ['TR', 'Turkiet'], ['UA', 'Ukraina'], ['GB', 'Storbritannien'], ['US', 'USA'],
      ['UY', 'Uruguay'], ['VE', 'Venezuela'], ['VN', 'Vietnam']
    ],
    da: [
      ['ES', 'Spanien'], ['AD', 'Andorra'], ['AR', 'Argentina'], ['AU', 'Australien'],
      ['AT', 'Østrig'], ['BE', 'Belgien'], ['BO', 'Bolivia'], ['BR', 'Brasilien'],
      ['CA', 'Canada'], ['CL', 'Chile'], ['CN', 'Kina'], ['CO', 'Colombia'],
      ['CR', 'Costa Rica'], ['CU', 'Cuba'], ['CZ', 'Tjekkiet'], ['DK', 'Danmark'],
      ['DO', 'Dominikanske Republik'], ['EC', 'Ecuador'], ['EG', 'Egypten'], ['SV', 'El Salvador'],
      ['FI', 'Finland'], ['FR', 'Frankrig'], ['DE', 'Tyskland'], ['GR', 'Grækenland'],
      ['GT', 'Guatemala'], ['HN', 'Honduras'], ['HK', 'Hongkong'], ['HU', 'Ungarn'],
      ['IN', 'Indien'], ['ID', 'Indonesien'], ['IE', 'Irland'], ['IL', 'Israel'],
      ['IT', 'Italien'], ['JP', 'Japan'], ['MX', 'Mexico'], ['MA', 'Marokko'],
      ['NL', 'Holland'], ['NZ', 'New Zealand'], ['NI', 'Nicaragua'], ['NO', 'Norge'],
      ['PA', 'Panama'], ['PY', 'Paraguay'], ['PE', 'Peru'], ['PH', 'Filippinerne'],
      ['PL', 'Polen'], ['PT', 'Portugal'], ['PR', 'Puerto Rico'], ['RO', 'Rumænien'],
      ['RU', 'Rusland'], ['SA', 'Saudi-Arabien'], ['ZA', 'Sydafrika'], ['KR', 'Sydkorea'],
      ['SE', 'Sverige'], ['CH', 'Schweiz'], ['TW', 'Taiwan'], ['TH', 'Thailand'],
      ['TR', 'Tyrkiet'], ['UA', 'Ukraine'], ['GB', 'Storbritannien'], ['US', 'USA'],
      ['UY', 'Uruguay'], ['VE', 'Venezuela'], ['VN', 'Vietnam']
    ],
    pl: [
      ['ES', 'Hiszpania'], ['AD', 'Andora'], ['AR', 'Argentyna'], ['AU', 'Australia'],
      ['AT', 'Austria'], ['BE', 'Belgia'], ['BO', 'Boliwia'], ['BR', 'Brazylia'],
      ['CA', 'Kanada'], ['CL', 'Chile'], ['CN', 'Chiny'], ['CO', 'Kolumbia'],
      ['CR', 'Kostaryka'], ['CU', 'Kuba'], ['CZ', 'Czechy'], ['DK', 'Dania'],
      ['DO', 'Dominikana'], ['EC', 'Ekwador'], ['EG', 'Egipt'], ['SV', 'Salwador'],
      ['FI', 'Finlandia'], ['FR', 'Francja'], ['DE', 'Niemcy'], ['GR', 'Grecja'],
      ['GT', 'Gwatemala'], ['HN', 'Honduras'], ['HK', 'Hongkong'], ['HU', 'Węgry'],
      ['IN', 'Indie'], ['ID', 'Indonezja'], ['IE', 'Irlandia'], ['IL', 'Izrael'],
      ['IT', 'Włochy'], ['JP', 'Japonia'], ['MX', 'Meksyk'], ['MA', 'Maroko'],
      ['NL', 'Holandia'], ['NZ', 'Nowa Zelandia'], ['NI', 'Nikaragua'], ['NO', 'Norwegia'],
      ['PA', 'Panama'], ['PY', 'Paragwaj'], ['PE', 'Peru'], ['PH', 'Filipiny'],
      ['PL', 'Polska'], ['PT', 'Portugalia'], ['PR', 'Portoryko'], ['RO', 'Rumunia'],
      ['RU', 'Rosja'], ['SA', 'Arabia Saudyjska'], ['ZA', 'Republika Południowej Afryki'], ['KR', 'Korea Południowa'],
      ['SE', 'Szwecja'], ['CH', 'Szwajcaria'], ['TW', 'Tajwan'], ['TH', 'Tajlandia'],
      ['TR', 'Turcja'], ['UA', 'Ukraina'], ['GB', 'Wielka Brytania'], ['US', 'Stany Zjednoczone'],
      ['UY', 'Urugwaj'], ['VE', 'Wenezuela'], ['VN', 'Wietnam']
    ],
    fi: [
      ['ES', 'Espanja'], ['AD', 'Andorra'], ['AR', 'Argentiina'], ['AU', 'Australia'],
      ['AT', 'Itävalta'], ['BE', 'Belgia'], ['BO', 'Bolivia'], ['BR', 'Brasilia'],
      ['CA', 'Kanada'], ['CL', 'Chile'], ['CN', 'Kiina'], ['CO', 'Kolumbia'],
      ['CR', 'Costa Rica'], ['CU', 'Kuuba'], ['CZ', 'Tšekki'], ['DK', 'Tanska'],
      ['DO', 'Dominikaaninen tasavalta'], ['EC', 'Ecuador'], ['EG', 'Egypti'], ['SV', 'El Salvador'],
      ['FI', 'Suomi'], ['FR', 'Ranska'], ['DE', 'Saksa'], ['GR', 'Kreikka'],
      ['GT', 'Guatemala'], ['HN', 'Honduras'], ['HK', 'Hongkong'], ['HU', 'Unkari'],
      ['IN', 'Intia'], ['ID', 'Indonesia'], ['IE', 'Irlanti'], ['IL', 'Israel'],
      ['IT', 'Italia'], ['JP', 'Japani'], ['MX', 'Meksiko'], ['MA', 'Marokko'],
      ['NL', 'Alankomaat'], ['NZ', 'Uusi-Seelanti'], ['NI', 'Nicaragua'], ['NO', 'Norja'],
      ['PA', 'Panama'], ['PY', 'Paraguay'], ['PE', 'Peru'], ['PH', 'Filippiinit'],
      ['PL', 'Puola'], ['PT', 'Portugali'], ['PR', 'Puerto Rico'], ['RO', 'Romania'],
      ['RU', 'Venäjä'], ['SA', 'Saudi-Arabia'], ['ZA', 'Etelä-Afrikka'], ['KR', 'Etelä-Korea'],
      ['SE', 'Ruotsi'], ['CH', 'Sveitsi'], ['TW', 'Taiwan'], ['TH', 'Thaimaa'],
      ['TR', 'Turkki'], ['UA', 'Ukraina'], ['GB', 'Yhdistynyt kuningaskunta'], ['US', 'Yhdysvallat'],
      ['UY', 'Uruguay'], ['VE', 'Venezuela'], ['VN', 'Vietnam']
    ],
    no: [
      ['ES', 'Spania'], ['AD', 'Andorra'], ['AR', 'Argentina'], ['AU', 'Australia'],
      ['AT', 'Østerrike'], ['BE', 'Belgia'], ['BO', 'Bolivia'], ['BR', 'Brasil'],
      ['CA', 'Canada'], ['CL', 'Chile'], ['CN', 'Kina'], ['CO', 'Colombia'],
      ['CR', 'Costa Rica'], ['CU', 'Cuba'], ['CZ', 'Tsjekkia'], ['DK', 'Danmark'],
      ['DO', 'Den dominikanske republikk'], ['EC', 'Ecuador'], ['EG', 'Egypt'], ['SV', 'El Salvador'],
      ['FI', 'Finland'], ['FR', 'Frankrike'], ['DE', 'Tyskland'], ['GR', 'Hellas'],
      ['GT', 'Guatemala'], ['HN', 'Honduras'], ['HK', 'Hongkong'], ['HU', 'Ungarn'],
      ['IN', 'India'], ['ID', 'Indonesia'], ['IE', 'Irland'], ['IL', 'Israel'],
      ['IT', 'Italia'], ['JP', 'Japan'], ['MX', 'Mexico'], ['MA', 'Marokko'],
      ['NL', 'Nederland'], ['NZ', 'New Zealand'], ['NI', 'Nicaragua'], ['NO', 'Norge'],
      ['PA', 'Panama'], ['PY', 'Paraguay'], ['PE', 'Peru'], ['PH', 'Filippinene'],
      ['PL', 'Polen'], ['PT', 'Portugal'], ['PR', 'Puerto Rico'], ['RO', 'Romania'],
      ['RU', 'Russland'], ['SA', 'Saudi-Arabia'], ['ZA', 'Sør-Afrika'], ['KR', 'Sør-Korea'],
      ['SE', 'Sverige'], ['CH', 'Sveits'], ['TW', 'Taiwan'], ['TH', 'Thailand'],
      ['TR', 'Tyrkia'], ['UA', 'Ukraina'], ['GB', 'Storbritannia'], ['US', 'USA'],
      ['UY', 'Uruguay'], ['VE', 'Venezuela'], ['VN', 'Vietnam']
    ]
  };

  const llista = (paisos[idiomaActiu] || paisos['es']).sort((a, b) =>
    a[1].localeCompare(b[1], idiomaActiu)
  );
  const paisDefecte = idiomaActiu === 'es' || idiomaActiu === 'cat' ? 'ES' : '';
  return llista.map(([codi, nom]) =>
    `<option value="${nom}" ${codi === paisDefecte ? 'selected' : ''}>${nom}</option>`
  ).join('');
}

function renderCart() {
  if (!carritoContenido) return;
  carritoContenido.innerHTML = "";
  direccionFormContainer.innerHTML = "";
  
  // Resetear secció de cupó si no hi ha carrito
  if (!carrito.length) {
    carritoContenido.innerHTML = `<p>${t('carrito_vacio')}</p>`;
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
          <button class="btn secondary btn-minus btn-cantidad" data-idx="${idx}">-</button>
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
        <span>${t('carrito_subtotal_label')}</span>
        <strong>${formatPrice(subtotal)}</strong>
      </div>
      ${descuentoAplicado > 0 ? `
      <div class="cart-line descuento-line">
        <span>${t('carrito_descuento_label')}</span>
        <strong>-${formatPrice(descuentoAplicado)}</strong>
      </div>
      ` : ''}
      <div class="cart-line">
        <span>${t('carrito_envio')} (${t('carrito_envio_gratis_desde')} ${formatPrice(config.enviamentGratisDesDe)})</span>
        <strong>${formatPrice(envioCalculado)}</strong>
      </div>
      <div class="cart-line">
        <span>${t('carrito_total')}</span>
        <div class="price-info">
          <div class="iva-info">(${t('carrito_iva')} ${formatPrice(iva)} ${t('carrito_iva_label')})</div>
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

function getDeviceType() {
  const ua = navigator.userAgent;

  if (/android/i.test(ua)) return "android";
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  return "desktop";
}

function showAddressForm() {

  console.log("🔄 showAddressForm() ejecutándose...");
  console.log("💰 Carrito actual:", carrito);
  console.log("💰 Subtotal calculado:", calcularSubtotal());
  console.log("💰 Total calculado:", calcularTotal());
  console.log("💰 Descuento aplicado:", descuentoAplicado);

  const device = getDeviceType();

  direccionFormContainer.innerHTML = `
    <form id="direccion-form" class="direccion-form">
      <label for="nombre">${t('carrito_nombre')}</label>
      <input id="nombre" type="text" placeholder="${t('carrito_nombre')}" required>
      <label for="apellidos">${t('carrito_apellidos')}</label>
      <input id="apellidos" type="text" placeholder="${t('carrito_apellidos')}" required>
      <label for="direccion">${t('carrito_direccion')}</label>
      <input id="direccion" type="text" placeholder="${t('carrito_direccion')}" required>
      <label for="info-adicional">${t('carrito_info_adicional')}</label>
      <input id="info-adicional" type="text" placeholder="${t('carrito_info_adicional')}" required>
      <label for="codigo-postal">${t('carrito_codigo_postal')}</label>
      <input id="codigo-postal" type="text" placeholder="${t('carrito_codigo_postal')}" required>
      <label for="ciudad">${t('carrito_ciudad')}</label>
      <input id="ciudad" type="text" placeholder="${t('carrito_ciudad')}" required>
      <label for="pais">${t('carrito_pais')}</label>
      <select id="pais" required style="width:100%;">
        ${getPaisosOptions()}
      </select>
      <label for="telefono">${t('carrito_telefono')}</label>
      <input id="telefono" type="tel" placeholder="${t('carrito_telefono')}" required>
      <label for="email">${t('contacto_email')}</label>
      <input id="email" type="email" placeholder="${t('contacto_email')}" required>
    </form>
    <div class="opciones-pago-particular">
      <h3>${t('carrito_elige_pago')}</h3>
      <div class="opcion-pago destaque">
        <h4>${t('carrito_pago_online')}</h4>
        <div id="paypal-button-container"></div>
      </div>
    </div>
  `;

  const form = document.getElementById("direccion-form");

  function validarFormulario() {
    const fields = ["nombre","apellidos","direccion","info-adicional",
      "codigo-postal","ciudad","pais","telefono","email"];

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

  async function procesarPedidoExitoso(formData) {
    try {
      const comandaId = await guardarComanda(formData);
if (cuponAplicado) {
  await marcarCuponUtilizadoHibrido(cuponAplicado.codigo, comandaId);
}

      alert(t('carrito_pedido_completado') + ' ' + comandaId);

      setTimeout(() => {
        carrito = [];
        saveCart();
        renderCart();
        direccionFormContainer.innerHTML = "";
        resetearCupon();
      }, 100);

    } catch (error) {
      console.error("Error:", error);
      alert(t('carrito_error_compra'));
    }
  }

  // PAYPAL
  paypal.Buttons({
    style: {
      layout: 'vertical',
      color: 'gold',
      shape: 'rect',
      label: 'paypal'
    },
    createOrder: (data, actions) => {
      newsletterConsentActiu = document.getElementById('newsletterCheck')?.checked || false;
      const formData = validarFormulario();
      if (!formData) {
        alert(t('carrito_completa_campos'));
        return Promise.reject(new Error("Formulario inválido"));
      }
      return actions.order.create({
        purchase_units: [{
          amount: {
            value: calcularTotal().toFixed(2),
            currency_code: 'EUR'
          },
          description: 'Compra Tradenfy'
        }]
      });
    },
    onApprove: async (data, actions) => {
      try {
        await actions.order.capture();
        const formData = validarFormulario();
        if (formData) {
          await procesarPedidoExitoso(formData);
        }
      } catch (error) {
        console.error("Error captura PayPal:", error);
        alert(t('carrito_error_pago') + ' ' + (error.message || JSON.stringify(error)));
      }
    },
    onError: (err) => {
      console.error("Error PayPal:", err);
      alert(t('carrito_error_paypal'));

    }
  }).render('#paypal-button-container');
}
if (vaciarCarritoBtn) vaciarCarritoBtn.addEventListener("click", () => {
  if (!confirm(t('carrito_confirmar_vaciar'))) return;
  carrito = [];
  saveCart();
  renderCart();
  resetearCupon();
});

/* ---------------------------
   ESTADÍSTICAS DE VISITAS
   --------------------------- */

async function registrarVisita(seccion) {
  if (!cookiesAnaliticaPermeses()) return;
  try {
    console.log("📊 Registrant visita a:", seccion);
    const hoy = new Date().toISOString().split('T')[0];
    const docRef = doc(db, "estadisticas", hoy);
    const docSnap = await getDoc(docRef);
    console.log("📊 Document existeix:", docSnap.exists());

    if (docSnap.exists()) {
      const data = docSnap.data();
      await updateDoc(docRef, {
        [seccion]: (data[seccion] || 0) + 1,
        total: (data.total || 0) + 1
      });
    } else {
      await setDoc(docRef, {
        [seccion]: 1,
        total: 1,
        fecha: hoy
      });
    }
    console.log("📊 Visita registrada correctament");
  } catch (e) {
    console.error("📊 Error registrant visita:", e);
  }
}

async function loadEstadisticas() {
  const contenedor = document.getElementById("estadisticas-contenido");
  if (!contenedor) return;
  contenedor.innerHTML = `<p>${t('estadisticas_cargando')}</p>`;
  try {
    const secciones = ["inicio", "tienda", "novedades", "quienes-somos", "contacto"];
    const seccionNoms = {
      'inicio': t('estadisticas_inici'),
      'tienda': t('estadisticas_sec_tienda'),
      'novedades': t('estadisticas_sec_novedades'),
      'quienes-somos': t('estadisticas_sec_quienes'),
      'contacto': t('estadisticas_sec_contacto'),
    };
    const snap = await getDocs(query(collection(db, "estadisticas"), orderBy("fecha", "desc"), limit(30)));
    const dias = [];
    snap.forEach(d => dias.push(d.data()));
    if (dias.length === 0) {
      contenedor.innerHTML = `<p>${t('estadisticas_sin_datos')}</p>`;
      return;
    }
    const totales = {};
    let totalGeneral = 0;
    secciones.forEach(s => totales[s] = 0);
    dias.forEach(d => {
      secciones.forEach(s => { totales[s] += d[s] || 0; });
      totalGeneral += d.total || 0;
    });
    const masVisitada = secciones.reduce((a, b) => totales[a] > totales[b] ? a : b);
    const masVisitadaNom = masVisitada === 'inicio' ? t('estadisticas_inici') : masVisitada;
    contenedor.innerHTML = `
      <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap:1rem; margin-bottom:2rem;">
        <div style="background:#e6f6fa; border-radius:12px; padding:1.5rem; text-align:center;">
          <div style="font-size:2rem; font-weight:700; color:#c0618a;">${totalGeneral}</div>
          <div style="color:#666; margin-top:0.5rem;">${t('estadisticas_visites')}</div>
        </div>
        <div style="background:#d4edda; border-radius:12px; padding:1.5rem; text-align:center;">
          <div style="font-size:2rem; font-weight:700; color:#28a745;">${dias.length}</div>
          <div style="color:#666; margin-top:0.5rem;">${t('estadisticas_dies')}</div>
        </div>
        <div style="background:#fff3cd; border-radius:12px; padding:1.5rem; text-align:center;">
          <div style="font-size:1.2rem; font-weight:700; color:#f0ad4e;">${masVisitadaNom}</div>
          <div style="color:#666; margin-top:0.5rem;">${t('estadisticas_seccio')}</div>
        </div>
      </div>
      <h3>${t('estadisticas_per_seccio')}</h3>
      <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap:0.75rem; margin-bottom:2rem;">
        ${secciones.map(s => `
          <div style="background:white; border:1px solid #eee; border-radius:10px; padding:1rem; text-align:center;">
            <div style="font-size:1.5rem; font-weight:700; color:#333;">${totales[s]}</div>
            <div style="color:#888; font-size:0.85rem; margin-top:0.25rem;">${seccionNoms[s] || s}</div>
          </div>
        `).join('')}
      </div>
      <h3>${t('estadisticas_registro_diario')}</h3>
      <table style="width:100%; border-collapse:collapse; font-size:0.9rem;">
        <thead>
          <tr style="background:#e6f6fa;">
            <th style="padding:8px 12px; text-align:left; border-bottom:2px solid #38d1e5;">${t('estadisticas_data')}</th>
            ${secciones.map(s => `<th style="padding:8px 12px; text-align:center; border-bottom:2px solid #38d1e5;">${seccionNoms[s] || s}</th>`).join('')}
            <th style="padding:8px 12px; text-align:center; border-bottom:2px solid #38d1e5;">${t('estadisticas_total')}</th>
          </tr>
        </thead>
        <tbody>
          ${dias.map(d => `
            <tr style="border-bottom:1px solid #38d1e5;">
              <td style="padding:8px 12px;">${d.fecha}</td>
              ${secciones.map(s => `<td style="padding:8px 12px; text-align:center;">${d[s] || 0}</td>`).join('')}
              <td style="padding:8px 12px; text-align:center; font-weight:700;">${d.total || 0}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (e) {
    contenedor.innerHTML = `<p>${t('estadisticas_error')} ${e.message}</p>`;
  }
}

/* ---------------------------
   INICIALIZACIONES
   --------------------------- */
buildAddProductForm();
saveCart();
loadProducts();
loadHeaderImages();
// NOU: Inicialitzar el cercador
initSearch();
// NOU: Inicialitzar el sistema de cupons
initCuponSystem();
if (searchInput) searchInput.addEventListener("input", () => {
  renderProductGrid(productsCache);
});

/* ---------------------------
   COOKIE BANNER
   --------------------------- */

function cookieConsentGuardat() {
  const saved = localStorage.getItem(COOKIE_KEY);
  if (!saved) return null;
  const data = JSON.parse(saved);
  const ara = new Date().getTime();
  if (ara > data.expiry) {
    localStorage.removeItem(COOKIE_KEY);
    return null;
  }
  return data;
}

function guardarCookieConsent(consentData) {
  const expiry = new Date().getTime() + (COOKIE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
  localStorage.setItem(COOKIE_KEY, JSON.stringify({ categories: consentData, expiry }));
}

function tancarBanner() {
  const banner = document.getElementById("cookie-banner");
  if (banner) banner.style.display = "none";
}

function tancarPanel() {
  document.getElementById("cookie-panel").style.display = "none";
  document.getElementById("cookie-overlay").style.display = "none";
}

function obrirPanel() {
  document.getElementById("cookie-panel").style.display = "block";
  document.getElementById("cookie-overlay").style.display = "block";
}

async function initCookieBanner() {
  try {
    // Carregar configuració de cookies des de Firestore
    const snap = await getDoc(doc(db, "config", "textosSecciones"));
    let bannerText = "";
    let categories = [
      { id: "necesarias", nom: "Cookies necesarias", descripcion: "Imprescindibles para el funcionamiento de la web (carrito, login).", obligatoria: true },
      { id: "analitica", nom: "Cookies analíticas", descripcion: "Nos permiten saber qué secciones visitan los usuarios.", obligatoria: false },
      { id: "terceros", nom: "Cookies de terceros", descripcion: "Utilizadas por PayPal para procesar pagos de forma segura.", obligatoria: false }
    ];
    if (snap.exists() && snap.data().cookiesConfig) {
      const config = snap.data().cookiesConfig;
      if (config.bannerText) bannerText = config.bannerText;
      if (config.categories) categories = config.categories;
    }

    // Actualitzar text del banner
    const bannerP = document.getElementById("cookie-banner-p");
    const textBanner = (snap.exists() && snap.data().cookiesConfig?.bannerTexts?.[idiomaActiu]) || bannerText;
    cookieBannerText = textBanner;
    localStorage.setItem('tradenfy_cookie_banner', textBanner);
    if (bannerP) {
      bannerP.innerHTML = `${textBanner} <a href="#politica-privacidad" id="cookie-privacidad-link">${t('cookie_mas_info')}</a>`;
    }

    // Generar categories dinàmicament al panel
    const lista = document.getElementById("cookie-categories-lista");
    if (lista) {
      lista.innerHTML = '';
      categories.forEach(cat => {
        const nomTraduit = (cat.noms && cat.noms[idiomaActiu]) || cat.nom || '';
        const descTraduit = (cat.descripcions && cat.descripcions[idiomaActiu]) || cat.descripcion || '';
        const div = document.createElement('div');
        div.className = 'cookie-option';
        div.innerHTML = `
          <div>
            <strong>${nomTraduit}</strong>
            <p>${descTraduit}</p>
          </div>
          <input type="checkbox" id="cookie-check-${cat.id}" ${cat.obligatoria ? 'checked disabled' : ''}>
        `;
        lista.appendChild(div);
      });
    }

    // Mostrar o amagar el banner
    const banner = document.getElementById("cookie-banner");
    const consent = cookieConsentGuardat();
    if (consent) {
      if (banner) banner.style.display = "none";
    } else {
      if (banner) banner.style.display = "flex";
    }

    // Botons del banner
    document.getElementById("cookie-aceptar").addEventListener("click", () => {
      const consentData = {};
      categories.forEach(cat => { consentData[cat.id] = true; });
      guardarCookieConsent(consentData);
      tancarBanner();
    });
    document.getElementById("cookie-rechazar").addEventListener("click", () => {
      const consentData = {};
      categories.forEach(cat => { consentData[cat.id] = cat.obligatoria; });
      guardarCookieConsent(consentData);
      tancarBanner();
    });
    document.getElementById("cookie-configurar").addEventListener("click", () => {
      obrirPanel();
    });

    // Botons del panel
    document.getElementById("cookie-panel-cancelar").addEventListener("click", () => {
      tancarPanel();
    });
    document.getElementById("cookie-panel-guardar").addEventListener("click", () => {
      const consentData = {};
      categories.forEach(cat => {
        const chk = document.getElementById(`cookie-check-${cat.id}`);
        consentData[cat.id] = cat.obligatoria ? true : (chk ? chk.checked : false);
      });
      guardarCookieConsent(consentData);
      tancarPanel();
      tancarBanner();
    });

    // Tancar panel clicant fora
    document.getElementById("cookie-overlay").addEventListener("click", () => {
      tancarPanel();
    });

    // Enllaç política de privacitat
    document.getElementById("cookie-privacidad-link")?.addEventListener("click", () => {
      tancarBanner();
    });

    // Gestionar cookies des del footer
    const gestionarLink = document.getElementById("gestionar-cookies-link");
    if (gestionarLink) {
      gestionarLink.addEventListener("click", (e) => {
        e.preventDefault();
        if (banner) banner.style.display = "flex";
        obrirPanel();
      });
    }

  } catch (err) {
    console.error("Error inicialitzant cookie banner:", err);
  }
}

// Funció per comprovar si l'usuari ha acceptat les cookies analítiques
function cookiesAnaliticaPermeses() {
  const consent = cookieConsentGuardat();
  if (!consent) return false;
   return consent.categories?.analitica === true;
}

/* ---------------------------
   CARREGAR SDK PAYPAL DINÀMICAMENT
   --------------------------- */
async function carregarPaypalSDK() {
  try {
    const configDoc = await getDoc(doc(db, "config", "integraciones"));
    let clientId, mode;

    if (configDoc.exists()) {
      const data = configDoc.data();
      mode = data.paypalMode || 'live';
      clientId = mode === 'sandbox' ? data.paypalClientIdSandbox : data.paypalClientIdLive;
    }

    // Si no hi ha config a Firestore, usar el live hardcodejat
    if (!clientId) {
  console.error('No hi ha client-id de PayPal configurat a Firestore');
  return;
}

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=EUR`;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  } catch (e) {
    console.error('Error carregant PayPal SDK:', e);
  }
}

// Inicialitzar el banner
initCookieBanner();
carregarPaypalSDK();

/* ---------------------------
   CONTROL DE STOCK
   --------------------------- */
async function loadStock() {
  const contenedor = document.getElementById("stock-contenido");
  if (!contenedor) return;
  contenedor.innerHTML = `<p>${t('stock_cargando')}</p>`;
  try {
    const q = query(collection(db, "productes"), orderBy("nom"), limit(1000));
    const snap = await getDocs(q);
    const productos = [];
    snap.forEach(d => productos.push({ _docId: d.id, ...d.data() }));
    if (productos.length === 0) {
      contenedor.innerHTML = `<p>${t('stock_sin_productos')}</p>`;
      return;
    }
    const files = [];
    productos.forEach(p => {
      const variants = p.variants || [];
      if (variants.length === 0) {
        files.push({ nom: getNomProducte(p) || "-", id: p.id || p._docId, stock: "-", ocult: p.ocult || false, variantNom: "" });
      } else {
        variants.forEach(v => {
          files.push({ nom: getNomProducte(p) || "-", id: p.id || p._docId, stock: v.stock ?? "-", ocult: p.ocult || false, variantNom: getNomVariant(v) || "" });
        });
      }
    });
    let sortCol = "nom";
    let sortDir = 1;
    function sortFiles() {
      files.sort((a, b) => {
        let va = a[sortCol];
        let vb = b[sortCol];
        if (sortCol === "stock") {
          va = va === "-" ? -1 : Number(va);
          vb = vb === "-" ? -1 : Number(vb);
          return (va - vb) * sortDir;
        }
        if (sortCol === "ocult") {
          va = va ? 1 : 0;
          vb = vb ? 1 : 0;
          return (va - vb) * sortDir;
        }
        return String(va).localeCompare(String(vb), 'es') * sortDir;
      });
    }
    function fletxa(col) {
      if (sortCol !== col) return '<span style="color:#ccc; margin-left:4px;">↕</span>';
      return sortDir === 1 ? '<span style="margin-left:4px;">↑</span>' : '<span style="margin-left:4px;">↓</span>';
    }
    function renderTaula() {
      sortFiles();
      const stockBaix = files.filter(f => typeof f.stock === "number" && f.stock <= 2).length;
      const productesUnics = [...new Set(files.map(f => f.id))];
      const totalProductes = productesUnics.length;
      const visibles = productos.filter(p => !p.ocult).length;
      const ocults = productos.filter(p => p.ocult).length;
      const thStyle = `padding:10px 12px; text-align:left; border-bottom:2px solid #38d1e5; cursor:pointer; user-select:none; white-space:nowrap;`;
      const thCenterStyle = `padding:10px 12px; text-align:center; border-bottom:2px solid #38d1e5; cursor:pointer; user-select:none; white-space:nowrap;`;
      contenedor.innerHTML = `
        <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap:1rem; margin-bottom:2rem;">
          <div style="background:#e6f6fa; border-radius:12px; padding:1.5rem; text-align:center;">
            <div style="font-size:2rem; font-weight:700; color:#c0618a;">${totalProductes}</div>
            <div style="color:#666; margin-top:0.5rem;">${t('stock_total')}</div>
          </div>
          <div style="background:#d4edda; border-radius:12px; padding:1.5rem; text-align:center;">
            <div style="font-size:2rem; font-weight:700; color:#28a745;">${visibles}</div>
            <div style="color:#666; margin-top:0.5rem;">${t('stock_visibles')}</div>
          </div>
          <div style="background:#f8f0f5; border-radius:12px; padding:1.5rem; text-align:center;">
            <div style="font-size:2rem; font-weight:700; color:#c0618a;">${ocults}</div>
            <div style="color:#666; margin-top:0.5rem;">${t('stock_ocults')}</div>
          </div>
          <div style="background:${stockBaix > 0 ? '#fff0f0' : '#f8f0f5'}; border-radius:12px; padding:1.5rem; text-align:center;">
            <div style="font-size:2rem; font-weight:700; color:${stockBaix > 0 ? '#e74c3c' : '#c0618a'};">${stockBaix}</div>
            <div style="color:#666; margin-top:0.5rem;">${t('stock_bajo')}</div>
          </div>
        </div>
        <table style="width:100%; border-collapse:collapse; font-size:0.9rem;">
          <thead>
            <tr style="background:#e6f6fa;">
              <th data-col="nom" style="${thStyle}">${t('stock_nombre')} ${fletxa('nom')}</th>
              <th data-col="variantNom" style="${thStyle}">${t('stock_variante')} ${fletxa('variantNom')}</th>
              <th data-col="id" style="${thStyle}">${t('stock_id')} ${fletxa('id')}</th>
              <th data-col="stock" style="${thCenterStyle}">${t('stock_estat')} ${fletxa('stock')}</th>
              <th data-col="ocult" style="${thCenterStyle}">${t('stock_estat')} ${fletxa('ocult')}</th>
            </tr>
          </thead>
          <tbody>
            ${files.map(f => `
              <tr style="border-bottom:1px solid #38d1e5; ${typeof f.stock === 'number' && f.stock <= 2 ? 'background:#fff8f8;' : ''}">
                <td style="padding:10px 12px; font-weight:500;">${escapeHtml(f.nom)}</td>
                <td style="padding:10px 12px; color:#888;">${escapeHtml(f.variantNom)}</td>
                <td style="padding:10px 12px; color:#aaa; font-size:0.8rem;">${escapeHtml(String(f.id))}</td>
                <td style="padding:10px 12px; text-align:center; font-weight:700; color:${typeof f.stock === 'number' && f.stock <= 2 ? '#e74c3c' : '#333'};">
                  ${f.stock}
                </td>
                <td style="padding:10px 12px; text-align:center;">
                  <span style="background:${f.ocult ? '#f0e0ea' : '#e8f5e9'}; color:${f.ocult ? '#c0618a' : '#2e7d32'}; padding:3px 10px; border-radius:20px; font-size:0.8rem; font-weight:500;">
                    ${f.ocult ? t('stock_oculto') : t('stock_visible')}
                  </span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
      contenedor.querySelectorAll("th[data-col]").forEach(th => {
        th.addEventListener("click", () => {
          const col = th.dataset.col;
          if (sortCol === col) { sortDir *= -1; } else { sortCol = col; sortDir = 1; }
          renderTaula();
        });
      });
    }
    renderTaula();
  } catch (e) {
    contenedor.innerHTML = `<p>${t('stock_error')} ${e.message}</p>`;
  }
}

/* ---------------------------
   PEDIDOS ABIERTOS
   --------------------------- */
async function loadPedidos() {
  const contenedor = document.getElementById("pedidos-contenido");
  if (!contenedor) return;
  contenedor.innerHTML = `<p>${t('pedidos_cargando')}</p>`;
  try {
    await loadEmailConfig();
    const snap = await getDocs(query(collection(db, "comandas"), orderBy("fecha", "desc")));
    const pedidos = [];
    snap.forEach(d => {
      const data = d.data();
      if (data.estado === "pendiente") pedidos.push({ _docId: d.id, ...data });
    });
    if (pedidos.length === 0) {
      contenedor.innerHTML = `
        <div style="text-align:center; padding:3rem; color:#888;">
          <div style="font-size:3rem;">✅</div>
          <p>${t('pedidos_no_oberts')}</p>
        </div>
      `;
      return;
    }
    contenedor.innerHTML = `
      <div style="display:flex; gap:1rem; align-items:center; margin-bottom:2rem; flex-wrap:wrap;">
        <div style="background:#e6f6fa; border-radius:12px; padding:1.5rem; text-align:center;">
          <div style="font-size:2rem; font-weight:700; color:#c0618a;">${pedidos.length}</div>
          <div style="color:#666; margin-top:0.5rem;">${t('pedidos_pendientes')}</div>
        </div>
        <button onclick="eliminarTodosPedidos('pendiente')"
          style="background:#fff0f0; color:#dc3545; border:1px solid #dc3545; padding:0.6rem 1.2rem; border-radius:8px; cursor:pointer; font-size:0.9rem;">
          ${t('pedidos_eliminar_todos')}
        </button>
      </div>
      <div id="pedidos-lista">
        ${pedidos.map(p => renderPedidoCard(p, 'pendiente')).join('')}
      </div>
    `;
  } catch (e) {
    contenedor.innerHTML = `<p>${t('pedidos_error')} ${e.message}</p>`;
  }
}

/* ---------------------------
   PEDIDOS ENVIADOS
   --------------------------- */
async function loadPedidosEnviados() {
  const contenedor = document.getElementById("pedidos-enviados-contenido");
  if (!contenedor) return;
  console.log("loadPedidosEnviados ejecutada, contenedor:", contenedor);
  contenedor.innerHTML = `<p>${t('pedidos_cargando')}</p>`;
  try {
    const snap = await getDocs(query(collection(db, "comandas"), orderBy("fecha", "desc")));
    const pedidos = [];
    snap.forEach(d => {
      const data = d.data();
      console.log("Pedido encontrado:", d.id, "estado:", data.estado);
      if (data.estado === "enviado") pedidos.push({ _docId: d.id, ...data });
    });
    console.log("Pedidos enviados a renderizar:", pedidos.length);
    console.log("HTML generado:", pedidos.map(p => renderPedidoCard(p, 'enviado')).join('').substring(0, 200));
    if (pedidos.length === 0) {
      contenedor.innerHTML = `
        <div style="text-align:center; padding:3rem; color:#888;">
          <div style="font-size:3rem;">📭</div>
          <p>${t('pedidos_no_enviats')}</p>
        </div>
      `;
      return;
    }
    contenedor.innerHTML = `
      <div style="display:flex; gap:1rem; align-items:center; margin-bottom:2rem; flex-wrap:wrap;">
        <div style="background:#f0f8f0; border-radius:12px; padding:1.5rem; text-align:center;">
          <div style="font-size:2rem; font-weight:700; color:#28a745;">${pedidos.length}</div>
          <div style="color:#666; margin-top:0.5rem;">${t('pedidos_pendientes')}</div>
        </div>
        <button onclick="eliminarTodosPedidos('enviado')"
          style="background:#fff0f0; color:#dc3545; border:1px solid #dc3545; padding:0.6rem 1.2rem; border-radius:8px; cursor:pointer; font-size:0.9rem;">
          ${t('pedidos_eliminar_todos')}
        </button>
      </div>
      <div id="pedidos-enviados-lista">
        ${pedidos.map(p => renderPedidoCard(p, 'enviado')).join('')}
      </div>
    `;
  } catch (e) {
    contenedor.innerHTML = `<p>${t('pedidos_error')} ${e.message}</p>`;
  }
}

/* ---------------------------
   RENDER TARGETA PEDIDO
   --------------------------- */
function renderPedidoCard(p, tipus) {
  const fecha = p.fecha?.toDate ? p.fecha.toDate().toLocaleDateString('es-ES') : '-';
  const nombre = `${p.cliente?.nombre || ''} ${p.cliente?.apellidos || ''}`.trim();
  const direccion = [
    p.cliente?.direccion,
    p.cliente?.infoAdicional,
    `${p.cliente?.codigoPostal || ''} ${p.cliente?.ciudad || ''}`,
    p.cliente?.pais
  ].filter(Boolean).join(', ');
  const productosTexto = (p.productos || []).map(pr => {
    const prodCache = productsCache.find(pc => pc.id === pr.id || getNomProducte(pc) === pr.nombre || pc.nom === pr.nombre);
    const nomTraduit = prodCache ? getNomProducte(prodCache) : pr.nombre;
    const variantTraduit = prodCache ? (() => {
      const v = (prodCache.variants || []).find(v => getNomVariant(v) === pr.variante || v.nom === pr.variante);
      return v ? getNomVariant(v) : pr.variante;
    })() : pr.variante;
    return `${nomTraduit} (${variantTraduit}) x${pr.cantidad}`;
  }).join('<br>');
  const refCurta = p._docId.slice(-8).toUpperCase();
  const seguimientoBlock = tipus === 'pendiente' ? `
    <div style="border-top:1px solid #f0e0ea; padding-top:1rem;">
      <div style="display:flex; gap:0.5rem; margin-bottom:1rem;">
        <button id="btn-fisic-${p._docId}" onclick="canviarTipusEnviament('${p._docId}', 'fisic')"
          style="background:#38d1e5; color:white; border:none; padding:0.4rem 1rem; border-radius:8px; cursor:pointer; font-size:0.85rem;">
          📦 ${t('pedidos_fisic')}
        </button>
        <button id="btn-digital-${p._docId}" onclick="canviarTipusEnviament('${p._docId}', 'digital')"
          style="background:#e6f6fa; color:#000000; border:1px solid #38d1e5; padding:0.4rem 1rem; border-radius:8px; cursor:pointer; font-size:0.85rem;">
          💻 ${t('pedidos_digital')}
        </button>
      </div>
      <div id="bloc-fisic-${p._docId}" style="display:flex; flex-direction:column; gap:0.75rem;">
        <div style="display:flex; gap:0.75rem; align-items:center; flex-wrap:wrap;">
          <input id="tracking-${p._docId}" type="text" placeholder="${t('pedidos_tracking_placeholder')}"
            oninput="previsualizarSeguimentCard('${p._docId}')"
            style="flex:1; min-width:200px; padding:0.6rem 1rem; border:1px solid #ddd; border-radius:8px; font-size:0.9rem;">
        </div>
        <div style="display:flex; gap:0.75rem; align-items:center; flex-wrap:wrap;">
          <input id="agencia-${p._docId}" type="text" placeholder="${t('pedidos_agencia_placeholder')}"
            oninput="previsualizarSeguimentCard('${p._docId}')"
            style="flex:1; min-width:200px; padding:0.6rem 1rem; border:1px solid #ddd; border-radius:8px; font-size:0.9rem;">
          <input id="url-rastreig-${p._docId}" type="text" placeholder="${t('pedidos_url_rastreig_placeholder')}"
            oninput="previsualizarSeguimentCard('${p._docId}')"
            style="flex:2; min-width:250px; padding:0.6rem 1rem; border:1px solid #ddd; border-radius:8px; font-size:0.9rem;">
        </div>
        <div id="preview-seg-${p._docId}" style="background:#f9f9f9; border:1px solid #f0e0ea; border-radius:8px; padding:1rem; font-size:0.85rem; display:none;">
        </div>
        <div style="display:flex; gap:0.75rem;">
          <button onclick="enviarSeguimiento('${p._docId}', '${escapeAttr(p.cliente?.email || '')}', '${escapeAttr(nombre)}', '${refCurta}')"
            style="background:#38d1e5; color:white; border:none; padding:0.6rem 1.5rem; border-radius:8px; cursor:pointer; font-size:0.9rem; white-space:nowrap;">
            ${t('pedidos_enviar_seguimiento')}
          </button>
          <button onclick="eliminarPedido('${p._docId}', 'pendiente')"
            style="background:#fff0f0; color:#dc3545; border:1px solid #dc3545; padding:0.6rem 1rem; border-radius:8px; cursor:pointer; font-size:0.9rem;">
            🗑️
          </button>
        </div>
      </div>
   
      <div id="bloc-digital-${p._docId}" style="display:none; gap:0.75rem; align-items:center; flex-wrap:wrap;">
        <input id="enlace-${p._docId}" type="text" placeholder="${t('pedidos_enlace_placeholder')}"
          style="flex:1; min-width:200px; padding:0.6rem 1rem; border:1px solid #ddd; border-radius:8px; font-size:0.9rem;">
        <button onclick="enviarEnlaceDescarga('${p._docId}', '${escapeAttr(p.cliente?.email || '')}', '${escapeAttr(nombre)}', '${refCurta}')"
          style="background:#6f42c1; color:white; border:none; padding:0.6rem 1.5rem; border-radius:8px; cursor:pointer; font-size:0.9rem; white-space:nowrap;">
          ${t('pedidos_enviar_enlace')}
        </button>
        <button onclick="eliminarPedido('${p._docId}', 'pendiente')"
          style="background:#fff0f0; color:#dc3545; border:1px solid #dc3545; padding:0.6rem 1rem; border-radius:8px; cursor:pointer; font-size:0.9rem;">
          🗑️
        </button>
      </div>
    </div>
  ` : `
    <div style="border-top:1px solid #e0f0e0; padding-top:1rem; display:flex; gap:0.75rem; align-items:center; flex-wrap:wrap;">
      <div style="flex:1; background:#f0f8f0; border-radius:8px; padding:0.6rem 1rem; font-size:0.9rem;">
        ${p.enlaceDescarga ? `
          💻 ${t('pedidos_url_descarga')}: <a href="${p.enlaceDescarga}" target="_blank" style="color:#6f42c1;">${p.enlaceDescarga}</a>
        ` : `
          ${t('pedidos_num_seguimiento')} ${p.agenciaTransport ? `${p.agenciaTransport} · ` : ''}${p.numeroSeguimiento || '-'}
          ${p.urlRastreig ? `<a href="${p.urlRastreig.startsWith('http') ? p.urlRastreig : 'https://' + p.urlRastreig}" target="_blank" style="color:#c0618a; margin-left:1rem; font-size:0.85rem;">${t('pedidos_comprovar_seguimiento')}</a>` : ''}
        `}
      </div>
      <button onclick="eliminarPedido('${p._docId}', 'enviado')"
        style="background:#fff0f0; color:#dc3545; border:1px solid #dc3545; padding:0.6rem 1rem; border-radius:8px; cursor:pointer; font-size:0.9rem;">
        🗑️
      </button>
    </div>
  `;
  return `
    <div id="pedido-${p._docId}" style="background:white; border:1px solid ${tipus === 'pendiente' ? '#f0e0ea' : '#e0f0e0'}; border-radius:12px; padding:1.5rem; margin-bottom:1rem;">
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1rem; margin-bottom:1rem;">
        <div>
          <div style="font-size:0.8rem; color:#aaa; margin-bottom:4px;">${t('pedidos_referencia')}</div>
          <div style="font-weight:700; color:#c0618a;">#${refCurta}</div>
        </div>
        <div>
          <div style="font-size:0.8rem; color:#aaa; margin-bottom:4px;">${t('pedidos_fecha')}</div>
          <div>${fecha}</div>
        </div>
        <div>
          <div style="font-size:0.8rem; color:#aaa; margin-bottom:4px;">${t('pedidos_cliente')}</div>
          <div style="font-weight:500;">${escapeHtml(nombre)}</div>
          <div style="font-size:0.85rem; color:#888;">${escapeHtml(p.cliente?.email || '')}</div>
          <div style="font-size:0.85rem; color:#888;">${escapeHtml(p.cliente?.telefono || '')}</div>
        </div>
        <div>
          <div style="font-size:0.8rem; color:#aaa; margin-bottom:4px;">${t('pedidos_direccion')}</div>
          <div style="font-size:0.85rem;">${escapeHtml(direccion)}</div>
        </div>
        <div>
          <div style="font-size:0.8rem; color:#aaa; margin-bottom:4px;">${t('pedidos_productos')}</div>
          <div style="font-size:0.85rem;">${productosTexto}</div>
        </div>
        <div>
          <div style="font-size:0.8rem; color:#aaa; margin-bottom:4px;">${t('pedidos_total')}</div>
          <div style="font-weight:700; font-size:1.1rem;">${formatPrice(p.totals?.total || 0)}</div>
        </div>
        <div>
          <div style="font-size:0.8rem; color:#aaa; margin-bottom:4px;">${t('pedidos_cupon')}</div>
          <div style="font-size:0.85rem; font-weight:600; color:#28a745;">
            ${p.cuponGenerado ? p.cuponGenerado.codigo + ' (' + p.cuponGenerado.descuento + '%)' : t('pedidos_sin_cupon')}
          </div>
        </div>
      </div>
      ${seguimientoBlock}
    </div>
  `;
}

function previsualizarSeguimentCard(docId) {
  const tracking = document.getElementById(`tracking-${docId}`)?.value || '123456789';
  const agencia = document.getElementById(`agencia-${docId}`)?.value || '';
  const urlRastreig = document.getElementById(`url-rastreig-${docId}`)?.value || '';
  const preview = document.getElementById(`preview-seg-${docId}`);
  if (!preview) return;

  // Usar colors configurats a la secció Emails
  const colorCabecera = config.segColorCabecera || '#c0618a';
  const colorTitulos = config.segColorTitulos || '#c0618a';
  const nombreBotiga = config.segNombreBotiga || 'Tradenfy';
  const emailContacto = config.segEmailContacto || 'miuartclientes@gmail.com';
  const any = config.segAny || new Date().getFullYear();

  const rastrearBtn = urlRastreig
    ? `<div style="text-align:center; margin:20px 0;">
        <a href="${urlRastreig}${tracking}" target="_blank"
          style="background:${colorCabecera}; color:white; padding:12px 24px; text-decoration:none; border-radius:5px; display:inline-block; font-weight:bold;">
          📦 ${t('pedidos_rastrear')}${agencia ? ` ${t('pedidos_a')} ${agencia}` : ''}
        </a>
      </div>`
    : '';

  const html = `<!DOCTYPE html>
  <html><head><meta charset="UTF-8">
  <style>
    body { font-family:Arial,sans-serif; background:#f4f4f4; margin:0; padding:0; }
    .container { max-width:100%; background:white; border-radius:8px; overflow:hidden; }
    .header { background:${colorCabecera}; color:white; padding:16px; text-align:center; }
    .header h1 { margin:0; font-size:18px; }
    .content { padding:16px; }
    .tracking-box { background:#f8f9fa; border:2px dashed ${colorCabecera}; border-radius:8px; padding:12px; text-align:center; margin:12px 0; }
    .tracking-number { font-size:20px; font-weight:bold; color:${colorTitulos}; letter-spacing:2px; }
    .footer { background:#f8f9fa; padding:10px; text-align:center; font-size:11px; color:#666; }
  </style></head>
  <body>
    <div class="container">
      <div class="header"><h1>${t('emails_preview_seguimiento_titulo')}</h1></div>
      <div class="content">
        <p>${t('emails_preview_hola')} <strong>Joan García</strong>,</p>
        <p>${t('emails_preview_seguimiento_mensaje')}${agencia ? ` ${t('emails_preview_via')} <strong>${agencia}</strong>` : ''}.</p>
        <p><strong>${t('emails_preview_num_seguimiento')}:</strong></p>
        <div class="tracking-box">
          <div class="tracking-number">${tracking}</div>
        </div>
        ${rastrearBtn}
        <p>${t('emails_preview_contacto')} <a href="mailto:${emailContacto}" style="color:${colorTitulos};">${emailContacto}</a></p>
        <p>${t('emails_preview_gracias')} ${nombreBotiga}!</p>
      </div>
      <div class="footer">
        <p>© ${any} ${nombreBotiga} · ${emailContacto}</p>
      </div>
    </div>
  </body></html>`;

  preview.style.display = 'block';
  preview.style.padding = '0';
  preview.style.overflow = 'hidden';
  preview.innerHTML = `<iframe srcdoc="${html.replace(/"/g, '&quot;')}" style="width:100%; height:400px; border:none;"></iframe>`;
}

window.previsualizarSeguimentCard = previsualizarSeguimentCard;

/* ---------------------------
   ELIMINAR PEDIDO INDIVIDUAL
   --------------------------- */
async function eliminarPedido(docId, tipus) {
  if (!confirm(t('pedidos_confirmar_eliminar'))) return;
  try {
    await deleteDoc(doc(db, "comandas", docId));
    const pedidoEl = document.getElementById(`pedido-${docId}`);
    if (pedidoEl) pedidoEl.remove();
    alert(t('pedidos_eliminado'));
  } catch (e) {
    alert(t('pedidos_error_eliminar') + ' ' + e.message);
  }
}

/* ---------------------------
   ELIMINAR TOTS ELS PEDIDOS
   --------------------------- */
async function eliminarTodosPedidos(estat) {
  const msg = estat === 'pendiente' ? t('pedidos_confirmar_eliminar_todos_pendiente') : t('pedidos_confirmar_eliminar_todos_enviado');
  if (!confirm(msg)) return;
  try {
    const snap = await getDocs(query(collection(db, "comandas")));
    const batch = [];
    snap.forEach(d => {
      if (d.data().estado === estat) batch.push(deleteDoc(doc(db, "comandas", d.id)));
    });
    await Promise.all(batch);
    if (estat === 'pendiente') loadPedidos();
    else loadPedidosEnviados();
    alert(t('pedidos_eliminados'));
  } catch (e) {
    alert(t('pedidos_error_eliminar') + ' ' + e.message);
  }
}

async function getIdiomaComanda(docId) {
  try {
    const snap = await getDoc(doc(db, "comandas", docId));
    return snap.exists() ? (snap.data().idioma || 'es') : 'es';
  } catch(e) {
    return 'es';
  }
}

async function enviarSeguimiento(docId, email, nombre, referencia) {
  const trackingInput = document.getElementById(`tracking-${docId}`);
  const trackingNumber = trackingInput?.value.trim();
  if (!trackingNumber) {
    alert(t('pedidos_tracking_vacio'));
    return;
  }
  if (!confirm(`${t('pedidos_confirmar_tracking')} ${trackingNumber} ${t('pedidos_confirmar_tracking_2')} ${nombre}?`)) return;
  try {
    const response = await fetch('https://miuart-functions.miuart.workers.dev/enviar-seguimiento', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email, 
        client_name: nombre, 
        order_id: referencia, 
        tracking_number: trackingNumber,
        agencia: document.getElementById(`agencia-${docId}`)?.value.trim() || '',
        url_rastreig: document.getElementById(`url-rastreig-${docId}`)?.value.trim() || '',
        idioma: await getIdiomaComanda(docId) 
      })
    });
    if (!response.ok) throw new Error('Error al enviar el email');
    const urlRastreigVal = document.getElementById(`url-rastreig-${docId}`)?.value.trim() || '';
    await updateDoc(doc(db, "comandas", docId), { estado: "enviado", numeroSeguimiento: trackingNumber, agenciaTransport: document.getElementById(`agencia-${docId}`)?.value.trim() || '', urlRastreig: urlRastreigVal, fechaEnvio: new Date() });
    const pedidoEl = document.getElementById(`pedido-${docId}`);
    if (pedidoEl) pedidoEl.remove();
    const llista = document.getElementById("pedidos-lista");
    if (llista && llista.children.length === 0) {
      llista.innerHTML = `
        <div style="text-align:center; padding:3rem; color:#888;">
          <div style="font-size:3rem;">✅</div>
          <p>${t('pedidos_no_oberts')}</p>
        </div>
      `;
    }
    alert(`${t('pedidos_tracking_enviado')} ${email}`);
    location.hash = 'pedidos-enviados';

    await loadPedidosEnviados();
  } catch (e) {
    alert(`${t('pedidos_error_tracking')} ${e.message}`);
  }
}

function canviarTipusEnviament(docId, tipus) {
  const blocFisic = document.getElementById(`bloc-fisic-${docId}`);
  const blocDigital = document.getElementById(`bloc-digital-${docId}`);
  const btnFisic = document.getElementById(`btn-fisic-${docId}`);
  const btnDigital = document.getElementById(`btn-digital-${docId}`);
  if (tipus === 'fisic') {
    blocFisic.style.display = 'flex';
    blocDigital.style.display = 'none';
    btnFisic.style.background = '#c0618a';
    btnFisic.style.color = 'white';
    btnFisic.style.border = 'none';
    btnDigital.style.background = '#f0e0ea';
    btnDigital.style.color = '#c0618a';
    btnDigital.style.border = '1px solid #c0618a';
  } else {
    blocFisic.style.display = 'none';
    blocDigital.style.display = 'flex';
    btnDigital.style.background = '#6f42c1';
    btnDigital.style.color = 'white';
    btnDigital.style.border = 'none';
    btnFisic.style.background = '#f0e0ea';
    btnFisic.style.color = '#c0618a';
    btnFisic.style.border = '1px solid #c0618a';
  }
}

async function enviarEnlaceDescarga(docId, email, nombre, referencia) {
  const enlaceInput = document.getElementById(`enlace-${docId}`);
  const enlace = enlaceInput?.value.trim();
  if (!enlace) {
    alert(t('pedidos_enlace_vacio'));
    return;
  }
  if (!confirm(`${t('pedidos_confirmar_enlace')} ${nombre}?`)) return;
  try {
    const response = await fetch('https://miuart-functions.miuart.workers.dev/enviar-enlace-descarga', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email, 
        client_name: nombre, 
        order_id: referencia, 
        enlace_descarga: enlace,
        idioma: await getIdiomaComanda(docId)
      })
    });
    if (!response.ok) throw new Error('Error al enviar el email');
    await updateDoc(doc(db, "comandas", docId), { estado: "enviado", enlaceDescarga: enlace, fechaEnvio: new Date() });
    const pedidoEl = document.getElementById(`pedido-${docId}`);
    if (pedidoEl) pedidoEl.remove();
    const llista = document.getElementById("pedidos-lista");
    if (llista && llista.children.length === 0) {
      llista.innerHTML = `
        <div style="text-align:center; padding:3rem; color:#888;">
          <div style="font-size:3rem;">✅</div>
          <p>${t('pedidos_no_oberts')}</p>
        </div>
      `;
    }
    alert(`${t('pedidos_enlace_enviado')} ${email}`);
    location.hash = 'pedidos-enviados';
    await loadPedidosEnviados();
  } catch (e) {
    alert(`${t('pedidos_error_enlace')} ${e.message}`);
  }
}

window.enviarSeguimiento = enviarSeguimiento;
window.eliminarPedido = eliminarPedido;
window.eliminarTodosPedidos = eliminarTodosPedidos;
window.canviarTipusEnviament = canviarTipusEnviament;
window.enviarEnlaceDescarga = enviarEnlaceDescarga;

/* ---------------------------
   INTEGRACIONES
   --------------------------- */
async function loadIntegraciones() {
  const contenedor = document.getElementById("integraciones-contenido");
  if (!contenedor) return;
  contenedor.innerHTML = `<p>${t('editor_cargando')}</p>`;
  try {
    const configDoc = await getDoc(doc(db, "config", "integraciones"));
    const data = configDoc.exists() ? configDoc.data() : {};
    const mode = data.paypalMode || 'live';
    contenedor.innerHTML = `
      <div style="max-width:600px;">
        <div style="background:white; border:1px solid #f0e0ea; border-radius:12px; padding:1.5rem; margin-bottom:1.5rem;">
          <h3 style="color:#c0618a; margin-top:0;">💳 PayPal</h3>
          <div style="margin-bottom:1rem;">
            <label style="display:block; font-size:0.85rem; color:#666; margin-bottom:4px;">${t('integraciones_client_id_live')}</label>
            <input id="paypal-live-id" type="text" value="${data.paypalClientIdLive || ''}"
              style="width:100%; padding:0.6rem 1rem; border:1px solid #ddd; border-radius:8px; font-size:0.9rem; box-sizing:border-box;"
              placeholder="${t('integraciones_paypal_live')}">
          </div>
          <div style="margin-bottom:1.5rem;">
            <label style="display:block; font-size:0.85rem; color:#666; margin-bottom:4px;">${t('integraciones_client_id_sandbox')}</label>
            <input id="paypal-sandbox-id" type="text" value="${data.paypalClientIdSandbox || ''}"
              style="width:100%; padding:0.6rem 1rem; border:1px solid #ddd; border-radius:8px; font-size:0.9rem; box-sizing:border-box;"
              placeholder="${t('integraciones_paypal_sandbox')}">
          </div>
          <div style="margin-bottom:1.5rem;">
            <label style="display:block; font-size:0.85rem; color:#666; margin-bottom:8px;">${t('integraciones_modo')}</label>
            <div style="display:flex; gap:1rem;">
              <label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer;">
                <input type="radio" name="paypal-mode" value="live" ${mode === 'live' ? 'checked' : ''}>
                <span style="font-weight:${mode === 'live' ? '700' : '400'}; color:${mode === 'live' ? '#28a745' : '#666'};">🟢 ${t('integraciones_live')}</span>
              </label>
              <label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer;">
                <input type="radio" name="paypal-mode" value="sandbox" ${mode === 'sandbox' ? 'checked' : ''}>
                <span style="font-weight:${mode === 'sandbox' ? '700' : '400'}; color:${mode === 'sandbox' ? '#f0ad4e' : '#666'};">🟡 ${t('integraciones_sandbox')}</span>
              </label>
            </div>
          </div>
          <button onclick="guardarIntegraciones()"
            style="background:#38d1e5; color:white; border:none; padding:0.6rem 1.5rem; border-radius:8px; cursor:pointer; font-size:0.9rem;">
            ${t('integraciones_guardar')}
          </button>
          ${mode === 'sandbox' ? `
            <div style="background:#fff3cd; border:1px solid #ffc107; border-radius:8px; padding:1rem; margin-top:1rem;">
              ${t('integraciones_sandbox_aviso')}
            </div>
          ` : `
            <div style="background:#d4edda; border:1px solid #28a745; border-radius:8px; padding:1rem; margin-top:1rem;">
              ${t('integraciones_live_aviso')}
            </div>
          `}
        </div>
        <div style="background:white; border:1px solid #f0e0ea; border-radius:12px; padding:1.5rem; margin-bottom:1.5rem;">
          <h3 style="color:#c0618a; margin-top:0;">🖼️ Cloudinary</h3>
          <div style="margin-bottom:1rem;">
            <label style="display:block; font-size:0.85rem; color:#666; margin-bottom:4px;">Cloud Name</label>
            <input id="cloudinary-cloud-name" type="text" value="${data.cloudinaryCloudName || ''}"
              style="width:100%; padding:0.6rem 1rem; border:1px solid #ddd; border-radius:8px; font-size:0.9rem; box-sizing:border-box;"
              placeholder="Ex: dy2fzrqlf">
          </div>
          <div style="margin-bottom:1.5rem;">
            <label style="display:block; font-size:0.85rem; color:#666; margin-bottom:4px;">Upload Preset</label>
            <input id="cloudinary-upload-preset" type="text" value="${data.cloudinaryUploadPreset || ''}"
              style="width:100%; padding:0.6rem 1rem; border:1px solid #ddd; border-radius:8px; font-size:0.9rem; box-sizing:border-box;"
              placeholder="Ex: tradenfy_unsigned">
          </div>
          <button onclick="guardarIntegraciones()"
            style="background:var(--admin-primary); color:white; border:none; padding:0.6rem 1.5rem; border-radius:8px; cursor:pointer; font-size:0.9rem;">
            Guardar
          </button>
        </div>
      </div>
    `;
  } catch (e) {
    contenedor.innerHTML = `<p>Error: ${e.message}</p>`;
  }
}

async function guardarIntegraciones() {
  const liveId = document.getElementById('paypal-live-id')?.value.trim();
  const sandboxId = document.getElementById('paypal-sandbox-id')?.value.trim();
  const mode = document.querySelector('input[name="paypal-mode"]:checked')?.value;
  const cloudinaryCloudName = document.getElementById('cloudinary-cloud-name')?.value.trim();
  const cloudinaryUploadPreset = document.getElementById('cloudinary-upload-preset')?.value.trim();
  if (!liveId || !sandboxId) {
    alert(t('integraciones_error_ids'));
    return;
  }
  try {
    await setDoc(doc(db, "config", "integraciones"), {
      paypalClientIdLive: liveId,
      paypalClientIdSandbox: sandboxId,
      paypalMode: mode,
      cloudinaryCloudName: cloudinaryCloudName,
      cloudinaryUploadPreset: cloudinaryUploadPreset
    });
    alert(t('integraciones_guardado'));
    loadIntegraciones();
  } catch (e) {
    alert(t('integraciones_error') + ' ' + e.message);
  }
}

window.guardarIntegraciones = guardarIntegraciones;

/* ---------------------------
   EMAILS
   --------------------------- */
async function loadEmails() {
  const contenedor = document.getElementById("emails-contenido");
  if (!contenedor) return;
  contenedor.innerHTML = `<p>${t('editor_cargando')}</p>`;
  try {
    const emailsDoc = await getDoc(doc(db, "config", "emails"));
    const data = emailsDoc.exists() ? emailsDoc.data() : {};
    const conf = data.emailConfirmacion || {};
    const confAdmin = data.emailAdmin || {};
    const confSeg = data.emailSeguimiento || {};
    contenedor.innerHTML = `
      <div style="display:flex; gap:2rem; align-items:flex-start; flex-wrap:wrap;">
        <!-- FORMULARI -->
        <div style="flex:0 0 280px; background:white; border:1px solid #f0e0ea; border-radius:12px; padding:1.5rem;">
          <h3 style="color:#c0618a; margin-top:0;">✉️ ${t('emails_confirmacion')}</h3>

          <div style="margin-bottom:1rem;">
            <label style="display:block; font-size:0.85rem; color:#666; margin-bottom:4px;">${t('emails_nombre_botiga')}</label>
            <input id="email-nombre-botiga" type="text" value="${conf.nombreBotiga || 'Tradenfy'}"
              oninput="previsualizarEmail()"
              style="width:100%; padding:0.6rem 1rem; border:1px solid #ddd; border-radius:8px; font-size:0.9rem; box-sizing:border-box;">
          </div>

          <div style="margin-bottom:1rem;">
            <label style="display:block; font-size:0.85rem; color:#666; margin-bottom:4px;">${t('emails_color_cabecera')}</label>
            <input id="email-color-cabecera" type="color" value="${conf.colorCabecera || '#c0618a'}"
              oninput="previsualizarEmail()"
              style="width:60px; height:36px; border:none; border-radius:8px; cursor:pointer;">
          </div>

          <div style="margin-bottom:1rem;">
            <label style="display:block; font-size:0.85rem; color:#666; margin-bottom:4px;">${t('emails_color_titulos')}</label>
            <input id="email-color-titulos" type="color" value="${conf.colorTitulos || '#c0618a'}"
              oninput="previsualizarEmail()"
              style="width:60px; height:36px; border:none; border-radius:8px; cursor:pointer;">
          </div>

          <div style="margin-bottom:1.5rem;">
            <label style="display:block; font-size:0.85rem; color:#666; margin-bottom:4px;">${t('emails_color_total')}</label>
            <input id="email-color-total" type="color" value="${conf.colorTotal || '#c0618a'}"
              oninput="previsualizarEmail()"
              style="width:60px; height:36px; border:none; border-radius:8px; cursor:pointer;">
          </div>

          <div style="margin-bottom:1rem;">
            <label style="display:block; font-size:0.85rem; color:#666; margin-bottom:4px;">${t('emails_color_subtotal_text')}</label>
            <input id="email-color-subtotal-text" type="color" value="${conf.colorSubtotalText || '#d63384'}"
              oninput="previsualizarEmail()"
              style="width:60px; height:36px; border:none; border-radius:8px; cursor:pointer;">
          </div>

          <div style="margin-bottom:1rem;">
            <label style="display:block; font-size:0.85rem; color:#666; margin-bottom:4px;">${t('emails_color_subtotal_bg')}</label>
            <input id="email-color-subtotal-bg" type="color" value="${conf.colorSubtotalBg || '#fdf2f8'}"
              oninput="previsualizarEmail()"
              style="width:60px; height:36px; border:none; border-radius:8px; cursor:pointer;">
          </div>

          <div style="margin-bottom:1rem;">
            <label style="display:block; font-size:0.85rem; color:#666; margin-bottom:4px;">${t('emails_color_total_bg')}</label>
            <input id="email-color-total-bg" type="color" value="${conf.colorTotalBg || '#f1cede'}"
              oninput="previsualizarEmail()"
              style="width:60px; height:36px; border:none; border-radius:8px; cursor:pointer;">
          </div>

          <div style="margin-bottom:1rem;">
            <label style="display:block; font-size:0.85rem; color:#666; margin-bottom:4px;">${t('emails_email_contacto')}</label>
            <input id="email-contacto" type="email" value="${conf.emailContacto || 'miuartclientes@gmail.com'}"
              oninput="previsualizarEmail()"
              style="width:100%; padding:0.6rem 1rem; border:1px solid #ddd; border-radius:8px; font-size:0.9rem; box-sizing:border-box;">
          </div>

          <div style="margin-bottom:1.5rem;">
            <label style="display:block; font-size:0.85rem; color:#666; margin-bottom:4px;">${t('emails_any')}</label>
            <input id="email-any" type="number" value="${conf.any || new Date().getFullYear()}"
              oninput="previsualizarEmail()"
              style="width:100%; padding:0.6rem 1rem; border:1px solid #ddd; border-radius:8px; font-size:0.9rem; box-sizing:border-box;">
          </div>

          <button onclick="guardarEmails()"
            style="background:#38d1e5; color:white; border:none; padding:0.6rem 1.5rem; border-radius:8px; cursor:pointer; font-size:0.9rem;">
            ${t('emails_guardar')}
          </button>
          <span id="msg-emails" style="margin-left:1rem; color:#28a745; font-size:0.9rem;"></span>
        </div>

        <!-- PREVISUALITZACIÓ CLIENT -->
        <div style="flex:1; min-width:320px;">
          <h3 style="color:#c0618a; margin-top:0;">👁️ ${t('emails_preview')}</h3>
          <iframe id="email-preview" style="width:100%; height:700px; border:1px solid #f0e0ea; border-radius:12px;"></iframe>
        </div>
      </div>

      <!-- EMAIL ADMIN -->
      <div style="display:flex; gap:2rem; align-items:flex-start; flex-wrap:wrap; margin-top:2rem;">
        <!-- FORMULARI ADMIN -->
        <div style="flex:0 0 280px; background:white; border:1px solid #f0e0ea; border-radius:12px; padding:1.5rem;">
          <h3 style="color:#c0618a; margin-top:0;">🛒 ${t('emails_admin_titulo')}</h3>

          <div style="margin-bottom:1rem;">
            <label style="display:block; font-size:0.85rem; color:#666; margin-bottom:4px;">${t('emails_color_cabecera')}</label>
            <input id="admin-color-cabecera" type="color" value="${confAdmin.colorCabecera || '#c0618a'}"
              oninput="previsualizarEmailAdmin()"
              style="width:60px; height:36px; border:none; border-radius:8px; cursor:pointer;">
          </div>

          <div style="margin-bottom:1rem;">
            <label style="display:block; font-size:0.85rem; color:#666; margin-bottom:4px;">${t('emails_color_titulos')}</label>
            <input id="admin-color-titulos" type="color" value="${confAdmin.colorTitulos || '#c0618a'}"
              oninput="previsualizarEmailAdmin()"
              style="width:60px; height:36px; border:none; border-radius:8px; cursor:pointer;">
          </div>

          <div style="margin-bottom:1rem;">
            <label style="display:block; font-size:0.85rem; color:#666; margin-bottom:4px;">${t('emails_color_total')}</label>
            <input id="admin-color-total" type="color" value="${confAdmin.colorTotal || '#c0618a'}"
              oninput="previsualizarEmailAdmin()"
              style="width:60px; height:36px; border:none; border-radius:8px; cursor:pointer;">
          </div>

          <div style="margin-bottom:1rem;">
            <label style="display:block; font-size:0.85rem; color:#666; margin-bottom:4px;">${t('emails_color_subtotal_text')}</label>
            <input id="admin-color-subtotal-text" type="color" value="${confAdmin.colorSubtotalText || '#d63384'}"
              oninput="previsualizarEmailAdmin()"
              style="width:60px; height:36px; border:none; border-radius:8px; cursor:pointer;">
          </div>

          <div style="margin-bottom:1rem;">
            <label style="display:block; font-size:0.85rem; color:#666; margin-bottom:4px;">${t('emails_color_subtotal_bg')}</label>
            <input id="admin-color-subtotal-bg" type="color" value="${confAdmin.colorSubtotalBg || '#fdf2f8'}"
              oninput="previsualizarEmailAdmin()"
              style="width:60px; height:36px; border:none; border-radius:8px; cursor:pointer;">
          </div>

          <div style="margin-bottom:1rem;">
            <label style="display:block; font-size:0.85rem; color:#666; margin-bottom:4px;">${t('emails_color_total_bg')}</label>
            <input id="admin-color-total-bg-admin" type="color" value="${confAdmin.colorTotalBg || '#f1cede'}"
              oninput="previsualizarEmailAdmin()"
              style="width:60px; height:36px; border:none; border-radius:8px; cursor:pointer;">
          </div>

          <div style="margin-bottom:1rem;">
            <label style="display:block; font-size:0.85rem; color:#666; margin-bottom:4px;">${t('emails_color_botones')}</label>
            <input id="admin-color-botones" type="color" value="${confAdmin.colorBotones || '#c0618a'}"
              oninput="previsualizarEmailAdmin()"
              style="width:60px; height:36px; border:none; border-radius:8px; cursor:pointer;">
          </div>

          <div style="margin-bottom:1rem;">
            <label style="display:block; font-size:0.85rem; color:#666; margin-bottom:4px;">${t('emails_nombre_botiga')}</label>
            <input id="admin-nombre-botiga" type="text" value="${confAdmin.nombreBotiga || 'Tradenfy'}"
              oninput="previsualizarEmailAdmin()"
              style="width:100%; padding:0.6rem 1rem; border:1px solid #ddd; border-radius:8px; font-size:0.9rem; box-sizing:border-box;">
          </div>

          <div style="margin-bottom:1.5rem;">
            <label style="display:block; font-size:0.85rem; color:#666; margin-bottom:4px;">${t('emails_any')}</label>
            <input id="admin-any" type="number" value="${confAdmin.any || new Date().getFullYear()}"
              oninput="previsualizarEmailAdmin()"
              style="width:100%; padding:0.6rem 1rem; border:1px solid #ddd; border-radius:8px; font-size:0.9rem; box-sizing:border-box;">
          </div>

          <button onclick="guardarEmails()"
            style="background:#38d1e5; color:white; border:none; padding:0.6rem 1.5rem; border-radius:8px; cursor:pointer; font-size:0.9rem;">
            ${t('emails_guardar')}
          </button>
          <span id="msg-emails-admin" style="margin-left:1rem; color:#28a745; font-size:0.9rem;"></span>
        </div>

        <!-- PREVISUALITZACIÓ ADMIN -->
        <div style="flex:1; min-width:320px;">
          <h3 style="color:#c0618a; margin-top:0;">👁️ ${t('emails_preview')}</h3>
          <iframe id="email-preview-admin" style="width:100%; height:700px; border:1px solid #f0e0ea; border-radius:12px;"></iframe>
        </div>
      </div>

      <!-- EMAIL SEGUIMIENTO -->
      <div style="display:flex; gap:2rem; align-items:flex-start; flex-wrap:wrap; margin-top:2rem;">
        <div style="flex:0 0 280px; background:white; border:1px solid #f0e0ea; border-radius:12px; padding:1.5rem;">
          <h3 style="color:#c0618a; margin-top:0;">📦 ${t('emails_seguimiento_titulo')}</h3>

          <div style="margin-bottom:1rem;">
            <label style="display:block; font-size:0.85rem; color:#666; margin-bottom:4px;">${t('emails_color_cabecera')}</label>
            <input id="seg-color-cabecera" type="color" value="${confSeg.colorCabecera || '#c0618a'}"
              oninput="previsualizarEmailSeguimiento()"
              style="width:60px; height:36px; border:none; border-radius:8px; cursor:pointer;">
          </div>

          <div style="margin-bottom:1rem;">
            <label style="display:block; font-size:0.85rem; color:#666; margin-bottom:4px;">${t('emails_color_titulos')}</label>
            <input id="seg-color-titulos" type="color" value="${confSeg.colorTitulos || '#c0618a'}"
              oninput="previsualizarEmailSeguimiento()"
              style="width:60px; height:36px; border:none; border-radius:8px; cursor:pointer;">
          </div>

          <div style="margin-bottom:1rem;">
            <label style="display:block; font-size:0.85rem; color:#666; margin-bottom:4px;">${t('emails_nombre_botiga')}</label>
            <input id="seg-nombre-botiga" type="text" value="${confSeg.nombreBotiga || 'Tradenfy'}"
              oninput="previsualizarEmailSeguimiento()"
              style="width:100%; padding:0.6rem 1rem; border:1px solid #ddd; border-radius:8px; font-size:0.9rem; box-sizing:border-box;">
          </div>

          <div style="margin-bottom:1rem;">
            <label style="display:block; font-size:0.85rem; color:#666; margin-bottom:4px;">${t('emails_email_contacto')}</label>
            <input id="seg-email-contacto" type="text" value="${confSeg.emailContacto || 'miuartclientes@gmail.com'}"
              oninput="previsualizarEmailSeguimiento()"
              style="width:100%; padding:0.6rem 1rem; border:1px solid #ddd; border-radius:8px; font-size:0.9rem; box-sizing:border-box;">
          </div>

          <div style="margin-bottom:1.5rem;">
            <label style="display:block; font-size:0.85rem; color:#666; margin-bottom:4px;">${t('emails_any')}</label>
            <input id="seg-any" type="number" value="${confSeg.any || new Date().getFullYear()}"
              oninput="previsualizarEmailSeguimiento()"
              style="width:100%; padding:0.6rem 1rem; border:1px solid #ddd; border-radius:8px; font-size:0.9rem; box-sizing:border-box;">
          </div>

          <button onclick="guardarEmails()"
            style="background:#38d1e5; color:white; border:none; padding:0.6rem 1.5rem; border-radius:8px; cursor:pointer; font-size:0.9rem;">
            ${t('emails_guardar')}
          </button>
          <span id="msg-emails-seg" style="margin-left:1rem; color:#28a745; font-size:0.9rem;"></span>
        </div>

        <!-- PREVISUALITZACIÓ SEGUIMENT -->
        <div style="flex:1; min-width:320px;">
          <h3 style="color:#c0618a; margin-top:0;">👁️ ${t('emails_preview')}</h3>
          <iframe id="email-preview-seg" style="width:100%; height:500px; border:1px solid #f0e0ea; border-radius:12px;"></iframe>
        </div>
      </div>
    `;
    previsualizarEmail();
    previsualizarEmailAdmin();
    previsualizarEmailSeguimiento();
  } catch (e) {
    contenedor.innerHTML = `<p>Error: ${e.message}</p>`;
  }
}

async function loadEmailConfig() {
  try {
    const emailsDoc = await getDoc(doc(db, "config", "emails"));
    if (emailsDoc.exists()) {
      const data = emailsDoc.data();
      const conf = data.emailConfirmacion || {};
      config.emailColorSubtotalText = conf.colorSubtotalText || '#d63384';
      config.emailColorSubtotalBg = conf.colorSubtotalBg || '#fdf2f8';
      const confAdmin = data.emailAdmin || {};
      config.adminEmailColorSubtotalText = confAdmin.colorSubtotalText || '#d63384';
      config.adminEmailColorSubtotalBg = confAdmin.colorSubtotalBg || '#fdf2f8';
      const confSeg = data.emailSeguimiento || {};
      config.segColorCabecera = confSeg.colorCabecera || '#c0618a';
      config.segColorTitulos = confSeg.colorTitulos || '#c0618a';
      config.segNombreBotiga = confSeg.nombreBotiga || 'Tradenfy';
      config.segEmailContacto = confSeg.emailContacto || 'miuartclientes@gmail.com';
      config.segAny = confSeg.any || new Date().getFullYear();
    }
  } catch(e) {
    console.error('Error carregant config emails:', e);
  }
}

async function guardarEmails() {
  try {
    const emailConf = {
      nombreBotiga: document.getElementById('email-nombre-botiga').value.trim(),
      colorCabecera: document.getElementById('email-color-cabecera').value,
      colorTitulos: document.getElementById('email-color-titulos').value,
      colorTotal: document.getElementById('email-color-total').value,
      colorSubtotalText: document.getElementById('email-color-subtotal-text').value,
      colorSubtotalBg: document.getElementById('email-color-subtotal-bg').value,
      colorTotalBg: document.getElementById('email-color-total-bg').value,
      any: document.getElementById('email-any').value,
      emailContacto: document.getElementById('email-contacto').value.trim(),
    };
    const emailAdmin = {
      colorCabecera: document.getElementById('admin-color-cabecera').value,
      colorTitulos: document.getElementById('admin-color-titulos').value,
      colorTotal: document.getElementById('admin-color-total').value,
      colorSubtotalText: document.getElementById('admin-color-subtotal-text').value,
      colorSubtotalBg: document.getElementById('admin-color-subtotal-bg').value,
      colorTotalBg: document.getElementById('admin-color-total-bg-admin').value,
      colorBotones: document.getElementById('admin-color-botones').value,
      nombreBotiga: document.getElementById('admin-nombre-botiga').value.trim(),
      any: document.getElementById('admin-any').value,
    };
    const emailSeguimiento = {
      colorCabecera: document.getElementById('seg-color-cabecera').value,
      colorTitulos: document.getElementById('seg-color-titulos').value,
      nombreBotiga: document.getElementById('seg-nombre-botiga').value.trim(),
      emailContacto: document.getElementById('seg-email-contacto').value.trim(),
      any: document.getElementById('seg-any').value,
    };
    await setDoc(doc(db, "config", "emails"), { emailConfirmacion: emailConf, emailAdmin, emailSeguimiento }, { merge: true });
    document.getElementById('msg-emails').textContent = t('emails_guardado');
    document.getElementById('msg-emails-admin').textContent = t('emails_guardado');
    document.getElementById('msg-emails-seg').textContent = t('emails_guardado');
    setTimeout(() => {
      document.getElementById('msg-emails').textContent = '';
      document.getElementById('msg-emails-admin').textContent = '';
      document.getElementById('msg-emails-seg').textContent = '';
    }, 2000);
  } catch (e) {
    alert(t('emails_error') + ' ' + e.message);
  }
}

window.guardarEmails = guardarEmails;

function previsualizarEmail() {
  const colorCabecera = document.getElementById('email-color-cabecera')?.value || '#c0618a';
  const colorTitulos = document.getElementById('email-color-titulos')?.value || '#c0618a';
  const colorTotal = document.getElementById('email-color-total')?.value || '#c0618a';
  const nombreBotiga = document.getElementById('email-nombre-botiga')?.value || 'Tradenfy';
  const colorSubtotalText = document.getElementById('email-color-subtotal-text')?.value || '#d63384';
  const colorSubtotalBg = document.getElementById('email-color-subtotal-bg')?.value || '#fdf2f8';
  const colorTotalBg = document.getElementById('email-color-total-bg')?.value || '#f1cede';
  const any = document.getElementById('email-any')?.value || new Date().getFullYear();
  const emailContacto = document.getElementById('email-contacto')?.value || 'miuartclientes@gmail.com';

  const html = `<!DOCTYPE html>
  <html lang="es">
  <head>
    <meta charset="UTF-8"/>
    <style>
      body { font-family:Arial,sans-serif; background:#f4f4f4; margin:0; padding:0; }
      .container { max-width:560px; margin:20px auto; background:white; border-radius:8px; overflow:hidden; box-shadow:0 0 10px rgba(0,0,0,0.1); }
      .header { background:${colorCabecera}; color:white; padding:20px; text-align:center; }
      .header h1 { margin:0; font-size:22px; }
      .content { padding:25px; }
      .section { margin-bottom:20px; }
      .section h2 { color:${colorTitulos}; border-bottom:1px solid #eee; padding-bottom:8px; font-size:16px; }
      table { width:100%; border-collapse:collapse; margin:10px 0; font-size:13px; }
      th { background:#f8f9fa; text-align:left; padding:8px; font-weight:bold; }
      td { padding:8px; border-bottom:1px solid #eee; }
      .total-row { font-weight:bold; background:${colorTotalBg}; }
      .total-row td:last-child { color:${colorTotal}; }
      .footer { background:#f8f9fa; padding:12px; text-align:center; font-size:11px; color:#666; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>${t('email_confirmacion_cabecera')}</h1>
      </div>
      <div class="content">
        <p>${t('emails_preview_hola')} <strong>Joan García</strong>,</p>
        <p>${t('email_confirmacion_mensaje')}</p>
        <div class="section">
          <h2>${t('emails_preview_info_pedido')}</h2>
          <p><strong>${t('emails_preview_num_pedido')}:</strong> #ABC12345</p>
          <p><strong>${t('emails_preview_fecha')}:</strong> ${new Date().toLocaleDateString()}</p>
        </div>
        <div class="section">
          <h2>${t('emails_preview_datos_cliente')}</h2>
          <p><strong>Email:</strong> client@example.com</p>
          <p><strong>${t('emails_preview_telefono')}:</strong> 600 000 000</p>
        </div>
        <div class="section">
          <h2>${t('emails_preview_direccion')}</h2>
          <p>Carrer Exemple 123<br>08001 Barcelona<br>España</p>
        </div>
        <div class="section">
          <h2>${t('emails_preview_productos')}</h2>
          <table>
            <thead>
              <tr>
                <th>${t('email_confirmacion_producto')}</th>
                <th>${t('email_confirmacion_variante')}</th>
                <th style="text-align:center">${t('email_confirmacion_cant')}</th>
                <th style="text-align:right">${t('email_confirmacion_precio')}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="font-weight:600">${t('emails_preview_producto_ejemplo')}</td>
                <td>${t('emails_preview_talla_ejemplo') || 'M'}</td>
                <td style="text-align:center">2</td>
                <td style="text-align:right">29,99€</td>
              </tr>
              <tr style="background:${colorSubtotalBg};">
                <td colspan="3" style="text-align:right; font-weight:500; color:${colorSubtotalText};">Subtotal</td>
                <td style="text-align:right; font-weight:600; color:${colorSubtotalText};">59,98€</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="section">
          <h2>${t('emails_preview_resumen')}</h2>
          <table>
            <tr><td>Subtotal</td><td style="text-align:right">59,98€</td></tr>
            <tr><td>${t('emails_preview_envio')}</td><td style="text-align:right">5,00€</td></tr>
            <tr><td>IVA</td><td style="text-align:right">7,79€</td></tr>
            <tr class="total-row"><td><strong>Total</strong></td><td style="text-align:right"><strong>72,77€</strong></td></tr>
          </table>
        </div>
      </div>
      <div class="footer">
         <p>© ${any} ${nombreBotiga} | <a href="mailto:${emailContacto}" style="color:${colorTitulos};">${emailContacto}</a></p>
      </div>
    </div>
  </body>
  </html>`;

  const iframe = document.getElementById('email-preview');
  if (iframe) iframe.srcdoc = html;
}

function previsualizarEmailAdmin() {
  const colorCabecera = document.getElementById('admin-color-cabecera')?.value || '#c0618a';
  const colorTitulos = document.getElementById('admin-color-titulos')?.value || '#c0618a';
  const colorTotal = document.getElementById('admin-color-total')?.value || '#c0618a';
  const colorSubtotalText = document.getElementById('admin-color-subtotal-text')?.value || '#d63384';
  const colorSubtotalBg = document.getElementById('admin-color-subtotal-bg')?.value || '#fdf2f8';
  const colorTotalBg = document.getElementById('admin-color-total-bg-admin')?.value || '#f1cede';
  const colorBotones = document.getElementById('admin-color-botones')?.value || '#c0618a';
  const nombreBotiga = document.getElementById('admin-nombre-botiga')?.value || 'Tradenfy';
  const any = document.getElementById('admin-any')?.value || new Date().getFullYear();

  const html = `<!DOCTYPE html>
  <html lang="es">
  <head>
    <meta charset="UTF-8"/>
    <style>
      body { font-family:Arial,sans-serif; background:#f4f4f4; margin:0; padding:0; }
      .container { max-width:560px; margin:20px auto; background:white; border-radius:8px; overflow:hidden; box-shadow:0 0 10px rgba(0,0,0,0.1); }
      .header { background:${colorCabecera}; color:white; padding:20px; text-align:center; }
      .header h1 { margin:0; font-size:22px; }
      .content { padding:25px; }
      .section { margin-bottom:20px; }
      .section h2 { color:${colorTitulos}; border-bottom:1px solid #eee; padding-bottom:8px; font-size:16px; }
      table { width:100%; border-collapse:collapse; font-size:13px; }
      th { background:#f8f9fa; text-align:left; padding:8px; font-weight:bold; }
      td { padding:8px; border-bottom:1px solid #eee; }
      .total-row { font-weight:bold; background:${colorTotalBg}; }
      .urgent { background:#fff3cd; border:1px solid #ffeaa7; border-radius:8px; padding:15px; text-align:center; margin:20px 0; }
      .footer { background:#f8f9fa; padding:12px; text-align:center; font-size:11px; color:#666; }
      .action-btn { background:${colorBotones}; color:white; padding:8px 16px; text-decoration:none; border-radius:5px; display:inline-block; margin:5px; font-size:13px; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>${t('emails_admin_preview_titulo')}</h1>
        <p>Pedido #ABC12345 - ${new Date().toLocaleDateString()}</p>
      </div>
      <div class="content">
        <div class="urgent">
          <h3 style="margin:0; color:#856404;">📦 ${t('emails_admin_preview_atencion')}</h3>
          <p style="margin:8px 0;">${t('emails_admin_preview_atencion_msg')}</p>
        </div>
        <div class="section">
          <h2>${t('emails_preview_info_pedido')}</h2>
          <p><strong>${t('emails_preview_num_pedido')}:</strong> #ABC12345</p>
          <p><strong>${t('emails_preview_fecha')}:</strong> ${new Date().toLocaleDateString()}</p>
        </div>
        <div class="section">
          <h2>${t('emails_preview_datos_cliente')}</h2>
          <p><strong>Joan García</strong></p>
          <p>client@example.com</p>
          <p>600 000 000</p>
        </div>
        <div class="section">
          <h2>${t('emails_preview_direccion')}</h2>
          <p>Carrer Exemple 123<br>08001 Barcelona</p>
        </div>
        <div class="section">
          <h2>${t('emails_preview_productos')}</h2>
          <table>
            <thead>
              <tr>
                <th>${t('email_confirmacion_producto')}</th>
                <th>${t('email_confirmacion_variante')}</th>
                <th style="text-align:center">${t('email_confirmacion_cant')}</th>
                <th style="text-align:right">${t('email_confirmacion_precio')}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="font-weight:600">${t('emails_preview_producto_ejemplo')}</td>
                <td>${t('emails_preview_talla_ejemplo')}</td>
                <td style="text-align:center">2</td>
                <td style="text-align:right">29,99€</td>
              </tr>
              <tr style="background:${colorSubtotalBg};">
                <td colspan="3" style="text-align:right; font-weight:500; color:${colorSubtotalText};">Subtotal</td>
                <td style="text-align:right; font-weight:600; color:${colorSubtotalText};">59,98€</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="section">
          <h2>${t('emails_preview_resumen')}</h2>
          <table>
            <tr><td>Subtotal</td><td style="text-align:right">59,98€</td></tr>
            <tr><td>${t('emails_preview_envio')}</td><td style="text-align:right">5,00€</td></tr>
            <tr><td>IVA</td><td style="text-align:right">7,79€</td></tr>
            <tr class="total-row"><td><strong>Total</strong></td><td style="text-align:right; color:${colorTotal};"><strong>72,77€</strong></td></tr>
          </table>
        </div>
        <div style="text-align:center; margin:20px 0;">
          <a href="#" class="action-btn">📧 ${t('emails_admin_preview_contactar')}</a>
          <a href="#" class="action-btn">📞 ${t('emails_admin_preview_llamar')}</a>
        </div>
        <div class="footer">
          <p>© ${any} ${nombreBotiga}</p>
        </div>
      </div>
    </div>
  </body>
  </html>`;

  const iframe = document.getElementById('email-preview-admin');
  if (iframe) iframe.srcdoc = html;
}

window.previsualizarEmailAdmin = previsualizarEmailAdmin;

window.guardarEmails = guardarEmails;
window.previsualizarEmail = previsualizarEmail;

function previsualizarEmailSeguimiento() {
  const colorCabecera = document.getElementById('seg-color-cabecera')?.value || '#c0618a';
  const colorTitulos = document.getElementById('seg-color-titulos')?.value || '#c0618a';
  const nombreBotiga = document.getElementById('seg-nombre-botiga')?.value || 'Tradenfy';
  const any = document.getElementById('seg-any')?.value || new Date().getFullYear();
  const emailContacto = document.getElementById('seg-email-contacto')?.value || 'miuartclientes@gmail.com';
  const agencia = '#XXXX';
  const trackingNumber = '123456789';
  const html = `<!DOCTYPE html>
  <html><head><meta charset="UTF-8">
  <style>
    body { font-family:Arial,sans-serif; background:#f4f4f4; margin:0; padding:0; }
    .container { max-width:560px; margin:20px auto; background:white; border-radius:8px; overflow:hidden; box-shadow:0 0 10px rgba(0,0,0,0.1); }
    .header { background:${colorCabecera}; color:white; padding:20px; text-align:center; }
    .header h1 { margin:0; font-size:22px; }
    .content { padding:25px; }
    .tracking-box { background:#f8f9fa; border:2px dashed ${colorCabecera}; border-radius:8px; padding:15px; text-align:center; margin:20px 0; }
    .tracking-number { font-size:24px; font-weight:bold; color:${colorTitulos}; letter-spacing:2px; }
    .footer { background:#f8f9fa; padding:12px; text-align:center; font-size:11px; color:#666; }
  </style></head>
  <body>
    <div class="container">
      <div class="header">
        <h1>${t('emails_preview_seguimiento_titulo')}</h1>
      </div>
      <div class="content">
        <p>${t('emails_preview_hola')} <strong>Joan García</strong>,</p>
        <p>${t('emails_preview_seguimiento_mensaje')} ${t('emails_preview_via')} ${agencia}.</p>
        <p><strong>${t('emails_preview_num_seguimiento')}:</strong></p>
        <div class="tracking-box">
          <div class="tracking-number">${trackingNumber}</div>
        </div>
        <div style="text-align:center; margin:20px 0;">
          <a href="#" style="background:${colorCabecera}; color:white; padding:12px 24px; text-decoration:none; border-radius:5px; display:inline-block; font-weight:bold;">
            📦 ${t('emails_preview_rastrear')} ${t('emails_preview_en')} ${agencia}
          </a>
        </div>
        <p>${t('emails_preview_gracias')} ${nombreBotiga}!</p>
      </div>
      <div class="footer">
        <p>© ${any} ${nombreBotiga} · <a href="mailto:${emailContacto}" style="color:${colorTitulos};">${emailContacto}</a></p>
      </div>
    </div>
  </body></html>`;
  const iframe = document.getElementById('email-preview-seg');
  if (iframe) iframe.srcdoc = html;
}
window.previsualizarEmailSeguimiento = previsualizarEmailSeguimiento;

/* ---------------------------
   CUPONES
   --------------------------- */
async function loadCupones() {
  const contenedor = document.getElementById("cupones-contenido");
  if (!contenedor) return;
  contenedor.innerHTML = `<p>${t('cupones_cargando')}</p>`;
  try {
    const snap = await getDocs(query(collection(db, "cupones"), orderBy("fechaCreacion", "desc")));
    const cupones = [];
    snap.forEach(d => cupones.push({ _docId: d.id, ...d.data() }));
    if (cupones.length === 0) {
      contenedor.innerHTML = `
        <div style="text-align:center; padding:3rem; color:#888;">
          <div style="font-size:3rem;">🎟️</div>
          <p>${t('cupons_no_hi_ha')}</p>
        </div>
      `;
      return;
    }
    const ara = new Date();
    const total = cupones.length;
    const usados = cupones.filter(c => c.usado).length;
    const pendientes = cupones.filter(c => !c.usado && new Date(c.fechaCaducidad) > ara).length;
    const caducados = cupones.filter(c => !c.usado && new Date(c.fechaCaducidad) <= ara).length;
    contenedor.innerHTML = `
      <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap:1rem; margin-bottom:2rem;">
        <div style="background:#e6f6fa; border-radius:12px; padding:1.5rem; text-align:center;">
          <div style="font-size:2rem; font-weight:700; color:#c0618a;">${total}</div>
          <div style="color:#666; margin-top:0.5rem;">${t('cupones_total')}</div>
        </div>
        <div style="background:#fff3cd; border-radius:12px; padding:1.5rem; text-align:center;">
          <div style="font-size:2rem; font-weight:700; color:#f0ad4e;">${pendientes}</div>
          <div style="color:#666; margin-top:0.5rem;">${t('cupones_pendientes')}</div>
        </div>
        <div style="background:#d4edda; border-radius:12px; padding:1.5rem; text-align:center;">
          <div style="font-size:2rem; font-weight:700; color:#28a745;">${usados}</div>
          <div style="color:#666; margin-top:0.5rem;">${t('cupones_usados')}</div>
        </div>
        <div style="background:#f8d7da; border-radius:12px; padding:1.5rem; text-align:center;">
          <div style="font-size:2rem; font-weight:700; color:#dc3545;">${caducados}</div>
          <div style="color:#666; margin-top:0.5rem;">${t('cupones_caducados')}</div>
        </div>
      </div>
      <div style="display:flex; gap:0.5rem; margin-bottom:1.5rem; flex-wrap:wrap;">
        <button onclick="filtrarCupones('todos')" id="filtre-todos" style="background:#38d1e5; color:white; border:none; padding:0.5rem 1rem; border-radius:8px; cursor:pointer;">${t('cupones_todos')}</button>
        <button onclick="filtrarCupones('pendientes')" id="filtre-pendientes" style="background:#e6f6fa; color:#000000; border:1px solid #38d1e5; padding:0.5rem 1rem; border-radius:8px; cursor:pointer;">${t('cupones_pendientes')}</button>
        <button onclick="filtrarCupones('usados')" id="filtre-usados" style="background:#e6f6fa; color:#000000; border:1px solid #38d1e5; padding:0.5rem 1rem; border-radius:8px; cursor:pointer;">${t('cupones_usados')}</button>
        <button onclick="filtrarCupones('caducados')" id="filtre-caducados" style="background:#e6f6fa; color:#000000; border:1px solid #38d1e5; padding:0.5rem 1rem; border-radius:8px; cursor:pointer;">${t('cupones_caducados')}</button>
      </div>
      <div style="overflow-x:auto;">
        <table style="width:100%; border-collapse:collapse; font-size:0.9rem;">
          <thead>
            <tr style="background:#e6f6fa;">
              <th style="padding:10px 12px; text-align:left; border-bottom:2px solid #38d1e5;">${t('cupones_codigo')}</th>
              <th style="padding:10px 12px; text-align:left; border-bottom:2px solid #38d1e5;">${t('cupones_descuento')}</th>
              <th style="padding:10px 12px; text-align:left; border-bottom:2px solid #38d1e5;">${t('cupones_pedido_origen')}</th>
              <th style="padding:10px 12px; text-align:left; border-bottom:2px solid #38d1e5;">${t('cupones_pedido_canjeado')}</th>
              <th style="padding:10px 12px; text-align:left; border-bottom:2px solid #38d1e5;">${t('cupones_fecha_creacion')}</th>
              <th style="padding:10px 12px; text-align:left; border-bottom:2px solid #38d1e5;">${t('cupones_caducidad')}</th>
              <th style="padding:10px 12px; text-align:left; border-bottom:2px solid #38d1e5;">${t('cupones_estado')}</th>
            </tr>
          </thead>
          <tbody id="cupones-taula">
            ${cupones.map(c => renderCuponFila(c, ara)).join('')}
          </tbody>
        </table>
      </div>
    `;
    window._cupones = cupones;
    window._cuponesAra = ara;
  } catch (e) {
    contenedor.innerHTML = `<p>${t('cupones_error')} ${e.message}</p>`;
  }
}

function renderCuponFila(c, ara) {
  const caducado = new Date(c.fechaCaducidad) <= ara;
  const estado = c.usado ? t('cupones_estado_usado') : caducado ? t('cupones_estado_caducado') : t('cupones_estado_pendiente');
  const estadoColor = c.usado ? '#28a745' : caducado ? '#dc3545' : '#f0ad4e';
  const fechaCreacion = c.fechaCreacion ? new Date(c.fechaCreacion).toLocaleDateString('es-ES') : '-';
  const fechaCaducidad = c.fechaCaducidad ? new Date(c.fechaCaducidad).toLocaleDateString('es-ES') : '-';
  const comandaRef = c.comandaId ? '#' + c.comandaId.slice(-8).toUpperCase() : '-';
  const comandaCanjeado = c.comandaCanjeado ? '#' + c.comandaCanjeado.slice(-8).toUpperCase() : '-';
  return `
    <tr class="cupon-fila" data-estat="${c.usado ? 'usados' : caducado ? 'caducados' : 'pendientes'}" style="border-bottom:1px solid #38d1e5;">
      <td style="padding:10px 12px; font-weight:700; color:#c0618a; font-family:monospace;">${c.codigo}</td>
      <td style="padding:10px 12px;">${c.descuento}%</td>
      <td style="padding:10px 12px; color:#888;">${comandaRef}</td>
      <td style="padding:10px 12px; color:#888;">${comandaCanjeado}</td>
      <td style="padding:10px 12px;">${fechaCreacion}</td>
      <td style="padding:10px 12px;">${fechaCaducidad}</td>
      <td style="padding:10px 12px; font-weight:600; color:${estadoColor};">${estado}</td>
    </tr>
  `;
}

function filtrarCupones(filtre) {
  ['todos', 'pendientes', 'usados', 'caducados'].forEach(f => {
    const btn = document.getElementById(`filtre-${f}`);
    if (btn) {
      btn.style.background = f === filtre ? '#c0618a' : '#f8f0f5';
      btn.style.color = f === filtre ? 'white' : '#c0618a';
    }
  });

  const files = document.querySelectorAll('.cupon-fila');
  files.forEach(fila => {
    if (filtre === 'todos' || fila.dataset.estat === filtre) {
      fila.style.display = '';
    } else {
      fila.style.display = 'none';
    }
  });
}

window.filtrarCupones = filtrarCupones;

/* ---------------------------
   EDITOR DE COLORES
   --------------------------- */
async function loadColoresForm() {
  const ref = doc(db, "config", "general");
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const data = snap.data();
    const colorMap = {
      // Públic
      'color-bg': data.colorBg,
      'color-card': data.colorCard,
      'color-text': data.colorText,
      'color-muted': data.colorMuted,
      'color-accent': data.colorAccent,
      'color-accent-2': data.colorAccent2,
      'color-cart-counter-bg': data.colorCartCounterBg,
      'color-cart-counter-text': data.colorCartCounterText,
      'color-primary': data.colorPrimary,
      'color-primary-hover': data.colorPrimaryHover,
      'color-primary-text': data.colorPrimaryText,
      'color-secondary': data.colorSecondary,
      'color-secondary-hover': data.colorSecondaryHover,
      'color-secondary-text': data.colorSecondaryText,
      'color-cookie-btn': data.colorCookieBtn,
      'color-cookie-btn-hover': data.colorCookieBtnHover,
      'color-cookie-aceptar-text': data.colorCookieAceptarText,
      'color-cookie-configurar-bg': data.colorCookieConfigurarBg,
      'color-cookie-configurar-hover': data.colorCookieConfigurarHover,
      'color-cookie-configurar-border': data.colorCookieConfigurarBorder,
      'color-cookie-configurar-text': data.colorCookieConfigurarText,
      'color-cookie-rechazar-bg': data.colorCookieRechazarBg,
      'color-cookie-rechazar-hover': data.colorCookieRechazarHover,
      'color-cookie-rechazar-border': data.colorCookieRechazarBorder,
      'color-cookie-rechazar-text': data.colorCookieRechazarText,
      'color-cookie-guardar-bg': data.colorCookieGuardarBg,
      'color-cookie-guardar-hover': data.colorCookieGuardarHover,
      'color-cookie-guardar-text': data.colorCookieGuardarText,
      'color-cookie-cancelar-bg': data.colorCookieCancelarBg,
      'color-cookie-cancelar-hover': data.colorCookieCancelarHover,
      'color-cookie-cancelar-border': data.colorCookieCancelarBorder,
      'color-cookie-cancelar-text': data.colorCookieCancelarText,
      // Comuns
      'color-promo-slider': data.colorPromoSlider,
      'color-promo-slider-text': data.colorPromoSliderText,
      'color-header-top-bg': data.colorHeaderTopBg,
      'color-header-top-text': data.colorHeaderTopText,
      'color-header-bg': data.colorHeaderBg,
      'color-header-text': data.colorHeaderText,
      'color-footer-bg': data.colorFooterBg,
      'color-footer-text': data.colorFooterText,
      'color-nav-overlay-bg': data.colorNavOverlayBg,
      'color-nav-overlay-text': data.colorNavOverlayText,
    };

    const cssVarMap = {
      'color-bg': '--bg',
      'color-card': '--card',
      'color-text': '--text',
      'color-muted': '--muted',
      'color-accent': '--accent',
      'color-accent-2': '--accent-2',
      'color-cart-counter-bg': '--color-cart-counter-bg',
      'color-cart-counter-text': '--color-cart-counter-text',
      'color-primary': '--color-primary',
      'color-primary-hover': '--color-primary-hover',
      'color-primary-text': '--color-primary-text',
      'color-secondary': '--color-secondary',
      'color-secondary-hover': '--color-secondary-hover',
      'color-secondary-text': '--color-secondary-text',
      'color-cookie-btn': '--color-cookie-btn',
      'color-promo-slider': '--color-promo-slider',
      'color-promo-slider-text': '--color-promo-slider-text',
      'color-header-top-bg': '--color-header-top-bg',
      'color-header-top-text': '--color-header-top-text',
      'color-header-bg': '--color-header-bg',
      'color-header-text': '--color-header-text',
      'color-footer-bg': '--color-footer-bg',
      'color-footer-text': '--color-footer-text',
      'color-nav-overlay-bg': '--color-nav-overlay-bg',
      'color-nav-overlay-text': '--color-nav-overlay-text',
      'color-cookie-btn-hover': '--color-cookie-btn-hover',
      'color-cookie-aceptar-text': '--color-cookie-aceptar-text',
      'color-cookie-configurar-bg': '--color-cookie-configurar-bg',
      'color-cookie-configurar-hover': '--color-cookie-configurar-hover',
      'color-cookie-configurar-border': '--color-cookie-configurar-border',
      'color-cookie-configurar-text': '--color-cookie-configurar-text',
      'color-cookie-rechazar-bg': '--color-cookie-rechazar-bg',
      'color-cookie-rechazar-hover': '--color-cookie-rechazar-hover',
      'color-cookie-rechazar-border': '--color-cookie-rechazar-border',
      'color-cookie-rechazar-text': '--color-cookie-rechazar-text',
      'color-cookie-guardar-bg': '--color-cookie-guardar-bg',
      'color-cookie-guardar-hover': '--color-cookie-guardar-hover',
      'color-cookie-guardar-text': '--color-cookie-guardar-text',
      'color-cookie-cancelar-bg': '--color-cookie-cancelar-bg',
      'color-cookie-cancelar-hover': '--color-cookie-cancelar-hover',
      'color-cookie-cancelar-border': '--color-cookie-cancelar-border',
      'color-cookie-cancelar-text': '--color-cookie-cancelar-text',
    };

    Object.entries(colorMap).forEach(([inputId, value]) => {
      if (!value) return;
      const input = document.getElementById(inputId);
      if (!input) return;
      input.value = value;
      const swatch = input.closest('.color-row-item')?.querySelector('.color-swatch-box');
      const hexText = input.closest('.color-row-item')?.querySelector('.color-hex-value');
      if (swatch) swatch.style.background = value;
      if (hexText) hexText.textContent = value;
      const cssVar = cssVarMap[inputId];
      if (cssVar) {
        document.documentElement.style.setProperty(cssVar, value);
        input.addEventListener('input', () => {
          document.documentElement.style.setProperty(cssVar, input.value);
          if (swatch) swatch.style.background = input.value;
          if (hexText) hexText.textContent = input.value;
        });
      }
      input.closest('.color-row-item')?.addEventListener('click', () => input.click());
    });
  }
}

document.getElementById("guardar-colores")?.addEventListener("click", async () => {
  try {
    const newColors = {
      // Públic
      colorBg: document.getElementById("color-bg").value,
      colorCard: document.getElementById("color-card").value,
      colorText: document.getElementById("color-text").value,
      colorMuted: document.getElementById("color-muted").value,
      colorAccent: document.getElementById("color-accent").value,
      colorAccent2: document.getElementById("color-accent-2").value,
      colorCartCounterBg: document.getElementById("color-cart-counter-bg").value,
      colorCartCounterText: document.getElementById("color-cart-counter-text").value,
      colorPrimary: document.getElementById("color-primary").value,
      colorPrimaryHover: document.getElementById("color-primary-hover").value,
      colorPrimaryText: document.getElementById("color-primary-text").value,
      colorSecondary: document.getElementById("color-secondary").value,
      colorSecondaryHover: document.getElementById("color-secondary-hover").value,
      colorSecondaryText: document.getElementById("color-secondary-text").value,
      colorCookieBtn: document.getElementById("color-cookie-btn").value,
      colorCookieBtnHover: document.getElementById("color-cookie-btn-hover").value,
      colorCookieAceptarText: document.getElementById("color-cookie-aceptar-text").value,
      colorCookieConfigurarBg: document.getElementById("color-cookie-configurar-bg").value,
      colorCookieConfigurarHover: document.getElementById("color-cookie-configurar-hover").value,
      colorCookieConfigurarBorder: document.getElementById("color-cookie-configurar-border").value,
      colorCookieConfigurarText: document.getElementById("color-cookie-configurar-text").value,
      colorCookieRechazarBg: document.getElementById("color-cookie-rechazar-bg").value,
      colorCookieRechazarHover: document.getElementById("color-cookie-rechazar-hover").value,
      colorCookieRechazarBorder: document.getElementById("color-cookie-rechazar-border").value,
      colorCookieRechazarText: document.getElementById("color-cookie-rechazar-text").value,
      colorCookieGuardarBg: document.getElementById("color-cookie-guardar-bg").value,
      colorCookieGuardarHover: document.getElementById("color-cookie-guardar-hover").value,
      colorCookieGuardarText: document.getElementById("color-cookie-guardar-text").value,
      colorCookieCancelarBg: document.getElementById("color-cookie-cancelar-bg").value,
      colorCookieCancelarHover: document.getElementById("color-cookie-cancelar-hover").value,
      colorCookieCancelarBorder: document.getElementById("color-cookie-cancelar-border").value,
      colorCookieCancelarText: document.getElementById("color-cookie-cancelar-text").value,
      // Comuns
      colorPromoSlider: document.getElementById("color-promo-slider").value,
      colorPromoSliderText: document.getElementById("color-promo-slider-text").value,
      colorHeaderTopBg: document.getElementById("color-header-top-bg").value,
      colorHeaderTopText: document.getElementById("color-header-top-text").value,
      colorHeaderBg: document.getElementById("color-header-bg").value,
      colorHeaderText: document.getElementById("color-header-text").value,
      colorFooterBg: document.getElementById("color-footer-bg").value,
      colorFooterText: document.getElementById("color-footer-text").value,
      colorNavOverlayBg: document.getElementById("color-nav-overlay-bg").value,
      colorNavOverlayText: document.getElementById("color-nav-overlay-text").value,
    };
    await updateDoc(doc(db, "config", "general"), newColors);
    Object.entries({
      '--bg': newColors.colorBg,
      '--card': newColors.colorCard,
      '--text': newColors.colorText,
      '--muted': newColors.colorMuted,
      '--accent': newColors.colorAccent,
      '--accent-2': newColors.colorAccent2,
      '--color-cart-counter-bg': newColors.colorCartCounterBg,
      '--color-cart-counter-text': newColors.colorCartCounterText,
      '--color-primary': newColors.colorPrimary,
      '--color-primary-hover': newColors.colorPrimaryHover,
      '--color-primary-text': newColors.colorPrimaryText,
      '--color-secondary': newColors.colorSecondary,
      '--color-secondary-hover': newColors.colorSecondaryHover,
      '--color-secondary-text': newColors.colorSecondaryText,
      '--color-cookie-btn': newColors.colorCookieBtn,
      '--color-promo-slider': newColors.colorPromoSlider,
      '--color-promo-slider-text': newColors.colorPromoSliderText,
      '--color-header-top-bg': newColors.colorHeaderTopBg,
      '--color-header-top-text': newColors.colorHeaderTopText,
      '--color-header-bg': newColors.colorHeaderBg,
      '--color-header-text': newColors.colorHeaderText,
      '--color-footer-bg': newColors.colorFooterBg,
      '--color-footer-text': newColors.colorFooterText,
      '--color-nav-overlay-bg': newColors.colorNavOverlayBg,
      '--color-nav-overlay-text': newColors.colorNavOverlayText,
      '--color-cookie-btn-hover': newColors.colorCookieBtnHover,
      '--color-cookie-aceptar-text': newColors.colorCookieAceptarText,
      '--color-cookie-configurar-bg': newColors.colorCookieConfigurarBg,
      '--color-cookie-configurar-hover': newColors.colorCookieConfigurarHover,
      '--color-cookie-configurar-border': newColors.colorCookieConfigurarBorder,
      '--color-cookie-configurar-text': newColors.colorCookieConfigurarText,
      '--color-cookie-rechazar-bg': newColors.colorCookieRechazarBg,
      '--color-cookie-rechazar-hover': newColors.colorCookieRechazarHover,
      '--color-cookie-rechazar-border': newColors.colorCookieRechazarBorder,
      '--color-cookie-rechazar-text': newColors.colorCookieRechazarText,
      '--color-cookie-guardar-bg': newColors.colorCookieGuardarBg,
      '--color-cookie-guardar-hover': newColors.colorCookieGuardarHover,
      '--color-cookie-guardar-text': newColors.colorCookieGuardarText,
      '--color-cookie-cancelar-bg': newColors.colorCookieCancelarBg, 
      '--color-cookie-cancelar-hover': newColors.colorCookieCancelarHover,
      '--color-cookie-cancelar-border': newColors.colorCookieCancelarBorder,
      '--color-cookie-cancelar-text': newColors.colorCookieCancelarText,
    }).forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, value);
    });
    document.getElementById("msg-colores").textContent = t('colores_guardados');
    setTimeout(() => document.getElementById("msg-colores").textContent = "", 2000);
  } catch (err) {
    console.error("Error guardando colores:", err);
    alert("Error al guardar los colores: " + err.message);
  }
});

// ===========================
// NEWSLETTER EDITOR DE BLOCS
// ===========================
let nlBlocks = [];
let nlBlockCounter = 0;
let nlGlobalConfig = { bg: '#f4f4f4' };

function nlUpdateGlobal(key, value) {
  nlGlobalConfig[key] = value;
  document.getElementById('nl-global-bg').value = value;
  document.getElementById('nl-global-bg-text').value = value;
  nlUpdatePreview();
}

function nlAddBlock(tipus) {
  const id = ++nlBlockCounter;
  nlBlocks.push({ id, tipus, data: nlGetDefaults(tipus), collapsed: false });
  nlRenderBlocks();
  nlUpdatePreview();
}

function nlGetDefaults(tipus) {
  switch(tipus) {
    case 'cabecera': return { titol: 'Novedades de este mes', subtitol: 'Las últimas incorporaciones', bgColor: '#e9acc8', textColor: '#ffffff', imgUrl: '' };
    case 'texto': return { titol: 'Título de sección', titolColor: '#c0618a', text: 'Escribe aquí el texto...' };
    case 'imagen': return { imgUrl: '', alt: '' };
    case 'imagen-texto': return { imgUrl: '', titol: 'Título', text: 'Texto descriptivo...', imgPosition: 'left' };
    case 'boton': return { text: 'Ver tienda', url: '#', bgColor: '#c0618a', textColor: '#ffffff' };
    case 'productos': return {
      titol: 'Productos destacados', titolColor: '#c0618a', cardColor: '#f8f0f5', preuColor: '#c0618a',
      productes: [
        { nom: 'Producto 1', preu: '19,99 €', imgUrl: '', etiqueta: false, etiquetaText: 'Nuevo', etiquetaBg: '#c0618a', etiquetaTextColor: '#ffffff' },
        { nom: 'Producto 2', preu: '24,99 €', imgUrl: '', etiqueta: false, etiquetaText: 'Oferta', etiquetaBg: '#e9acc8', etiquetaTextColor: '#ffffff' }
      ]
    };
    case 'descuento': return { titol: 'Oferta especial', text: 'Usa este código para obtener tu descuento', codigo: 'TRADENFY10', descuento: '10', bgColor: '#fdf2f8', accentColor: '#c0618a' };
    case 'redes': return {
      instagram: true, instagramUrl: '',
      facebook: false, facebookUrl: '',
      tiktok: false, tiktokUrl: '',
      youtube: false, youtubeUrl: '',
      twitter: false, twitterUrl: '',
      pinterest: false, pinterestUrl: '',
      color: '#c0618a'
    };
    case 'firma': return { imgUrl: '', imgShape: 'round', titol: 'Nombre del autor', titolColor: '#c0618a', text: 'Escribe aquí tu mensaje...', mostrarCometes: true, signaturaUrl: '' };
    case 'separador': return { color: '#eeeeee', height: '1' };
    case 'footer': return { text: '© 2026 Mi Tienda. Todos los derechos reservados.', accentColor: '#c0618a' };
    default: return {};
  }
}

function nlMoveBlock(id, dir) {
  const idx = nlBlocks.findIndex(b => b.id === id);
  if (dir === 'up' && idx > 0) [nlBlocks[idx], nlBlocks[idx-1]] = [nlBlocks[idx-1], nlBlocks[idx]];
  else if (dir === 'down' && idx < nlBlocks.length-1) [nlBlocks[idx], nlBlocks[idx+1]] = [nlBlocks[idx+1], nlBlocks[idx]];
  nlRenderBlocks();
  nlUpdatePreview();
}

function nlDeleteBlock(id) {
  nlBlocks = nlBlocks.filter(b => b.id !== id);
  nlRenderBlocks();
  nlUpdatePreview();
}

function nlToggleBlock(id) {
  const b = nlBlocks.find(b => b.id === id);
  if (b) b.collapsed = !b.collapsed;
  nlRenderBlocks();
}

function nlUpdateField(id, field, value) {
  const b = nlBlocks.find(b => b.id === id);
  if (b) b.data[field] = value;
  nlUpdatePreview();
}

function nlUpdateProducteField(blockId, prodIdx, field, value) {
  const b = nlBlocks.find(b => b.id === blockId);
  if (b && b.data.productes?.[prodIdx]) b.data.productes[prodIdx][field] = value;
  nlUpdatePreview();
}

function nlEliminarProducte(blockId, prodIdx) {
  const b = nlBlocks.find(b => b.id === blockId);
  if (b && b.data.productes.length > 1) {
    b.data.productes.splice(prodIdx, 1);
    nlRenderBlocks();
    nlUpdatePreview();
  }
}

function nlAfegirProducte(blockId) {
  const b = nlBlocks.find(b => b.id === blockId);
  if (b) {
    b.data.productes.push({ nom: 'Nuevo producto', preu: '0,00 €', imgUrl: '', etiqueta: false, etiquetaText: 'Nuevo', etiquetaBg: '#c0618a', etiquetaTextColor: '#ffffff' });
    nlRenderBlocks();
    nlUpdatePreview();
  }
}

function nlSubirImagen(blockId, field) {
  abrirCloudinaryWidget((url) => {
    nlUpdateField(blockId, field, url);
    nlRenderBlocks();
  });
}

function nlSubirImagenProducte(blockId, prodIdx) {
  abrirCloudinaryWidget((url) => {
    nlUpdateProducteField(blockId, prodIdx, 'imgUrl', url);
    nlRenderBlocks();
  });
}

function nlRenderBlocks() {
  const list = document.getElementById('nl-blocks-list');
  if (!list) return;
  if (nlBlocks.length === 0) {
    list.innerHTML = `<div id="nl-empty-state" style="text-align:center; padding:2rem; color:var(--muted); border:1px dashed rgba(0,0,0,0.15); border-radius:10px;"><div style="font-size:2rem;">✉️</div><p style="font-size:0.85rem; margin-top:0.5rem;">${t('nl_empty')}</p></div>`;
    return;
  }
  const blockLabels = {
    'cabecera': t('nl_bloque_cabecera'),
    'texto': t('nl_bloque_texto'),
    'imagen': t('nl_bloque_imagen'),
    'imagen-texto': t('nl_bloque_img_texto_label'),
    'boton': t('nl_bloque_boton'),
    'productos': t('nl_bloque_productos'),
    'descuento': t('nl_bloque_descuento'),
    'redes': t('nl_bloque_redes_label'),
    'firma': t('nl_bloque_firma'),
    'separador': t('nl_bloque_separador'),
    'footer': t('nl_bloque_footer')
  };
  list.innerHTML = nlBlocks.map((block, idx) => `
    <div style="background:var(--card); border:1px solid rgba(0,0,0,0.08); border-radius:8px; margin-bottom:0.5rem; overflow:hidden;">
      <div style="display:flex; align-items:center; justify-content:space-between; padding:0.5rem 0.65rem; background:var(--bg); border-bottom:1px solid rgba(0,0,0,0.06); cursor:pointer;" onclick="nlToggleBlock(${block.id})">
        <span style="font-size:0.68rem; background:var(--accent-2); color:white; padding:2px 8px; border-radius:20px; font-weight:600; opacity:0.8;">${blockLabels[block.tipus]}</span>
        <div style="display:flex; gap:0.25rem;" onclick="event.stopPropagation()">
          <button onclick="nlMoveBlock(${block.id},'up')" ${idx===0?'disabled':''} style="background:none; border:1px solid rgba(0,0,0,0.15); width:22px; height:22px; border-radius:4px; cursor:pointer; font-size:0.7rem; color:var(--muted);">↑</button>
          <button onclick="nlMoveBlock(${block.id},'down')" ${idx===nlBlocks.length-1?'disabled':''} style="background:none; border:1px solid rgba(0,0,0,0.15); width:22px; height:22px; border-radius:4px; cursor:pointer; font-size:0.7rem; color:var(--muted);">↓</button>
          <button onclick="nlDeleteBlock(${block.id})" style="background:none; border:1px solid #ffcdd2; width:22px; height:22px; border-radius:4px; cursor:pointer; font-size:0.7rem; color:#e53935;">✕</button>
        </div>
      </div>
      <div style="padding:0.65rem; ${block.collapsed?'display:none;':''}">
        ${nlRenderBlockForm(block)}
      </div>
    </div>
  `).join('');
}

function nlRenderBlockForm(block) {
  const d = block.data;
  const id = block.id;
  const inp = (field, val, type='text', extra='') => `<input type="${type}" value="${val||''}" oninput="nlUpdateField(${id},'${field}',this.value)" style="width:100%; padding:0.35rem 0.55rem; border:1px solid rgba(0,0,0,0.15); border-radius:5px; font-size:0.78rem; margin-bottom:0.35rem;" ${extra}>`;
  const lbl = (text) => `<div style="font-size:0.72rem; color:var(--muted); font-weight:600; margin-top:0.35rem; margin-bottom:2px;">${text}</div>`;
  const colorRow = (field, val) => `<div style="display:flex; gap:0.4rem; align-items:center; margin-bottom:0.35rem;"><input type="color" value="${val||'#000000'}" oninput="nlUpdateField(${id},'${field}',this.value)" style="width:32px; height:28px; padding:2px; border:1px solid rgba(0,0,0,0.15); border-radius:4px; cursor:pointer;"><input type="text" value="${val||''}" oninput="nlUpdateField(${id},'${field}',this.value)" style="flex:1; padding:0.35rem 0.55rem; border:1px solid rgba(0,0,0,0.15); border-radius:5px; font-size:0.78rem;"></div>`;
  const uploadBtn = (field, esFirma=false) => `<button onclick="nlSubirImagen(${id},'${field}')" style="background:var(--bg); border:1px solid rgba(0,0,0,0.15); color:var(--accent-2); padding:0.3rem 0.6rem; border-radius:5px; cursor:pointer; font-size:0.72rem; width:100%; margin-bottom:0.35rem;">${esFirma ? t('nl_subir_firma') : t('nl_subir_imagen')}</button>`;

  switch(block.tipus) {
    case 'cabecera': return `
      ${lbl(t('editor_titulo'))}${inp('titol', d.titol)}
      ${lbl(t('detalle_reseñas').replace('Reseñas','') || 'Subtítulo')}
      ${lbl('Subtítulo')}${inp('subtitol', d.subtitol)}
      ${lbl(t('editor_imagen'))}${inp('imgUrl', d.imgUrl, 'text', 'placeholder="URL..."')}${uploadBtn('imgUrl')}
      ${lbl(t('colores_fondo'))}${colorRow('bgColor', d.bgColor)}
      ${lbl(t('colores_texto_principal'))}${colorRow('textColor', d.textColor)}
    `;
    case 'texto': return `
      ${lbl(t('editor_titulo'))}${inp('titol', d.titol)}
      ${lbl(t('colores_accent'))}${colorRow('titolColor', d.titolColor)}
      ${lbl(t('editor_texto'))}<textarea oninput="nlUpdateField(${id},'text',this.value)" style="width:100%; padding:0.35rem 0.55rem; border:1px solid rgba(0,0,0,0.15); border-radius:5px; font-size:0.78rem; min-height:55px; resize:vertical; margin-bottom:0.35rem;">${d.text||''}</textarea>
    `;
    case 'imagen': return `
      ${lbl(t('editor_url_imagen'))}${inp('imgUrl', d.imgUrl, 'text', 'placeholder="URL..."')}${uploadBtn('imgUrl')}
      ${lbl(t('editor_imagen'))}${inp('alt', d.alt)}
    `;
    case 'imagen-texto': return `
      ${lbl(t('editor_url_imagen'))}${inp('imgUrl', d.imgUrl, 'text', 'placeholder="URL..."')}${uploadBtn('imgUrl')}
      ${lbl(t('nl_posicion'))}<select onchange="nlUpdateField(${id},'imgPosition',this.value)" style="width:100%; padding:0.35rem; border:1px solid rgba(0,0,0,0.15); border-radius:5px; font-size:0.78rem; margin-bottom:0.35rem;">
        <option value="left" ${d.imgPosition==='left'?'selected':''}>${t('nl_posicion_izq')}</option>
        <option value="right" ${d.imgPosition==='right'?'selected':''}>${t('nl_posicion_der')}</option>
      </select>
      ${lbl(t('editor_titulo'))}${inp('titol', d.titol)}
      ${lbl(t('editor_texto'))}<textarea oninput="nlUpdateField(${id},'text',this.value)" style="width:100%; padding:0.35rem 0.55rem; border:1px solid rgba(0,0,0,0.15); border-radius:5px; font-size:0.78rem; min-height:55px; resize:vertical; margin-bottom:0.35rem;">${d.text||''}</textarea>
    `;
    case 'boton': return `
      ${lbl(t('editor_titulo'))}${inp('text', d.text)}
      ${lbl(t('editor_url_imagen').replace('imagen','destino') || 'URL destino')}${inp('url', d.url, 'url')}
      ${lbl(t('colores_primary'))}${colorRow('bgColor', d.bgColor)}
      ${lbl(t('colores_texto_principal'))}${colorRow('textColor', d.textColor)}
    `;
    case 'productos': return `
      ${lbl(t('editor_titulo_seccion'))}${inp('titol', d.titol)}
      ${lbl(t('colores_accent'))}${colorRow('titolColor', d.titolColor)}
      ${lbl(t('colores_tarjetas'))}${colorRow('cardColor', d.cardColor)}
      ${lbl(t('colores_accent2'))}${colorRow('preuColor', d.preuColor)}
      <div style="font-size:0.68rem; color:var(--accent-2); font-weight:700; text-transform:uppercase; margin:0.5rem 0 0.25rem; padding-bottom:0.2rem; border-bottom:1px solid rgba(0,0,0,0.08);">${t('nl_bloque_productos')}</div>
      ${d.productes.map((p, i) => `
        <div style="border:1px solid rgba(0,0,0,0.08); border-radius:6px; padding:0.5rem; margin-bottom:0.4rem; background:var(--bg);">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.3rem;">
            <span style="font-size:0.7rem; color:var(--muted); font-weight:600;">${t('nl_producto')} ${i+1}</span>
            <button onclick="nlEliminarProducte(${id},${i})" style="background:none; border:1px solid #ffcdd2; color:#e53935; width:20px; height:20px; border-radius:4px; cursor:pointer; font-size:0.65rem;">✕</button>
          </div>
          ${p.imgUrl ? `<img src="${p.imgUrl}" style="width:50px; height:50px; object-fit:cover; border-radius:5px; display:block; margin-bottom:0.3rem;">` : ''}
          <button onclick="nlSubirImagenProducte(${id},${i})" style="background:var(--bg); border:1px solid rgba(0,0,0,0.15); color:var(--accent-2); padding:0.25rem 0.5rem; border-radius:5px; cursor:pointer; font-size:0.7rem; width:100%; margin-bottom:0.3rem;">${t('nl_subir_imagen')}</button>
          <input type="text" value="${p.nom}" oninput="nlUpdateProducteField(${id},${i},'nom',this.value)" placeholder="${t('producto_nombre')}" style="width:100%; padding:0.3rem 0.5rem; border:1px solid rgba(0,0,0,0.15); border-radius:5px; font-size:0.75rem; margin-bottom:0.25rem;">
          <input type="text" value="${p.preu}" oninput="nlUpdateProducteField(${id},${i},'preu',this.value)" placeholder="${t('producto_precio')}" style="width:100%; padding:0.3rem 0.5rem; border:1px solid rgba(0,0,0,0.15); border-radius:5px; font-size:0.75rem; margin-bottom:0.25rem;">
          <div style="display:flex; align-items:center; gap:0.4rem;">
            <input type="checkbox" ${p.etiqueta?'checked':''} onchange="nlUpdateProducteField(${id},${i},'etiqueta',this.checked)" style="width:auto; margin:0;">
            <span style="font-size:0.72rem; color:var(--muted);">${t('editor_sec_visible')}:</span>
            <input type="text" value="${p.etiquetaText}" oninput="nlUpdateProducteField(${id},${i},'etiquetaText',this.value)" style="flex:1; padding:0.25rem 0.4rem; border:1px solid rgba(0,0,0,0.15); border-radius:4px; font-size:0.72rem;">
            <input type="color" value="${p.etiquetaBg}" oninput="nlUpdateProducteField(${id},${i},'etiquetaBg',this.value)" title="${t('colores_fondo')}" style="width:26px; height:22px; padding:1px; border:1px solid rgba(0,0,0,0.15); border-radius:3px; cursor:pointer;">
            <input type="color" value="${p.etiquetaTextColor}" oninput="nlUpdateProducteField(${id},${i},'etiquetaTextColor',this.value)" title="${t('colores_texto_principal')}" style="width:26px; height:22px; padding:1px; border:1px solid rgba(0,0,0,0.15); border-radius:3px; cursor:pointer;">
          </div>
        </div>
      `).join('')}
      <button onclick="nlAfegirProducte(${id})" style="background:#f0f8f0; border:1px solid #b2dfdb; color:#2e7d32; padding:0.3rem 0.6rem; border-radius:5px; cursor:pointer; font-size:0.72rem; width:100%; margin-top:0.25rem;">${t('nl_añadir_producto')}</button>
    `;
    case 'descuento': return `
      ${lbl(t('editor_titulo'))}${inp('titol', d.titol)}
      ${lbl(t('editor_texto'))}${inp('text', d.text)}
      ${lbl(t('carrito_codigo_descuento'))}${inp('codigo', d.codigo)}
      ${lbl(t('config_porcentaje'))}${inp('descuento', d.descuento, 'number')}
      ${lbl(t('colores_fondo'))}${colorRow('bgColor', d.bgColor)}
      ${lbl(t('colores_accent'))}${colorRow('accentColor', d.accentColor)}
    `;
    case 'redes': return `
      ${[['instagram','Instagram'],['facebook','Facebook'],['tiktok','TikTok'],['youtube','YouTube'],['twitter','Twitter/X'],['pinterest','Pinterest']].map(([key,nom]) => `
        <div style="display:flex; align-items:center; gap:0.4rem; margin-bottom:0.35rem;">
          <input type="checkbox" ${d[key]?'checked':''} onchange="nlUpdateField(${id},'${key}',this.checked)" style="width:auto; margin:0;">
          <span style="font-size:0.75rem; width:65px;">${nom}</span>
          <input type="url" value="${d[key+'Url']||''}" oninput="nlUpdateField(${id},'${key}Url',this.value)" placeholder="https://..." style="flex:1; padding:0.28rem 0.5rem; border:1px solid rgba(0,0,0,0.15); border-radius:4px; font-size:0.72rem;">
        </div>
      `).join('')}
      ${lbl(t('colores_nav_text'))}${colorRow('color', d.color)}
    `;
    case 'firma': return `
      ${lbl(t('editor_imagen'))}${uploadBtn('imgUrl')}
      ${d.imgUrl ? `<img src="${d.imgUrl}" style="width:55px; height:55px; object-fit:cover; border-radius:${d.imgShape==='round'?'50%':'6px'}; display:block; margin-bottom:0.35rem; border:1px solid rgba(0,0,0,0.1);">` : ''}
      ${lbl(t('nl_forma'))}<select onchange="nlUpdateField(${id},'imgShape',this.value)" style="width:100%; padding:0.35rem; border:1px solid rgba(0,0,0,0.15); border-radius:5px; font-size:0.78rem; margin-bottom:0.35rem;">
        <option value="round" ${d.imgShape==='round'?'selected':''}>${t('nl_forma_redonda')}</option>
        <option value="square" ${d.imgShape==='square'?'selected':''}>${t('nl_forma_cuadrada')}</option>
      </select>
      ${lbl(t('editor_titulo'))}${inp('titol', d.titol)}
      ${lbl(t('colores_accent'))}${colorRow('titolColor', d.titolColor)}
      ${lbl(t('editor_texto'))}<textarea oninput="nlUpdateField(${id},'text',this.value)" style="width:100%; padding:0.35rem 0.55rem; border:1px solid rgba(0,0,0,0.15); border-radius:5px; font-size:0.78rem; min-height:55px; resize:vertical; margin-bottom:0.35rem;">${d.text||''}</textarea>
      <div style="display:flex; align-items:center; gap:0.4rem; margin-bottom:0.35rem;">
        <input type="checkbox" ${d.mostrarCometes?'checked':''} onchange="nlUpdateField(${id},'mostrarCometes',this.checked)" style="width:auto; margin:0;">
        <span style="font-size:0.75rem;">${t('nl_mostrar_comillas')}</span>
      </div>
      ${lbl(t('nl_bloque_firma'))}${uploadBtn('signaturaUrl', true)}
      ${d.signaturaUrl ? `<img src="${d.signaturaUrl}" style="max-height:35px; max-width:110px; display:block; margin-bottom:0.35rem; border:1px solid rgba(0,0,0,0.1); border-radius:4px;">` : ''}
    `;
    case 'separador': return `
      ${lbl(t('colores_fondo'))}${colorRow('color', d.color)}
      ${lbl('Grosor (px)')}${inp('height', d.height, 'number')}
    `;
    case 'footer': return `
      ${lbl(t('nl_text_copyright'))}${inp('text', d.text)}
      ${lbl(t('nl_color_enlace'))}${colorRow('accentColor', d.accentColor)}
    `;
    default: return '';
  }
}

function nlUpdatePreview() {
  const preview = document.getElementById('newsletter-preview-content');
  if (!preview) return;
  const wrapBg = nlGlobalConfig.bg || '#f4f4f4';
  document.getElementById('newsletter-preview').style.background = wrapBg;
  if (nlBlocks.length === 0) {
   preview.innerHTML = `<div style="text-align:center; padding:3rem; color:#aaa;"><div style="font-size:2rem;">✉️</div><p style="font-size:0.85rem; margin-top:0.5rem;">${t('nl_preview_empty')}</p></div>`;
    return;
  }
  preview.innerHTML = `<div style="font-family:Arial,sans-serif; max-width:500px; margin:0 auto; background:white; border-radius:8px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.08);">${nlBlocks.map(b => nlRenderBlockPreview(b)).join('')}</div>`;
}

function nlRenderBlockPreview(block) {
  const d = block.data;
  switch(block.tipus) {
    case 'cabecera':
      return `<div style="${d.imgUrl?`background:url('${d.imgUrl}') center/cover;`:`background:${d.bgColor};`}padding:2rem; text-align:center;">
        <div style="font-size:20px; font-weight:700; color:${d.textColor}; margin-bottom:0.5rem;">${d.titol||''}</div>
        <div style="font-size:13px; color:${d.textColor}; opacity:0.85;">${d.subtitol||''}</div>
      </div>`;
    case 'texto':
      return `<div style="padding:1.5rem; background:white;">
        ${d.titol?`<p style="font-size:11px; font-weight:700; color:${d.titolColor}; text-transform:uppercase; letter-spacing:0.1em; margin-bottom:0.5rem;">${d.titol}</p>`:''}
        <p style="font-size:14px; color:#444; line-height:1.6; white-space:pre-wrap;">${d.text||''}</p>
      </div>`;
    case 'imagen':
      return d.imgUrl
        ? `<div><img src="${d.imgUrl}" alt="${d.alt||''}" style="width:100%; display:block;"></div>`
        : `<div style="padding:1rem; background:#f5f5f5; text-align:center; color:#aaa; font-size:0.85rem;">📷 Imagen</div>`;
    case 'imagen-texto':
      const imgEl = d.imgUrl
        ? `<img src="${d.imgUrl}" style="width:110px; height:110px; object-fit:cover; border-radius:8px; flex-shrink:0;">`
        : `<div style="width:110px; height:110px; background:#f5f5f5; border-radius:8px; flex-shrink:0; display:flex; align-items:center; justify-content:center; color:#aaa; font-size:1.5rem;">📷</div>`;
      return `<div style="padding:1rem; background:white; display:flex; gap:1rem; align-items:center; flex-direction:${d.imgPosition!=='right'?'row':'row-reverse'};">
        ${imgEl}
        <div style="flex:1;"><strong style="font-size:14px;">${d.titol||''}</strong><p style="font-size:13px; color:#666; margin-top:0.25rem; line-height:1.5;">${d.text||''}</p></div>
      </div>`;
    case 'boton':
      return `<div style="padding:1rem; text-align:center; background:white;">
        <a style="display:inline-block; background:${d.bgColor}; color:${d.textColor}; padding:12px 30px; border-radius:999px; text-decoration:none; font-weight:700; font-size:14px;">${d.text||'Botón'}</a>
      </div>`;
    case 'productos':
      return `<div style="padding:1rem; background:white;">
        <p style="font-size:11px; font-weight:700; color:${d.titolColor}; text-transform:uppercase; letter-spacing:0.1em; margin-bottom:0.75rem;">${d.titol||''}</p>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
          ${d.productes.map(p => `
            <div style="border:0.5px solid #eee; border-radius:8px; overflow:hidden; background:${d.cardColor}; position:relative;">
              ${p.imgUrl?`<img src="${p.imgUrl}" style="width:100%; height:70px; object-fit:cover; display:block;">`:`<div style="height:70px; background:#f0e0ea; display:flex; align-items:center; justify-content:center; color:#c0618a; font-size:20px;">◆</div>`}
              ${p.etiqueta?`<span style="position:absolute; top:4px; right:4px; background:${p.etiquetaBg}; color:${p.etiquetaTextColor}; font-size:9px; font-weight:700; padding:2px 5px; border-radius:10px;">${p.etiquetaText}</span>`:''}
              <div style="padding:6px 8px;"><div style="font-size:11px; font-weight:700; color:#222;">${p.nom||''}</div><div style="font-size:11px; color:${d.preuColor}; font-weight:700;">${p.preu||''}</div></div>
            </div>
          `).join('')}
        </div>
      </div>`;
    case 'descuento':
      return `<div style="background:${d.bgColor}; margin:1rem; border-radius:8px; padding:1rem; text-align:center;">
        <div style="font-weight:700; color:${d.accentColor}; margin-bottom:0.25rem;">${d.titol||''}</div>
        <div style="font-size:12px; color:#666; margin-bottom:0.75rem;">${d.text||''}</div>
        <div style="background:white; border:2px dashed ${d.accentColor}; border-radius:6px; padding:0.5rem; display:inline-block;">
          <span style="font-family:monospace; font-weight:700; font-size:16px; color:${d.accentColor};">${d.codigo||'CODIGO'}</span>
          <span style="font-size:11px; color:#888; margin-left:0.5rem;">${d.descuento||'10'}% dto.</span>
        </div>
      </div>`;
    case 'redes':
      const svgs = {
        instagram:`<svg viewBox="0 0 24 24" width="22" height="22" fill="${d.color}"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>`,
        facebook:`<svg viewBox="0 0 24 24" width="22" height="22" fill="${d.color}"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>`,
        tiktok:`<svg viewBox="0 0 24 24" width="22" height="22" fill="${d.color}"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>`,
        youtube:`<svg viewBox="0 0 24 24" width="22" height="22" fill="${d.color}"><path d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/></svg>`,
        twitter:`<svg viewBox="0 0 24 24" width="22" height="22" fill="${d.color}"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`,
        pinterest:`<svg viewBox="0 0 24 24" width="22" height="22" fill="${d.color}"><path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24.009 12.017 24.009c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641.001 12.017.001z"/></svg>`
      };
      const activeNets = ['instagram','facebook','tiktok','youtube','twitter','pinterest'].filter(k=>d[k]).map(k=>`<a href="${d[k+'Url']||'#'}" style="margin:0 5px;">${svgs[k]}</a>`).join('');
      return `<div style="padding:1rem; text-align:center; background:white;">${activeNets||'<span style="color:#aaa; font-size:0.85rem;">Sin redes activas</span>'}</div>`;
    case 'firma':
      const br = d.imgShape==='round'?'50%':'8px';
      return `<div style="padding:1.5rem; background:white; display:flex; gap:1rem; align-items:flex-start;">
        <div style="flex-shrink:0;">${d.imgUrl?`<img src="${d.imgUrl}" style="width:65px; height:65px; object-fit:cover; border-radius:${br};">`:`<div style="width:65px; height:65px; background:#f5f5f5; border-radius:${br}; display:flex; align-items:center; justify-content:center; color:#aaa; font-size:1.5rem;">👤</div>`}</div>
        <div style="flex:1;">
          <div style="font-weight:700; color:${d.titolColor}; font-size:14px; margin-bottom:0.4rem;">${d.titol||''}</div>
          ${d.mostrarCometes?`<div style="font-size:2rem; color:${d.titolColor}; opacity:0.3; line-height:1; margin-bottom:-0.5rem;">"</div>`:''}
          <p style="font-size:13px; color:#555; line-height:1.6; white-space:pre-wrap;">${d.text||''}</p>
          ${d.signaturaUrl?`<img src="${d.signaturaUrl}" style="max-height:32px; max-width:100px; margin-top:0.75rem; display:block;">`:''}
        </div>
      </div>`;
    case 'separador':
      return `<div style="padding:0 1.5rem; background:white;"><hr style="border:none; border-top:${d.height||1}px solid ${d.color}; margin:0.5rem 0;"></div>`;
    case 'footer':
      return `<div style="background:#f9f9f9; padding:1rem; text-align:center; border-top:0.5px solid #eee;">
        <div style="font-size:11px; color:#999;">${d.text||''}</div>
        <a style="color:${d.accentColor}; font-size:11px; text-decoration:none; display:block; margin-top:4px;">Darse de baja</a>
      </div>`;
    default: return '';
  }
}

function nlGenerarHTML() {
  const wrapBg = nlGlobalConfig.bg || '#f4f4f4';
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="margin:0; padding:20px; background:${wrapBg}; font-family:Arial,sans-serif;">
    <div style="max-width:500px; margin:0 auto; background:white; border-radius:8px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.08);">
      ${nlBlocks.map(b => nlRenderBlockPreview(b)).join('')}
    </div>
  </body></html>`;
}

async function nlGuardar() {
  try {
    await setDoc(doc(db, "config", "newsletter"), {
      blocks: JSON.stringify(nlBlocks),
      globalConfig: JSON.stringify(nlGlobalConfig),
      asunto: document.getElementById('nl-asunto')?.value || ''
    });
    const msg = document.getElementById('msg-newsletter-config');
    if (msg) { msg.textContent = '✅ Guardado'; setTimeout(() => msg.textContent = '', 2000); }
  } catch (err) {
    alert('Error guardando: ' + err.message);
  }
}

async function loadNewsletter() {
  // Carregar plantilla guardada
  try {
    const snap = await getDoc(doc(db, "config", "newsletter"));
    if (snap.exists()) {
      const data = snap.data();
      if (data.blocks) {
        nlBlocks = JSON.parse(data.blocks);
        nlBlockCounter = nlBlocks.length > 0 ? Math.max(...nlBlocks.map(b => b.id)) : 0;
      }
      if (data.globalConfig) nlGlobalConfig = JSON.parse(data.globalConfig);
      if (data.asunto) {
        const asuntoEl = document.getElementById('nl-asunto');
        if (asuntoEl) asuntoEl.value = data.asunto;
      }
      const bgEl = document.getElementById('nl-global-bg');
      const bgTextEl = document.getElementById('nl-global-bg-text');
      if (bgEl) bgEl.value = nlGlobalConfig.bg || '#f4f4f4';
      if (bgTextEl) bgTextEl.value = nlGlobalConfig.bg || '#f4f4f4';
    }
  } catch (err) {
    console.error('Error carregant newsletter:', err);
  }

  nlRenderBlocks();
  nlUpdatePreview();

  // Carregar subscriptors
  try {
    const subsSnap = await getDocs(query(collection(db, "newsletter"), where("activo", "==", true)));
    const countEl = document.getElementById("newsletter-count");
    const listEl = document.getElementById("newsletter-suscriptores");
    if (countEl) countEl.textContent = `${subsSnap.size} ${t('nl_suscriptores_activos')}`;
    if (listEl) {
      listEl.innerHTML = "";
      subsSnap.forEach(d => {
        const data = d.data();
        const item = document.createElement("div");
        item.style.cssText = "display:flex; align-items:center; justify-content:space-between; padding:8px 12px; background:var(--card); border:0.5px solid rgba(0,0,0,0.08); border-radius:8px; font-size:0.9rem;";
        item.innerHTML = `<span>${data.email}</span><button class="btn-delete-icon" onclick="eliminarSuscriptor('${d.id}', this)">🗑️</button>`;
        listEl.appendChild(item);
      });
    }
  } catch (err) {
    console.error('Error carregant subscriptors:', err);
  }
  // Carregar historial enviaments
  await cargarHistorialNewsletter();
}

document.getElementById("enviar-newsletter-btn")?.addEventListener("click", async () => {
  if (nlBlocks.length === 0) {
    alert('Añade bloques al newsletter antes de enviarlo.');
    return;
  }
  const btn = document.getElementById("enviar-newsletter-btn");
  const msg = document.getElementById("msg-newsletter-envio");
  btn.disabled = true;
  btn.textContent = t('nl_enviando');
  msg.textContent = "";
  try {
    const htmlContent = nlGenerarHTML();
    const asunto = document.getElementById('nl-asunto')?.value || 'Newsletter';
    const response = await fetch("https://miuart-functions.miuart.workers.dev/enviar-newsletter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ asunto, htmlContent })
    });
    const result = await response.json();
    if (result.success) {
      msg.style.color = "green";
      msg.textContent = `${t('nl_enviat_ok')} ${result.sent} ${t('nl_enviat_ok2')}`;
      
      // Guardar historial d'enviaments
      const fechaEnvio = new Date();
      const asuntoVal = document.getElementById('nl-asunto')?.value || 'Newsletter';
      try {
        const subsSnap = await getDocs(query(collection(db, "newsletter"), where("activo", "==", true)));
        subsSnap.forEach(async (d) => {
          await addDoc(collection(db, "newsletterHistorial"), {
            email: d.data().email,
            asunto: asuntoVal,
            fecha: fechaEnvio
          });
        });
        await cargarHistorialNewsletter();
      } catch(e) {
        console.error('Error guardant historial newsletter:', e);
      }
    } else {
      msg.style.color = "red";
      msg.textContent = "❌ Error: " + result.error;
    }
  } catch (err) {
    msg.style.color = "red";
    msg.textContent = "❌ Error de connexió";
  } finally {
    btn.disabled = false;
    btn.textContent = t('nl_enviar_btn');
  }
});

async function eliminarSuscriptor(docId, btn) {
  if (!confirm(t('nl_confirmar_eliminar'))) return;
  try {
    await deleteDoc(doc(db, "newsletter", docId));
    btn.closest('div').remove();
    // Actualitzar comptador
    const listEl = document.getElementById("newsletter-suscriptores");
    const countEl = document.getElementById("newsletter-count");
    if (countEl && listEl) {
      const total = listEl.children.length;
      countEl.textContent = `${total} ${t('nl_suscriptores_activos')}`;
    }
  } catch(e) {
    console.error('Error eliminant subscriptor:', e);
  }
}

async function cargarHistorialNewsletter() {
  const listEl = document.getElementById("newsletter-historial");
  const countEl = document.getElementById("newsletter-historial-count");
  if (!listEl) return;
  try {
    const snap = await getDocs(query(collection(db, "newsletterHistorial"), orderBy("fecha", "desc")));
    if (countEl) countEl.textContent = `${snap.size} ${t('nl_historial_count')}`;
    listEl.innerHTML = "";
    snap.forEach(d => {
      const data = d.data();
      const fecha = data.fecha?.toDate ? data.fecha.toDate().toLocaleDateString('es-ES') : '-';
      const item = document.createElement("div");
      item.style.cssText = "display:flex; align-items:center; justify-content:space-between; padding:8px 12px; background:var(--card); border:0.5px solid rgba(0,0,0,0.08); border-radius:8px; font-size:0.9rem;";
      item.innerHTML = `<span><strong>${data.email}</strong> · ${data.asunto} · ${fecha}</span><button class="btn-delete-icon" onclick="eliminarHistorialNewsletter('${d.id}', this)">🗑️</button>`;
      listEl.appendChild(item);
    });
  } catch(e) {
    console.error('Error carregant historial newsletter:', e);
  }
}
window.cargarHistorialNewsletter = cargarHistorialNewsletter;

async function eliminarHistorialNewsletter(docId, btn) {
  if (!confirm(t('nl_confirmar_eliminar_historial'))) return;
  try {
    await deleteDoc(doc(db, "newsletterHistorial", docId));
    btn.closest('div').remove();
  } catch(e) {
    console.error('Error eliminant historial:', e);
  }
}
window.eliminarHistorialNewsletter = eliminarHistorialNewsletter;

window.eliminarSuscriptor = eliminarSuscriptor;

window.nlAddBlock = nlAddBlock;
window.nlMoveBlock = nlMoveBlock;
window.nlDeleteBlock = nlDeleteBlock;
window.nlToggleBlock = nlToggleBlock;
window.nlUpdateField = nlUpdateField;
window.nlUpdateProducteField = nlUpdateProducteField;
window.nlEliminarProducte = nlEliminarProducte;
window.nlAfegirProducte = nlAfegirProducte;
window.nlSubirImagen = nlSubirImagen;
window.nlSubirImagenProducte = nlSubirImagenProducte;
window.nlUpdateGlobal = nlUpdateGlobal;
window.nlGuardar = nlGuardar;

/* ---------------------------
   CLOUDINARY UPLOAD WIDGET
   --------------------------- */
let cloudinaryConfig = { cloudName: '', uploadPreset: '' };
window.cloudinaryConfig = cloudinaryConfig;

async function loadCloudinaryConfig() {
  try {
    const ref = doc(db, "config", "integraciones");
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data();
      cloudinaryConfig.cloudName = data.cloudinaryCloudName || '';
      cloudinaryConfig.uploadPreset = data.cloudinaryUploadPreset || '';
    }
  } catch (err) {
    console.error("Error carregant config Cloudinary:", err);
  }
}

function abrirCloudinaryWidget(callback, tipus = 'image') {
  if (!cloudinaryConfig.cloudName || !cloudinaryConfig.uploadPreset) {
    alert("Cloudinary no está configurado. Configúralo en Integraciones.");
    return;
  }
  const widget = cloudinary.createUploadWidget({
    cloudName: cloudinaryConfig.cloudName,
    uploadPreset: cloudinaryConfig.uploadPreset,
    language: 'es',
    sources: ['local', 'url'],
    multiple: false,
    maxFileSize: tipus === 'video' ? 100000000 : 5000000,
    resourceType: tipus,
    clientAllowedFormats: tipus === 'video' ? ['mp4', 'mov', 'avi', 'webm'] : ['jpg', 'jpeg', 'png', 'webp', 'gif']
  }, (error, result) => {
    if (!error && result && result.event === 'success') {
      callback(result.info.secure_url);
    }
  });
  widget.open();
}

window.abrirCloudinaryWidget = abrirCloudinaryWidget;

function subirImagenLogo() {
  abrirCloudinaryWidget((url) => {
    document.getElementById("logo-url").value = url;
  });
}

function subirImagenCabecera() {
  abrirCloudinaryWidget((url) => {
    document.getElementById("cabecera-url").value = url;
  });
}

window.subirImagenLogo = subirImagenLogo;
window.subirImagenCabecera = subirImagenCabecera;

/* ---------------------------
   EDITOR PÀGINA D'INICI
   --------------------------- */
async function loadEditorInicio() {
  // Carregar configuració vídeo
  const videoRef = doc(db, "seccionInicio", "video");
  const videoSnap = await getDoc(videoRef);
  if (videoSnap.exists()) {
    const data = videoSnap.data();
    document.getElementById("video-activo").checked = data.activo || false;
    document.getElementById("video-url-inicio").value = data.url || '';
    document.getElementById("video-config").style.display = data.activo ? 'block' : 'none';
    if (data.url) {
      document.getElementById("video-preview-inicio").src = data.url;
      document.getElementById("video-preview-inicio").style.display = 'block';
    }
  }

  // Carregar configuració seccions opcionals
  const configRef = doc(db, "seccionInicio", "configuracion");
  const configSnap = await getDoc(configRef);
  if (configSnap.exists()) {
    const data = configSnap.data();
    document.getElementById("mostrar-quienes-somos").checked = data.mostrarQuienesSomos !== false;
    document.getElementById("mostrar-novedades").checked = data.mostrarNovedades === true;
  }

  // Listener checkbox vídeo
  document.getElementById("video-activo").onchange = (e) => {
    document.getElementById("video-config").style.display = e.target.checked ? 'block' : 'none';
  };

  // Carregar imatges
  await carregarImagenesInicio();
  await carregarQuienesSomos();
  await carregarSeccionsPersonalitzades();
  await loadTextosLegales();
  await loadRedesSociales();
}

async function carregarImagenesInicio() {
  const listEl = document.getElementById("imagenes-inicio-lista");
  listEl.innerHTML = `<p style="color:var(--muted);">${t('editor_cargando')}</p>`;
  const seccionsSnap = await getDocs(collection(db, "seccionsPersonalitzades"));
  const seccionsPersonalitzades = [];
  seccionsSnap.forEach(d => seccionsPersonalitzades.push({ id: d.id, ...d.data() }));
  seccionsPersonalitzades.sort((a, b) => (a.orden || 0) - (b.orden || 0));
  const snap = await getDocs(collection(db, "imagenesInicio"));
  const imatges = [];
  snap.forEach(d => imatges.push({ id: d.id, ...d.data() }));
  imatges.sort((a, b) => (a.orden || 0) - (b.orden || 0));
  if (imatges.length === 0) {
    listEl.innerHTML = `<p style="color:var(--muted);">${t('editor_no_imagenes')}</p>`;
    return;
  }
  listEl.innerHTML = '';
  imatges.forEach(img => {
    const opcionsSeccions = seccionsPersonalitzades
      .filter(s => s.mostrar && s.slug)
      .map(s => `<option value="${s.slug}" ${img.destino === s.slug ? 'selected' : ''}>${(s.titols && s.titols[idiomaActiu]) || s.titol || s.slug}</option>`)
      .join('');
    const div = document.createElement('div');
    div.className = 'form';
    div.style.cssText = 'margin-bottom:1rem; max-width:700px;';
    div.innerHTML = `
      <div style="display:flex; gap:1rem; align-items:flex-start;">
        <div style="flex-shrink:0;">
          ${img.url ? `<img src="${img.url}" style="width:100px; height:100px; object-fit:cover; border-radius:8px;">` : `<div style="width:100px; height:100px; background:#f0f0f0; border-radius:8px; display:flex; align-items:center; justify-content:center; color:#999; font-size:12px;">${t('editor_sin_imagen')}</div>`}
        </div>
        <div style="flex:1;">
          <div style="display:flex; gap:0.5rem; margin-bottom:0.5rem;">
            <input type="text" id="img-url-${img.id}" value="${img.url || ''}" placeholder="${t('editor_img_url_placeholder')}" style="flex:1;">
            <button class="btn secondary" onclick="subirImagenInicio('${img.id}')">📷 ${t('editor_subir')}</button>
          </div>
          <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.5rem;">
            <input type="checkbox" id="img-boton-${img.id}" ${img.tieneBoton ? 'checked' : ''} style="width:auto;">
            <label for="img-boton-${img.id}" style="margin:0; font-weight:normal; white-space:nowrap;">${t('editor_mostrar_boton')}</label>
          </div>
          <div id="img-boton-config-${img.id}" style="display:${img.tieneBoton ? 'block' : 'none'};">
            ${(config.idiomasActivos || ['es']).map(idioma => `
              <label style="font-size:0.8rem; color:var(--muted);">${idioma.toUpperCase()} — ${t('editor_texto_boton_placeholder')}</label>
              <input type="text" id="img-texto-${img.id}-${idioma}" value="${(img.textosBoton && img.textosBoton[idioma]) || (idioma === (config.idiomaDefecte || 'es') ? img.textoBoton || '' : '')}" placeholder="${t('editor_texto_boton_placeholder')}" style="margin-bottom:0.25rem; width:100%;">
            `).join('')}
            <select id="img-destino-${img.id}" style="width:100%;">
              <option value="">${t('editor_selecciona_destino')}</option>
              <option value="tienda" ${img.destino === 'tienda' ? 'selected' : ''}>${t('nav_tienda')}</option>
              <option value="quienes-somos" ${img.destino === 'quienes-somos' ? 'selected' : ''}>${t('nav_quienes_somos')}</option>
              <option value="contacto" ${img.destino === 'contacto' ? 'selected' : ''}>${t('nav_contacto')}</option>
              <option value="novedades" ${img.destino === 'novedades' ? 'selected' : ''}>${t('nav_novedades')}</option>
              ${opcionsSeccions}
            </select>
          </div>
        </div>
        <div style="display:flex; flex-direction:column; gap:0.5rem;">
          <button class="btn primary" onclick="guardarImagenInicio('${img.id}')">${t('editor_guardar')}</button>
          <button class="btn-delete-icon" onclick="eliminarImagenInicio('${img.id}')">🗑️</button>
        </div>
      </div>
    `;
    div.querySelector(`#img-boton-${img.id}`).onchange = (e) => {
      div.querySelector(`#img-boton-config-${img.id}`).style.display = e.target.checked ? 'block' : 'none';
    };
    listEl.appendChild(div);
  });
}

async function agregarImagenInicio() {
  const snap = await getDocs(collection(db, "imagenesInicio"));
  const orden = snap.size + 1;
  await addDoc(collection(db, "imagenesInicio"), {
    url: '', textoBoton: '', destino: '', tieneBoton: true, orden
  });
  await carregarImagenesInicio();
}

async function guardarImagenInicio(id) {
  const url = document.getElementById(`img-url-${id}`).value.trim();
  const tieneBoton = document.getElementById(`img-boton-${id}`).checked;
  const idiomasActivos = config.idiomasActivos || ['es'];
  const idiomaDefecte = config.idiomaDefecte || 'es';
  const textosBoton = {};
  idiomasActivos.forEach(idioma => {
    textosBoton[idioma] = document.getElementById(`img-texto-${id}-${idioma}`)?.value.trim() || '';
  });
  const textoBoton = textosBoton[idiomaDefecte] || textosBoton[idiomasActivos[0]] || '';
  const destino = document.getElementById(`img-destino-${id}`)?.value || '';
  await updateDoc(doc(db, "imagenesInicio", id), { url, tieneBoton, textoBoton, textosBoton, destino });
  await carregarImagenesInicio();
}

async function eliminarImagenInicio(id) {
  if (!confirm('¿Eliminar esta imagen?')) return;
  await deleteDoc(doc(db, "imagenesInicio", id));
  await carregarImagenesInicio();
}

function subirImagenInicio(id) {
  abrirCloudinaryWidget((url) => {
    document.getElementById(`img-url-${id}`).value = url;
    guardarImagenInicio(id);
  });
}

function subirVideoInicio() {
  abrirCloudinaryWidget((url) => {
    document.getElementById("video-url-inicio").value = url;
    document.getElementById("video-preview-inicio").src = url;
    document.getElementById("video-preview-inicio").style.display = 'block';
  }, 'video');
}

// Guardar configuració seccions opcionals i vídeo
document.getElementById("guardar-config-inicio")?.addEventListener("click", async () => {
  try {
    await setDoc(doc(db, "seccionInicio", "video"), {
      activo: document.getElementById("video-activo").checked,
      url: document.getElementById("video-url-inicio").value.trim()
    });
    await setDoc(doc(db, "seccionInicio", "configuracion"), {
      mostrarQuienesSomos: document.getElementById("mostrar-quienes-somos").checked,
      mostrarNovedades: document.getElementById("mostrar-novedades").checked
    });
    document.getElementById("msg-config-inicio").textContent = "Configuración guardada.";
    setTimeout(() => document.getElementById("msg-config-inicio").textContent = "", 2000);
    updateUIFromConfig();
    aplicarConfigSeccionInicio();
  } catch (err) {
    alert("Error: " + err.message);
  }
});

window.agregarImagenInicio = agregarImagenInicio;
window.guardarImagenInicio = guardarImagenInicio;
window.eliminarImagenInicio = eliminarImagenInicio;
window.subirImagenInicio = subirImagenInicio;
window.subirVideoInicio = subirVideoInicio;
window.showPage = showPage;

async function aplicarConfigSeccionInicio() {
  try {
    const configRef = doc(db, "seccionInicio", "configuracion");
    const configSnap = await getDoc(configRef);
    if (configSnap.exists()) {
      const data = configSnap.data();
      
      // Mostrar/ocultar Quiénes somos
      const quienesSomosLink = document.getElementById("quienes-somos-link");
      if (quienesSomosLink) {
        quienesSomosLink.style.display = data.mostrarQuienesSomos !== false ? "block" : "none";
      }
      
      // Mostrar/ocultar Novedades (desktop i mòbil)
      const novedadesLink = document.getElementById("novedades-link");
      if (novedadesLink) {
        novedadesLink.style.display = data.mostrarNovedades === true ? "block" : "none";
      }
      const novedadesLinkMob = document.getElementById("novedades-link-mob");
      if (novedadesLinkMob) {
        novedadesLinkMob.style.display = data.mostrarNovedades === true ? "block" : "none";
      }
    }

    
  } catch (err) {
    console.error("Error aplicant config seccions:", err);
  }
}
async function carregarQuienesSomos() {
  try {
    const ref = doc(db, "seccionInicio", "configuracion");
    const snap = await getDoc(ref);
    const data = snap.exists() ? snap.data() : {};
    const idiomasActivos = config.idiomasActivos || ['es'];

    // Renderitzar camps de títol per idioma
    const titolsContainer = document.getElementById('qs-titols-container');
    const textosContainer = document.getElementById('qs-textos-container');
    if (!titolsContainer || !textosContainer) return;

    titolsContainer.innerHTML = idiomasActivos.map(idioma => `
      <div style="margin-bottom:0.5rem;">
        <label style="font-size:0.8rem; color:var(--muted);">${idioma.toUpperCase()} — ${t('editor_sec_titulo_placeholder')}</label>
        <input type="text" id="qs-titulo-${idioma}" value="${(data.qsTitols && data.qsTitols[idioma]) || (idioma === (config.idiomaDefecte || 'es') ? data.qsTitulo || '' : '')}" placeholder="${t('editor_sec_titulo_placeholder')}" style="width:100%;">
      </div>
    `).join('');

    textosContainer.innerHTML = idiomasActivos.map(idioma => `
      <div style="margin-bottom:0.5rem;">
        <label style="font-size:0.8rem; color:var(--muted);">${idioma.toUpperCase()} — ${t('editor_sec_texto_placeholder')}</label>
        <textarea id="qs-texto-${idioma}" rows="4" placeholder="${t('editor_sec_texto_placeholder')}" style="width:100%;">${(data.qsTextos && data.qsTextos[idioma]) || (idioma === (config.idiomaDefecte || 'es') ? data.qsTexto || '' : '')}</textarea>
      </div>
    `).join('');

    if (data.qsImagenUrl) {
      document.getElementById("qs-imagen-url").value = data.qsImagenUrl;
      document.getElementById("qs-imagen-preview").src = data.qsImagenUrl;
      document.getElementById("qs-imagen-preview").style.display = "block";
    }
  } catch (err) {
    console.error("Error carregant Quiénes somos:", err);
  }
}

document.getElementById("guardar-quienes-somos")?.addEventListener("click", async () => {
  try {
    const idiomasActivos = config.idiomasActivos || ['es'];
    const qsTitols = {};
    const qsTextos = {};
    idiomasActivos.forEach(idioma => {
      qsTitols[idioma] = document.getElementById(`qs-titulo-${idioma}`)?.value.trim() || '';
      qsTextos[idioma] = document.getElementById(`qs-texto-${idioma}`)?.value.trim() || '';
    });
    const idiomaDefecte = config.idiomaDefecte || 'es';
    await updateDoc(doc(db, "seccionInicio", "configuracion"), {
      qsTitols,
      qsTextos,
      qsTitulo: qsTitols[idiomaDefecte] || '',
      qsTexto: qsTextos[idiomaDefecte] || '',
      qsImagenUrl: document.getElementById("qs-imagen-url").value.trim()
    });
    document.getElementById("msg-quienes-somos").textContent = "Guardado correctamente.";
    setTimeout(() => document.getElementById("msg-quienes-somos").textContent = "", 2000);
    aplicarConfigSeccionInicio();
    updateQuienesSomosSection();
  } catch (err) {
    alert("Error: " + err.message);
  }
});

function subirImagenQS() {
  abrirCloudinaryWidget((url) => {
    document.getElementById("qs-imagen-url").value = url;
    document.getElementById("qs-imagen-preview").src = url;
    document.getElementById("qs-imagen-preview").style.display = "block";
  });
}
window.subirImagenQS = subirImagenQS;

/* ---------------------------
   EDITOR SECCIONS PERSONALITZADES
   --------------------------- */
let plantillaSeleccionada = 'texto-imagen';

function abrirModalSeccio() {
  document.getElementById('modal-seccio').style.display = 'flex';
  plantillaSeleccionada = 'texto-imagen';
  document.querySelectorAll('.plantilla-option').forEach(p => p.classList.remove('selected'));
  document.querySelector('[data-tipus="texto-imagen"]')?.classList.add('selected');
}

function tancarModalSeccio() {
  document.getElementById('modal-seccio').style.display = 'none';
}

function seleccionarPlantilla(el) {
  document.querySelectorAll('.plantilla-option').forEach(p => p.classList.remove('selected'));
  el.classList.add('selected');
  plantillaSeleccionada = el.dataset.tipus;
}

async function confirmarAfegirSeccio() {
  const snap = await getDocs(collection(db, "seccionsPersonalitzades"));
  const orden = snap.size + 1;
  const idiomasActivos = config.idiomasActivos || ['es'];
  const titols = {};
  const textos = {};
  idiomasActivos.forEach(idioma => {
    titols[idioma] = '';
    textos[idioma] = '';
  });
  await addDoc(collection(db, "seccionsPersonalitzades"), {
    tipus: plantillaSeleccionada,
    titol: '',
    titols,
    slug: '',
    text: '',
    textos,
    mediaUrl: '',
    mostrar: true,
    orden,
    imatges: []
  });
  tancarModalSeccio();
  await carregarSeccionsPersonalitzades();
}
async function carregarSeccionsPersonalitzades() {
  const container = document.getElementById('seccions-personalitzades-lista');
  if (!container) return;
  container.innerHTML = `<p style="color:var(--muted);">${t('editor_cargando')}</p>`;
  const snap = await getDocs(collection(db, "seccionsPersonalitzades"));
  const seccions = [];
  snap.forEach(d => seccions.push({ id: d.id, ...d.data() }));
  seccions.sort((a, b) => (a.orden || 0) - (b.orden || 0));
  if (seccions.length === 0) {
    container.innerHTML = `<p style="color:var(--muted);">${t('editor_no_secciones')}</p>`;
    return;
  }
  container.innerHTML = '';
  seccions.forEach(sec => {
    const tipusNom = {
      'texto-imagen': t('editor_plantilla_texto_imagen'),
      'texto-video': t('editor_plantilla_texto_video'),
      'galeria': t('editor_plantilla_galeria'),
      'solo-texto': t('editor_plantilla_solo_texto')
    }[sec.tipus] || sec.tipus;
    const div = document.createElement('div');
    div.className = 'form';
    div.style.cssText = 'margin-bottom:1rem; max-width:700px;';
    div.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
        <div>
          <span style="font-size:0.85rem; background:var(--bg); padding:3px 8px; border-radius:6px; color:var(--muted);">${tipusNom}</span>
        </div>
        <div style="display:flex; gap:0.5rem; align-items:center;">
          <label style="display:flex; align-items:center; gap:0.5rem; font-weight:normal; font-size:0.9rem;">
            <input type="checkbox" ${sec.mostrar ? 'checked' : ''} onchange="toggleSeccio(&apos;${sec.id}&apos;, this.checked)"> ${t('editor_sec_visible')}
          </label>
          <button class="btn-delete-icon" onclick="eliminarSeccio(&apos;${sec.id}&apos;)">🗑️</button>
        </div>
      </div>
      ${(config.idiomasActivos || ['es']).map(idioma => `
        <div style="margin-bottom:0.5rem;">
          <label style="font-size:0.8rem; color:var(--muted);">${idioma.toUpperCase()} — ${t('editor_sec_titulo_placeholder')}</label>
          <input type="text" id="sec-titol-${sec.id}-${idioma}" value="${(sec.titols && sec.titols[idioma]) || ''}" placeholder="${t('editor_sec_titulo_placeholder')}" style="width:100%;">
        </div>
      `).join('')}
      ${sec.tipus !== 'galeria' ? `
        ${(config.idiomasActivos || ['es']).map(idioma => `
          <div style="margin-bottom:0.5rem;">
            <label style="font-size:0.8rem; color:var(--muted);">${idioma.toUpperCase()} — ${t('editor_sec_texto_placeholder')}</label>
            <textarea id="sec-text-${sec.id}-${idioma}" rows="3" placeholder="${t('editor_sec_texto_placeholder')}" style="width:100%;">${(sec.textos && sec.textos[idioma]) || ''}</textarea>
          </div>
        `).join('')}
      ` : ''}
      ${sec.tipus === 'texto-imagen' ? `
        <div style="display:flex; gap:0.5rem; align-items:center; margin-bottom:0.5rem;">
          <input type="text" id="sec-media-${sec.id}" value="${sec.mediaUrl || ''}" placeholder="${t('editor_sec_url_imagen')}" style="flex:1;">
          <button class="btn secondary" onclick="subirMediaSeccio(&apos;${sec.id}&apos;, &apos;image&apos;)">📷 ${t('editor_subir')}</button>
        </div>
        ${sec.mediaUrl ? `<img src="${sec.mediaUrl}" style="width:80px; height:80px; object-fit:cover; border-radius:8px;">` : ''}
      ` : ''}
      ${sec.tipus === 'texto-video' ? `
        <div style="display:flex; gap:0.5rem; align-items:center; margin-bottom:0.5rem;">
          <input type="text" id="sec-media-${sec.id}" value="${sec.mediaUrl || ''}" placeholder="${t('editor_sec_url_video')}" style="flex:1;">
          <button class="btn secondary" onclick="subirMediaSeccio(&apos;${sec.id}&apos;, &apos;video&apos;)">🎥 ${t('editor_subir')}</button>
        </div>
        ${sec.mediaUrl ? `<video src="${sec.mediaUrl}" style="width:80px; height:80px; object-fit:cover; border-radius:8px;" controls></video>` : ''}
      ` : ''}
      ${sec.tipus === 'galeria' ? `
        <div id="galeria-imatges-${sec.id}"></div>
        <button class="btn secondary" onclick="afegirImatgeGaleria(&apos;${sec.id}&apos;)" style="margin-top:0.5rem;">${t('editor_sec_añadir_imagen')}</button>
      ` : ''}
      <button class="btn primary" onclick="guardarSeccio(&apos;${sec.id}&apos;)" style="margin-top:0.75rem;">${t('editor_guardar')}</button>
    `;
    container.appendChild(div);
    if (sec.tipus === 'galeria' && sec.imatges?.length > 0) {
      renderGaleriaImatges(sec.id, sec.imatges);
    }
  });
}

function renderGaleriaImatges(secId, imatges) {
  const container = document.getElementById(`galeria-imatges-${secId}`);
  if (!container) return;
  container.innerHTML = '';
  const opcionsSeccions = seccionsCachejades
    .filter(s => s.mostrar && s.slug)
    .map(s => `<option value="${s.slug}">${(s.titols && s.titols[idiomaActiu]) || s.titol || s.slug}</option>`)
    .join('');
  imatges.forEach((img, idx) => {
    const div = document.createElement('div');
    div.style.cssText = 'display:flex; flex-wrap:wrap; gap:0.5rem; align-items:center; margin-bottom:0.75rem; padding-bottom:0.75rem; border-bottom:1px solid var(--bg);';
    div.innerHTML = `
      <div style="display:flex; gap:0.5rem; width:100%; align-items:center;">
        <input type="text" id="galeria-img-${secId}-${idx}" value="${img.url || ''}" placeholder="URL imagen" style="flex:1;">
        <button class="btn secondary" onclick="subirImatgeGaleriaItem(&apos;${secId}&apos;, ${idx})">📷</button>
        <button class="btn-delete-icon" onclick="eliminarImatgeGaleria(&apos;${secId}&apos;, ${idx})">🗑️</button>
      </div>
      ${(config.idiomasActivos || ['es']).map(idioma => `
        <input type="text" id="galeria-btn-${secId}-${idx}-${idioma}" value="${(img.textosBoton && img.textosBoton[idioma]) || (idioma === (config.idiomaDefecte || 'es') ? img.textoBoton || '' : '')}" placeholder="${idioma.toUpperCase()} — ${t('editor_texto_boton_placeholder')}" style="flex:1; min-width:120px;">
      `).join('')}
      <select id="galeria-destino-${secId}-${idx}" style="width:100%;">
        <option value="">${t('editor_selecciona_destino')}</option>
        <option value="tienda" ${img.destino === 'tienda' ? 'selected' : ''}>${t('nav_tienda')}</option>
        <option value="quienes-somos" ${img.destino === 'quienes-somos' ? 'selected' : ''}>${t('nav_quienes_somos')}</option>
        <option value="contacto" ${img.destino === 'contacto' ? 'selected' : ''}>${t('nav_contacto')}</option>
        <option value="novedades" ${img.destino === 'novedades' ? 'selected' : ''}>${t('nav_novedades')}</option>
        ${opcionsSeccions}
      </select>
    `;
    // Marcar destino seleccionat al select de seccions
    const sel = div.querySelector(`#galeria-destino-${secId}-${idx}`);
    if (sel && img.destino) sel.value = img.destino;
    container.appendChild(div);
  });
}


async function afegirImatgeGaleria(secId) {
  const ref = doc(db, "seccionsPersonalitzades", secId);
  const snap = await getDoc(ref);
  const imatges = snap.data().imatges || [];
  imatges.push({ url: '', textoBoton: '' });
  await updateDoc(ref, { imatges });
  await carregarSeccionsPersonalitzades();
}

async function eliminarImatgeGaleria(secId, idx) {
  const ref = doc(db, "seccionsPersonalitzades", secId);
  const snap = await getDoc(ref);
  const imatges = snap.data().imatges || [];
  imatges.splice(idx, 1);
  await updateDoc(ref, { imatges });
  await carregarSeccionsPersonalitzades();
}

function subirImatgeGaleriaItem(secId, idx) {
  abrirCloudinaryWidget((url) => {
    document.getElementById(`galeria-img-${secId}-${idx}`).value = url;
  });
}

function subirMediaSeccio(secId, tipus) {
  abrirCloudinaryWidget((url) => {
    document.getElementById(`sec-media-${secId}`).value = url;
  }, tipus);
}

async function guardarSeccio(secId) {
  const ref = doc(db, "seccionsPersonalitzades", secId);
  const snap = await getDoc(ref);
  const data = snap.data();
  
  const idiomasActivos = config.idiomasActivos || ['es'];
  const titols = {};
  const textos = {};
  idiomasActivos.forEach(idioma => {
    titols[idioma] = document.getElementById(`sec-titol-${secId}-${idioma}`)?.value.trim() || '';
    textos[idioma] = document.getElementById(`sec-text-${secId}-${idioma}`)?.value.trim() || '';
  });
  const titolPrincipal = titols[config.idiomaDefecte || 'es'] || titols[idiomasActivos[0]] || '';
  const slug = titolPrincipal.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const updates = {
    titol: titolPrincipal,
    titols,
    slug,
    text: textos[config.idiomaDefecte || 'es'] || '',
    textos,
    mediaUrl: document.getElementById(`sec-media-${secId}`)?.value.trim() || '',
  };

  if (data.tipus === 'galeria') {
    const imatges = (data.imatges || []).map((img, idx) => ({
      url: document.getElementById(`galeria-img-${secId}-${idx}`)?.value.trim() || '',
      destino: document.getElementById(`galeria-destino-${secId}-${idx}`)?.value || '',
      textoBoton: (() => {
        const idiomaDefecte = config.idiomaDefecte || 'es';
        return document.getElementById(`galeria-btn-${secId}-${idx}-${idiomaDefecte}`)?.value.trim() || '';
      })(),
      textosBoton: (() => {
        const tb = {};
        (config.idiomasActivos || ['es']).forEach(idioma => {
          tb[idioma] = document.getElementById(`galeria-btn-${secId}-${idx}-${idioma}`)?.value.trim() || '';
        });
        return tb;
      })()
    }));
    updates.imatges = imatges;
  }

  await updateDoc(ref, updates);
  await carregarSeccionsPersonalitzades();
  await renderSeccionsPersonalitzades();
  alert('Sección guardada correctamente.');
}

async function toggleSeccio(secId, visible) {
  await updateDoc(doc(db, "seccionsPersonalitzades", secId), { mostrar: visible });
}

async function eliminarSeccio(secId) {
  if (!confirm('¿Eliminar esta sección?')) return;
  await deleteDoc(doc(db, "seccionsPersonalitzades", secId));
  await carregarSeccionsPersonalitzades();
}

window.abrirModalSeccio = abrirModalSeccio;
window.tancarModalSeccio = tancarModalSeccio;
window.seleccionarPlantilla = seleccionarPlantilla;
window.confirmarAfegirSeccio = confirmarAfegirSeccio;
window.guardarSeccio = guardarSeccio;
window.eliminarSeccio = eliminarSeccio;
window.toggleSeccio = toggleSeccio;
window.subirMediaSeccio = subirMediaSeccio;
window.afegirImatgeGaleria = afegirImatgeGaleria;
window.eliminarImatgeGaleria = eliminarImatgeGaleria;
window.subirImatgeGaleriaItem = subirImatgeGaleriaItem;

async function renderSeccionsPersonalitzades() {
  const snap = await getDocs(collection(db, "seccionsPersonalitzades"));
  seccionsCachejades = [];
  snap.forEach(d => seccionsCachejades.push({ id: d.id, ...d.data() }));
  seccionsCachejades.sort((a, b) => (a.orden || 0) - (b.orden || 0));
  seccionsJaRenderitzades = true;
}

function aplicarIdiomaASeccions() {
  console.trace('aplicarIdiomaASeccions executada');
  // Eliminar seccions anteriors
  document.querySelectorAll('.seccio-personalitzada').forEach(el => el.remove());
  // Eliminar links de seccions personalitzades del nav
  document.querySelectorAll('.nav-link-seccio-personalitzada').forEach(el => el.remove());
  document.querySelectorAll('#nav-top .nav-link-seccio-personalitzada').forEach(el => el.remove());

  seccionsCachejades.forEach(sec => {
    if (!sec.mostrar) return;
    const section = document.createElement('section');
    section.id = sec.slug ? sec.slug : `seccio-${sec.id}`;
    section.className = 'pagina seccio-personalitzada';

    const titol = (sec.titols && sec.titols[idiomaActiu]) || sec.titol || '';
    const text = (sec.textos && sec.textos[idiomaActiu]) || sec.text || '';

    let contingut = '';
    if (sec.tipus === 'texto-imagen') {
      contingut = `
        <h2>${titol}</h2>
        <div class="quienes-somos-container">
          <div class="quienes-somos-content">
            <div class="quienes-somos-texto">
              <p>${text}</p>
            </div>
            <div class="quienes-somos-imagen">
              ${sec.mediaUrl ? `<img src="${sec.mediaUrl}" alt="${titol}" style="width:100%; aspect-ratio:1/1; object-fit:cover; border-radius:var(--radius);">` : ''}
            </div>
          </div>
        </div>`;
    } else if (sec.tipus === 'texto-video') {
      contingut = `
        <h2>${titol}</h2>
        <div class="quienes-somos-container">
          <div class="quienes-somos-content">
            <div class="quienes-somos-texto">
              <p>${text}</p>
            </div>
            <div class="quienes-somos-imagen">
              ${sec.mediaUrl ? `<video src="${sec.mediaUrl}" controls style="width:100%; aspect-ratio:1/1; object-fit:cover; border-radius:var(--radius);"></video>` : ''}
            </div>
          </div>
        </div>`;
    } else if (sec.tipus === 'galeria') {
      const imatges = (sec.imatges || []).filter(img => img.url);
      contingut = `
        <h2>${titol}</h2>
        <div class="promociones-container">
          <div class="promociones-grid">
            ${imatges.map(img => `
              <div class="promocion-item">
                <img src="${img.url}" alt="">
                ${(img.textosBoton && img.textosBoton[idiomaActiu]) || img.textoBoton ? `<div class="home-image-overlay"><button class="btn primary home-image-btn" ${img.destino ? `onclick="location.hash='${img.destino}'"` : ''}>${(img.textosBoton && img.textosBoton[idiomaActiu]) || img.textoBoton || ''}</button></div>` : ''}
              </div>
            `).join('')}
          </div>
        </div>`;
    } else if (sec.tipus === 'solo-texto') {
      contingut = `
        <h2>${titol}</h2>
        <div class="quienes-somos-container">
          <p>${text}</p>
        </div>`;
    }

    section.innerHTML = contingut;
    document.querySelector('main').appendChild(section);
  });

// Afegir links de seccions personalitzades al nav
  const navMenu = document.getElementById('nav-menu');
  const menuOverlayList = document.getElementById('menu-overlay-list');

  seccionsCachejades.forEach(sec => {
    if (!sec.mostrar) return;
    const titol = (sec.titols && sec.titols[idiomaActiu]) || sec.titol || '';
    const href = sec.slug ? sec.slug : `seccio-${sec.id}`;

    // Nav desktop (al costat de Novedades)
    if (navMenu) {
      const li = document.createElement('li');
      li.className = 'nav-link-seccio-personalitzada';
      li.innerHTML = `<a href="#${href}">${titol}</a>`;
      navMenu.appendChild(li);
    }

    // Nav mòbil overlay
    if (menuOverlayList) {
      const li = document.createElement('li');
      li.className = 'nav-link-seccio-personalitzada';
      li.innerHTML = `<a href="#${href}">${titol}</a>`;
      li.querySelector('a').addEventListener('click', () => { closeMenu(); });
      menuOverlayList.appendChild(li);
    }
  });

   // Si estem dins d'una secció personalitzada, tornar-la a mostrar
  const hashActiu = location.hash.replace('#', '');
  if (hashActiu) {
    const seccioEl = document.getElementById(hashActiu);
    if (seccioEl && seccioEl.classList.contains('seccio-personalitzada')) {
      document.querySelectorAll('.pagina').forEach(p => { p.classList.remove('active'); p.style.display = 'none'; });
      seccioEl.classList.add('active');
      seccioEl.style.display = 'block';
    }
  }

}

/* ---------------------------
   TEXTOS LEGALES
   --------------------------- */
let quillEditors = {};

async function loadTextosLegales() {
  if (!window.Quill) {
    await carregarQuill();
  }
  const seccions = ['envio', 'terminos', 'privacidad'];
  const idiomasActivos = config.idiomasActivos || ['es'];
  const idiomaDefecte = config.idiomaDefecte || 'es';

  // Buidar editors existents per forçar reinicialització
  quillEditors = {};

  // PRIMER: Crear tot el DOM
  seccions.forEach(sec => {
    const container = document.getElementById(`quill-container-${sec}`);
    if (!container) return;
    container.innerHTML = '';
    idiomasActivos.forEach(idioma => {
      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'margin-bottom:1rem;';
      wrapper.innerHTML = `
        <label style="font-size:0.8rem; color:var(--muted); display:block; margin-bottom:0.25rem;">
          ${idioma.toUpperCase()} — ${t(`editor_${sec === 'envio' ? 'envio_dev' : sec === 'terminos' ? 'terminos' : 'privacidad'}`)}
        </label>
        <div id="quill-${sec}-${idioma}" style="min-height:150px;"></div>
      `;
      container.appendChild(wrapper);
    });
  });

  // SEGON: Inicialitzar Quill després que el DOM estigui llest
  await new Promise(resolve => setTimeout(resolve, 50));
  seccions.forEach(sec => {
    idiomasActivos.forEach(idioma => {
      const editorEl = document.getElementById(`quill-${sec}-${idioma}`);
      if (editorEl) {
        quillEditors[`${sec}-${idioma}`] = new Quill(`#quill-${sec}-${idioma}`, {
          theme: 'snow',
          modules: {
            toolbar: [
              ['bold', 'italic', 'underline'],
              [{ 'header': [2, 3, false] }],
              [{ 'list': 'ordered' }, { 'list': 'bullet' }],
              ['link'],
              ['clean']
            ]
          }
        });
      }
    });
  });

  // TERCER: Carregar contingut de Firestore
  try {
    const snap = await getDoc(doc(db, "config", "textosSecciones"));
    if (snap.exists()) {
      const data = snap.data();
      seccions.forEach(sec => {
        idiomasActivos.forEach(idioma => {
          const editor = quillEditors[`${sec}-${idioma}`];
          if (!editor) return;
          const text = (data[`${sec}s`] && data[`${sec}s`][idioma]) ||
                       (idioma === idiomaDefecte ? data[sec] || '' : '');
          if (text) editor.root.innerHTML = text;
        });
      });
    }
  } catch (err) {
    console.error("Error carregant textos legals:", err);
  }
}

function carregarQuill() {
  return new Promise((resolve) => {
    // CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdn.quilljs.com/1.3.7/quill.snow.css';
    document.head.appendChild(link);
    // JS
    const script = document.createElement('script');
    script.src = 'https://cdn.quilljs.com/1.3.7/quill.min.js';
    script.onload = resolve;
    document.head.appendChild(script);
  });
}

let tabLegalActiva = 'envio';

function canviarTabLegal(sec, btn) {
  tabLegalActiva = sec;
  document.querySelectorAll('.tab-legal-content').forEach(t => t.style.display = 'none');
  document.querySelectorAll('.btn-tab-legal').forEach(b => b.classList.remove('active'));
  document.getElementById(`tab-legal-${sec}`).style.display = 'block';
  btn.classList.add('active');
  // Canviar funció del botó guardar segons la pestanya
  const btnGuardar = document.getElementById('btn-guardar-legal');
  if (btnGuardar) {
    btnGuardar.onclick = sec === 'cookies' ? guardarCookiesConfig : guardarTextosLegales;
  }
  if (sec === 'cookies') {
    loadCookiesAdmin();
  }
}

async function guardarTextosLegales() {
  try {
    const idiomasActivos = config.idiomasActivos || ['es'];
    const idiomaDefecte = config.idiomaDefecte || 'es';
    const seccions = ['envio', 'terminos', 'privacidad'];
    const data = {};
    seccions.forEach(sec => {
      const textos = {};
      idiomasActivos.forEach(idioma => {
        const editor = quillEditors[`${sec}-${idioma}`];
        if (editor) textos[idioma] = editor.root.innerHTML;
      });
      data[`${sec}s`] = textos;
      // Mantenir compatibilitat amb el camp simple
      data[sec] = textos[idiomaDefecte] || textos[idiomasActivos[0]] || '';
    });
    await setDoc(doc(db, "config", "textosSecciones"), data, { merge: true });
    document.getElementById("msg-textos-legales").textContent = "Guardado correctamente.";
    setTimeout(() => document.getElementById("msg-textos-legales").textContent = "", 2000);
  } catch (err) {
    alert("Error guardando: " + err.message);
  }
}

/* ---------------------------
   GESTIÓ COOKIES ADMIN
   --------------------------- */
let cookiesCategoriesAdmin = [];

async function loadCookiesAdmin() {
  try {
    const snap = await getDoc(doc(db, "config", "textosSecciones"));
    if (snap.exists() && snap.data().cookiesConfig) {
      const cfg = snap.data().cookiesConfig;
      cookiesCategoriesAdmin = cfg.categories || [];
      // Carregar bannerTexts multiidioma
      const idiomasActivos = config.idiomasActivos || ['es'];
      const bannerContainer = document.getElementById("cookie-banner-texts-container");
      if (bannerContainer) {
        bannerContainer.innerHTML = idiomasActivos.map(idioma => `
          <div style="margin-bottom:0.5rem;">
            <label style="font-size:0.8rem; color:var(--muted);">${idioma.toUpperCase()} — ${t('editor_cookie_banner_texto')}</label>
            <textarea id="cookie-banner-text-${idioma}" rows="3" style="width:100%;">${(cfg.bannerTexts && cfg.bannerTexts[idioma]) || (idioma === (config.idiomaDefecte || 'es') ? cfg.bannerText || '' : '')}</textarea>
          </div>
        `).join('');
      }
    } else {
      cookiesCategoriesAdmin = [
        { id: "necesarias", noms: {}, descripcions: {}, nom: "Cookies necesarias", descripcion: "Imprescindibles para el funcionamiento de la web (carrito, login).", obligatoria: true },
        { id: "analitica", noms: {}, descripcions: {}, nom: "Cookies analíticas", descripcion: "Nos permiten saber qué secciones visitan los usuarios.", obligatoria: false },
        { id: "terceros", noms: {}, descripcions: {}, nom: "Cookies de terceros", descripcion: "Utilizadas por PayPal para procesar pagos de forma segura.", obligatoria: false }
      ];
    }
    renderCookiesCategoriesAdmin();
  } catch (err) {
    console.error("Error carregant cookies admin:", err);
  }
}

function renderCookiesCategoriesAdmin() {
  const container = document.getElementById("cookie-categories-admin");
  if (!container) return;
  container.innerHTML = '';
  const idiomasActivos = config.idiomasActivos || ['es'];
  cookiesCategoriesAdmin.forEach((cat, index) => {
    const div = document.createElement('div');
    div.className = 'form';
    div.style.cssText = 'margin-bottom:0.75rem; padding:0.75rem; max-width:100%;';
    div.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
        <label style="display:flex; align-items:center; gap:0.5rem; font-size:0.9rem;">
          <input type="checkbox" ${cat.obligatoria ? 'checked disabled' : ''} id="cat-obligatoria-${index}"> ${t('cookie_obligatoria')}
        </label>
        ${!cat.obligatoria ? `<button class="btn-delete-icon" onclick="eliminarCategoriaCookie(${index})">🗑️</button>` : ''}
      </div>
      <input type="text" placeholder="${t('cookie_cat_id_placeholder')}" value="${cat.id}" id="cat-id-${index}" style="margin-bottom:0.5rem; width:100%;">
      ${idiomasActivos.map(idioma => `
        <div style="margin-bottom:0.5rem;">
          <label style="font-size:0.8rem; color:var(--muted);">${idioma.toUpperCase()} — ${t('cookie_cat_nom')}</label>
          <input type="text" id="cat-nom-${index}-${idioma}" value="${(cat.noms && cat.noms[idioma]) || (idioma === (config.idiomaDefecte || 'es') ? cat.nom || '' : '')}" style="width:100%;">
        </div>
      `).join('')}
      ${idiomasActivos.map(idioma => `
        <div style="margin-bottom:0.5rem;">
          <label style="font-size:0.8rem; color:var(--muted);">${idioma.toUpperCase()} — ${t('cookie_cat_desc')}</label>
          <textarea id="cat-desc-${index}-${idioma}" rows="2" style="width:100%;">${(cat.descripcions && cat.descripcions[idioma]) || (idioma === (config.idiomaDefecte || 'es') ? cat.descripcion || '' : '')}</textarea>
        </div>
      `).join('')}
    `;
    container.appendChild(div);
  });
}

function afegirCategoriaCookie() {
  cookiesCategoriesAdmin.push({
    id: "nueva_" + Date.now(),
    nom: "",
    descripcion: "",
    obligatoria: false
  });
  renderCookiesCategoriesAdmin();
}

function eliminarCategoriaCookie(index) {
  cookiesCategoriesAdmin.splice(index, 1);
  renderCookiesCategoriesAdmin();
}

async function guardarCookiesConfig() {
  try {
    const idiomasActivos = config.idiomasActivos || ['es'];
    const idiomaDefecte = config.idiomaDefecte || 'es';
    const bannerTexts = {};
    idiomasActivos.forEach(idioma => {
      bannerTexts[idioma] = document.getElementById(`cookie-banner-text-${idioma}`)?.value.trim() || '';
    });
    const bannerText = bannerTexts[idiomaDefecte] || bannerTexts[idiomasActivos[0]] || '';
    const categories = cookiesCategoriesAdmin.map((cat, index) => {
      const noms = {};
      const descripcions = {};
      idiomasActivos.forEach(idioma => {
        noms[idioma] = document.getElementById(`cat-nom-${index}-${idioma}`)?.value.trim() || '';
        descripcions[idioma] = document.getElementById(`cat-desc-${index}-${idioma}`)?.value.trim() || '';
      });
      return {
        id: document.getElementById(`cat-id-${index}`)?.value.trim() || cat.id,
        nom: noms[idiomaDefecte] || noms[idiomasActivos[0]] || '',
        noms,
        descripcion: descripcions[idiomaDefecte] || descripcions[idiomasActivos[0]] || '',
        descripcions,
        obligatoria: cat.obligatoria
      };
    });
    await setDoc(doc(db, "config", "textosSecciones"), {
      cookiesConfig: { bannerText, bannerTexts, categories }
    }, { merge: true });
    document.getElementById("msg-textos-legales").textContent = "Guardado correctamente.";
    setTimeout(() => document.getElementById("msg-textos-legales").textContent = "", 2000);
    await initCookieBanner();
  } catch (err) {
    alert("Error guardando: " + err.message);
  }
}

let categoriaActiva = '';
function filtrarCategoria(categoria, btn) {
  categoriaActiva = categoria;
  document.querySelectorAll('.btn-categoria').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderProductGrid(productsCache);
}
window.filtrarCategoria = filtrarCategoria;

async function renderCategoriasNav() {
  const categories = [...new Set(productsCache.filter(p => getCategoriaProducte(p) && !p.ocult).map(p => getCategoriaProducte(p)))].sort();
  
  // Desktop — substituir l'enllaç de Tienda per un desplegable
  const navMenu = document.getElementById("nav-menu");
  const tiendaLi = navMenu?.querySelector('a[href="#tienda"]')?.parentElement;
  if (tiendaLi) {
    tiendaLi.style.position = 'relative';
    tiendaLi.innerHTML = `
      <a href="#tienda" class="tienda-nav-link">${t('nav_tienda')} ${categories.length > 0 ? '▾' : ''}</a>
      ${categories.length > 0 ? `
        <ul class="categorias-dropdown" id="categorias-dropdown">
          <li><a href="#tienda" onclick="filtrarCategoriaNav('')">${t('tienda_todos')}</a></li>
          ${categories.map(c => `<li><a href="#tienda" onclick="filtrarCategoriaNav('${c}')">${c}</a></li>`).join('')}
        </ul>
      ` : ''}
    `;
    tiendaLi.addEventListener('mouseenter', () => {
      document.getElementById('categorias-dropdown')?.style && (document.getElementById('categorias-dropdown').style.display = 'block');
    });
    tiendaLi.addEventListener('mouseleave', () => {
      document.getElementById('categorias-dropdown')?.style && (document.getElementById('categorias-dropdown').style.display = 'none');
    });
  }

  // Mòbil — afegir categories al overlay
  const menuOverlayList = document.getElementById("menu-overlay-list");
  document.querySelectorAll('.cat-nav-mob').forEach(el => el.remove());
  if (menuOverlayList && categories.length > 0) {
    const tiendaMobLi = menuOverlayList.querySelector('a[href="#tienda"]')?.parentElement;
    categories.forEach(c => {
      const li = document.createElement('li');
      li.className = 'cat-nav-mob';
      li.style.cssText = 'padding-left: 1.5rem; font-size: 0.9rem;';
      li.innerHTML = `<a href="#tienda" onclick="filtrarCategoriaNav('${c}')">${c}</a>`;
      li.querySelector('a').addEventListener('click', () => closeMenu());
      tiendaMobLi?.insertAdjacentElement('afterend', li);
    });
  }
}

function filtrarCategoriaNav(categoria) {
  categoriaActiva = categoria;
  renderProductGrid(productsCache);
  // Actualitzar botó actiu als filtres
  setTimeout(() => {
    document.querySelectorAll('.btn-categoria').forEach(b => {
      b.classList.toggle('active', b.textContent === (categoria || 'Todos'));
    });
  }, 100);
}
window.filtrarCategoriaNav = filtrarCategoriaNav;

function toggleFiltres() {
  const filtres = document.getElementById("categorias-filtres");
  const isOpen = filtres.style.display === 'flex';
  filtres.style.display = isOpen ? 'none' : 'flex';
}
window.toggleFiltres = toggleFiltres;



function toggleOrdenar() {
  const dropdown = document.getElementById("ordenar-dropdown");
  dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
  // Tancar si es clica fora
  setTimeout(() => {
    document.addEventListener('click', function handler(e) {
      if (!e.target.closest('#btn-ordenar-toggle') && !e.target.closest('#ordenar-dropdown')) {
        dropdown.style.display = 'none';
        document.removeEventListener('click', handler);
      }
    });
  }, 0);
}

function ordenarProductes(ordre) {
  ordenActiu = ordre;
  document.querySelectorAll('.ordenar-option').forEach(o => o.classList.remove('active'));
  event.target.classList.add('active');
  document.getElementById("ordenar-dropdown").style.display = 'none';
  renderProductGrid(productsCache);
}
window.toggleOrdenar = toggleOrdenar;
window.ordenarProductes = ordenarProductes;

/* ---------------------------
   RESSENYES / RESEÑAS
   --------------------------- */
async function renderRessenyes(producteId) {
  const contenidor = document.getElementById("ressenyes-contenidor");
  if (!contenidor) return;
  const configSnap = await getDoc(doc(db, "config", "general"));
  const configData = configSnap.exists() ? configSnap.data() : {};
  if (configData.resenyesActives === false) {
    contenidor.innerHTML = '';
    return;
  }
  const mode = configData.resenyesMode || 'tothom';
  const q = query(
    collection(db, "ressenyes"),
    where("producteId", "==", producteId),
    where("aprovada", "==", true)
  );
  const snap = await getDocs(q);
  const ressenyes = [];
  snap.forEach(d => ressenyes.push({ id: d.id, ...d.data() }));
  ressenyes.sort((a, b) => (b.data?.seconds || 0) - (a.data?.seconds || 0));
  let mitjana = 0;
  if (ressenyes.length > 0) {
    mitjana = ressenyes.reduce((acc, r) => acc + (r.valoracio || 0), 0) / ressenyes.length;
  }
  const ressenya_plural = ressenyes.length > 1 ? t('detalle_reseñas').toLowerCase() : t('detalle_reseñas').toLowerCase().replace(/s$/, '');
  contenidor.innerHTML = `
    <div style="border-top:1px solid rgba(0,0,0,0.08); padding-top:2rem;">
      <h3 style="font-size:1.1rem; margin-bottom:1rem;">${t('detalle_reseñas')}
        ${ressenyes.length > 0 ? `
          <span style="font-size:0.9rem; color:var(--muted); font-weight:normal; margin-left:0.5rem;">
            ${'⭐'.repeat(Math.round(mitjana))} ${mitjana.toFixed(1)} (${ressenyes.length} ${ressenya_plural})
          </span>` : ''}
      </h3>
      <div id="ressenyes-llista" style="margin-bottom:2rem;">
        ${ressenyes.length === 0 ? `<p style="color:var(--muted);">${t('detalle_sin_reseñas')}</p>` : ''}
        ${ressenyes.map(r => `
          <div style="border:1px solid rgba(0,0,0,0.08); border-radius:10px; padding:1rem; margin-bottom:0.75rem;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
              <strong>${escapeHtml(r.nom || t('resenyes_anonimo'))}</strong>
              <span style="color:var(--muted); font-size:0.85rem;">${r.data ? new Date(r.data.seconds * 1000).toLocaleDateString('es-ES') : ''}</span>
            </div>
            <div style="margin-bottom:0.5rem;">${'⭐'.repeat(r.valoracio || 0)}</div>
            <p style="margin:0;">${escapeHtml(r.text || '')}</p>
          </div>
        `).join('')}
      </div>
      <div style="border:1px solid rgba(0,0,0,0.08); border-radius:10px; padding:1.5rem;">
        <h4 style="margin-bottom:1rem;">${t('detalle_escribe_reseña')}</h4>
        <div style="margin-bottom:0.75rem;">
          <label style="display:block; margin-bottom:0.25rem; font-size:0.9rem;">${t('detalle_valoracion')}</label>
          <div id="star-selector" style="display:flex; gap:0.25rem; font-size:1.5rem; cursor:pointer;">
            ${[1,2,3,4,5].map(n => `<span class="star-btn" data-val="${n}" style="opacity:0.3;">⭐</span>`).join('')}
          </div>
        </div>
        <input type="text" id="resseny-nom" placeholder="${t('detalle_tu_nombre')}" style="width:100%; margin-bottom:0.5rem;">
        <input type="email" id="resseny-email" placeholder="${t('detalle_tu_email')}${mode === 'compradors' ? ' (' + t('detalle_reseña_error_comprador') + ')' : ''}" style="width:100%; margin-bottom:0.5rem;">
        <textarea id="resseny-text" rows="3" placeholder="${t('detalle_escribe_reseña')}" style="width:100%; margin-bottom:0.75rem;"></textarea>
        <button class="btn primary" onclick="enviarRessenya('${producteId}', '${mode}')">${t('detalle_enviar_reseña')}</button>
        <span id="msg-ressenya" style="display:block; margin-top:0.5rem; font-size:0.9rem;"></span>
      </div>
    </div>
  `;
  let valoracioSeleccionada = 0;
  document.querySelectorAll('.star-btn').forEach(star => {
    star.addEventListener('mouseover', () => {
      const val = Number(star.dataset.val);
      document.querySelectorAll('.star-btn').forEach(s => {
        s.style.opacity = Number(s.dataset.val) <= val ? '1' : '0.3';
      });
    });
    star.addEventListener('mouseout', () => {
      document.querySelectorAll('.star-btn').forEach(s => {
        s.style.opacity = Number(s.dataset.val) <= valoracioSeleccionada ? '1' : '0.3';
      });
    });
    star.addEventListener('click', () => {
      valoracioSeleccionada = Number(star.dataset.val);
      document.querySelectorAll('.star-btn').forEach(s => {
        s.style.opacity = Number(s.dataset.val) <= valoracioSeleccionada ? '1' : '0.3';
      });
      contenidor.dataset.valoracio = valoracioSeleccionada;
    });
  });
}

async function enviarRessenya(producteId, mode) {
  const nom = document.getElementById("resseny-nom").value.trim();
  const email = document.getElementById("resseny-email").value.trim();
  const text = document.getElementById("resseny-text").value.trim();
  const valoracio = Number(document.getElementById("ressenyes-contenidor").dataset.valoracio || 0);
  const msg = document.getElementById("msg-ressenya");
  if (!nom || !email || !text || valoracio === 0) {
    msg.style.color = 'red';
    msg.textContent = t('detalle_reseña_error_campos');
    return;
  }
  if (mode === 'compradors') {
    const comandesSnap = await getDocs(query(
      collection(db, "comandas"),
      where("email", "==", email)
    ));
    const haComprat = comandesSnap.docs.some(d => {
      const items = d.data().items || [];
      return items.some(item => item.producteId === producteId);
    });
    if (!haComprat) {
      msg.style.color = 'red';
      msg.textContent = t('detalle_reseña_error_comprador');
      return;
    }
  }
  try {
    await addDoc(collection(db, "ressenyes"), {
      producteId, nom, email, text, valoracio,
      data: new Date(),
      aprovada: false
    });
    msg.style.color = 'green';
    msg.textContent = t('detalle_reseña_enviada');
    document.getElementById("resseny-nom").value = '';
    document.getElementById("resseny-email").value = '';
    document.getElementById("resseny-text").value = '';
    document.getElementById("ressenyes-contenidor").dataset.valoracio = 0;
    document.querySelectorAll('.star-btn').forEach(s => s.style.opacity = '0.3');
  } catch (err) {
    msg.style.color = 'red';
    msg.textContent = t('detalle_error') + ' ' + err.message;
  }
}

async function loadRessenyes() {
  const pendentsEl = document.getElementById("ressenyes-pendents");
  const aprovadesel = document.getElementById("ressenyes-aprovades");
  if (!pendentsEl || !aprovadesel) return;
  pendentsEl.innerHTML = `<p style="color:var(--muted);">${t('editor_cargando')}</p>`;
  aprovadesel.innerHTML = `<p style="color:var(--muted);">${t('editor_cargando')}</p>`;
  const snap = await getDocs(collection(db, "ressenyes"));
  const totes = [];
  snap.forEach(d => totes.push({ id: d.id, ...d.data() }));
  totes.sort((a, b) => (b.data?.seconds || 0) - (a.data?.seconds || 0));
  const pendents = totes.filter(r => !r.aprovada);
  const aprovades = totes.filter(r => r.aprovada);
  function renderCard(r, isPendent) {
    return `
      <div style="border:1px solid rgba(0,0,0,0.08); border-radius:10px; padding:1rem; margin-bottom:0.75rem;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.5rem;">
          <div>
            <strong>${escapeHtml(r.nom || t('resenyes_anonimo'))}</strong>
            <span style="color:var(--muted); font-size:0.85rem; margin-left:0.5rem;">${escapeHtml(r.email || '')}</span>
          </div>
          <span style="color:var(--muted); font-size:0.85rem;">${r.data ? new Date(r.data.seconds * 1000).toLocaleDateString('es-ES') : ''}</span>
        </div>
        <div style="margin-bottom:0.25rem; font-size:0.85rem; color:var(--muted);">${t('resenyes_producto_id')} ${escapeHtml(r.producteId || '')}</div>
        <div style="margin-bottom:0.5rem;">${'⭐'.repeat(r.valoracio || 0)}</div>
        <p style="margin:0 0 0.75rem 0;">${escapeHtml(r.text || '')}</p>
        <div style="display:flex; gap:0.5rem;">
          ${isPendent ? `<button class="btn primary" onclick="aprovarRessenya('${r.id}')">✅ ${t('resenyes_aprovar')}</button>` : `<button class="btn secondary" onclick="desaprovarRessenya('${r.id}')">↩ ${t('resenyes_desaprovar')}</button>`}
          <button class="btn-delete-icon" onclick="eliminarRessenya('${r.id}')">🗑️ ${t('resenyes_eliminar')}</button>
        </div>
      </div>
    `;
  }
  pendentsEl.innerHTML = pendents.length === 0
    ? `<p style="color:var(--muted);">${t('resenyes_no_pendents')}</p>`
    : pendents.map(r => renderCard(r, true)).join('');
  aprovadesel.innerHTML = aprovades.length === 0
    ? `<p style="color:var(--muted);">${t('resenyes_no_aprovades')}</p>`
    : aprovades.map(r => renderCard(r, false)).join('');
}

async function aprovarRessenya(id) {
  await updateDoc(doc(db, "ressenyes", id), { aprovada: true });
  await loadRessenyes();
}
async function desaprovarRessenya(id) {
  await updateDoc(doc(db, "ressenyes", id), { aprovada: false });
  await loadRessenyes();
}
async function eliminarRessenya(id) {
  if (!confirm(t('resenyes_confirmar_eliminar'))) return;
  await deleteDoc(doc(db, "ressenyes", id));
  await loadRessenyes();
}

/* ---------------------------
   REDES SOCIALES
   --------------------------- */
async function loadRedesSociales() {
  try {
    const ref = doc(db, "config", "redesSociales");
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data();
      const xarxes = ['instagram', 'facebook', 'tiktok', 'youtube', 'twitter', 'pinterest', 'linkedin'];
      xarxes.forEach(x => {
        const chk = document.getElementById(`rs-${x}-activo`);
        const url = document.getElementById(`rs-${x}-url`);
        if (chk) chk.checked = data[`${x}Activo`] || false;
        if (url) url.value = data[`${x}Url`] || '';
      });
    }
  } catch (err) {
    console.error("Error carregant xarxes socials:", err);
  }
}

document.getElementById("guardar-redes-sociales")?.addEventListener("click", async () => {
  try {
    const xarxes = ['instagram', 'facebook', 'tiktok', 'youtube', 'twitter', 'pinterest', 'linkedin'];
    const data = {};
    xarxes.forEach(x => {
      data[`${x}Activo`] = document.getElementById(`rs-${x}-activo`)?.checked || false;
      data[`${x}Url`] = document.getElementById(`rs-${x}-url`)?.value.trim() || '';
    });
    await setDoc(doc(db, "config", "redesSociales"), data);
    document.getElementById("msg-redes-sociales").textContent = "Guardado correctamente.";
    setTimeout(() => document.getElementById("msg-redes-sociales").textContent = "", 2000);
    await renderRedesSociales();
  } catch (err) {
    alert("Error: " + err.message);
  }
});

async function renderRedesSociales() {
  try {
    const ref = doc(db, "config", "redesSociales");
    const snap = await getDoc(ref);
    const footerNav = document.querySelector('.footer-nav ul');
    if (!footerNav) return;

    // Eliminar icones anteriors
    document.querySelectorAll('.footer-rs-icon').forEach(el => el.remove());

    if (!snap.exists()) return;
    const data = snap.data();

    const xarxes = [
      { id: 'instagram', bg: '#fce4ec', svg: '<svg viewBox="0 0 24 24" width="20" height="20" fill="#E1306C"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>' },
      { id: 'facebook', bg: '#e3f2fd', svg: '<svg viewBox="0 0 24 24" width="20" height="20" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>' },
      { id: 'tiktok', bg: '#f3e5f5', svg: '<svg viewBox="0 0 24 24" width="20" height="20" fill="#000"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>' },
      { id: 'youtube', bg: '#ffebee', svg: '<svg viewBox="0 0 24 24" width="20" height="20" fill="#FF0000"><path d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/></svg>' },
      { id: 'twitter', bg: '#f5f5f5', svg: '<svg viewBox="0 0 24 24" width="20" height="20" fill="#000"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>' },
      { id: 'pinterest', bg: '#fce4ec', svg: '<svg viewBox="0 0 24 24" width="20" height="20" fill="#E60023"><path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24.009 12.017 24.009c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641.001 12.017.001z"/></svg>' },
      { id: 'linkedin', bg: '#e3f2fd', svg: '<svg viewBox="0 0 24 24" width="20" height="20" fill="#0A66C2"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>' },
    ];

    const div = document.createElement('li');
    div.className = 'footer-rs-icon';
    div.style.cssText = 'display:flex; gap:8px; flex-wrap:wrap; justify-content:center; padding:0.5rem 0;';
    
    xarxes.forEach(x => {
      if (!data[`${x.id}Activo`] || !data[`${x.id}Url`]) return;
      const a = document.createElement('a');
      a.href = data[`${x.id}Url`];
      a.target = '_blank';
      a.style.cssText = `width:36px; height:36px; border-radius:8px; background:${x.bg}; display:flex; align-items:center; justify-content:center; text-decoration:none;`;
      a.innerHTML = x.svg;
      div.appendChild(a);
    });

    if (div.children.length > 0) {
      footerNav.appendChild(div);
    }
  } catch (err) {
    console.error("Error renderitzant xarxes socials:", err);
  }
}

/* ---------------------------
   SEARCH OVERLAY MÒBIL
   --------------------------- */
const searchToggleBtn = document.getElementById("search-toggle-btn");
const searchOverlay = document.getElementById("search-overlay");
const searchOverlayClose = document.getElementById("search-overlay-close");
const searchInputMobile = document.getElementById("search-input-mobile");
const searchOverlayResults = document.getElementById("search-overlay-results");

if (searchToggleBtn) {
  searchToggleBtn.addEventListener("click", () => {
    searchOverlay.classList.add("active");
    setTimeout(() => searchInputMobile.focus(), 100);
  });
}

if (searchOverlayClose) {
  searchOverlayClose.addEventListener("click", () => {
    searchOverlay.classList.remove("active");
    searchInputMobile.value = "";
    searchOverlayResults.innerHTML = "";
  });
}

searchOverlay?.addEventListener("click", (e) => {
  if (e.target === searchOverlay) {
    searchOverlay.classList.remove("active");
    searchInputMobile.value = "";
    searchOverlayResults.innerHTML = "";
  }
});

if (searchInputMobile) {
  searchInputMobile.addEventListener("input", async () => {
    const q = searchInputMobile.value.trim().toLowerCase();
    if (q.length < 2) { searchOverlayResults.innerHTML = ""; return; }
    const snap = await getDocs(collection(db, "productes"));
    const resultats = [];
    snap.forEach(d => {
      const p = d.data();
      if (getNomProducte(p)?.toLowerCase().includes(q) || p.referencia?.toLowerCase().includes(q)) {
        resultats.push({ id: d.id, ...p });
      }
    });
    if (resultats.length === 0) {
      searchOverlayResults.innerHTML = '<p class="no-results">Sin resultados</p>';
      return;
    }
    searchOverlayResults.innerHTML = resultats.slice(0, 8).map(p => `
      <a href="#detalle-producto/${p.id}" class="search-result-item" onclick="document.getElementById('search-overlay').classList.remove('active')">
        <img src="${p.imatgeUrl || 'https://via.placeholder.com/50'}" alt="${p.nom}">
        <div class="search-result-info">
          <span class="search-result-name">${getNomProducte(p)}</span>
          <span class="search-result-id">${p.referencia || ''}</span>
        </div>
        <span class="search-result-price">${p.preu ? p.preu + '€' : ''}</span>
      </a>
    `).join('');
  });
}

/* ---------------------------
   ADMIN OVERLAY MÒBIL
   --------------------------- */
const adminToggleBtn = document.getElementById("admin-toggle-btn");
const adminOverlay = document.getElementById("admin-overlay");

if (adminToggleBtn) {
  adminToggleBtn.addEventListener("click", () => {
    adminOverlay.classList.toggle("active");
  });
  adminOverlay.addEventListener("click", (e) => {
    if (e.target === adminOverlay) adminOverlay.classList.remove("active");
  });
  adminOverlay.querySelectorAll("a").forEach(a => {
    a.addEventListener("click", () => adminOverlay.classList.remove("active"));
  });
}

async function renderTextosLegales() {
  try {
    const snap = await getDoc(doc(db, "config", "textosSecciones"));
    if (!snap.exists()) return;
    const data = snap.data();
    const seccions = ['envio', 'terminos', 'privacidad'];
    const mapa = {
      envio: 'content-envio',
      terminos: 'content-terminos',
      privacidad: 'content-privacidad'
    };
    seccions.forEach(sec => {
      const el = document.getElementById(mapa[sec]);
      if (!el) return;
      const text = (data[`${sec}s`] && data[`${sec}s`][idiomaActiu]) || data[sec] || '';
      el.innerHTML = text;
    });
  } catch (err) {
    console.error("Error renderitzant textos legals:", err);
  }
}

window.guardarTextosLegales = guardarTextosLegales;
window.canviarTabLegal = canviarTabLegal;
window.renderTextosLegales = renderTextosLegales;
window.afegirCategoriaCookie = afegirCategoriaCookie;
window.eliminarCategoriaCookie = eliminarCategoriaCookie;
window.guardarCookiesConfig = guardarCookiesConfig;
window.enviarRessenya = enviarRessenya;
window.aprovarRessenya = aprovarRessenya;
window.desaprovarRessenya = desaprovarRessenya;
window.eliminarRessenya = eliminarRessenya;
window.subirImatgeVariant = subirImatgeVariant;

window._tradenfy = {
  db, auth, loadProducts, loadHeaderImages, loadHeaderImagesDetalle, carrito, saveCart, showCartPopup, showAddressForm
};