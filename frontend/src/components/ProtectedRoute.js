import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = () => {
    const { token, user } = useAuth();
    const location = useLocation();

    // Condición 1: No hay token = No está autenticado
    // Redirige al login.
    if (!token) {
        return <Navigate to="/login" replace />;
    }

    // Condición 2: Hay token, PERO el perfil está incompleto
    // Y el usuario NO está ya en la página de perfil.
    if (user && user.profile_incomplete && location.pathname !== '/profile') {
        // Redirige FORZOSAMENTE a la página de perfil.
        return <Navigate to="/profile" replace />;
    }

    // Condición 3: Hay token Y el perfil está completo
    // El usuario puede acceder a la intranet.
    // O si el perfil está incompleto PERO ya está en /profile, también lo dejamos pasar.
    return <Outlet />;
};

export default ProtectedRoute;