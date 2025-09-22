export const CATALOG = {
  tax: 0.15,
  pricingRules: {
    stations: { base_upto_10: 210, per_unit_all_if_gt_10: 20 },
  },
  products: {
    PC: {
      plans: {
        Comercial:   { label: "Perseo PC Comercial Compra (1 servidor + 3 estaciones)", price: 2500, includes: { servers:1, stations:3 } },
        Control:     { label: "Perseo PC Control Compra (1 servidor + 2 estaciones)",   price: 1400, includes: { servers:1, stations:2 } },
        Facturacion: { label: "Perseo PC Facturación Compra (1 servidor + 1 estación)", price:  700, includes: { servers:1, stations:1 } }
      },
      modules: [
        { sku:"SERV_PRIMER_ANIO", name:"Serv. Primer Año", price:210, type:"one_time" },
        { sku:"FE_ILIMITADA",    name:"Facturación Electrónica Ilimitada", price:500, type:"one_time" },
        { sku:"TABLEROS",        name:"Tableros Gráficos de Control",       price:500, type:"one_time" },
        { sku:"AUTO_CLIENTES",   name:"Creación Automática de Clientes",    price:100, type:"one_time" },
        { sku:"IMP_SRI",         name:"Importación de Compras desde el SRI",price:200, type:"one_time" },
        { sku:"APP_MOVIL",       name:"App móvil", price:20, type:"per_unit" }
      ]
    }
  }
};
