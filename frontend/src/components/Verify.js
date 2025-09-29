import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';

const Verify = () => {
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const navigate = useNavigate();
    const location = useLocation();
    
    const username = location.state?.username;

    if (!username) {
        navigate('/register');
    }

    const handleVerify = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        try {
            const response = await axios.post(`${process.env.REACT_APP_API_URL}/verify`, {
                username,
                code
            });
            setSuccess(response.data.message);
            setTimeout(() => {
                navigate('/login');
            }, 1000); 

        } catch (err) {
            if (err.response && err.response.data) {
                setError(err.response.data.message);
            } else {
                setError('Error al verificar la cuenta.');
            }
        }
    };

    return (
        <div className="form-container">
            <h2>Verificar Cuenta</h2>
            <p>Se ha enviado un código de 6 dígitos a <strong>{username}</strong>.</p>
            <form onSubmit={handleVerify}>
                {error && <p className="error-message">{error}</p>}
                {success && <p className="success-message">{success}</p>}
                <div className="form-group">
                    <label>Código de Verificación</label>
                    <input
                        type="text"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        maxLength="6"
                        required
                    />
                </div>
                <button type="submit" className="btn-primary">Verificar</button>
            </form>
        </div>
    );
};

export default Verify;