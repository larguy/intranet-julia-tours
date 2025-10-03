import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import es from 'date-fns/locale/es';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import Modal from 'react-modal';
import './CalendarioReuniones.css';

const locales = { 'es': es };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

const INITIAL_FORM_DATA = {
    tema: '', fecha_inicio: '', hora_inicio: '09:00',
    fecha_fin: '', hora_fin: '10:00', ubicacion: '',
    cantidad_personas: '', zoom_link: '', convoca: '',
    proveedor: '', necesita_bebida: false, necesita_comida: ''
};

const ubicaciones = ["1A", "1B", "7A", "8A", "BOX1", "BOX2"];

const formatDateForInput = (date) => {
    if (!date) return '';
    try {
        const d = new Date(date);
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        return d.toISOString().slice(0, 10);
    } catch (e) { return ''; }
};

const formatTimeForInput = (date) => {
    if (!date) return '';
    try {
        const d = new Date(date);
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        return d.toISOString().slice(11, 16);
    } catch (e) { return ''; }
};

const formatUrl = (url) => {
    if (!url) return '#';
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return `http://${url}`;
    }
    return url;
};

const TimePicker = ({ name, value, onChange }) => {
    const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
    const minutes = ['00', '15', '30', '45'];
    const [hour = '09', minute = '00'] = value.split(':');
    const handleHourChange = (e) => onChange({ target: { name, value: `${e.target.value}:${minute}` } });
    const handleMinuteChange = (e) => onChange({ target: { name, value: `${hour}:${e.target.value}` } });
    return (
        <div className="time-picker">
            <select value={hour} onChange={handleHourChange}>{hours.map(h => <option key={h} value={h}>{h}</option>)}</select>
            <span>:</span>
            <select value={minute} onChange={handleMinuteChange}>{minutes.map(m => <option key={m} value={m}>{m}</option>)}</select>
        </div>
    );
};


const CalendarioReuniones = () => {
    const { user, token } = useAuth();
    
    const [allEvents, setAllEvents] = useState([]);
    const [filteredEvents, setFilteredEvents] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [modalIsOpen, setModalIsOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [formData, setFormData] = useState(INITIAL_FORM_DATA);
    const [error, setError] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const canManage = user?.role === 'SUPERUSER' || user?.role === 'EDITOR';

    const eventStyleGetter = (event, start, end, isSelected) => {
        // mapea el número de grupo a su color
        const colors = {
            1: '#ff7b00ff',
            2: '#8A2BE2', 
            3: '#28a745', 
            4: '#808080', 
        };

        let style = {
            borderRadius: '5px',
            opacity: 0.8,
            color: 'white',
            border: '0px',
            display: 'block',
            textAlign: 'center'
        };

        if (event.type === 'guardia') {
            style.backgroundColor = colors[event.guardia_nro] || '#777'; 
        } else {
            style.backgroundColor = '#3174ad'; 
        }

        if (event.type === 'feriado') {
            style.backgroundColor = '#dc3545'; 
        } else if (event.type === 'guardia') {
            style.backgroundColor = colors[event.guardia_nro] || '#777';
        } else {
            style.backgroundColor = '#3174ad'; 
        }

        return {
            style: style
        };
    };

    const fetchEvents = useCallback(async () => {
        if (!token) return;
        try {
            const response = await apiClient.get(`${process.env.REACT_APP_API_URL}/reuniones/all`, {
                headers: { 'x-access-token': token }
            });
            const formattedEvents = response.data.map(event => ({
                ...event,
                start: new Date(event.start),
                end: new Date(event.end)
            }));
            setAllEvents(formattedEvents);
        } catch (error) {
            console.error("Error al cargar las reuniones:", error);
            setError('No se pudieron cargar las reuniones.');
        }
    }, [token]);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    useEffect(() => {
        const term = searchTerm.toLowerCase();
        const filtered = allEvents.filter(event => 
            (event.title?.toLowerCase().includes(term)) ||
            (event.ubicacion?.toLowerCase().includes(term)) ||
            (event.convoca?.toLowerCase().includes(term))
        );
        setFilteredEvents(filtered);
    }, [searchTerm, allEvents]);

    const openCreateModal = (slotInfo) => {
        if (!canManage) return;
    setSelectedEvent(null);
    setIsEditing(true);
    const baseDate = slotInfo?.start || new Date();
        
    const startDate = new Date(baseDate);
    const endDate = new Date(baseDate);

    startDate.setHours(13, 0, 0, 0); 
    endDate.setHours(14, 0, 0, 0);   

    setFormData({
        ...INITIAL_FORM_DATA,
        fecha_inicio: formatDateForInput(startDate),
        hora_inicio: formatTimeForInput(startDate),
        fecha_fin: formatDateForInput(endDate),
        hora_fin: formatTimeForInput(endDate),
    });
    
    setModalIsOpen(true);
};
       
    const openViewModal = (event) => {
        setSelectedEvent(event);
        setIsEditing(false);
        setFormData({
            ...event,
            tema: event.title,
            fecha_inicio: formatDateForInput(event.start),
            hora_inicio: formatTimeForInput(event.start),
            fecha_fin: formatDateForInput(event.end),
            hora_fin: formatTimeForInput(event.end),
        });
        setModalIsOpen(true);
    };

    const closeModal = () => {
        setModalIsOpen(false);
        setIsEditing(false);
        setSelectedEvent(null);
        setFormData(INITIAL_FORM_DATA);
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

     const handleDelete = async () => {
        if (selectedEvent && window.confirm('¿Estás seguro?')) {
            try {
                await apiClient.delete(`${process.env.REACT_APP_API_URL}/reuniones/${selectedEvent.id}`, { headers: { 'x-access-token': token } });
                fetchEvents();
                closeModal();
            } catch (error) {
                console.error("Error al eliminar la reunión:", error);
                setError('Error al eliminar la reunión.');
            }
        }
    };


    const handleSave = async (e) => {
        e.preventDefault();
        const submissionData = {
            ...formData,
            start: `${formData.fecha_inicio}T${formData.hora_inicio}`,
            end: `${formData.fecha_fin}T${formData.hora_fin}`,
        };
        const method = selectedEvent ? 'put' : 'post';
        const url = selectedEvent
            ? `${process.env.REACT_APP_API_URL}/reuniones/${selectedEvent.id}`
            : `${process.env.REACT_APP_API_URL}/reuniones`;
        try {
            await apiClient[method](url, submissionData, { headers: { 'x-access-token': token } });
            fetchEvents();
            closeModal();
        } catch (error) {
            setError('Error al guardar la reunión.');
        }
    };
       

    return (
        <div>
            <h1>Calendario de Reuniones</h1>
            <div className="agenda-controls">
                <input type="text" placeholder="Buscar reunión..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="search-bar" />
                {/* {canManage && <button onClick={() => openCreateModal()} className="btn-primary">Crear Reunión</button>}  */}
            </div>
            {error && <p className="error-message">{error}</p>}
            <div className="calendar-wrapper">
                <Calendar
                    localizer={localizer}
                    events={filteredEvents}
                    startAccessor="start"
                    endAccessor="end"
                    style={{ height: '75vh' }}
                    culture='es'
                    eventPropGetter={eventStyleGetter}
                    onSelectEvent={openViewModal}  
                    onSelectSlot={openCreateModal} 
                    selectable={canManage} 
                    formats={{
                        timeGutterFormat: 'HH:mm', 
                        eventTimeRangeFormat: ({ start, end }, culture, local) =>
                            `${local.format(start, 'HH:mm', culture)} - ${local.format(end, 'HH:mm', culture)}`,
                        agendaTimeRangeFormat: ({ start, end }, culture, local) =>
                            `${local.format(start, 'HH:mm', culture)} - ${local.format(end, 'HH:mm', culture)}`
                    }}
                    messages={{
                        date: 'Fecha',      
                        time: 'Hora',       
                        event: 'Evento',    
                        
                        next: "Siguiente",
                        previous: "Anterior",
                        today: "Hoy",
                        month: "Mes",
                        week: "Semana",
                        day: "Día",
                        agenda: "Agenda" 
                    }}
                />
            </div>

             <Modal isOpen={modalIsOpen} onRequestClose={closeModal} className="modal" overlayClassName="overlay">
              
                {isEditing || !selectedEvent ? (
                    <form onSubmit={handleSave}>
                        <div className="form-group"><label>Tema</label><input type="text" name="tema" value={formData.tema || ''} onChange={handleChange} required /></div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Cuando:</label>
                                <input type="date" name="fecha_inicio" value={formData.fecha_inicio || ''} onChange={handleChange} required />
                            </div>
                            <div className="form-group">
                                <label>Hasta:</label>
                                <input type="date" name="fecha_fin" value={formData.fecha_fin || ''} onChange={handleChange} required />
                            </div>
                        </div>
                        <div className="form-row">                            
                            <div className="form-group">
                                <label>Inicia a las:</label>
                                <TimePicker name="hora_inicio" value={formData.hora_inicio || '09:00'} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label>Finaliza a las:</label>
                                <TimePicker name="hora_fin" value={formData.hora_fin || '10:00'} onChange={handleChange} />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Ubicación</label>
                            <select name="ubicacion" value={formData.ubicacion || ''} onChange={handleChange}>
                                <option value="">Selecciona una ubicación...</option>
                                {ubicaciones.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                            </select>
                        </div>
                        <div className="form-group"><label>Nº Personas</label><input type="number" name="cantidad_personas" value={formData.cantidad_personas || ''} onChange={handleChange} /></div>
                        <div className="form-group"><label>Enlace de Zoom</label><input type="text" name="zoom_link" value={formData.zoom_link || ''} onChange={handleChange} placeholder="https://zoom.us/j/..." /></div>
                        <div className="form-group"><label>Convoca</label><input type="text" name="convoca" value={formData.convoca || ''} onChange={handleChange} /></div>
                        <div className="form-group"><label>Proveedor</label><input type="text" name="proveedor" value={formData.proveedor || ''} onChange={handleChange} /></div>
                        <div className="form-group checkbox-group">
                            <input type="checkbox" name="necesita_bebida" checked={!!formData.necesita_bebida} onChange={handleChange} id="bebida-check" />
                            <label htmlFor="bebida-check">Necesita Bebida</label>
                        </div>
                        <div className="form-group">
                            <label>Necesita Comida (Detallar)</label>
                            <input type="text" name="necesita_comida" value={formData.necesita_comida || ''} onChange={handleChange} placeholder="Ej: Medialunas..." />
                        </div>
                        <div className="modal-actions">
                            <button type="submit" className="btn-primary">Guardar</button>
                            {selectedEvent && <button type="button" onClick={() => setIsEditing(false)} className="btn-secondary">Cancelar</button>}
                            {!selectedEvent && <button type="button" onClick={closeModal} className="btn-secondary">Cancelar</button>}
                        </div>
                    </form>
                ) : (
                    <div className="readonly-details">
                        <h2>Detalles de la Reunión</h2>
                        <p><strong>Tema:</strong> {formData.tema}</p>
                        <p><strong>Horario:</strong> {formData.start && formData.end ? `${format(new Date(formData.start), 'HH:mm')} - ${format(new Date(formData.end), 'HH:mm')}` : 'N/A'}</p>
                        <p><strong>Ubicación:</strong> {formData.ubicacion}</p>
                        <p><strong>Enlace de Zoom:</strong> {formData.zoom_link ? <a href={formatUrl(formData.zoom_link)} target="_blank" rel="noopener noreferrer">Unirse a la reunión</a> : 'N/A'}</p>
                        <p><strong>Convoca:</strong> {formData.convoca}</p>
                        <p><strong>Nº Personas:</strong> {formData.cantidad_personas}</p>
                        <p><strong>Bebida:</strong> {formData.necesita_bebida ? 'Sí' : 'No'}</p>
                        <p><strong>Comida:</strong> {formData.necesita_comida || 'N/A'}</p>
                        <div className="modal-actions">
                            {canManage && (
                                <>
                                    <button type="button" onClick={() => setIsEditing(true)} className="btn-primary">Editar</button>
                                    <button type="button" onClick={handleDelete} className="btn-danger">Eliminar</button>
                                </>
                            )}
                            <button type="button" onClick={closeModal} className="btn-secondary">Cerrar</button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default CalendarioReuniones;