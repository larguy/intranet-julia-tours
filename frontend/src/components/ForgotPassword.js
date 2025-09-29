import React, { useState } from 'react';
import axios from 'axios';

const ForgotPassword = () => {
    const [username, setUsername] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');
        try {
            const response = await axios.post('http://127.0.0.1:5000/request-reset', { username });
            setMessage(response.data.message);
        } catch (err) {
            setError('Ocurrió un error. Intenta de nuevo.');
        }
    };

    return (
        <div className="form-container">
            <h2>Recuperar Contraseña</h2>
            <p>Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.</p>
            <form onSubmit={handleSubmit}>
                {message && <p className="success-message">{message}</p>}
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
                <button type="submit" className="btn-primary">Enviar Enlace</button>
            </form>
        </div>
    );
};

export default ForgotPassword;