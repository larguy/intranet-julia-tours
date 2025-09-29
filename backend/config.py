import os


class Config:
    # Conexion con la base de datos
    # Formato: postgresql://[usuario]:[contraseña]@[host]:[puerto]/[nombre_db]
    SQLALCHEMY_DATABASE_URI = 'postgresql://admin:jtBUE014@localhost/juliatorurs_db'
    
    # Esta configuración deshabilita una función de Flask-SQLAlchemy que no necesitamos y que consume recursos.
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    MAIL_SERVER = 'smtp.gmail.com'
    MAIL_PORT = 465
    MAIL_USE_SSL = True
    MAIL_USERNAME = 'intranetjuliatours@gmail.com'  # Tu dirección de correo de Gmail
    MAIL_PASSWORD = 'xxneabbchhlvinnp' # La contraseña de aplicacion de 16 dígitos de Gmail
    MAIL_DEFAULT_SENDER = ('Julia Tours Intranet', 'intranetjuliatours@gmail.com')
    
    UPLOAD_FOLDER = 'uploads'

    SECRET_KEY = 'jtBUE014'