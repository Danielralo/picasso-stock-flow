<?php
/*
 * usuarios.php — Objetivo 01: Acceso a usuarios. Solo lo usa el Administrador.
 *
 *   GET                                  → RNF-05 Consulta de accesos (+ solicitudes de RNF-09)
 *   POST   {datos de la cuenta}          → RNF-04 Alta de accesos
 *   PUT    {idUsuario, datos nuevos}     → RNF-06 Edición de accesos
 *   PATCH  {idUsuario, estadoUsuario}    → RNF-08 Bloqueo de cuentas (Dar de baja / Reactivar)
 *   DELETE ?idUsuario=N                  → RNF-07 Baja de accesos (cuentas creadas por error)
 */

require_once __DIR__ . '/funciones.php';

$admin = exigirAdministrador();
$pdo = conectar();

const FORMATO_USUARIO = '/^[a-z0-9._]{3,20}$/';   // de 3 a 20: minúsculas, números, punto o guion bajo

/** Busca una cuenta por su id o responde 404. */
function buscarCuenta(PDO $pdo, int $idUsuario): array
{
    $consulta = $pdo->prepare('SELECT * FROM usuario WHERE idUsuario = ?');
    $consulta->execute([$idUsuario]);
    $cuenta = $consulta->fetch();
    if (!$cuenta) {
        fallar('La cuenta no existe.', 404);
    }
    return $cuenta;
}

/** RNF-07 y RNF-08: el sistema nunca se queda sin un Administrador activo. */
function esUnicoAdministradorActivo(PDO $pdo, array $cuenta): bool
{
    if ($cuenta['rolUsuario'] !== 'Administrador' || $cuenta['estadoUsuario'] !== 'ACTIVO') {
        return false;
    }
    $total = $pdo->query("SELECT COUNT(*) FROM usuario WHERE rolUsuario = 'Administrador' AND estadoUsuario = 'ACTIVO'")->fetchColumn();
    return (int)$total === 1;
}

/** Correo con formato válido y que no pertenezca a otra cuenta. */
function correoDisponible(PDO $pdo, string $email, int $idUsuarioActual = 0): bool
{
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        return false;
    }
    $consulta = $pdo->prepare('SELECT COUNT(*) FROM usuario WHERE emailUsuario = ? AND idUsuario <> ?');
    $consulta->execute([$email, $idUsuarioActual]);
    return (int)$consulta->fetchColumn() === 0;
}

switch (metodo()) {

    /* ---------------- RNF-05 Consulta de accesos ---------------- */
    case 'GET':
        $usuarios = $pdo->query(
            'SELECT idUsuario, nombreCompleto, username, emailUsuario, rolUsuario, estadoUsuario
             FROM usuario ORDER BY nombreCompleto'
        )->fetchAll();

        // RNF-09: solicitudes que todavía no tienen contraseña asignada después de pedirla
        $consulta = $pdo->prepare(
            "SELECT s.idUsuario, s.username, s.fecha
             FROM (SELECT u.idUsuario, u.username, MAX(b.fecha_HoraAccion) AS fecha
                   FROM bitacora_actividad b JOIN usuario u ON u.idUsuario = b.idUsuario
                   WHERE b.detalleAccion = ?
                   GROUP BY u.idUsuario, u.username) AS s
             WHERE NOT EXISTS (SELECT 1 FROM bitacora_actividad r
                               WHERE r.detalleAccion = CONCAT(?, s.username) AND r.fecha_HoraAccion >= s.fecha)
             ORDER BY s.fecha"
        );
        $consulta->execute([SOLICITUD_CLAVE, CLAVE_ASIGNADA]);
        responder(['usuarios' => $usuarios, 'solicitudes' => $consulta->fetchAll()]);

    /* ---------------- RNF-04 Alta de accesos ---------------- */
    case 'POST':
        $d = leerDatos();
        $nombre = texto($d, 'nombreCompleto');
        $username = strtolower(texto($d, 'username'));
        $email = texto($d, 'emailUsuario');
        $password = (string)($d['password'] ?? '');
        $rol = texto($d, 'rolUsuario');

        // Excepción 3b: faltan datos o el usuario no cumple el formato
        if (strlen($nombre) < 2 || !preg_match(FORMATO_USUARIO, $username) || strlen($password) < 6
            || !in_array($rol, ['Administrador', 'Encargado'], true)) {
            fallar('Revisa los datos: nombre, usuario (3 a 20 minúsculas, números, punto o guion bajo), contraseña (mínimo 6) y rol.');
        }
        // Excepción 4a: el usuario ya existe
        $existe = $pdo->prepare('SELECT COUNT(*) FROM usuario WHERE username = ?');
        $existe->execute([$username]);
        if ((int)$existe->fetchColumn() > 0) {
            fallar('Ese usuario ya existe. Escribe otro.', 409);
        }
        if (!correoDisponible($pdo, $email)) {
            fallar('El correo no es válido o ya pertenece a otra cuenta.', 409);
        }

        $sql = 'INSERT INTO usuario (nombreCompleto, username, `contraseñaUsuario`, emailUsuario, rolUsuario, estadoUsuario)
                VALUES (?, ?, ?, ?, ?, \'ACTIVO\')';
        $pdo->prepare($sql)->execute([$nombre, $username, password_hash($password, PASSWORD_DEFAULT), $email, $rol]);
        $idNuevo = (int)$pdo->lastInsertId();
        registrarBitacora($admin['idUsuario'], 'ALTA', 'Usuario', "Creó la cuenta @$username ($rol)");
        responder(['idUsuario' => $idNuevo]);

    /* ---------------- RNF-06 Edición de accesos ---------------- */
    case 'PUT':
        $d = leerDatos();
        $cuenta = buscarCuenta($pdo, (int)($d['idUsuario'] ?? 0));
        $nombre = texto($d, 'nombreCompleto') ?: $cuenta['nombreCompleto'];
        $email = texto($d, 'emailUsuario');
        $rol = texto($d, 'rolUsuario');
        $passwordNueva = (string)($d['passwordNueva'] ?? '');

        if (!in_array($rol, ['Administrador', 'Encargado'], true)) {
            fallar('Elige un rol válido.');
        }
        // Excepción 4a: correo inválido o de otra cuenta
        if (!correoDisponible($pdo, $email, (int)$cuenta['idUsuario'])) {
            fallar('El correo no es válido o ya pertenece a otra cuenta.', 409);
        }
        if ($rol !== 'Administrador' && esUnicoAdministradorActivo($pdo, $cuenta)) {
            fallar('No se puede cambiar el rol: es el único Administrador activo.', 409);
        }
        if ($passwordNueva !== '' && strlen($passwordNueva) < 6) {
            fallar('La contraseña nueva debe tener al menos 6 caracteres.');
        }

        $pdo->prepare('UPDATE usuario SET nombreCompleto = ?, emailUsuario = ?, rolUsuario = ? WHERE idUsuario = ?')
            ->execute([$nombre, $email, $rol, $cuenta['idUsuario']]);
        if ($passwordNueva !== '') {
            $pdo->prepare('UPDATE usuario SET `contraseñaUsuario` = ? WHERE idUsuario = ?')
                ->execute([password_hash($passwordNueva, PASSWORD_DEFAULT), $cuenta['idUsuario']]);
        }

        registrarBitacora($admin['idUsuario'], 'MODIFICACION', 'Usuario', "Editó la cuenta @{$cuenta['username']}");
        if ($passwordNueva !== '') {
            // RNF-09 paso 5: con este renglón la solicitud queda atendida
            registrarBitacora($admin['idUsuario'], 'MODIFICACION', 'Usuario', CLAVE_ASIGNADA . $cuenta['username']);
        }
        // Excepción 5a: el nuevo rol aplica cuando el empleado vuelve a iniciar sesión
        responder(['cambioRol' => $rol !== $cuenta['rolUsuario']]);

    /* ---------------- RNF-08 Bloqueo de cuentas ---------------- */
    case 'PATCH':
        $d = leerDatos();
        $cuenta = buscarCuenta($pdo, (int)($d['idUsuario'] ?? 0));
        $estado = texto($d, 'estadoUsuario');
        if (!in_array($estado, ['ACTIVO', 'INACTIVO'], true)) {
            fallar('Estado no válido.');
        }
        // Excepción 2a: no se puede dar de baja al único Administrador activo
        if ($estado === 'INACTIVO' && esUnicoAdministradorActivo($pdo, $cuenta)) {
            fallar('No se puede dar de baja: es el único Administrador activo.', 409);
        }
        $pdo->prepare('UPDATE usuario SET estadoUsuario = ? WHERE idUsuario = ?')->execute([$estado, $cuenta['idUsuario']]);
        $accion = $estado === 'INACTIVO' ? 'Dio de baja' : 'Reactivó';
        registrarBitacora($admin['idUsuario'], 'MODIFICACION', 'Usuario', "$accion la cuenta @{$cuenta['username']}");
        responder();

    /* ---------------- RNF-07 Baja de accesos ---------------- */
    case 'DELETE':
        $cuenta = buscarCuenta($pdo, (int)($_GET['idUsuario'] ?? 0));
        // Excepción 4b: único Administrador activo
        if (esUnicoAdministradorActivo($pdo, $cuenta)) {
            fallar('No se puede eliminar: es el único Administrador activo.', 409);
        }
        // Excepción 4a: si ya tiene salidas o acciones en la bitácora no se borra (se conserva el historial)
        $movimientos = $pdo->prepare(
            'SELECT (SELECT COUNT(*) FROM salida_material WHERE idUsuario = ?)
                  + (SELECT COUNT(*) FROM bitacora_actividad WHERE idUsuario = ?)'
        );
        $movimientos->execute([$cuenta['idUsuario'], $cuenta['idUsuario']]);
        if ((int)$movimientos->fetchColumn() > 0) {
            fallar('La cuenta ya tiene movimientos registrados. Usa «Dar de baja» para conservar el historial.', 409);
        }
        $pdo->prepare('DELETE FROM usuario WHERE idUsuario = ?')->execute([$cuenta['idUsuario']]);
        registrarBitacora($admin['idUsuario'], 'BAJA', 'Usuario', "Eliminó la cuenta @{$cuenta['username']} (creada por error)");
        responder();
}

fallar('Método no permitido.', 405);
