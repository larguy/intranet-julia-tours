import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../../api'; 
import { useAuth } from '../../context/AuthContext';
import './CrearEvento.css';

const CrearEvento = ({ modoEdicion = false }) => {
    const { eventoId } = useParams();
    const navigate = useNavigate();
    const { token } = useAuth();
    const sucursales = ["Julia Tours", "Buenos Aires", "Cordoba", "Rosario"];

    // Estados
    const [titulo, setTitulo] = useState('');
    const [bannerFile, setBannerFile] = useState(null);
    const [bannerPreview, setBannerPreview] = useState('');
    const [existingBanner, setExistingBanner] = useState(null);
    const [ubicacionTexto, setUbicacionTexto] = useState('');
    const [ubicacionMapa, setUbicacionMapa] = useState('');
    const [fechaHora, setFechaHora] = useState('');
    const [detalle, setDetalle] = useState('');
    const [ubicacionEvento, setUbicacionEvento] = useState('Buenos Aires');
    const [formDinamico, setFormDinamico] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [hiddenUsers, setHiddenUsers] = useState([]); 

    const [isLoading, setIsLoading] = useState(modoEdicion);
    const [error, setError] = useState('');

    useEffect(() => {
        const loadData = async () => {
            if (token) {
                setIsLoading(true);
                try {
                    const usersRes = await apiClient.get('/internos', { headers: { 'x-access-token': token } });
                    setAllUsers(usersRes.data);

                    if (modoEdicion && eventoId) {
                        const eventoRes = await apiClient.get(`/eventos/${eventoId}`, { headers: { 'x-access-token': token } });
                        const evento = eventoRes.data;
                        setTitulo(evento.titulo);
                        if(evento.banner_image) {
                            setBannerPreview(`${process.env.REACT_APP_API_URL}/uploads/${evento.banner_image}`);
                            setExistingBanner(evento.banner_image);
                        }
                        setUbicacionTexto(evento.ubicacion_texto || '');
                        setUbicacionMapa(evento.ubicacion_mapa || '');
                        setFechaHora(new Date(evento.fecha_hora).toISOString().slice(0, 16));
                        setDetalle(evento.detalle || '');
                        setUbicacionEvento(evento.ubicacion_evento);
                        setFormDinamico(evento.form_dinamico || []);
                        setHiddenUsers(evento.hidden_from_users || []);
                    }
                } catch (err) {
                    setError('No se pudieron cargar los datos necesarios para el formulario.');
                } finally {
                    setIsLoading(false);
                }
            }
        };
        loadData();
    }, [modoEdicion, eventoId, token]);

    const handleHiddenUsersChange = (e) => {
        const selectedIds = Array.from(e.target.selectedOptions, option => parseInt(option.value, 10));
        setHiddenUsers(selectedIds);
    };

    const handleBannerChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setBannerFile(file);
            setBannerPreview(URL.createObjectURL(file));
        }
    };
    
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

        if (bannerFile) {
            const formData = new FormData();
            formData.append('upload', bannerFile);
            try {
                const response = await apiClient.post('/upload-file', formData, { headers: { 'x-access-token': token } });
                bannerImageName = response.data.url.split('/').pop();
            } catch (err) { 
                setError('Error al subir la imagen del banner.'); 
                setIsLoading(false); 
                return; 
            }
        }
        
        const eventoData = { titulo, banner_image: bannerImageName, ubicacion_texto: ubicacionTexto, ubicacion_mapa: ubicacionMapa, fecha_hora: fechaHora, detalle, ubicacion_evento: ubicacionEvento, form_dinamico: formDinamico,  hidden_from_users: hiddenUsers };

        try {
            if (modoEdicion) {
                await apiClient.put(`/eventos/${eventoId}`, eventoData, { headers: { 'x-access-token': token } });
            } else {
                await apiClient.post('/eventos', eventoData, { headers: { 'x-access-token': token } });
            }
            navigate('/index/eventos');
        } catch (err) { 
            setError('Error al guardar el evento.'); 
            setIsLoading(false); 
        }
    };
    
    if (isLoading) return <p>Cargando...</p>;

    return (
        <div className="crear-evento-container">
            <h1>{modoEdicion ? 'Editar Evento' : 'Crear Nuevo Evento'}</h1>
            {error && <p className="error-message">{error}</p>}
            
            <form onSubmit={handleSubmit} className="evento-form">
                <div className="form-group">
                    <label>Título del Evento</label>
                    <input type="text" value={titulo} onChange={e => setTitulo(e.target.value)} required />
                </div>
                <div className="form-group">
                    <label>Imagen del Banner</label>
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
                    <label>Dirección (Texto)</label>
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
                <div className="form-group">
                    <label>Ocultar Evento a Usuarios (mantén Ctrl para seleccionar varios)</label>
                    <select
                        multiple={true}
                        value={hiddenUsers}
                        onChange={handleHiddenUsersChange}
                        className="multi-select"
                    >
                        {allUsers.map(user => (
                            <option key={user.id} value={user.id}>
                                {user.nombre} {user.apellido}
                            </option>
                        ))}
                    </select>
                </div>
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
                
                <div className="form-actions">
                    <button 
                        type="button" 
                        className="btn-secondary" 
                        onClick={() => navigate('/index/eventos')}
                        disabled={isLoading}
                    >
                        Cancelar
                    </button>
                    <button 
                        type="submit" 
                        className="btn-primary" 
                        disabled={isLoading}
                    >
                        {isLoading ? 'Guardando...' : (modoEdicion ? 'Actualizar Evento' : 'Crear Evento')}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CrearEvento;