
import React, { useState } from 'react'; 
import { NavLink, Outlet } from 'react-router-dom';
import './IntranetLayout.css';

const MenuIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="3" y1="12" x2="21" y2="12"></line>
        <line x1="3" y1="6" x2="21" y2="6"></line>
        <line x1="3" y1="18" x2="21" y2="18"></line>
    </svg>
);

const IntranetLayout = () => {
    const [isSidebarVisible, setIsSidebarVisible] = useState(true);

    const sectores = ["Administracion", "Aereos", "Comercial", "Diseño - Marketing", "Documentacion", "Grupos", "Hotel Ya - Trenes", "Nacional", "Operaciones", "Producto", "Recepcion", "Sistemas", "Ventas Area 1", "Ventas Brasil", "Ventas Europa", "Ventas Exoticos", "Ventas Interior", "Ycix"].sort();

    return (
        <div className={`intranet-layout-container ${isSidebarVisible ? 'sidebar-visible' : 'sidebar-hidden'}`}>
            
            <aside className="fixed-sidebar">
                <div className="sidebar-header">
                    <h4>Información por Sector</h4>

                    <button className="toggle-sidebar-btn" onClick={() => setIsSidebarVisible(false)}>
                        &times;
                    </button>
                </div>
                <nav className="sidebar-nav">
                    <ul>
                        {sectores.map(sector => (
                            <li key={sector}>
                                <NavLink to={`/index/informacion/${sector}`}>
                                    {sector}
                                </NavLink>
                            </li>
                        ))}
                    </ul>
                </nav>
            </aside>

            <main className="intranet-content">
                {!isSidebarVisible && (
                    <button className="toggle-sidebar-btn open-btn" onClick={() => setIsSidebarVisible(true)}>
                        <MenuIcon />
                    </button>
                )}
                <Outlet />
            </main>
        </div>
    );
};

export default IntranetLayout;