// server/pricing.js
import { CATALOG } from "./catalog.js";  // 👈 IMPORTANTE
export function stationsCost(n) {
    if (n <= 3) {
        return { price: 210, discount: 0, net: 210 };
    }
    if (n <= 10) {
        return { price: 210, discount: 0, net: 210 };
    }
    return { price: n * 20, discount: 0, net: n * 20 };
}

export function buildQuote({ product = "PC", planKey, servers = 1, stations = 1, modules = [], advisor, customer }) {
    const plan = CATALOG.products[product].plans[planKey];
    if (!plan) throw new Error("Plan inválido");

    const items = [];

    // Plan siempre con precio completo
    items.push({ name: plan.label, price: plan.price, discount: 0, net: plan.price });

    // Estaciones
    const stationLine = stationsCost(stations);
    items.push({ name: `Estaciones (${stations})`, ...stationLine });

    // Módulos
    modules.forEach(m => {
        const mod = CATALOG.products[product].modules.find(x => x.sku === m.sku);
        if (!mod) return;
        const qty = Math.max(1, m.qty || 1);
        const rawPrice = mod.type === "per_unit" ? mod.price * qty : mod.price;

        let net = 0;
        let discount = 100;

        // Excepción: App móvil → se cobra normal
        if (mod.sku === "APP_MOVIL") {
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

    // Totales
    const subTotal = +items.reduce((s, i) => s + i.price, 0).toFixed(2);
    const discountTotal = +items.reduce((s, i) => s + (i.price - i.net), 0).toFixed(2);
    const net = subTotal - discountTotal;
    const iva = +(net * CATALOG.tax).toFixed(2);
    const total = +(net + iva).toFixed(2);

    return {
        meta: { product, planKey, advisor, customer, createdAt: new Date() },
        items,
        subTotal,
        discountTotal,
        net,
        iva,
        total
    };
}
