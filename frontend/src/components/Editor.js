import React, { useEffect } from 'react';
import { useQuill } from 'react-quilljs';
import 'quill/dist/quill.snow.css';

const toolbarOptions = [
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
    [{ 'color': [] }, { 'background': [] }],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    [{ 'indent': '-1'}, { 'indent': '+1' }],
    [{ 'align': [] }],
    ['link', 'image'],
    ['clean']
];

const Editor = ({ data, onChange, placeholder }) => {
    const { quill, quillRef } = useQuill({
        modules: { toolbar: toolbarOptions },
        placeholder: placeholder || 'Escribe aquí...',
        theme: 'snow'
    });

    useEffect(() => {
        if (quill && data && quill.root.innerHTML !== data) {
            quill.clipboard.dangerouslyPasteHTML(data);
        }
    }, [quill, data]); 

    useEffect(() => {
        if (quill) {
            const handleChange = (delta, oldDelta, source) => {
                if (source === 'user') {
                    const content = quill.root.innerHTML;
                    if (onChange) {
                        onChange(content);
                    }
                }
            };
            
            quill.on('text-change', handleChange);

            return () => {
                quill.off('text-change', handleChange);
            };
        }
    }, [quill, onChange]);

    return (
        <div style={{ minHeight: '50px' }}>
            
            <div ref={quillRef} />
        </div>
    );
};

export default Editor;