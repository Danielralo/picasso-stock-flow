/*
 * Genera reportes de Excel reales (.xlsx) sin librerías externas: la «Lista de compras» (RF-12)
 * y la bitácora (RF-13).
 * Incluye: título, fecha, encabezados con color, colores por estado, filtros, encabezado fijo
 * y configuración de impresión (horizontal, ajustada al ancho de una hoja, encabezados repetidos).
 */

export type FilaCompra = {
  codigo: string;
  insumo: string;
  categoria: string;
  marca: string;
  existencia: number;
  minimo: number;
  unidad: string;
  estado: "SIN EXISTENCIA" | "POR ACABARSE";
};

/* ---------- ZIP mínimo (sin compresión) ---------- */

const CRC_TABLA = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(datos: Uint8Array) {
  let c = 0xffffffff;
  for (let i = 0; i < datos.length; i++) c = CRC_TABLA[(c ^ datos[i]!) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function zip(archivos: { nombre: string; texto: string }[]): Blob {
  const enc = new TextEncoder();
  const partes: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const a of archivos) {
    const nombre = enc.encode(a.nombre);
    const datos = enc.encode(a.texto);
    const crc = crc32(datos);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(8, 0, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, datos.length, true);
    local.setUint32(22, datos.length, true);
    local.setUint16(26, nombre.length, true);
    partes.push(new Uint8Array(local.buffer), nombre, datos);
    const cen = new DataView(new ArrayBuffer(46));
    cen.setUint32(0, 0x02014b50, true);
    cen.setUint16(4, 20, true);
    cen.setUint16(6, 20, true);
    cen.setUint32(16, crc, true);
    cen.setUint32(20, datos.length, true);
    cen.setUint32(24, datos.length, true);
    cen.setUint16(28, nombre.length, true);
    cen.setUint32(42, offset, true);
    central.push(new Uint8Array(cen.buffer), nombre);
    offset += 30 + nombre.length + datos.length;
  }
  const tamCentral = central.reduce((s, p) => s + p.length, 0);
  const fin = new DataView(new ArrayBuffer(22));
  fin.setUint32(0, 0x06054b50, true);
  fin.setUint16(8, archivos.length, true);
  fin.setUint16(10, archivos.length, true);
  fin.setUint32(12, tamCentral, true);
  fin.setUint32(16, offset, true);
  return new Blob([...partes, ...central, new Uint8Array(fin.buffer)] as BlobPart[], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

/* ---------- Hoja de cálculo ---------- */

const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Estilos (índices de cellXfs): 0 normal, 1 título, 2 subtítulo, 3 encabezado,
// 4 texto, 5 número, 6 SIN EXISTENCIA, 7 POR ACABARSE, 8 total
const ESTILOS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="5">
<font><sz val="11"/><name val="Calibri"/></font>
<font><b/><sz val="18"/><color rgb="FF1F3864"/><name val="Calibri"/></font>
<font><i/><sz val="10"/><color rgb="FF595959"/><name val="Calibri"/></font>
<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
<font><b/><sz val="11"/><name val="Calibri"/></font>
</fonts>
<fills count="7">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF1F3864"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFF8CBAD"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFFFE699"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFF2F2F2"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFC6EFCE"/></patternFill></fill>
</fills>
<borders count="2">
<border><left/><right/><top/><bottom/><diagonal/></border>
<border><left style="thin"><color rgb="FFBFBFBF"/></left><right style="thin"><color rgb="FFBFBFBF"/></right><top style="thin"><color rgb="FFBFBFBF"/></top><bottom style="thin"><color rgb="FFBFBFBF"/></bottom><diagonal/></border>
</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="10">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="3" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="4" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="4" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="4" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
<xf numFmtId="0" fontId="4" fillId="6" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
</cellXfs>
</styleSheet>`;

function celdaTexto(ref: string, texto: string, estilo: number) {
  return `<c r="${ref}" t="inlineStr" s="${estilo}"><is><t xml:space="preserve">${esc(texto)}</t></is></c>`;
}
function celdaNumero(ref: string, n: number, estilo: number) {
  return `<c r="${ref}" s="${estilo}"><v>${n}</v></c>`;
}

/** Columna de un reporte: título, ancho y si es número. */
export type Columna = { titulo: string; ancho: number; numero?: boolean };
/** Color de la celda resaltada de cada fila: rojo (6), amarillo (7) o ninguno. */
export type Resalte = "rojo" | "amarillo" | "verde" | null;

export type Reporte = {
  hoja: string;
  titulo: string;
  subtitulo: string;
  pie: string;
  columnas: Columna[];
  filas: (string | number)[][];
  /** Columna (índice) que se colorea según `resalte` de cada fila. */
  columnaResaltada?: number;
  resalte?: (fila: (string | number)[]) => Resalte;
  total: string;
};

const LETRAS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function hoja(rep: Reporte) {
  const n = rep.columnas.length;
  const ult = LETRAS[n - 1]!;
  const rows: string[] = [];
  rows.push(`<row r="1" ht="28" customHeight="1">${celdaTexto("A1", rep.titulo, 1)}</row>`);
  rows.push(`<row r="2">${celdaTexto("A2", rep.subtitulo, 2)}</row>`);
  rows.push(`<row r="4" ht="22" customHeight="1">${rep.columnas.map((c, i) => celdaTexto(`${LETRAS[i]}4`, c.titulo, 3)).join("")}</row>`);
  rep.filas.forEach((f, k) => {
    const r = 5 + k;
    const color = rep.resalte?.(f) ?? null;
    const celdas = f.map((v, i) => {
      const ref = `${LETRAS[i]}${r}`;
      if (i === rep.columnaResaltada && color) return celdaTexto(ref, String(v), color === "rojo" ? 6 : color === "amarillo" ? 7 : 9);
      return typeof v === "number" && rep.columnas[i]?.numero ? celdaNumero(ref, v, 5) : celdaTexto(ref, String(v), 4);
    });
    rows.push(`<row r="${r}" ht="20" customHeight="1">${celdas.join("")}</row>`);
  });
  const ultima = 4 + rep.filas.length;
  const rt = ultima + 2;
  const nt = Math.min(n, 4);
  rows.push(`<row r="${rt}" ht="20" customHeight="1">${celdaTexto(`A${rt}`, rep.total, 8)}${Array.from({ length: nt - 1 }, (_, i) => celdaTexto(`${LETRAS[i + 1]}${rt}`, "", 8)).join("")}</row>`);
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>
<dimension ref="A1:${ult}${rt}"/>
<sheetViews><sheetView workbookViewId="0" showGridLines="0"><pane ySplit="4" topLeftCell="A5" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
<cols>${rep.columnas.map((c, i) => `<col min="${i + 1}" max="${i + 1}" width="${c.ancho}" customWidth="1"/>`).join("")}</cols>
<sheetData>${rows.join("")}</sheetData>
<autoFilter ref="A4:${ult}${Math.max(ultima, 4)}"/>
<mergeCells count="3"><mergeCell ref="A1:${ult}1"/><mergeCell ref="A2:${ult}2"/><mergeCell ref="A${rt}:${LETRAS[nt - 1]}${rt}"/></mergeCells>
<printOptions horizontalCentered="1"/>
<pageMargins left="0.4" right="0.4" top="0.6" bottom="0.6" header="0.3" footer="0.3"/>
<pageSetup paperSize="1" orientation="landscape" fitToWidth="1" fitToHeight="0"/>
<headerFooter><oddFooter>&amp;L${esc(rep.pie)}&amp;RPágina &amp;P de &amp;N</oddFooter></headerFooter>
</worksheet>`;
}

/** Crea un reporte de Excel (.xlsx) con el formato de Picasso Autosport, listo para imprimir. */
export function crearReporteExcel(rep: Reporte): Blob {
  const n = rep.columnas.length;
  const hojaNombre = esc(rep.hoja);
  return zip([
    {
      nombre: "[Content_Types].xml",
      texto: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`,
    },
    {
      nombre: "_rels/.rels",
      texto: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
    },
    {
      nombre: "xl/workbook.xml",
      texto: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="${hojaNombre}" sheetId="1" r:id="rId1"/></sheets>
<definedNames>
<definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">'${hojaNombre}'!$A$4:$${LETRAS[n - 1]}$${Math.max(4 + rep.filas.length, 4)}</definedName>
<definedName name="_xlnm.Print_Titles" localSheetId="0">'${hojaNombre}'!$4:$4</definedName>
</definedNames>
</workbook>`,
    },
    {
      nombre: "xl/_rels/workbook.xml.rels",
      texto: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`,
    },
    { nombre: "xl/styles.xml", texto: ESTILOS },
    { nombre: "xl/worksheets/sheet1.xml", texto: hoja(rep) },
  ]);
}

/** RF-12: lista de compras con los insumos en alerta. */
export function crearListaCompras(filas: FilaCompra[], fecha: string): Blob {
  return crearReporteExcel({
    hoja: "Lista de compras",
    titulo: "Picasso Autosport · Lista de compras",
    subtitulo: `Insumos por acabarse o sin existencia · Generada el ${fecha}`,
    pie: "Picasso Autosport · Lista de compras",
    columnas: [
      { titulo: "Código", ancho: 12 },
      { titulo: "Insumo", ancho: 40 },
      { titulo: "Categoría", ancho: 14 },
      { titulo: "Marca", ancho: 18 },
      { titulo: "Existencia", ancho: 12, numero: true },
      { titulo: "Stock mínimo", ancho: 14, numero: true },
      { titulo: "Unidad", ancho: 11 },
      { titulo: "Estado", ancho: 18 },
    ],
    filas: filas.map((f) => [f.codigo, f.insumo, f.categoria, f.marca, f.existencia, f.minimo, f.unidad, f.estado]),
    columnaResaltada: 7,
    resalte: (f) => (f[7] === "SIN EXISTENCIA" ? "rojo" : "amarillo"),
    total: `Total de insumos a comprar: ${filas.length}`,
  });
}
