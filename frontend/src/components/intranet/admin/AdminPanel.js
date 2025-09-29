// src/components/intranet/admin/AdminPanel.js

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import './AdminPanel.css'; // Asegúrate de que los estilos de guardias se copien aquí

// --- Componente para la Administración de Fechas de Guardia (antes en Guardias.js) ---
const GuardiasManager = ({ token }) => {
    const [fechas, setFechas] = useState([]);
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedGuardia, setSelectedGuardia] = useState('1');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const fetchFechas = useCallback(async () => {
        try {
            const config = { headers: { 'x-access-token': token } };
            const response = await axios.get(`${process.env.REACT_APP_API_URL}/guardias/fechas`, config);
            setFechas(response.data);
        } catch (err) {
            setError('No se pudieron cargar las fechas de guardia.');
        } finally {
            setIsLoading(false);
        }
    }, [token]);

    useEffect(() => {
        if (token) {
            fetchFechas();
        }
    }, [token, fetchFechas]);

    const handleAddDate = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        if (!selectedDate) {
            setError('Por favor, selecciona una fecha.');
            return;
        }
        try {
            const config = { headers: { 'x-access-token': token } };
            await axios.post(`${process.env.REACT_APP_API_URL}/guardias/fechas`, {
                fecha: selectedDate,
                guardia_nro: selectedGuardia
            }, config);
            const successMessage = selectedGuardia === '5' ? 'Feriado añadido.' : `Fecha añadida al Grupo ${selectedGuardia}.`;
            setSuccess(successMessage);
            fetchFechas();
            setSelectedDate('');
        } catch (err) {
            setError(err.response?.data?.message || 'Error al añadir la fecha.');
        }
    };

    const handleDeleteDate = async (id) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar esta fecha?')) {
            setError('');
            setSuccess('');
            try {
                const config = { headers: { 'x-access-token': token } };
                await axios.delete(`${process.env.REACT_APP_API_URL}/guardias/fechas/${id}`, config);
                setSuccess('Fecha eliminada correctamente.');
                fetchFechas();
            } catch (err) {
                setError(err.response?.data?.message || 'Error al eliminar la fecha.');
            }
        }
    };

    const guardiasAgrupadas = useMemo(() => {
        const grupos = { 1: [], 2: [], 3: [], 4: [], 5: [] }; 
        fechas.forEach(fecha => {
            if (grupos[fecha.guardia_nro]) {
                grupos[fecha.guardia_nro].push(fecha);
            }
        });
        for (const grupo in grupos) {
            grupos[grupo].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
        }
        return grupos;
    }, [fechas]);

    if (isLoading) return <p>Cargando gestión de guardias...</p>;

    return (
        <div className="guardias-admin-container">
            <h2>Administrar Fechas de Guardia</h2>
            <form onSubmit={handleAddDate} className="guardia-form">
                <label>Asignar fecha al:</label>
                <select value={selectedGuardia} onChange={e => setSelectedGuardia(e.target.value)}>
                    <option value="1">Grupo 1</option>
                    <option value="2">Grupo 2</option>
                    <option value="3">Grupo 3</option>
                    <option value="4">Grupo 4</option>
                    <option value="5">Feriado</option>
                </select>
                <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
                <button type="submit">Añadir Fecha</button>
            </form>
            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}
            <div className="guardias-columns-container">
                {[1, 2, 3, 4, 5].map(groupNumber => (
                    <div key={groupNumber} className="guardia-column">
                        <h3>{groupNumber === 5 ? 'Feriados' : `Grupo ${groupNumber}`}</h3>
                        <ul>
                            {guardiasAgrupadas[groupNumber].length > 0 ? (
                                guardiasAgrupadas[groupNumber].map(fecha => (
                                    <li key={fecha.id}>
                                        <span>
                                            {new Date(fecha.fecha + 'T00:00:00').toLocaleDateString('es-ES', {
                                                day: '2-digit', month: '2-digit', year: 'numeric'
                                            })}
                                        </span>
                                        <button onClick={() => handleDeleteDate(fecha.id)} className="delete-btn">&times;</button>
                                    </li>
                                ))
                            ) : (<li className="no-dates">No hay fechas asignadas.</li>)}
                        </ul>
                    </div>
                ))}
            </div>
        </div>
    );
};


// --- Componente Principal del Panel de Administración ---
const AdminPanel = () => {
    const { user, token } = useAuth();
    const [allUsers, setAllUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    

    const fetchUsers = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await axios.get(`${process.env.REACT_APP_API_URL}/admin/users`, {
                headers: { 'x-access-token': token }
            });
            setAllUsers(response.data);
            setFilteredUsers(response.data);
        } catch (err) {
            setError('No se pudo cargar la lista de usuarios. ¿Tienes permisos de Superusuario?');
        } finally {
            setIsLoading(false);
        }
    }, [token]);

    useEffect(() => {
        if (user?.role === 'SUPERUSER') {
            fetchUsers();
        } else if (user) {
            // Si no es SUPERUSER, no cargamos usuarios pero terminamos la carga
            setIsLoading(false);
        }
    }, [user, fetchUsers]);

    useEffect(() => {
        const term = searchTerm.toLowerCase();
        const filtered = allUsers.filter(u => u.username.toLowerCase().includes(term));
        setFilteredUsers(filtered);
    }, [searchTerm, allUsers]);

    const handleRoleChange = async (userId, newRole) => { /* ... (código sin cambios) ... */ };
    const handleGuardiaChange = async (userId, newGuardiaNro) => { /* ... (código sin cambios) ... */ };

    if (!user) return <div>Cargando...</div>;

    // Lógica de permisos unificada
    const isSuperUser = user.role === 'SUPERUSER';
    const isGuardiaAdmin = isSuperUser || (user.role === 'EDITOR' && user.sector === 'Administracion');

    if (!isSuperUser && !isGuardiaAdmin) {
        return <div>Acceso denegado.</div>;
    }

    if (isLoading) return <div>Cargando panel de administración...</div>;

    return (
        <div className="admin-panel-container">
            {error && <p className="error-message">{error}</p>}
            
            {/* Sección de Administración de Usuarios (solo para Superusuario) */}
            {isSuperUser && (
                <div className="admin-section">
                    <h1>Administración de Usuarios</h1>
                    <div className="search-bar">
                        <input type="text" placeholder="Buscar por correo..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Usuario (Email)</th>
                                <th>Rol</th>
                                <th>Guardia</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map(u => (
                                <tr key={u.id}>
                                    <td>{u.username}</td>
                                    <td>{u.id === user.id ? <strong>{u.role} (Actual)</strong> : <select value={u.role} onChange={(e) => handleRoleChange(u.id, e.target.value)} className="admin-select"><option value="VIEWER">Solo Lectura</option><option value="EDITOR">Editor</option><option value="SUPERUSER">Superusuario</option></select>}</td>
                                    <td><select value={u.guardia_nro || ''} onChange={(e) => handleGuardiaChange(u.id, e.target.value)} className="admin-select"><option value="">Sin Asignar</option><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option></select></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            
            {/* Separador visual */}
            {isSuperUser && isGuardiaAdmin && <hr className="admin-divider" />}

            {/* Sección de Administración de Guardias */}
            {isGuardiaAdmin && (
                <div className="admin-section">
                    <GuardiasManager token={token} />
                </div>
            )}
        </div>
    );
};

export default AdminPanel;