import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect, useRef, useState } from 'react';

const Home = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
    const [visibleSections, setVisibleSections] = useState(new Set());
    const sectionsRef = useRef([]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setVisibleSections((prev) => new Set([...prev, entry.target.dataset.section]));
                        entry.target.classList.add('visible');
                    }
                });
            },
            { threshold: 0.2, rootMargin: '-50px' }
        );

        sectionsRef.current.forEach((section) => {
            if (section) observer.observe(section);
        });

        return () => observer.disconnect();
    }, []);

  const handleAnalyzeClick = (e) => {
    e.preventDefault();
    if (isAuthenticated) {
      navigate('/analyze');
    } else {
      navigate('/auth');
    }
  };

  return (
      <div className="min-h-screen bg-gradient-to-b from-white via-gray-50/30 to-white minimal-scale">
            {/* Hero Section - PROPER PROPORTIONS - FITS SCREEN */}
            <section
                ref={(el) => (sectionsRef.current[0] = el)}
                data-section="hero"
                className="relative min-h-screen flex items-center py-8 md:py-12 overflow-hidden"
            >
                {/* Animated Background Elements */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-20 left-10 w-72 h-72 bg-medical-blue/5 rounded-full blur-3xl animate-float"></div>
                    <div className="absolute bottom-20 right-20 w-96 h-96 bg-medical-teal/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-medical-blue/3 to-medical-teal/3 rounded-full blur-3xl animate-pulse-slow"></div>
                </div>

                <div className="relative max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 w-full">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12 items-center">
                        {/* Left Content */}
                        <div className={`scroll-slide-left lg:col-span-2 ${visibleSections.has('hero') ? 'visible' : ''}`}>
                            <div className="inline-block mb-4">
                                <span className="bg-gradient-to-r from-medical-blue to-medical-teal text-white px-5 py-2 rounded-full text-xs md:text-sm font-bold shadow-xl animate-fadeIn">
                                    🔥 AI-Powered Medical Technology
                                </span>
                            </div>
                            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-3 leading-tight">
                                <span className="bg-gradient-to-r from-medical-blue via-blue-600 to-medical-teal bg-clip-text text-transparent bg-[length:200%_auto] animate-gradientShift">
                                    Intelligent Analysis
                                </span>
                                <br />
                                <span className="text-gray-800">of Burn Scar</span>
                                <br />
                                <span className="text-gray-700">Progression</span>
              </h1>
                                                        <p className="text-base md:text-lg text-medical-blue font-medium mb-2">
                                AI-powered burn scar analysis (ViT, CNN, CNN-LSTM)
                            </p>
                                                        <p className="text-sm md:text-base text-medical-gray mb-6 leading-relaxed max-w-2xl">
                                                                  We use ViT, EfficientNet CNNs, and a CNN-LSTM sequence model for accurate per-image and progression analysis.
                                                        </p>
                            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleAnalyzeClick}
                                    className="group inline-flex items-center justify-center bg-gradient-to-r from-medical-blue via-blue-600 to-medical-teal text-white px-6 py-3 rounded-xl text-base font-bold hover:from-blue-600 hover:via-blue-700 hover:to-teal-600 transition-all duration-300 shadow-2xl hover:shadow-3xl transform hover:-translate-y-2 hover:scale-105"
              >
                                    <svg className="w-5 h-5 mr-2 group-hover:rotate-12 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Analyze Burn Image
                                    <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                    </svg>
              </button>
                                <Link
                                    to="/about"
                                    className="inline-flex items-center justify-center border-2 border-medical-blue text-medical-blue px-6 py-3 rounded-xl text-base font-semibold hover:bg-medical-blue hover:text-white transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                                >
                                    Learn More
                                </Link>
                            </div>
            </div>

                        {/* Right Visual */}
                        <div className={`hidden lg:block scroll-zoom lg:col-span-1 ${visibleSections.has('hero') ? 'visible' : ''}`}>
              <div className="relative">
                                <div className="bg-gradient-to-br from-white via-medical-blue/5 to-medical-teal/5 rounded-2xl p-8 shadow-md border border-gray-200/40 backdrop-blur-sm">
                                    <div className="bg-white rounded-xl p-6 shadow-sm animate-float">
                                        <svg className="w-48 h-48 text-medical-blue mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                </div>

                                {/* Floating Badges */}
                                <div className="absolute -bottom-6 -right-6 bg-white rounded-2xl p-6 shadow-2xl border border-gray-100 animate-fadeInUp" style={{ animationDelay: '0.5s' }}>
                                    <div className="flex items-center space-x-3">
                                        <div className="w-4 h-4 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-500/50"></div>
                                        <div>
                                            <span className="text-lg font-bold text-gray-800 block">AI Active</span>
                                            <span className="text-sm text-medical-gray">Real-time ready</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="absolute -top-6 -left-6 bg-gradient-to-r from-medical-blue to-medical-teal text-white rounded-2xl p-5 shadow-2xl animate-fadeInUp" style={{ animationDelay: '1s' }}>
                  <div className="flex items-center space-x-2">
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                        <span className="font-bold text-lg">95%+ Accuracy</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

            {/* Key Features Section - SHORTER, PROPER SPACING */}
            <section
                ref={(el) => (sectionsRef.current[1] = el)}
                data-section="features"
                className="py-12 md:py-16 bg-white relative"
            >
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Section Header */}
                    <div className={`text-center mb-16 scroll-slide-up ${visibleSections.has('features') ? 'visible' : ''}`}>
                        <div className="inline-block mb-4">
                            <span className="bg-gradient-to-r from-medical-teal to-medical-blue text-white px-5 py-2 rounded-full text-sm font-semibold shadow-lg">
                                ✨ Powerful Features
                            </span>
                        </div>
                        <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 mb-6">
                            <span className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 bg-clip-text text-transparent">
              Key Features
                            </span>
            </h2>
                        <p className="text-xl md:text-2xl text-medical-gray max-w-3xl mx-auto leading-relaxed">
              Comprehensive AI-powered tools for burn scar assessment and monitoring
              </p>
            </div>

                    {/* Features Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {[
                            {
                                icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
                                title: 'Burn Degree Detection',
                                description: 'Accurate classification of first, second, and third-degree burns using advanced AI vision models.',
                                bgClass: 'bg-gradient-to-br from-medical-blue/20 to-medical-blue/10',
                                iconClass: 'text-medical-blue',
                                borderClass: 'hover:border-medical-blue/30',
                                delay: '0.1s'
                            },
                            {
                                icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
                                title: 'Healing Stage Monitoring',
                                description: 'Track healing progression over time with detailed stage analysis and recovery metrics.',
                                bgClass: 'bg-gradient-to-br from-medical-teal/20 to-medical-teal/10',
                                iconClass: 'text-medical-teal',
                                borderClass: 'hover:border-medical-teal/30',
                                delay: '0.2s'
                            },
                            {
                                icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
                                title: 'Scar Progression Tracking',
                                description: 'Monitor scar development and changes with visual progression timelines and comparative analysis.',
                                bgClass: 'bg-gradient-to-br from-medical-blue/20 to-medical-blue/10',
                                iconClass: 'text-medical-blue',
                                borderClass: 'hover:border-medical-blue/30',
                                delay: '0.3s'
                            },
                            {
                                icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
                                title: 'Treatment Recommendations',
                                description: 'Receive evidence-based care guidance tailored to specific burn characteristics and healing stages.',
                                bgClass: 'bg-gradient-to-br from-medical-teal/20 to-medical-teal/10',
                                iconClass: 'text-medical-teal',
                                borderClass: 'hover:border-medical-teal/30',
                                delay: '0.4s'
                            }
                        ].map((feature, index) => (
                            <div
                                key={index}
                                className={`bg-white rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-500 border border-gray-200/50 ${feature.borderClass} transform hover:-translate-y-3 hover:scale-105 scroll-scale ${visibleSections.has('features') ? 'visible' : ''}`}
                                style={{ transitionDelay: feature.delay }}
                            >
                                <div className={`w-18 h-18 ${feature.bgClass} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                                    <svg className={`w-9 h-9 ${feature.iconClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={feature.icon} />
                </svg>
              </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-4 group-hover:text-medical-blue transition-colors duration-300">
                                    {feature.title}
              </h3>
                                <p className="text-base text-medical-gray leading-relaxed">
                                    {feature.description}
              </p>
            </div>
                        ))}
          </div>
        </div>
      </section>

            {/* How It Works Section - SHORTER, PROPER SPACING */}
            <section
                ref={(el) => (sectionsRef.current[2] = el)}
                data-section="howitworks"
                className="py-16 md:py-20 bg-gradient-to-b from-gray-50 to-white relative"
            >
                <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
                    {/* Section Header */}
                    <div className={`text-center mb-16 scroll-slide-down ${visibleSections.has('howitworks') ? 'visible' : ''}`}>
                        <div className="inline-block mb-4">
                            <span className="bg-gradient-to-r from-medical-blue to-medical-teal text-white px-5 py-2 rounded-full text-sm font-semibold shadow-lg">
                                🚀 Simple Process
                            </span>
                        </div>
                        <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 mb-6">
                            <span className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 bg-clip-text text-transparent">
              How It Works
                            </span>
            </h2>
                        <p className="text-xl md:text-2xl text-medical-gray max-w-3xl mx-auto leading-relaxed">
              Simple three-step process to get accurate burn analysis and recommendations
            </p>
          </div>
            
                    {/* Steps */}
                  <div className="relative">
                        {/* Animated Connection Line */}
                        <div className="hidden lg:block absolute top-28 left-0 right-0 h-1">
                            <div className="h-full bg-gradient-to-r from-medical-blue/20 via-medical-teal/40 to-medical-blue/20 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-medical-blue via-medical-teal to-medical-blue rounded-full animate-pulse" style={{ width: '100%' }}></div>
                </div>
              </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 lg:gap-12 relative">
                            {[
                                {
                                    number: '1',
                                    title: 'Upload Burn Image',
                                    description: 'Simply upload a clear image of the burn area. Our system accepts standard image formats (JPG, PNG, JPEG).',
                                    icon: 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12',
                                    bgGradient: 'bg-gradient-to-br from-medical-blue via-blue-600 to-medical-blue/80',
                                    iconColor: 'text-medical-blue',
                                    borderClass: 'hover:border-medical-blue/30',
                                    iconBg: 'bg-gradient-to-br from-medical-blue/20 via-medical-blue/10 to-medical-teal/10',
                                    textColor: 'text-medical-blue',
                                    delay: '0.1s'
                                },
                                {
                                    number: '2',
                                    title: 'AI Analyzes Scar',
                                    description: 'Advanced vision models (ViT and CNN) process the image to detect burn degree and assess healing progress; sequence models (CNN-LSTM) analyze multiple timepoints for true progression insights.',
                                    icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
                                    bgGradient: 'bg-gradient-to-br from-medical-teal via-teal-600 to-medical-teal/80',
                                    iconColor: 'text-medical-teal',
                                    borderClass: 'hover:border-medical-teal/30',
                                    iconBg: 'bg-gradient-to-br from-medical-teal/20 via-medical-teal/10 to-medical-blue/10',
                                    textColor: 'text-medical-teal',
                                    delay: '0.3s'
                                },
                                {
                                    number: '3',
                                    title: 'Get Progression & Care Guidance',
                                    description: 'Receive detailed analysis results, progression tracking, and personalized treatment recommendations instantly.',
                                    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
                                    bgGradient: 'bg-gradient-to-br from-medical-blue via-blue-600 to-medical-blue/80',
                                    iconColor: 'text-medical-blue',
                                    borderClass: 'hover:border-medical-blue/30',
                                    iconBg: 'bg-gradient-to-br from-medical-blue/20 via-medical-blue/10 to-medical-teal/10',
                                    textColor: 'text-medical-blue',
                                    delay: '0.5s'
                                }
                            ].map((step, index) => (
                                <div
                                    key={index}
                                    className={`bg-white rounded-3xl p-10 shadow-2xl hover:shadow-3xl transition-all duration-700 border-2 border-transparent ${step.borderClass} relative z-10 transform hover:-translate-y-4 hover:scale-105 scroll-rotate ${visibleSections.has('howitworks') ? 'visible' : ''}`}
                                    style={{ transitionDelay: step.delay }}
                                >
                                    <div className="flex items-center justify-center mb-8">
                                        <div className={`w-28 h-28 ${step.bgGradient} rounded-3xl flex items-center justify-center shadow-2xl animate-pulse-slow`}>
                                            <span className="text-5xl font-extrabold text-white">{step.number}</span>
                    </div>
                  </div>
                                    <div className="mb-8">
                                        <div className={`w-full h-56 ${step.iconBg} rounded-2xl flex items-center justify-center relative overflow-hidden`}>
                                            <svg className={`w-32 h-32 ${step.iconColor} relative z-10`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={step.icon} />
                      </svg>
                    </div>
                  </div>
                                    <h3 className="text-2xl font-bold text-gray-900 mb-4">
                                        {step.title}
                </h3>
                                    <p className="text-base text-medical-gray leading-relaxed mb-6">
                                        {step.description}
                </p>
                                    <div className={`flex items-center text-sm ${step.textColor} font-semibold`}>
                                        <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                                        {step.number === '1' && 'Secure & Private'}
                                        {step.number === '2' && 'AI-Powered Analysis'}
                                        {step.number === '3' && 'Instant Results'}
                </div>
              </div>
                            ))}
            </div>
          </div>
        </div>
      </section>

            {/* Trust & Disclaimer Section - SHORTER, PROPER SPACING */}
            <section
                ref={(el) => (sectionsRef.current[3] = el)}
                data-section="disclaimer"
                className="py-16 md:py-20 bg-white relative"
            >
                <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
                    <div className={`bg-white rounded-3xl p-12 md:p-16 shadow-2xl border-l-8 border-amber-400 scroll-slide-right ${visibleSections.has('disclaimer') ? 'visible' : ''}`}>
                        <div className="flex items-start gap-6">
                            <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
                                <svg className="w-10 h-10 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
                            </div>
              <div className="flex-1">
                                <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-6">
                  Medical Disclaimer
                </h2>
                                <div className="text-lg text-medical-gray leading-relaxed space-y-5">
                  <p>
                                        This system is designed as an <strong className="text-gray-900">assistive tool</strong> to support healthcare professionals
                                        and patients in monitoring burn scar progression. It is <strong className="text-gray-900">not intended</strong> to replace
                    professional medical diagnosis, treatment, or clinical judgment.
                  </p>
                  <p>
                    All analysis results and recommendations should be reviewed and validated by qualified medical
                    professionals. This tool provides supplementary information to aid in clinical decision-making
                    but should never be the sole basis for medical treatment decisions.
                  </p>
                                    <div className="bg-amber-50 rounded-xl p-5 border border-amber-200 mt-6">
                                        <p className="text-base text-amber-900">
                    <strong>Important:</strong> Always consult with a licensed healthcare provider for proper
                    diagnosis and treatment of burn injuries. In case of emergency, seek immediate medical attention.
                  </p>
                                    </div>
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
