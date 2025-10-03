// src/components/intranet/EventoDetalle.js

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import './EventoDetalle.css'; 

const EventoDetalle = () => {
    const { eventoId } = useParams();
    const { user, token } = useAuth();
    const navigate = useNavigate();

    const [evento, setEvento] = useState(null);
    const [miInscripcion, setMiInscripcion] = useState(null);

    // Estado local del formulario del usuario
    const [participa, setParticipa] = useState(false);
    const [detallesUsuario, setDetallesUsuario] = useState('');
    const [respuestasDinamicas, setRespuestasDinamicas] = useState({});

    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const canManage = useMemo(() => 
        user?.role === 'SUPERUSER' || user?.role === 'EDITOR',
        [user]
    );

    const fetchData = useCallback(async () => {
        if (token && eventoId) {
            setIsLoading(true);
            try {
                // 1. Obtener los detalles del evento
                const eventoRes = await axios.get(`${process.env.REACT_APP_API_URL}/eventos/${eventoId}`, { headers: { 'x-access-token': token } });
                setEvento(eventoRes.data);

                // 2. Obtener la inscripción del usuario actual
                const miInscripcionRes = await axios.get(`${process.env.REACT_APP_API_URL}/eventos/${eventoId}/mi-inscripcion`, { headers: { 'x-access-token': token } });
                if (miInscripcionRes.data) {
                    const inscripcion = miInscripcionRes.data;
                    setMiInscripcion(inscripcion);
                    setParticipa(inscripcion.participa);
                    setDetallesUsuario(inscripcion.detalles_usuario || '');
                    setRespuestasDinamicas(inscripcion.respuestas_dinamicas || {});
                }
                
            } catch (err) {
                setError('No se pudo cargar el evento.');
            } finally {
                setIsLoading(false);
            }
        }
    }, [eventoId, token]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleRespuestaDinamicaChange = (questionId, value) => {
        setRespuestasDinamicas(prev => ({ ...prev, [questionId]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');
        setSuccess('');
        try {
            const response = await axios.post(
                `${process.env.REACT_APP_API_URL}/eventos/${eventoId}/inscribir`,
                { participa, detalles_usuario: detallesUsuario, respuestas_dinamicas: respuestasDinamicas },
                { headers: { 'x-access-token': token } }
            );
            setMiInscripcion(response.data);
            setSuccess('Tu inscripción se ha guardado correctamente.');
        } catch (err) {
            setError('Error al guardar la inscripción.');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleDelete = async () => {
        if (window.confirm(`¿Estás seguro de que quieres eliminar el evento "${evento.titulo}"? Esta acción es irreversible.`)) {
            try {
                await axios.delete(`${process.env.REACT_APP_API_URL}/eventos/${eventoId}`, { headers: { 'x-access-token': token } });
                navigate('/index/eventos'); 
            } catch (err) {
                setError('Error al eliminar el evento.');
            }
        }
    };

    if (isLoading) return <p>Cargando evento...</p>;
    if (error) return <p className="error-message">{error}</p>;
    if (!evento) return <p>Evento no encontrado.</p>;

    return (
        <div className="evento-detalle-container">
            <div className="volver-container">
                <Link to="/index/eventos" className="btn-volver">
                    &larr; Volver a todos los eventos
                </Link>
            </div>

            {evento.banner_image && (
                <img src={`${process.env.REACT_APP_API_URL}/uploads/${evento.banner_image}`} alt={evento.titulo} className="evento-detalle-banner" />
            )}
            <div className="evento-detalle-header">
                <h1>{evento.titulo}</h1>
                {canManage && (
                    <div className="evento-actions">
                        <Link to={`/index/eventos/editar/${evento.id}`} className="btn-secondary">Editar</Link>
                        <button onClick={handleDelete} className="btn-danger">Eliminar</button>
                    </div>
                )}
            </div>

            <div className="evento-info">
                <p><strong>Fecha:</strong> {new Date(evento.fecha_hora).toLocaleString('es-ES', { dateStyle: 'full', timeStyle: 'short' })} hs.</p>
                <p><strong>Ubicación:</strong> {evento.ubicacion_texto}</p>
                {evento.ubicacion_mapa && <a href={evento.ubicacion_mapa} target="_blank" rel="noopener noreferrer">Ver en Google Maps</a>}
                {evento.detalle && <p className="evento-detalle-descripcion">{evento.detalle}</p>}
            </div>

            <form onSubmit={handleSubmit} className="inscripcion-form">
                <h3>Tu Asistencia</h3>
                {success && <p className="success-message">{success}</p>}
                
                <div className="participa-options">
                    <label>
                        <input type="radio" name="participa" checked={participa === true} onChange={() => setParticipa(true)} />
                        Sí, participaré
                    </label>
                    <label>
                        <input type="radio" name="participa" checked={participa === false} onChange={() => setParticipa(false)} />
                        No, gracias
                    </label>
                </div>

                {participa && (
                    <div className="form-dinamico-respuestas">
                        {evento.form_dinamico && evento.form_dinamico.map(campo => (
                            <div key={campo.id} className="form-group">
                                <label>{campo.label}</label>
                                {campo.type === 'checkbox' && (
                                    <input type="checkbox" checked={!!respuestasDinamicas[campo.id]} onChange={e => handleRespuestaDinamicaChange(campo.id, e.target.checked)} />
                                )}
                                {campo.type === 'select' && (
                                    <select value={respuestasDinamicas[campo.id] || ''} onChange={e => handleRespuestaDinamicaChange(campo.id, e.target.value)} required>
                                        <option value="" disabled>Selecciona una opción...</option>
                                        {campo.options.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
                                    </select>
                                )}
                            </div>
                        ))}
                        <div className="form-group">
                            <label>Detalles adicionales (ej: alergias, etc.)</label>
                            <textarea value={detallesUsuario} onChange={e => setDetallesUsuario(e.target.value)} rows="2" cols="36"></textarea>
                        </div>
                    </div>
                )}
                <button type="submit" className="btn-primary" disabled={isSubmitting}>
                    {isSubmitting ? 'Guardando...' : (miInscripcion ? 'Actualizar Inscripción' : 'Guardar Respuesta')}
                </button>
            </form>
            
            {/* --- LA SECCIÓN DE LISTA DE INSCRIPTOS HA SIDO ELIMINADA DE ESTE COMPONENTE --- */}
        </div>
    );
};

export default EventoDetalle;