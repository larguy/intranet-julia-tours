import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

const Register = () => {
    // Estados para los datos del formulario
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    // Estados para la UI (feedback al usuario)
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const navigate = useNavigate();

    const handleRegister = async (e) => {
        e.preventDefault();
        
        // --- 1. VALIDACIONES DEL LADO DEL CLIENTE ---
        // Esto da feedback inmediato sin llamar al backend
        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden');
            return;
        }
        if (password.length < 8) {
            setError('La contraseña debe tener al menos 8 caracteres');
            return;
        }
        if (!/[A-Z]/.test(password)) {
            setError('La contraseña debe contener al menos una letra mayúscula');
            return;
        }
        if (!/[a-z]/.test(password)) {
            setError('La contraseña debe contener al menos una letra minúscula');
            return;
        }
        if (!/[0-9]/.test(password)) {
            setError('La contraseña debe contener al menos un número');
            return;
        }

        // --- 2. PREPARACIÓN PARA LA LLAMADA A LA API ---
        setError(''); // Limpia errores anteriores
        setIsLoading(true); // Activa el indicador de carga

        try {
            // --- 3. LLAMADA A LA API ---
            await axios.post(`${process.env.REACT_APP_API_URL}/register`, { 
                username: username, 
                password: password,
                confirm_password: confirmPassword
            });
            
            // --- 4. ACCIÓN EN CASO DE ÉXITO ---
            // Redirigimos a /verify y pasamos el email para que sepa a quién verificar
            navigate('/verify', { state: { username: username } });

        } catch (err) {
            // --- 5. MANEJO DE ERRORES DEL BACKEND ---
            if (err.response && err.response.data && err.response.data.message) {
                // Muestra el mensaje de error específico del backend (ej: "Este correo ya está registrado")
                setError(err.response.data.message);
            } else {
                // Mensaje genérico para otros tipos de errores (ej: de red)
                setError('No se pudo completar el registro. Intente más tarde.');
            }
        } finally {
            // --- 6. LIMPIEZA ---
            // Esto se ejecuta siempre, tanto en éxito como en error
            setIsLoading(false); // Desactiva el indicador de carga
        }
    };

    return (
        <div className="form-container">
            <h2>Crear Cuenta</h2>
            <form onSubmit={handleRegister}>
                {error && <p className="error-message">{error}</p>}
                
                <div className="form-group">
                    <label>Correo Electrónico</label>
                    <input 
                        type="email" 
                        value={username} 
                        onChange={(e) => setUsername(e.target.value)} 
                        required 
                    />
                </div>
                <div className="form-group">
                    <label>Contraseña</label>
                    <ul className="password-rules">
                        <li>Mínimo 8 caracteres</li>
                        <li>Al menos una mayúscula (A-Z)</li>
                        <li>Al menos una minúscula (a-z)</li>
                        <li>Al menos un número (0-9)</li>
                    </ul>
                    <input 
                        type="password" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        required 
                    />
                </div>
                <div className="form-group">
                    <label>Repetir Contraseña</label>
                    <input 
                        type="password" 
                        value={confirmPassword} 
                        onChange={(e) => setConfirmPassword(e.target.value)} 
                        required 
                    />
                </div>
                {/* El botón ahora reacciona al estado de carga */}
                <button type="submit" className="btn-primary" disabled={isLoading}>
                    {isLoading ? 'Registrando...' : 'Registrarse'}
                </button>
            </form>
            <p>¿Ya tienes una cuenta? <Link to="/login">Inicia sesión</Link></p>
        </div>
    );
};

export default Register;