import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Profile.css';

const Profile = () => {
    const { token, user, login } = useAuth();
    const navigate = useNavigate();

    const [profileData, setProfileData] = useState({
        nombre: '',
        apellido: '',
        interno: '',
        correo: '',
        fecha_nacimiento: '',
        sector: '',
        sucursal: '',
        profile_image: 'default.png',
        guardia_nro: ''
    });

    const [selectedFile, setSelectedFile] = useState(null);
    const [previewSource, setPreviewSource] = useState('');
    
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);

    const sectores = ["Administracion", "Aereos", "Comercial", "Comercial interior", "Data entry", "Diseño - Marketing", "Documentacion", "Grupos", "Hotel ya - Trenes", "Nacional", "Producto", "Recepcion", "Operaciones", "Sistemas", "Ventas Area 1", "Ventas Brasil", "Ventas Europa", "Ventas Exoticos", "Ventas Interior", "Ycix"];
    const sucursales = ["Buenos Aires", "Cordoba", "Comercial Interior", "Rosario"];

    useEffect(() => {
        const fetchProfile = async () => {
            if (token) {
                try {
                    const response = await axios.get(`${process.env.REACT_APP_API_URL}/profile`, {
                        headers: { 'x-access-token': token }
                    });
                    setProfileData(prevData => ({ ...prevData, ...response.data }));
                } catch (error) {
                    setError("No se pudo cargar la información del perfil.");
                } finally {
                    setIsLoading(false);
                }
            }
        };
        fetchProfile();
    }, [token]); 

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
            setPreviewSource(URL.createObjectURL(file));
        }
    };

    const handleImageUpload = async () => {
        if (!selectedFile) return;
        setIsUploading(true);
        setError('');
        setMessage('');

        const formData = new FormData();
        formData.append('profile_pic', selectedFile);

        try {
            await axios.post(`${process.env.REACT_APP_API_URL}/profile/upload-image`, formData, {
                headers: { 'Content-Type': 'multipart/form-data', 'x-access-token': token }
            });
            
            const tokenResponse = await axios.post(`${process.env.REACT_APP_API_URL}/login/refresh-token`, {}, {
                headers: { 'x-access-token': token }
            });
            login(tokenResponse.data.token);

            const profileResponse = await axios.get(`${process.env.REACT_APP_API_URL}/profile`, {
                headers: { 'x-access-token': token }
            });
            setProfileData(prevData => ({ ...prevData, ...profileResponse.data }));

            setSelectedFile(null);
            setPreviewSource('');
            setMessage('Imagen de perfil actualizada exitosamente.');
        } catch (err) {
            setError(err.response?.data?.message || 'Error al subir la imagen.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleChange = (e) => {
        setProfileData({ ...profileData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setIsLoading(true);

        const { correo, profile_image, ...validatableData } = profileData;
        for (const key in validatableData) {
            if (!validatableData[key]) {
                const fieldName = key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' ');
                setError(`El campo '${fieldName}' es obligatorio.`);
                setIsLoading(false);
                return;
            }
        }

        try {
            await axios.post(`${process.env.REACT_APP_API_URL}/profile`, profileData, {
                headers: { 'x-access-token': token }
            });

            if (user?.profile_incomplete) {
                const response = await axios.post(`${process.env.REACT_APP_API_URL}/login/refresh-token`, {}, {
                    headers: { 'x-access-token': token }
                });
                login(response.data.token);
                navigate('/index');
            } else {
                setMessage('Datos del perfil actualizados exitosamente.');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Error al actualizar los datos.');
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return <div>Cargando perfil...</div>;
    }

    return (
        <div className="profile-page-container">
            {user?.profile_incomplete && (
                <p className="info-message">
                    <strong>¡Bienvenido!</strong> Por favor, completa tu perfil para continuar. Todos los campos son obligatorios.
                </p>
            )}
            
            <div className="profile-content">
                <div className="profile-picture-section">
                    <h3>Imagen de Perfil</h3>
                    <img 
                        src={previewSource || `${process.env.REACT_APP_API_URL}/uploads/${profileData.profile_image || 'default.png'}`} 
                        alt="Perfil" 
                        className="profile-pic"
                    />
                    <input 
                        type="file" 
                        id="file-input" 
                        style={{ display: 'none' }} 
                        onChange={handleFileChange} 
                        accept="image/png, image/jpeg"
                    />
                    <label htmlFor="file-input" className="btn-secondary">
                        Seleccionar Imagen
                    </label>
                    
                    {selectedFile && (
                        <button 
                            onClick={handleImageUpload} 
                            className="btn-primary" 
                            disabled={isUploading}
                        >
                            {isUploading ? 'Subiendo...' : 'Subir Imagen'}
                        </button>
                    )}
                </div>
                
                <div className="form-container profile-form">
                    <h2>Mi Perfil</h2>
                    {error && <p className="error-message">{error}</p>}
                    {message && <p className="success-message">{message}</p>}
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                          <label>Nombre:</label>
                          <input type="text" name="nombre" value={profileData.nombre || ''} onChange={handleChange} required />
                        </div>
                        <div className="form-group">
                            <label>Apellido:</label>
                            <input type="text" name="apellido" value={profileData.apellido || ''} onChange={handleChange} required />
                        </div>
                        <div className="form-group">
                            <label>Interno:</label>
                            <input type="text" name="interno" value={profileData.interno || ''} onChange={handleChange} required />
                        </div>
                        <div className="form-group">
                            <label>Correo: (no se puede modificar)</label>
                            <input type="email" name="correo" value={profileData.correo || ''} disabled />
                        </div>
                        <div className="form-group">
                            <label>Fecha de Nacimiento:</label>
                            <input type="date" name="fecha_nacimiento" value={profileData.fecha_nacimiento || ''} onChange={handleChange} required />
                        </div>
                        <div className="form-group">
                            <label>Sector:</label>
                            <select name="sector" value={profileData.sector || ''} onChange={handleChange} required>
                                <option value="">Selecciona un sector...</option>
                                {sectores.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Sucursal:</label>
                            <select name="sucursal" value={profileData.sucursal || ''} onChange={handleChange} required>
                                <option value="">Selecciona una sucursal...</option>
                                {sucursales.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Guardia:</label>
                            <select
                                name="guardia_nro"
                                value={profileData.guardia_nro || ''}
                                onChange={handleChange}
                            >
                                <option value="">-</option>
                                <option value="1">1</option>
                                <option value="2">2</option>
                                <option value="3">3</option>
                                <option value="4">4</option>
                            </select>
                        </div>
                        <button type="submit" className="btn-primary" disabled={isLoading}>
                            {isLoading ? 'Guardando...' : 'Guardar Datos'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Profile;