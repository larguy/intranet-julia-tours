import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './ProfileDropdown.css'; 

const ProfileDropdown = () => {
    const { user, logout } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null); 

    const profileImageUrl = `${process.env.REACT_APP_API_URL}/uploads/${user.profile_image || 'default.png'}`;

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    return (
        <div className="profile-dropdown" ref={dropdownRef}>
            <button onClick={() => setIsOpen(!isOpen)} className="profile-trigger">
                <img src={profileImageUrl} alt="Perfil" className="profile-thumbnail" />
            </button>

            {isOpen && (
                <div className="dropdown-menu">
                    <ul>
                        <li>
                            <Link to="/profile" onClick={() => setIsOpen(false)}>Ver Perfil</Link>
                        </li>
                        <li>
                            <button onClick={() => { logout(); setIsOpen(false); }}>
                                Cerrar Sesión
                            </button>
                        </li>
                    </ul>
                </div>
            )}
        </div>
    );
};

export default ProfileDropdown;