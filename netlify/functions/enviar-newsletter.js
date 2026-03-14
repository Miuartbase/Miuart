const admin = require("firebase-admin");
const fs = require("fs");
const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

// Aquesta funció s’executa mensualment o manualment
exports.handler = async (event) => {
  console.log("📬 Iniciant enviament de newsletter MiUArt...");

  try {
    const db = admin.firestore();

    // === 1️⃣ Llegir logo des de config/logo/url ===
    const configDoc = await db.collection("config").doc("logo").get();
    const logoUrl = configDoc.exists ? configDoc.data().url : "";

    // === 2️⃣ Llegir productes amb "novedades" = true ===
    const snap = await db.collection("productes").where("novedades", "==", true).get();
    const productes = snap.docs.map((doc) => {
      const d = doc.data();
      return {
        nom: d.nom || d.nombre || "Producto sin nombre",
        imatge: d.variants?.[0]?.imatges?.[0] || "",
      };
    });

    // === 3️⃣ Llegir bloc promocional (HTML extern) ===
    let promoHTML = "";
    try {
      promoHTML = fs.readFileSync("./public/promos/promocional.html", "utf8");
    } catch {
      promoHTML = "<p style='text-align:center;'>Sin contenido promocional.</p>";
    }

    // === 4️⃣ Construir HTML del newsletter ===
    const productesHTML = productes
      .map(
        (p) => `
        <div style="text-align:center; margin:30px 0;">
          <img src="${p.imatge}" alt="${p.nom}" style="width:280px; border-radius:12px; box-shadow:0 2px 6px rgba(0,0,0,0.1);">
          <h3 style="font-family:'Arial Black', sans-serif; color:#e9acc8; text-transform:uppercase; margin-top:10px;">${p.nom}</h3>
        </div>`
      )
      .join("");

    const html = `
    <div style="background:#fdf2f8; font-family:Arial, sans-serif; padding:30px; text-align:center;">
      <img src="${logoUrl}" alt="MiUArt" style="max-width:180px; margin-bottom:20px;">
      <h1 style="color:#e9acc8; font-size:24px; margin-bottom:10px;">🩷 Novedades de este mes 🩷</h1>
      <p style="font-size:16px; color:#444;">Descubre las últimas incorporaciones de nuestra colección MiUArt</p>

      <div style="margin-top:40px;">${productesHTML}</div>
      <div style="margin-top:40px;">${promoHTML}</div>

      <div style="text-align:center; margin-top:40px;">
        <p style="font-size:16px; color:#333;">¡Síguenos en Instagram y entérate de todas nuestras novedades!</p>
        <a href="https://www.instagram.com/miuart.oficial" target="_blank">
          <img src="https://cdn-icons-png.flaticon.com/512/2111/2111463.png" alt="Instagram" style="width:40px; margin-top:10px;">
        </a>
      </div>

      <footer style="margin-top:50px; font-size:12px; color:#888;">
        <p>©️ 2025 MiUArt. Todos los derechos reservados.</p>
        <p style="margin-top:10px;">
          Si no vols rebre més novetats, fes clic aquí per <a href="https://botigamiuart.netlify.app/.netlify/functions/desuscribirse?email={{email}}" style="color:#e9acc8;">donar-te de baixa</a>.
        </p>
      </footer>
    </div>`;

    // === 5️⃣ Llegir subscriptors de Firebase ===
    const subsSnap = await db.collection("clients").where("volNewsletter", "==", true).get();
    const subscriptors = subsSnap.docs.map(doc => ({ email: doc.data().email, id: doc.id })).filter(s => s.email);

    if (subscriptors.length === 0) {
      console.log("⚠️ No hi ha subscriptors actius per enviar el newsletter");
      return { statusCode: 200, body: JSON.stringify({ success: true, message: "No subscriptors actius" }) };
    }

    console.log(`📧 Enviant a ${subscriptors.length} subscriptors...`);

    // === 6️⃣ Enviar el correu via Brevo ===
    for (const sub of subscriptors) {
      const htmlFinal = html.replace("{{email}}", encodeURIComponent(sub.email));

      const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          accept: "application/json",
          "api-key": process.env.BREVO_API_KEY,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          sender: { name: "MiUArt", email: process.env.BREVO_SENDER },
          to: [{ email: sub.email }],
          subject: "🩷 Novedades de este mes en MiUArt",
          htmlContent: htmlFinal,
        }),
      });

      const data = await brevoResponse.json();
      if (!brevoResponse.ok) console.error(`❌ Error enviant a ${sub.email}:`, data);
    }

    console.log("✅ Newsletter enviat correctament a tots els subscriptors!");
    return { statusCode: 200, body: JSON.stringify({ success: true, sent: subscriptors.length }) };

  } catch (err) {
    console.error("💥 Error enviant newsletter:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
