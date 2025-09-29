# test_email.py
from flask import Flask
from flask_mail import Mail, Message

# --- CONFIGURACIÓN ---
# Crea una instancia de la aplicación Flask
app = Flask(__name__)

# Carga la configuración directamente en el objeto de configuración de la app
# REEMPLAZA ESTOS VALORES CON LOS DE TU config.py
app.config.update(
    MAIL_SERVER = 'smtp.gmail.com',
    MAIL_PORT = 465,
    MAIL_USE_SSL = True,
    MAIL_USERNAME = 'intranetjuliatours@gmail.com',  # Tu dirección de correo de Gmail
    MAIL_PASSWORD = 'xxneabbchhlvinnp' # La contraseña de 16 dígitos que generaste
)

# Inicializa Flask-Mail con la aplicación ya configurada
mail = Mail(app)

# --- FUNCIÓN DE PRUEBA ---
def send_test_email():
    # El app_context es necesario para que Flask-Mail sepa qué configuración usar
    with app.app_context():
        print("Intentando enviar un correo de prueba...")
        try:
            msg = Message(
                subject='Correo de Prueba - Intranet Julia Tours',
                sender=('Intranet Julia Tours', app.config['MAIL_USERNAME']),
                recipients=['leandro.ramos@juliatours.com.ar'] 
            )
            msg.body = header='''  
                   
                   
                 Envio de mail formateado en HTML  
                   
                   
                     h2 {font-size:14px;margin: 2px;}  
                     h3 {font-size:12px;margin: 2px;}  
                     p {font-size:10px; margin: 2px;}  
                     td {border: 1px outset}  
                   
                   
                 '''  
            
            mail.send(msg)
            
            print("\n========================================================")
            print("¡ÉXITO! El correo fue enviado sin errores.")
            print("Revisa la bandeja de entrada de 'correo_destino@ejemplo.com'.")
            print("========================================================\n")

        except Exception as e:
            print("\n========================================================")
            print("¡FALLÓ! El envío del correo generó un error.")
            print("Este es el error exacto que debes solucionar:")
            print(f"==> {e}")
            print("========================================================\n")

# --- EJECUCIÓN DEL SCRIPT ---
if __name__ == '__main__':
    send_test_email()