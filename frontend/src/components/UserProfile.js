import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import './UserProfile.css'; 

const UserProfile = () => {
    const { userId } = useParams(); 
    const { token } = useAuth();
    const navigate = useNavigate();

    const [userData, setUserData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchUserProfile = async () => {
            try {
                const response = await axios.get(`${process.env.REACT_APP_API_URL}/user/${userId}/profile`, {
                    headers: { 'x-access-token': token }
                });
                setUserData(response.data);
            } catch (err) {
                setError('No se pudo cargar el perfil del usuario.');
            } finally {
                setIsLoading(false);
            }
        };

        if (token && userId) {
            fetchUserProfile();
        }
    }, [userId, token]);

     const formatBirthday = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString + 'T00:00:00Z');
            return date.toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'long',
                timeZone: 'UTC' 
            });
        } catch (e) {
            return 'Fecha inválida';
        }
    };

    if (isLoading) return <p>Cargando perfil...</p>;
    if (error) return <p className="error-message">{error}</p>;
    if (!userData) return <p>No se encontró la información del usuario.</p>;

    return (
        <div className="user-profile-page">
            <button onClick={() => navigate('/index/buscador-personal')} className="back-button">← Volver</button>
            <div className="profile-card">
                <img 
                    src={`${process.env.REACT_APP_API_URL}/uploads/${userData.profile_image}`} 
                    alt={`${userData.nombre} ${userData.apellido}`}
                    className="profile-card-image"
                />
                <h1>{userData.nombre} {userData.apellido}</h1>
                <div className="profile-details">
                    <p><strong>Sector:</strong> {userData.sector}</p>
                    <p><strong>Sucursal:</strong> {userData.sucursal}</p>
                    <p><strong>Interno:</strong> {userData.interno}</p>
                    <p><strong>Correo:</strong> {userData.correo}</p>
                    <p><strong>Cumpleaños:</strong> {formatBirthday(userData.fecha_nacimiento)}</p>
                </div>
            </div>
        </div>
    );
};

export default UserProfile;