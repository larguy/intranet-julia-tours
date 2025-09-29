import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom'; 
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import Editor from '../Editor';
import DOMPurify from 'dompurify';
import './InformacionPorSector.css';



const EditIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9"></path>
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
    </svg>
);

const DeleteIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
);


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


const InformacionPorSector = () => {
    const { sectorName } = useParams();
    const { user, token } = useAuth();
    

    const [allPosts, setAllPosts] = useState([]);
    const [paginatedPosts, setPaginatedPosts] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [newPostTitle, setNewPostTitle] = useState('');
    const [newPostContent, setNewPostContent] = useState('');
    const [attachments, setAttachments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    
    const itemsPerPage = 6;

    const fetchPosts = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await axios.get(`${process.env.REACT_APP_API_URL}/informacion/${sectorName}/all`, {
                headers: { 'x-access-token': token }
            });
            setAllPosts(response.data);
        } catch (err) {
            setError('No se pudo cargar la información del sector.');
        } finally {
            setIsLoading(false);
        }
    }, [sectorName, token]);

    useEffect(() => {
        if (token) {
            fetchPosts();
        }
    }, [token, fetchPosts]);

    useEffect(() => {
        const term = searchTerm.toLowerCase();
        const filtered = allPosts.filter(post => 
            (post.title.toLowerCase().includes(term)) ||
            (post.content.replace(/<[^>]*>/g, '').toLowerCase().includes(term))
        );
        
        setTotalPages(Math.ceil(filtered.length / itemsPerPage));
        
        const indexOfLastPost = currentPage * itemsPerPage;
        const indexOfFirstPost = indexOfLastPost - itemsPerPage;
        const currentPosts = filtered.slice(indexOfFirstPost, indexOfLastPost);
        setPaginatedPosts(currentPosts);
        
    }, [searchTerm, allPosts, currentPage]);

    const canPost = user?.role === 'SUPERUSER' || (user?.role === 'EDITOR' && user.sector === sectorName);

    const handleFileSelect = async (event) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;
        const file = files[0];
        const formData = new FormData();
        formData.append('upload', file);
        try {
            const response = await axios.post(`${process.env.REACT_APP_API_URL}/upload-file`, formData, {
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

    const handleCreatePost = async (e) => {
        e.preventDefault();
        const cleanContent = newPostContent.replace(/<p><\/p>/g, '').trim();
        if (!newPostTitle.trim() && !cleanContent && attachments.length === 0) {
            setError('El título, el contenido o los adjuntos no pueden estar vacíos.');
            return;
        }
        
        try {
            await axios.post(`${process.env.REACT_APP_API_URL}/informacion`, 
                { 
                    sector: sectorName, 
                    title: newPostTitle, 
                    content: newPostContent,
                    attachments: attachments 
                },
                { headers: { 'x-access-token': token } }
            );
            
            setNewPostTitle('');
            setNewPostContent('');
            setAttachments([]);

            if (currentPage !== 1) {
                setCurrentPage(1);
            } else {
                fetchPosts();
            }

        } catch (err) {
            setError(err.response?.data?.message || 'Error al crear la publicación.');
        }
    };

    const handleDeletePost = async (postId) => {
        if (window.confirm('¿Estás seguro?')) {
            try {
                await axios.delete(`${process.env.REACT_APP_API_URL}/informacion/post/${postId}`, {
                    headers: { 'x-access-token': token }
                });
                fetchPosts();
            } catch (err) {
                setError(err.response?.data?.message || 'Error al eliminar la publicación.');
            }
        }
    };

    if (isLoading) return <p>Cargando información del sector: {sectorName}...</p>;
    
    return (
        <div>
            <h1>Información del Sector: {sectorName}</h1>
            {error && <p className="error-message">{error}</p>}
            
            <div className="search-bar">
                <input
                    type="text"
                    placeholder="Buscar por título o contenido..."
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setCurrentPage(1);
                    }}
                />
            </div>

            <div className="posts-container">
                {paginatedPosts.map(post => (
                    <div key={post.id} className="post-card">
                        <div className="post-header">
                            <img src={`${process.env.REACT_APP_API_URL}/uploads/${post.author.profile_image}`} alt="Autor" className="post-author-pic" />
                            <div className="post-author-info">
                                <strong>{post.author.nombre} {post.author.apellido}</strong>
                                <small>{new Date(post.created_at).toLocaleString('es-ES')}</small>
                            </div>
                            <div className="post-actions">
                                {user && (user.role === 'SUPERUSER' || (user.role === 'EDITOR' && user.sector === post.sector)) && (
                                    <Link to={`/index/informacion/edit/${post.id}`} className="edit-button">
                                         <EditIcon />
                                    </Link>
                                )}
                                {user && (user.role === 'SUPERUSER' || user.id === post.author.id) && (
                                    <button onClick={() => handleDeletePost(post.id)} className="delete-button">
                                        <DeleteIcon />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="post-content ProseMirror">
                            <h2>{post.title}</h2>
                            <hr />
                            <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.content, { ADD_ATTR: ['class', 'style', 'target'] }) }} />
                            
                            {post.attachments && post.attachments.length > 0 && (
                                <div className="post-attachments-display">
                                    <h4>Archivos Adjuntos:</h4>
                                    <ul className="attachment-display-list"> {/* Usamos la clase correcta para los estilos */}
                                        {post.attachments.map(att => {

                                            const { icon, className } = getAttachmentIcon(att.original_filename);

                                            return (
                                                <li key={att.id} className={className}>
                                                    <a href={`${process.env.REACT_APP_API_URL}${att.url}`} target="_blank" rel="noopener noreferrer">
                                                        {icon} {/* Mantenemos solo el icono dinámico */}
                                                        {att.original_filename}
                                                    </a>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {totalPages > 1 && (
                <div className="pagination-controls">
                    <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}> ‹ Anterior </button>
                    <span>Página {currentPage} de {totalPages}</span>
                    <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages}> Siguiente › </button>
                </div>
            )}

            {canPost && (
                <form onSubmit={handleCreatePost} className="post-form">
                    <div className="form-group">
                        <label>Título</label> 
                        <input type="text" value={newPostTitle} onChange={(e) => setNewPostTitle(e.target.value)} required />
                    </div>
                    <Editor 
                        data={newPostContent} 
                        onChange={setNewPostContent}
                        placeholder="Escribe aquí..."
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
                    <button type="submit" className="btn-primary">Publicar</button>
                </form>
            )}
        </div>
    );
};

export default InformacionPorSector;