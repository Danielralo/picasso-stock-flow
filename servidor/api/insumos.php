<?php
/*
 * insumos.php — Objetivo 02: catálogo de insumos. Lo usan el Administrador y el Encargado.
 *
 *   GET                       → RF-02 Consulta de insumos (con su categoría, marca y estado, RF-05 y RF-06)
 *   POST   {datos}            → RF-01 Alta de insumos (empieza con existencia 0)
 *   PUT    {datos}            → RF-03 Edición de los datos de un insumo
 *   DELETE ?idInsumo=CODIGO   → RF-04 Baja de insumos (solo si no tiene salidas)
 *
 * En el alta y en la edición la unidad debe corresponder a la categoría (excepción 4c) y, si la marca
 * no está en la lista, se puede mandar «marcaNueva» para registrarla en la tabla MARCA (excepción 3b).
 */

require_once __DIR__ . '/funciones.php';

$usuario = exigirSesion();
$pdo = conectar();

/**
 * Revisa los datos del formulario de RF-01 / RF-03 y devuelve los valores limpios.
 * No guarda nada: si algo está mal responde el error y el insumo no se registra.
 */
function validarInsumo(PDO $pdo, array $d): array
{
    $v = [
        'nombreInsumo'     => texto($d, 'nombreInsumo'),
        'descripcionBreve' => texto($d, 'descripcionBreve'),
        'idCategoria'      => (int)($d['idCategoria'] ?? 0),
        'idMarca'          => (int)($d['idMarca'] ?? 0),
        // Excepción 3b: la marca no está en la lista y el usuario la escribió
        'marcaNueva'       => preg_replace('/\s+/u', ' ', texto($d, 'marcaNueva')),
        'unidad'           => texto($d, 'unidad'),
        'stockMinimo'      => numero($d, 'stockMinimo'),
    ];
    // Excepción 4a: algún campo vacío o incorrecto
    if (mb_strlen($v['nombreInsumo']) < 3 || mb_strlen($v['nombreInsumo']) > 100) fallar('El nombre debe tener de 3 a 100 caracteres.');
    if (mb_strlen($v['descripcionBreve']) < 5 || mb_strlen($v['descripcionBreve']) > 200) fallar('La descripción debe tener de 5 a 200 caracteres.');
    if (!in_array($v['unidad'], UNIDADES, true)) fallar('Selecciona una unidad de medida.');
    if ($v['stockMinimo'] === null || $v['stockMinimo'] < 0) fallar('El stock mínimo no puede ser negativo.');

    $cat = $pdo->prepare('SELECT nombreCategoria FROM categoria WHERE idCategoria = ?');
    $cat->execute([$v['idCategoria']]);
    $categoria = $cat->fetchColumn();
    if ($categoria === false) fallar('Selecciona una categoría.');

    // Excepción 4c: la unidad no corresponde a la categoría (por ejemplo, Piezas en Pinturas o Litros en Cintas)
    $permitidas = UNIDADES_POR_CATEGORIA[$categoria] ?? UNIDADES;
    if (!in_array($v['unidad'], $permitidas, true)) {
        fallar("La unidad «{$v['unidad']}» no corresponde a la categoría $categoria. Usa " . enLista($permitidas) . '.');
    }

    if ($v['marcaNueva'] !== '') {
        if (mb_strlen($v['marcaNueva']) < 2 || mb_strlen($v['marcaNueva']) > 50) fallar('El nombre de la marca debe tener de 2 a 50 caracteres.');
    } else {
        $mar = $pdo->prepare('SELECT COUNT(*) FROM marca WHERE idMarca = ?');
        $mar->execute([$v['idMarca']]);
        if ((int)$mar->fetchColumn() === 0) fallar('Selecciona una marca.');
    }
    return $v;
}

/**
 * Excepción 3b: si el usuario escribió una marca que no estaba en la lista, se registra en la tabla MARCA
 * y se regresa su id. Si ya existía (aunque esté escrita con otras mayúsculas o sin acento, porque la
 * comparación de MySQL utf8mb4_unicode_ci no las distingue), se usa la que ya existe y no se repite.
 */
function idDeMarca(PDO $pdo, array $v, int $idUsuario): int
{
    if ($v['marcaNueva'] === '') {
        return $v['idMarca'];
    }
    $buscar = $pdo->prepare('SELECT idMarca FROM marca WHERE nombreMarca = ?');
    $buscar->execute([$v['marcaNueva']]);
    $id = $buscar->fetchColumn();
    if ($id !== false) {
        return (int)$id;
    }
    $pdo->prepare('INSERT INTO marca (nombreMarca) VALUES (?)')->execute([$v['marcaNueva']]);
    $id = (int)$pdo->lastInsertId();
    registrarBitacora($idUsuario, 'ALTA', 'Insumo', "Registró la marca nueva «{$v['marcaNueva']}»");
    return $id;
}

switch (metodo()) {

    /* ---------------- RF-02 Consulta (y RF-05 orden por categoría) ---------------- */
    case 'GET':
        $insumos = $pdo->query(
            "SELECT i.idInsumo, i.nombreInsumo, i.descripcionBreve,
                    i.idCategoria, c.nombreCategoria, i.idMarca, m.nombreMarca,
                    i.unidad, i.stockActual, i.stockMinimo, i.estadoAlerta
             FROM insumo i
             JOIN categoria c ON c.idCategoria = i.idCategoria
             JOIN marca m     ON m.idMarca = i.idMarca
             ORDER BY FIELD(c.nombreCategoria, 'Lijas', 'Cintas', 'Pinturas', 'Solventes', 'Consumibles', 'Barnices'),
                      i.nombreInsumo"
        )->fetchAll();
        responder(['insumos' => $insumos]);

    /* ---------------- RF-01 Alta de insumos ---------------- */
    case 'POST':
        $d = leerDatos();
        $codigo = strtoupper(texto($d, 'idInsumo'));
        if (!preg_match('/^[A-Z0-9-]{2,10}$/', $codigo)) {
            fallar('El código debe tener de 2 a 10 letras, números o guiones (por ejemplo, DC2000).');
        }
        $v = validarInsumo($pdo, $d);

        // Excepción 4b: el código ya existe
        $existe = $pdo->prepare('SELECT COUNT(*) FROM insumo WHERE idInsumo = ?');
        $existe->execute([$codigo]);
        if ((int)$existe->fetchColumn() > 0) {
            fallar('Ese código ya existe.', 409);
        }

        // Paso 4: se registra con existencia 0 y estado SIN EXISTENCIA.
        // La marca nueva (si la hay) y el insumo van en la misma transacción: se guardan los dos o ninguno.
        $pdo->beginTransaction();
        $idMarca = idDeMarca($pdo, $v, $usuario['idUsuario']);
        $sql = "INSERT INTO insumo (idInsumo, nombreInsumo, descripcionBreve, idCategoria, idMarca, unidad, stockActual, stockMinimo, estadoAlerta)
                VALUES (?, ?, ?, ?, ?, ?, 0, ?, 'SIN EXISTENCIA')";
        $pdo->prepare($sql)->execute([
            $codigo, $v['nombreInsumo'], $v['descripcionBreve'], $v['idCategoria'], $idMarca, $v['unidad'], $v['stockMinimo'],
        ]);
        registrarBitacora($usuario['idUsuario'], 'ALTA', 'Insumo', "Registró el insumo $codigo · {$v['nombreInsumo']}");
        $pdo->commit();
        responder(['idInsumo' => $codigo, 'idMarca' => $idMarca]);

    /* ---------------- RF-03 Edición de los datos ---------------- */
    case 'PUT':
        $d = leerDatos();
        $codigo = strtoupper(texto($d, 'idInsumo'));
        $v = validarInsumo($pdo, $d);   // mismas reglas que el alta: unidad según la categoría y marca nueva
        $existe = $pdo->prepare('SELECT COUNT(*) FROM insumo WHERE idInsumo = ?');
        $existe->execute([$codigo]);
        if ((int)$existe->fetchColumn() === 0) fallar('El insumo no existe.', 404);

        $pdo->beginTransaction();
        $idMarca = idDeMarca($pdo, $v, $usuario['idUsuario']);
        $sql = 'UPDATE insumo SET nombreInsumo = ?, descripcionBreve = ?, idCategoria = ?, idMarca = ?, unidad = ?, stockMinimo = ?
                WHERE idInsumo = ?';
        $pdo->prepare($sql)->execute([$v['nombreInsumo'], $v['descripcionBreve'], $v['idCategoria'], $idMarca, $v['unidad'], $v['stockMinimo'], $codigo]);
        actualizarEstadoAlerta($codigo);   // si cambió el stock mínimo, cambia la alerta (RF-06)
        registrarBitacora($usuario['idUsuario'], 'MODIFICACION', 'Insumo', "Editó los datos del insumo $codigo · {$v['nombreInsumo']}");
        $pdo->commit();
        responder(['idMarca' => $idMarca]);

    /* ---------------- RF-04 Baja de insumos ---------------- */
    case 'DELETE':
        $codigo = strtoupper(trim((string)($_GET['idInsumo'] ?? '')));
        $consulta = $pdo->prepare('SELECT nombreInsumo FROM insumo WHERE idInsumo = ?');
        $consulta->execute([$codigo]);
        $nombre = $consulta->fetchColumn();
        if ($nombre === false) {
            fallar('El insumo no existe.', 404);
        }
        // Excepción 4a: si ya tiene salidas registradas no se quita (se conserva el historial)
        $salidas = $pdo->prepare('SELECT COUNT(*) FROM salida_material WHERE idInsumo = ?');
        $salidas->execute([$codigo]);
        if ((int)$salidas->fetchColumn() > 0) {
            fallar("No se puede dar de baja: $codigo ya tiene salidas registradas.", 409);
        }
        $pdo->prepare('DELETE FROM insumo WHERE idInsumo = ?')->execute([$codigo]);
        registrarBitacora($usuario['idUsuario'], 'BAJA', 'Insumo', "Dio de baja el insumo $codigo · $nombre");
        responder();
}

fallar('Método no permitido.', 405);
