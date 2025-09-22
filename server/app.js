import express from "express";
import { Pool } from "pg";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { CATALOG } from "./catalog.js";
import { buildQuote } from "./pricing.js";
import fs from "fs";
import PDFDocument from "pdfkit";

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

app.get("/api/catalog", (req, res) => res.json(CATALOG));

function genCode() { return "Q" + Date.now().toString().slice(-8); }

app.post("/api/quotes", async (req, res) => {
    try {
        const { state, advisor, company, idNumber } = req.body;
        const q = buildQuote({
            product: state.product,
            planKey: state.planKey,
            servers: state.servers,
            stations: state.stations,
            modules: state.modules,
            advisor,
            customer: { company, idNumber }
        });

        const client = await pool.connect();
        try {
            const code = genCode();
            const ins = await client.query(
                `insert into quotes 
                (code, product, plan_key, advisor, company, id_number, payload, subtotal, discount_total, net, iva, total)
                values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) returning id, code`,
                [code, state.product, state.planKey, advisor, company, idNumber, q, q.subTotal, q.discountTotal, q.net, q.iva, q.total]
            );
            const quoteId = ins.rows[0].id;
            for (const it of q.items) {
                await client.query(
                    `insert into quote_items (quote_id, name, price, discount, net) values ($1,$2,$3,$4,$5)`,
                    [quoteId, it.name, it.price, it.discount, it.net]
                );
            }
            res.json({ ok: true, code: ins.rows[0].code, message: "Cotización guardada" });
        } finally { client.release(); }
    } catch (e) {
        console.error(e);
        res.status(500).json({ ok: false, error: e.message });
    }
});

app.get("/api/quotes/:code/pdf", async (req, res) => {
    const { code } = req.params;
    const client = await pool.connect();

    try {
        const q = await client.query("SELECT * FROM quotes WHERE code=$1", [code]);
        if (q.rows.length === 0) return res.status(404).send("Cotización no encontrada");
        const quote = q.rows[0];
        const items = await client.query("SELECT * FROM quote_items WHERE quote_id=$1", [quote.id]);

        // Crear el PDF
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        let buffers = [];
        doc.on("data", buffers.push.bind(buffers));
        doc.on("end", () => {
            const pdfData = Buffer.concat(buffers);
            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", `attachment; filename="cotizacion-${quote.code}.pdf"`);
            res.send(pdfData);
        });

        // Ajustar márgenes y dimensiones generales
        const margin = 50;
        const pageWidth = doc.page.width - (margin * 2);

        // Encabezado con logo y título
        doc.image(path.join(__dirname, "../public/img/per-negro.png"), margin, margin, { width: 100 });
        doc.fontSize(10).text(`Cotización ${quote.code}`, 400, margin, { align: "right" });

        // Info del cliente (posicionado a la derecha, alineado en columna)
        const clientInfoY = margin + 20;
        doc.fontSize(10).fillColor("#000");
        doc.text(`Asesor: ${quote.advisor}`, 400, clientInfoY);
        doc.text(`Empresa: ${quote.company}`, 400, clientInfoY + 20);
        doc.text(`RUC/Cédula: ${quote.id_number}`, 400, clientInfoY + 40);
        doc.text(`Fecha: ${new Date(quote.created_at).toLocaleDateString("es-EC")}`, 400, clientInfoY + 60);

        // Título de detalle con línea completa
        const detailTitleY = margin + 120;
        doc.fontSize(11).fillColor("#000").text("Detalle de cotización:", margin, detailTitleY, { 
            underline: true,
            width: pageWidth
        });

        // Tabla con estilo HTML-like
        const tableTop = detailTitleY + 30;

        // Definir ancho de columnas con mejor distribución
        const colWidths = {
            name: 200,  // Reducido para dar más espacio a las otras columnas
            price: 80, 
            discount: 80,
            net: 80
        };

        // Calcular posiciones exactas para cada columna con mejor espaciado
        const xPos = {
            name: margin,
            price: margin + colWidths.name + 10,  // Añadir margen entre columnas
            discount: margin + colWidths.name + colWidths.price + 30,  // Más espacio entre columnas
            net: margin + colWidths.name + colWidths.price + colWidths.discount + 50  // Más espacio para la última columna
        };

        // Encabezados de tabla - fondo gris claro
        doc.rect(margin, tableTop, pageWidth, 25).fillAndStroke('#f2f2f2', '#e0e0e0');
        doc.fontSize(10).fillColor("#000");

        // Posiciones para el encabezado con mejor alineación
        doc.text("Módulo", xPos.name + 10, tableTop + 8, { width: colWidths.name - 20 });
        doc.text("Precio", xPos.price, tableTop + 8, { width: colWidths.price, align: "center" });
        doc.text("Desc.", xPos.discount, tableTop + 8, { width: colWidths.discount, align: "center" });
        doc.text("Neto", xPos.net, tableTop + 8, { width: colWidths.net, align: "center" });

        // Cuerpo de tabla - alternando colores de fondo
        let rowY = tableTop + 25;
        items.rows.forEach((item, i) => {
            const rowHeight = 25;
            
            // Fondo alternante para filas
            if (i % 2 === 0) {
                doc.rect(margin, rowY, pageWidth, rowHeight).fill('#f9f9f9');
            } else {
                doc.rect(margin, rowY, pageWidth, rowHeight).fill('#ffffff');
            }
            
            // Bordes de la tabla
            doc.rect(margin, rowY, pageWidth, rowHeight).stroke('#e0e0e0');
            
            // Contenido de la fila con mejor alineación para 4 columnas
            doc.fontSize(10).fillColor("#000");
            doc.text(item.name, xPos.name + 4, rowY + 4, { width: colWidths.name - 10 });
            doc.text(`$${Number(item.price).toFixed(2)}`, xPos.price, rowY + 4, { width: colWidths.price, align: "center" });
            doc.text(`${Number(item.discount).toFixed(0)}%`, xPos.discount, rowY + 4, { width: colWidths.discount, align: "center" });
            doc.text(`$${Number(item.net).toFixed(2)}`, xPos.net, rowY + 4, { width: colWidths.net, align: "center" });
            
            rowY += rowHeight;
        });

        // Línea final de la tabla
        doc.moveTo(margin, rowY).lineTo(margin + pageWidth, rowY).stroke('#e0e0e0');

        // Sección de totales con mejor alineación
        rowY += 20;

        // Definir posiciones para la sección de totales
        const totalsLayout = {
            labelX: margin + pageWidth - 200,  // Posición para etiquetas
            valueX: margin + pageWidth - 80,   // Posición para valores
            width: 80                          // Ancho para valores
        };

        // Subtotal
        doc.fontSize(10).fillColor("#000");
        doc.text("Subtotal:", totalsLayout.labelX, rowY);
        doc.text(`$${Number(quote.subtotal).toFixed(2)}`, totalsLayout.valueX, rowY, { 
            width: totalsLayout.width, 
            align: "right" 
        });

        // Descuento Total
        rowY += 20;
        doc.text("Descuento Total:", totalsLayout.labelX, rowY);
        doc.text(`-$${Number(quote.discount_total).toFixed(2)}`, totalsLayout.valueX, rowY, { 
            width: totalsLayout.width, 
            align: "right" 
        });

        // IVA
        rowY += 20;
        doc.text("IVA 15%:", totalsLayout.labelX, rowY);
        doc.text(`$${Number(quote.iva).toFixed(2)}`, totalsLayout.valueX, rowY, { 
            width: totalsLayout.width, 
            align: "right" 
        });

        // TOTAL con caja
        rowY += 25;
        const totalBox = {
            width: 180,
            height: 30,
            x: margin + pageWidth - 180
        };

        // Dibujar caja del total
        doc.rect(totalBox.x, rowY, totalBox.width, totalBox.height)
           .fillAndStroke('#ffffff', '#e0e0e0');

        // Texto del total con mejor alineación
        doc.fontSize(11).fillColor("#000");
        doc.text("TOTAL:", totalBox.x + 10, rowY + 8);
        doc.text(`$${Number(quote.total).toFixed(2)}`, totalBox.x + 10, rowY + 8, { 
            width: totalBox.width - 20,  // Reducir el ancho para mejor alineación
            align: "right" 
        });

        doc.end();
    } finally {
        client.release();
    }
});

app.listen(process.env.PORT || 3000, () => console.log("Servidor corriendo en puerto", process.env.PORT || 3000));

