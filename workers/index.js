export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    const allowedOrigins = (env.ALLOWED_ORIGINS || '').split(',').map(o => o.trim());
    const origin = request.headers.get('Origin') || '';
    const allowedOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0] || '*';

    const corsHeaders = {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Headers': 'Content-Type, Origin, Accept',
      'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
      'Content-Type': 'application/json'
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: corsHeaders });
    }

    if (path === '/enviar-contacto') return handleContacto(request, env, corsHeaders);
    if (path === '/enviar-confirmacion') return handleConfirmacion(request, env, corsHeaders);
    if (path === '/nueva-comanda-admin') return handleNuevaComanda(request, env, corsHeaders);
    if (path === '/enviar-seguimiento') return handleSeguimiento(request, env, corsHeaders);
    if (path === '/afegir-newsletter') return handleAfegirNewsletter(request, env, corsHeaders);
    if (path === '/desuscribirse') return handleDesuscribirse(request, env, corsHeaders);
    if (path === '/enviar-newsletter') return handleEnviarNewsletter(request, env, corsHeaders);
    if (path === '/enviar-enlace-descarga') return handleEnlaceDescarga(request, env, corsHeaders);

    return new Response(JSON.stringify({ error: 'Ruta no encontrada' }), { status: 404, headers: corsHeaders });
  }
};

async function handleContacto(request, env, corsHeaders) {
  try {
    const { nombre, email, mensaje, volNewsletter } = await request.json();
    if (!nombre || !email || !mensaje) {
      return new Response(JSON.stringify({ error: 'Faltan campos requeridos' }), { status: 400, headers: corsHeaders });
    }

    // Enviar email de contacte
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Miuart <contacto@miuart.com>',
        to: [env.RESEND_EMAIL_CONTACTO],
        subject: `📧 Nuevo mensaje de ${nombre} - Miuart`,
        html: `<h2>Nuevo mensaje de contacto</h2><p><strong>Nombre:</strong> ${nombre}</p><p><strong>Email:</strong> ${email}</p><p><strong>Mensaje:</strong> ${mensaje}</p>`
      })
    });
    if (!res.ok) throw new Error('Error Resend');

    // Guardar subscriptor si ha acceptat el newsletter
    if (volNewsletter && email) {
      const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/newsletter/${encodeURIComponent(email)}?key=${env.FIREBASE_API_KEY}`;
      await fetch(firestoreUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            email: { stringValue: email },
            nombre: { stringValue: nombre || '' },
            activo: { booleanValue: true },
            fecha: { stringValue: new Date().toISOString() }
          }
        })
      });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
}

async function handleConfirmacion(request, env, corsHeaders) {
  try {
    const body = await request.json();
    const { client_email, client_name, client_phone, client_address, order_id, date, subtotal, envio, iva, total, productos_html, cupon_html, idioma } = body;
    const i18n = {
      es: {
        asunto: `Confirmación de tu pedido #${order_id}`,
        titulo: '¡Gracias por tu compra!',
        hola: 'Hola',
        mensaje: 'Hemos recibido tu pedido correctamente y lo estamos procesando. En breve recibirás más información.',
        datos_envio: 'Datos de envío',
        productos: 'Productos',
        subtotal: 'Subtotal',
        envio: 'Envío',
        iva: 'IVA',
        total: 'Total',
        footer: 'Si tienes alguna duda escríbenos a',
        info_pedido: 'Información del Pedido',
        num_pedido: 'Nº Pedido',
        fecha: 'Fecha',
        datos_cliente: 'Datos del Cliente',
        telefono: 'Teléfono',
        direccion_envio: 'Dirección de Envío',
        resumen: 'Resumen',
      },
      en: {
        asunto: `Order confirmation #${order_id}`,
        titulo: 'Thank you for your purchase!',
        hola: 'Hello',
        mensaje: 'We have received your order and are processing it. You will receive more information shortly.',
        datos_envio: 'Shipping details',
        productos: 'Products',
        subtotal: 'Subtotal',
        envio: 'Shipping',
        iva: 'VAT',
        total: 'Total',
        footer: 'If you have any questions write to us at',
        info_pedido: 'Order Information',
        num_pedido: 'Order No.',
        fecha: 'Date',
        datos_cliente: 'Customer Details',
        telefono: 'Phone',
        direccion_envio: 'Shipping Address',
        resumen: 'Summary',
      },
      cat: {
        asunto: `Confirmació de la teva comanda #${order_id}`,
        titulo: 'Gràcies per la teva compra!',
        hola: 'Hola',
        mensaje: 'Hem rebut la teva comanda correctament i l’estem processant. Ben aviat en rebràs més informació.',
        datos_envio: 'Dades d’enviament',
        productos: 'Productes',
        subtotal: 'Subtotal',
        envio: 'Enviament',
        iva: 'IVA',
        total: 'Total',
        footer: 'Si tens algun dubte escriu-nos a',
        info_pedido: 'Informació de la Comanda',
        num_pedido: 'Núm. Comanda',
        fecha: 'Data',
        datos_cliente: 'Dades del Client',
        telefono: 'Telèfon',
        direccion_envio: 'Adreça d’Enviament',
        resumen: 'Resum',
      },
      fr: {
        asunto: `Confirmation de votre commande #${order_id}`,
        titulo: 'Merci pour votre achat !',
        hola: 'Bonjour',
        mensaje: 'Nous avons bien reçu votre commande et nous sommes en train de la traiter. Vous recevrez plus d’informations très prochainement.',
        datos_envio: 'Informations d’expédition',
        productos: 'Produits',
        subtotal: 'Sous-total',
        envio: 'Livraison',
        iva: 'TVA',
        total: 'Total',
        footer: 'Si vous avez des questions, écrivez-nous à',
        info_pedido: 'Informations sur la commande',
        num_pedido: 'N° de commande',
        fecha: 'Date',
        datos_cliente: 'Coordonnées du client',
        telefono: 'Téléphone',
        direccion_envio: 'Adresse de livraison',
        resumen: 'Résumé',
      },
      de: {
        asunto: `Bestätigung Ihrer Bestellung #${order_id}`,
        titulo: 'Vielen Dank für Ihren Einkauf!',
        hola: 'Hallo',
        mensaje: 'Wir haben Ihre Bestellung erhalten und bearbeiten sie derzeit. In Kürze erhalten Sie weitere Informationen.',
        datos_envio: 'Versandinformationen',
        productos: 'Produkte',
        subtotal: 'Zwischensumme',
        envio: 'Versand',
        iva: 'MwSt.',
        total: 'Gesamt',
        footer: 'Wenn Sie Fragen haben, schreiben Sie uns an',
        info_pedido: 'Bestellinformationen',
        num_pedido: 'Bestellnummer',
        fecha: 'Datum',
        datos_cliente: 'Kundendaten',
        telefono: 'Telefon',
        direccion_envio: 'Lieferadresse',
        resumen: 'Zusammenfassung',
      },
      it: {
        asunto: `Conferma del tuo ordine #${order_id}`,
        titulo: 'Grazie per il tuo acquisto!',
        hola: 'Ciao',
        mensaje: 'Abbiamo ricevuto il tuo ordine correttamente e lo stiamo elaborando. Riceverai presto ulteriori informazioni.',
        datos_envio: 'Dati di spedizione',
        productos: 'Prodotti',
        subtotal: 'Subtotale',
        envio: 'Spedizione',
        iva: 'IVA',
        total: 'Totale',
        footer: 'Se hai domande, scrivici a',
        info_pedido: 'Informazioni sull’ordine',
        num_pedido: 'N. ordine',
        fecha: 'Data',
        datos_cliente: 'Dati del cliente',
        telefono: 'Telefono',
        direccion_envio: 'Indirizzo di spedizione',
        resumen: 'Riepilogo',
      },
      pt: {
        asunto: `Confirmação do seu pedido #${order_id}`,
        titulo: 'Obrigado pela sua compra!',
        hola: 'Olá',
        mensaje: 'Recebemos o seu pedido corretamente e estamos a processá-lo. Em breve receberá mais informações.',
        datos_envio: 'Dados de envio',
        productos: 'Produtos',
        subtotal: 'Subtotal',
        envio: 'Envio',
        iva: 'IVA',
        total: 'Total',
        footer: 'Se tiver alguma dúvida, escreva-nos para',
        info_pedido: 'Informações do Pedido',
        num_pedido: 'Nº do Pedido',
        fecha: 'Data',
        datos_cliente: 'Dados do Cliente',
        telefono: 'Telefone',
        direccion_envio: 'Morada de Envio',
        resumen: 'Resumo',
      },
      sv: {
        asunto: `Bekräftelse av din beställning #${order_id}`,
        titulo: 'Tack för ditt köp!',
        hola: 'Hej',
        mensaje: 'Vi har tagit emot din beställning och håller på att behandla den. Du kommer snart att få mer information.',
        datos_envio: 'Fraktinformation',
        productos: 'Produkter',
        subtotal: 'Delsumma',
        envio: 'Frakt',
        iva: 'Moms',
        total: 'Total',
        footer: 'Om du har några frågor, skriv till oss på',
        info_pedido: 'Orderinformation',
        num_pedido: 'Ordernummer',
        fecha: 'Datum',
        datos_cliente: 'Kunduppgifter',
        telefono: 'Telefon',
        direccion_envio: 'Leveransadress',
        resumen: 'Sammanfattning',
      },
      da: {
        asunto: `Bekræftelse af din ordre #${order_id}`,
        titulo: 'Tak for dit køb!',
        hola: 'Hej',
        mensaje: 'Vi har modtaget din ordre korrekt, og vi er i gang med at behandle den. Du vil snart modtage mere information.',
        datos_envio: 'Forsendelsesoplysninger',
        productos: 'Produkter',
        subtotal: 'Subtotal',
        envio: 'Forsendelse',
        iva: 'Moms',
        total: 'Total',
        footer: 'Hvis du har spørgsmål, så skriv til os på',
        info_pedido: 'Ordreinformation',
        num_pedido: 'Ordrenummer',
        fecha: 'Dato',
        datos_cliente: 'Kundeoplysninger',
        telefono: 'Telefon',
        direccion_envio: 'Leveringsadresse',
        resumen: 'Oversigt',
      },
      pl: {
        asunto: `Potwierdzenie Twojego zamówienia #${order_id}`,
        titulo: 'Dziękujemy za zakup!',
        hola: 'Cześć',
        mensaje: 'Pomyślnie otrzymaliśmy Twoje zamówienie i jesteśmy w trakcie jego przetwarzania. Wkrótce otrzymasz więcej informacji.',
        datos_envio: 'Dane do wysyłki',
        productos: 'Produkty',
        subtotal: 'Suma częściowa',
        envio: 'Wysyłka',
        iva: 'VAT',
        total: 'Suma całkowita',
        footer: 'Jeśli masz pytania, napisz do nas na adres',
        info_pedido: 'Informacje o zamówieniu',
        num_pedido: 'Nr zamówienia',
        fecha: 'Data',
        datos_cliente: 'Dane klienta',
        telefono: 'Telefon',
        direccion_envio: 'Adres do wysyłki',
        resumen: 'Podsumowanie',
      },
      fi: {
        asunto: `Tilausvahvistus #${order_id}`,
        titulo: 'Kiitos ostoksestasi!',
        hola: 'Hei',
        mensaje: 'Olemme vastaanottaneet tilauksesi ja käsittelemme sitä parhaillaan. Saat pian lisätietoja.',
        datos_envio: 'Toimitustiedot',
        productos: 'Tuotteet',
        subtotal: 'Välisumma',
        envio: 'Toimitus',
        iva: 'ALV',
        total: 'Yhteensä',
        footer: 'Jos sinulla on kysyttävää, kirjoita meille osoitteeseen',
        info_pedido: 'Tilaustiedot',
        num_pedido: 'Tilausnumero',
        fecha: 'Päivämäärä',
        datos_cliente: 'Asiakastiedot',
        telefono: 'Puhelin',
        direccion_envio: 'Toimitusosoite',
        resumen: 'Yhteenveto',
      },
      no: {
        asunto: `Bekreftelse på din bestilling #${order_id}`,
        titulo: 'Takk for kjøpet!',
        hola: 'Hei',
        mensaje: 'Vi har mottatt din bestilling og behandler den nå. Du vil motta mer informasjon om kort tid.',
        datos_envio: 'Leveringsinformasjon',
        productos: 'Produkter',
        subtotal: 'Delsum',
        envio: 'Frakt',
        iva: 'MVA',
        total: 'Total',
        footer: 'Hvis du har spørsmål, skriv til oss på',
        info_pedido: 'Bestillingsinformasjon',
        num_pedido: 'Ordrenummer',
        fecha: 'Dato',
        datos_cliente: 'Kundeopplysninger',
        telefono: 'Telefon',
        direccion_envio: 'Leveringsadresse',
        resumen: 'Sammendrag',
      }
    };
    const tx = i18n[idioma] || i18n['es'];

    // Llegir configuració d'emails de Firestore
    let emailConf = {};
    try {
      const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/config/emails?key=${env.FIREBASE_API_KEY}`;
      const firestoreRes = await fetch(firestoreUrl);
      if (firestoreRes.ok) {
        const firestoreData = await firestoreRes.json();
        const fields = firestoreData.fields?.emailConfirmacion?.mapValue?.fields || {};
        emailConf = {
          colorCabecera: fields.colorCabecera?.stringValue || '#c0618a',
          colorTitulos: fields.colorTitulos?.stringValue || '#c0618a',
          colorTotal: fields.colorTotal?.stringValue || '#c0618a',
          colorSubtotalText: fields.colorSubtotalText?.stringValue || '#d63384',
          colorSubtotalBg: fields.colorSubtotalBg?.stringValue || '#fdf2f8',
          colorTotalBg: fields.colorTotalBg?.stringValue || '#f1cede',
          nombreBotiga: fields.nombreBotiga?.stringValue || 'Miuart',
          any: fields.any?.stringValue || fields.any?.integerValue || new Date().getFullYear()
        };
      }
    } catch(e) {
      // Si falla, usar valors per defecte
    }
    if (!client_email || !order_id) {
      return new Response(JSON.stringify({ error: 'Faltan datos obligatorios' }), { status: 400, headers: corsHeaders });
    }
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Miuart <contacto@miuart.com>',
        to: [client_email],
        subject: tx.asunto,
        html: `<!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8"/>
          <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
          <title>Confirmación de Pedido - Miuart</title>
          <style>
            body { font-family:Arial,sans-serif; background:#f4f4f4; margin:0; padding:0; }
            .container { max-width:600px; margin:20px auto; background:white; border-radius:8px; overflow:hidden; box-shadow:0 0 10px rgba(0,0,0,0.1); }
            .header { background:${emailConf.colorCabecera}; color:white; padding:20px; text-align:center; }
            .header h1 { margin:0; font-size:24px; }
            .content { padding:25px; }
            .section { margin-bottom:20px; }
            .section h2 { color:${emailConf.colorTitulos}; border-bottom:1px solid #eee; padding-bottom:8px; font-size:18px; }
            table { width:100%; border-collapse:collapse; margin:15px 0; font-size:14px; }
            th { background:#f8f9fa; text-align:left; padding:10px; font-weight:bold; }
            td { padding:10px; border-bottom:1px solid #eee; }
            .total { font-weight:bold; background:${emailConf.colorTotalBg}; }
            .footer { background:#f8f9fa; padding:15px; text-align:center; font-size:12px; color:#666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${tx.titulo}</h1>
            </div>
            <div class="content">
              <p>${tx.hola} <strong>${client_name}</strong>,</p>
              <p>${tx.mensaje}</p>
              <div class="section">
                <h2>${tx.info_pedido}</h2>
                <p><strong>${tx.num_pedido}:</strong> ${order_id}</p>
                <p><strong>${tx.fecha}:</strong> ${date}</p>
              </div>
              <div class="section">
                <h2>${tx.datos_cliente}</h2>
                <p><strong>Email:</strong> ${client_email}</p>
                <p><strong>${tx.telefono}:</strong> ${client_phone}</p>
              </div>
              <div class="section">
                <h2>${tx.direccion_envio}</h2>
                <p style="white-space:pre-line;">${client_address}</p>
              </div>
              <div class="section">
                <h2>${tx.productos}</h2>
                ${productos_html}
              </div>
              <div class="section">
                <h2>${tx.resumen}</h2>
                <table>
                  <tr><td>${tx.subtotal}:</td><td style="text-align:right;">${subtotal}</td></tr>
                  <tr><td>${tx.envio}:</td><td style="text-align:right;">${envio}</td></tr>
                  <tr><td>${tx.iva}:</td><td style="text-align:right;">${iva}</td></tr>
                  <tr class="total"><td><strong>${tx.total}:</strong></td><td style="text-align:right; color:${emailConf.colorTotal};"><strong>${total}</strong></td></tr>
                </table>
              </div>
              ${cupon_html || ''}
              <div class="footer">
                <p>© ${emailConf.any} ${emailConf.nombreBotiga} | <a href="mailto:miuartclientes@gmail.com" style="color:${emailConf.colorTitulos};">${tx.footer}</a></p>
              </div>
            </div>
          </div>
        </body>
        </html>`
      })
    });
    if (!res.ok) throw new Error('Error Resend');
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
}

async function handleSeguimiento(request, env, corsHeaders) {
  try {
    const { email, client_name, order_id, tracking_number, agencia, url_rastreig, idioma } = await request.json();
    if (!email || !order_id || !tracking_number) {
      return new Response(JSON.stringify({ error: 'Faltan datos obligatorios' }), { status: 400, headers: corsHeaders });
    }

    // Llegir configuració d'emails de Firestore
    let emailSeguimiento = {};
    try {
      const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/config/emails?key=${env.FIREBASE_API_KEY}`;
      const firestoreRes = await fetch(firestoreUrl);
      if (firestoreRes.ok) {
        const firestoreData = await firestoreRes.json();
        const fields = firestoreData.fields?.emailSeguimiento?.mapValue?.fields || {};
        emailSeguimiento = {
          colorCabecera: fields.colorCabecera?.stringValue || '#c0618a',
          colorTitulos: fields.colorTitulos?.stringValue || '#c0618a',
          nombreBotiga: fields.nombreBotiga?.stringValue || 'Miuart',
          emailContacto: fields.emailContacto?.stringValue || 'miuartclientes@gmail.com',
          any: fields.any?.stringValue || fields.any?.integerValue || new Date().getFullYear(),
          agenciaTransport: fields.agenciaTransport?.stringValue || '',
          urlRastreig: fields.urlRastreig?.stringValue || ''
        };
      }
    } catch(e) {
      // Si falla, usar valors per defecte
    }

    const i18n = {
      es: {
        asunto: `Tu pedido #${order_id} está en camino 📦`,
        titulo: '¡Tu pedido está en camino!',
        hola: 'Hola',
        mensaje: `Te informamos que tu pedido <strong>#${order_id}</strong> ha sido enviado${agencia ? ` a través de ${agencia}` : ''}.`,
        num_seguimiento: 'Número de seguimiento',
        rastrear: `Rastrear mi pedido${agencia ? ` en ${agencia}` : ''}`,
        contacto: 'Si tienes alguna pregunta, contáctanos en',
        gracias: `¡Gracias por confiar en ${emailSeguimiento.nombreBotiga}!`
      },
      en: {
        asunto: `Your order #${order_id} is on its way 📦`,
        titulo: 'Your order is on its way!',
        hola: 'Hello',
        mensaje: `Your order <strong>#${order_id}</strong> has been shipped${emailSeguimiento.agenciaTransport ? ` via ${emailSeguimiento.agenciaTransport}` : ''}.`,
        num_seguimiento: 'Tracking number',
        rastrear: `Track my order${emailSeguimiento.agenciaTransport ? ` at ${emailSeguimiento.agenciaTransport}` : ''}`,
        contacto: 'If you have any questions, contact us at',
        gracias: `Thank you for trusting ${emailSeguimiento.nombreBotiga}!`
      },
      cat: {
        asunto: `La teva comanda #${order_id} està en camí 📦`,
        titulo: 'La teva comanda està en camí!',
        hola: 'Hola',
        mensaje: `T'informem que la teva comanda <strong>#${order_id}</strong> ha estat enviada${agencia ? ` a través de ${agencia}` : ''}.`,
        num_seguimiento: 'Número de seguiment',
        rastrear: `Rastrejar la meva comanda${agencia ? ` a ${agencia}` : ''}`,
        contacto: 'Si tens alguna pregunta, contacta amb nosaltres a',
        gracias: `Gràcies per confiar en ${emailSeguimiento.nombreBotiga}!`
      },
      fr: {
        asunto: `Votre commande #${order_id} est en route 📦`,
        titulo: 'Votre commande est en route !',
        hola: 'Bonjour',
        mensaje: `Nous vous informons que votre commande <strong>#${order_id}</strong> a été expédiée${agencia ? ` via ${agencia}` : ''}.`,
        num_seguimiento: 'Numéro de suivi',
        rastrear: `Suivre ma commande${agencia ? ` sur ${agencia}` : ''}`,
        contacto: 'Si vous avez des questions, contactez-nous à',
        gracias: `Merci de votre confiance en ${emailSeguimiento.nombreBotiga} !`
      },
      de: {
        asunto: `Ihre Bestellung #${order_id} ist unterwegs 📦`,
        titulo: 'Ihre Bestellung ist unterwegs!',
        hola: 'Hallo',
        mensaje: `Wir informieren Sie, dass Ihre Bestellung <strong>#${order_id}</strong> versandt wurde${agencia ? ` über ${agencia}` : ''}.`,
        num_seguimiento: 'Sendungsnummer',
        rastrear: `Meine Bestellung verfolgen${agencia ? ` bei ${agencia}` : ''}`,
        contacto: 'Wenn Sie Fragen haben, kontaktieren Sie uns unter',
        gracias: `Vielen Dank für Ihr Vertrauen in ${emailSeguimiento.nombreBotiga}!`
      },
      it: {
        asunto: `Il tuo ordine #${order_id} è in arrivo 📦`,
        titulo: 'Il tuo ordine è in viaggio!',
        hola: 'Ciao',
        mensaje: `Ti informiamo che il tuo ordine <strong>#${order_id}</strong> è stato spedito${agencia ? ` tramite ${agencia}` : ''}.`,
        num_seguimiento: 'Numero di tracciamento',
        rastrear: `Segui il mio ordine${agencia ? ` su ${agencia}` : ''}`,
        contacto: 'Se hai domande, contattaci a',
        gracias: `Grazie per la fiducia in ${emailSeguimiento.nombreBotiga}!`
      },
      pt: {
        asunto: `O seu pedido #${order_id} está a caminho 📦`,
        titulo: 'O seu pedido está a caminho!',
        hola: 'Olá',
        mensaje: `Informamos que o seu pedido <strong>#${order_id}</strong> foi enviado${agencia ? ` através da ${agencia}` : ''}.`,
        num_seguimiento: 'Número de seguimento',
        rastrear: `Rastrear o meu pedido${agencia ? ` na ${agencia}` : ''}`,
        contacto: 'Se tiver alguma dúvida, contacte-nos em',
        gracias: `Obrigado por confiar na ${emailSeguimiento.nombreBotiga}!`
      },
      sv: {
        asunto: `Din beställning #${order_id} är på väg 📦`,
        titulo: 'Din beställning är på väg!',
        hola: 'Hej',
        mensaje: `Vi informerar dig om att din beställning <strong>#${order_id}</strong> har skickats${agencia ? ` med ${agencia}` : ''}.`,
        num_seguimiento: 'Spårningsnummer',
        rastrear: `Spåra min beställning${agencia ? ` hos ${agencia}` : ''}`,
        contacto: 'Om du har några frågor, kontakta oss på',
        gracias: `Tack för att du litar på ${emailSeguimiento.nombreBotiga}!`
      },
      da: {
        asunto: `Din ordre #${order_id} er på vej 📦`,
        titulo: 'Din ordre er på vej!',
        hola: 'Hej',
        mensaje: `Vi informerer dig om, at din ordre <strong>#${order_id}</strong> er blevet sendt${agencia ? ` via ${agencia}` : ''}.`,
        num_seguimiento: 'Trackingnummer',
        rastrear: `Spor min ordre${agencia ? ` hos ${agencia}` : ''}`,
        contacto: 'Hvis du har spørgsmål, er du velkommen til at kontakte os på',
        gracias: `Tak fordi du har tillid til ${emailSeguimiento.nombreBotiga}!`
      },
      pl: {
        asunto: `Twoje zamówienie #${order_id} jest w drodze 📦`,
        titulo: 'Twoje zamówienie jest w drodze!',
        hola: 'Cześć',
        mensaje: `Informujemy, że Twoje zamówienie <strong>#${order_id}</strong> zostało wysłane${agencia ? ` za pośrednictwem ${agencia}` : ''}.`,
        num_seguimiento: 'Numer śledzenia',
        rastrear: `Śledź moje zamówienie${agencia ? ` w ${agencia}` : ''}`,
        contacto: 'Jeśli masz pytania, skontaktuj się z nami pod adresem',
        gracias: `Dziękujemy za zaufanie do ${emailSeguimiento.nombreBotiga}!`
      },
      fi: {
        asunto: `Tilauksesi #${order_id} on matkalla 📦`,
        titulo: 'Tilauksesi on matkalla!',
        hola: 'Hei',
        mensaje: `Ilmoitamme, että tilauksesi <strong>#${order_id}</strong> on lähetetty${agencia ? ` palvelulla ${agencia}` : ''}.`,
        num_seguimiento: 'Seurantanumero',
        rastrear: `Seuraa tilaustani${agencia ? ` palvelussa ${agencia}` : ''}`,
        contacto: 'Jos sinulla on kysyttävää, ota meihin yhteyttä osoitteessa',
        gracias: `Kiitos luottamuksestasi yritykseen ${emailSeguimiento.nombreBotiga}!`
      },
      no: {
        asunto: `Din bestilling #${order_id} er på vei 📦`,
        titulo: 'Din bestilling er på vei!',
        hola: 'Hei',
        mensaje: `Vi informerer om at din bestilling <strong>#${order_id}</strong> har blitt sendt${agencia ? ` med ${agencia}` : ''}.`,
        num_seguimiento: 'Sporingsnummer',
        rastrear: `Spor min bestilling${agencia ? ` hos ${agencia}` : ''}`,
        contacto: 'Hvis du har spørsmål, kontakt oss på',
        gracias: `Takk for at du stoler på ${emailSeguimiento.nombreBotiga}!`
      }
    };
    const tx = i18n[idioma] || i18n['es'];

    const rastrearBtn = url_rastreig
      ? `<div style="text-align:center; margin:20px 0;">
          <a href="${url_rastreig.startsWith('http') ? url_rastreig : 'https://' + url_rastreig}" 
            style="background:${emailSeguimiento.colorCabecera}; color:white; padding:12px 24px; text-decoration:none; border-radius:5px; display:inline-block; font-weight:bold;">
            📦 ${tx.rastrear}
          </a>
        </div>`
      : '';

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Miuart <contacto@miuart.com>',
        to: [email],
        subject: tx.asunto,
        html: `<!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8"/>
          <style>
            body { font-family:Arial,sans-serif; background:#f4f4f4; margin:0; padding:0; }
            .container { max-width:600px; margin:20px auto; background:white; border-radius:8px; overflow:hidden; box-shadow:0 0 10px rgba(0,0,0,0.1); }
            .header { background:${emailSeguimiento.colorCabecera}; color:white; padding:20px; text-align:center; }
            .header h1 { margin:0; font-size:24px; }
            .content { padding:25px; }
            .tracking-box { background:#f8f9fa; border:2px dashed ${emailSeguimiento.colorCabecera}; border-radius:8px; padding:15px; text-align:center; margin:20px 0; }
            .tracking-number { font-size:24px; font-weight:bold; color:${emailSeguimiento.colorTitulos}; letter-spacing:2px; }
            .footer { background:#f8f9fa; padding:15px; text-align:center; font-size:12px; color:#666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${tx.titulo}</h1>
            </div>
            <div class="content">
              <p>${tx.hola} <strong>${client_name}</strong>,</p>
              <p>${tx.mensaje}</p>
              <p><strong>${tx.num_seguimiento}:</strong></p>
              <div class="tracking-box">
                <div class="tracking-number">${tracking_number}</div>
              </div>
              ${rastrearBtn}
              <p>${tx.contacto} <a href="mailto:${emailSeguimiento.emailContacto}" style="color:${emailSeguimiento.colorTitulos};">${emailSeguimiento.emailContacto}</a></p>
              <p>${tx.gracias}</p>
            </div>
            <div class="footer">
              <p>© ${emailSeguimiento.any} ${emailSeguimiento.nombreBotiga} · 
                <a href="mailto:${emailSeguimiento.emailContacto}" style="color:${emailSeguimiento.colorTitulos};">${emailSeguimiento.emailContacto}</a>
              </p>
            </div>
          </div>
        </body>
        </html>`
      })
    });
    if (!res.ok) throw new Error('Error Resend');
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
}

async function handleAfegirNewsletter(request, env, corsHeaders) {
  try {
    const { email, nombre } = await request.json();
    if (!email) {
      return new Response(JSON.stringify({ error: 'Falta email' }), { status: 400, headers: corsHeaders });
    }
    // Guardar a Firestore via REST API
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/newsletter/${encodeURIComponent(email)}`;
    await fetch(firestoreUrl + '?key=' + env.FIREBASE_API_KEY, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          email: { stringValue: email },
          nombre: { stringValue: nombre || '' },
          activo: { booleanValue: true },
          fecha: { stringValue: new Date().toISOString() }
        }
      })
    });
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
}

async function handleDesuscribirse(request, env, corsHeaders) {
  try {
    const url = new URL(request.url);
    const email = url.searchParams.get('email');
    if (!email) {
      return new Response('Falta el email', { status: 400 });
    }
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/newsletter/${encodeURIComponent(email)}?key=${env.FIREBASE_API_KEY}`;
    const res = await fetch(firestoreUrl, {
      method: 'DELETE',
    });
    if (!res.ok && res.status !== 404) {
      const err = await res.text();
      return new Response('Error: ' + err, { status: 500 });
    }
    return new Response('Te has dado de baja del newsletter. ¡Hasta pronto!', { status: 200 });
  } catch (err) {
    return new Response('Error interno: ' + err.message, { status: 500 });
  }
}

async function handleEnviarNewsletter(request, env, corsHeaders) {
  try {
    const { asunto, htmlContent } = await request.json();

    // Llegir subscriptors actius de Firestore
    const subsUrl = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents:runQuery?key=${env.FIREBASE_API_KEY}`;
    const subsRes = await fetch(subsUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'newsletter' }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'activo' },
              op: 'EQUAL',
              value: { booleanValue: true }
            }
          }
        }
      })
    });
    const subsData = await subsRes.json();
    const subscriptors = subsData
      .filter(r => r.document)
      .map(r => r.document.fields.email?.stringValue)
      .filter(Boolean);

    if (subscriptors.length === 0) {
      return new Response(JSON.stringify({ success: true, sent: 0, message: 'No hay subscriptors activos' }), { status: 200, headers: corsHeaders });
    }

    // Enviar a cada subscriptor
    let sent = 0;
    for (const email of subscriptors) {
      const htmlFinal = htmlContent.replace('{{email}}', encodeURIComponent(email));
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: `Miuart <contacto@miuart.com>`,
          to: [email],
          subject: asunto,
          html: htmlFinal
        })
      });
      if (res.ok) sent++;
    }
    return new Response(JSON.stringify({ success: true, sent, total: subscriptors.length }), { status: 200, headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
}

async function handleNuevaComanda(request, env, corsHeaders) {
  try {
    const body = await request.json();
    const { client_name, client_email, client_phone, client_address, order_id, date, subtotal, envio, iva, total, productos_html, idioma } = body;
    const i18n = {
      es: {
        subject_prefix: 'Nuevo pedido',
        titulo: '¡Nuevo Pedido Recibido!',
        atencion: 'ATENCIÓN: Nuevo pedido pendiente',
        atencion_msg: 'Prepara el pedido para enviarlo lo antes posible',
        info_pedido: 'Información del Pedido',
        num_pedido: 'Nº Pedido',
        fecha: 'Fecha',
        estado: 'Estado',
        pendiente: 'PENDIENTE',
        datos_cliente: 'Datos del Cliente',
        nombre: 'Nombre',
        telefono: 'Teléfono',
        direccion_envio: 'Dirección de Envío',
        productos: 'Productos',
        resumen: 'Resumen del Pedido',
        subtotal: 'Subtotal',
        envio: 'Envío',
        iva: 'IVA',
        total: 'Total',
        acciones: 'Acciones rápidas',
        contactar: 'Contactar Cliente',
        llamar: 'Llamar Cliente',
        footer: 'Sistema de Notificaciones Automáticas',
        footer2: 'Este email fue generado automáticamente por el sistema de pedidos'
      },
      en: {
        subject_prefix: '🛒 New order',
        titulo: 'New Order Received!',
        atencion: 'ATTENTION: New pending order',
        atencion_msg: 'Prepare the order for shipping as soon as possible',
        info_pedido: 'Order Information',
        num_pedido: 'Order No.',
        fecha: 'Date',
        estado: 'Status',
        pendiente: 'PENDING',
        datos_cliente: 'Customer Details',
        nombre: 'Name',
        telefono: 'Phone',
        direccion_envio: 'Shipping Address',
        productos: 'Products',
        resumen: 'Order Summary',
        subtotal: 'Subtotal',
        envio: 'Shipping',
        iva: 'VAT',
        total: 'Total',
        acciones: 'Quick actions',
        contactar: 'Contact Customer',
        llamar: 'Call Customer',
        footer: 'Automatic Notification System',
        footer2: 'This email was automatically generated by the order system'
      },
      cat: {
        subject_prefix: 'Nova comanda',
        titulo: 'Nova Comanda Rebuda!',
        atencion: 'ATENCIÓ: Nova comanda pendent',
        atencion_msg: 'Prepara la comanda per enviar-la al més aviat possible',
        info_pedido: 'Informació de la Comanda',
        num_pedido: 'Núm. Comanda',
        fecha: 'Data',
        estado: 'Estat',
        pendiente: 'PENDENT',
        datos_cliente: 'Dades del Client',
        nombre: 'Nom',
        telefono: 'Telèfon',
        direccion_envio: 'Adreça d’Enviament',
        productos: 'Productes',
        resumen: 'Resum de la Comanda',
        subtotal: 'Subtotal',
        envio: 'Enviament',
        iva: 'IVA',
        total: 'Total',
        acciones: 'Accions ràpides',
        contactar: 'Contactar amb el Client',
        llamar: 'Trucar al Client',
        footer: 'Sistema de Notificacions Automàtiques',
        footer2: 'Aquest correu s’ha generat automàticament pel sistema de comandes'
      },
      fr: {
        subject_prefix: 'Nouvelle commande',
        titulo: 'Nouvelle Commande Reçue !',
        atencion: 'ATTENTION : Nouvelle commande en attente',
        atencion_msg: 'Préparez la commande pour l’expédier dès que possible',
        info_pedido: 'Informations sur la Commande',
        num_pedido: 'N° de Commande',
        fecha: 'Date',
        estado: 'État',
        pendiente: 'EN ATTENTE',
        datos_cliente: 'Coordonnées du Client',
        nombre: 'Nom',
        telefono: 'Téléphone',
        direccion_envio: 'Adresse d’Expédition',
        productos: 'Produits',
        resumen: 'Résumé de la Commande',
        subtotal: 'Sous-total',
        envio: 'Expédition',
        iva: 'TVA',
        total: 'Total',
        acciones: 'Actions rapides',
        contactar: 'Contacter le Client',
        llamar: 'Appeler le Client',
        footer: 'Système de Notifications Automatiques',
        footer2: 'Cet e-mail a été généré automatiquement par le système de commandes'
      },
      de: {
        subject_prefix: 'Neue Bestellung',
        titulo: 'Neue Bestellung erhalten!',
        atencion: 'ACHTUNG: Neue Bestellung ausstehend',
        atencion_msg: 'Bereiten Sie die Bestellung vor, um sie so schnell wie möglich zu versenden',
        info_pedido: 'Bestellinformationen',
        num_pedido: 'Bestell-Nr.',
        fecha: 'Datum',
        estado: 'Status',
        pendiente: 'AUSSTEHEND',
        datos_cliente: 'Kundendaten',
        nombre: 'Name',
        telefono: 'Telefon',
        direccion_envio: 'Lieferadresse',
        productos: 'Produkte',
        resumen: 'Bestellübersicht',
        subtotal: 'Zwischensumme',
        envio: 'Versand',
        iva: 'MwSt.',
        total: 'Gesamt',
        acciones: 'Schnellaktionen',
        contactar: 'Kunden kontaktieren',
        llamar: 'Kunden anrufen',
        footer: 'Automatisches Benachrichtigungssystem',
        footer2: 'Diese E-Mail wurde automatisch vom Bestellsystem generiert'
      },
      it: {
        subject_prefix: 'Nuovo ordine',
        titulo: 'Nuovo Ordine Ricevuto!',
        atencion: 'ATTENZIONE: Nuovo ordine in attesa',
        atencion_msg: 'Prepara l’ordine per spedirlo il prima possibile',
        info_pedido: 'Informazioni sull’Ordine',
        num_pedido: 'N. Ordine',
        fecha: 'Data',
        estado: 'Stato',
        pendiente: 'IN ATTESA',
        datos_cliente: 'Dati del Cliente',
        nombre: 'Nome',
        telefono: 'Telefono',
        direccion_envio: 'Indirizzo di Spedizione',
        productos: 'Prodotti',
        resumen: 'Riepilogo dell’Ordine',
        subtotal: 'Subtotale',
        envio: 'Spedizione',
        iva: 'IVA',
        total: 'Totale',
        acciones: 'Azioni rapide',
        contactar: 'Contatta il Cliente',
        llamar: 'Chiama il Cliente',
        footer: 'Sistema di Notifiche Automatiche',
        footer2: 'Questa email è stata generata automaticamente dal sistema ordini'
      },
      pt: {
        subject_prefix: 'Novo pedido',
        titulo: 'Novo Pedido Recebido!',
        atencion: 'ATENÇÃO: Novo pedido pendente',
        atencion_msg: 'Prepare o pedido para enviá-lo o mais rapidamente possível',
        info_pedido: 'Informações do Pedido',
        num_pedido: 'Nº do Pedido',
        fecha: 'Data',
        estado: 'Estado',
        pendiente: 'PENDENTE',
        datos_cliente: 'Dados do Cliente',
        nombre: 'Nome',
        telefono: 'Telefone',
        direccion_envio: 'Morada de Envio',
        productos: 'Produtos',
        resumen: 'Resumo do Pedido',
        subtotal: 'Subtotal',
        envio: 'Envio',
        iva: 'IVA',
        total: 'Total',
        acciones: 'Ações rápidas',
        contactar: 'Contactar Cliente',
        llamar: 'Ligar ao Cliente',
        footer: 'Sistema de Notificações Automáticas',
        footer2: 'Este e-mail foi gerado automaticamente pelo sistema de pedidos'
      },
      sv: {
        subject_prefix: 'Ny beställning',
        titulo: 'Ny beställning mottagen!',
        atencion: 'OBS: Ny väntande beställning',
        atencion_msg: 'Förbered beställningen för utskick så snart som möjligt',
        info_pedido: 'Beställningsinformation',
        num_pedido: 'Ordernr',
        fecha: 'Datum',
        estado: 'Status',
        pendiente: 'VÄNTANDE',
        datos_cliente: 'Kunduppgifter',
        nombre: 'Namn',
        telefono: 'Telefon',
        direccion_envio: 'Leveransadress',
        productos: 'Produkter',
        resumen: 'Orderöversikt',
        subtotal: 'Delsumma',
        envio: 'Frakt',
        iva: 'Moms',
        total: 'Totalt',
        acciones: 'Snabbåtgärder',
        contactar: 'Kontakta kund',
        llamar: 'Ring kund',
        footer: 'Automatiskt meddelandesystem',
        footer2: 'Detta e-postmeddelande genererades automatiskt av ordersystemet'
      },
      da: {
        subject_prefix: 'Ny ordre',
        titulo: 'Ny ordre modtaget!',
        atencion: 'BEMÆRK: Ny afventende ordre',
        atencion_msg: 'Gør ordren klar til afsendelse hurtigst muligt',
        info_pedido: 'Ordreinformation',
        num_pedido: 'Ordrenr.',
        fecha: 'Dato',
        estado: 'Status',
        pendiente: 'AFVENTER',
        datos_cliente: 'Kundeoplysninger',
        nombre: 'Navn',
        telefono: 'Telefon',
        direccion_envio: 'Leveringsadresse',
        productos: 'Produkter',
        resumen: 'Ordreoversigt',
        subtotal: 'Subtotal',
        envio: 'Fragt',
        iva: 'Moms',
        total: 'Total',
        acciones: 'Hurtige handlinger',
        contactar: 'Kontakt kunde',
        llamar: 'Ring til kunde',
        footer: 'Automatisk meddelelsessystem',
        footer2: 'Denne e-mail er genereret automatisk af ordresystemet'
      },
      pl: {
        subject_prefix: 'Nowe zamówienie',
        titulo: 'Otrzymano nowe zamówienie!',
        atencion: 'UWAGA: Nowe oczekujące zamówienie',
        atencion_msg: 'Przygotuj zamówienie do wysyłki tak szybko, jak to możliwe',
        info_pedido: 'Informacje o zamówieniu',
        num_pedido: 'Nr zamówienia',
        fecha: 'Data',
        estado: 'Status',
        pendiente: 'OCZEKUJĄCE',
        datos_cliente: 'Dane klienta',
        nombre: 'Imię i nazwisko',
        telefono: 'Telefon',
        direccion_envio: 'Adres dostawy',
        productos: 'Produkty',
        resumen: 'Podsumowanie zamówienia',
        subtotal: 'Wartość produktów',
        envio: 'Wysyłka',
        iva: 'VAT',
        total: 'Łącznie',
        acciones: 'Szybkie działania',
        contactar: 'Skontaktuj się z klientem',
        llamar: 'Zadzwoń do klienta',
        footer: 'System automatycznych powiadomień',
        footer2: 'Ta wiadomość została wygenerowana automatycznie przez system zamówień'
      },
      fi: {
        subject_prefix: 'Uusi tilaus',
        titulo: 'Uusi tilaus vastaanotettu!',
        atencion: 'HUOMIO: Uusi odottava tilaus',
        atencion_msg: 'Valmistele tilaus lähetettäväksi mahdollisimman pian',
        info_pedido: 'Tilauksen tiedot',
        num_pedido: 'Tilausnumero',
        fecha: 'Päivämäärä',
        estado: 'Tila',
        pendiente: 'ODOTTAA',
        datos_cliente: 'Asiakkaan tiedot',
        nombre: 'Nimi',
        telefono: 'Puhelinnumero',
        direccion_envio: 'Toimitusosoite',
        productos: 'Tuotteet',
        resumen: 'Tilauksen yhteenveto',
        subtotal: 'Välisumma',
        envio: 'Toimitus',
        iva: 'ALV',
        total: 'Yhteensä',
        acciones: 'Pikatoiminnot',
        contactar: 'Ota yhteyttä asiakkaaseen',
        llamar: 'Soita asiakkaalle',
        footer: 'Automaattinen ilmoitusjärjestelmä',
        footer2: 'Tämä sähköposti on tilausjärjestelmän automaattisesti luoma'
      },
      no: {
        subject_prefix: 'Ny bestilling',
        titulo: 'Ny bestilling mottatt!',
        atencion: 'VIKTIG: Ny ventende bestilling',
        atencion_msg: 'Klargjør bestillingen for sending så snart som mulig',
        info_pedido: 'Bestillingsinformasjon',
        num_pedido: 'Bestillingsnr.',
        fecha: 'Dato',
        estado: 'Status',
        pendiente: 'VENTER',
        datos_cliente: 'Kundeopplysninger',
        nombre: 'Navn',
        telefono: 'Telefon',
        direccion_envio: 'Leveringsadresse',
        productos: 'Produkter',
        resumen: 'Bestillingsoversikt',
        subtotal: 'Delsum',
        envio: 'Frakt',
        iva: 'MVA',
        total: 'Total',
        acciones: 'Hurtighandlinger',
        contactar: 'Kontakt kunde',
        llamar: 'Ring kunde',
        footer: 'Automatisk varslingssystem',
        footer2: 'Denne e-posten ble generert automatisk av bestillingssystemet'
      }
    };
    const tx = i18n[idioma] || i18n['es'];

    // Llegir configuració d'emails de Firestore
    let emailAdmin = {};
    try {
      const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/config/emails?key=${env.FIREBASE_API_KEY}`;
      const firestoreRes = await fetch(firestoreUrl);
      if (firestoreRes.ok) {
        const firestoreData = await firestoreRes.json();
        const fields = firestoreData.fields?.emailAdmin?.mapValue?.fields || {};
        emailAdmin = {
          colorCabecera: fields.colorCabecera?.stringValue || '#c0618a',
          colorTitulos: fields.colorTitulos?.stringValue || '#c0618a',
          colorTotal: fields.colorTotal?.stringValue || '#c0618a',
          colorSubtotalText: fields.colorSubtotalText?.stringValue || '#d63384',
          colorSubtotalBg: fields.colorSubtotalBg?.stringValue || '#fdf2f8',
          colorTotalBg: fields.colorTotalBg?.stringValue || '#f1cede',
          colorBotones: fields.colorBotones?.stringValue || '#c0618a',
          nombreBotiga: fields.nombreBotiga?.stringValue || 'Miuart',
          any: fields.any?.stringValue || fields.any?.integerValue || new Date().getFullYear()
        };
      }
    } catch(e) {
      // Si falla, usar valors per defecte
    }

    if (!order_id) {
      return new Response(JSON.stringify({ error: 'Falta order_id' }), { status: 400, headers: corsHeaders });
    }
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Miuart <contacto@miuart.com>',
        to: [env.RESEND_EMAIL_ADMIN],
        subject: `🛒 ${tx.subject_prefix} #${order_id.slice(-8).toUpperCase()} - ${client_name}`,
    
        html: `<!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8"/>
          <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
          <title>Nuevo Pedido - Miuart</title>
          <style>
            body { font-family:Arial,sans-serif; background:#f4f4f4; margin:0; padding:0; }
            .container { max-width:600px; margin:20px auto; background:white; border-radius:8px; overflow:hidden; box-shadow:0 0 10px rgba(0,0,0,0.1); }
            .header { background:${emailAdmin.colorCabecera}; color:white; padding:20px; text-align:center; }
            .header h1 { margin:0; font-size:24px; }
            .content { padding:25px; }
            .section { margin-bottom:20px; }
            .section h2 { color:${emailAdmin.colorTitulos}; border-bottom:1px solid #eee; padding-bottom:8px; font-size:18px; }
            table { width:100%; border-collapse:collapse; margin:15px 0; font-size:14px; }
            th { background:#f8f9fa; text-align:left; padding:10px; font-weight:bold; }
            td { padding:10px; border-bottom:1px solid #eee; }
            .total { font-weight:bold; background:${emailAdmin.colorTotalBg}; }
            .urgent { background:#fff3cd; border:1px solid #ffeaa7; border-radius:8px; padding:15px; text-align:center; margin:20px 0; }
            .footer { background:#f8f9fa; padding:15px; text-align:center; font-size:12px; color:#666; }
            .action-btn { background:${emailAdmin.colorBotones}; color:white; padding:10px 20px; text-decoration:none; border-radius:5px; display:inline-block; margin:10px 5px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${tx.titulo}</h1>
              <p>Pedido #${order_id} - ${date}</p>
            </div>
            <div class="content">
              <div class="urgent">
                <h3 style="margin:0; color:#856404;">📦 ${tx.atencion}</h3>
                <p style="margin:8px 0;">${tx.atencion_msg}</p>
              </div>
              <div class="section">
                <h2>${tx.info_pedido}</h2>
                <p><strong>${tx.num_pedido}:</strong> ${order_id}</p>
                <p><strong>${tx.fecha}:</strong> ${date}</p>
                <p><strong>${tx.estado}:</strong> <span style="color:${emailAdmin.colorTitulos}; font-weight:bold;">${tx.pendiente}</span></p>
              </div>
              <div class="section">
                <h2>${tx.datos_cliente}</h2>
                <p><strong>${tx.nombre}:</strong> ${client_name}</p>
                <p><strong>Email:</strong> ${client_email}</p>
                <p><strong>${tx.telefono}:</strong> ${client_phone}</p>
              </div>
              <div class="section">
                <h2>${tx.direccion_envio}</h2>
                <p style="white-space:pre-line;">${client_address}</p>
              </div>
              <div class="section">
                <h2>${tx.productos}</h2>
                ${productos_html}
              </div>
              <div class="section">
                <h2>${tx.resumen}</h2>
                <table>
                  <tr><td>${tx.subtotal}:</td><td style="text-align:right;">${subtotal}</td></tr>
                  <tr><td>${tx.envio}:</td><td style="text-align:right;">${envio}</td></tr>
                  <tr><td>${tx.iva}:</td><td style="text-align:right;">${iva}</td></tr>
                  <tr class="total"><td><strong>${tx.total}:</strong></td><td style="text-align:right; color:${emailAdmin.colorTotal};"><strong>${total}</strong></td></tr>
                </table>
              </div>
              <div style="text-align:center; margin:25px 0;">
                <p style="color:#666; margin-bottom:15px;">${tx.acciones}:</p>
                <a href="mailto:${client_email}?subject=Pedido ${order_id} - Miuart" class="action-btn">📧 ${tx.contactar}</a>
                <a href="tel:${client_phone}" class="action-btn">📞 ${tx.llamar}</a>
              </div>
              <div class="footer">
                <p>© ${emailAdmin.any} ${emailAdmin.nombreBotiga} | ${tx.footer}</p>
                <p><small>${tx.footer2}</small></p>
              </div>
            </div>
          </div>
        </body>
        </html>`
      })
    });
     if (!res.ok) {
      const resErr = await res.json();
      throw new Error('Error Resend: ' + JSON.stringify(resErr));
    }
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
}

async function handleEnlaceDescarga(request, env, corsHeaders) {
  try {
    const { email, client_name, order_id, enlace_descarga, idioma } = await request.json();
    if (!email || !order_id || !enlace_descarga) {
      return new Response(JSON.stringify({ error: 'Faltan datos obligatorios' }), { status: 400, headers: corsHeaders });
    }

    // Llegir configuració d'emails de Firestore
    let emailSeguimiento = {};
    try {
      const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/config/emails?key=${env.FIREBASE_API_KEY}`;
      const firestoreRes = await fetch(firestoreUrl);
      if (firestoreRes.ok) {
        const firestoreData = await firestoreRes.json();
        const fields = firestoreData.fields?.emailSeguimiento?.mapValue?.fields || {};
        emailSeguimiento = {
          colorCabecera: fields.colorCabecera?.stringValue || '#c0618a',
          colorTitulos: fields.colorTitulos?.stringValue || '#c0618a',
          nombreBotiga: fields.nombreBotiga?.stringValue || 'Miuart',
          emailContacto: fields.emailContacto?.stringValue || 'miuartclientes@gmail.com',
          any: fields.any?.stringValue || fields.any?.integerValue || new Date().getFullYear()
        };
      }
    } catch(e) {}

    const i18n = {
      es: {
        asunto: `Tu pedido #${order_id} está listo para descargar 📥`,
        titulo: '¡Tu pedido está listo!',
        hola: 'Hola',
        mensaje: `Tu pedido <strong>#${order_id}</strong> ya está disponible para descargar.`,
        btn_descargar: 'Descargar mi pedido',
        contacto: 'Si tienes alguna pregunta, contáctanos en',
        gracias: `¡Gracias por confiar en ${emailSeguimiento.nombreBotiga}!`
      },
      en: {
        asunto: `Your order #${order_id} is ready to download 📥`,
        titulo: 'Your order is ready!',
        hola: 'Hello',
        mensaje: `Your order <strong>#${order_id}</strong> is now available for download.`,
        btn_descargar: 'Download my order',
        contacto: 'If you have any questions, contact us at',
        gracias: `Thank you for trusting ${emailSeguimiento.nombreBotiga}!`
      },
      cat: {
        asunto: `La teva comanda #${order_id} està llesta per descarregar 📥`,
        titulo: 'La teva comanda està llesta!',
        hola: 'Hola',
        mensaje: `La teva comanda <strong>#${order_id}</strong> ja està disponible per descarregar.`,
        btn_descargar: 'Descarregar la meva comanda',
        contacto: 'Si tens alguna pregunta, contacta amb nosaltres a',
        gracias: `Gràcies per confiar en ${emailSeguimiento.nombreBotiga}!`
      },
      fr: {
        asunto: `Votre commande #${order_id} est prête à être téléchargée 📥`,
        titulo: 'Votre commande est prête !',
        hola: 'Bonjour',
        mensaje: `Votre commande <strong>#${order_id}</strong> est maintenant disponible au téléchargement.`,
        btn_descargar: 'Télécharger ma commande',
        contacto: 'Si vous avez des questions, contactez-nous à',
        gracias: `Merci de votre confiance en ${emailSeguimiento.nombreBotiga} !`
      },
      de: {
        asunto: `Deine Bestellung #${order_id} steht zum Download bereit 📥`,
        titulo: 'Deine Bestellung ist bereit!',
        hola: 'Hallo',
        mensaje: `Deine Bestellung <strong>#${order_id}</strong> ist jetzt zum Download verfügbar.`,
        btn_descargar: 'Meine Bestellung herunterladen',
        contacto: 'Wenn du Fragen hast, kontaktiere uns unter',
        gracias: `Vielen Dank für dein Vertrauen in ${emailSeguimiento.nombreBotiga}!`
      },
      it: {
        asunto: `Il tuo ordine #${order_id} è pronto per il download 📥`,
        titulo: 'Il tuo ordine è pronto!',
        hola: 'Ciao',
        mensaje: `Il tuo ordine <strong>#${order_id}</strong> è ora disponibile per il download.`,
        btn_descargar: 'Scarica il mio ordine',
        contacto: 'Se hai domande, contattaci a',
        gracias: `Grazie per aver scelto ${emailSeguimiento.nombreBotiga}!`
      },
      pt: {
        asunto: `O teu pedido #${order_id} está pronto para descarregar 📥`,
        titulo: 'O teu pedido está pronto!',
        hola: 'Olá',
        mensaje: `O teu pedido <strong>#${order_id}</strong> já está disponível para descarregar.`,
        btn_descargar: 'Descarregar o meu pedido',
        contacto: 'Se tiveres alguma dúvida, contacta-nos em',
        gracias: `Obrigado por confiares em ${emailSeguimiento.nombreBotiga}!`
      },
      sv: {
        asunto: `Din beställning #${order_id} är klar för nedladdning 📥`,
        titulo: 'Din beställning är klar!',
        hola: 'Hej',
        mensaje: `Din beställning <strong>#${order_id}</strong> är nu tillgänglig för nedladdning.`,
        btn_descargar: 'Ladda ner min beställning',
        contacto: 'Om du har några frågor, kontakta oss på',
        gracias: `Tack för att du väljer ${emailSeguimiento.nombreBotiga}!`
      },
      da: {
        asunto: `Din ordre #${order_id} er klar til download 📥`,
        titulo: 'Din ordre er klar!',
        hola: 'Hej',
        mensaje: `Din ordre <strong>#${order_id}</strong> er nu klar til download.`,
        btn_descargar: 'Download min ordre',
        contacto: 'Hvis du har spørgsmål, kan du kontakte os på',
        gracias: `Tak for din tillid til ${emailSeguimiento.nombreBotiga}!`
      },
      pl: {
        asunto: `Twoje zamówienie #${order_id} jest gotowe do pobrania 📥`,
        titulo: 'Twoje zamówienie jest gotowe!',
        hola: 'Cześć',
        mensaje: `Twoje zamówienie <strong>#${order_id}</strong> jest już dostępne do pobrania.`,
        btn_descargar: 'Pobierz moje zamówienie',
        contacto: 'Jeśli masz pytania, skontaktuj się z nami pod adresem',
        gracias: `Dziękujemy za zaufanie do ${emailSeguimiento.nombreBotiga}!`
      },
      fi: {
        asunto: `Tilauksesi #${order_id} on valmis ladattavaksi 📥`,
        titulo: 'Tilauksesi on valmis!',
        hola: 'Hei',
        mensaje: `Tilauksesi <strong>#${order_id}</strong> on nyt ladattavissa.`,
        btn_descargar: 'Lataa tilaukseni',
        contacto: 'Jos sinulla on kysyttävää, ota meihin yhteyttä osoitteeseen',
        gracias: `Kiitos luottamuksestasi kauppaan ${emailSeguimiento.nombreBotiga}!`
      },
      no: {
        asunto: `Din bestilling #${order_id} er klar for nedlasting 📥`,
        titulo: 'Din bestilling er klar!',
        hola: 'Hei',
        mensaje: `Din bestilling <strong>#${order_id}</strong> er nå tilgjengelig for nedlasting.`,
        btn_descargar: 'Last ned min bestilling',
        contacto: 'Hvis du har spørsmål, kontakt oss på',
        gracias: `Takk for at du velger ${emailSeguimiento.nombreBotiga}!`
      }
    };
    const tx = i18n[idioma] || i18n['es'];

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Miuart <contacto@miuart.com>',
        to: [email],
        subject: tx.asunto,
        html: `<!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8"/>
          <style>
            body { font-family:Arial,sans-serif; background:#f4f4f4; margin:0; padding:0; }
            .container { max-width:600px; margin:20px auto; background:white; border-radius:8px; overflow:hidden; box-shadow:0 0 10px rgba(0,0,0,0.1); }
            .header { background:${emailSeguimiento.colorCabecera}; color:white; padding:20px; text-align:center; }
            .header h1 { margin:0; font-size:24px; }
            .content { padding:25px; }
            .footer { background:#f8f9fa; padding:15px; text-align:center; font-size:12px; color:#666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${tx.titulo}</h1>
            </div>
            <div class="content">
              <p>${tx.hola} <strong>${client_name}</strong>,</p>
              <p>${tx.mensaje}</p>
              <div style="text-align:center; margin:30px 0;">
                <a href="${enlace_descarga}" 
                  style="background:${emailSeguimiento.colorCabecera}; color:white; padding:14px 28px; text-decoration:none; border-radius:5px; display:inline-block; font-weight:bold; font-size:16px;">
                  📥 ${tx.btn_descargar}
                </a>
              </div>
              <p>${tx.contacto} <a href="mailto:${emailSeguimiento.emailContacto}" style="color:${emailSeguimiento.colorTitulos};">${emailSeguimiento.emailContacto}</a></p>
              <p>${tx.gracias}</p>
            </div>
            <div class="footer">
              <p>© ${emailSeguimiento.any} ${emailSeguimiento.nombreBotiga} · 
                <a href="mailto:${emailSeguimiento.emailContacto}" style="color:${emailSeguimiento.colorTitulos};">${emailSeguimiento.emailContacto}</a>
              </p>
            </div>
          </div>
        </body>
        </html>`
      })
    });
    if (!res.ok) throw new Error('Error Resend');
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
}