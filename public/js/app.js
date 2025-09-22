import { CATALOG } from "./catalog-client.js";
import { isCedulaValid, isRucValid } from "./ecuador-id.js";

// Referencias a elementos
const els = {
    product: document.getElementById("product"),
    planKey: document.getElementById("planKey"),
    servers: document.getElementById("servers"),
    stations: document.getElementById("stations"),
    modules: document.getElementById("modules"),
    advisor: document.getElementById("advisor"),
    idNumber: document.getElementById("idNumber"),
    company: document.getElementById("company"),
    summary: document.getElementById("summary"),
    btnSave: document.getElementById("btnSave"),
    btnPdf: document.getElementById("btnPdf"),
};

const state = { product: "PC", planKey: "Comercial", servers: 1, stations: 1, modules: [] };

function priceStations(n) {
    if (n <= 3) {
        return { price: 210, discount: 0, net: 210 };
    }
    if (n <= 10) {
        return { price: 210, discount: 0, net: 210 };
    }
    return { price: n * 20, discount: 0, net: n * 20 };
}

// Render módulos dinámicos
function renderModules() {
    const list = CATALOG.products[state.product].modules;
    els.modules.innerHTML = list.map(m => `
    <label class="border rounded-lg p-3 flex items-center gap-2">
      <input type="checkbox" data-sku="${m.sku}" class="mod-check">
      <span class="text-sm">${m.name} — $${m.price}${m.type === "per_unit" ? " /u" : ""}</span>
      ${m.type === "per_unit" ? `<input type="number" min="1" value="1" data-qty="${m.sku}" class="ml-auto w-20 border rounded p-1 text-sm">` : ""}
    </label>
  `).join("");

    els.modules.querySelectorAll(".mod-check").forEach(ch => {
        ch.addEventListener("change", () => {
            const sku = ch.dataset.sku;
            if (ch.checked) {
                const qtyEl = els.modules.querySelector(`[data-qty="${sku}"]`);
                state.modules.push({ sku, qty: qtyEl ? +qtyEl.value : 1 });
            } else {
                state.modules = state.modules.filter(x => x.sku !== sku);
            }
            renderSummary();
        });
    });

    els.modules.querySelectorAll("[data-qty]").forEach(inp => {
        inp.addEventListener("input", () => {
            const sku = inp.dataset.qty;
            const it = state.modules.find(x => x.sku === sku);
            if (it) { it.qty = Math.max(1, +inp.value || 1); renderSummary(); }
        });
    });
}

// Render tabla de resumen
function renderSummary() {
    const plan = CATALOG.products[state.product].plans[state.planKey];
    const items = [];

    // Plan
    items.push({ name: plan.label, price: plan.price, discount: 0, net: plan.price });

    // Estaciones
    const st = priceStations(state.stations);
    items.push({ name: `Estaciones (${state.stations})`, ...st });

    // Módulos
    state.modules.forEach(m => {
        const mod = CATALOG.products[state.product].modules.find(x => x.sku === m.sku);
        const qty = m.qty || 1;
        const rawPrice = mod.type === "per_unit" ? mod.price * qty : mod.price;

        let net = 0;
        let discount = 100;

        if (mod.sku === "APP_MOVIL") { // excepción
            net = rawPrice;
            discount = 0;
        }

        items.push({
            name: `${mod.name}${mod.type === "per_unit" ? ` x${qty}` : ""}`,
            price: rawPrice,
            discount,
            net
        });
    });

    const sub = items.reduce((s, i) => s + i.price, 0);
    const desc = items.reduce((s, i) => s + (i.price - i.net), 0);
    const net = sub - desc;
    const iva = +(net * CATALOG.tax).toFixed(2);
    const total = +(net + iva).toFixed(2);

    els.summary.innerHTML = `
    <table class="w-full text-sm">
      <thead><tr class="bg-gray-100">
        <th class="text-left p-2">Módulos</th>
        <th class="p-2 text-right">Precio</th>
        <th class="p-2 text-right">Desc</th>
        <th class="p-2 text-right">Neto</th>
      </tr></thead>
      <tbody>
        ${items.map(r => `
          <tr class="border-b">
            <td class="p-2">${r.name}</td>
            <td class="p-2 text-right">$${r.price.toFixed(2)}</td>
            <td class="p-2 text-right">${r.discount}%</td>
            <td class="p-2 text-right">$${r.net.toFixed(2)}</td>
          </tr>
        `).join("")}
        <tr><td></td><td></td><td class="p-2 font-semibold text-right">SubTotal</td><td class="p-2 text-right">$${sub.toFixed(2)}</td></tr>
        <tr><td></td><td></td><td class="p-2 font-semibold text-right">Desc. Total</td><td class="p-2 text-right">-$${desc.toFixed(2)}</td></tr>
        <tr><td></td><td></td><td class="p-2 font-semibold text-right">Subtotal Neto</td><td class="p-2 text-right">$${net.toFixed(2)}</td></tr>
        <tr><td></td><td></td><td class="p-2 font-semibold text-right">IVA 15%</td><td class="p-2 text-right">$${iva.toFixed(2)}</td></tr>
        <tr><td></td><td></td><td class="p-2 font-bold text-right">Total</td><td class="p-2 font-bold text-right">$${total.toFixed(2)}</td></tr>
      </tbody>
    </table>`;
}

// Eventos
["product", "planKey", "servers", "stations"].forEach(id => {
    document.getElementById(id).addEventListener("input", e => {
        state[id] = (id === "servers" || id === "stations") ? Math.max(1, +e.target.value || 1) : e.target.value;
        renderSummary();
    });
});

els.idNumber.addEventListener("blur", () => {
    const v = els.idNumber.value.trim();
    const ok = isCedulaValid(v) || isRucValid(v);
    els.idNumber.classList.toggle("border-red-500", !ok);
});

els.btnSave.addEventListener("click", async () => {
    const payload = {
        state,
        advisor: els.advisor.value,
        company: els.company.value,
        idNumber: els.idNumber.value
    };

    const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (data.ok) {
        state.code = data.code;  // 👈 Guardar el código
        alert("✅ Cotización guardada: " + state.code);
    } else {
        alert("❌ Error: " + (data.error || "No se pudo guardar"));
    }
});

els.btnPdf.addEventListener("click", () => {
    if (!state.code) {
        alert("⚠️ Primero guarda la cotización.");
        return;
    }
    // Abrir PDF generado por backend
    window.open(`/api/quotes/${state.code}/pdf`, "_blank");
});


// Inicializar
renderModules();
renderSummary();
