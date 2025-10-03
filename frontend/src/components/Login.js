import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import apiClient from '../api';
import { useAuth } from '../context/AuthContext';

const Login = () => { 
    const { login } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const response = await apiClient.post(`${process.env.REACT_APP_API_URL}/login`, { 
                username: username, 
                password: password 
            });
            
            if (!response.data.token) {
                throw new Error("La respuesta del servidor no incluyó un token.");
            }
            
            login(response.data.token);
            
            navigate('/index/novedades');

        } catch (err) {
            if (err.response) {
                if (err.response.status === 403 && err.response.data.action_required === 'verify') {
                    setError(err.response.data.message);
                    setTimeout(() => {
                        navigate('/verify', { state: { username: username } });
                    }, 2500);
                } else {
                    setError(err.response.data.message || 'Credenciales inválidas');
                }
            } else {
                setError(err.message || 'Error de conexión. Intente más tarde.');
            }
        } finally {
            setIsLoading(false); 
        }
    };

    return (
        <div className="form-container">
            
            <img src="/logo_login.png" alt="Julia Tours Logo" className="login-logo" />

            <h2>Iniciar Sesión</h2>
            <form onSubmit={handleLogin}>
                {error && <p className="error-message">{error}</p>}
                
                <div className="form-group">
                    <label>Correo Electrónico</label> 
                    <input type="email" value={username} onChange={(e) => setUsername(e.target.value)} required />
                </div>
                <div className="form-group">
                    <label>Contraseña</label>
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>

                <button type="submit" className="btn-primary" disabled={isLoading}>
                    {isLoading ? 'Cargando...' : 'Entrar'}
                </button>
            </form>
            <p>¿No tienes una cuenta? <Link to="/register">Regístrate aquí</Link></p>
            <p><Link to="/forgot-password">¿Olvidaste tu contraseña?</Link></p>
            <p className="developer-credit">Sitio desarrollado por Leandro Ramos</p>
        </div>
    );
};

export default Login;