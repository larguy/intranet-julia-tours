import React, { createContext, useState, useContext, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';

import apiClient, { setAuthToken } from '../api'; 

const AuthContext = createContext();

export const useAuth = () => {
    return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [user, setUser] = useState(null);

    useEffect(() => {
        // --- EL INTERCEPTOR AHORA SE APLICA SOLO A NUESTRA INSTANCIA ---
        const interceptor = apiClient.interceptors.response.use( // <-- 2. Usa 'apiClient'
            response => response,
            error => {
                if (error.response && error.response.status === 401) {
                    logout();
                }
                return Promise.reject(error);
            }
        );

        return () => {
            apiClient.interceptors.response.eject(interceptor); // <-- 3. Limpia 'apiClient'
        };
    }, []);

    useEffect(() => {
        if (token) {
            try {
                const decodedUser = jwtDecode(token);
                setUser(decodedUser);
                // --- SE CONFIGURA EL TOKEN SOLO EN NUESTRA INSTANCIA ---
                setAuthToken(token); // <-- 4. Usa la función 'setAuthToken'
            } catch (error) {
                console.error("Error al decodificar el token:", error);
                logout();
            }
        } else {
            setUser(null);
            setAuthToken(null); // <-- 5. Limpia el token de nuestra instancia
        }
    }, [token]);

    const login = (newToken) => {
        localStorage.setItem('token', newToken);
        setToken(newToken);
    };

    const logout = () => {
        localStorage.removeItem('token');
        setToken(null);
    };

    const value = { token, user, login, logout };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};