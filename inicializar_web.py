import sqlite3

def crear_base_de_datos():
    # 1. Conectar a la base de datos (si no existe, SQLite la crea automáticamente)
    conexion = sqlite3.connect('bar.db')
    cursor = conexion.cursor()
    
    print("Conectando al motor de datos...")

    # 2. Leer el archivo SQL que guardamos en el paso anterior
    try:
        with open('script_menu.sql', 'r', encoding='utf-8') as archivo_sql:
            sql_estructura = archivo_sql.read()
        
        # 3. Ejecutar las tablas e inserciones de la carta
        cursor.executescript(sql_estructura)
        conexion.commit()
        print("¡Base de datos 'bar.db' creada y cargada con éxito!")
        
    except FileNotFoundError:
        print("Error: No encuentro el archivo 'script_menu.sql'. Asegúrate de que está en la misma carpeta.")
        conexion.close()
        return

    # 4. Prueba técnica: Hacemos un JOIN en SQL para comprobar que funciona
    print("\n--- CARTA DEL BAR (Consulta de prueba) ---")
    cursor.execute('''
        SELECT p.nombre, p.precio, c.nombre 
        FROM productos p
        JOIN categorias c ON p.categoria_id = c.id
        WHERE p.disponible = 1
    ''')
    
    productos = cursor.fetchall()
    
    # Recorremos los datos con un bucle limpio de Python
    for fila in productos:
        nombre_producto, precio, nombre_categoria = fila
        print(f"[{nombre_categoria}] {nombre_producto}: {precio:.2f}€")

    # 5. Cerrar la conexión de forma segura
    conexion.close()

if __name__ == "__main__":
    crear_base_de_datos()