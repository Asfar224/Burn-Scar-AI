import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Home = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleAnalyzeClick = (e) => {
    e.preventDefault();
    if (isAuthenticated) {
      navigate('/analyze');
    } else {
      navigate('/auth');
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-medical-blue/5 via-white to-medical-teal/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                Intelligent Analysis of Burn Scar Progression
              </h1>
              <p className="text-xl md:text-2xl text-medical-blue font-semibold mb-4">
                AI-powered burn scar analysis & healing insights
              </p>
              <p className="text-lg text-medical-gray mb-8 leading-relaxed">
                Advanced Vision Transformer technology for accurate burn degree detection,
                healing stage monitoring, and personalized treatment recommendations.
                Supporting healthcare professionals with intelligent image analysis.
              </p>
              <button
                onClick={handleAnalyzeClick}
                className="inline-flex items-center bg-medical-blue text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors duration-200 shadow-md hover:shadow-lg"
              >
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Analyze Burn Image
              </button>
            </div>
            <div className="hidden lg:block">
              <div className="relative">
                <div className="bg-gradient-to-br from-medical-blue/20 to-medical-teal/20 rounded-2xl p-8 aspect-square flex items-center justify-center">
                  <div className="bg-white rounded-xl p-6 shadow-xl">
                    <svg className="w-32 h-32 text-medical-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                </div>
                <div className="absolute -bottom-4 -right-4 bg-white rounded-xl p-4 shadow-lg border border-gray-100">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-gray-700">AI Active</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Key Features Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Key Features
            </h2>
            <p className="text-lg text-medical-gray max-w-2xl">
              Comprehensive AI-powered tools for burn scar assessment and monitoring
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl p-8 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 hover:border-medical-blue/20">
              <div className="w-14 h-14 bg-medical-blue bg-opacity-10 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-medical-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Burn Degree Detection
              </h3>
              <p className="text-medical-gray leading-relaxed text-sm">
                Accurate classification of first, second, and third-degree burns using advanced AI vision models.
              </p>
            </div>

            <div className="bg-white rounded-xl p-8 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 hover:border-medical-teal/20">
              <div className="w-14 h-14 bg-medical-teal bg-opacity-10 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-medical-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Healing Stage Monitoring
              </h3>
              <p className="text-medical-gray leading-relaxed text-sm">
                Track healing progression over time with detailed stage analysis and recovery metrics.
              </p>
            </div>

            <div className="bg-white rounded-xl p-8 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 hover:border-medical-blue/20">
              <div className="w-14 h-14 bg-medical-blue bg-opacity-10 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-medical-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Scar Progression Tracking
              </h3>
              <p className="text-medical-gray leading-relaxed text-sm">
                Monitor scar development and changes with visual progression timelines and comparative analysis.
              </p>
            </div>

            <div className="bg-white rounded-xl p-8 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 hover:border-medical-teal/20">
              <div className="w-14 h-14 bg-medical-teal bg-opacity-10 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-medical-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Treatment Recommendations
              </h3>
              <p className="text-medical-gray leading-relaxed text-sm">
                Receive evidence-based care guidance tailored to specific burn characteristics and healing stages.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="bg-soft-gray py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-lg text-medical-gray max-w-2xl">
              Simple three-step process to get accurate burn analysis and recommendations
            </p>
          </div>
          <div className="relative">
            {/* Connection Line for Desktop */}
            <div className="hidden md:block absolute top-24 left-0 right-0 h-0.5 bg-gradient-to-r from-medical-blue/20 via-medical-teal/20 to-medical-blue/20"></div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
              <div className="bg-white rounded-xl p-8 shadow-md hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-medical-blue/30 relative z-10">
                <div className="flex items-center justify-center mb-6">
                  <div className="relative">
                    <div className="w-20 h-20 bg-gradient-to-br from-medical-blue to-medical-blue/80 rounded-2xl flex items-center justify-center shadow-lg">
                      <span className="text-3xl font-bold text-white">1</span>
                    </div>
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                </div>
                <div className="mb-6">
                  <div className="w-full h-56 bg-gradient-to-br from-medical-blue/20 via-medical-blue/10 to-medical-teal/10 rounded-xl flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
                    <svg className="w-24 h-24 text-medical-blue relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <div className="absolute bottom-2 right-2 bg-white rounded-lg px-2 py-1 text-xs font-medium text-medical-blue shadow-sm">
                      Upload
                    </div>
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Upload Burn Image
                </h3>
                <p className="text-medical-gray leading-relaxed text-sm">
                  Simply upload a clear image of the burn area. Our system accepts standard image formats (JPG, PNG, JPEG).
                </p>
                <div className="mt-4 flex items-center text-sm text-medical-blue">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Secure & Private
                </div>
              </div>

              <div className="bg-white rounded-xl p-8 shadow-md hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-medical-teal/30 relative z-10">
                <div className="flex items-center justify-center mb-6">
                  <div className="relative">
                    <div className="w-20 h-20 bg-gradient-to-br from-medical-teal to-medical-teal/80 rounded-2xl flex items-center justify-center shadow-lg">
                      <span className="text-3xl font-bold text-white">2</span>
                    </div>
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                </div>
                <div className="mb-6">
                  <div className="w-full h-56 bg-gradient-to-br from-medical-teal/20 via-medical-teal/10 to-medical-blue/10 rounded-xl flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
                    <div className="relative z-10">
                      <svg className="w-24 h-24 text-medical-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                        <div className="w-16 h-16 border-4 border-medical-teal border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    </div>
                    <div className="absolute bottom-2 right-2 bg-white rounded-lg px-2 py-1 text-xs font-medium text-medical-teal shadow-sm">
                      Processing
                    </div>
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  AI Analyzes Scar
                </h3>
                <p className="text-medical-gray leading-relaxed text-sm">
                  Advanced Vision Transformer models process the image to detect burn degree and assess healing progress in seconds.
                </p>
                <div className="mt-4 flex items-center text-sm text-medical-teal">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  AI-Powered Analysis
                </div>
              </div>

              <div className="bg-white rounded-xl p-8 shadow-md hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-medical-blue/30 relative z-10">
                <div className="flex items-center justify-center mb-6">
                  <div className="relative">
                    <div className="w-20 h-20 bg-gradient-to-br from-medical-blue to-medical-blue/80 rounded-2xl flex items-center justify-center shadow-lg">
                      <span className="text-3xl font-bold text-white">3</span>
                    </div>
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                </div>
                <div className="mb-6">
                  <div className="w-full h-56 bg-gradient-to-br from-medical-blue/20 via-medical-blue/10 to-medical-teal/10 rounded-xl flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
                    <div className="relative z-10 text-center">
                      <svg className="w-24 h-24 text-medical-blue mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <div className="absolute top-4 right-4 bg-green-500 rounded-full w-3 h-3 animate-pulse"></div>
                    </div>
                    <div className="absolute bottom-2 right-2 bg-white rounded-lg px-2 py-1 text-xs font-medium text-medical-blue shadow-sm">
                      Complete
                    </div>
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Get Progression & Care Guidance
                </h3>
                <p className="text-medical-gray leading-relaxed text-sm">
                  Receive detailed analysis results, progression tracking, and personalized treatment recommendations instantly.
                </p>
                <div className="mt-4 flex items-center text-sm text-medical-blue">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Instant Results
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Disclaimer Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-xl p-8 shadow-sm border-l-4 border-amber-400">
            <div className="flex items-start mb-6">
              <svg className="w-8 h-8 text-amber-500 mr-4 mt-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Medical Disclaimer
                </h2>
                <div className="text-medical-gray leading-relaxed space-y-4">
                  <p>
                    This system is designed as an <strong>assistive tool</strong> to support healthcare professionals
                    and patients in monitoring burn scar progression. It is <strong>not intended</strong> to replace
                    professional medical diagnosis, treatment, or clinical judgment.
                  </p>
                  <p>
                    All analysis results and recommendations should be reviewed and validated by qualified medical
                    professionals. This tool provides supplementary information to aid in clinical decision-making
                    but should never be the sole basis for medical treatment decisions.
                  </p>
                  <p className="text-sm pt-4 border-t border-gray-200">
                    <strong>Important:</strong> Always consult with a licensed healthcare provider for proper
                    diagnosis and treatment of burn injuries. In case of emergency, seek immediate medical attention.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
