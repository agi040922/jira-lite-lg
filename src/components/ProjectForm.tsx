'use client';

import React from 'react';
import { Upload, X, ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

const ProjectForm: React.FC = () => {
  const router = useRouter();

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 h-full overflow-y-auto">
        <div className="mb-8">
            <button 
                onClick={() => router.back()}
                className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors mb-4"
            >
                <ChevronLeft size={16} />
                Back to Projects
            </button>
            <h1 className="text-2xl font-bold text-slate-900">Create New Project</h1>
            <p className="text-slate-500 mt-1">Initialize a new project workspace for your team.</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
            {/* Project Logo */}
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Project Icon</label>
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-slate-100 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 hover:border-brand-500 hover:text-brand-500 transition-colors cursor-pointer relative">
                        <Upload size={20} />
                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" />
                    </div>
                    <div className="text-sm text-slate-500">
                        <p>Upload a square image</p>
                        <p className="text-xs text-slate-400">PNG, JPG up to 2MB</p>
                    </div>
                </div>
            </div>

            {/* Project Details */}
            <div className="grid grid-cols-1 gap-6">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Project Name</label>
                    <input 
                        type="text" 
                        placeholder="e.g. Q4 Marketing Campaign" 
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Key</label>
                    <input 
                        type="text" 
                        placeholder="e.g. MKT" 
                        className="w-32 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 uppercase"
                    />
                    <p className="text-xs text-slate-400 mt-1">Used for issue IDs (e.g. MKT-123)</p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                    <textarea 
                        placeholder="Describe the project goals..." 
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 min-h-[100px]"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Lead</label>
                    <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500">
                        <option>Select a lead...</option>
                        <option>김철수</option>
                        <option>이영희</option>
                        <option>박지민</option>
                    </select>
                </div>
            </div>

            <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
                <button 
                    onClick={() => router.back()}
                    className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                    Cancel
                </button>
                <button className="px-4 py-2 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 rounded-lg transition-colors shadow-sm">
                    Create Project
                </button>
            </div>
        </div>
    </div>
  );
};

export default ProjectForm;
