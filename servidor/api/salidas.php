<?php
/*
 * salidas.php — RF-10 Confirmación general: registrar el retiro de material del carrito.
 *
 *   POST {
 *     "trabajadorDestino": "Javier Ortega",
 *     "vehiculo": "Versa 2017 · Rojo",
 *     "notas": "opcional",
 *     "insumos": [ { "idInsumo": "DC2000", "cantidad": 0.25 }, ... ]
 *   }
 *
 * El carrito (RF-07, RF-08 y RF-09) vive en la pantalla; aquí solo llega cuando se presiona
 * «Registrar retiro». Todo va en una transacción: si un insumo ya no alcanza, no se descuenta ninguno.
 */

require_once __DIR__ . '/funciones.php';

$usuario = exigirSesion();
if (metodo() !== 'POST') {
    fallar('Método no permitido.', 405);
}

$d = leerDatos();
$trabajador = texto($d, 'trabajadorDestino');
$vehiculo = texto($d, 'vehiculo');
$notas = texto($d, 'notas');
$insumos = is_array($d['insumos'] ?? null) ? $d['insumos'] : [];

// Excepción 3a: falta trabajador o vehículo/color
if ($trabajador === '' || $vehiculo === '') {
    fallar('Completa trabajador y vehículo/color para registrar.');
}
if (count($insumos) === 0) {
    fallar('Añade al menos un insumo al carrito.');
}

$pdo = conectar();
$pdo->beginTransaction();
try {
    $leer = $pdo->prepare('SELECT stockActual, unidad FROM insumo WHERE idInsumo = ? FOR UPDATE');
    $descontar = $pdo->prepare('UPDATE insumo SET stockActual = stockActual - ? WHERE idInsumo = ?');
    $guardarSalida = $pdo->prepare(
        'INSERT INTO salida_material (fecha_Hora, idUsuario, trabajadorDestino, idInsumo, insumosRetirados)
         VALUES (?, ?, ?, ?, ?)'
    );
    $fecha = ahora();
    $resumen = [];

    foreach ($insumos as $item) {
        $codigo = strtoupper(trim((string)($item['idInsumo'] ?? '')));
        $cantidad = round((float)($item['cantidad'] ?? 0), 2);
        if ($cantidad <= 0) {
            throw new InvalidArgumentException("La cantidad de $codigo debe ser mayor a 0.");
        }

        $leer->execute([$codigo]);
        $insumo = $leer->fetch();
        if (!$insumo) {
            throw new InvalidArgumentException("El insumo $codigo no existe.");
        }
        // Excepción 4a: ya no alcanza la existencia (por ejemplo, otro usuario entregó antes)
        if ($cantidad > (float)$insumo['stockActual']) {
            throw new InvalidArgumentException("Ya no alcanza la existencia de $codigo (quedan {$insumo['stockActual']} {$insumo['unidad']}).");
        }

        $descontar->execute([$cantidad, $codigo]);
        $guardarSalida->execute([$fecha, $usuario['idUsuario'], $trabajador, $codigo, $cantidad]);
        actualizarEstadoAlerta($codigo);   // RF-06
        $resumen[] = "$cantidad {$insumo['unidad']} $codigo";
    }

    // El vehículo/color (lo pidió el cliente) se guarda en el detalle de la bitácora
    $detalle = "Entrega a $trabajador: " . implode(', ', $resumen) . " | Vehículo/Color: $vehiculo" . ($notas !== '' ? " | Nota: $notas" : '');
    registrarBitacora($usuario['idUsuario'], 'SALIDA', 'Insumo', $detalle);

    $pdo->commit();
    responder(['detalle' => $detalle]);
} catch (InvalidArgumentException $e) {
    $pdo->rollBack();
    fallar($e->getMessage(), 409);
}
