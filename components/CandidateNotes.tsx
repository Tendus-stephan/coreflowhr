import React, { useState, useEffect } from 'react';
import { Note } from '../types';
import { api } from '../services/api';
import { FileText, Plus, Edit2, Trash2, X, Check } from 'lucide-react';
import { Button } from './ui/Button';
import { Avatar } from './ui/Avatar';

interface CandidateNotesProps {
    candidateId: string;
}

export const CandidateNotes: React.FC<CandidateNotesProps> = ({ candidateId }) => {
    const [notes, setNotes] = useState<Note[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [newNoteContent, setNewNoteContent] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState('');
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Load notes
    useEffect(() => {
        const loadNotes = async () => {
            try {
                setLoading(true);
                setError(null);
                const fetchedNotes = await api.candidates.getNotes(candidateId);
                setNotes(fetchedNotes);
            } catch (err: any) {
                console.error('Error loading notes:', err);
                setError(err.message || 'Failed to load notes');
            } finally {
                setLoading(false);
            }
        };

        if (candidateId) {
            loadNotes();
        }
    }, [candidateId]);

    const handleAddNote = async () => {
        if (!newNoteContent.trim()) return;

        try {
            const note = await api.candidates.addNote(candidateId, newNoteContent.trim());
            setNotes([note, ...notes]);
            setNewNoteContent('');
            setIsAdding(false);
        } catch (err: any) {
            console.error('Error adding note:', err);
            setError(err.message || 'Failed to add note');
        }
    };

    const handleStartEdit = (note: Note) => {
        setEditingId(note.id);
        setEditContent(note.content);
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditContent('');
    };

    const handleUpdateNote = async (noteId: string) => {
        if (!editContent.trim()) return;

        try {
            const updatedNote = await api.candidates.updateNote(noteId, editContent.trim());
            setNotes(notes.map(n => n.id === noteId ? updatedNote : n));
            setEditingId(null);
            setEditContent('');
        } catch (err: any) {
            console.error('Error updating note:', err);
            setError(err.message || 'Failed to update note');
        }
    };

    const handleDeleteNote = async (noteId: string) => {
        if (!confirm('Are you sure you want to delete this note?')) return;

        try {
            setDeletingId(noteId);
            await api.candidates.deleteNote(noteId);
            setNotes(notes.filter(n => n.id !== noteId));
        } catch (err: any) {
            console.error('Error deleting note:', err);
            setError(err.message || 'Failed to delete note');
        } finally {
            setDeletingId(null);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-sm text-gray-500">Loading notes...</div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {error && (
                <div className="bg-gray-100 border border-gray-200 rounded-lg p-3 text-sm text-gray-700">
                    {error}
                </div>
            )}

            {/* Add Note Button */}
            {!isAdding && (
                <Button
                    variant="outline"
                    icon={<Plus size={16} />}
                    onClick={() => setIsAdding(true)}
                    className="w-full"
                >
                    Add Note
                </Button>
            )}

            {/* Add Note Form */}
            {isAdding && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                    <textarea
                        value={newNoteContent}
                        onChange={(e) => setNewNoteContent(e.target.value)}
                        placeholder="Write a note about this candidate..."
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all resize-none"
                        rows={4}
                        autoFocus
                    />
                    <div className="flex gap-2 justify-end">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsAdding(false);
                                setNewNoteContent('');
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="black"
                            onClick={handleAddNote}
                            disabled={!newNoteContent.trim()}
                        >
                            Save Note
                        </Button>
                    </div>
                </div>
            )}

            {/* Notes List */}
            {notes.length === 0 && !isAdding && (
                <div className="text-center py-12">
                    <FileText size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-sm text-gray-500">No notes yet</p>
                    <p className="text-xs text-gray-400 mt-2">Add notes to track important information about this candidate</p>
                </div>
            )}

            <div className="space-y-3">
                {notes.map((note) => (
                    <div
                        key={note.id}
                        className="bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors"
                    >
                        {editingId === note.id ? (
                            // Edit Mode
                            <div className="space-y-3">
                                <textarea
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all resize-none"
                                    rows={4}
                                    autoFocus
                                />
                                <div className="flex gap-2 justify-end">
                                    <button
                                        onClick={handleCancelEdit}
                                        className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                                    >
                                        <X size={16} className="inline mr-1" />
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => handleUpdateNote(note.id)}
                                        disabled={!editContent.trim()}
                                        className="px-3 py-1.5 text-sm bg-black text-white rounded-lg hover:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Check size={16} className="inline mr-1" />
                                        Save
                                    </button>
                                </div>
                            </div>
                        ) : (
                            // View Mode
                            <>
                                <div className="flex items-start justify-between gap-3 mb-2">
                                    <div className="flex items-center gap-2">
                                        <Avatar 
                                            name={note.userName || 'User'} 
                                            src={note.userAvatarUrl} 
                                            className="w-6 h-6 text-[10px]" 
                                        />
                                        <div>
                                            <p className="text-xs font-bold text-gray-900">{note.userName || 'Unknown'}</p>
                                            <p className="text-[10px] text-gray-500">{formatDate(note.createdAt)}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => handleStartEdit(note)}
                                            className="p-1.5 text-gray-400 hover:text-gray-900 transition-colors rounded hover:bg-gray-100"
                                            title="Edit note"
                                        >
                                            <Edit2 size={14} />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteNote(note.id)}
                                            disabled={deletingId === note.id}
                                            className="p-1.5 text-gray-400 hover:text-gray-700 transition-colors rounded hover:bg-gray-100 disabled:opacity-50"
                                            title="Delete note"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{note.content}</p>
                                {note.updatedAt !== note.createdAt && (
                                    <p className="text-[10px] text-gray-400 mt-2">Edited {formatDate(note.updatedAt)}</p>
                                )}
                            </>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};






