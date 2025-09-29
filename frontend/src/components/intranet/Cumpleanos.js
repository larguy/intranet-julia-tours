import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
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
    const [isCalendarVisible, setIsCalendarVisible] = useState(false);
    const [allUsers, setAllUsers] = useState([]);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [birthdaysOnSelectedDate, setBirthdaysOnSelectedDate] = useState([]);
    const [upcomingBirthdays, setUpcomingBirthdays] = useState([]);
    const [gifs, setGifs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const isTodaySelected = areDatesSameDayAndMonth(selectedDate, new Date());
    const areBirthdaysToday = isTodaySelected && birthdaysOnSelectedDate.length > 0;

    useEffect(() => {
        const fetchAllUsers = async () => {
            const token = localStorage.getItem('token');
            try {
                const response = await axios.get(`${process.env.REACT_APP_API_URL}/internos`, {
                    headers: { 'x-access-token': token }
                });
                setAllUsers(response.data);
            } catch (error) {
                console.error("Error al cargar los usuarios:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchAllUsers();
    }, []);

    const fetchGifs = useCallback(async () => {
        try {
            const giphyApiKey = process.env.REACT_APP_GIPHY_API_KEY;
            const response = await axios.get(`https://api.giphy.com/v1/gifs/search`, {
                params: { api_key: giphyApiKey, q: 'happy birthday funny', limit: 25, rating: 'g' }
            });
            const gifUrls = response.data.data.map(gif => gif.images.fixed_height.url);
            setGifs(gifUrls);
        } catch (error) {
            console.error("Error al cargar GIFs de GIPHY:", error);
        }
    }, []);

    useEffect(() => {
        if (allUsers.length === 0) return;

        const selectedDateBirthdays = allUsers.filter(user => 
            areDatesSameDayAndMonth(parseDateWithoutTimezone(user.fecha_nacimiento), selectedDate)
        );
        setBirthdaysOnSelectedDate(selectedDateBirthdays);

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
        setUpcomingBirthdays(upcoming);

        if (selectedDateBirthdays.length > 0 && gifs.length === 0) {
            fetchGifs();
        }
    }, [selectedDate, allUsers, gifs.length, fetchGifs]);

    const getRandomGif = () => {
        if (gifs.length === 0) return '';
        return gifs[Math.floor(Math.random() * gifs.length)];
    };
    
    if (isLoading) return <p>Cargando información de cumpleaños...</p>;

    return (
        <div className="cumpleanos-page-container">
            <h1>
                {areBirthdaysToday ? "¡Feliz Cumpleaños!" : "Hoy no hay Cumpleaños"}
            </h1>
            
            <div className="daily-results-section">
                <h3>
                    {isTodaySelected ? "" : `Cumpleaños del ${selectedDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}`}
                </h3>
                {birthdaysOnSelectedDate.length > 0 ? (
                    <div className="birthday-container">
                        {birthdaysOnSelectedDate.map(person => (
                            <div key={person.id} className="birthday-card">
                                <h2>{person.nombre} {person.apellido}</h2>
                                <img src={getRandomGif()} alt="Happy Birthday GIF" className="birthday-gif" />
                            </div>
                        ))}
                    </div>
                ) : (
                    !isTodaySelected && <p>No hay cumpleaños en la fecha seleccionada.</p>
                )}
            </div>

            <div className="calendar-search-container">
                <button className="toggle-calendar-btn" onClick={() => setIsCalendarVisible(!isCalendarVisible)}>
                    {isCalendarVisible ? 'Ocultar Calendario' : 'Buscar por fecha'}
                </button>
                {isCalendarVisible && (
                    <div className="calendar-wrapper">
                        <DatePicker selected={selectedDate} onChange={(date) => setSelectedDate(date)} inline />
                    </div>
                )}
            </div>

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