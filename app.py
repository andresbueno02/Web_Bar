from flask import Flask, jsonify, render_template
import sqlite3

app = Flask(__name__)

# Función para conectarnos a la base de datos SQLite
def obtener_datos_carta():
    conexion = sqlite3.connect('bar.db')
    cursor = conexion.cursor()
    
    cursor.execute('''
        SELECT p.nombre, p.precio, c.nombre 
        FROM productos p
        JOIN categorias c ON p.categoria_id = c.id
        WHERE p.disponible = 1
    ''')
    
    productos = cursor.fetchall()
    conexion.close()
    return productos

# 1. RUTA PRINCIPAL: Muestra la interfaz visual de la carta
@app.route('/')
def home():
    return render_template('index.html')

# 2. RUTA DE LA API: Escupe los datos en formato informático JSON
@app.route('/api/carta', methods=['GET'])
def dar_carta():
    datos_crudos = obtener_datos_carta()
    
    carta_structured = []
    for fila in datos_crudos:
        carta_structured.append({
            "producto": fila[0],
            "precio": fila[1],
            "categoria": fila[2]
        })
    
    return jsonify(carta_structured)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True) 
    # Activamos 'debug=True' para que si vuelve a fallar, el error aparezca en el navegador
    