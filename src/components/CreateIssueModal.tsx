'use client';

import React, { useState, useEffect } from 'react';
import { X, Sparkles, AlertTriangle, ArrowRight, Tag } from 'lucide-react';
import { issues } from '../mockData';

interface CreateIssueModalProps {
    onClose: () => void;
}

const CreateIssueModal: React.FC<CreateIssueModalProps> = ({ onClose }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [duplicates, setDuplicates] = useState<any[]>([]);
    const [aiLabels, setAiLabels] = useState<string[]>([]);
    const [showAiSuggestion, setShowAiSuggestion] = useState(false);

    // AI Mock Logic: Duplicate Detection
    useEffect(() => {
        if (title.length > 3) {
            // Find issues with similar words (simple mock logic)
            const words = title.split(' ');
            const found = issues.filter(i => 
                words.some(w => w.length > 2 && i.title.includes(w))
            ).slice(0, 2);
            setDuplicates(found);
        } else {
            setDuplicates([]);
        }
    }, [title]);

    // AI Mock Logic: Label Suggestion
    useEffect(() => {
        if (description.length > 10) {
            setShowAiSuggestion(true);
            // Simple keyword matching for mock
            const suggestions = [];
            if (description.includes('UI') || description.includes('화면')) suggestions.push('Design');
            if (description.includes('API') || description.includes('서버')) suggestions.push('Backend');
            if (description.includes('오류') || description.includes('버그')) suggestions.push('Bug');
            
            if (suggestions.length === 0) suggestions.push('General');
            setAiLabels(suggestions);
        } else {
            setShowAiSuggestion(false);
        }
    }, [description]);

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <h2 className="text-lg font-semibold text-slate-900">Create new issue</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                    
                    {/* Title Input */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                        <input 
                            type="text" 
                            className="w-full text-lg font-medium border-b border-slate-200 pb-2 focus:outline-none focus:border-brand-500 placeholder:text-slate-300 transition-colors"
                            placeholder="Issue title..."
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            autoFocus
                        />
                    </div>

                    {/* AI Duplicate Warning */}
                    {duplicates.length > 0 && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 animate-in slide-in-from-top-2 fade-in">
                            <div className="flex items-center gap-2 text-yellow-700 font-semibold text-sm mb-2">
                                <AlertTriangle size={16} />
                                <span>Similar issues detected</span>
                            </div>
                            <div className="space-y-2">
                                {duplicates.map(d => (
                                    <div key={d.id} className="flex items-center justify-between bg-white/50 p-2 rounded border border-yellow-100 text-sm">
                                        <div className="flex items-center gap-2">
                                            <span className="text-slate-400 font-mono text-xs">{d.id}</span>
                                            <span className="text-slate-700">{d.title}</span>
                                        </div>
                                        <a href="#" className="text-brand-600 hover:underline text-xs flex items-center gap-1">
                                            View <ArrowRight size={10} />
                                        </a>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-2 text-xs text-yellow-600 text-right">
                                Please check if your issue is already reported.
                            </div>
                        </div>
                    )}

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
                        <textarea 
                            className="w-full border border-slate-200 rounded-lg p-3 h-32 focus:ring-2 focus:ring-brand-100 focus:border-brand-500 outline-none resize-none text-sm leading-relaxed"
                            placeholder="Describe the issue..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>

                    {/* AI Label Suggestion */}
                    {showAiSuggestion && (
                        <div className="flex items-start gap-3 bg-brand-50/50 p-3 rounded-lg border border-brand-100/50">
                            <div className="p-1.5 bg-brand-100 rounded-md text-brand-600 mt-0.5">
                                <Sparkles size={14} />
                            </div>
                            <div>
                                <h4 className="text-sm font-medium text-brand-900">AI Suggestions</h4>
                                <p className="text-xs text-brand-600 mb-2">Based on your description, we recommend these labels:</p>
                                <div className="flex flex-wrap gap-2">
                                    {aiLabels.map(label => (
                                        <button key={label} className="flex items-center gap-1 px-2 py-1 bg-white border border-brand-200 rounded shadow-sm text-xs font-medium text-brand-700 hover:bg-brand-50 transition-colors">
                                            <Tag size={10} />
                                            {label}
                                            <span className="text-brand-300 ml-1">|</span>
                                            <span className="text-brand-500 hover:font-bold">+</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Properties Row */}
                    <div className="grid grid-cols-2 gap-4 pt-2">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Project</label>
                            <select className="w-full bg-slate-50 border border-slate-200 rounded-md py-1.5 px-2 text-sm text-slate-700 focus:outline-none focus:border-slate-300">
                                <option>Lightsoft Core</option>
                                <option>Mobile App</option>
                            </select>
                        </div>
                         <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Priority</label>
                            <select className="w-full bg-slate-50 border border-slate-200 rounded-md py-1.5 px-2 text-sm text-slate-700 focus:outline-none focus:border-slate-300">
                                <option>None</option>
                                <option>Low</option>
                                <option>Medium</option>
                                <option>High</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-200 rounded-b-xl">
                    <div className="flex items-center gap-3">
                         <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-brand-500 focus:ring-brand-500" />
                            <span className="text-sm text-slate-600">Create another</span>
                         </label>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">
                            Cancel
                        </button>
                        <button className="px-4 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-all hover:scale-[1.02]">
                            Create Issue
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateIssueModal;

