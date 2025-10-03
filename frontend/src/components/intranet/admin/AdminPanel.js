// src/components/intranet/admin/AdminPanel.js

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import './AdminPanel.css';

// --- Componente para la Administración de Fechas de Guardia ---
const GuardiasManager = ({ token }) => {
    // ... (El código de GuardiasManager se mantiene exactamente igual, no necesita cambios)
    const [fechas, setFechas] = useState([]);
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedGuardia, setSelectedGuardia] = useState('1');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const fetchFechas = useCallback(async () => {
        setIsLoading(true);
        setError('');
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
            <h2>Administrador de fechas de Guardias y Feriados</h2>
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
    const sectores = ["Administracion", "Aereos", "Comercial", "Comercial interior", "Data entry", "Diseño - Marketing", "Documentacion", "Grupos", "Hotel ya - Trenes", "Nacional", "Producto", "Recepcion", "Operaciones", "Sistemas", "Ventas Area 1", "Ventas Brasil", "Ventas Europa", "Ventas Exoticos", "Ventas Interior", "Ycix"].sort();
    const sucursales = ["Buenos Aires", "Cordoba", "Comercial Interior", "Rosario"];
    const [allUsers, setAllUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    
    // --- ESTADO CORREGIDO: Volvemos a añadir message y setMessage ---
    const [message, setMessage] = useState('');

    const { isSuperUser, isGuardiaAdmin } = useMemo(() => ({
        isSuperUser: user?.role === 'SUPERUSER',
        isGuardiaAdmin: user?.role === 'SUPERUSER' || (user?.role === 'EDITOR' && user?.sector === 'Administracion'),
    }), [user]);

    const fetchUsers = useCallback(async () => {
        if (!isSuperUser) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const response = await axios.get(`${process.env.REACT_APP_API_URL}/admin/users`, {
                headers: { 'x-access-token': token }
            });
            setAllUsers(response.data);
            setFilteredUsers(response.data);
        } catch (err) {
            setError('No se pudo cargar la lista de usuarios.');
        } finally {
            setIsLoading(false);
        }
    }, [token, isSuperUser]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    useEffect(() => {
        const term = searchTerm.toLowerCase();
        const filtered = allUsers.filter(u => u.username.toLowerCase().includes(term));
        setFilteredUsers(filtered);
    }, [searchTerm, allUsers]);

    const handleRoleChange = async (userId, newRole) => {
        setMessage('');
        setError('');
        try {
            const response = await axios.post(
                `${process.env.REACT_APP_API_URL}/admin/users/${userId}/role`,
                { role: newRole },
                { headers: { 'x-access-token': token } }
            );
            setAllUsers(prevUsers => prevUsers.map(u => u.id === userId ? { ...u, role: newRole } : u));
            setMessage(response.data.message);
        } catch (err) {
            setError(err.response?.data?.message || 'Error al actualizar el rol.');
        }
    };
    
    const handleGuardiaChange = async (userId, newGuardiaNro) => {
        setMessage('');
        setError('');
        const valueToSend = newGuardiaNro ? parseInt(newGuardiaNro, 10) : null;
        try {
            await axios.post(`${process.env.REACT_APP_API_URL}/admin/users/${userId}/guardia`, 
                { guardia_nro: valueToSend },
                { headers: { 'x-access-token': token } }
            );
            setAllUsers(prevUsers => prevUsers.map(u => 
                u.id === userId ? { ...u, guardia_nro: valueToSend } : u
            ));
            setMessage('Número de guardia actualizado correctamente.');
        } catch (error) {
            setError(error.response?.data?.message || "Error al actualizar la guardia.");
        }
    };

    const handleSectorChange = async (userId, newSector) => {
    setMessage('');
    setError('');
    try {
        await axios.post(`${process.env.REACT_APP_API_URL}/admin/users/${userId}/sector`, 
            { sector: newSector },
            { headers: { 'x-access-token': token } }
        );
        
        // Actualizar el estado local para ver el cambio al instante
        setAllUsers(prevUsers => prevUsers.map(u => 
            u.id === userId ? { ...u, sector: newSector } : u
        ));
        setMessage('Sector actualizado correctamente.');

        } catch (error) {
            setError(error.response?.data?.message || "Error al actualizar el sector.");
     }
    };

    const handleSucursalChange = async (userId, newSucursal) => {
        setMessage('');
        setError('');
        try {
            await axios.post(`${process.env.REACT_APP_API_URL}/admin/users/${userId}/sucursal`, 
                { sucursal: newSucursal },
                { headers: { 'x-access-token': token } }
            );
            
            setAllUsers(prevUsers => prevUsers.map(u => 
                u.id === userId ? { ...u, sucursal: newSucursal } : u
            ));
            setMessage('Sucursal actualizada correctamente.');

        } catch (error) {
            setError(error.response?.data?.message || "Error al actualizar la sucursal.");
        }
    };

    const handleInternoChange = async (userId) => {
        const newInterno = prompt("Introduce el nuevo número de interno:");
        if (newInterno === null || newInterno.trim() === '') return;
        
        setMessage('');
        setError('');
        try {
            await axios.post(`${process.env.REACT_APP_API_URL}/admin/users/${userId}/interno`, 
                { interno: newInterno.trim() },
                { headers: { 'x-access-token': token } }
            );
            setAllUsers(prevUsers => prevUsers.map(u => 
                u.id === userId ? { ...u, interno: newInterno.trim() } : u
            ));
            setMessage('Interno actualizado correctamente.');
        } catch (error) {
            setError(error.response?.data?.message || "Error al actualizar el interno.");
        }
    };

    const handleDeleteUser = async (userId, username) => {
        if (window.confirm(`¿Estás SEGURO de que quieres eliminar al usuario ${username}? Esta acción es irreversible.`)) {
            setMessage('');
            setError('');
            try {
                await axios.delete(`${process.env.REACT_APP_API_URL}/admin/users/${userId}`, {
                    headers: { 'x-access-token': token }
                });
                setAllUsers(prevUsers => prevUsers.filter(u => u.id !== userId));
                setMessage(`Usuario ${username} eliminado.`);
            } catch (error) {
                setError(error.response?.data?.message || "Error al eliminar el usuario.");
            }
        }
    };

    if (!user) return <div>Cargando...</div>;
    
    if (!isSuperUser && !isGuardiaAdmin) {
        return <div>Acceso denegado. No tienes permisos para ver esta sección.</div>;
    }

    return (
        <div className="admin-panel-container">
            <h1>Panel de Administración</h1>
            
            {/* --- JSX CORREGIDO: Volvemos a añadir el mensaje de éxito --- */}
            {error && <p className="error-message">{error}</p>}
            {message && <p className="success-message">{message}</p>}
            
            {isSuperUser && (
                <div className="admin-section">
                    
                    <div className="search-bar">
                        <input type="text" placeholder="Buscar por correo..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                    {isLoading && allUsers.length === 0 ? <p>Cargando usuarios...</p> : (
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Usuario (Email)</th>
                                    <th>Rol</th>
                                    <th>Guardia</th>
                                    <th>Sector</th>
                                    <th>Sucursal</th> 
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map(u => (
                                    <tr key={u.id}>
                                        <td>{u.username}</td>
                                        <td>{u.id === user.id ? <strong>{u.role} (Actual)</strong> : <select value={u.role} onChange={(e) => handleRoleChange(u.id, e.target.value)} className="admin-select"><option value="VIEWER">Solo Lectura</option><option value="EDITOR">Editor</option><option value="SUPERUSER">Superusuario</option></select>}</td>
                                        <td><select value={u.guardia_nro || ''} onChange={(e) => handleGuardiaChange(u.id, e.target.value)} className="admin-select"><option value="">Sin Asignar</option><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option></select></td>
                                        <td>{u.id === user.id ? (<strong>{u.sector}</strong>) : (<select value={u.sector || ''} onChange={(e) => handleSectorChange(u.id, e.target.value)} className="admin-select"> <option value="">Seleccionar...</option>{sectores.map(s => <option key={s} value={s}>{s}</option>)}</select>)}</td>
                                        <td>{u.id === user.id ? (<strong>{u.sucursal}</strong>) : (<select value={u.sucursal || ''} onChange={(e) => handleSucursalChange(u.id, e.target.value)} className="admin-select"><option value="">Seleccionar...</option>{sucursales.map(s => <option key={s} value={s}>{s}</option>)}</select>)}</td>
                                        <td>{u.id !== user.id && (<div className="admin-actions"><button onClick={() => handleInternoChange(u.id)} className="action-button">Cambiar Interno</button><button onClick={() => handleDeleteUser(u.id, u.username)} className="action-button delete">Eliminar</button></div>)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
            
            {isSuperUser && isGuardiaAdmin && <hr className="admin-divider" />}

            {isGuardiaAdmin && (
                <div className="admin-section">
                    <GuardiasManager token={token} />
                </div>
            )}
        </div>
    );
};

export default AdminPanel;