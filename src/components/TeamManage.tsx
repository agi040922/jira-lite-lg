'use client';

import React from 'react';
import { Mail, Shield, Trash2, MoreVertical, Plus } from 'lucide-react';
import { teamMembers } from '../mockData';

const TeamManage: React.FC = () => {
    return (
        <div className="p-6 md:p-8 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">팀 멤버 관리</h2>
                    <p className="text-slate-500 mt-1">프로젝트에 참여하는 멤버들의 권한을 관리하세요.</p>
                </div>
                <button className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors shadow-sm text-sm font-medium">
                    <Plus size={16} />
                    <span>멤버 초대하기</span>
                </button>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">이름 / 이메일</th>
                            <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">역할</th>
                            <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">상태</th>
                            <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">관리</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {teamMembers.map((member) => (
                            <tr key={member.id} className="hover:bg-slate-50 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <img src={member.avatar} alt={member.name} className="w-10 h-10 rounded-full border border-slate-200" />
                                        <div>
                                            <div className="font-medium text-slate-900">{member.name}</div>
                                            <div className="text-sm text-slate-500">{member.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                                        member.role === 'OWNER' 
                                        ? 'bg-purple-50 text-purple-700 border-purple-100' 
                                        : member.role === 'ADMIN' 
                                            ? 'bg-blue-50 text-blue-700 border-blue-100'
                                            : 'bg-slate-100 text-slate-600 border-slate-200'
                                    }`}>
                                        <Shield size={12} />
                                        {member.role}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="flex items-center gap-1.5 text-sm text-green-600">
                                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                        Active
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100">
                                        <Trash2 size={16} />
                                    </button>
                                    <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors ml-1">
                                        <MoreVertical size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Invite Box Visual */}
            <div className="mt-8 bg-brand-50 rounded-xl p-6 border border-brand-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-brand-100 rounded-full flex items-center justify-center text-brand-600">
                        <Mail size={24} />
                    </div>
                    <div>
                        <h4 className="font-bold text-brand-900">동료와 함께 일하세요!</h4>
                        <p className="text-sm text-brand-700">팀원들을 초대하고 Jira Lite의 모든 기능을 함께 활용해보세요.</p>
                    </div>
                </div>
                <button className="text-brand-600 font-semibold text-sm hover:underline">
                    초대 링크 복사하기
                </button>
            </div>
        </div>
    );
};

export default TeamManage;

