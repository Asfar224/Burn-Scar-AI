import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { saveAnalysis, getUserAnalyses } from '../services/analysisService';
import * as pdfjsLib from 'pdfjs-dist';

const API_URL = 'http://localhost:8000';
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const Analyze = () => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef(null);
  const multiFileInputRef = useRef(null);
  
  // Model selection state
  const [selectedModel, setSelectedModel] = useState('vit');
  
  // Single image state (for ViT and CNN)
  const [selectedImage, setSelectedImage] = useState(null);
  const [preview, setPreview] = useState(null);
  
  // Multiple images state (for CNN-LSTM)
  const [selectedImages, setSelectedImages] = useState([]);
  const [previews, setPreviews] = useState([]);
  
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

  // Normalize analysis data
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
      imageUrl: data.imageUrl,
      images: data.images || data.imagesBase64 || (data.imageUrl ? [data.imageUrl] : []),
      model_used: data.model_used || data.modelUsed || data.model || selectedModel
    };
  };

  // Load history
  const loadHistoryRef = useRef(false);
  useEffect(() => {
    if (!user || !user.uid) {
      setHistory([]);
      return;
    }

    const loadHistory = async (showLoader = false) => {
      if (showLoader) {
        setLoadingHistory(true);
      }
      try {
        const analyses = await getUserAnalyses(user.uid);
        setHistory(analyses);
        loadHistoryRef.current = true;
      } catch (error) {
        console.error('Error loading history:', error);
        setHistory([]);
      } finally {
        if (showLoader) {
          setLoadingHistory(false);
        }
      }
    };

    if (!loadHistoryRef.current) {
      loadHistory(true);
    }

    const refreshInterval = setInterval(() => {
      if (user && user.uid) {
        loadHistory(false);
      }
    }, 5000);

    return () => clearInterval(refreshInterval);
  }, [user]);

  useEffect(() => {
    if (location.state?.selectedAnalysis) {
      const analysis = location.state.selectedAnalysis;
      const normalized = normalizeAnalysisData(analysis);
      setResults(normalized);
      // If history entry contains multiple images, set previews and preview to first
      if (analysis.images && analysis.images.length > 0) {
        setPreviews(analysis.images);
        setPreview(analysis.images[0]);
        setSelectedImages([]);
      } else if (analysis.imageUrl) {
        setPreview(analysis.imageUrl);
      }
      setShowPrecautions(false);
    }
  }, [location]);

  const handleFileSelect = (file) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Image size must be less than 10MB');
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

  // Handle PDF extraction (CNN-LSTM)
  const handlePDFSelect = async (file) => {
    try {
      setError(null);
      setShowPrecautions(false);
      
      const pdf = await pdfjsLib.getDocument(file).promise;

      for (let i = 0; i < Math.min(pdf.numPages, 10); i++) {
        const page = await pdf.getPage(i + 1);
        const canvas = document.createElement('canvas');
        const viewport = page.getViewport({ scale: 2 });
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
        
        canvas.toBlob((blob) => {
          const imageFile = new File([blob], `pdf-page-${i + 1}.png`, { type: 'image/png' });
          setSelectedImages((prev) => [...prev, imageFile]);
          setPreviews((prev) => [...prev, canvas.toDataURL('image/png')]);
        }, 'image/png');
      }

      setResults(null);
    } catch (err) {
      setError('Failed to extract images from PDF. Please ensure it is a valid PDF file.');
      console.error('PDF error:', err);
    }
  };

  // Handle multiple files (CNN-LSTM)
  const handleMultipleFilesSelect = (files) => {
    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));

    if (imageFiles.length === 0) {
      setError('Please select at least one image');
      return;
    }

    // enforce cumulative limit of 10 images
    if ((selectedImages.length + imageFiles.length) > 10) {
      setError('Maximum 10 images allowed in total');
      return;
    }

    setError(null);
    setResults(null);
    setShowPrecautions(false);

    // Append new images to existing selection
    setSelectedImages((prev) => [...prev, ...imageFiles]);

    // Read previews for new files and append
    const newPreviews = [];
    let loadedCount = 0;
    imageFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        newPreviews.push(reader.result);
        loadedCount++;
        if (loadedCount === imageFiles.length) {
          setPreviews((prev) => [...prev, ...newPreviews]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);

    if (selectedModel === 'cnn_lstm') {
      const files = e.dataTransfer.files;
      const pdfFile = Array.from(files).find(f => f.type === 'application/pdf');
      if (pdfFile) {
        handlePDFSelect(pdfFile);
      } else {
        handleMultipleFilesSelect(files);
      }
    } else {
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  // Main analyze function
  const handleAnalyze = async () => {
    if (selectedModel === 'cnn_lstm') {
      if (selectedImages.length < 2) {
        setError('CNN-LSTM requires at least 2 images to analyze progression');
        return;
      }
      await analyzeSequence();
    } else {
      if (!selectedImage) {
        setError('Please select an image first');
        return;
      }
      await analyzeSingleImage();
    }
  };

  const analyzeSingleImage = async () => {
    setAnalyzing(true);
    setError(null);
    setResults(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedImage);
      formData.append('model', selectedModel);

      if (user && user.uid) {
        formData.append('userId', user.uid);
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
      const normalized = normalizeAnalysisData(data);
      setResults(normalized);

      if (user && user.uid) {
        try {
          await saveAnalysis(user.uid, selectedImage, data);
          const analyses = await getUserAnalyses(user.uid);
          setHistory(analyses);
        } catch (saveError) {
          console.error('Error saving analysis:', saveError);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to analyze image. Please try again.');
      console.error('Analysis error:', err);
    } finally {
      setAnalyzing(false);
    }
  };

  const analyzeSequence = async () => {
    setAnalyzing(true);
    setError(null);
    setResults(null);

    try {
      const formData = new FormData();
      selectedImages.forEach((img) => {
        formData.append('files', img);
      });
      formData.append('model', 'cnn_lstm');

      if (user && user.uid) {
        formData.append('userId', user.uid);
      }

      const response = await fetch(`${API_URL}/analyze`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Sequence analysis failed');
      }

      const data = await response.json();
      const normalized = normalizeAnalysisData(data);
      setResults(normalized);

      if (user && user.uid) {
        try {
          await saveAnalysis(user.uid, selectedImages, data);
          const analyses = await getUserAnalyses(user.uid);
          setHistory(analyses);
        } catch (saveError) {
          console.error('Error saving sequence analysis:', saveError);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to analyze sequence. Please try again.');
      console.error('Sequence analysis error:', err);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleReset = () => {
    setSelectedImage(null);
    setSelectedImages([]);
    setPreview(null);
    setPreviews([]);
    setResults(null);
    setError(null);
    setShowPrecautions(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (multiFileInputRef.current) multiFileInputRef.current.value = '';
  };

  const handleModelChange = (model) => {
    setSelectedModel(model);
    handleReset();
  };

  // Model instructions
  const getModelInstructions = (model) => {
    const instructions = {
      vit: {
        title: 'Vision Transformer (ViT)',
        description: 'Advanced AI model for single image analysis',
        tips: [
          'Upload a single clear image of the burn',
          'Ensure good lighting and minimal shadows',
          'Capture the entire affected area',
          'Image should be in focus and well-framed'
        ]
      },
      cnn: {
        title: 'Convolutional Neural Network (CNN)',
        description: 'Fast and reliable single image analysis',
        tips: [
          'Upload one high-quality image',
          'Provide consistent distance from the burn',
          'Natural lighting is recommended',
          'Avoid extreme angles or shadows'
        ]
      },
      cnn_lstm: {
        title: 'CNN-LSTM Sequence Analyzer',
        description: 'Analyzes burn progression from multiple images',
        tips: [
          'Upload 2-10 progressive images showing healing stages',
          'Order images chronologically from fresh to healing',
          'Or upload a PDF containing multiple burn images',
          'Each image should show the same area/angle'
        ]
      }
    };
    return instructions[model] || instructions.vit;
  };

  const instructions = getModelInstructions(selectedModel);

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
    return results.burn_degree_index >= 2 || (results.burn_degree_index === 1 && results.confidence > 70);
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
      {/* History Sidebar */}
      <div className={`fixed left-0 top-16 h-[calc(100vh-4rem)] bg-gray-50 border-r border-gray-200/50 z-30 transition-all duration-300 flex flex-col ${
        isHistoryExpanded ? 'w-80' : 'w-16'
      }`}>
        <div className="p-3 border-b border-gray-200/50 flex items-center justify-center">
          <button
            onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors group"
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

        {isHistoryExpanded ? (
          <>
            <div className="p-3 border-b border-gray-200/50">
              <h3 className="text-sm font-medium text-gray-700 mb-0.5">History</h3>
              <p className="text-xs text-gray-500">{history.length} analyses</p>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {loadingHistory ? (
                <div className="flex items-center justify-center py-8">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-medical-blue"></div>
                </div>
              ) : history.length > 0 ? (
                history.map((analysis) => (
                  <div
                    key={analysis.id}
                    className="bg-white rounded-md p-2.5 cursor-pointer hover:bg-gray-50 transition-all border border-gray-200/50 hover:border-gray-300"
                    onClick={() => {
                      const normalized = normalizeAnalysisData(analysis);
                      setResults(normalized);
                      // Load all images if present
                      if (analysis.images && analysis.images.length > 0) {
                        setPreviews(analysis.images);
                        setPreview(analysis.images[0]);
                        setSelectedImages([]);
                      } else if (analysis.imageUrl) {
                        setPreviews([]);
                        setPreview(analysis.imageUrl);
                      }
                      setShowPrecautions(false);
                    }}
                  >
                    <div className="flex gap-2">
                      <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 shadow-sm">
                        <img src={analysis.imageUrl} alt="Analysis" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-xs text-gray-900 truncate">{analysis.burnDegree}</p>
                        <p className="text-xs text-medical-gray mt-0.5 truncate">{analysis.modelUsed || analysis.model_used || analysis.healingStage}</p>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <span className="text-xs font-medium text-medical-blue">{analysis.confidence}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-xs text-gray-500">No history yet</p>
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>

      {/* Main Content */}
      <div className={`flex-1 transition-all duration-300 ${isHistoryExpanded ? 'ml-80' : 'ml-16'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Header */}
          <div className="mb-6 animate-fadeIn">
            <h1 className="text-2xl font-semibold text-gray-900 mb-1">AI Burn Analysis</h1>
            <p className="text-sm text-gray-500">Upload an image to receive instant AI-powered burn assessment</p>
          </div>

          {/* Model Selector */}
          <div className="mb-6 animate-slideUp">
            <div className="bg-white rounded-lg border border-gray-200/50 p-5 shadow-sm">
              <h2 className="text-sm font-medium text-gray-700 mb-4">Select Analysis Model</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {['vit', 'cnn', 'cnn_lstm'].map((model) => (
                  <button
                    key={model}
                    onClick={() => handleModelChange(model)}
                    className={`p-4 rounded-lg border-2 transition-all duration-300 text-left ${
                      selectedModel === model
                        ? 'border-medical-blue bg-medical-blue/5 shadow-md'
                        : 'border-gray-200 bg-gray-50 hover:border-medical-blue/50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-sm text-gray-900">
                          {model === 'vit' ? 'Vision Transformer' : model === 'cnn' ? 'CNN' : 'CNN-LSTM'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {model === 'vit' && 'Single image analysis'}
                          {model === 'cnn' && 'Fast single image analysis'}
                          {model === 'cnn_lstm' && 'Multi-image progression'}
                        </p>
                      </div>
                      {selectedModel === model && (
                        <svg className="w-5 h-5 text-medical-blue" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Precautions */}
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
                  </ul>
                </div>
                <button onClick={() => setShowPrecautions(false)} className="text-blue-400 hover:text-blue-600">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Doctor Warning */}
          {shouldShowDoctorWarning(results) && (
            <div className="bg-gradient-to-r from-red-50 to-rose-50 rounded-lg border-2 border-red-300 p-5 mb-4 animate-slideUp">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-red-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg animate-pulse">
                  <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-red-900 mb-2">⚠️ Immediate Medical Attention Required</h3>
                  <p className="text-red-800 font-semibold mb-4">Your condition appears to be severe. Please visit a doctor immediately.</p>
                  <div className="bg-white rounded-xl p-4">
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Call emergency services: <strong>911</strong></li>
                      <li>• Visit the nearest hospital emergency room</li>
                      <li>• Contact your primary care physician immediately</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Upload & Results */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Upload Section */}
            <div className="lg:col-span-1">
              <div className="bg-gray-50 rounded-lg border border-gray-200/50 p-5 sticky top-20">
                {/* Model Instructions */}
                <div className="bg-white rounded-lg p-4 mb-4 border border-gray-200/50">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">{instructions.title}</h3>
                  <p className="text-xs text-gray-600 mb-3">{instructions.description}</p>
                  <ul className="text-xs text-gray-600 space-y-1">
                    {instructions.tips.map((tip, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <svg className="w-3 h-3 text-medical-blue mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <h2 className="text-sm font-medium text-gray-700 mb-4 flex items-center">
                  <svg className="w-4 h-4 text-medical-blue mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Upload {selectedModel === 'cnn_lstm' ? 'Images' : 'Image'}
                </h2>

                {selectedModel === 'cnn_lstm' ? (
                  // CNN-LSTM multi-image upload
                  previews.length === 0 ? (
                    <div
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      className={`border-2 border-dashed rounded-lg p-6 text-center transition-all cursor-pointer ${
                        isDragging ? 'border-medical-blue bg-medical-blue/5 scale-105' : 'border-gray-300 hover:border-medical-blue/50'
                      }`}
                      onClick={() => multiFileInputRef.current?.click()}
                    >
                      <div className="flex flex-col items-center">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors ${isDragging ? 'bg-medical-blue/10' : 'bg-gray-100'}`}>
                          <svg className={`w-8 h-8 ${isDragging ? 'text-medical-blue' : 'text-medical-gray'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <p className="text-base font-medium text-gray-700 mb-2">Drop images or PDF here</p>
                        <p className="text-xs text-medical-gray mb-3">or click to browse</p>
                        <input
                          ref={multiFileInputRef}
                          type="file"
                          multiple
                          accept="image/*,.pdf"
                          onChange={(e) => {
                            const files = e.target.files;
                            if (files) {
                              const pdfFile = Array.from(files).find(f => f.type === 'application/pdf');
                              if (pdfFile) {
                                handlePDFSelect(pdfFile);
                              } else {
                                handleMultipleFilesSelect(files);
                              }
                            }
                          }}
                          className="hidden"
                        />
                        <div className="text-xs text-gray-500 bg-white rounded-md px-3 py-2 border border-gray-200/50">
                          <span className="font-medium">Supported:</span> Images or PDF<br/>
                          <span className="font-medium">Max:</span> 10 pages/images
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                        {previews.map((preview, idx) => (
                          <div key={idx} className="relative rounded-lg overflow-hidden border border-gray-200/50 bg-white">
                            <img src={preview} alt={`Preview ${idx + 1}`} className="w-full h-24 object-cover" />
                            <span className="absolute bottom-1 right-1 bg-medical-blue text-white text-xs px-2 py-1 rounded">{idx + 1}</span>
                          </div>
                        ))}

                        {/* Add Image Tile */}
                        {selectedImages.length < 10 && (
                          <div
                            onClick={() => multiFileInputRef.current?.click()}
                            className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white cursor-pointer p-3 hover:border-medical-blue/50 transition-colors"
                          >
                            <svg className="w-8 h-8 text-medical-blue mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            <p className="text-xs text-gray-600">Add image</p>
                            <input
                              ref={multiFileInputRef}
                              type="file"
                              multiple
                              accept="image/*,.pdf"
                              onChange={(e) => {
                                const files = e.target.files;
                                if (files) {
                                  const pdfFile = Array.from(files).find(f => f.type === 'application/pdf');
                                  if (pdfFile) {
                                    handlePDFSelect(pdfFile);
                                  } else {
                                    handleMultipleFilesSelect(files);
                                  }
                                }
                              }}
                              className="hidden"
                            />
                          </div>
                        )}
                      </div>
                      <button
                        onClick={handleReset}
                        className="w-full text-sm text-medical-blue hover:text-blue-600 transition-colors py-2 border border-medical-blue/20 rounded hover:bg-medical-blue/5"
                      >
                        Clear Selection
                      </button>
                      {selectedImages.length > 0 && !results && (
                        <button
                          onClick={handleAnalyze}
                          disabled={analyzing || selectedImages.length < 2}
                          className="w-full bg-gradient-to-r from-medical-blue to-blue-600 text-white py-3 px-4 rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50 flex items-center justify-center"
                        >
                          {analyzing ? (
                            <>
                              <svg className="animate-spin -ml-1 mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Analyzing Sequence...
                            </>
                          ) : (
                            <>
                              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                              Analyze {selectedImages.length} Images
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  )
                ) : (
                  // Single image upload (ViT/CNN)
                  !preview ? (
                    <div
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      className={`border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer ${
                        isDragging ? 'border-medical-blue bg-medical-blue/5 scale-105' : 'border-gray-300 hover:border-medical-blue/50'
                      }`}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <div className="flex flex-col items-center">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors ${isDragging ? 'bg-medical-blue/10' : 'bg-gray-100'}`}>
                          <svg className={`w-8 h-8 ${isDragging ? 'text-medical-blue' : 'text-medical-gray'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <p className="text-base font-medium text-gray-700 mb-2">{isDragging ? 'Drop your image here' : 'Drag & drop your image'}</p>
                        <p className="text-sm text-medical-gray mb-4">or click to browse</p>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) handleFileSelect(file);
                          }}
                          className="hidden"
                        />
                        <div className="text-xs text-gray-500 bg-white rounded-md px-3 py-2 border border-gray-200/50">
                          <span className="font-medium">Supported:</span> JPG, PNG<br/>
                          <span className="font-medium">Max size:</span> 10MB
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="relative rounded-lg overflow-hidden border border-gray-200/50 bg-white group">
                        <img src={preview} alt="Preview" className="w-full h-64 object-contain" />
                        <button
                          onClick={handleReset}
                          className="absolute top-3 right-3 bg-white rounded-full p-2 shadow-lg hover:bg-gray-50 opacity-0 group-hover:opacity-100 transition-opacity"
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
                          className="w-full bg-gradient-to-r from-medical-blue to-blue-600 text-white py-3 px-4 rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50 flex items-center justify-center"
                        >
                          {analyzing ? (
                            <>
                              <svg className="animate-spin -ml-1 mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24">
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
                  )
                )}

                {error && (
                  <div className="mt-4 bg-red-50 border-l-4 border-red-400 text-red-700 px-4 py-3 rounded-lg text-sm animate-slideUp">
                    {error}
                  </div>
                )}
              </div>
            </div>

            {/* Results Section */}
            <div className="lg:col-span-2 space-y-4">
              {results ? (
                <>
                  {/* Main Result Card */}
                  <div className={`bg-gradient-to-br ${getBurnDegreeColor(results.burn_degree)} rounded-lg border border-gray-200/50 p-5 animate-slideUp`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-10 h-10 bg-white/90 rounded-md flex items-center justify-center">
                            <svg className={`w-5 h-5 ${getBurnDegreeTextColor(results.burn_degree)}`} fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div>
                            <h3 className="text-xs font-medium text-gray-600 mb-0.5">Detected Burn Type</h3>
                            <h2 className={`text-2xl font-bold ${getBurnDegreeTextColor(results.burn_degree)}`}>{results.burn_degree}</h2>
                          </div>
                        </div>
                        <div className="text-sm text-gray-600 mb-2">
                          <span className="font-medium">Model:</span> {results.model_used || results.model || 'unknown'}
                        </div>
                        {results.burn_info && (
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getSeverityBadgeColor(results.burn_info.severity)}`}>
                              {results.burn_info.severity} Severity
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
                  </div>

                  {/* Confidence Breakdown */}
                  <div className="bg-gray-50 rounded-lg border border-gray-200/50 p-5 animate-slideUp">
                    <h3 className="text-sm font-medium text-gray-700 mb-4">Prediction Confidence</h3>
                    <div className="space-y-3">
                      {Object.entries(results.confidence_breakdown || {}).map(([degree, confidence]) => (
                        <div key={degree}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-medium text-gray-600">{degree}</span>
                            <span className="text-xs font-semibold text-gray-900">{confidence}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${degree === results.burn_degree ? 'bg-medical-blue' : 'bg-gray-300'}`}
                              style={{ width: `${confidence}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Healing & Progression */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-lg border border-gray-200/50 p-5 animate-slideUp">
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Healing Stage</h3>
                      <p className="text-lg font-semibold text-gray-900">{results.healing_stage}</p>
                    </div>
                    {/* Enhanced progression UI for CNN-LSTM sequences */}
                    {results && (results.model_used === 'cnn_lstm' || selectedModel === 'cnn_lstm') ? (
                      <div className="bg-white rounded-lg border border-gray-200/50 p-5 shadow-md animate-slideUp">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-800">Sequence Progression</h3>
                            <p className="text-sm text-gray-500">Detailed timeline and overall sequence verdict</p>
                          </div>
                          <div className="text-right">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${results.trend === 'worsening' ? 'bg-red-100 text-red-800' : results.trend === 'improving' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                              {results.trend ? results.trend.charAt(0).toUpperCase() + results.trend.slice(1) : 'Stable'}
                            </span>
                          </div>
                        </div>

                        {/* Top verdict */}
                        <div className="flex items-center gap-4 mb-4">
                          <div className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center">
                            <img src={previews && previews[previews.length - 1] ? previews[previews.length - 1] : (results.images && results.images[results.images.length - 1]) || results.imageUrl} alt="Last frame" className="w-full h-full object-cover" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Overall Sequence Prediction</p>
                            <div className="flex items-baseline gap-3">
                              <h2 className="text-2xl font-bold text-gray-900">{(results.sequence_prediction && results.sequence_prediction.burn_degree) || results.burn_degree}</h2>
                              <span className="text-sm text-gray-600">{(results.sequence_prediction && results.sequence_prediction.confidence) ? `${results.sequence_prediction.confidence}%` : `${results.confidence}%`}</span>
                            </div>
                            <p className="text-sm text-medical-gray mt-1">{results.progression_summary}</p>
                          </div>
                        </div>

                        {/* Timeline */}
                        <div className="overflow-x-auto py-2">
                          <div className="flex items-center gap-4">
                            {(results.predictions || []).map((p, idx) => (
                              <div key={idx} className="flex-shrink-0 w-36 bg-gray-50 rounded-lg border border-gray-100 p-2 text-center">
                                <div className="w-full h-20 rounded-md overflow-hidden mb-2">
                                  <img src={previews && previews[idx] ? previews[idx] : (results.images && results.images[idx]) || results.imageUrl} alt={`step-${idx+1}`} className="w-full h-full object-cover" />
                                </div>
                                <div className="text-xs font-medium text-gray-700">Step {idx + 1}</div>
                                <div className="text-xs text-gray-500">{p.burn_degree}</div>
                                <div className="text-xs text-gray-600 mt-1">{p.confidence}%</div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Per-image confidence bars */}
                        <div className="mt-4 space-y-2">
                          {(results.predictions || []).map((p, idx) => (
                            <div key={`bar-${idx}`} className="flex items-center gap-3">
                              <div className="w-10 text-xs text-gray-600">{idx + 1}</div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                  <div className="text-xs text-gray-700">{p.burn_degree}</div>
                                  <div className="text-xs text-gray-700">{p.confidence}%</div>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div className="h-2 rounded-full bg-medical-blue" style={{ width: `${p.confidence}%` }} />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gray-50 rounded-lg border border-gray-200/50 p-5 animate-slideUp">
                        <h3 className="text-sm font-medium text-gray-700 mb-2">Progression</h3>
                        <p className="text-xs text-gray-600">{results.progression_summary}</p>
                      </div>
                    )}
                  </div>

                  {/* Recommendations */}
                  <div className="bg-gray-50 rounded-lg border border-gray-200/50 p-5 animate-slideUp">
                    <h3 className="text-sm font-medium text-gray-700 mb-4">Treatment Recommendations</h3>
                    <div className="space-y-2">
                      {results.recommendations.map((rec, idx) => (
                        <div key={idx} className="flex items-start bg-white rounded-md p-3 border border-gray-200/50">
                          <svg className="w-4 h-4 text-medical-teal mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span className="text-xs text-gray-700">{rec}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-gray-50 rounded-lg border border-gray-200/50 p-12 text-center animate-fadeIn">
                  <div className="max-w-md mx-auto">
                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready to Analyze</h3>
                    <p className="text-xs text-gray-500">Upload {selectedModel === 'cnn_lstm' ? 'multiple images or a PDF' : 'an image'} to get started</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analyze;
