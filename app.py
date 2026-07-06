from flask import Flask, jsonify, render_template
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import os
import sqlite3

# Ruta absoluta a la base de datos, independiente de desde dónde se arranque el servidor
RUTA_DB = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'bar.db')

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
    conexion = sqlite3.connect(RUTA_DB)
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
    # debug desactivado por defecto: el debugger de Werkzeug permite ejecutar código
    # arbitrario y con host 0.0.0.0 quedaría expuesto a toda la red local.
    # Para activarlo en desarrollo: FLASK_DEBUG=1 python app.py
    modo_debug = os.environ.get('FLASK_DEBUG') == '1'
    app.run(host='127.0.0.1' if modo_debug else '0.0.0.0', port=5000, debug=modo_debug)