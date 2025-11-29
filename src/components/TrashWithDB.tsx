'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Trash2, RefreshCw, AlertCircle, FileText, Box } from 'lucide-react';

interface DeletedItem {
  id: string;
  title: string; // name for project, title for issue
  type: 'project' | 'issue';
  deleted_at: string;
  original_data: any;
}

const TrashWithDB = () => {
  const [items, setItems] = useState<DeletedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchDeletedItems();
  }, []);

  const fetchDeletedItems = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch deleted projects
      const { data: projects } = await supabase
        .from('projects')
        .select('id, name, deleted_at')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });

      // Fetch deleted issues
      const { data: issues } = await supabase
        .from('issues')
        .select('id, title, deleted_at')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });

      const combinedItems: DeletedItem[] = [
        ...(projects || []).map(p => ({
          id: p.id,
          title: p.name,
          type: 'project' as const,
          deleted_at: p.deleted_at,
          original_data: p
        })),
        ...(issues || []).map(i => ({
          id: i.id,
          title: i.title,
          type: 'issue' as const,
          deleted_at: i.deleted_at,
          original_data: i
        }))
      ].sort((a, b) => new Date(b.deleted_at).getTime() - new Date(a.deleted_at).getTime());

      setItems(combinedItems);
    } catch (error) {
      console.error('Error fetching trash:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (item: DeletedItem) => {
    try {
      setRestoring(item.id);
      const table = item.type === 'project' ? 'projects' : 'issues';
      
      const { error } = await supabase
        .from(table)
        .update({ deleted_at: null })
        .eq('id', item.id);

      if (error) throw error;

      // Remove from list
      setItems(prev => prev.filter(i => i.id !== item.id));
    } catch (error) {
      console.error('Error restoring item:', error);
      alert('Failed to restore item');
    } finally {
      setRestoring(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="h-14 border-b border-slate-100 flex items-center justify-between px-6 bg-white sticky top-0 z-10">
        <div className="flex items-center gap-2 text-slate-800">
          <Trash2 size={20} className="text-slate-500" />
          <h1 className="text-lg font-semibold">Trash</h1>
          <span className="text-slate-400 text-sm font-normal ml-2">
            {items.length} items
          </span>
        </div>
        <button 
          onClick={fetchDeletedItems}
          className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
          title="Refresh"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <Trash2 size={48} className="mb-4 opacity-20" />
            <p className="text-sm">Trash is empty</p>
          </div>
        ) : (
          <div className="space-y-2 max-w-4xl mx-auto">
            {items.map((item) => (
              <div 
                key={`${item.type}-${item.id}`}
                className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-lg hover:border-slate-300 hover:shadow-sm transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${item.type === 'project' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                    {item.type === 'project' ? <Box size={20} /> : <FileText size={20} />}
                  </div>
                  <div>
                    <h3 className="font-medium text-slate-900">{item.title}</h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                      <span className="uppercase font-semibold tracking-wider">{item.type}</span>
                      <span>•</span>
                      <span>Deleted {new Date(item.deleted_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={() => handleRestore(item)}
                  disabled={restoring === item.id}
                  className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                >
                  {restoring === item.id ? 'Restoring...' : 'Restore'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TrashWithDB;
