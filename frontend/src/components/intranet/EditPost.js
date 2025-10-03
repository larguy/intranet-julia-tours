
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../../api';
import { useAuth } from '../../context/AuthContext';
import Editor from '../Editor';
import './InformacionPorSector.css'; 



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
    }
    return {
        icon: <span dangerouslySetInnerHTML={{ __html: iconSvg }} />,
        className: className
    };
};

const EditPost = () => {
    const { postId } = useParams();
    const navigate = useNavigate();
    const { token } = useAuth();

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [attachments, setAttachments] = useState([]); 
    const [sector, setSector] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    
    // --- LÓGICA PARA CARGAR DATOS ---
    useEffect(() => {
        const fetchPost = async () => {
            if (token) {
                try {
                    const response = await apiClient.get(`${process.env.REACT_APP_API_URL}/informacion/post/${postId}`, {
                        headers: { 'x-access-token': token }
                    });
                    const post = response.data;
                    setTitle(post.title);
                    setContent(post.content);
                    setAttachments(post.attachments.map(att => ({
                        name: att.original_filename,
                        url: att.url 
                    })));
                    setSector(post.sector);
                } catch (err) {
                    setError('No se pudo cargar la publicación para editar o no tienes permisos.');
                } finally {
                    setIsLoading(false);
                }
            }
        };
        fetchPost();
    }, [postId, token]);

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
            setAttachments(prev => [...prev, response.data]);
        } catch (err) {
            setError('Error al subir el archivo adjunto.');
        }
    };

    const removeAttachment = (urlToRemove) => {
        setAttachments(attachments.filter(att => att.url !== urlToRemove));
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            await apiClient.put(
                `${process.env.REACT_APP_API_URL}/informacion/post/${postId}`,
                {
                    title: title,
                    content: content, 
                    attachments: attachments 
                },
                { headers: { 'x-access-token': token } }
            );
            navigate(`/index/informacion/${sector}`);
        } catch (err) {
            setError(err.response?.data?.message || 'Error al actualizar la publicación.');
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) return <div>Cargando editor...</div>;
    if (error) return <div className="error-message">{error}</div>;

    return (
        <div className="editor-container" style={{ maxWidth: '900px', margin: '20px auto' }}>
            <h2>Editando Publicación</h2>
            <form onSubmit={handleUpdate} className="post-form">
                <div className="form-group">
                    <label>Título:</label>
                    <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required />
                </div>
                <div className="form-group">
                    <label>Contenido:</label>
                    <Editor data={content} onChange={setContent} />
                </div>
                
                {/* --- SECCIÓN DE ADJUNTOS --- */}
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

                <button type="submit" className="btn-primary" disabled={isLoading}>
                    {isLoading ? 'Guardando...' : 'Guardar Cambios'}
                </button>
            </form>
        </div>
    );
};

export default EditPost;