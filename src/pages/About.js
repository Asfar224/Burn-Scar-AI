import { useEffect, useRef, useState } from 'react';

const About = () => {
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

  return (
      <div className="min-h-screen bg-gradient-to-b from-white via-gray-50/30 to-white minimal-scale">
            {/* Project Overview Section - PROPER PROPORTIONS - FITS SCREEN */}
            <section
                ref={(el) => (sectionsRef.current[0] = el)}
                data-section="overview"
                className="relative min-h-[75vh] flex items-center py-10 md:py-14 overflow-hidden"
            >
                {/* Animated Background */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-32 right-20 w-80 h-80 bg-medical-blue/5 rounded-full blur-3xl animate-float"></div>
                    <div className="absolute bottom-32 left-20 w-96 h-96 bg-medical-teal/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }}></div>
                </div>

                <div className="relative max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 w-full">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
                        {/* Left Content */}
                        <div className={`scroll-slide-left ${visibleSections.has('overview') ? 'visible' : ''}`}>
                            <div className="inline-block mb-4">
                                <span className="bg-gradient-to-r from-medical-teal to-medical-blue text-white px-5 py-2 rounded-full text-xs md:text-sm font-bold shadow-xl animate-fadeIn">
                                    📋 Project Overview
                                </span>
                            </div>
                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 mb-6 leading-tight">
                                <span className="bg-gradient-to-r from-medical-blue via-blue-600 to-medical-teal bg-clip-text text-transparent bg-[length:200%_auto] animate-gradientShift">
                                    About the
                                </span>
                                <br />
                                <span className="text-gray-800">Project</span>
                            </h1>
                            <div className="space-y-4">
                                <div>
                                    <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">
                                        Project Overview
                                    </h2>
                                    <p className="text-base md:text-lg text-medical-gray leading-relaxed mb-3">
                                        The <strong className="text-gray-900">Intelligent Analysis of Burn Scar Progression with Treatment Recommendations</strong> is
                                        a cutting-edge medical AI system designed to revolutionize how healthcare professionals monitor and
                                        assess burn injuries. This system leverages advanced artificial intelligence to provide accurate,
                                        consistent, and timely analysis of burn scars.
                                    </p>
                                    <p className="text-base md:text-lg text-medical-gray leading-relaxed">
                                        Burn scar monitoring is critical for ensuring proper healing and preventing complications. Traditional
                                        assessment methods rely heavily on visual inspection and clinical experience, which can vary between
                                        practitioners and over time.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Right Stats */}
                        <div className={`hidden lg:block scroll-zoom ${visibleSections.has('overview') ? 'visible' : ''}`}>
                            <div className="bg-white rounded-3xl p-12 shadow-2xl border border-gray-200/50 backdrop-blur-sm">
                                <div className="grid grid-cols-2 gap-6">
                                    {[
                                        { value: '95%+', label: 'Accuracy Rate', bgClass: 'bg-gradient-to-br from-medical-blue/20 to-medical-blue/10', textClass: 'text-medical-blue', barClass: 'bg-gradient-to-r from-medical-blue to-medical-blue/80', barBg: 'bg-medical-blue/20', delay: '0.1s' },
                                        { value: '24/7', label: 'Available', bgClass: 'bg-gradient-to-br from-medical-teal/20 to-medical-teal/10', textClass: 'text-medical-teal', barClass: 'bg-gradient-to-r from-medical-teal to-medical-teal/80', barBg: 'bg-medical-teal/20', delay: '0.2s' },
                                        { value: 'AI', label: 'Powered', bgClass: 'bg-gradient-to-br from-medical-blue/20 to-medical-blue/10', textClass: 'text-medical-blue', barClass: 'bg-gradient-to-r from-medical-blue to-medical-blue/80', barBg: 'bg-medical-blue/20', delay: '0.3s' },
                                        { value: 'ViT', label: 'Technology', bgClass: 'bg-gradient-to-br from-medical-teal/20 to-medical-teal/10', textClass: 'text-medical-teal', barClass: 'bg-gradient-to-r from-medical-teal to-medical-teal/80', barBg: 'bg-medical-teal/20', delay: '0.4s' }
                                    ].map((stat, index) => (
                                        <div
                                            key={index}
                                            className={`${stat.bgClass} rounded-3xl p-8 text-center hover:shadow-xl transition-all duration-500 transform hover:-translate-y-2 hover:scale-105 scroll-scale ${visibleSections.has('overview') ? 'visible' : ''}`}
                                            style={{ transitionDelay: stat.delay }}
                                        >
                                            <div className={`text-5xl font-extrabold ${stat.textClass} mb-3`}>{stat.value}</div>
                                            <div className="text-sm font-semibold text-medical-gray">{stat.label}</div>
                                            <div className={`w-full ${stat.barBg} rounded-full h-2 mt-4 overflow-hidden`}>
                                                <div className={`${stat.barClass} h-2 rounded-full animate-pulse`} style={{ width: index % 2 === 0 ? '85%' : '100%' }}></div>
                                            </div>
                  </div>
                                    ))}
                  </div>

                                <div className="mt-8 p-6 bg-gradient-to-r from-medical-blue/10 to-medical-teal/10 rounded-2xl border border-gray-200/50 animate-fadeInUp" style={{ animationDelay: '0.5s' }}>
                                    <div className="flex items-center space-x-4">
                                        <div className="w-4 h-4 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-500/50"></div>
                                        <div>
                                            <span className="text-lg font-bold text-gray-800 block">System Status: Active</span>
                                            <p className="text-sm text-medical-gray">Advanced AI model ready for analysis</p>
                  </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

            {/* Problem Statement Section - SHORTER, PROPER SPACING */}
            <section
                ref={(el) => (sectionsRef.current[1] = el)}
                data-section="problem"
                className="py-16 md:py-20 bg-white relative"
            >
                <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
                    {/* Section Header */}
                    <div className={`text-center mb-16 scroll-slide-up ${visibleSections.has('problem') ? 'visible' : ''}`}>
                        <div className="inline-block mb-4">
                            <span className="bg-gradient-to-r from-red-500 to-orange-500 text-white px-5 py-2 rounded-full text-sm font-semibold shadow-lg">
                                ⚠️ Current Challenges
                            </span>
                        </div>
                        <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 mb-6">
                            <span className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 bg-clip-text text-transparent">
              Problem Statement
                            </span>
            </h2>
                        <p className="text-xl md:text-2xl text-medical-gray max-w-3xl mx-auto leading-relaxed">
              Challenges in traditional burn assessment methods that our system addresses
              </p>
            </div>

                    {/* Problem Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            {
                                icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
                                title: 'Manual Assessment Limitations',
                                description: 'Traditional burn assessment methods are slow, subjective, and can vary significantly between different healthcare providers. This inconsistency can lead to delayed treatment or missed complications.',
                                bgClass: 'bg-gradient-to-br from-red-100 to-red-50',
                                iconClass: 'text-red-600',
                                delay: '0.1s'
                            },
                            {
                                icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z',
                                title: 'Lack of Remote Monitoring',
                                description: 'Patients often need to visit healthcare facilities frequently for progress monitoring, which can be inconvenient, costly, and may delay early intervention when complications arise.',
                                bgClass: 'bg-gradient-to-br from-orange-100 to-orange-50',
                                iconClass: 'text-orange-600',
                                delay: '0.2s'
                            },
                            {
                                icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
                                title: 'Inconsistent Documentation',
                                description: 'Tracking healing progression over time requires consistent documentation and comparison, which can be challenging to maintain accurately in busy clinical settings.',
                                bgClass: 'bg-gradient-to-br from-yellow-100 to-yellow-50',
                                iconClass: 'text-yellow-600',
                                delay: '0.3s'
                            }
                        ].map((problem, index) => (
                            <div
                                key={index}
                                className={`bg-white rounded-3xl p-10 shadow-2xl border border-gray-200/50 hover:shadow-3xl transition-all duration-500 transform hover:-translate-y-4 hover:scale-105 scroll-scale ${visibleSections.has('problem') ? 'visible' : ''}`}
                                style={{ transitionDelay: problem.delay }}
                            >
                                <div className={`w-18 h-18 ${problem.bgClass} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                                    <svg className={`w-9 h-9 ${problem.iconClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={problem.icon} />
                </svg>
              </div>
                                <h3 className="font-bold text-gray-900 mb-4 text-xl group-hover:text-red-600 transition-colors duration-300">
                                    {problem.title}
              </h3>
                                <p className="text-base text-medical-gray leading-relaxed">
                                    {problem.description}
              </p>
            </div>
                        ))}
          </div>
        </div>
      </section>

            {/* Solution Section - SHORTER, PROPER SPACING */}
            <section
                ref={(el) => (sectionsRef.current[2] = el)}
                data-section="solution"
                className="py-16 md:py-20 bg-gradient-to-b from-gray-50 to-white relative"
            >
                <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
                    {/* Section Header */}
                    <div className={`text-center mb-16 scroll-slide-down ${visibleSections.has('solution') ? 'visible' : ''}`}>
                        <div className="inline-block mb-4">
                            <span className="bg-gradient-to-r from-medical-blue to-medical-teal text-white px-5 py-2 rounded-full text-sm font-semibold shadow-lg">
                                💡 Our Solution
                            </span>
                        </div>
                        <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 mb-6">
                            <span className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 bg-clip-text text-transparent">
              Our Solution
                            </span>
            </h2>
                        <p className="text-xl md:text-2xl text-medical-gray max-w-3xl mx-auto leading-relaxed">
              How AI technology addresses these challenges
              </p>
            </div>

                    {/* Solution Cards */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                        {[
                            {
                                icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
                                title: 'AI-Based Image Analysis',
                                description: 'Our system uses state-of-the-art computer vision and deep learning techniques to analyze burn images with high accuracy. The AI can detect subtle changes in burn characteristics that might be difficult to identify through manual inspection alone.',
                                bgClass: 'bg-gradient-to-br from-medical-blue/20 to-medical-blue/10',
                                iconClass: 'text-medical-blue',
                                delay: '0.1s'
                            },
                            {
                                icon: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z',
                                title: 'Vision Transformer Technology',
                                description: 'At the core of our system is Vision Transformer (ViT) architecture, a cutting-edge AI model that processes images by understanding relationships between different parts of the image. This technology allows for more accurate and nuanced analysis.',
                                bgClass: 'bg-gradient-to-br from-medical-teal/20 to-medical-teal/10',
                                iconClass: 'text-medical-teal',
                                delay: '0.2s'
                            },
                            {
                                icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
                                title: 'Comprehensive Monitoring',
                                description: 'The system provides continuous monitoring capabilities, allowing healthcare providers to track healing progress over time, compare images from different time points, and receive alerts about potential complications.',
                                bgClass: 'bg-gradient-to-br from-medical-blue/20 to-medical-blue/10',
                                iconClass: 'text-medical-blue',
                                delay: '0.3s'
                            }
                        ].map((solution, index) => (
                            <div
                                key={index}
                                className={`bg-white rounded-3xl p-10 shadow-2xl border border-gray-200/50 hover:shadow-3xl transition-all duration-500 transform hover:-translate-y-4 hover:scale-105 scroll-rotate ${visibleSections.has('solution') ? 'visible' : ''}`}
                                style={{ transitionDelay: solution.delay }}
                            >
                                <div className={`w-18 h-18 ${solution.bgClass} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                                    <svg className={`w-9 h-9 ${solution.iconClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={solution.icon} />
                </svg>
              </div>
                                <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-medical-blue transition-colors duration-300">
                                    {solution.title}
              </h3>
                                <p className="text-base text-medical-gray leading-relaxed">
                                    {solution.description}
              </p>
            </div>
                        ))}
          </div>
        </div>
      </section>

            {/* Technology Stack Section - SHORTER, PROPER SPACING */}
            <section
                ref={(el) => (sectionsRef.current[3] = el)}
                data-section="technology"
                className="py-16 md:py-20 bg-white relative"
            >
                <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
                    {/* Section Header */}
                    <div className={`text-center mb-16 scroll-slide-up ${visibleSections.has('technology') ? 'visible' : ''}`}>
                        <div className="inline-block mb-4">
                            <span className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white px-5 py-2 rounded-full text-sm font-semibold shadow-lg">
                                ⚙️ Technology Stack
                            </span>
                        </div>
                        <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 mb-6">
                            <span className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 bg-clip-text text-transparent">
              Technology Stack
                            </span>
            </h2>
                        <p className="text-xl md:text-2xl text-medical-gray max-w-3xl mx-auto leading-relaxed">
              Advanced technologies powering our AI system
              </p>
            </div>

                    {/* Tech Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            {
                                icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
                                title: 'AI / Machine Learning',
                                description: 'Deep learning models trained on extensive burn image datasets for accurate classification and analysis.',
                                bgClass: 'bg-gradient-to-br from-medical-blue/10 to-medical-blue/5',
                                borderClass: 'border-medical-blue/20',
                                iconClass: 'text-medical-blue',
                                delay: '0.1s'
                            },
                            {
                                icon: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z',
                                title: 'Vision Transformers',
                                description: 'Advanced transformer architecture specifically adapted for medical image analysis and pattern recognition.',
                                bgClass: 'bg-gradient-to-br from-medical-teal/10 to-medical-teal/5',
                                borderClass: 'border-medical-teal/20',
                                iconClass: 'text-medical-teal',
                                delay: '0.2s'
                            },
                            {
                                icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
                                title: 'Web-Based System',
                                description: 'Accessible, responsive web application built with modern technologies for seamless user experience.',
                                bgClass: 'bg-gradient-to-br from-medical-blue/10 to-medical-blue/5',
                                borderClass: 'border-medical-blue/20',
                                iconClass: 'text-medical-blue',
                                delay: '0.3s'
                            }
                        ].map((tech, index) => (
                            <div
                                key={index}
                                className={`${tech.bgClass} rounded-3xl p-10 border-2 ${tech.borderClass} transform hover:-translate-y-4 hover:scale-105 transition-all duration-500 scroll-slide-left ${visibleSections.has('technology') ? 'visible' : ''}`}
                                style={{ transitionDelay: tech.delay }}
                            >
                                <div className="w-18 h-18 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                                    <svg className={`w-9 h-9 ${tech.iconClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tech.icon} />
                </svg>
              </div>
                                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                                    {tech.title}
              </h3>
                                <p className="text-base text-medical-gray leading-relaxed">
                                    {tech.description}
              </p>
            </div>
                        ))}
          </div>
        </div>
      </section>

            {/* Disclaimer Section - SHORTER, PROPER SPACING */}
            <section
                ref={(el) => (sectionsRef.current[4] = el)}
                data-section="disclaimer"
                className="py-16 md:py-20 bg-gradient-to-b from-gray-50 to-white relative"
            >
                <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
                    <div className={`bg-amber-50 border-l-8 border-amber-400 rounded-3xl p-12 md:p-16 shadow-2xl scroll-slide-right ${visibleSections.has('disclaimer') ? 'visible' : ''}`}>
                        <div className="flex items-start gap-6">
                            <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
                                <svg className="w-10 h-10 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
                            </div>
              <div className="flex-1">
                                <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-6">
                  Ethical & Medical Disclaimer
                </h2>
                                <div className="text-lg text-medical-gray leading-relaxed space-y-5">
                  <p>
                                        <strong className="text-gray-900">This system is not a medical diagnosis tool.</strong> It is designed to assist
                    healthcare professionals and support patients in monitoring burn scar progression, but it
                    should never replace professional medical judgment or clinical evaluation.
                  </p>
                  <p>
                    All analysis results, recommendations, and insights provided by this system are intended to
                    supplement, not replace, the expertise of qualified medical professionals. Healthcare providers
                    must use their clinical judgment when interpreting AI-generated results and making treatment
                    decisions.
                  </p>
                  <p>
                    This tool supports doctors and patients by providing objective analysis and tracking capabilities,
                    but the final responsibility for medical decisions always rests with licensed healthcare
                    professionals. Patients should always consult with their healthcare providers for proper
                    diagnosis, treatment planning, and ongoing care management.
                  </p>
                                    <div className="bg-amber-100 rounded-xl p-5 border border-amber-300 mt-6">
                                        <p className="text-base text-amber-900">
                    <strong>Emergency Situations:</strong> In case of severe burns, signs of infection, or any
                    medical emergency, seek immediate professional medical attention. Do not rely solely on this
                    system for emergency medical decisions.
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

export default About;