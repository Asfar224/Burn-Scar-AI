import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUserStats, getUserAnalyses } from '../services/analysisService';

const Dashboard = () => {
    const { user, isAuthenticated, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [recentAnalyses, setRecentAnalyses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [chartData, setChartData] = useState(null);

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            navigate('/auth');
        }
    }, [isAuthenticated, authLoading, navigate]);

    const fetchDashboardData = useCallback(async () => {
        if (!user) return;
        
        try {
            setLoading(true);
            const [userStats, analyses] = await Promise.all([
                getUserStats(user.uid),
                getUserAnalyses(user.uid)
            ]);
            
            setStats(userStats);
            setRecentAnalyses(analyses.slice(0, 5));
            
            // Prepare chart data
            const degreeCounts = {
                'First Degree': userStats.firstDegree || 0,
                'Second Degree': userStats.secondDegree || 0,
                'Third Degree': userStats.thirdDegree || 0
            };
            
            // Monthly trend data (last 6 months)
            const monthlyData = {};
            const now = new Date();
            for (let i = 5; i >= 0; i--) {
                const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                monthlyData[monthKey] = 0;
            }
            
            analyses.forEach(analysis => {
                if (analysis.createdAt) {
                    const date = new Date(analysis.createdAt);
                    const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                    if (monthlyData.hasOwnProperty(monthKey)) {
                        monthlyData[monthKey]++;
                    }
                }
            });
            
            setChartData({
                degreeCounts,
                monthlyTrend: monthlyData
            });
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            setStats({
                totalAnalyses: 0,
                firstDegree: 0,
                secondDegree: 0,
                thirdDegree: 0,
                averageConfidence: 0
            });
            setRecentAnalyses([]);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    const getSeverityColor = (burnDegreeIndex) => {
        const colors = {
            0: 'from-green-500 to-emerald-600',
            1: 'from-orange-500 to-amber-600',
            2: 'from-red-500 to-rose-600'
        };
        return colors[burnDegreeIndex] || 'from-gray-500 to-gray-600';
    };

    if (authLoading || loading) {
        return (
            <div className="min-h-screen bg-soft-gray flex items-center justify-center">
                <div className="text-center animate-fadeIn">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-medical-blue"></div>
                    <p className="mt-4 text-medical-gray">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) return null;

    const maxCount = chartData ? Math.max(...Object.values(chartData.degreeCounts)) : 1;
    const maxMonthly = chartData ? Math.max(...Object.values(chartData.monthlyTrend), 1) : 1;

    return (
        <div className="min-h-screen bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Ultra Minimalistic Header */}
                <div className="mb-6">
                    <h1 className="text-2xl font-semibold text-gray-900">
                        Dashboard
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        {user?.displayName || 'User'}
                    </p>
                </div>

                {/* Stats Grid - Ultra Minimalistic */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200/50 hover:border-gray-300 transition-colors">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 bg-medical-blue/10 rounded-md flex items-center justify-center">
                                <svg className="w-4 h-4 text-medical-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900">{stats?.totalAnalyses || 0}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">Total Analyses</p>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200/50 hover:border-gray-300 transition-colors">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 bg-medical-teal/10 rounded-md flex items-center justify-center">
                                <svg className="w-4 h-4 text-medical-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900">{stats?.averageConfidence || 0}%</h3>
                        <p className="text-xs text-gray-500 mt-0.5">Avg. Confidence</p>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200/50 hover:border-gray-300 transition-colors">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 bg-green-50 rounded-md flex items-center justify-center">
                                <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                </svg>
                            </div>
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900">{stats?.firstDegree || 0}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">First Degree</p>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200/50 hover:border-gray-300 transition-colors">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 bg-red-50 rounded-md flex items-center justify-center">
                                <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900">{(stats?.secondDegree || 0) + (stats?.thirdDegree || 0)}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">Severe Cases</p>
                    </div>
                </div>

                {/* Charts - Minimalistic */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                    {/* Burn Degree Distribution Chart */}
                    <div className="lg:col-span-2 bg-gray-50 rounded-lg border border-gray-200/50 p-5">
                        <h2 className="text-sm font-medium text-gray-700 mb-4">Burn Degree Distribution</h2>
                        {chartData && (
                            <div className="space-y-3">
                                {Object.entries(chartData.degreeCounts).map(([degree, count]) => {
                                    const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
                                    const colorClass = degree === 'First Degree' ? 'bg-green-500' : 
                                                     degree === 'Second Degree' ? 'bg-orange-500' : 'bg-red-500';
                                    return (
                                        <div key={degree}>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <span className="text-xs font-medium text-gray-600">{degree}</span>
                                                <span className="text-xs font-semibold text-gray-900">{count}</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                                <div 
                                                    className={`h-2 rounded-full transition-all duration-500 ${colorClass}`}
                                                    style={{ width: `${percentage}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Monthly Trend Chart */}
                    <div className="bg-gray-50 rounded-lg border border-gray-200/50 p-5">
                        <h2 className="text-sm font-medium text-gray-700 mb-4">Monthly Trend</h2>
                        {chartData && (
                            <div className="space-y-2.5">
                                {Object.entries(chartData.monthlyTrend).map(([month, count]) => {
                                    const percentage = maxMonthly > 0 ? (count / maxMonthly) * 100 : 0;
                                    return (
                                        <div key={month}>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-xs text-gray-500">{month}</span>
                                                <span className="text-xs font-semibold text-gray-900">{count}</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                                                <div 
                                                    className="h-1.5 rounded-full bg-medical-blue transition-all duration-500"
                                                    style={{ width: `${percentage}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Recent Analyses - Ultra Minimalistic */}
                <div className="bg-gray-50 rounded-lg border border-gray-200/50 p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-medium text-gray-700">Recent Analyses</h2>
                        <button
                            onClick={() => navigate('/analyze')}
                            className="text-xs text-medical-blue hover:text-blue-700 font-medium transition-colors"
                        >
                            View All →
                        </button>
                    </div>

                    {recentAnalyses.length > 0 ? (
                        <div className="space-y-2">
                            {recentAnalyses.map((analysis) => (
                                <div
                                    key={analysis.id}
                                    className="flex items-center gap-3 p-3 bg-white rounded-md hover:bg-gray-50 transition-colors cursor-pointer border border-transparent hover:border-gray-200"
                                    onClick={() => navigate('/analyze', { state: { selectedAnalysis: analysis } })}
                                >
                                    <div className="relative w-12 h-12 rounded-md overflow-hidden flex-shrink-0">
                                        <img
                                            src={analysis.imageUrl}
                                            alt="Analysis"
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <h3 className="font-medium text-xs text-gray-900 truncate">{analysis.burnDegree}</h3>
                                            <span className={`px-1.5 py-0.5 text-xs font-medium rounded bg-gradient-to-r ${getSeverityColor(analysis.burnDegreeIndex)} text-white`}>
                                                {analysis.confidence}%
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 truncate">{analysis.healingStage}</p>
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            {analysis.createdAt ? new Date(analysis.createdAt).toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric'
                                            }) : 'Recent'}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10">
                            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
                                <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <h3 className="text-sm font-medium text-gray-900 mb-1">No analyses yet</h3>
                            <p className="text-xs text-gray-500 mb-3">Upload your first burn image to get started</p>
                            <button
                                onClick={() => navigate('/analyze')}
                                className="inline-flex items-center px-4 py-2 bg-medical-blue text-white rounded-md font-medium hover:bg-blue-600 transition-colors text-xs"
                            >
                                <svg className="w-3 h-3 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Start Analysis
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
