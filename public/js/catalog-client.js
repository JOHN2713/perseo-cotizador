// Catálogo simplificado para frontend
export const CATALOG = {
  tax: 0.15,
  products: {
    PC: {
      plans: {
        Comercial:   { label: "Perseo PC Comercial Compra (1 servidor + 3 estaciones)", price: 2500 },
        Control:     { label: "Perseo PC Control Compra (1 servidor + 2 estaciones)", price: 1400 },
        Facturacion: { label: "Perseo PC Facturación Compra (1 servidor + 1 estación)", price: 700 }
      },
      modules: [
        { sku:"SERV_PRIMER_ANIO", name:"Serv. Primer Año", price:210, type:"one_time" },
        { sku:"FE_ILIMITADA",    name:"Facturación Electrónica Ilimitada", price:500, type:"one_time" },
        { sku:"TABLEROS",        name:"Tableros Gráficos de Control", price:500, type:"one_time" },
        { sku:"AUTO_CLIENTES",   name:"Creación Automática de Clientes", price:100, type:"one_time" },
        { sku:"IMP_SRI",         name:"Importación de Compras desde el SRI", price:200, type:"one_time" },
        { sku:"APP_MOVIL",       name:"App móvil", price:20, type:"per_unit" }
      ]
    }
  }
};
