import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import './Agenda.css';

const ContactForm = ({ contact, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        nombre: '', domicilio: '', telefono: '', email: '', pagina_web: '',
        pais: '', provincia: '', localidad: '', detalle: ''
    });

    useEffect(() => {
        if (contact) {
            setFormData({
                nombre: contact.nombre || '',
                domicilio: contact.domicilio || '',
                telefono: contact.telefono || '',
                email: contact.email || '',
                pagina_web: contact.pagina_web || '',
                pais: contact.pais || '',
                provincia: contact.provincia || '',
                localidad: contact.localidad || '',
                detalle: contact.detalle || ''
            });
        }
    }, [contact]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="contact-form">
            <h2>{contact ? 'Editar Contacto' : 'Crear Nuevo Contacto'}</h2>
            <div className="form-group">
                <label>*Nombre</label>
                <input type="text" name="nombre" value={formData.nombre} onChange={handleChange} required />
            </div>
            <div className="form-group">
                <label>*Teléfono</label>
                <input type="text" name="telefono" value={formData.telefono} onChange={handleChange} required />
            </div>            
            <div className="form-group">
                <label>Email</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} />
            </div>
             <div className="form-group">
                <label>Página Web</label>
                <input 
                    type="text"  
                    name="pagina_web" 
                    value={formData.pagina_web} 
                    onChange={handleChange} 
                    placeholder="www.ejemplo.com" 
                />
            </div>
            <div className="form-group">
                <label>Domicilio</label>
                <input type="text" name="domicilio" value={formData.domicilio} onChange={handleChange} />
            </div>            
            <div className="form-group">
                <label>País</label>
                <input type="text" name="pais" value={formData.pais} onChange={handleChange} />
            </div>
            <div className="form-group">
                <label>Provincia</label>
                <input type="text" name="provincia" value={formData.provincia} onChange={handleChange} />
            </div>
            <div className="form-group">
                <label>Localidad</label>
                <input type="text" name="localidad" value={formData.localidad} onChange={handleChange} />
            </div>            
            <div className="form-group">
                <label>Detalle</label>
                <textarea name="detalle" value={formData.detalle} onChange={handleChange} rows="4"></textarea>
            </div>
            <div className="form-actions">
                <button type="submit" className="btn-primary">Guardar</button>
                <button type="button" onClick={onCancel} className="btn-secondary">Cancelar</button>
            </div>
        </form>
    );
};

const formatUrl = (url) => {
    if (!url) return '#';
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return `http://${url}`;
    }
    return url;
};

const formatPhoneNumber = (phone) => {
    if (!phone) return '';
    return phone.replace(/[\s-()]/g, ''); 
};


const ContactDetail = ({ contact, onBack, onEdit, onDelete, canManage }) => (
    <div className="contact-detail">
        <button onClick={onBack} className="back-button">← Volver a la lista</button>
        <h1>{contact.nombre}</h1>
        <div className="profile-details">
             <p><strong>Teléfono:</strong> 
                {contact.telefono ? <a href={`tel:${contact.telefono}`}>{contact.telefono}</a> : 'N/A'}
            </p>
            <p><strong>Email:</strong> {contact.email || 'N/A'}</p>
            <p><strong>Página Web:</strong> {contact.pagina_web ? <a href={formatUrl(contact.pagina_web)} target="_blank" rel="noopener noreferrer">{contact.pagina_web}</a> : 'N/A'}</p>
            <p><strong>Domicilio:</strong> {contact.domicilio || 'N/A'}</p>
            <p><strong>País:</strong> {contact.pais || 'N/A'}</p>
            <p><strong>Provincia:</strong> {contact.provincia || 'N/A'}</p>
            <p><strong>Localidad:</strong> {contact.localidad || 'N/A'}</p>
            <p><strong>Detalle:</strong> {contact.detalle || 'N/A'}</p>
        </div>
        {canManage && (
            <div className="detail-actions">
                <button onClick={() => onEdit(contact)} className="btn-primary">Editar</button>
                <button onClick={() => onDelete(contact.id)} className="btn-danger">Eliminar</button>
            </div>
        )}
    </div>
);

const Agenda = () => {
    const { user, token } = useAuth();
    const [view, setView] = useState('list'); 
    const [contacts, setContacts] = useState([]);
    const [filteredContacts, setFilteredContacts] = useState([]);
    const [selectedContact, setSelectedContact] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const canManage = user?.role === 'SUPERUSER' || user?.role === 'EDITOR';

    const fetchContacts = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await axios.get(`${process.env.REACT_APP_API_URL}/agenda`, {
                headers: { 'x-access-token': token }
            });
            setContacts(response.data);
            setFilteredContacts(response.data);
        } catch (err) {
            setError('No se pudo cargar la agenda.');
        } finally {
            setIsLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchContacts();
    }, [fetchContacts]);
    
    useEffect(() => {
        const term = searchTerm.toLowerCase();
        const filtered = contacts.filter(contact => 
            (contact.nombre.toLowerCase().includes(term)) ||
            (contact.telefono.toLowerCase().includes(term)) ||
            (contact.detalle?.toLowerCase().includes(term)) ||
            (contact.pagina_web?.toLowerCase().includes(term))
        );
        setFilteredContacts(filtered);
    }, [searchTerm, contacts]);

    const handleSaveContact = async (contactData) => {
        const url = selectedContact 
            ? `${process.env.REACT_APP_API_URL}/agenda/${selectedContact.id}` 
            : `${process.env.REACT_APP_API_URL}/agenda`;
        const method = selectedContact ? 'put' : 'post';

        try {
            await axios[method](url, contactData, { headers: { 'x-access-token': token } });
            fetchContacts(); // Recarga la lista de contactos
            setView('list'); // Vuelve a la vista de lista
            setSelectedContact(null); // Limpia la selección
        } catch (err) {
            setError(err.response?.data?.message || 'Error al guardar el contacto.');
        }
    };
    
    const handleDeleteContact = async (contactId) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar este contacto?')) {
            try {
                await axios.delete(`${process.env.REACT_APP_API_URL}/agenda/${contactId}`, { headers: { 'x-access-token': token } });
                fetchContacts();
                setView('list'); // Asegúrate de volver a la lista si estabas en detalle
            } catch (err) {
                setError(err.response?.data?.message || 'Error al eliminar el contacto.');
            }
        }
    };

    if (isLoading) return <p>Cargando agenda...</p>;
    
    if (view === 'detail') {
        return <ContactDetail 
            contact={selectedContact} 
            onBack={() => setView('list')} 
            onEdit={(contact) => { setSelectedContact(contact); setView('form'); }} 
            onDelete={handleDeleteContact} 
            canManage={canManage} 
        />;
    }

    if (view === 'form') {
        return <ContactForm 
            contact={selectedContact} 
            onSave={handleSaveContact} 
            onCancel={() => { setView('list'); setSelectedContact(null); }} 
        />;
    }

    return (
        <div>
            <h1>Agenda de Contactos</h1>
            {error && <p className="error-message">{error}</p>}
            <div className="agenda-controls">
                <input 
                    type="text" 
                    placeholder="Buscar por nombre, teléfono o detalle..." 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                    className="search-bar" 
                />
                {canManage && <button onClick={() => { setSelectedContact(null); setView('form'); }} className="btn-primary">Crear Contacto</button>}
            </div>
            <table className="agenda-table">
                <thead>
                    <tr>
                        <th>Nombre</th>
                        <th>Teléfono</th>
                        <th>Url</th>
                        <th>Detalle</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredContacts.map(contact => (
                        <tr key={contact.id}>
                            <td className="contact-name-link" onClick={() => { setSelectedContact(contact); setView('detail'); }}>
                                {contact.nombre}
                            </td>
                            <td>
                                {contact.telefono ? <a href={`tel:${formatPhoneNumber(contact.telefono)}`}>{contact.telefono}</a> : ''}
                            </td>
                            <td>
                            {contact.pagina_web ? (
                                    <a href={formatUrl(contact.pagina_web)} target="_blank" rel="noopener noreferrer">
                                        {contact.pagina_web}
                                    </a>
                                ) : (
                                    'N/A' // Muestra N/A si no hay página web
                                )}
                            </td>
                            <td>{contact.detalle}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default Agenda;