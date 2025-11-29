'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Sparkles, TrendingUp, Users, Activity, Zap, CheckCircle2 } from 'lucide-react';

interface AIStats {
  totalRequests: number;
  totalUsers: number;
  topFeatures: { name: string; count: number }[];
  userStats: { userName: string; count: number; userId: string }[];
  recentActivity: { feature: string; count: number; date: string }[];
  cacheStats: { hitCount: number; totalCached: number; hitRate: number };
  rateLimitWarnings: { userId: string; userName: string; count: number }[];
}

const AIStatsWithDB: React.FC = () => {
  const [stats, setStats] = useState<AIStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d'>('24h');

  const fetchAIStats = async () => {
    try {
      setLoading(true);
      const supabase = createClient();

      // 시간 범위 계산
      const now = new Date();
      const timeAgo = new Date();
      if (timeRange === '1h') {
        timeAgo.setHours(now.getHours() - 1);
      } else if (timeRange === '24h') {
        timeAgo.setHours(now.getHours() - 24);
      } else {
        timeAgo.setDate(now.getDate() - 7);
      }

      // 1. Rate Limits 데이터 조회
      const { data: rateLimits, error: rateLimitError } = await supabase
        .from('ai_rate_limits')
        .select(`
          user_id,
          feature_type,
          request_count,
          window_start,
          user:user_id (
            name
          )
        `)
        .gte('window_start', timeAgo.toISOString());

      if (rateLimitError) throw rateLimitError;

      // 2. Cache 데이터 조회
      const { data: cacheData, error: cacheError } = await supabase
        .from('ai_cache')
        .select('feature_type, hit_count, created_at')
        .gte('created_at', timeAgo.toISOString());

      if (cacheError) throw cacheError;

      // 통계 계산
      const totalRequests = rateLimits?.reduce((sum, r) => sum + r.request_count, 0) || 0;
      const uniqueUsers = new Set(rateLimits?.map(r => r.user_id) || []).size;

      // 기능별 사용량
      const featureMap = new Map<string, number>();
      rateLimits?.forEach(r => {
        const current = featureMap.get(r.feature_type) || 0;
        featureMap.set(r.feature_type, current + r.request_count);
      });

      const topFeatures = Array.from(featureMap.entries())
        .map(([name, count]) => ({
          name: getFeatureName(name),
          count
        }))
        .sort((a, b) => b.count - a.count);

      // 사용자별 사용량
      const userMap = new Map<string, { count: number; userName: string }>();
      rateLimits?.forEach((r: any) => {
        const current = userMap.get(r.user_id) || { count: 0, userName: r.user?.name || '알 수 없음' };
        userMap.set(r.user_id, {
          count: current.count + r.request_count,
          userName: current.userName
        });
      });

      const userStats = Array.from(userMap.entries())
        .map(([userId, data]) => ({
          userId,
          userName: data.userName,
          count: data.count
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10); // 상위 10명

      // 최근 활동 (일별)
      const activityMap = new Map<string, Map<string, number>>();
      rateLimits?.forEach(r => {
        const date = new Date(r.window_start).toLocaleDateString('ko-KR');
        if (!activityMap.has(date)) {
          activityMap.set(date, new Map());
        }
        const dayMap = activityMap.get(date)!;
        const current = dayMap.get(r.feature_type) || 0;
        dayMap.set(r.feature_type, current + r.request_count);
      });

      const recentActivity = Array.from(activityMap.entries())
        .map(([date, featureMap]) => {
          const total = Array.from(featureMap.values()).reduce((sum, count) => sum + count, 0);
          return { date, count: total, feature: 'all' };
        })
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // 캐시 통계
      const totalCached = cacheData?.length || 0;
      const totalHits = cacheData?.reduce((sum, c) => sum + c.hit_count, 0) || 0;
      const hitRate = totalRequests > 0 ? (totalHits / totalRequests) * 100 : 0;

      // Rate Limit 경고 (일일 100회 중 80% 이상 사용한 사용자)
      const rateLimitWarnings = userStats
        .filter(u => u.count >= 80)
        .map(u => ({
          userId: u.userId,
          userName: u.userName,
          count: u.count
        }));

      setStats({
        totalRequests,
        totalUsers: uniqueUsers,
        topFeatures,
        userStats,
        recentActivity,
        cacheStats: {
          hitCount: totalHits,
          totalCached,
          hitRate
        },
        rateLimitWarnings
      });
    } catch (err: any) {
      console.error('Error fetching AI stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAIStats();
  }, [timeRange]);

  const getFeatureName = (featureType: string): string => {
    const names: Record<string, string> = {
      'AI_SUMMARY': '이슈 요약',
      'AI_SUGGESTION': '해결 제안',
      'AI_AUTO_LABEL': '라벨 추천',
      'AI_DUPLICATE': '중복 탐지',
      'AI_COMMENT_SUMMARY': '댓글 요약',
      'SUGGEST_SUBTASKS': '서브태스크 제안',
      'SUMMARIZE_COMMENTS': '댓글 요약(구)',
      'SUGGEST_ASSIGNEE': '담당자 제안',
      'PREDICT_COMPLETION': '완료 예측',
      'TITLE_AUTOCOMPLETE': '제목 자동완성'
    };
    return names[featureType] || featureType;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">로딩 중...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">데이터를 불러올 수 없습니다.</div>
      </div>
    );
  }

  const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Sparkles size={24} className="text-brand-500" />
          <h2 className="text-2xl font-bold text-slate-800">AI 사용 통계</h2>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setTimeRange('1h')}
            className={`px-3 py-1 text-xs font-medium rounded ${timeRange === '1h' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
          >
            1시간
          </button>
          <button
            onClick={() => setTimeRange('24h')}
            className={`px-3 py-1 text-xs font-medium rounded ${timeRange === '24h' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
          >
            24시간
          </button>
          <button
            onClick={() => setTimeRange('7d')}
            className={`px-3 py-1 text-xs font-medium rounded ${timeRange === '7d' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
          >
            7일
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <span className="text-slate-500 text-xs font-semibold uppercase">총 요청</span>
            <Activity size={18} className="text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.totalRequests.toLocaleString()}</div>
          <div className="text-xs text-slate-400 mt-1">AI API 호출 횟수</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <span className="text-slate-500 text-xs font-semibold uppercase">사용자</span>
            <Users size={18} className="text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.totalUsers}</div>
          <div className="text-xs text-slate-400 mt-1">AI 기능 사용 중</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <span className="text-slate-500 text-xs font-semibold uppercase">캐시 적중률</span>
            <Zap size={18} className="text-yellow-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.cacheStats.hitRate.toFixed(1)}%</div>
          <div className="text-xs text-slate-400 mt-1">{stats.cacheStats.hitCount}회 캐시 히트</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <span className="text-slate-500 text-xs font-semibold uppercase">캐시된 응답</span>
            <CheckCircle2 size={18} className="text-green-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.cacheStats.totalCached}</div>
          <div className="text-xs text-slate-400 mt-1">저장된 AI 응답</div>
        </div>
      </div>

      {/* Rate Limit Warnings */}
      {stats.rateLimitWarnings.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={16} className="text-red-600" />
            <span className="text-sm font-semibold text-red-900">Rate Limit 경고</span>
          </div>
          <div className="text-xs text-red-700">
            다음 사용자들이 일일 제한(100회)의 80% 이상을 사용했습니다:
          </div>
          <div className="mt-2 space-y-1">
            {stats.rateLimitWarnings.map((warning, idx) => (
              <div key={idx} className="text-xs text-red-600">
                • {warning.userName}: {warning.count}회 ({((warning.count / 100) * 100).toFixed(0)}%)
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 기능별 사용량 */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-semibold text-slate-800 mb-4">기능별 사용량</h3>
          {stats.topFeatures.length > 0 ? (
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.topFeatures}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={(props: any) => {
                      const { name, percent } = props;
                      return `${name || ''} (${((percent || 0) * 100).toFixed(0)}%)`;
                    }}
                  >
                    {stats.topFeatures.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-slate-400">
              데이터 없음
            </div>
          )}
        </div>

        {/* 사용자별 사용량 */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-semibold text-slate-800 mb-4">사용자별 사용량 (Top 10)</h3>
          {stats.userStats.length > 0 ? (
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.userStats}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="userName"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                  />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-slate-400">
              데이터 없음
            </div>
          )}
        </div>
      </div>

      {/* 최근 활동 추이 */}
      {stats.recentActivity.length > 0 && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-semibold text-slate-800 mb-4">일별 사용 추이</h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.recentActivity}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 4, fill: '#3b82f6' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIStatsWithDB;
