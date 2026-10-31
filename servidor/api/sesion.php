<?php
/*
 * sesion.php — Inicio de sesión, cierre de sesión y «¿Olvidaste tu contraseña?».
 *
 *   GET                                         → ¿quién tiene la sesión abierta?
 *   POST {accion:"iniciar", username, password} → iniciar sesión (registra LOGIN en la bitácora)
 *   POST {accion:"cerrar"}                      → cerrar sesión
 *   POST {accion:"solicitar_clave", username}   → RNF-09: Encargado → avisa al Administrador;
 *                                                 Administrador → le manda un correo con un enlace
 *   POST {accion:"revisar_enlace", token}       → RNF-09: ¿el enlace del correo todavía sirve?
 *   POST {accion:"restablecer", token, password}→ RNF-09: guarda la contraseña nueva del Administrador
 */

require_once __DIR__ . '/funciones.php';

if (metodo() === 'GET') {
    responder(['usuario' => $_SESSION['usuario'] ?? null]);
}

if (metodo() !== 'POST') {
    fallar('Método no permitido.', 405);
}

$datos = leerDatos();
$accion = texto($datos, 'accion');
$pdo = conectar();

/* ------------------------- Iniciar sesión ------------------------- */
if ($accion === 'iniciar') {
    $username = strtolower(texto($datos, 'username'));
    $password = (string)($datos['password'] ?? '');

    $consulta = $pdo->prepare('SELECT * FROM usuario WHERE username = ?');
    $consulta->execute([$username]);
    $cuenta = $consulta->fetch();

    // password_verify compara la contraseña escrita con la versión cifrada guardada
    if (!$cuenta || !password_verify($password, $cuenta['contraseñaUsuario'])) {
        fallar('Usuario o contraseña incorrectos.', 401);
    }
    // RNF-08: una cuenta dada de baja no puede entrar
    if ($cuenta['estadoUsuario'] !== 'ACTIVO') {
        fallar('Tu cuenta está dada de baja. Pide al Administrador que la reactive.', 403);
    }

    session_regenerate_id(true);
    $_SESSION['usuario'] = [
        'idUsuario'      => (int)$cuenta['idUsuario'],
        'nombreCompleto' => $cuenta['nombreCompleto'],
        'username'       => $cuenta['username'],
        'rolUsuario'     => $cuenta['rolUsuario'],
    ];
    registrarBitacora((int)$cuenta['idUsuario'], 'LOGIN', 'Usuario', 'Inicio de sesión');
    responder(['usuario' => $_SESSION['usuario']]);
}

/* ------------------------- Cerrar sesión ------------------------- */
if ($accion === 'cerrar') {
    session_destroy();
    responder();
}

/* ------------- RNF-09: solicitud de restablecimiento de clave ------------- */
if ($accion === 'solicitar_clave') {
    $username = strtolower(texto($datos, 'username'));
    if (strlen($username) < 3) {
        fallar('Escribe tu usuario.');
    }

    $consulta = $pdo->prepare('SELECT * FROM usuario WHERE username = ?');
    $consulta->execute([$username]);
    $cuenta = $consulta->fetch();

    // Excepción 4a: la cuenta no existe o está dada de baja
    if (!$cuenta || $cuenta['estadoUsuario'] !== 'ACTIVO') {
        fallar('La cuenta no existe o está dada de baja.', 404);
    }
    $idUsuario = (int)$cuenta['idUsuario'];

    // Excepción 4b: si es Encargado, la solicitud se guarda en la bitácora y el Administrador la ve en «Usuarios» (usuarios.php)
    if ($cuenta['rolUsuario'] !== 'Administrador') {
        registrarBitacora($idUsuario, 'MODIFICACION', 'Usuario', SOLICITUD_CLAVE);
        responder(['mensaje' => 'Se notificó al Administrador para restablecer tu clave.', 'porCorreo' => false]);
    }

    // Paso 4: al Administrador se le manda un correo con un enlace para crear su nueva contraseña.
    // Excepción 4c: si ya se mandó uno hace menos de 2 minutos, no se manda otro.
    $consulta = $pdo->prepare('SELECT COUNT(*) FROM bitacora_actividad
                               WHERE idUsuario = ? AND detalleAccion = ? AND fecha_HoraAccion >= ?');
    $consulta->execute([$idUsuario, CORREO_ENVIADO, date('Y-m-d H:i:s', time() - 120)]);
    if ($consulta->fetchColumn() > 0) {
        fallar('Ya te enviamos un correo hace un momento. Revisa tu bandeja de entrada y la carpeta de spam.', 429);
    }

    $enlace = crearEnlace($cuenta);
    $nombre = htmlspecialchars($cuenta['nombreCompleto']);
    $minutos = MINUTOS_ENLACE;
    $html = <<<HTML
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#0f172a">
          <h2 style="margin-bottom:4px">Picasso Autosport · Inventario</h2>
          <p>Hola, $nombre.</p>
          <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta <b>@{$cuenta['username']}</b>.</p>
          <p style="text-align:center;margin:28px 0">
            <a href="$enlace" style="background:#0f172a;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:bold">Crear nueva contraseña</a>
          </p>
          <p style="font-size:13px;color:#475569">El enlace vence en $minutos minutos, solo se puede usar una vez y se abre en la computadora del taller
          (donde está instalado el sistema). Si no pediste esto, ignora este correo: tu contraseña actual sigue funcionando.</p>
          <p style="font-size:12px;color:#94a3b8;word-break:break-all">$enlace</p>
        </div>
        HTML;

    if (!enviarCorreo($cuenta['emailUsuario'], 'Restablecer tu contraseña · Picasso Autosport', $html)) {
        // Excepción 4d: no hay internet o falla el correo. La solicitud queda para otro Administrador.
        registrarBitacora($idUsuario, 'MODIFICACION', 'Usuario', SOLICITUD_CLAVE);
        fallar('No se pudo enviar el correo. Revisa la conexión a internet e inténtalo de nuevo, o pide a otro Administrador que te asigne una clave.', 503);
    }

    registrarBitacora($idUsuario, 'MODIFICACION', 'Usuario', CORREO_ENVIADO);
    responder([
        'mensaje'   => 'Te enviamos un correo a ' . ocultarCorreo($cuenta['emailUsuario']) . " con un enlace para crear tu nueva contraseña. Vence en $minutos minutos.",
        'porCorreo' => true,
    ]);
}

/* --------- RNF-09: el Administrador abre el enlace del correo --------- */
// Paso 6 (excepción 6a: el enlace venció, ya se usó o no es válido)
if ($accion === 'revisar_enlace') {
    $cuenta = cuentaDelEnlace(texto($datos, 'token'));
    responder(['username' => $cuenta['username']]);
}

// Pasos 7 y 8 (excepción 7a: menos de 6 caracteres)
if ($accion === 'restablecer') {
    $cuenta = cuentaDelEnlace(texto($datos, 'token'));
    $password = (string)($datos['password'] ?? '');
    if (mb_strlen($password) < 6) {
        fallar('La contraseña debe tener al menos 6 caracteres.');
    }

    $pdo->prepare('UPDATE usuario SET `contraseñaUsuario` = ? WHERE idUsuario = ?')
        ->execute([password_hash($password, PASSWORD_DEFAULT), $cuenta['idUsuario']]);
    // Con este renglón la solicitud queda atendida (igual que cuando el Administrador asigna una clave)
    registrarBitacora((int)$cuenta['idUsuario'], 'MODIFICACION', 'Usuario', CLAVE_ASIGNADA . $cuenta['username']);
    responder(['mensaje' => 'Tu contraseña se cambió. Ya puedes iniciar sesión.']);
}

fallar('Acción no válida.');
