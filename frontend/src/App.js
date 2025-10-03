import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, Link, NavLink, useLocation } from 'react-router-dom';
import './App.css';
import CalendarioReuniones from './components/intranet/CalendarioReuniones';

import { useAuth } from './context/AuthContext';
import Login from './components/Login';
import Register from './components/Register';
import Verify from './components/Verify';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import Profile from './components/Profile';
import IntranetLayout from './components/IntranetLayout';
import ProfileDropdown from './components/ProfileDropdown';
import UserProfile from './components/UserProfile'; 
import ProtectedRoute from './components/ProtectedRoute';


import Agenda from './components/intranet/Agenda';
import Novedades from './components/intranet/Novedades';
import Cumpleanos from './components/intranet/Cumpleanos';
import BuscadorPersonal from './components/intranet/BuscadorPersonal';
import InformacionPorSector from './components/intranet/InformacionPorSector';
import AdminPanel from './components/intranet/admin/AdminPanel';
import EditPost from './components/intranet/EditPost';

import Eventos from './components/intranet/Eventos';
import EventoDetalle from './components/intranet/EventoDetalle';
import CrearEvento from './components/intranet/CrearEvento';


const AppRoutes = () => {
    const location = useLocation();
    const { token } = useAuth();
    
    return (
        <Routes>
            {/* Rutas Públicas */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify" element={<Verify />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />

            {/* Rutas Privadas */}
            <Route path="/profile" element={token ? <Profile /> : <Navigate to="/login" />} />
            
            
                       

            {/* Esta ruta ahora funcionará porque UserProfile está importado */}
            <Route path="/user/:userId" element={token ? <UserProfile /> : <Navigate to="/login" />} />
            <Route element={<ProtectedRoute />}> 
                <Route path="/index" element={token ? <IntranetLayout /> : <Navigate to="/login" />}>
                    
                    <Route path="agenda" element={<Agenda />} />
                    <Route path="novedades" element={<Novedades />} />
                    <Route path="cumpleanos" element={<Cumpleanos />} />
                    <Route path="buscador-personal" element={<BuscadorPersonal />} />
                    <Route path="calendario-reuniones" element={<CalendarioReuniones />} />
                    <Route 
                        path="informacion/:sectorName" 
                        element={<InformacionPorSector key={location.pathname} />} 
                    />
                    <Route path="informacion/edit/:postId" element={<EditPost />} />
                     <Route path="eventos" element={<Eventos />} />
                    <Route path="eventos/crear" element={<CrearEvento />} />
                    <Route path="eventos/editar/:eventoId" element={<CrearEvento modoEdicion={true} />} />
                    <Route path="eventos/:eventoId" element={<EventoDetalle />} />
                    <Route path="admin" element={<AdminPanel />} />
                </Route>
            </Route>
            <Route path="/" element={<Navigate to={token ? "/index/novedades" : "/login"} />} />
        </Routes>
    );
}

function App() {
    const { token, user } = useAuth();
    
    return (
        <Router>
            <div className="App">
                <header className="app-header">
                    <div className="header-left">
                        <Link to={token ? "/index/novedades" : "/login"}>
                            <img src="/logo.png" alt="Julia Tours Logo" className="logo" />
                        </Link>
                    </div>

                    {token && (
                        <nav className="intranet-main-nav">
                            <ul>
                                <li><NavLink to="/index/agenda">Agenda</NavLink></li>
                                <li><NavLink to="/index/novedades">Novedades</NavLink></li>
                                <li><NavLink to="/index/cumpleanos">Cumpleaños</NavLink></li>
                                <li><NavLink to="/index/buscador-personal">Buscador</NavLink></li>
                                <li><NavLink to="/index/calendario-reuniones">Calendario</NavLink></li>
                                <li><NavLink to="/index/eventos">Eventos</NavLink></li>
                                {user && user.role === 'SUPERUSER' && (
                                    <li><NavLink to="/index/admin">Admin</NavLink></li>
                                )}
                            </ul>
                        </nav>
                    )}

                    <div className="header-right">
                        {token && user ? (
                            <ProfileDropdown />
                        ) : (
                            <div className="nav-links">
                                <Link to="/login" className="nav-link">Iniciar Sesión</Link>
                                <Link to="/register" className="nav-link">Registrarse</Link>
                            </div>
                        )}
                    </div>
                </header>
                
                <main>
                    <AppRoutes />
                </main>
            </div>
        </Router>
    );
}

export default App;