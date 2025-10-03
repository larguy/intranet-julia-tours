// src/components/intranet/Eventos.js

import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import './Eventos.css';

const Eventos = () => {
    const { user, token } = useAuth();
    const [eventos, setEventos] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const [activeEventId, setActiveEventId] = useState(null); 
    const [inscripciones, setInscripciones] = useState([]);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);

    useEffect(() => {
        const fetchEventos = async () => {
            if (token) {
                try {
                    const response = await axios.get(`${process.env.REACT_APP_API_URL}/eventos`, {
                        headers: { 'x-access-token': token }
                    });
                    setEventos(response.data);
                } catch (err) {
                    setError('No se pudieron cargar los eventos.');
                } finally {
                    setIsLoading(false);
                }
            }
        };
        fetchEventos();
    }, [token]);

    const toggleDetails = async (eventoId) => {
        if (activeEventId === eventoId) {
            setActiveEventId(null);
            setInscripciones([]);
            return;
        }

        setIsLoadingDetails(true);
        setActiveEventId(eventoId);
        try {
            const response = await axios.get(`${process.env.REACT_APP_API_URL}/eventos/${eventoId}/inscripciones`, {
                headers: { 'x-access-token': token }
            });
            setInscripciones(response.data);
        } catch (err) {
            setError('Error al cargar los detalles de inscripción.');
            setActiveEventId(null);
        } finally {
            setIsLoadingDetails(false);
        }
    };

    const summaryData = useMemo(() => {
        if (!activeEventId || inscripciones.length === 0) return null;
        const currentEvent = eventos.find(e => e.id === activeEventId);
        if (!currentEvent || !currentEvent.form_dinamico || currentEvent.form_dinamico.length === 0) return null;

        const attendees = inscripciones.filter(i => i.participa);
        const summary = {};

        currentEvent.form_dinamico.forEach(pregunta => {
            summary[pregunta.id] = {
                label: pregunta.label,
                counts: {}
            };
            attendees.forEach(insc => {
                const respuesta = insc.respuestas_dinamicas ? insc.respuestas_dinamicas[pregunta.id] : undefined;
                if (respuesta !== undefined && respuesta !== null && respuesta !== '') {
                    let answerKey = respuesta === true ? 'Sí' : (respuesta === false ? 'No' : respuesta);
                    summary[pregunta.id].counts[answerKey] = (summary[pregunta.id].counts[answerKey] || 0) + 1;
                }
            });
        });
        return summary;
    }, [activeEventId, inscripciones, eventos]);

    const canCreateAndManage = useMemo(() => 
        user?.role === 'SUPERUSER' || user?.role === 'EDITOR',
        [user]
    );

    if (isLoading) return <p>Cargando eventos...</p>;
    if (error) return <p className="error-message">{error}</p>;

    return (
        <div className="eventos-container">
            <div className="eventos-header">
                <h1>Próximos Eventos</h1>
                {canCreateAndManage && (
                    <Link to="/index/eventos/crear" className="btn-primary">
                        Crear Nuevo Evento
                    </Link>
                )}
            </div>

            <div className="eventos-list">
                {eventos.length > 0 ? (
                    eventos.map(evento => (
                        <div key={evento.id} className="evento-card">
                            {evento.banner_image && (
                                <img 
                                    src={`${process.env.REACT_APP_API_URL}/uploads/${evento.banner_image}`} 
                                    alt={evento.titulo} 
                                    className="evento-banner"
                                />
                            )}
                            <div className="evento-card-content">
                                <h2>{evento.titulo}</h2>
                                <p className="evento-date">
                                    {new Date(evento.fecha_hora).toLocaleDateString('es-ES', {
                                        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                    })} hs.
                                </p>
                                <p className="evento-sede"><strong>Sede:</strong> {evento.ubicacion_evento}</p>
                                <p className="evento-location">{evento.ubicacion_texto}</p>
                                <div className="evento-card-actions">
                                    <Link to={`/index/eventos/${evento.id}`} className="btn-primary">
                                        Inscribirse
                                    </Link>
                                    {canCreateAndManage && (
                                        <button onClick={() => toggleDetails(evento.id)} className="btn-secondary">
                                            {activeEventId === evento.id ? 'Ocultar Detalles' : 'Ver Detalles'}
                                        </button>
                                    )}
                                </div>
                            </div> {/* <-- ESTE ES EL </div> QUE FALTABA */}
                            
                            {activeEventId === evento.id && (
                                <div className="evento-details-dropdown">
                                    {isLoadingDetails ? (
                                        <p>Cargando detalles...</p>
                                    ) : (
                                        <>
                                            <div className="participantes-lista-resumen">
                                                <h4>Asisten ({inscripciones.filter(i => i.participa).length})</h4>
                                                {/* Usamos una tabla para alinear las columnas */}
                                                <table className="resumen-tabla">
                                                    <thead>
                                                        <tr>
                                                            <th>Nombre</th>
                                                            <th>Detalles</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {inscripciones.filter(i => i.participa).length > 0 ? (
                                                            inscripciones.filter(i => i.participa).map(insc => (
                                                                <tr key={insc.id}>
                                                                    <td>{insc.usuario.nombre} {insc.usuario.apellido}</td>
                                                                    <td className="detalle-celda">{insc.detalles_usuario || '-'}</td>
                                                                </tr>
                                                            ))
                                                        ) : (
                                                            <tr>
                                                                <td colSpan="2">Nadie ha confirmado asistencia todavía.</td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                            <div className="no-participan-lista-resumen">
                                                <h4>No Asisten ({inscripciones.filter(i => !i.participa).length})</h4>
                                                <ul>
                                                    {inscripciones.filter(i => !i.participa).map(insc => (
                                                        <li key={insc.id}>{insc.usuario.nombre} {insc.usuario.apellido}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                            <div className="resumen-respuestas">
                                                <h4>Resumen de Respuestas</h4>
                                                {summaryData && Object.keys(summaryData).length > 0 ? (
                                                    Object.values(summaryData).map(pregunta => (
                                                        <div key={pregunta.label} className="pregunta-resumen">
                                                            <strong>{pregunta.label}</strong>
                                                            <ul>
                                                                {Object.entries(pregunta.counts).map(([respuesta, count]) => (
                                                                    <li key={respuesta}>
                                                                        {respuesta}: <span>{count}</span>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p>No hay respuestas para resumir.</p>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    ))
                ) : (
                    <p>No hay eventos programados por el momento.</p>
                )}
            </div>
        </div>
    );
};

export default Eventos;