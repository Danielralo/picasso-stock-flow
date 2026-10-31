<?php
/*
 * reportes.php — Objetivo 03: Reportes y auditoría. Solo lo usa el Administrador.
 *
 *   GET ?tipo=consumo&periodo=semana|mes  → RF-11 Reportes de consumo (insumos más gastados)
 *   GET ?tipo=lista_compras               → RF-12 Lista de compras (insumos en alerta)
 *   GET ?tipo=bitacora                    → RF-13 Bitácora de movimientos
 *
 * Los reportes solo leen información: no cambian ningún dato.
 */

require_once __DIR__ . '/funciones.php';

exigirAdministrador();
$pdo = conectar();
$tipo = $_GET['tipo'] ?? '';

/* ---------------- RF-11 Consumo por semana o mes ---------------- */
if ($tipo === 'consumo') {
    $dias = ($_GET['periodo'] ?? 'semana') === 'mes' ? 30 : 7;
    $desde = date('Y-m-d H:i:s', strtotime("-$dias days"));
    $consulta = $pdo->prepare(
        'SELECT s.idInsumo, i.nombreInsumo, i.unidad, SUM(s.insumosRetirados) AS total
         FROM salida_material s JOIN insumo i ON i.idInsumo = s.idInsumo
         WHERE s.fecha_Hora >= ?
         GROUP BY s.idInsumo, i.nombreInsumo, i.unidad
         ORDER BY total DESC'
    );
    $consulta->execute([$desde]);
    responder(['consumo' => $consulta->fetchAll(), 'dias' => $dias]);
}

/* ---------------- RF-12 Lista de compras ---------------- */
if ($tipo === 'lista_compras') {
    $lista = $pdo->query(
        "SELECT i.idInsumo, i.nombreInsumo, c.nombreCategoria, m.nombreMarca,
                i.stockActual, i.stockMinimo, i.unidad, i.estadoAlerta
         FROM insumo i
         JOIN categoria c ON c.idCategoria = i.idCategoria
         JOIN marca m     ON m.idMarca = i.idMarca
         WHERE i.estadoAlerta <> 'DISPONIBLE'
         ORDER BY FIELD(i.estadoAlerta, 'SIN EXISTENCIA', 'POR ACABARSE'), i.nombreInsumo"
    )->fetchAll();
    responder(['lista' => $lista]);
}

/* ---------------- RF-13 Bitácora de movimientos ---------------- */
if ($tipo === 'bitacora') {
    // El nombre y el rol se obtienen de USUARIO con idUsuario (3FN): no se guardan en la bitácora
    $bitacora = $pdo->query(
        'SELECT b.idBitacora, b.fecha_HoraAccion, u.username, u.nombreCompleto, u.rolUsuario,
                b.tipoAccion, b.modulo, b.detalleAccion
         FROM bitacora_actividad b JOIN usuario u ON u.idUsuario = b.idUsuario
         ORDER BY b.fecha_HoraAccion DESC, b.idBitacora DESC
         LIMIT 500'
    )->fetchAll();
    responder(['bitacora' => $bitacora]);
}

fallar('Tipo de reporte no válido.');
