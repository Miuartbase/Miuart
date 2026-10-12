const admin = require("firebase-admin");
const { Resend } = require("resend");

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

exports.handler = async (event) => {
  console.log("📬 Iniciant enviament de newsletter Tradenfy...");

  try {
    const db = admin.firestore();

    // === 1. Llegir logo ===
    const configDoc = await db.collection("config").doc("logo").get();
    const logoUrl = configDoc.exists ? configDoc.data().url : "";

    // === 2. Llegir productes amb novedades = true ===
    const snap = await db.collection("productes").where("novedades", "==", true).get();
    const productes = snap.docs.map((doc) => {
      const d = doc.data();
      return {
        nom: d.nom || d.nombre || "Producto sin nombre",
        imatge: d.variants?.[0]?.imatges?.[0] || "",
      };
    });

    // === 3. Construir HTML ===
    const productesHTML = productes.map((p) => `
      <div style="text-align:center; margin:30px 0;">
        <img src="${p.imatge}" alt="${p.nom}" style="width:280px; border-radius:12px;">
        <h3 style="color:#e9acc8; text-transform:uppercase; margin-top:10px;">${p.nom}</h3>
      </div>`
    ).join("");

    const html = `
    <div style="background:#fdf2f8; font-family:Arial, sans-serif; padding:30px; text-align:center;">
      <img src="${logoUrl}" alt="Tradenfy" style="max-width:180px; margin-bottom:20px;">
      <h1 style="color:#e9acc8;">🩷 Novedades de este mes 🩷</h1>
      <div style="margin-top:40px;">${productesHTML}</div>
      <footer style="margin-top:50px; font-size:12px; color:#888;">
        <p>© 2026 Tradenfy. Todos los derechos reservados.</p>
        <p><a href="https://tradenfy.netlify.app/.netlify/functions/desuscribirse?email={{email}}" style="color:#e9acc8;">Darse de baja</a></p>
      </footer>
    </div>`;

    // === 4. Llegir subscriptors de Firebase ===
    const subsSnap = await db.collection("clients").where("volNewsletter", "==", true).get();
    const subscriptors = subsSnap.docs.map(doc => ({ email: doc.data().email, id: doc.id })).filter(s => s.email);

    if (subscriptors.length === 0) {
      return { statusCode: 200, body: JSON.stringify({ success: true, message: "No hay subscriptors activos" }) };
    }

    // === 5. Enviar via Resend ===
    const resend = new Resend(process.env.RESEND_API_KEY);

    for (const sub of subscriptors) {
      const htmlFinal = html.replace("{{email}}", encodeURIComponent(sub.email));
      await resend.emails.send({
        from: "Tradenfy <contacto@tradenfy.com>",
        to: [sub.email],
        subject: "🩷 Novedades de este mes en Tradenfy",
        html: htmlFinal,
      });
    }

    console.log(`✅ Newsletter enviat a ${subscriptors.length} subscriptors!`);
    return { statusCode: 200, body: JSON.stringify({ success: true, sent: subscriptors.length }) };

  } catch (err) {
    console.error("💥 Error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};