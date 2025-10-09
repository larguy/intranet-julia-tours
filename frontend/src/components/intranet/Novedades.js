// src/components/intranet/Novedades.js

import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../../api';
import { useAuth } from '../../context/AuthContext';
import Editor from '../Editor';
import DOMPurify from 'dompurify';
import './Novedades.css';
import './PostStyles.css';

const getAttachmentIcon = (filename) => {
    // ... (tu función getAttachmentIcon completa aquí, sin cambios)
    const extension = filename.split('.').pop().toLowerCase();
    let iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>';
    let className = 'file-generic';
    if (['pdf'].includes(extension)) {
        iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2v4a2 2 0 0 0 2 2h4"></path><path d="M9 15a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3.5"></path><path d="M9 12h3"></path><path d="M14.5 22l-1.5-1.5"></path><path d="M20 16h-4.5a2 2 0 0 0 0 4h4.5v-4Z"></path></svg>';
        className = 'file-pdf';
    } else if (['doc', 'docx'].includes(extension)) {
        iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline><path d="M12 18v-6"></path><path d="m9 15 3-3 3 3"></path></svg>';
        className = 'file-word';
    } else if (['xls', 'xlsx'].includes(extension)) {
        iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline><path d="M12 18v-6"></path><path d="m15 15-3-3-3 3"></path></svg>';
        className = 'file-excel';
    } else if (['txt'].includes(extension)) {
        iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>';
        className = 'file-txt';
    }
    return {
        icon: <span dangerouslySetInnerHTML={{ __html: iconSvg }} />,
        className: className
    };
};

const Novedades = () => {
    const { user, token } = useAuth();
    
    const [novedades, setNovedades] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [asunto, setAsunto] = useState('');
    const [content, setContent] = useState('');
    const [selectedTemplate, setSelectedTemplate] = useState('');
    const [attachments, setAttachments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const templates = {
        vacaciones: '<strong>Personal en Vacaciones:</strong><p><strong>Usuario:</strong> [Completar nombre]</p><p><strong>Cantidad de días:</strong> [Completar]</p><p><strong>Desde:</strong> [dd/mm/aaaa] - <strong>Hasta:</strong> [dd/mm/aaaa]</p>',
        licencia: '<strong>Personal en Licencia:</strong><p><strong>Usuario:</strong> [Completar nombre]</p><p><strong>Cantidad de días:</strong> [Completar]</p><p><strong>Desde:</strong> [dd/mm/aaaa] - <strong>Hasta:</strong> [dd/mm/aaaa]</p>',
        ausente: '<strong>Personal Ausente:</strong><p><strong>Usuario:</strong> [Completar nombre]</p><p><strong>Fecha:</strong> [dd/mm/aaaa]</p>',
        permiso: '<strong>Personal con Permiso:</strong><p><strong>Usuario:</strong> [Completar nombre]</p><p><strong>Detalle:</strong> [Ingresa después / Se retira antes]</p>',
        importante: '<h2><strong>Información Importante</strong></h2><p>[Escribir aquí el comunicado...]</p>'
    };
    
    const fetchNovedades = useCallback(async (page = 1) => {
        setIsLoading(true);
        try {
            const response = await apiClient.get('/novedades', {
                params: { page },
            });
            setNovedades(response.data.novedades);
            setCurrentPage(response.data.current_page);
            setTotalPages(response.data.total_pages);
        } catch (err) {
            setError('No se pudieron cargar las novedades.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (token) {
            fetchNovedades(currentPage);
        }
    }, [token, currentPage, fetchNovedades]);

    const canPost = user?.role === 'SUPERUSER' || (user?.role === 'EDITOR' && user.sector === 'Administracion');

    const handleFileSelect = async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('upload', file);
        try {
            const response = await apiClient.post('/upload-file', formData);
            setAttachments(prev => [...prev, response.data]);
        } catch (err) {
            setError('Error al subir el archivo adjunto.');
        }
    };

    const removeAttachment = (urlToRemove) => {
        setAttachments(attachments.filter(att => att.url !== urlToRemove));
    };
        
    const handleTemplateChange = (e) => {
        const templateKey = e.target.value;
        setSelectedTemplate(templateKey);
        if (templateKey) {
            const selectedIndex = e.target.selectedIndex;
            const selectedText = e.target.options[selectedIndex].text;
            setAsunto(selectedText);
            setContent(templates[templateKey]);
        } else {
            setAsunto('');
            setContent('');
        }
    };

    const handleCreateNovedad = async (e) => {
        e.preventDefault();
        setError('');
        const cleanContent = content.replace(/<p><br><\/p>/g, '').trim();

        let finalContent = content;
        if (attachments.length > 0) {
            const attachmentsHtml = '<h4>Archivos Adjuntos:</h4><ul class="attachment-display-list">' + 
                attachments.map(att => 
                    `<li><a href="${process.env.REACT_APP_API_URL}${att.url}" target="_blank" rel="noopener noreferrer">${att.name}</a></li>`
                ).join('') + 
                '</ul>';
            finalContent += attachmentsHtml;
        }
        
        if (!asunto.trim() && !cleanContent.trim() && attachments.length === 0) {
            setError('El asunto o el contenido no pueden estar vacíos.');
            return;
        }

        try {
            await apiClient.post('/novedades', { asunto, content: finalContent });
        
            setAsunto('');
            setContent('');
            setAttachments([]);
            setSelectedTemplate('');
            fetchNovedades(1);
        } catch (err) {
            setError(err.response?.data?.message || 'Error al crear la novedad.');
        }
    };

    const handleDeleteNovedad = async (novedadId) => {
        if (window.confirm('¿Estás seguro?')) {
            try {
                await apiClient.delete(`/novedades/${novedadId}`);
                fetchNovedades(currentPage);
            } catch (err) {
                setError(err.response?.data?.message || 'Error al eliminar la novedad.');
            }
        }
    };

    if (isLoading && novedades.length === 0) return <p>Cargando novedades...</p>;

    return (
        <div>
            <h1>Novedades de la Empresa</h1>
            {error && <p className="error-message">{error}</p>}

            

            <div className="posts-container">
                {novedades.map(novedad => (
                    <div key={novedad.id} className="post-card novelty-card">
                        {(user?.role === 'SUPERUSER' || (user?.id === novedad.author?.id)) && (
                            <button onClick={() => handleDeleteNovedad(novedad.id)} className="delete-post-btn">&times;</button>
                        )}
                        <div className="novelty-header">
                            <h3 className="novelty-asunto">{novedad.asunto}</h3>
                            <span className="novelty-date">
                                {new Date(novedad.created_at).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </span>
                        </div>
                        <div 
                            className="post-content ck-content"
                            dangerouslySetInnerHTML={{ 
                                __html: DOMPurify.sanitize(novedad.content, { ADD_ATTR: ['class', 'style', 'target'], ADD_TAGS: ['iframe'] }) 
                            }}
                        />
                    </div>
                ))}
            </div>

            {totalPages > 1 && (
                <div className="pagination-controls">
                    <button onClick={() => fetchNovedades(currentPage - 1)} disabled={currentPage === 1}> ‹ Anterior </button>
                    <span>Página {currentPage} de {totalPages}</span>
                    <button onClick={() => fetchNovedades(currentPage + 1)} disabled={currentPage === totalPages}> Siguiente › </button>
                </div>
            )}

            {canPost && (
                <form onSubmit={handleCreateNovedad} className="post-form">
                    <div className="form-group">
                        <label>Asunto</label>
                        <input type="text" value={asunto} onChange={(e) => setAsunto(e.target.value)} required />
                    </div>
                    <div className="form-group">
                        <label>Plantillas Rápidas:</label>
                        <select value={selectedTemplate} onChange={handleTemplateChange} className="template-select">
                            <option value="">Seleccionar una plantilla...</option>
                            <option value="vacaciones">Personal en Vacaciones</option>
                            <option value="licencia">Personal en Licencia</option>
                            <option value="ausente">Personal Ausente</option>
                            <option value="permiso">Personal con Permiso</option>
                            <option value="importante">Información Importante</option>
                        </select>
                    </div>
                    <Editor 
                        data={content}
                        onChange={setContent}
                        placeholder="Escribe aquí o elige una plantilla..."
                    />          
                    <div className="attachments-section">
                        <label className="attachment-label">Adjuntar Documentos</label>
                        <input type="file" onChange={handleFileSelect} className="attachment-input" key={attachments.length} />
                        {attachments.length > 0 && (
                            <div className="attachment-list">
                                {attachments.map((att, index) => {
                                    const { icon, className } = getAttachmentIcon(att.name);
                                    return (
                                        <div key={index} className={`attachment-item ${className}`}>
                                            {icon}
                                            <span>{att.name}</span>
                                            <button type="button" onClick={() => removeAttachment(att.url)}>&times;</button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                    <button type="submit" className="btn-primary">Publicar Novedad</button>
                </form>
            )}
        </div>
    );
}; 

export default Novedades;