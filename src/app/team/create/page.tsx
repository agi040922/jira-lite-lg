'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTeam } from '@/components/providers/TeamContext';
import { Shield, Loader2, ArrowRight } from 'lucide-react';

export default function CreateTeamPage() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { createTeam } = useTeam();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setIsSubmitting(true);
      const newTeam = await createTeam(name, description);
      
      if (newTeam) {
        // Redirect to dashboard or home
        router.push('/');
      } else {
        alert('Failed to create team. Please try again.');
      }
    } catch (error) {
      console.error('Error creating team:', error);
      alert('An error occurred while creating the team.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg">
            <Shield size={28} />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900">
          Create your team
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Start by creating a team to organize your projects and collaborate with others.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-slate-200">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="teamName" className="block text-sm font-medium text-slate-700">
                Team Name
              </label>
              <div className="mt-1">
                <input
                  id="teamName"
                  name="teamName"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
                  placeholder="e.g. Engineering, Marketing, Design"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isSubmitting || !name.trim()}
                className="w-full flex justify-center items-center gap-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    Create Team
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
