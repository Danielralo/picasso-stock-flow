<?php
/*
 * reabastecimiento.php — RF-03: registrar las entradas de material que llegó al taller.
 *
 *   POST { "detalles": [ { "id_insumo": "TH100", "cantidad_agregada": 2.5 }, ... ] }
 *
 * Suma cada cantidad a la existencia (stockActual), recalcula la alerta (RF-06)
 * y deja un renglón ENTRADA en la bitácora por cada insumo (RF-13).
 * Todo va dentro de una transacción: o se guardan todas las entradas o ninguna.
 */

require_once __DIR__ . '/funciones.php';

$usuario = exigirSesion();
if (metodo() !== 'POST') {
    fallar('Método no permitido.', 405);
}

$detalles = leerDatos()['detalles'] ?? [];
$detalles = array_values(array_filter(is_array($detalles) ? $detalles : [], function ($d) {
    return is_array($d) && is_numeric($d['cantidad_agregada'] ?? null) && (float)$d['cantidad_agregada'] > 0;
}));

// Excepción 5a: todas las cantidades en 0
if (count($detalles) === 0) {
    fallar('Indica al menos una cantidad mayor a 0.');
}

$pdo = conectar();
$pdo->beginTransaction();
try {
    $sumar = $pdo->prepare('UPDATE insumo SET stockActual = stockActual + ? WHERE idInsumo = ?');
    $datosInsumo = $pdo->prepare('SELECT unidad FROM insumo WHERE idInsumo = ?');
    $ticket = null;

    foreach ($detalles as $d) {
        $codigo = strtoupper(trim((string)($d['id_insumo'] ?? '')));
        $cantidad = round((float)$d['cantidad_agregada'], 2);

        $datosInsumo->execute([$codigo]);
        $unidad = $datosInsumo->fetchColumn();
        if ($unidad === false) {
            throw new InvalidArgumentException("El insumo $codigo no existe.");
        }
        $sumar->execute([$cantidad, $codigo]);
        actualizarEstadoAlerta($codigo);
        registrarBitacora($usuario['idUsuario'], 'ENTRADA', 'Insumo', "Reabastecimiento: +$cantidad $unidad $codigo");
        $ticket = $ticket ?? (int)$pdo->lastInsertId();   // el número de ticket es el id de la primera entrada en la bitácora
    }

    $pdo->commit();
    responder(['id_ticket' => $ticket, 'insumos' => count($detalles)]);
} catch (InvalidArgumentException $e) {
    $pdo->rollBack();
    fallar($e->getMessage(), 404);
}
