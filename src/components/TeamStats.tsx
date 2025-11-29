'use client';

import React from 'react';
import { 
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    BarChart, Bar, PieChart, Pie, Cell 
} from 'recharts';
import { statsData } from '../mockData';
import { ArrowUpRight, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

const TeamStats: React.FC = () => {
    return (
        <div className="space-y-6">
            {/* Time Range Selector */}
            <div className="flex justify-end">
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button className="px-3 py-1 text-xs font-medium bg-white text-slate-900 rounded shadow-sm">7 Days</button>
                    <button className="px-3 py-1 text-xs font-medium text-slate-500 hover:text-slate-900">30 Days</button>
                    <button className="px-3 py-1 text-xs font-medium text-slate-500 hover:text-slate-900">90 Days</button>
                </div>
            </div>
                
                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-slate-500 text-xs font-semibold uppercase">Velocity</span>
                            <span className="text-green-600 bg-green-50 px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center">
                                <ArrowUpRight size={10} className="mr-0.5" /> 12%
                            </span>
                        </div>
                        <div className="text-2xl font-bold text-slate-900">24</div>
                        <div className="text-xs text-slate-400 mt-1">Issues completed this week</div>
                    </div>
                    
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-slate-500 text-xs font-semibold uppercase">Created</span>
                            <span className="text-slate-400 px-1.5 py-0.5 rounded text-[10px] font-bold">
                                -
                            </span>
                        </div>
                        <div className="text-2xl font-bold text-slate-900">19</div>
                        <div className="text-xs text-slate-400 mt-1">New issues this week</div>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-slate-500 text-xs font-semibold uppercase">Completion Rate</span>
                            <span className="text-green-600 bg-green-50 px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center">
                                <ArrowUpRight size={10} className="mr-0.5" /> 5%
                            </span>
                        </div>
                        <div className="text-2xl font-bold text-slate-900">82%</div>
                        <div className="text-xs text-slate-400 mt-1">Issues closed vs opened</div>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-slate-500 text-xs font-semibold uppercase">SLA Breach</span>
                            <span className="text-red-600 bg-red-50 px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center">
                                <AlertCircle size={10} className="mr-0.5" /> 2
                            </span>
                        </div>
                        <div className="text-2xl font-bold text-slate-900">3</div>
                        <div className="text-xs text-slate-400 mt-1">Issues missed due date</div>
                    </div>
                </div>

                {/* Main Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Line Chart: Velocity Trend */}
                    <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <h3 className="font-semibold text-slate-800 mb-6 flex items-center gap-2">
                            <Clock size={18} className="text-slate-400" />
                            Issue Velocity Trend
                        </h3>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={statsData.weeklyTrend}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis 
                                        dataKey="name" 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{fill: '#94a3b8', fontSize: 12}} 
                                        dy={10}
                                    />
                                    <YAxis 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{fill: '#94a3b8', fontSize: 12}} 
                                    />
                                    <Tooltip 
                                        contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} 
                                    />
                                    <Line 
                                        type="monotone" 
                                        dataKey="created" 
                                        stroke="#94a3b8" 
                                        strokeWidth={2} 
                                        dot={{r: 4, fill: '#94a3b8', strokeWidth: 0}}
                                        activeDot={{r: 6}}
                                        name="Created"
                                    />
                                    <Line 
                                        type="monotone" 
                                        dataKey="completed" 
                                        stroke="#0ea5e9" 
                                        strokeWidth={2} 
                                        dot={{r: 4, fill: '#0ea5e9', strokeWidth: 0}}
                                        activeDot={{r: 6}}
                                        name="Completed"
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Pie Chart: Project Status */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <h3 className="font-semibold text-slate-800 mb-6 flex items-center gap-2">
                            <CheckCircle2 size={18} className="text-slate-400" />
                            Project Health
                        </h3>
                        <div className="h-[200px] w-full relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={statsData.projectStatus}
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {statsData.projectStatus.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-3xl font-bold text-slate-800">5</span>
                                <span className="text-xs text-slate-400 font-medium">Projects</span>
                            </div>
                        </div>
                        <div className="mt-6 space-y-3">
                            {statsData.projectStatus.map((item, index) => (
                                <div key={index} className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full" style={{backgroundColor: item.color}}></div>
                                        <span className="text-slate-600">{item.name}</span>
                                    </div>
                                    <span className="font-medium text-slate-900">{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Bottom Row: Workload */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-semibold text-slate-800 mb-6">Member Workload & Performance</h3>
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={statsData.memberWorkload} barSize={40}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis 
                                    dataKey="name" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{fill: '#64748b', fontSize: 12}}
                                    dy={10}
                                />
                                <YAxis 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{fill: '#64748b', fontSize: 12}}
                                />
                                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                                <Bar dataKey="issues" name="Assigned" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="completed" name="Completed" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
        </div>
    );
};

export default TeamStats;

