from flask import Flask, jsonify, render_template
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import sqlite3

app = Flask(__name__)

# 1. PERMISOS CORS: Permite que tu frontend No-Code lea los datos de forma segura
CORS(app)

# 2. SEGURIDAD: Limita las peticiones por IP (máximo 20 consultas por minuto por cliente)
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["60 per minute"],
    storage_uri="memory://"
)

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

# Ruta de la interfaz visual local (para pruebas tuyas en el PC)
@app.route('/')
def home():
    return render_template('index.html')

# Ruta de la API (La que pegaremos en el No-Code)
@app.route('/api/carta', methods=['GET'])
@limiter.limit("20 per minute") # Protección específica para esta ruta
def dar_carta():
    datos_crudos = obtener_datos_carta()
    
    carta_estructurada = []
    for fila in datos_crudos:
        carta_estructurada.append({
            "producto": fila[0],
            "precio": fila[1],
            "categoria": fila[2]
        })
    
    return jsonify(carta_estructurada)

if __name__ == '__main__':
    # Usamos debug=True para desarrollo local
    app.run(host='0.0.0.0', port=5000, debug=True)