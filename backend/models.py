from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timedelta 
import enum 
from sqlalchemy.sql import func 
from dateutil.parser import parse as parse_date

# Se crea una instancia de SQLAlchemy que se conectará a la app más adelante.
db = SQLAlchemy()

class UserRole(enum.Enum):
    VIEWER = 'viewer' # Rol por defecto, solo lectura
    EDITOR = 'editor' # Puede crear/editar contenido
    SUPERUSER = 'superuser' # Puede hacer todo, incluyendo gestionar usuarios
    



class User(db.Model):
    # SQLAlchemy creará una tabla llamada 'user' basada en el nombre de esta clase.
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False) 

    is_verified = db.Column(db.Boolean, nullable=False, default=False) # Por defecto, el usuario no está verificado
    verification_code = db.Column(db.String(6), nullable=True) # Para guardar el código de 6 dígitos

    reset_token = db.Column(db.String(100), nullable=True)
    reset_token_expiration = db.Column(db.DateTime, nullable=True)

    nombre = db.Column(db.String(100), nullable=True)
    apellido = db.Column(db.String(100), nullable=True)
    interno = db.Column(db.String(20), nullable=True)
    fecha_nacimiento = db.Column(db.Date, nullable=True)
    sector = db.Column(db.String(100), nullable=True)
    sucursal = db.Column(db.String(100), nullable=True)
    profile_image = db.Column(db.String(100), nullable=False, default='default.png')
    guardia_nro = db.Column(db.Integer, nullable=True)

    role = db.Column(db.Enum(UserRole), nullable=False, default=UserRole.VIEWER)

class Novedad(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    asunto = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    author = db.relationship('User')
    attachments = db.relationship('Attachment', backref='novedad', lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        author_info = {'id': None, 'nombre': 'Usuario', 'apellido': 'Eliminado', 'profile_image': 'default.png'}
        if self.author:
            author_info = {
                'id': self.author.id,
                'nombre': self.author.nombre,
                'apellido': self.author.apellido,
                'profile_image': self.author.profile_image
            }

        return {
            'id': self.id,
            'asunto': self.asunto,
            'content': self.content,
            'created_at': self.created_at.isoformat(),
            'author': author_info,
            'attachments': [att.to_dict() for att in self.attachments]
        }

class Attachment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    # Nombre original del archivo subido
    original_filename = db.Column(db.String(255), nullable=False)
    # Nombre único y seguro guardado en el servidor
    saved_filename = db.Column(db.String(255), nullable=False, unique=True)
    # Tipo de archivo (ej: 'image/jpeg', 'application/pdf') para mostrar iconos
    mimetype = db.Column(db.String(100), nullable=False)
    # El ID del post al que pertenece este adjunto
    post_id = db.Column(db.Integer, db.ForeignKey('post.id'), nullable=True) 
    
    novedad_id = db.Column(db.Integer, db.ForeignKey('novedad.id'), nullable=True)

    def to_dict(self):
        return {
            'id': self.id,
            'original_filename': self.original_filename,
            'url': f"/uploads/{self.saved_filename}", 
            'mimetype': self.mimetype
        }

class Post(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    sector = db.Column(db.String(100), nullable=False, index=True)
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    author = db.relationship('User')
    attachments = db.relationship('Attachment', backref='post', lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        author_info = {'id': None, 'nombre': 'Usuario', 'apellido': 'Eliminado', 'profile_image': 'default.png'}
        if self.author:
            author_info = {
                'id': self.author.id,
                'nombre': self.author.nombre,
                'apellido': self.author.apellido,
                'profile_image': self.author.profile_image
            }
        
        return {
            'id': self.id,
            'sector': self.sector,
            'title': self.title,
            'content': self.content,
            'created_at': self.created_at.isoformat(),
            'author': author_info,
            'attachments': [att.to_dict() for att in self.attachments]
        }

class AgendaContact(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(200), nullable=False)
    domicilio = db.Column(db.String(255), nullable=True)
    telefono = db.Column(db.String(100), nullable=False)    
    email = db.Column(db.String(120), nullable=True)
    pagina_web = db.Column(db.String(255), nullable=True)    
    pais = db.Column(db.String(100), nullable=True)
    provincia = db.Column(db.String(100), nullable=True)
    localidad = db.Column(db.String(100), nullable=True)
    detalle = db.Column(db.Text, nullable=True)

    def to_dict(self):
        return {
            'id': self.id,
            'nombre': self.nombre,
            'domicilio': self.domicilio,
            'telefono': self.telefono,
            'pagina_web': self.pagina_web,
            'email': self.email,
            'pais': self.pais,
            'provincia': self.provincia,
            'localidad': self.localidad,
            'detalle': self.detalle
        }
    
class Reunion(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    tema = db.Column(db.String(255), nullable=False)
    start_time = db.Column(db.DateTime(timezone=True), nullable=False)
    end_time = db.Column(db.DateTime(timezone=True), nullable=False)
    ubicacion = db.Column(db.String(255), nullable=True)
    cantidad_personas = db.Column(db.Integer, nullable=True)
    zoom_link = db.Column(db.String(255), nullable=True)
    convoca = db.Column(db.String(100), nullable=True)
    proveedor = db.Column(db.String(100), nullable=True)
    necesita_bebida = db.Column(db.Boolean, default=False)
    necesita_comida = db.Column(db.String(255), nullable=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    creador = db.relationship('User')

    def to_dict(self):
        # Comprueba si el creador existe
        creador_nombre = "Usuario Eliminado"
        if self.creador and self.creador.nombre:
            creador_nombre = f"{self.creador.nombre} {self.creador.apellido or ''}".strip()

        return {
            'id': self.id,
            'title': self.tema,
            'start': self.start_time.isoformat(),
            'end': self.end_time.isoformat(),
            'ubicacion': self.ubicacion,
            'cantidad_personas': self.cantidad_personas,
            'zoom_link': self.zoom_link,
            'convoca': self.convoca,
            'proveedor': self.proveedor,
            'necesita_bebida': self.necesita_bebida,
            'necesita_comida': self.necesita_comida,
            'creador': creador_nombre
        }



class Guardia(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    fecha = db.Column(db.Date, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    
    usuario = db.relationship('User', backref=db.backref('guardias', lazy=True))

    def to_dict(self):
        usuario_info = {
            'id': self.usuario.id,
            'nombre': self.usuario.nombre,
            'apellido': self.usuario.apellido,
            'interno': self.usuario.interno,
            'sector': self.usuario.sector
        } if self.usuario else None

        return {
            'id': self.id,
            'fecha': self.fecha.isoformat(),
            'usuario': usuario_info
        }


class GuardiaFecha(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    fecha = db.Column(db.Date, nullable=False, unique=True) 
    guardia_nro = db.Column(db.Integer, nullable=False) # El número de grupo (1, 2, 3, o 4)

    def to_dict(self):
        return {
            'id': self.id,
            'fecha': self.fecha.isoformat(),
            'guardia_nro': self.guardia_nro
        } 
    

class Evento(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    titulo = db.Column(db.String(200), nullable=False)
    banner_image = db.Column(db.String(100), nullable=True)
    ubicacion_texto = db.Column(db.String(300), nullable=True)
    ubicacion_mapa = db.Column(db.String(500), nullable=True) 
    fecha_hora = db.Column(db.DateTime(timezone=True), nullable=False)
    detalle = db.Column(db.Text, nullable=True)
    ubicacion_evento = db.Column(db.String(100), nullable=False)
    
    form_dinamico = db.Column(db.JSON, nullable=True)

    hidden_from_users = db.Column(db.JSON, nullable=True, default=[])

    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    creador = db.relationship('User', lazy='joined')
    inscripciones = db.relationship('Inscripcion', backref='evento', lazy='dynamic', cascade="all, delete-orphan")

    def to_dict(self):
        return {
            'id': self.id,
            'titulo': self.titulo,
            'banner_image': self.banner_image,
            'ubicacion_texto': self.ubicacion_texto,
            'ubicacion_mapa': self.ubicacion_mapa,
            'fecha_hora': self.fecha_hora.isoformat(),
            'detalle': self.detalle,
            'ubicacion_evento': self.ubicacion_evento,
            'form_dinamico': self.form_dinamico,
            'hidden_from_users': self.hidden_from_users or [],
            'creador': { 'nombre': self.creador.nombre, 'apellido': self.creador.apellido } if self.creador else None
        }

class Inscripcion(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id', ondelete='CASCADE'), nullable=False)
    evento_id = db.Column(db.Integer, db.ForeignKey('evento.id', ondelete='CASCADE'), nullable=False)
    participa = db.Column(db.Boolean, nullable=False, default=False)
    detalles_usuario = db.Column(db.Text, nullable=True)


    respuestas_dinamicas = db.Column(db.JSON, nullable=True)

    usuario = db.relationship('User', foreign_keys=[user_id], lazy='joined')

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'evento_id': self.evento_id,
            'participa': self.participa,
            'detalles_usuario': self.detalles_usuario,
            'respuestas_dinamicas': self.respuestas_dinamicas,
            'usuario': { 'nombre': self.usuario.nombre, 'apellido': self.usuario.apellido } if self.usuario else None
        }
    
# Al final de models.py

class CumpleGif(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id', ondelete='CASCADE'), nullable=False)
    fecha = db.Column(db.Date, nullable=False)
    gif_url = db.Column(db.String(500), nullable=False)

    # Hacemos que la combinación de usuario y fecha sea única
    __table_args__ = (db.UniqueConstraint('user_id', 'fecha', name='_user_fecha_uc'),)