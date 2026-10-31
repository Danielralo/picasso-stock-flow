<?php
/*
 * funciones.php — Funciones que usan todos los archivos de la API.
 *
 * Cada archivo de la API empieza con:  require_once __DIR__ . '/funciones.php';
 * y así obtiene: la conexión, la sesión, las respuestas en JSON,
 * la bitácora (RF-13) y el cálculo de alertas de stock (RF-06).
 */

require_once __DIR__ . '/conexion.php';

header('Content-Type: application/json; charset=utf-8');
session_start();   // la sesión de PHP recuerda quién inició sesión (cookie PHPSESSID)

// Cualquier error no previsto se responde como JSON en lugar de una página de error.
set_exception_handler(function (Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Error del servidor: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
});

/* ------------------------- Respuestas ------------------------- */

/** Envía una respuesta correcta en JSON y termina. */
function responder(array $datos = []): void
{
    echo json_encode(['ok' => true] + $datos, JSON_UNESCAPED_UNICODE);
    exit;
}

/** Envía un error con su código HTTP (400 dato incorrecto, 401 sin sesión, 403 sin permiso, 404 no existe, 409 conflicto). */
function fallar(string $mensaje, int $codigo = 400): void
{
    http_response_code($codigo);
    echo json_encode(['ok' => false, 'error' => $mensaje], JSON_UNESCAPED_UNICODE);
    exit;
}

/** Lee los datos que manda la pantalla en formato JSON. */
function leerDatos(): array
{
    $datos = json_decode(file_get_contents('php://input'), true);
    return is_array($datos) ? $datos : [];
}

/** Método HTTP de la petición: GET consulta, POST crea, PUT edita, PATCH cambia estado, DELETE elimina. */
function metodo(): string
{
    return $_SERVER['REQUEST_METHOD'];
}

/** Fecha y hora actual en formato de MySQL (DATETIME). */
function ahora(): string
{
    return date('Y-m-d H:i:s');
}

/* --------------------------- Sesión --------------------------- */

/** Usuario que inició sesión. Si no hay sesión o la cuenta fue dada de baja, responde 401. */
function exigirSesion(): array
{
    if (empty($_SESSION['usuario'])) {
        fallar('Tu sesión terminó. Vuelve a iniciar sesión.', 401);
    }
    // RNF-08: si el Administrador dio de baja la cuenta, se cierra la sesión de inmediato.
    $consulta = conectar()->prepare('SELECT estadoUsuario FROM usuario WHERE idUsuario = ?');
    $consulta->execute([$_SESSION['usuario']['idUsuario']]);
    if ($consulta->fetchColumn() !== 'ACTIVO') {
        session_destroy();
        fallar('Tu cuenta está dada de baja.', 401);
    }
    return $_SESSION['usuario'];
}

/** Igual que exigirSesion(), pero además solo deja pasar al Administrador. */
function exigirAdministrador(): array
{
    $usuario = exigirSesion();
    if ($usuario['rolUsuario'] !== 'Administrador') {
        fallar('Solo el Administrador puede usar esta opción.', 403);
    }
    return $usuario;
}

/* ------------------------- Bitácora (RF-13) ------------------------- */

/*
 * RNF-09 no tiene tabla propia en el modelo: la solicitud de «¿Olvidaste tu contraseña?»
 * de un Encargado se guarda como un renglón de la bitácora con este texto, y queda atendida cuando
 * se asigna la contraseña nueva (renglón «Asignó una contraseña nueva a @usuario»).
 * Al Administrador se le manda un correo; ese envío también queda en la bitácora (CORREO_ENVIADO).
 */
const SOLICITUD_CLAVE = 'Solicitó restablecer su contraseña';
const CLAVE_ASIGNADA = 'Asignó una contraseña nueva a @';
const CORREO_ENVIADO = 'Solicitó restablecer su contraseña por correo';

/** Guarda una acción en BITACORA_ACTIVIDAD con fecha y hora, usuario, tipo, módulo y detalle. */
function registrarBitacora(int $idUsuario, string $tipoAccion, string $modulo, string $detalle): void
{
    $sql = 'INSERT INTO bitacora_actividad (fecha_HoraAccion, idUsuario, tipoAccion, modulo, detalleAccion)
            VALUES (?, ?, ?, ?, ?)';
    conectar()->prepare($sql)->execute([ahora(), $idUsuario, $tipoAccion, $modulo, mb_substr($detalle, 0, 255)]);
}

/* -------------- Correo y enlace para el Administrador (RNF-09) -------------- */

/*
 * El enlace del correo lleva:  idUsuario . vence . firma
 *   - vence: hasta cuándo sirve (segundos desde 1970, como time()).
 *   - firma: HMAC-SHA256 de «idUsuario|vence» usando como llave la contraseña cifrada actual.
 * Así nadie puede inventar un enlace (no conoce la contraseña cifrada) y, en cuanto
 * se cambia la contraseña, la llave cambia y el enlace deja de servir (solo se usa una vez).
 * No hace falta una tabla nueva en la base de datos.
 */
function firmaEnlace(int $idUsuario, int $vence, string $claveCifrada): string
{
    return hash_hmac('sha256', "$idUsuario|$vence", $claveCifrada);
}

/** Crea el enlace para restablecer la contraseña de una cuenta. */
function crearEnlace(array $cuenta): string
{
    $vence = time() + MINUTOS_ENLACE * 60;
    $token = $cuenta['idUsuario'] . '.' . $vence . '.' . firmaEnlace((int)$cuenta['idUsuario'], $vence, $cuenta['contraseñaUsuario']);
    return DIRECCION_SISTEMA . '?restablecer=' . $token;
}

/** Revisa el enlace y regresa la cuenta. Si no sirve, responde con el error. */
function cuentaDelEnlace(string $token): array
{
    $partes = explode('.', $token);
    if (count($partes) !== 3 || !ctype_digit($partes[0]) || !ctype_digit($partes[1])) {
        fallar('El enlace no es válido. Pide uno nuevo en «¿Olvidaste tu contraseña?».');
    }
    [$idUsuario, $vence, $firma] = $partes;

    $consulta = conectar()->prepare('SELECT * FROM usuario WHERE idUsuario = ?');
    $consulta->execute([(int)$idUsuario]);
    $cuenta = $consulta->fetch();

    // hash_equals compara las firmas sin dar pistas por el tiempo que tarda
    if (!$cuenta || $cuenta['rolUsuario'] !== 'Administrador' || $cuenta['estadoUsuario'] !== 'ACTIVO'
        || !hash_equals(firmaEnlace((int)$idUsuario, (int)$vence, $cuenta['contraseñaUsuario']), $firma)) {
        fallar('El enlace ya se usó o no es válido. Pide uno nuevo en «¿Olvidaste tu contraseña?».');
    }
    if ((int)$vence < time()) {
        fallar('El enlace venció. Pide uno nuevo en «¿Olvidaste tu contraseña?».', 410);
    }
    return $cuenta;
}

/** Envía un correo en HTML con mail() (sendmail de XAMPP). Regresa false si no se pudo enviar. */
function enviarCorreo(string $para, string $asunto, string $html): bool
{
    $encabezados = "MIME-Version: 1.0\r\n"
                 . "Content-Type: text/html; charset=UTF-8\r\n"
                 . "Content-Transfer-Encoding: quoted-printable\r\n";
    $asunto = '=?UTF-8?B?' . base64_encode($asunto) . '?=';   // para que se vean los acentos
    return @mail($para, $asunto, quoted_printable_encode($html), $encabezados);
}

/** h•••••@gmail.com: muestra el correo sin revelarlo completo. */
function ocultarCorreo(string $correo): string
{
    [$nombre, $dominio] = explode('@', $correo) + [1 => ''];
    return mb_substr($nombre, 0, 1) . str_repeat('•', max(3, mb_strlen($nombre) - 1)) . '@' . $dominio;
}

/* ------------------- Reglas de los insumos (RF-01 y RF-03) ------------------- */

/** Unidades de medida del diccionario de datos del ERS. */
const UNIDADES = ['Litros', 'Galones', 'Pliegos', 'Piezas', 'Rollos'];

/*
 * Unidades que tienen sentido para cada categoría: los líquidos se miden en litros o galones
 * y los sólidos en pliegos, piezas o rollos. Así no se puede registrar, por ejemplo,
 * una pintura en Piezas o una cinta en Litros. Las pantallas reciben esta misma tabla
 * desde catalogos.php, por eso la regla solo está escrita aquí.
 */
const UNIDADES_POR_CATEGORIA = [
    'Lijas'       => ['Pliegos', 'Piezas', 'Rollos'],
    'Cintas'      => ['Rollos'],
    'Pinturas'    => ['Litros', 'Galones'],
    'Solventes'   => ['Litros', 'Galones'],
    'Consumibles' => ['Piezas', 'Rollos', 'Pliegos'],
    'Barnices'    => ['Litros', 'Galones'],
];

/** Lista «A, B o C» para los mensajes. */
function enLista(array $valores): string
{
    $ultimo = array_pop($valores);
    return $valores ? implode(', ', $valores) . ' o ' . $ultimo : (string)$ultimo;
}

/* ---------------------- Alertas de stock (RF-06) ---------------------- */

/**
 * Recalcula el estado de un insumo después de un alta, entrada, edición o salida:
 *   SIN EXISTENCIA si la existencia es 0,
 *   POR ACABARSE   si es igual o menor al stock mínimo,
 *   DISPONIBLE     si es mayor.
 */
function actualizarEstadoAlerta(string $idInsumo): void
{
    $sql = "UPDATE insumo SET estadoAlerta = CASE
                WHEN stockActual <= 0           THEN 'SIN EXISTENCIA'
                WHEN stockActual <= stockMinimo THEN 'POR ACABARSE'
                ELSE 'DISPONIBLE' END
            WHERE idInsumo = ?";
    conectar()->prepare($sql)->execute([$idInsumo]);
}

/* --------------------------- Validaciones --------------------------- */

/** Texto recibido sin espacios al inicio y al final. */
function texto(array $datos, string $campo): string
{
    return trim((string)($datos[$campo] ?? ''));
}

/** Número recibido (acepta decimales); null si no es un número. */
function numero(array $datos, string $campo): ?float
{
    $valor = $datos[$campo] ?? null;
    return is_numeric($valor) ? round((float)$valor, 2) : null;
}
