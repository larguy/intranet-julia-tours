import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './BuscadorPersonal.css'; 

const BuscadorPersonal = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [allUsers, setAllUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');


    useEffect(() => {
        const fetchAllUsers = async () => {
            const token = localStorage.getItem('token');
            try {
                const response = await axios.get(`${process.env.REACT_APP_API_URL}/internos`, {
                    headers: { 'x-access-token': token }
                });
                setAllUsers(response.data);
                setFilteredUsers(response.data);
            } catch (err) {
                setError('No se pudo cargar el directorio del Personal.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchAllUsers();
    }, []);


    useEffect(() => {
        const term = searchTerm.toLowerCase();
        const filtered = allUsers.filter(user => {
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
        setFilteredUsers(filtered);
    }, [searchTerm, allUsers]);

    if (isLoading) return <p>Cargando directorio del Personal...</p>;
    if (error) return <p className="error-message">{error}</p>;

    return (
        <div>
            <h1>Directorio del Personal</h1>
            
            {/* --- JSX SIMPLIFICADO --- */}
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
                <table className="results-table">
                    <thead>
                        <tr>
                            <th style={{width: '60px'}}></th>
                            <th>Nombre Completo</th>
                            <th>Email</th>
                            <th>Interno</th>
                            <th>Guardia</th>
                            <th>Sector</th>                            
                            <th>Sucursal</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUsers.map(user => (
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
                                    {user.username ? (
                                        <a href={`mailto:${user.username}`}>{user.username}</a>
                                    ) : (
                                        'N/A'
                                    )}
                                </td>
                                <td>
                                    {user.interno ? (
                                        <a href={`tel:${user.interno}`} className="tel-link">
                                            {user.interno}
                                        </a>
                                    ) : (
                                        'N/A'
                                    )}
                                </td>
                                <td>{user.guardia_nro || 'N/A'}</td> 
                                <td>{user.sector}</td>                                
                                <td>{user.sucursal || 'N/A'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredUsers.length === 0 && searchTerm && (
                    <p>No se encontraron resultados para "{searchTerm}".</p>
                )}
            </div>
        </div>
    );
};

export default BuscadorPersonal;