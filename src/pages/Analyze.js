import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { saveAnalysis, getUserAnalyses } from '../services/analysisService';

const API_URL = 'http://localhost:8000';

const Analyze = () => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef(null);
  
  const [selectedImage, setSelectedImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showPrecautions, setShowPrecautions] = useState(true);
  const [history, setHistory] = useState([]);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/auth');
    }
  }, [isAuthenticated, authLoading, navigate]);

  // Normalize analysis data to handle both API (snake_case) and Firebase (camelCase) formats
  const normalizeAnalysisData = (data) => {
    if (!data) return null;
    
    return {
      burn_degree: data.burn_degree || data.burnDegree || 'Unknown',
      burn_degree_index: data.burn_degree_index !== undefined ? data.burn_degree_index : (data.burnDegreeIndex !== undefined ? data.burnDegreeIndex : -1),
      confidence: data.confidence || 0,
      confidence_breakdown: data.confidence_breakdown || data.confidenceBreakdown || {},
      healing_stage: data.healing_stage || data.healingStage || 'N/A',
      progression_summary: data.progression_summary || data.progressionSummary || '',
      recommendations: data.recommendations || [],
      burn_info: data.burn_info || data.burnInfo || null,
      imageUrl: data.imageUrl
    };
  };

  // Load history - only on initial load, then silent refresh
  const loadHistoryRef = useRef(false); // Track if initial load happened
  
  useEffect(() => {
    if (!user || !user.uid) {
      setHistory([]);
      return;
    }

    const loadHistory = async (showLoader = false) => {
      if (showLoader) {
        console.log('🔄 Analyze: Loading history for user:', user.uid);
        setLoadingHistory(true);
      } else {
        console.log('🔄 Analyze: Silently refreshing history...');
      }
      try {
        const analyses = await getUserAnalyses(user.uid);
        console.log('✅ Analyze: History loaded, count:', analyses.length);
        if (analyses.length > 0 && showLoader) {
          console.log('📋 Analyze: First analysis:', {
            id: analyses[0].id,
            burnDegree: analyses[0].burnDegree,
            confidence: analyses[0].confidence
          });
        }
        setHistory(analyses);
        loadHistoryRef.current = true; // Mark as loaded
      } catch (error) {
        console.error('❌ Analyze: Error loading history:', error);
        setHistory([]);
      } finally {
        if (showLoader) {
          setLoadingHistory(false);
        }
      }
    };

    // Only show loader on first load
    if (!loadHistoryRef.current) {
      loadHistory(true);
    }
    
    // Auto-refresh history every 5 seconds silently (no loader, no blinking)
    const refreshInterval = setInterval(() => {
      if (user && user.uid) {
        loadHistory(false); // Silent refresh
      }
    }, 5000);

    return () => clearInterval(refreshInterval);
  }, [user]);

  // Handle selected analysis from location state
  useEffect(() => {
    if (location.state?.selectedAnalysis) {
      const analysis = location.state.selectedAnalysis;
      const normalized = normalizeAnalysisData(analysis);
      setResults(normalized);
      setPreview(analysis.imageUrl);
      setShowPrecautions(false);
    }
  }, [location]);

  const handleFileSelect = (file) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      setError('Image size must beless than 10MB');
      return;
    }

    setError(null);
    setSelectedImage(file);
    setResults(null);
    setShowPrecautions(false);
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleAnalyze = async () => {
    if (!selectedImage) {
      setError('Please select an image first');
      return;
    }

    setAnalyzing(true);
    setError(null);
    setResults(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedImage);
      // Always send userId so backend can upload to Firebase Storage
      if (user && user.uid) {
        formData.append('userId', user.uid);
        console.log('📤 Sending userId to backend:', user.uid);
      } else {
        console.warn('⚠️ No user.uid available - backend cannot upload image');
      }

      const response = await fetch(`${API_URL}/analyze`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Analysis failed');
      }

      const data = await response.json();
      console.log('📊 Analysis response received:', {
        burn_degree: data.burn_degree,
        hasImageUrl: !!data.imageUrl,
        imageUrl: data.imageUrl || 'EMPTY'
      });
      setResults(data);

      // Save to Firestore
      if (user && user.uid) {
        try {
          console.log('💾 Saving analysis for user:', user.uid);
          const savedAnalysis = await saveAnalysis(user.uid, selectedImage, data);
          console.log('✅ Analysis saved successfully:', savedAnalysis.id);
          
          // Silently reload history (no loader, no blinking)
          try {
            console.log('🔄 Silently reloading history after save...');
            const analyses = await getUserAnalyses(user.uid);
            console.log('✅ History reloaded, count:', analyses.length);
            setHistory(analyses);
            
            // Verify the saved analysis is in history
            const found = analyses.find(a => a.id === savedAnalysis.id);
            if (found) {
              console.log('✅ Saved analysis found in history!');
            } else {
              console.warn('⚠️ Saved analysis not found in history yet - will appear on next refresh');
            }
          } catch (reloadError) {
            console.error('❌ Error reloading history:', reloadError);
          }
        } catch (saveError) {
          console.error('❌ Error saving analysis:', saveError);
          console.error('❌ Save error details:', {
            code: saveError.code,
            message: saveError.message,
            stack: saveError.stack
          });
          // Show error to user but don't block the UI
          setError('Analysis completed but failed to save to history. Results are still displayed.');
        }
      } else {
        console.warn('⚠️ No user available to save analysis');
      }
    } catch (err) {
      setError(err.message || 'Failed to analyze image. Please try again.');
      console.error('Analysis error:', err);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleReset = () => {
    setSelectedImage(null);
    setPreview(null);
    setResults(null);
    setError(null);
    setShowPrecautions(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getBurnDegreeColor = (degree) => {
    const colors = {
      'First Degree': 'from-green-50 to-emerald-50 border-green-200',
      'Second Degree': 'from-orange-50 to-amber-50 border-orange-200',
      'Third Degree': 'from-red-50 to-rose-50 border-red-200'
    };
    return colors[degree] || 'from-gray-50 to-gray-100 border-gray-200';
  };

  const getBurnDegreeTextColor = (degree) => {
    const colors = {
      'First Degree': 'text-green-700',
      'Second Degree': 'text-orange-700',
      'Third Degree': 'text-red-700'
    };
    return colors[degree] || 'text-gray-700';
  };

  const getSeverityBadgeColor = (severity) => {
    const colors = {
      'Mild': 'bg-green-100 text-green-800',
      'Moderate': 'bg-yellow-100 text-yellow-800',
      'Severe': 'bg-red-100 text-red-800'
    };
    return colors[severity] || 'bg-gray-100 text-gray-800';
  };

  const shouldShowDoctorWarning = (results) => {
    if (!results) return false;
    return results.burn_degree_index >= 2 || // Third degree
      (results.burn_degree_index === 1 && results.confidence > 70); // High confidence second degree
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-soft-gray flex items-center justify-center">
        <div className="text-center animate-fadeIn">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-medical-blue"></div>
          <p className="mt-4 text-medical-gray">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-white flex">
      {/* History Sidebar - LEFT SIDE, ALWAYS VISIBLE */}
      <div className={`fixed left-0 top-16 h-[calc(100vh-4rem)] bg-gray-50 border-r border-gray-200/50 z-30 transition-all duration-300 flex flex-col ${
        isHistoryExpanded ? 'w-80' : 'w-16'
      }`}>
        {/* Toggle Button */}
        <div className="p-3 border-b border-gray-200/50 flex items-center justify-center">
          <button
            onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors group"
            title={isHistoryExpanded ? 'Collapse History' : 'Expand History'}
          >
            {isHistoryExpanded ? (
              <svg className="w-6 h-6 text-gray-600 group-hover:text-medical-blue transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            ) : (
              <svg className="w-6 h-6 text-gray-600 group-hover:text-medical-blue transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </button>
        </div>

        {/* History Content */}
        {isHistoryExpanded ? (
          <>
            {/* Header */}
            <div className="p-3 border-b border-gray-200/50">
              <h3 className="text-sm font-medium text-gray-700 mb-0.5">History</h3>
              <p className="text-xs text-gray-500">{history.length} analyses</p>
            </div>

            {/* History List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {loadingHistory ? (
                <div className="flex items-center justify-center py-8">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-medical-blue"></div>
                </div>
              ) : history.length > 0 ? (
                history.map((analysis, index) => (
                  <div
                    key={analysis.id}
                    className="bg-white rounded-md p-2.5 cursor-pointer hover:bg-gray-50 transition-all border border-gray-200/50 hover:border-gray-300 group"
                    onClick={() => {
                      const normalized = normalizeAnalysisData(analysis);
                      setResults(normalized);
                      setPreview(analysis.imageUrl);
                      setShowPrecautions(false);
                    }}
                  >
                    <div className="flex gap-2">
                      <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 shadow-sm">
                        <img src={analysis.imageUrl} alt="Analysis" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-xs text-gray-900 truncate">{analysis.burnDegree}</p>
                        <p className="text-xs text-medical-gray mt-0.5 truncate">{analysis.healingStage}</p>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <span className="text-xs font-medium text-medical-blue">{analysis.confidence}%</span>
                          <span className="text-xs text-gray-400">
                            {analysis.createdAt ? new Date(analysis.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric'
                            }) : 'Recent'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <svg className="w-10 h-10 text-gray-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs text-gray-500">No history yet</p>
                </div>
              )}
            </div>
          </>
        ) : (
          /* Collapsed View - Just Icon */
          <div className="flex-1 flex flex-col items-center justify-center">
            {/* No badge in collapsed view */}
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className={`flex-1 transition-all duration-300 ${isHistoryExpanded ? 'ml-80' : 'ml-16'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
          <div className="mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 mb-1">
                AI Burn Analysis
          </h1>
              <p className="text-sm text-gray-500">
                Upload an image to receive instant AI-powered burn assessment
              </p>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {/* Precautions Section */}
            {showPrecautions && (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-sm border border-blue-200 p-6 mb-6 animate-scaleIn">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-blue-900 mb-3">Safety Precautions Before Analysis</h3>
                    <ul className="space-y-2 text-sm text-blue-800">
                      <li className="flex items-start gap-2">
                        <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span>Ensure the wound is <strong>clean and dry</strong> before taking the image</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span>Use <strong>proper lighting</strong> - natural daylight is best</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span>Do <strong>NOT</strong> use on infected areas or open wounds</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span>Take image from a <strong>consistent distance</strong> for better results</span>
                      </li>
                    </ul>
                    <div className="mt-4 pt-4 border-t border-blue-200">
                      <p className="text-xs text-blue-700 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <strong>Disclaimer:</strong> This tool is for informational purposes only. Always consult a healthcare professional.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowPrecautions(false)}
                    className="text-blue-400 hover:text-blue-600 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* Doctor Warning */}
            {shouldShowDoctorWarning(results) && (
              <div className="bg-gradient-to-r from-red-50 to-rose-50 rounded-lg border-2 border-red-300 p-5 mb-4">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-red-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg animate-pulse">
                    <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-red-900 mb-2">⚠️ Immediate Medical Attention Required</h3>
                    <p className="text-red-800 font-semibold mb-4">
                      Your condition appears to be severe. Please visit a doctor immediately.
                    </p>
                    <div className="bg-white rounded-xl p-4 mb-3">
                      <p className="text-sm text-gray-700 mb-3"><strong>Emergency Contact Suggestions:</strong></p>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Call emergency services: <strong>911</strong> (US) or local emergency number</li>
                        <li>• Visit the nearest hospital emergency room</li>
                        <li>• Contact your primary care physician immediately</li>
                      </ul>
                    </div>
                    <p className="text-xs text-red-700">
                      <strong>Do not delay treatment.</strong> Severe burns require professional medical care to prevent complications and ensure proper healing.
          </p>
        </div>
                </div>
              </div>
            )}

            {/* Upload & Results Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Upload Section */}
          <div className="lg:col-span-1">
                <div className="bg-gray-50 rounded-lg border border-gray-200/50 p-5 sticky top-20">
                  <h2 className="text-sm font-medium text-gray-700 mb-4 flex items-center">
                    <svg className="w-4 h-4 text-medical-blue mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Upload Image
              </h2>
              
              {!preview ? (
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                      className={`border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer ${isDragging
                      ? 'border-medical-blue bg-medical-blue/5 scale-105'
                          : 'border-gray-300 hover:border-medical-blue/50 hover:bg-white'
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="flex flex-col items-center">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors ${isDragging ? 'bg-medical-blue/10' : 'bg-gray-100'
                    }`}>
                      <svg
                        className={`w-8 h-8 ${isDragging ? 'text-medical-blue' : 'text-medical-gray'}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="text-base font-medium text-gray-700 mb-2">
                      {isDragging ? 'Drop your image here' : 'Drag & drop your image'}
                    </p>
                    <p className="text-sm text-medical-gray mb-4">
                      or click to browse
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) handleFileSelect(file);
                      }}
                      className="hidden"
                      id="image-upload"
                    />
                        <div className="text-xs text-gray-500 bg-white rounded-md px-3 py-2 border border-gray-200/50">
                      <span className="font-medium">Supported:</span> JPG, PNG, JPEG
                      <br />
                      <span className="font-medium">Max size:</span> 10MB
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                      <div className="relative rounded-lg overflow-hidden border border-gray-200/50 bg-white group">
                    <img
                      src={preview}
                      alt="Preview"
                      className="w-full h-64 object-contain"
                    />
                    <button
                      onClick={handleReset}
                      className="absolute top-3 right-3 bg-white rounded-full p-2 shadow-lg hover:bg-gray-50 transition-all opacity-0 group-hover:opacity-100"
                      title="Remove image"
                    >
                      <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                      {selectedImage && !results && (
                  <button
                    onClick={handleAnalyze}
                    disabled={analyzing}
                    className="w-full bg-gradient-to-r from-medical-blue to-blue-600 text-white py-3 px-4 rounded-xl text-base font-semibold hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                  >
                    {analyzing ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Analyze Image
                      </>
                    )}
                  </button>
                      )}
                </div>
              )}

              {error && (
                    <div className="mt-4 bg-red-50 border-l-4 border-red-400 text-red-700 px-4 py-3 rounded-lg flex items-start animate-slideUp">
                  <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm">{error}</span>
                </div>
              )}
            </div>
          </div>

          {/* Results Section */}
              <div className="lg:col-span-2 space-y-4">
            {results ? (
              <>
                {/* Main Result Card */}
                    <div className={`bg-gradient-to-br ${getBurnDegreeColor(results.burn_degree)} rounded-lg border border-gray-200/50 p-5`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-10 h-10 bg-white/90 rounded-md flex items-center justify-center">
                              <svg className={`w-5 h-5 ${getBurnDegreeTextColor(results.burn_degree)}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                              <h3 className="text-xs font-medium text-gray-600 mb-0.5">Detected Burn Type</h3>
                              <h2 className={`text-2xl font-bold ${getBurnDegreeTextColor(results.burn_degree)}`}>{results.burn_degree}</h2>
                        </div>
                      </div>
                      {results.burn_info && (
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getSeverityBadgeColor(results.burn_info.severity)}`}>
                            {results.burn_info.severity} Severity
                          </span>
                              <span className={`text-xs ${getBurnDegreeTextColor(results.burn_degree)} flex items-center gap-1`}>
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Healing: {results.burn_info.healing_time}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                          <div className="bg-white/90 rounded-md px-4 py-3">
                            <p className={`text-xs font-medium ${getBurnDegreeTextColor(results.burn_degree)} mb-0.5`}>Confidence</p>
                            <p className={`text-2xl font-bold ${getBurnDegreeTextColor(results.burn_degree)}`}>{results.confidence}%</p>
                      </div>
                    </div>
                  </div>
                  
                  {results.burn_info && (
                    <div className="mt-3 pt-3 border-t border-current/20">
                          <p className={`text-xs leading-relaxed ${getBurnDegreeTextColor(results.burn_degree)}`}>{results.burn_info.description}</p>
                    </div>
                  )}
                </div>

                {/* Confidence Breakdown */}
                    <div className="bg-gray-50 rounded-lg border border-gray-200/50 p-5">
                  <h3 className="text-sm font-medium text-gray-700 mb-4 flex items-center">
                    <svg className="w-4 h-4 text-medical-blue mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Prediction Confidence
                  </h3>
                  <div className="space-y-3">
                    {Object.entries(results.confidence_breakdown || {}).map(([degree, confidence]) => (
                          <div key={degree}>
                            <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-medium text-gray-600">{degree}</span>
                            <span className="text-xs font-semibold text-gray-900">{confidence}%</span>
                          </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                                className={`h-2 rounded-full transition-all ${degree === results.burn_degree
                                  ? 'bg-medical-blue'
                                  : 'bg-gray-300'
                              }`}
                              style={{ width: `${confidence}%` }}
                            ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Burn Information */}
                {results.burn_info && results.burn_info.symptoms && (
                      <div className="bg-gray-50 rounded-lg border border-gray-200/50 p-5">
                    <h3 className="text-sm font-medium text-gray-700 mb-4 flex items-center">
                      <svg className="w-4 h-4 text-medical-teal mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Common Symptoms
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {results.burn_info.symptoms.map((symptom, index) => (
                            <div key={index} className="flex items-start bg-white rounded-md p-2.5 border border-gray-200/50 hover:border-gray-300 transition-colors">
                          <svg className="w-4 h-4 text-medical-teal mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span className="text-xs text-gray-700">{symptom}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Healing Stage & Progression */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gray-50 rounded-lg border border-gray-200/50 p-5">
                    <div className="flex items-center mb-3">
                          <div className="w-8 h-8 bg-medical-teal/10 rounded-md flex items-center justify-center mr-2">
                            <svg className="w-4 h-4 text-medical-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <h3 className="text-sm font-medium text-gray-700">Healing Stage</h3>
                    </div>
                    <p className="text-lg font-semibold text-gray-900 mb-1">{results.healing_stage}</p>
                    <p className="text-xs text-gray-500">Current stage of the healing process</p>
                  </div>

                      <div className="bg-gray-50 rounded-lg border border-gray-200/50 p-5">
                    <div className="flex items-center mb-3">
                          <div className="w-8 h-8 bg-medical-blue/10 rounded-md flex items-center justify-center mr-2">
                            <svg className="w-4 h-4 text-medical-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                      </div>
                      <h3 className="text-sm font-medium text-gray-700">Progression</h3>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">{results.progression_summary}</p>
                  </div>
                </div>

                {/* Treatment Recommendations */}
                    <div className="bg-gray-50 rounded-lg border border-gray-200/50 p-5">
                  <div className="flex items-center mb-4">
                        <div className="w-8 h-8 bg-medical-teal/10 rounded-md flex items-center justify-center mr-2">
                          <svg className="w-4 h-4 text-medical-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-medium text-gray-700">Treatment Recommendations</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {results.recommendations.map((rec, index) => (
                          <div key={index} className="flex items-start bg-white rounded-md p-3 border border-gray-200/50 hover:border-gray-300 transition-colors">
                        <svg className="w-4 h-4 text-medical-teal mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-xs text-gray-700 leading-relaxed">{rec}</span>
                      </div>
                    ))}
                  </div>
                      <div className="mt-4 pt-3 border-t border-gray-200 bg-yellow-50 rounded-md p-3">
                    <div className="flex items-start">
                      <svg className="w-4 h-4 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <p className="text-xs text-yellow-800">
                        <span className="font-semibold">Important:</span> This analysis is for informational purposes only. 
                        Always consult with a healthcare professional for proper diagnosis and treatment, especially for severe burns.
                      </p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
                  <div className="bg-gray-50 rounded-lg border border-gray-200/50 p-12 text-center">
                <div className="max-w-md mx-auto">
                  <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready to Analyze</h3>
                  <p className="text-xs text-gray-500 mb-4">
                        Upload an image of a burn to get started with AI-powered analysis
                  </p>
                  <div className="flex items-center justify-center space-x-6 text-xs text-gray-500">
                    <div className="flex items-center">
                          <svg className="w-3 h-3 mr-1 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                          Instant Results
                    </div>
                    <div className="flex items-center">
                          <svg className="w-3 h-3 mr-1 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                          AI-Powered
                    </div>
                    <div className="flex items-center">
                          <svg className="w-3 h-3 mr-1 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                          Secure
                    </div>
                  </div>
                </div>
              </div>
            )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analyze;
