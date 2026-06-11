-- Activar el soporte de claves foráneas en SQLite
PRAGMA foreign_keys = ON;

-- 1. Crear la tabla de Categorías (Cafés, Cervezas, Bebidas)
CREATE TABLE IF NOT EXISTS categorias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL UNIQUE
);

-- 2. Crear la tabla de Productos
CREATE TABLE IF NOT EXISTS productos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    precio REAL NOT NULL, -- Usamos REAL para guardar los precios con decimales (ej: 1.50)
    disponible INTEGER DEFAULT 1, -- 1 para sí, 0 para si os quedáis sin stock temporalmente
    categoria_id INTEGER,
    FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE CASCADE
);

-- 3. Insertar las categorías básicas de tu bar
INSERT OR IGNORE INTO categorias (nombre) VALUES ('Cafés');
INSERT OR IGNORE INTO categorias (nombre) VALUES ('Cervezas');
INSERT OR IGNORE INTO categorias (nombre) VALUES ('Bebidas y Refrescos');

-- 4. Insertar unos productos de ejemplo para probar la base de datos
-- (Nota: El id 1 es Cafés, el 2 es Cervezas, el 3 es Bebidas)
INSERT INTO productos (nombre, precio, categoria_id) VALUES ('Café Pequeño', 1.40, 1);
INSERT INTO productos (nombre, precio, categoria_id) VALUES ('Café 2x', 1.60, 1);
INSERT INTO productos (nombre, precio, categoria_id) VALUES ('Café con Hielo', 1.70, 1);
INSERT INTO productos (nombre, precio, categoria_id) VALUES ('Cerveza Caña', 1.80, 2);
INSERT INTO productos (nombre, precio, categoria_id) VALUES ('Cerveza Tercio', 2.50, 2);
INSERT INTO productos (nombre, precio, categoria_id) VALUES ('Refresco de Cola', 2.00, 3);