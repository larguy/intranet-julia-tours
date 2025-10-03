// src/api.js

import axios from 'axios';

// 1. Crear una instancia de Axios con la URL base de tu API
const apiClient = axios.create({
    baseURL: process.env.REACT_APP_API_URL
});

// 2. Función para establecer el token en la instancia
export const setAuthToken = token => {
    if (token) {
        apiClient.defaults.headers.common['x-access-token'] = token;
    } else {
        delete apiClient.defaults.headers.common['x-access-token'];
    }
};

export default apiClient;