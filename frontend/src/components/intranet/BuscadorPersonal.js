// src/components/intranet/BuscadorPersonal.js

import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../api';
import { useAuth } from '../../context/AuthContext'; // Import useAuth para el token
import './BuscadorPersonal.css'; 

const BuscadorPersonal = () => {
    const { token } = useAuth(); // Obtén el token del contexto
    const [searchTerm, setSearchTerm] = useState('');
    const [allUsers, setAllUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'nombre', direction: 'ascending' });

    useEffect(() => {
        const fetchAllUsers = async () => {
            if (token) {
                try {
                    const response = await apiClient.get('/internos', {
                        headers: { 'x-access-token': token }
                    });
                    setAllUsers(response.data);
                } catch (err) {
                    setError('No se pudo cargar el directorio del Personal.');
                } finally {
                    setIsLoading(false);
                }
            }
        };
        fetchAllUsers();
    }, [token]);

    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const sortedAndFilteredUsers = useMemo(() => {
        let filtered = [...allUsers]; // Crea una copia para no mutar el estado original

        // 1. Filtrado
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(user => {
                const searchableString = `
                    ${user.nombre || ''} 
                    ${user.apellido || ''} 
                    ${user.username || ''} 
                    ${user.interno || ''} 
                    ${user.sector || ''} 
                    ${user.sucursal || ''}
                `.toLowerCase();
                return searchableString.includes(term);
            });
        }

        // 2. Ordenamiento
        if (sortConfig.key !== null) {
            filtered.sort((a, b) => {
                // Manejar valores nulos para que siempre queden al final
                const aValue = a[sortConfig.key] || '';
                const bValue = b[sortConfig.key] || '';

                if (aValue < bValue) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        
        return filtered;
    }, [searchTerm, allUsers, sortConfig]);

    if (isLoading) return <p>Cargando directorio del Personal...</p>;
    if (error) return <p className="error-message">{error}</p>;

    return (
        <div className="buscador-container">
            <h1>Directorio del Personal</h1>
            
            <div className="search-bar">
                <div className="form-group">
                    <label>Buscar por Nombre, Email, Sector, Sucursal o Interno:</label>
                    <input 
                        type="text" 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Escribe para filtrar en tiempo real..."
                    />
                </div>
            </div>

            <div className="results-container">
                <table className="results-table sortable">
                    <thead>
                        <tr>
                            <th style={{width: '60px'}}></th>
                            <th onClick={() => requestSort('nombre')}>
                                Nombre Completo {sortConfig.key === 'nombre' ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : null}
                            </th>
                            <th onClick={() => requestSort('username')}>
                                Email {sortConfig.key === 'username' ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : null}
                            </th>
                            <th onClick={() => requestSort('interno')}>
                                Interno {sortConfig.key === 'interno' ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : null}
                            </th>
                            <th onClick={() => requestSort('guardia_nro')}>
                                Guardia {sortConfig.key === 'guardia_nro' ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : null}
                            </th>
                            <th onClick={() => requestSort('sector')}>
                                Sector {sortConfig.key === 'sector' ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : null}
                            </th>                            
                            <th onClick={() => requestSort('sucursal')}>
                                Sucursal {sortConfig.key === 'sucursal' ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : null}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedAndFilteredUsers.map(user => (
                            <tr key={user.id}>
                                <td>
                                    <Link to={`/user/${user.id}`}>
                                        <img 
                                            src={`${process.env.REACT_APP_API_URL}/uploads/${user.profile_image || 'default.png'}`} 
                                            alt={`${user.nombre}`}
                                            className="profile-thumbnail-small"
                                        />
                                    </Link>
                                </td>
                                <td>{user.nombre} {user.apellido}</td>
                                <td>
                                    {user.username ? (<a href={`mailto:${user.username}`}>{user.username}</a>) : 'N/A'}
                                </td>
                                <td>
                                    {user.interno ? (<a href={`tel:${user.interno}`} className="tel-link">{user.interno}</a>) : 'N/A'}
                                </td>
                                <td>{user.guardia_nro || 'N/A'}</td> 
                                <td>{user.sector}</td>                                
                                <td>{user.sucursal || 'N/A'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {sortedAndFilteredUsers.length === 0 && searchTerm && (
                    <p>No se encontraron resultados para "{searchTerm}".</p>
                )}
            </div>
        </div>
    );
};

export default BuscadorPersonal;