// src/components/intranet/CrearEvento.js

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import './CrearEvento.css';

const CrearEvento = ({ modoEdicion = false }) => {
    const { eventoId } = useParams();
    const navigate = useNavigate();
    const { token } = useAuth();
    const [ubicacionEvento, setUbicacionEvento] = useState('Buenos Aires'); // <-- AÑADE ESTA LÍNEA
    const sucursales = ["Julia Tours", "Buenos Aires", "Cordoba", "Rosario"];

    // Estados para los campos del formulario
    const [titulo, setTitulo] = useState('');
    const [bannerFile, setBannerFile] = useState(null);
    const [bannerPreview, setBannerPreview] = useState('');
    const [existingBanner, setExistingBanner] = useState(null); 
    const [ubicacionTexto, setUbicacionTexto] = useState('');
    const [ubicacionMapa, setUbicacionMapa] = useState('');
    const [fechaHora, setFechaHora] = useState('');
    const [detalle, setDetalle] = useState('');
    const [formDinamico, setFormDinamico] = useState([]);

    const [isLoading, setIsLoading] = useState(modoEdicion);
    const [error, setError] = useState('');

    // Cargar datos del evento si estamos en modo edición
    useEffect(() => {
        if (modoEdicion && eventoId && token) {
            const fetchEvento = async () => {
                try {
                    const response = await axios.get(`${process.env.REACT_APP_API_URL}/eventos/${eventoId}`, { headers: { 'x-access-token': token } });
                    const evento = response.data;
                    setTitulo(evento.titulo);
                    if(evento.banner_image) {
                        setBannerPreview(`${process.env.REACT_APP_API_URL}/uploads/${evento.banner_image}`);
                        setExistingBanner(evento.banner_image);
                    }
                    setUbicacionTexto(evento.ubicacion_texto || '');
                    setUbicacionEvento(evento.ubicacion_evento); 
                    setUbicacionMapa(evento.ubicacion_mapa || '');
                    setFechaHora(new Date(evento.fecha_hora).toISOString().slice(0, 16));
                    setDetalle(evento.detalle || '');
                    setFormDinamico(evento.form_dinamico || []);
                } catch (err) { 
                    setError('No se pudo cargar el evento para editar.'); 
                } finally { 
                    setIsLoading(false); 
                }
            };
            fetchEvento();
        }
    }, [modoEdicion, eventoId, token]);

    const handleBannerChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setBannerFile(file);
            setBannerPreview(URL.createObjectURL(file));
        }
    };
    
    // --- Lógica para el Formulario Dinámico ---
    const addCampo = (type) => setFormDinamico([...formDinamico, { id: `q${Date.now()}`, type, label: '', options: type === 'select' ? [''] : undefined }]);
    const handleCampoChange = (index, field, value) => { const n = [...formDinamico]; n[index][field] = value; setFormDinamico(n); };
    const handleOptionChange = (cIndex, oIndex, value) => { const n = [...formDinamico]; n[cIndex].options[oIndex] = value; setFormDinamico(n); };
    const addOption = (cIndex) => { const n = [...formDinamico]; n[cIndex].options.push(''); setFormDinamico(n); };
    const removeCampo = (index) => setFormDinamico(formDinamico.filter((_, i) => i !== index));
    const removeOption = (cIndex, oIndex) => { const n = [...formDinamico]; n[cIndex].options = n[cIndex].options.filter((_, i) => i !== oIndex); setFormDinamico(n); };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        let bannerImageName = existingBanner;

        // 1. Subir la imagen del banner solo si se seleccionó un archivo nuevo
        if (bannerFile) {
            const formData = new FormData();
            formData.append('upload', bannerFile);
            try {
                const response = await axios.post(`${process.env.REACT_APP_API_URL}/upload-file`, formData, { headers: { 'x-access-token': token } });
                bannerImageName = response.data.url.split('/').pop();
            } catch (err) { 
                setError('Error al subir la imagen del banner.'); 
                setIsLoading(false); 
                return; 
            }
        }
        
        // 2. Preparar los datos del evento
        const eventoData = { titulo, banner_image: bannerImageName, ubicacion_texto: ubicacionTexto, ubicacion_mapa: ubicacionMapa, fecha_hora: fechaHora, detalle, ubicacion_evento: ubicacionEvento, form_dinamico: formDinamico };

        // 3. Enviar los datos al backend (crear o actualizar)
        try {
            if (modoEdicion) {
                await axios.put(`${process.env.REACT_APP_API_URL}/eventos/${eventoId}`, eventoData, { headers: { 'x-access-token': token } });
            } else {
                await axios.post(`${process.env.REACT_APP_API_URL}/eventos`, eventoData, { headers: { 'x-access-token': token } });
            }
            navigate('/index/eventos');
        } catch (err) { 
            setError('Error al guardar el evento.'); 
            setIsLoading(false); 
        }
    };
    
    if (isLoading && modoEdicion) return <p>Cargando evento para editar...</p>;

    return (
        <div className="crear-evento-container">
            <h1>{modoEdicion ? 'Editar Evento' : 'Crear Nuevo Evento'}</h1>
            {error && <p className="error-message">{error}</p>}
            
            <form onSubmit={handleSubmit} className="evento-form">
                {/* --- Campos Principales --- */}
                <div className="form-group">
                    <label>Título del Evento</label>
                    <input type="text" value={titulo} onChange={e => setTitulo(e.target.value)} required />
                </div>
                <div className="form-group">
                    <label>Imagen del Banner</label>
                    {/* --- CÓDIGO CORREGIDO PARA USAR LAS VARIABLES --- */}
                    <input type="file" accept="image/*" onChange={handleBannerChange} />
                    {bannerPreview && <img src={bannerPreview} alt="Vista previa del banner" className="banner-preview" />}
                </div>
                <div className="form-group">
                    <label>Fecha y Hora</label>
                    <input type="datetime-local" value={fechaHora} onChange={e => setFechaHora(e.target.value)} required />
                </div>
                <div className="form-group">
                    <label>Ubicación (Sede del Evento)</label>
                    <select value={ubicacionEvento} onChange={e => setUbicacionEvento(e.target.value)} required>
                        {sucursales.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div className="form-group">
                    <label>Ubicación (Texto)</label>
                    <input type="text" value={ubicacionTexto} onChange={e => setUbicacionTexto(e.target.value)} placeholder="Ej: Salon, Quinta.." />
                </div>
                <div className="form-group">
                    <label>Enlace de Google Maps (Opcional)</label>
                    <input type="url" value={ubicacionMapa} onChange={e => setUbicacionMapa(e.target.value)} placeholder="https://maps.google.com/..." />
                </div>
                <div className="form-group">
                    <label>Detalle / Reseña (Opcional)</label>
                    <textarea value={detalle} onChange={e => setDetalle(e.target.value)} rows="4"></textarea>
                </div>

                {/* --- Formulario Dinámico --- */}
                <div className="form-dinamico-section">
                    <h3>Preguntas Adicionales para Inscripción</h3>
                    {formDinamico.map((campo, index) => (
                        <div key={campo.id} className="campo-dinamico">
                            <div className="campo-header">
                                <input type="text" placeholder={`Pregunta ${index + 1}`} value={campo.label} onChange={e => handleCampoChange(index, 'label', e.target.value)} className="campo-label-input"/>
                                <button type="button" onClick={() => removeCampo(index)} className="remove-btn">&times;</button>
                            </div>
                            {campo.type === 'select' && (
                                <div className="campo-options">
                                    {campo.options.map((opt, optIndex) => (
                                        <div key={optIndex} className="option-input">
                                            <input type="text" placeholder={`Opción ${optIndex + 1}`} value={opt} onChange={e => handleOptionChange(index, optIndex, e.target.value)} />
                                            <button type="button" onClick={() => removeOption(index, optIndex)} className="remove-btn mini">&times;</button>
                                        </div>
                                    ))}
                                    <button type="button" onClick={() => addOption(index)} className="add-option-btn">+ Añadir Opción</button>
                                </div>
                            )}
                        </div>
                    ))}
                    <div className="add-campo-buttons">
                        <button type="button" onClick={() => addCampo('checkbox')}>+ Opción Sí/No</button>
                        <button type="button" onClick={() => addCampo('select')}>+ Menú Desplegable</button>
                    </div>
                </div>
                
                <button type="submit" className="btn-primary" disabled={isLoading}>
                    {isLoading ? 'Guardando...' : (modoEdicion ? 'Actualizar Evento' : 'Crear Evento')}
                </button>
            </form>
        </div>
    );
};

export default CrearEvento;