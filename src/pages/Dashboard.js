import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUserStats, getUserAnalyses } from '../services/analysisService';

const Dashboard = () => {
    const { user, isAuthenticated, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        totalAnalyses: 0,
        firstDegree: 0,
        secondDegree: 0,
        thirdDegree: 0,
        averageConfidence: 0
    });
    const [recentAnalyses, setRecentAnalyses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [chartData, setChartData] = useState(null);
    const [visibleSections, setVisibleSections] = useState(new Set());
    const sectionsRef = useRef([]);
    const hasLoadedRef = useRef(false); // Track if data has been loaded
    const monthlyTrendChartRef = useRef(null);

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            navigate('/auth');
        }
    }, [isAuthenticated, authLoading, navigate]);

    // Intersection Observer for scroll animations
    useEffect(() => {
        if (authLoading || !isAuthenticated) {
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setVisibleSections((prev) => new Set([...prev, entry.target.dataset.section]));
                        entry.target.classList.add('visible');
                    }
                });
            },
            { threshold: 0.1, rootMargin: '-20px' }
        );

        sectionsRef.current.forEach((section) => {
            if (section) observer.observe(section);
        });

        return () => observer.disconnect();
    }, [authLoading, isAuthenticated]);

    // Chart.js: create/update Monthly Trend line chart only when monthly data actually changes
    const monthlyTrendCanvasRef = useRef(null);
    const monthlyTrendKey = useMemo(
        () => (chartData?.monthlyTrend ? JSON.stringify(Object.entries(chartData.monthlyTrend)) : null),
        [chartData]
    );

    useEffect(() => {
        if (typeof window === 'undefined' || !window.Chart) return;
        if (!monthlyTrendKey) {
            if (monthlyTrendChartRef.current) {
                monthlyTrendChartRef.current.destroy();
                monthlyTrendChartRef.current = null;
            }
            return;
        }
        let entries;
        try {
            entries = JSON.parse(monthlyTrendKey);
        } catch {
            return;
        }
        if (!Array.isArray(entries) || entries.length === 0) return;
        const canvas = monthlyTrendCanvasRef.current;
        if (!canvas) return;

        const labels = entries.map(([month]) => month.split(' ')[0]);
        const data = entries.map(([, value]) => value);

        const chart = monthlyTrendChartRef.current;
        if (chart) {
            chart.data.labels = labels;
            chart.data.datasets[0].data = data;
            chart.update('none');
            return;
        }

        const config = {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Analyses',
                    data,
                    fill: true,
                    backgroundColor: 'rgba(147, 197, 253, 0.6)',
                    borderColor: '#3b82f6',
                    borderWidth: 2.5,
                    pointBackgroundColor: '#3b82f6',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 1.5,
                    pointRadius: 3,
                    tension: 0.35
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 0 },
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: {
                        grid: { color: '#e5e7eb' },
                        ticks: { maxRotation: 0, font: { size: 11 }, color: '#6b7280' }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: '#e5e7eb' },
                        ticks: { font: { size: 11 }, color: '#6b7280' }
                    }
                }
            }
        };

        monthlyTrendChartRef.current = new window.Chart(canvas, config);
        return () => {
            if (monthlyTrendChartRef.current) {
                monthlyTrendChartRef.current.destroy();
                monthlyTrendChartRef.current = null;
            }
        };
    }, [monthlyTrendKey]);

    const fetchDashboardData = useCallback(async (showLoader = false) => {
        if (!user || !user.uid) {
            console.log('No user available for dashboard');
            return;
        }
        
        try {
            if (showLoader) {
                setLoading(true);
            }
            
            console.log('🔄 Fetching dashboard data for user:', user.uid);
            const [userStats, analyses] = await Promise.all([
                getUserStats(user.uid),
                getUserAnalyses(user.uid)
            ]);
            
            console.log('✅ Dashboard data fetched:', { 
                userStats, 
                analysesCount: analyses.length,
                firstAnalysis: analyses[0] ? {
                    id: analyses[0].id,
                    burnDegree: analyses[0].burnDegree,
                    hasImageUrl: !!analyses[0].imageUrl,
                    hasImageBase64: !!analyses[0].imageBase64,
                    imageUrlLength: analyses[0].imageUrl?.length || 0
                } : null
            });
            
            setStats(userStats);
            // Ensure we have valid analyses with required fields
            const validAnalyses = analyses
                .filter(a => a && a.id) // Filter out invalid entries
                .slice(0, 5)
                .map(a => ({
                    ...a,
                    imageUrl: a.imageUrl || a.imageBase64 || '', // Use imageBase64 as fallback
                    imageBase64: a.imageBase64 || a.imageUrl || '', // Ensure both are available
                    burnDegree: a.burnDegree || 'Unknown',
                    healingStage: a.healingStage || 'N/A',
                    confidence: a.confidence || 0,
                    burnDegreeIndex: a.burnDegreeIndex !== undefined ? a.burnDegreeIndex : -1
                }));
            setRecentAnalyses(validAnalyses);
            console.log('✅ Recent analyses set:', validAnalyses.length, 'items');
            if (validAnalyses.length > 0) {
                console.log('📋 Sample analysis:', {
                    id: validAnalyses[0].id,
                    burnDegree: validAnalyses[0].burnDegree,
                    imageUrl: validAnalyses[0].imageUrl ? 'EXISTS' : 'MISSING',
                    imageBase64: validAnalyses[0].imageBase64 ? 'EXISTS' : 'MISSING'
                });
            }
            
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
                } else if (analysis.timestamp) {
                    // Fallback to timestamp if createdAt not available
                    const date = analysis.timestamp.toDate ? analysis.timestamp.toDate() : new Date(analysis.timestamp);
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
            if (showLoader) {
                setLoading(false);
            }
        }
    }, [user]);

    // Load data as soon as user is available (don't wait for authLoading to finish)
    useEffect(() => {
        // Only load once when user becomes available
        if (user && user.uid && !hasLoadedRef.current) {
            console.log('🔄 Dashboard: User available, loading data immediately for:', user.uid);
            hasLoadedRef.current = true;
            fetchDashboardData(true); // Show loader on initial load
        } else if (!authLoading && user === null && hasLoadedRef.current) {
            // Reset state if user logs out
            console.log('🔄 Dashboard: No user, resetting state');
            hasLoadedRef.current = false;
            setStats({
                totalAnalyses: 0,
                firstDegree: 0,
                secondDegree: 0,
                thirdDegree: 0,
                averageConfidence: 0
            });
            setRecentAnalyses([]);
        }
    }, [user, fetchDashboardData, authLoading]);

    // Auto-refresh every 5 seconds (separate effect to avoid re-creating interval)
    useEffect(() => {
        if (!user || !user.uid) return;
        
        const refreshInterval = setInterval(() => {
            if (user && user.uid && hasLoadedRef.current) {
                fetchDashboardData(false); // Silent refresh, no loader
            }
        }, 5000);
        
        return () => clearInterval(refreshInterval);
    }, [user, fetchDashboardData]);

    const getSeverityColor = (burnDegreeIndex) => {
        const colors = {
            0: 'from-green-500 to-emerald-600',
            1: 'from-orange-500 to-amber-600',
            2: 'from-red-500 to-rose-600'
        };
        return colors[burnDegreeIndex] || 'from-gray-500 to-gray-600';
    };

    if (authLoading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-medical-blue"></div>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) return null;

    const totalCount = chartData
        ? Object.values(chartData.degreeCounts).reduce((sum, value) => sum + value, 0)
        : 0;

    return (
        <div className="min-h-screen bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Ultra Minimalistic Header */}
                <div 
                    ref={(el) => (sectionsRef.current[0] = el)}
                    data-section="header"
                    className={`mb-6 scroll-slide-up ${visibleSections.has('header') ? 'visible' : ''}`}
                >
                    <h1 className="text-2xl font-semibold text-gray-900">
                        Dashboard
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        {user?.displayName || 'User'}
                    </p>
                </div>

                {/* Stats Grid - Ultra Minimalistic with Transitions */}
                <div 
                    ref={(el) => (sectionsRef.current[1] = el)}
                    data-section="stats"
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-6"
                >
                    <div className={`bg-gray-50 rounded-lg p-4 border border-gray-200/50 hover:border-gray-300 transition-all scroll-scale ${visibleSections.has('stats') ? 'visible' : ''}`} style={{ transitionDelay: '0.1s' }}>
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

                    <div className={`bg-gray-50 rounded-lg p-4 border border-gray-200/50 hover:border-gray-300 transition-all scroll-scale ${visibleSections.has('stats') ? 'visible' : ''}`} style={{ transitionDelay: '0.2s' }}>
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

                    <div className={`bg-gray-50 rounded-lg p-4 border border-gray-200/50 hover:border-gray-300 transition-all scroll-scale ${visibleSections.has('stats') ? 'visible' : ''}`} style={{ transitionDelay: '0.3s' }}>
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

                    <div className={`bg-gray-50 rounded-lg p-4 border border-gray-200/50 hover:border-gray-300 transition-all scroll-scale ${visibleSections.has('stats') ? 'visible' : ''}`} style={{ transitionDelay: '0.4s' }}>
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

                {/* Charts - Premium Visuals */}
                <div 
                    ref={(el) => (sectionsRef.current[2] = el)}
                    data-section="charts"
                    className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6"
                >
                    {/* Burn Degree Distribution Chart */}
                    <div className={`lg:col-span-2 p-[1px] rounded-xl bg-gradient-to-br from-blue-100 via-white to-teal-100 scroll-slide-left ${visibleSections.has('charts') ? 'visible' : ''}`}>
                        <div className="bg-white/80 backdrop-blur rounded-xl border border-white/60 p-5">
                            <div className="flex items-center justify-between mb-5">
                                <div>
                                    <h2 className="text-sm font-semibold text-gray-800">Burn Degree Distribution</h2>
                                    <p className="text-xs text-gray-500 mt-0.5">Severity mix by degree</p>
                                </div>
                                <div className="px-2.5 py-1 rounded-full bg-gray-900 text-white text-xs">
                                    {totalCount} total
                                </div>
                            </div>
                            {chartData ? (
                                <div className="grid grid-cols-1 md:grid-cols-[140px_1fr] gap-6 items-center">
                                    <div className="flex justify-center">
                                        <div className="relative w-28 h-28">
                                            <div
                                                className="absolute inset-0 rounded-full"
                                                style={{
                                                    background: `conic-gradient(#22c55e 0 ${totalCount ? (chartData.degreeCounts['First Degree'] / totalCount) * 100 : 0}%, #f59e0b ${totalCount ? (chartData.degreeCounts['First Degree'] / totalCount) * 100 : 0}% ${totalCount ? ((chartData.degreeCounts['First Degree'] + chartData.degreeCounts['Second Degree']) / totalCount) * 100 : 0}%, #ef4444 ${totalCount ? ((chartData.degreeCounts['First Degree'] + chartData.degreeCounts['Second Degree']) / totalCount) * 100 : 0}% 100%)`
                                                }}
                                            />
                                            <div className="absolute inset-3 bg-white rounded-full flex items-center justify-center shadow-sm">
                                                <div className="text-center">
                                                    <div className="text-lg font-semibold text-gray-900">{totalCount}</div>
                                                    <div className="text-[10px] text-gray-500">Total</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        {Object.entries(chartData.degreeCounts).map(([degree, count]) => {
                                            const percentage = totalCount > 0 ? (count / totalCount) * 100 : 0;
                                            const colorClass = degree === 'First Degree'
                                                ? 'from-green-400 to-emerald-500'
                                                : degree === 'Second Degree'
                                                    ? 'from-orange-400 to-amber-500'
                                                    : 'from-red-400 to-rose-500';
                                            return (
                                                <div key={degree}>
                                                    <div className="flex items-center justify-between mb-1.5">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`inline-block w-2.5 h-2.5 rounded-full bg-gradient-to-r ${colorClass}`} />
                                                            <span className="text-xs font-medium text-gray-700">{degree}</span>
                                                        </div>
                                                        <span className="text-xs font-semibold text-gray-900">{count}</span>
                                                    </div>
                                                    <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                                                        <div 
                                                            className={`h-2.5 rounded-full bg-gradient-to-r ${colorClass} shadow-[0_0_10px_rgba(59,130,246,0.15)] transition-all duration-700`}
                                                            style={{ width: `${percentage}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-10 text-sm text-gray-500">No data available</div>
                            )}
                        </div>
                    </div>

                    {/* Monthly Trend Chart (Cartesian) */}
                    <div className={`p-[1px] rounded-xl bg-gradient-to-br from-indigo-100 via-white to-sky-100 scroll-slide-right ${visibleSections.has('charts') ? 'visible' : ''}`}>
                        <div className="bg-white/80 backdrop-blur rounded-xl border border-white/60 p-5">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h2 className="text-sm font-semibold text-gray-800">Monthly Trend</h2>
                                    <p className="text-xs text-gray-500 mt-0.5">Last 6 months</p>
                                </div>
                                <div className="text-xs text-gray-500">
                                    {chartData ? Object.values(chartData.monthlyTrend).reduce((sum, value) => sum + value, 0) : 0} total
                                </div>
                            </div>
                            {chartData ? (
                                <div className="relative w-full" style={{ height: '260px' }}>
                                    <canvas
                                        ref={monthlyTrendCanvasRef}
                                        id="monthlyTrendChart"
                                        aria-label="Monthly trend chart"
                                    />
                                </div>
                            ) : (
                                <div className="text-center py-10 text-sm text-gray-500">No data available</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Recent Analyses - Ultra Minimalistic with Transitions */}
                <div 
                    ref={(el) => (sectionsRef.current[3] = el)}
                    data-section="recent"
                    className={`bg-gray-50 rounded-lg border border-gray-200/50 p-5 scroll-slide-up ${visibleSections.has('recent') ? 'visible' : ''}`}
                >
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-medium text-gray-700">Recent Analyses</h2>
                        <button
                            onClick={() => navigate('/analyze')}
                            className="text-xs text-medical-blue hover:text-blue-700 font-medium transition-colors"
                        >
                            View All →
                        </button>
                    </div>

                    {loading ? (
                        <div className="text-center py-8">
                            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-medical-blue"></div>
                        </div>
                    ) : recentAnalyses.length > 0 ? (
                        <div className="space-y-2">
                            {recentAnalyses.map((analysis, index) => (
                                <div
                                    key={analysis.id}
                                    className={`flex items-center gap-3 p-3 bg-white rounded-md hover:bg-gray-50 transition-all cursor-pointer border border-transparent hover:border-gray-200 scroll-scale ${visibleSections.has('recent') ? 'visible' : ''}`}
                                    onClick={() => navigate('/analyze', { state: { selectedAnalysis: analysis } })}
                                    style={{ transitionDelay: `${index * 0.05}s` }}
                                >
                                    <div className="relative w-12 h-12 rounded-md overflow-hidden flex-shrink-0 bg-gray-200 border border-gray-300">
                                        {(analysis.imageUrl || analysis.imageBase64) ? (
                                            <img
                                                src={analysis.imageUrl || analysis.imageBase64}
                                                alt="Analysis"
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                    console.error('Image load error for analysis:', analysis.id);
                                                    e.target.style.display = 'none';
                                                    const parent = e.target.parentElement;
                                                    if (parent) {
                                                        parent.innerHTML = '<div class="w-full h-full flex items-center justify-center bg-gray-100"><svg class="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div>';
                                                    }
                                                }}
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gray-100">
                                                <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <h3 className="font-medium text-xs text-gray-900 truncate">{analysis.burnDegree || 'Unknown'}</h3>
                                            <span className={`px-1.5 py-0.5 text-xs font-medium rounded bg-gradient-to-r ${getSeverityColor(analysis.burnDegreeIndex)} text-white`}>
                                                {analysis.confidence || 0}%
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 truncate">{analysis.healingStage || 'N/A'}</p>
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            {analysis.createdAt ? new Date(analysis.createdAt).toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric'
                                            }) : analysis.timestamp ? (
                                                analysis.timestamp.toDate ? new Date(analysis.timestamp.toDate()).toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric'
                                                }) : 'Recent'
                                            ) : 'Recent'}
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
