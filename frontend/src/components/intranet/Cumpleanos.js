
import React, { useState, useEffect, useMemo } from 'react';
import apiClient from '../../api'; 
import { useAuth } from '../../context/AuthContext';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import './Cumpleanos.css';

const parseDateWithoutTimezone = (dateString) => {
    if (!dateString) return null;
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
};

const areDatesSameDayAndMonth = (date1, date2) => {
    if (!date1 || !date2) return false;
    return date1.getUTCDate() === date2.getUTCDate() && date1.getUTCMonth() === date2.getUTCMonth();
};


const Cumpleanos = () => {
    const { user: currentUser, token } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const [cumpleanerosDeHoy, setCumpleanerosDeHoy] = useState([]);

    const [isCalendarVisible, setIsCalendarVisible] = useState(false);
    const [allUsers, setAllUsers] = useState([]);
    const [selectedDate, setSelectedDate] = useState(new Date());
    
    const birthdaysOnSelectedDate = useMemo(() => 
        allUsers.filter(user => areDatesSameDayAndMonth(parseDateWithoutTimezone(user.fecha_nacimiento), selectedDate)),
        [allUsers, selectedDate]
    );

    const upcomingBirthdays = useMemo(() => {
        const today = new Date();
        const upcoming = [];
        for (let i = 1; i <= 7; i++) {
            const futureDate = new Date();
            futureDate.setDate(today.getDate() + i);
            allUsers.forEach(user => {
                if (areDatesSameDayAndMonth(parseDateWithoutTimezone(user.fecha_nacimiento), futureDate)) {
                    upcoming.push({ ...user, birthdayDate: futureDate });
                }
            });
        }
        upcoming.sort((a, b) => a.birthdayDate - b.birthdayDate);
        return upcoming;
    }, [allUsers]);


    useEffect(() => {
        const fetchData = async () => {
            if (token) {
                setIsLoading(true);
                try {
                    const usersRes = await apiClient.get('/internos', { headers: { 'x-access-token': token } });
                    setAllUsers(usersRes.data);

                    const cumpleHoyRes = await apiClient.get('/cumpleanos', { headers: { 'x-access-token': token } });
                    setCumpleanerosDeHoy(cumpleHoyRes.data);

                } catch (err) {
                    setError('No se pudo cargar toda la información de cumpleaños.');
                } finally {
                    setIsLoading(false);
                }
            }
        };
        fetchData();
    }, [token]);

    const handleChangeGif = async (userId) => {
        try {
            const response = await apiClient.post(`/cumpleanos/${userId}/change-gif`, {}, { headers: { 'x-access-token': token } });
            setCumpleanerosDeHoy(prev => prev.map(c => 
                c.id === userId ? { ...c, gif_url: response.data.new_gif_url } : c
            ));
        } catch (err) {
            console.error("Error al cambiar el GIF:", err);
            setError('No se pudo cambiar el GIF. Inténtalo de nuevo.');
        }
    };

    const isTodaySelected = areDatesSameDayAndMonth(selectedDate, new Date());

    if (isLoading) return <p>Cargando información de cumpleaños...</p>;
    if (error) return <p className="error-message">{error}</p>;

    return (
        <div className="cumpleanos-page-container">
            <h1>
                {cumpleanerosDeHoy.length > 0 ? "¡Feliz Cumpleaños!" : "Hoy no hay Cumpleaños"}
            </h1>
            
            {cumpleanerosDeHoy.length > 0 && (
                <div className="birthday-container today">
                    {cumpleanerosDeHoy.map(cumpleanero => (
                        <div key={cumpleanero.id} className="cumpleanero-card">
                            <img src={`${process.env.REACT_APP_API_URL}/uploads/${cumpleanero.profile_image}`} alt={cumpleanero.nombre} className="profile-pic-cumple" />
                            <h3>{cumpleanero.nombre} {cumpleanero.apellido}</h3>
                            <p>{cumpleanero.sector}</p>
                            {cumpleanero.gif_url && (
                                <div className="gif-container">
                                    <img src={cumpleanero.gif_url} alt="Happy Birthday GIF" className="birthday-gif" />
                                </div>
                            )}
                            {(currentUser.id === cumpleanero.id || currentUser.role === 'SUPERUSER') && (
                                <button onClick={() => handleChangeGif(cumpleanero.id)} className="change-gif-btn">
                                    Cambiar GIF
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <div className="calendar-search-container">
                <button className="toggle-calendar-btn" onClick={() => setIsCalendarVisible(!isCalendarVisible)}>
                    {isCalendarVisible ? 'Ocultar Calendario' : 'Buscar cumpleaños por fecha'}
                </button>
                {isCalendarVisible && (
                    <div className="calendar-wrapper">
                        <DatePicker selected={selectedDate} onChange={(date) => setSelectedDate(date)} inline />
                    </div>
                )}
            </div>
            
            {!isTodaySelected && (
                 <div className="daily-results-section">
                    <h3>
                        {`Cumpleaños del ${selectedDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}`}
                    </h3>
                    {birthdaysOnSelectedDate.length > 0 ? (
                        <div className="birthday-container">
                            {birthdaysOnSelectedDate.map(person => (
                                <div key={person.id} className="birthday-card simple">
                                    <img src={`${process.env.REACT_APP_API_URL}/uploads/${person.profile_image}`} alt={person.nombre} className="profile-pic-cumple" />
                                    <h2>{person.nombre} {person.apellido}</h2>
                                    <p>{person.sector}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p>No hay cumpleaños en la fecha seleccionada.</p>
                    )}
                </div>
            )}
            
            <div className="upcoming-birthdays">
                <h3>Próximos Cumpleaños</h3>
                {upcomingBirthdays.length > 0 ? (
                    <ul className="upcoming-list">
                        {upcomingBirthdays.map((person, index) => (
                           <li key={`${person.id}-${index}`}>
                               <strong>{person.nombre} {person.apellido}</strong> - 
                               <span> {person.birthdayDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                           </li>
                        ))}
                    </ul>
                ) : (
                    <p>No hay cumpleaños en los próximos 7 días.</p>
                )}
            </div>
        </div>
    );
};

export default Cumpleanos;