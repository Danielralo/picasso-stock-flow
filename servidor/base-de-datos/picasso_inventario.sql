-- =====================================================================
--  Sistema de Inventario · Picasso Autosport
--  Base de datos: picasso_inventario  (MariaDB 10.4 de XAMPP)
--
--  Modelo relacional en 3FN del ERS (6 tablas):
--    USUARIO, CATEGORIA, MARCA, INSUMO, SALIDA_MATERIAL, BITACORA_ACTIVIDAD
--
--  Se puede importar desde phpMyAdmin (pestaña «Importar») o dejar que
--  el sistema lo ejecute solo la primera vez que se abre (api/conexion.php).
-- =====================================================================

CREATE DATABASE IF NOT EXISTS picasso_inventario
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE picasso_inventario;

-- ---------------------------------------------------------------------
-- USUARIO: cuentas con acceso al sistema (RNF-04 a RNF-09)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuario (
  idUsuario           INT          NOT NULL AUTO_INCREMENT,
  nombreCompleto      VARCHAR(100) NOT NULL,
  username            VARCHAR(30)  NOT NULL,
  `contraseñaUsuario` VARCHAR(255) NOT NULL COMMENT 'Se guarda cifrada con password_hash()',
  emailUsuario        VARCHAR(100) NOT NULL,
  rolUsuario          ENUM('Administrador','Encargado') NOT NULL,
  estadoUsuario       ENUM('ACTIVO','INACTIVO') NOT NULL DEFAULT 'ACTIVO',
  PRIMARY KEY (idUsuario),
  UNIQUE KEY uq_usuario_username (username),
  UNIQUE KEY uq_usuario_email (emailUsuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- CATEGORIA: agrupa los insumos (RF-05)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categoria (
  idCategoria     INT         NOT NULL AUTO_INCREMENT,
  nombreCategoria VARCHAR(50) NOT NULL,
  PRIMARY KEY (idCategoria),
  UNIQUE KEY uq_categoria_nombre (nombreCategoria)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- MARCA: marca comercial de los insumos (3FN)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS marca (
  idMarca     INT         NOT NULL AUTO_INCREMENT,
  nombreMarca VARCHAR(50) NOT NULL,
  PRIMARY KEY (idMarca),
  UNIQUE KEY uq_marca_nombre (nombreMarca)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- INSUMO: catálogo y existencias (RF-01 a RF-06)
--   idInsumo es el código del material del proveedor (por ejemplo, DC2000)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS insumo (
  idInsumo         VARCHAR(10)   NOT NULL,
  nombreInsumo     VARCHAR(100)  NOT NULL,
  descripcionBreve VARCHAR(200)  NOT NULL,
  idCategoria      INT           NOT NULL,
  idMarca          INT           NOT NULL,
  unidad           VARCHAR(20)   NOT NULL,
  stockActual      DECIMAL(10,2) NOT NULL DEFAULT 0,
  stockMinimo      DECIMAL(10,2) NOT NULL DEFAULT 0,
  estadoAlerta     ENUM('DISPONIBLE','POR ACABARSE','SIN EXISTENCIA') NOT NULL DEFAULT 'SIN EXISTENCIA',
  PRIMARY KEY (idInsumo),
  KEY fk_insumo_categoria (idCategoria),
  KEY fk_insumo_marca (idMarca),
  CONSTRAINT fk_insumo_categoria FOREIGN KEY (idCategoria) REFERENCES categoria (idCategoria),
  CONSTRAINT fk_insumo_marca     FOREIGN KEY (idMarca)     REFERENCES marca (idMarca),
  CONSTRAINT ck_insumo_stock CHECK (stockActual >= 0 AND stockMinimo >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- SALIDA_MATERIAL: un renglón por cada insumo entregado (RF-10, 1FN)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS salida_material (
  idSalida          INT           NOT NULL AUTO_INCREMENT,
  fecha_Hora        DATETIME      NOT NULL,
  idUsuario         INT           NOT NULL,
  trabajadorDestino VARCHAR(100)  NOT NULL,
  idInsumo          VARCHAR(10)   NOT NULL,
  insumosRetirados  DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (idSalida),
  KEY fk_salida_usuario (idUsuario),
  KEY fk_salida_insumo (idInsumo),
  CONSTRAINT fk_salida_usuario FOREIGN KEY (idUsuario) REFERENCES usuario (idUsuario),
  CONSTRAINT fk_salida_insumo  FOREIGN KEY (idInsumo)  REFERENCES insumo (idInsumo),
  CONSTRAINT ck_salida_cantidad CHECK (insumosRetirados > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- BITACORA_ACTIVIDAD: registro de cada acción (RF-13)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bitacora_actividad (
  idBitacora       INT          NOT NULL AUTO_INCREMENT,
  fecha_HoraAccion DATETIME     NOT NULL,
  idUsuario        INT          NOT NULL,
  tipoAccion       ENUM('ALTA','BAJA','MODIFICACION','SALIDA','ENTRADA','LOGIN') NOT NULL,
  modulo           ENUM('Usuario','Insumo') NOT NULL,
  detalleAccion    VARCHAR(255) NOT NULL,
  PRIMARY KEY (idBitacora),
  KEY fk_bitacora_usuario (idUsuario),
  CONSTRAINT fk_bitacora_usuario FOREIGN KEY (idUsuario) REFERENCES usuario (idUsuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
--  Datos iniciales
-- =====================================================================

-- Cuentas de arranque (cambiar las contraseñas al empezar a usar el sistema)
--   hramos   / picasso    (Administrador)
--   lmarquez / encargado  (Encargado de Almacén)
INSERT IGNORE INTO usuario (idUsuario, nombreCompleto, username, `contraseñaUsuario`, emailUsuario, rolUsuario, estadoUsuario) VALUES
  (1, 'Hector Ramos',  'hramos',   '$2y$10$JTA37tpkcvsN6187x11K8uulIaDj9Zm9fLHbRI4Qag4K1m29SLS/.', 'hramos@example.com',            'Administrador', 'ACTIVO'),
  (2, 'Lucía Márquez', 'lmarquez', '$2y$10$IKaFhwD05xCsZPjMxgPTsuiVZ7y8R2wHB2JPbwwtI6kVR5uuZD6oG', 'lmarquez@picassoautosport.com', 'Encargado',     'ACTIVO');

-- Mismos identificadores que el libro de Excel del modelo relacional
INSERT IGNORE INTO categoria (idCategoria, nombreCategoria) VALUES
  (1, 'Pinturas'), (2, 'Lijas'), (3, 'Solventes'), (4, 'Barnices'), (5, 'Consumibles'), (6, 'Cintas');

INSERT IGNORE INTO marca (idMarca, nombreMarca) VALUES
  (1, 'Sikkens'), (2, '3M'), (3, 'PPG'), (4, 'Sherwin Williams'), (5, 'Roberto'), (6, 'Tuck');

INSERT IGNORE INTO insumo (idInsumo, nombreInsumo, descripcionBreve, idCategoria, idMarca, unidad, stockActual, stockMinimo, estadoAlerta) VALUES
  ('LJ600',  'Lija de agua grano P600',            'Lija de agua para acabado fino',                  2, 2, 'Pliegos',  0.00, 10.00, 'SIN EXISTENCIA'),
  ('LJ1200', 'Lija de agua grano P1200',           'Lija de agua para pulido previo al barniz',       2, 2, 'Pliegos',  9.00, 10.00, 'POR ACABARSE'),
  ('CM2448', 'Cinta masking automotriz 48 mm',     'Cinta de enmascarar de alta adherencia',          6, 6, 'Rollos',  14.00,  6.00, 'DISPONIBLE'),
  ('EN4010', 'Endurecedor rápido para pintura 2K', 'Endurecedor para mezcla de pintura 2K',           1, 3, 'Litros',  18.00,  5.00, 'DISPONIBLE'),
  ('TH100',  'Thinner estándar de limpieza',       'Solvente para limpieza de pistolas y equipo',     3, 3, 'Galones',  2.00,  8.00, 'POR ACABARSE'),
  ('TA300',  'Thinner acrílico de alta pureza',    'Solvente para mezcla de pinturas acrílicas',      3, 4, 'Galones', 12.00,  6.00, 'DISPONIBLE'),
  ('MP100',  'Masilla plástica',                   'Rellenador plástico de acabado fino',             5, 5, 'Piezas',   8.00,  3.00, 'DISPONIBLE'),
  ('DC2000', 'Barniz 2K alto sólido transparente', 'Barniz poliuretano transparente acabado espejo',  4, 1, 'Litros',   4.00,  1.00, 'DISPONIBLE');
