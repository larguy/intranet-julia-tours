import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../../api';
import { useAuth } from '../../context/AuthContext';
import Editor from '../Editor';
import DOMPurify from 'dompurify';
import './Novedades.css';

const getAttachmentIcon = (filename) => {
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
        vacaciones: '<table style="height: 139px;" width="389"><tbody><tr><td style="width: 379px;"><div><div style="text-align: center;"><p><strong>Leandro Ramos</strong> ingresa en vacaciones</p><p><strong>Desde:</strong> 03/03/2026 - <strong>Hasta:</strong> 18/03/2026</p>&nbsp; &nbsp;</div></div></td></tr></tbody></table>',
        licencia: '<p>[Nombre]</p><p><strong>Cantidad de días:</strong> [Completar]</p><p><strong>Desde:</strong> [dd/mm/aaaa] - <strong>Hasta:</strong> [dd/mm/aaaa]</p>',
        ausente: '<p>[Nombre]</p><p><strong>Fecha:</strong> [dd/mm/aaaa]</p>',
        permiso: '<p>[Nombre]</p><p><strong>Detalle:</strong> [Ingresa después / Se retira antes]</p>',
        importante: '<p>[Escribir aquí el comunicado...]</p>'
    };
    
    const fetchNovedades = useCallback(async (page = 1) => {
        setIsLoading(true);
        try {
            const response = await apiClient.get(`${process.env.REACT_APP_API_URL}/novedades?page=${page}`, {
                headers: { 'x-access-token': token }
            });
            setNovedades(response.data.novedades);
            setCurrentPage(response.data.current_page);
            setTotalPages(response.data.total_pages);
        } catch (err) {
            setError('No se pudieron cargar las novedades.');
        } finally {
            setIsLoading(false);
        }
    }, [token]);

    useEffect(() => {
        if (token) fetchNovedades(currentPage);
    }, [token, currentPage, fetchNovedades]);

    const canPost = user?.role === 'SUPERUSER' || (user?.role === 'EDITOR' && user.sector === 'Administracion');

    const handleFileSelect = async (event) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;
        const file = files[0];
        const formData = new FormData();
        formData.append('upload', file);
        try {
            const response = await apiClient.post(`${process.env.REACT_APP_API_URL}/upload-file`, formData, {
                headers: { 'x-access-token': token }
            });
            setAttachments(prev => [...prev, { name: file.name, url: response.data.url }]);
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
        if (!asunto.trim() && !cleanContent && attachments.length === 0) {
            setError('El asunto, contenido o adjuntos no pueden estar vacíos.');
            return;
        }

        try {
            await apiClient.post(`${process.env.REACT_APP_API_URL}/novedades`, 
                { 
                    asunto: asunto, 
                    content: content 
                }, 
                { headers: { 'x-access-token': token } }
            );
        
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
                await apiClient.delete(`${process.env.REACT_APP_API_URL}/novedades/${novedadId}`, { headers: { 'x-access-token': token } });
                fetchNovedades(currentPage);
            } catch (err) {
                setError(err.response?.data?.message || 'Error al eliminar la novedad.');
            }
        }
    };

    if (isLoading) return <p>Cargando novedades...</p>;

    return (
        <div>
            <h1>Novedades de la Empresa</h1>
            {error && <p className="error-message">{error}</p>}

            

            <div className="posts-container">
                {novedades.map(novedad => (
                    <div key={novedad.id} className="post-card novelty-card">
                        {(user?.role === 'SUPERUSER' || user?.id === novedad.author.id) && (
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
                                __html: DOMPurify.sanitize(novedad.content, {
                                    ADD_TAGS: ['iframe'],
                                    ADD_ATTR: ['class', 'style', 'target'] 
                                }) 
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