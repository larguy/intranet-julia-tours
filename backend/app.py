import os
import re
import random
import secrets
import jwt
import requests
from functools import wraps
from datetime import datetime, timedelta, timezone, date, time

from flask import Flask, request, jsonify, send_from_directory
from flask_bcrypt import Bcrypt
from flask_cors import CORS
from flask_mail import Mail, Message
from sqlalchemy import func, or_
from sqlalchemy.exc import IntegrityError
from werkzeug.utils import secure_filename
from dateutil.parser import parse as parse_date


from config import Config
from models import db, User, UserRole, Post, Novedad, AgendaContact, Attachment, Reunion, GuardiaFecha, Evento, Inscripcion, CumpleGif 

app = Flask(__name__)
app.config.from_object(Config)

db.init_app(app)
bcrypt = Bcrypt(app)
CORS(app)
mail = Mail(app)

EMAIL_REGEX = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('x-access-token')
        if not token:
            return jsonify({'message': 'Falta el token'}), 401
        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            current_user = db.session.get(User, data['id'])
            if not current_user:
                return jsonify({'message': 'Token inválido, usuario no encontrado'}), 401
        except Exception as e:
            return jsonify({'message': 'El token es inválido', 'error': str(e)}), 401
        return f(current_user, *args, **kwargs)
    return decorated

def permission_required(*roles):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            token = request.headers.get('x-access-token')
            if not token:
                return jsonify({'message': 'Falta el token'}), 401
            try:
                data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
                user_role = data.get('role')
                current_user_id = data.get('id')
                current_user = db.session.get(User,current_user_id)
                if user_role not in roles:
                    return jsonify({'message': 'Permiso denegado'}), 403
            except Exception as e:
                return jsonify({'message': 'El token es inválido', 'error': str(e)}), 401
            return f(current_user, *args, **kwargs)
        return decorated_function
    return decorator


@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    confirm_password = data.get('confirm_password')

    if not re.match(EMAIL_REGEX, username): return jsonify({'message': 'Formato de correo electrónico inválido'}), 400
    if password != confirm_password: return jsonify({'message': 'Las contraseñas no coinciden'}), 400
    if len(password) < 8: return jsonify({'message': 'La contraseña debe tener al menos 8 caracteres'}), 400
    if not re.search(r'[A-Z]', password): return jsonify({'message': 'La contraseña debe contener al menos una letra mayúscula'}), 400
    if not re.search(r'[a-z]', password): return jsonify({'message': 'La contraseña debe contener al menos una letra minúscula'}), 400
    if not re.search(r'[0-9]', password): return jsonify({'message': 'La contraseña debe contener al menos un número'}), 400

    verification_code = str(random.randint(100000, 999999))
    hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
    new_user = User(username=username, password=hashed_password, is_verified=False, verification_code=verification_code)
    
    try:
        db.session.add(new_user)
        db.session.commit()
        
        msg = Message('Confirma tu cuenta en la Intranet de Julia Tours', recipients=[username])
        msg.html = f"""<div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;"><img src="cid:logo_jt" alt="Julia Tours Logo" style="max-width: 200px; margin-bottom: 20px;"><h1 style="color: #333;">¡Bienvenido a la Intranet!</h1><p style="font-size: 16px;">Gracias por registrarte. Para completar tu registro y activar tu cuenta, por favor utiliza el siguiente código de verificación:</p><p style="font-size: 24px; font-weight: bold; color: #008f39; letter-spacing: 5px; margin: 20px 0; padding: 10px; background-color: #f0f0f0; border-radius: 5px;">{verification_code}</p><p style="font-size: 12px; color: #777;">Si no solicitaste este registro, por favor ignora este correo.</p></div>"""
        with app.open_resource("static/logo.png") as fp:
            msg.attach("logo.png", "image/png", fp.read(), headers={'Content-ID': '<logo_jt>'})
        mail.send(msg)

        return jsonify({'message': 'Registro exitoso. Revisa tu correo para obtener el código de verificación.'}), 201
    except IntegrityError:
        return jsonify({'message': 'Este correo electrónico ya está registrado'}), 409
    except Exception as e:
        print(f"Error detallado: {e}") 
        return jsonify({'message': f'Error al enviar el correo: {str(e)}'}), 500

@app.route('/verify', methods=['POST'])
def verify_email():
    data = request.get_json()
    username = data.get('username')
    code = data.get('code')
    user = User.query.filter(func.lower(User.username) == func.lower(username)).first()
    if not user: return jsonify({'message': 'Usuario no encontrado'}), 404
    if user.is_verified: return jsonify({'message': 'La cuenta ya está verificada'}), 400
    if user.verification_code == code:
        user.is_verified = True
        user.verification_code = None
        db.session.commit()
        return jsonify({'message': 'Cuenta verificada exitosamente. Ahora puedes iniciar sesión.'}), 200
    else:
        return jsonify({'message': 'Código de verificación incorrecto'}), 400

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username_from_request = data.get('username')
    password_from_request = data.get('password')
    user = User.query.filter(func.lower(User.username) == func.lower(username_from_request)).first()
    if user and bcrypt.check_password_hash(user.password, password_from_request):
        if not user.is_verified:
            try:
                new_code = str(random.randint(100000, 999999))
                user.verification_code = new_code
                db.session.commit()
                msg = Message('Nuevo Código de Verificación - Intranet Julia Tours', recipients=[user.username])
                msg.html = f"""<div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;"><img src="cid:logo_jt" alt="Julia Tours Logo" style="max-width: 200px; margin-bottom: 20px;"><h1 style="color: #333;">Verificación Requerida</h1><p style="font-size: 16px;">Hola, parece que tu cuenta aún no ha sido verificada. Para activarla e iniciar sesión, utiliza este nuevo código:</p><p style="font-size: 24px; font-weight: bold; color: #008f39; letter-spacing: 5px; margin: 20px 0; padding: 10px; background-color: #f0f0f0; border-radius: 5px;">{new_code}</p></div>"""
                with app.open_resource("static/logo.png") as fp:
                    msg.attach("logo.png", "image/png", fp.read(), headers={'Content-ID': '<logo_jt>'})
                mail.send(msg)
                return jsonify({'message': 'La cuenta no está verificada. Se ha enviado un nuevo código a tu correo.', 'action_required': 'verify'}), 403
            except Exception as e:
                print(f"Error reenviando código de verificación: {e}")
                return jsonify({'message': 'Tu cuenta no está verificada y hubo un error al reenviar el código.'}), 500
        profile_incomplete = not all([user.nombre, user.apellido, user.interno, user.fecha_nacimiento, user.sector, user.sucursal])
        token = jwt.encode({'id': user.id, 'role': user.role.name, 'profile_incomplete': profile_incomplete, 'profile_image': user.profile_image, 'sector': user.sector, 'exp': datetime.now(timezone.utc) + timedelta(hours=24)}, app.config['SECRET_KEY'], algorithm="HS256")
        return jsonify({'token': token}), 200
    return jsonify({'message': 'Credenciales inválidas'}), 401

@app.route('/request-reset', methods=['POST'])
def request_password_reset():
    data = request.get_json()
    username = data.get('username')
    user = User.query.filter(func.lower(User.username) == func.lower(username)).first()
    if user:
        token = secrets.token_urlsafe(20)
        user.reset_token = token
        user.reset_token_expiration = datetime.utcnow() + timedelta(hours=1)
        db.session.commit()
        reset_link = f'http://localhost:3000/reset-password/{token}'
        msg = Message('Restablecimiento de Contraseña - Intranet Julia Tours', recipients=[user.username])
        msg.body = f'Para restablecer tu contraseña, visita el siguiente enlace: {reset_link}\n\nSi no solicitaste esto, ignora este correo.'
        mail.send(msg)
    return jsonify({'message': 'Si tu correo está registrado, recibirás un enlace para restablecer tu contraseña.'}), 200

@app.route('/reset-password', methods=['POST'])
def reset_password():
    data = request.get_json()
    token = data.get('token')
    new_password = data.get('new_password')
    user = User.query.filter_by(reset_token=token).filter(User.reset_token_expiration > datetime.utcnow()).first()
    if not user: return jsonify({'message': 'El token es inválido o ha expirado.'}), 400
    if len(new_password) < 8: return jsonify({'message': 'La nueva contraseña es muy corta.'}), 400
    user.password = bcrypt.generate_password_hash(new_password).decode('utf-8')
    user.reset_token = None
    user.reset_token_expiration = None
    db.session.commit()
    return jsonify({'message': 'Tu contraseña ha sido actualizada exitosamente.'}), 200

@app.route('/login/refresh-token', methods=['POST'])
@token_required
def refresh_token(current_user):
    profile_incomplete = not all([current_user.nombre, current_user.apellido, current_user.interno, current_user.fecha_nacimiento, current_user.sector, current_user.sucursal])
    token = jwt.encode({'id': current_user.id, 'role': current_user.role.name, 'profile_incomplete': profile_incomplete, 'profile_image': current_user.profile_image, 'sector': current_user.sector, 'exp': datetime.now(timezone.utc) + timedelta(hours=24)}, app.config['SECRET_KEY'], algorithm="HS256")
    return jsonify({'token': token})

@app.route('/profile', methods=['GET'])
@token_required
def get_profile(current_user):
    profile_data = {'nombre': current_user.nombre, 'apellido': current_user.apellido, 'interno': current_user.interno, 'correo': current_user.username, 'fecha_nacimiento': current_user.fecha_nacimiento.strftime('%Y-%m-%d') if current_user.fecha_nacimiento else '', 'sector': current_user.sector, 'sucursal': current_user.sucursal, 'profile_image': current_user.profile_image, 'guardia_nro': current_user.guardia_nro}
    return jsonify(profile_data), 200

@app.route('/profile', methods=['POST'])
@token_required
def update_profile(current_user):
    data = request.get_json()
    current_user.nombre = data.get('nombre')
    current_user.apellido = data.get('apellido')
    current_user.interno = data.get('interno')
    if data.get('fecha_nacimiento'): current_user.fecha_nacimiento = datetime.strptime(data.get('fecha_nacimiento'), '%Y-%m-%d').date()
    current_user.sector = data.get('sector')
    current_user.sucursal = data.get('sucursal')
    guardia_nro = data.get('guardia_nro')
    if guardia_nro and str(guardia_nro).isdigit() and 1 <= int(guardia_nro) <= 4:
        current_user.guardia_nro = int(guardia_nro)
    else:
        current_user.guardia_nro = None
    db.session.commit()
    return jsonify({'message': 'Perfil actualizado exitosamente'}), 200

@app.route('/profile/upload-image', methods=['POST'])
@token_required
def upload_profile_image(current_user):
    if 'profile_pic' not in request.files: return jsonify({'message': 'No se encontró el archivo (clave "profile_pic")'}), 400
    file = request.files['profile_pic']
    if file.filename == '': return jsonify({'message': 'No se seleccionó ningún archivo'}), 400
    if file:
        filename = secure_filename(file.filename)
        unique_filename = f"{current_user.id}_{datetime.now().timestamp()}_{filename}"
        file.save(os.path.join(app.config['UPLOAD_FOLDER'], unique_filename))
        current_user.profile_image = unique_filename
        db.session.commit()
        return jsonify({'message': 'Imagen actualizada correctamente', 'profile_image': unique_filename}), 200
    return jsonify({'message': 'Error inesperado'}), 500

@app.route('/upload-file', methods=['POST'])
@permission_required('EDITOR', 'SUPERUSER')
def upload_file(current_user):
    if 'upload' not in request.files:
        return jsonify({'error': {'message': 'No se encontró el archivo (clave "upload")'}}), 400
    file = request.files['upload']
    if not file or file.filename == '':
        return jsonify({'error': {'message': 'No se seleccionó ningún archivo'}}), 400
    filename = secure_filename(file.filename)
    unique_filename = f"{current_user.id}_{datetime.now().timestamp()}_{filename}"
    file.save(os.path.join(app.config['UPLOAD_FOLDER'], unique_filename))
    file_url = f"/uploads/{unique_filename}"
    return jsonify({'url': file_url, 'name': filename})

@app.route('/uploads/<path:filename>')
def serve_uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/user/<int:user_id>/profile', methods=['GET'])
@token_required
def get_user_profile(current_user, user_id):
    user = db.session.get(User, user_id)
    if not user: return jsonify({'message': 'Usuario no encontrado'}), 404
    profile_data = {'nombre': user.nombre, 'apellido': user.apellido, 'interno': user.interno, 'correo': user.username, 'fecha_nacimiento': user.fecha_nacimiento.strftime('%Y-%m-%d') if user.fecha_nacimiento else None, 'sector': user.sector, 'sucursal': user.sucursal, 'profile_image': user.profile_image, 'guardia_nro': user.guardia_nro}
    return jsonify(profile_data), 200

@app.route('/internos', methods=['GET'])
@token_required
def get_internos(current_user):
    users = User.query.filter(User.nombre.isnot(None)).order_by(User.nombre).all()
    results = [{'id': user.id, 'nombre': user.nombre, 'apellido': user.apellido, 'username': user.username, 'sector': user.sector, 'interno': user.interno, 'sucursal': user.sucursal, 'fecha_nacimiento': user.fecha_nacimiento.strftime('%Y-%m-%d') if user.fecha_nacimiento else None, 'profile_image': user.profile_image, 'guardia_nro': user.guardia_nro} for user in users]
    return jsonify(results), 200

@app.route('/admin/users', methods=['GET'])
@permission_required('SUPERUSER')
def get_all_users(current_user):
    users = User.query.all()
    user_list = [{'id': user.id, 'username': user.username, 'role': user.role.name, 'guardia_nro': user.guardia_nro, 'sector': user.sector, 'sucursal': user.sucursal} for user in users]
    return jsonify(user_list)

@app.route('/admin/users/<int:user_id>/role', methods=['POST'])
@permission_required('SUPERUSER')
def set_user_role(current_user, user_id):
    user_to_modify = db.session.get(User,user_id)
    if not user_to_modify: return jsonify({'message': 'Usuario no encontrado'}), 404
    data = request.get_json()
    new_role_str = data.get('role')
    if not new_role_str: return jsonify({'message': 'No se proporcionó un rol'}), 400
    try:
        new_role_enum = UserRole[new_role_str] 
    except KeyError:
        return jsonify({'message': f'Rol inválido. Los roles válidos son: {[role.name for role in UserRole]}'}), 400
    user_to_modify.role = new_role_enum
    db.session.commit()
    return jsonify({'message': f'Rol del usuario {user_to_modify.username} actualizado a {new_role_enum.name}'})

@app.route('/admin/users/<int:user_id>/guardia', methods=['POST'])
@permission_required('SUPERUSER')
def set_user_guardia(current_user, user_id):
    user_to_modify = db.session.get(User, user_id)
    if not user_to_modify: return jsonify({'message': 'Usuario no encontrado'}), 404
    data = request.get_json()
    guardia_nro = data.get('guardia_nro')
    if guardia_nro is None or (isinstance(guardia_nro, int) and 1 <= guardia_nro <= 4):
        user_to_modify.guardia_nro = guardia_nro
        db.session.commit()
        return jsonify({'message': f'Guardia para {user_to_modify.username} actualizada.'})
    else:
        return jsonify({'message': 'Número de guardia inválido. Debe ser entre 1 y 4, o nulo.'}), 400
        
@app.route('/admin/users/<int:user_id>/sector', methods=['POST'])
@permission_required('SUPERUSER')
def set_user_sector(current_user, user_id):
    user_to_modify = db.session.get(User, user_id)
    if not user_to_modify: return jsonify({'message': 'Usuario no encontrado'}), 404
    if user_to_modify.id == current_user.id: return jsonify({'message': 'No puedes modificar tu propio sector desde este panel.'}), 403
    data = request.get_json()
    new_sector = data.get('sector')
    if new_sector and isinstance(new_sector, str) and len(new_sector) < 100:
        user_to_modify.sector = new_sector
        db.session.commit()
        return jsonify({'message': f'Sector de {user_to_modify.username} actualizado.'})
    else:
        return jsonify({'message': 'El sector proporcionado es inválido.'}), 400

@app.route('/admin/users/<int:user_id>/interno', methods=['POST'])
@permission_required('SUPERUSER')
def set_user_interno(current_user, user_id):
    user_to_modify = db.session.get(User, user_id)
    if not user_to_modify: return jsonify({'message': 'Usuario no encontrado'}), 404
    if user_to_modify.id == current_user.id: return jsonify({'message': 'No puedes modificar tu propio interno desde este panel.'}), 403
    data = request.get_json()
    new_interno = data.get('interno')
    if new_interno and isinstance(new_interno, str) and len(new_interno) < 20:
        user_to_modify.interno = new_interno
        db.session.commit()
        return jsonify({'message': f'Interno de {user_to_modify.username} actualizado.'})
    else:
        return jsonify({'message': 'El interno proporcionado es inválido.'}), 400
    
@app.route('/admin/users/<int:user_id>/sucursal', methods=['POST'])
@permission_required('SUPERUSER')
def set_user_sucursal(current_user, user_id):
    user_to_modify = db.session.get(User, user_id)
    if not user_to_modify:
        return jsonify({'message': 'Usuario no encontrado'}), 404

    if user_to_modify.id == current_user.id:
        return jsonify({'message': 'No puedes modificar tu propia sucursal desde este panel.'}), 403

    data = request.get_json()
    new_sucursal = data.get('sucursal')

    if new_sucursal and isinstance(new_sucursal, str):
        user_to_modify.sucursal = new_sucursal
        db.session.commit()
        return jsonify({'message': f'Sucursal de {user_to_modify.username} actualizada.'})
    else:
        return jsonify({'message': 'La sucursal proporcionada es inválida.'}), 400

@app.route('/admin/users/<int:user_id>', methods=['DELETE'])
@permission_required('SUPERUSER')
def delete_user(current_user, user_id):
    user_to_delete = db.session.get(User, user_id)
    if not user_to_delete: return jsonify({'message': 'Usuario no encontrado'}), 404
    if user_to_delete.id == current_user.id: return jsonify({'message': 'No puedes eliminar tu propia cuenta de superusuario.'}), 403
    try:
        db.session.delete(user_to_delete)
        db.session.commit()
        return jsonify({'message': f'Usuario {user_to_delete.username} ha sido eliminado.'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error al eliminar el usuario: {str(e)}'}), 500

@app.route('/informacion/<string:sector_name>/all', methods=['GET'])
@token_required
def get_all_posts_by_sector(current_user, sector_name):
    posts = Post.query.filter_by(sector=sector_name).order_by(Post.created_at.desc()).all()
    return jsonify([post.to_dict() for post in posts])

@app.route('/informacion', methods=['POST'])
@token_required
def create_post(current_user):
    data = request.get_json()
    sector = data.get('sector')
    title = data.get('title')
    content = data.get('content')
    attachments_data = data.get('attachments', [])
    if not sector or not title: return jsonify({'message': 'Faltan datos (sector o título)'}), 400
    can_create = (current_user.role == UserRole.SUPERUSER or (current_user.role == UserRole.EDITOR and current_user.sector == sector))
    if not can_create: return jsonify({'message': 'Permiso denegado para publicar en este sector'}), 403
    new_post = Post(sector=sector, title=title, content=content, user_id=current_user.id)
    for att_data in attachments_data:
        new_attachment = Attachment(original_filename=att_data.get('name'), saved_filename=att_data.get('url').split('/')[-1], mimetype='application/octet-stream', post=new_post)
        db.session.add(new_attachment)
    db.session.add(new_post)
    db.session.commit()
    return jsonify(new_post.to_dict()), 201

@app.route('/informacion/post/<int:post_id>', methods=['GET', 'PUT', 'DELETE'])
@token_required
def handle_single_post(current_user, post_id):
    post = db.session.get(Post, post_id)
    if not post: return jsonify({'message': 'Publicación no encontrada'}), 404
    if request.method == 'GET':
        return jsonify(post.to_dict())
    if request.method == 'PUT':
        can_edit = (current_user.role == UserRole.SUPERUSER or (current_user.role == UserRole.EDITOR and current_user.sector == post.sector))
        if not can_edit: return jsonify({'message': 'Permiso denegado para editar esta publicación'}), 403
        data = request.get_json()
        post.title = data.get('title', post.title)
        post.content = data.get('content', post.content)
        for attachment in post.attachments:
            db.session.delete(attachment)
        attachments_data = data.get('attachments', [])
        for att_data in attachments_data:
            new_attachment = Attachment(original_filename=att_data.get('name') or att_data.get('original_filename'), saved_filename=att_data.get('url').split('/')[-1], mimetype='application/octet-stream', post=post)
            db.session.add(new_attachment)
        db.session.commit()
        return jsonify(post.to_dict()), 200
    if request.method == 'DELETE':
        can_delete = (current_user.role == UserRole.SUPERUSER or post.user_id == current_user.id)
        if not can_delete: return jsonify({'message': 'Permiso denegado para eliminar esta publicación'}), 403
        db.session.delete(post)
        db.session.commit()
        return jsonify({'message': 'Publicación eliminada correctamente'}), 200

@app.route('/novedades', methods=['GET', 'POST'])
@token_required
def handle_novedades(current_user):
    if request.method == 'GET':
        page = request.args.get('page', 1, type=int)
        items_per_page = 10
        pagination = Novedad.query.order_by(Novedad.created_at.desc()).paginate(page=page, per_page=items_per_page, error_out=False)
        return jsonify({'novedades': [n.to_dict() for n in pagination.items], 'total_pages': pagination.pages, 'current_page': pagination.page, 'has_next': pagination.has_next, 'has_prev': pagination.has_prev})

    if request.method == 'POST':
        if not (current_user.role == UserRole.SUPERUSER or (current_user.role == UserRole.EDITOR and current_user.sector == 'Administracion')):
            return jsonify({'message': 'Permiso denegado para publicar novedades'}), 403
        data = request.get_json()
        asunto, content = data.get('asunto'), data.get('content')
        if not asunto or not content: return jsonify({'message': 'Faltan datos (asunto o contenido)'}), 400
        new_novedad = Novedad(asunto=asunto, content=content, user_id=current_user.id)
        db.session.add(new_novedad)
        db.session.commit()
        return jsonify(new_novedad.to_dict()), 201

@app.route('/novedades/<int:novedad_id>', methods=['DELETE'])
@token_required
def delete_novedad(current_user, novedad_id):
    novedad = db.session.get(Novedad, novedad_id)
    if not novedad: return jsonify({'message': 'Novedad no encontrada'}), 404
    can_delete = (current_user.role == UserRole.SUPERUSER or novedad.user_id == current_user.id)
    if not can_delete: return jsonify({'message': 'Permiso denegado para eliminar esta novedad'}), 403
    db.session.delete(novedad)
    db.session.commit()
    return jsonify({'message': 'Novedad eliminada correctamente'}), 200

# --- SECCIÓN DE AGENDA ---
@app.route('/agenda', methods=['GET', 'POST'])
@token_required
def handle_agenda(current_user):
    if request.method == 'GET':
        contacts = AgendaContact.query.order_by(AgendaContact.nombre).all()
        return jsonify([contact.to_dict() for contact in contacts])

    if request.method == 'POST':
        if not (current_user.role == UserRole.EDITOR or current_user.role == UserRole.SUPERUSER):
            return jsonify({'message': 'Permiso denegado'}), 403
        data = request.get_json()
        if not data.get('nombre') or not data.get('telefono'): return jsonify({'message': 'Nombre y Teléfono son campos obligatorios'}), 400
        new_contact = AgendaContact(**data)
        db.session.add(new_contact)
        db.session.commit()
        return jsonify(new_contact.to_dict()), 201

@app.route('/agenda/<int:contact_id>', methods=['PUT', 'DELETE'])
@permission_required('EDITOR', 'SUPERUSER')
def handle_single_agenda_contact(current_user, contact_id):
    contact = db.session.get(AgendaContact, contact_id)
    if not contact: return jsonify({'message': 'Contacto no encontrado'}), 404
    if request.method == 'PUT':
        data = request.get_json()
        if not data.get('nombre') or not data.get('telefono'): return jsonify({'message': 'Nombre y Teléfono son campos obligatorios'}), 400
        for key, value in data.items():
            setattr(contact, key, value)
        db.session.commit()
        return jsonify(contact.to_dict())
    if request.method == 'DELETE':
        db.session.delete(contact)
        db.session.commit()
        return jsonify({'message': 'Contacto eliminado correctamente'})

# --- SECCIÓN DE REUNIONES Y GUARDIAS ---
@app.route('/reuniones/all', methods=['GET'])
@token_required
def get_all_reuniones(current_user):
    reuniones = Reunion.query.order_by(Reunion.start_time).all()
    eventos_reuniones = [reunion.to_dict() for reunion in reuniones]
    fechas_guardia = GuardiaFecha.query.all()
    eventos_guardia = []
    for guardia in fechas_guardia:
        if guardia.guardia_nro == 5:
            event_title, all_day_event, event_type = "FERIADO", True, "feriado"
            start_time, end_time = datetime.combine(guardia.fecha, time(0, 0)), datetime.combine(guardia.fecha, time(23, 59))
        else:
            event_title, all_day_event, event_type = f"GUARDIA {guardia.guardia_nro}", False, "guardia"
            start_time, end_time = datetime.combine(guardia.fecha, time(10, 0)), datetime.combine(guardia.fecha, time(13, 0))
        eventos_guardia.append({'id': f"g-{guardia.id}", 'title': event_title, 'start': start_time.isoformat(), 'end': end_time.isoformat(), 'allDay': all_day_event, 'type': event_type, 'guardia_nro': guardia.guardia_nro})
    todos_los_eventos = eventos_reuniones + eventos_guardia
    return jsonify(todos_los_eventos)

@app.route('/reuniones', methods=['POST'])
@permission_required('EDITOR', 'SUPERUSER')
def create_reunion(current_user):
    data = request.get_json()
    if not data.get('tema') or not data.get('start') or not data.get('end'): return jsonify({'message': 'Tema y fechas son obligatorios'}), 400
    try:
        new_reunion = Reunion(tema=data.get('tema'), start_time=parse_date(data.get('start')), end_time=parse_date(data.get('end')), ubicacion=data.get('ubicacion'), cantidad_personas=data.get('cantidad_personas'), zoom_link=data.get('zoom_link'), convoca=data.get('convoca'), proveedor=data.get('proveedor'), necesita_bebida=data.get('necesita_bebida', False), necesita_comida=data.get('necesita_comida'), user_id=current_user.id)
        db.session.add(new_reunion)
        db.session.commit()
        return jsonify(new_reunion.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error en el servidor: {str(e)}'}), 500

@app.route('/reuniones/<int:reunion_id>', methods=['PUT', 'DELETE'])
@permission_required('EDITOR', 'SUPERUSER')
def handle_single_reunion(current_user, reunion_id):
    reunion = db.session.get(Reunion, reunion_id)
    if not reunion:
        return jsonify({'message': 'Reunión no encontrada'}), 404

    # --- MÉTODO PUT: Actualizar la reunión ---
    if request.method == 'PUT':
        data = request.get_json()
        try:
            # Actualizamos explícitamente solo los campos que nos interesan
            reunion.tema = data.get('tema', reunion.tema)
            if data.get('start'):
                reunion.start_time = parse_date(data.get('start'))
            if data.get('end'):
                reunion.end_time = parse_date(data.get('end'))
            
            reunion.ubicacion = data.get('ubicacion', reunion.ubicacion)
            reunion.cantidad_personas = data.get('cantidad_personas', reunion.cantidad_personas)
            reunion.zoom_link = data.get('zoom_link', reunion.zoom_link)
            reunion.convoca = data.get('convoca', reunion.convoca)
            reunion.proveedor = data.get('proveedor', reunion.proveedor)
            reunion.necesita_bebida = data.get('necesita_bebida', reunion.necesita_bebida)
            reunion.necesita_comida = data.get('necesita_comida', reunion.necesita_comida)
            
            db.session.commit()
            return jsonify(reunion.to_dict())
        except Exception as e:
            db.session.rollback()
            print(f"Error al actualizar reunión: {e}") # Imprime el error real en la consola del backend
            return jsonify({'message': f'Error en el servidor: {str(e)}'}), 500

    # --- MÉTODO DELETE: Eliminar la reunión ---
    if request.method == 'DELETE':
        db.session.delete(reunion)
        db.session.commit()
        return jsonify({'message': 'Reunión eliminada correctamente'})

@app.route('/guardias/fechas', methods=['GET', 'POST'])
@token_required
def handle_guardias_fechas(current_user):
    if request.method == 'GET':
        fechas = GuardiaFecha.query.order_by(GuardiaFecha.fecha.asc()).all()
        return jsonify([fecha.to_dict() for fecha in fechas])
    if request.method == 'POST':
        if not (current_user.role == UserRole.SUPERUSER or (current_user.role == UserRole.EDITOR and current_user.sector == 'Administracion')):
            return jsonify({'message': 'Permiso denegado'}), 403
        data = request.get_json()
        fecha_str, guardia_nro = data.get('fecha'), data.get('guardia_nro')
        if not fecha_str or not guardia_nro: return jsonify({'message': 'Faltan datos (fecha, guardia_nro)'}), 400
        try:
            fecha_obj = datetime.strptime(fecha_str, '%Y-%m-%d').date()
            if GuardiaFecha.query.filter_by(fecha=fecha_obj).first():
                return jsonify({'message': 'Ya existe una guardia asignada para esa fecha'}), 409
            new_guardia_fecha = GuardiaFecha(fecha=fecha_obj, guardia_nro=int(guardia_nro))
            db.session.add(new_guardia_fecha)
            db.session.commit()
            return jsonify(new_guardia_fecha.to_dict()), 201
        except Exception as e:
            db.session.rollback()
            return jsonify({'message': f'Error en el servidor: {str(e)}'}), 500

@app.route('/guardias/fechas/<int:id>', methods=['DELETE'])
@token_required
def delete_guardia_fecha(current_user, id):
    if not (current_user.role == UserRole.SUPERUSER or (current_user.role == UserRole.EDITOR and current_user.sector == 'Administracion')):
        return jsonify({'message': 'Permiso denegado'}), 403
    guardia_fecha = db.session.get(GuardiaFecha, id)
    if not guardia_fecha: return jsonify({'message': 'Fecha de guardia no encontrada'}), 404
    db.session.delete(guardia_fecha)
    db.session.commit()
    return jsonify({'message': 'Fecha de guardia eliminada'})

@app.route('/eventos', methods=['POST'])
@permission_required('EDITOR', 'SUPERUSER')
def create_evento(current_user):
    data = request.get_json()
    
    if not data.get('titulo') or not data.get('fecha_hora') or not data.get('ubicacion_evento'):
        return jsonify({'message': 'Título, Fecha/Hora y Ubicación son obligatorios'}), 400

    nuevo_evento = Evento(
        titulo=data.get('titulo'),
        banner_image=data.get('banner_image'),
        ubicacion_texto=data.get('ubicacion_texto'),
        ubicacion_mapa=data.get('ubicacion_mapa'),
        fecha_hora=parse_date(data.get('fecha_hora')),
        detalle=data.get('detalle'),
        ubicacion_evento=data.get('ubicacion_evento'),
        hidden_from_users=data.get('hidden_from_users') or [],
        form_dinamico=data.get('form_dinamico'),
        user_id=current_user.id
    )
    db.session.add(nuevo_evento)
    db.session.commit()
    return jsonify(nuevo_evento.to_dict()), 201

@app.route('/eventos', methods=['GET'])
@token_required
def get_eventos(current_user):
    now = datetime.now(timezone.utc)
    
    base_query = Evento.query.filter(Evento.fecha_hora >= now)
    
    if current_user.role != UserRole.SUPERUSER:
        base_query = base_query.filter(
            or_(
                Evento.ubicacion_evento == current_user.sucursal,
                Evento.ubicacion_evento == 'Julia Tours'
            )
        )

    potential_events = base_query.order_by(Evento.fecha_hora.asc()).all()

    eventos_visibles = []
    for evento in potential_events:
        if current_user.role == UserRole.SUPERUSER:
            eventos_visibles.append(evento)
            continue

        hidden_list = evento.hidden_from_users or []
        

        try:
            hidden_ids = {int(uid) for uid in hidden_list}
        except (ValueError, TypeError):
            hidden_ids = set()

        if current_user.id not in hidden_ids:
            eventos_visibles.append(evento)
        
    user_inscripcion_ids = {insc.evento_id for insc in Inscripcion.query.filter_by(user_id=current_user.id).all()}
    eventos_data = []
    for evento in eventos_visibles:
        evento_dict = evento.to_dict()
        evento_dict['is_user_inscribed'] = evento.id in user_inscripcion_ids
        eventos_data.append(evento_dict)
        
    return jsonify(eventos_data)


@app.route('/eventos/<int:evento_id>', methods=['GET', 'PUT', 'DELETE'])
@token_required
def handle_single_evento(current_user, evento_id):
    evento = db.session.get(Evento, evento_id)
    if not evento:
        return jsonify({'message': 'Evento no encontrado'}), 404

    # --- MÉTODO GET ---
    if request.method == 'GET':
        return jsonify(evento.to_dict())

    # --- MÉTODOS PUT y DELETE (solo para admins) ---
    if not (current_user.role == UserRole.SUPERUSER or current_user.role == UserRole.EDITOR):
        return jsonify({'message': 'Permiso denegado'}), 403

    if request.method == 'PUT':
        data = request.get_json()
        evento.titulo = data.get('titulo', evento.titulo)
        evento.ubicacion_evento = data.get('ubicacion_evento', evento.ubicacion_evento)
        evento.banner_image = data.get('banner_image', evento.banner_image)
        evento.ubicacion_texto = data.get('ubicacion_texto', evento.ubicacion_texto)
        evento.ubicacion_mapa = data.get('ubicacion_mapa', evento.ubicacion_mapa)
        if data.get('fecha_hora'):
            evento.fecha_hora = parse_date(data.get('fecha_hora'))
        evento.detalle = data.get('detalle', evento.detalle)
        evento.form_dinamico = data.get('form_dinamico', evento.form_dinamico)
        evento.hidden_from_users = data.get('hidden_from_users') or []

        db.session.commit()
        return jsonify(evento.to_dict()), 200

    # --- MÉTODO DELETE: Eliminar el evento ---
    if request.method == 'DELETE':
        try:
            # Opcional pero recomendado: eliminar el banner del disco si existe
            if evento.banner_image:
                image_path = os.path.join(app.config['UPLOAD_FOLDER'], evento.banner_image)
                if os.path.exists(image_path):
                    os.remove(image_path)
            
            db.session.delete(evento)
            db.session.commit()
            return jsonify({'message': 'Evento eliminado correctamente'}), 200
        except Exception as e:
            db.session.rollback()
            return jsonify({'message': f'Error al eliminar el evento: {str(e)}'}), 500

@app.route('/eventos/<int:evento_id>/inscribir', methods=['POST'])
@token_required
def inscribir_evento(current_user, evento_id):
    inscripcion = Inscripcion.query.filter_by(user_id=current_user.id, evento_id=evento_id).first()
    if not inscripcion: inscripcion = Inscripcion(user_id=current_user.id, evento_id=evento_id)
    data = request.get_json()
    inscripcion.participa, inscripcion.detalles_usuario, inscripcion.respuestas_dinamicas = data.get('participa', False), data.get('detalles_usuario'), data.get('respuestas_dinamicas')
    db.session.add(inscripcion)
    db.session.commit()
    return jsonify(inscripcion.to_dict())

@app.route('/eventos/<int:evento_id>/mi-inscripcion', methods=['GET'])
@token_required
def get_mi_inscripcion(current_user, evento_id):
    inscripcion = Inscripcion.query.filter_by(user_id=current_user.id, evento_id=evento_id).first()
    if not inscripcion: return jsonify(None), 200
    return jsonify(inscripcion.to_dict())

@app.route('/eventos/<int:evento_id>/inscripciones', methods=['GET'])
@permission_required('EDITOR', 'SUPERUSER')
def get_inscripciones_evento(current_user, evento_id):
    evento = db.session.get(Evento, evento_id)
    if not evento: return jsonify({'message': 'Evento no encontrado'}), 404
    inscripciones = evento.inscripciones.all()
    return jsonify([insc.to_dict() for insc in inscripciones])

@app.route('/cumpleanos', methods=['GET'])
@token_required
def get_cumpleanos(current_user):
    today = datetime.now().date()
    
    # 1. Buscamos a los cumpleañeros de hoy
    cumpleaneros = User.query.filter(
        func.extract('month', User.fecha_nacimiento) == today.month,
        func.extract('day', User.fecha_nacimiento) == today.day
    ).all()

    results = []
    for user in cumpleaneros:
        # 2. Para cada cumpleañero, buscamos si ya tiene un GIF asignado para hoy
        gif_asignado = CumpleGif.query.filter_by(user_id=user.id, fecha=today).first()

        if not gif_asignado:
            # Si NO tiene GIF, le asignamos uno aleatorio
            try:
                giphy_url = f"https://api.giphy.com/v1/gifs/search?api_key=9OgBGuwBfcLyAMuxeKkqNFQMelskBRVN&q=happy+birthday+funny&limit=50&rating=g"
                response = requests.get(giphy_url)
                response.raise_for_status() # Lanza un error si la petición falla (ej. 4xx o 5xx)
                
                gifs = response.json().get('data', [])
                if gifs:
                    random_gif = random.choice(gifs)
                    gif_url = random_gif['images']['original']['url']
                    
                    # Guardamos el GIF en nuestra base de datos
                    nuevo_gif = CumpleGif(user_id=user.id, fecha=today, gif_url=gif_url)
                    db.session.add(nuevo_gif)
                    db.session.commit()
                    gif_asignado = nuevo_gif
            except Exception as e:
                print(f"Error al obtener GIF de Giphy: {e}")
                gif_asignado = None # En caso de error, no habrá GIF

        results.append({
            'id': user.id,
            'nombre': user.nombre,
            'apellido': user.apellido,
            'sector': user.sector,
            'profile_image': user.profile_image,
            'gif_url': gif_asignado.gif_url if gif_asignado else None
        })
        
    return jsonify(results)

# Endpoint para cambiar el GIF de un usuario
@app.route('/cumpleanos/<int:user_id>/change-gif', methods=['POST'])
@token_required
def change_cumple_gif(current_user, user_id):
    today = datetime.now().date()
    
    # Permiso: Solo el propio cumpleañero o un superusuario pueden cambiar el GIF
    if not (current_user.id == user_id or current_user.role == UserRole.SUPERUSER):
        return jsonify({'message': 'Permiso denegado'}), 403

    gif_a_cambiar = CumpleGif.query.filter_by(user_id=user_id, fecha=today).first()
    if not gif_a_cambiar:
        return jsonify({'message': 'No hay un GIF asignado para este usuario hoy'}), 404

    # Obtenemos un nuevo GIF aleatorio de Giphy
    try:
        giphy_url = f"https://api.giphy.com/v1/gifs/search?api_key=9OgBGuwBfcLyAMuxeKkqNFQMelskBRVN&q=happy+birthday+funny&limit=50&rating=g"
        response = requests.get(giphy_url)
        response.raise_for_status()
        
        gifs = response.json().get('data', [])
        if gifs:
            new_gif_url = random.choice(gifs)['images']['original']['url']
            
            # Actualizamos la URL en la base de datos
            gif_a_cambiar.gif_url = new_gif_url
            db.session.commit()
            
            return jsonify({'message': 'GIF actualizado', 'new_gif_url': new_gif_url}), 200
        else:
            return jsonify({'message': 'No se pudieron obtener nuevos GIFs de Giphy'}), 500
    except Exception as e:
        return jsonify({'message': f'Error al contactar con Giphy: {str(e)}'}), 500

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, host='0.0.0.0')