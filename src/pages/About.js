const About = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Project Overview Section */}
      <section className="bg-gradient-to-br from-medical-blue/5 via-white to-medical-teal/5 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                About the Project
              </h1>
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                    Project Overview
                  </h2>
                  <p className="text-medical-gray leading-relaxed mb-4">
                    The <strong>Intelligent Analysis of Burn Scar Progression with Treatment Recommendations</strong> is
                    a cutting-edge medical AI system designed to revolutionize how healthcare professionals monitor and
                    assess burn injuries. This system leverages advanced artificial intelligence to provide accurate,
                    consistent, and timely analysis of burn scars.
                  </p>
                  <p className="text-medical-gray leading-relaxed">
                    Burn scar monitoring is critical for ensuring proper healing and preventing complications. Traditional
                    assessment methods rely heavily on visual inspection and clinical experience, which can vary between
                    practitioners and over time. Our system addresses these challenges by providing objective, AI-powered
                    analysis that supports clinical decision-making.
                  </p>
                </div>
              </div>
            </div>
            <div className="hidden lg:block">
              <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-medical-blue/10 rounded-xl p-6 text-center">
                    <div className="text-3xl font-bold text-medical-blue mb-2">95%+</div>
                    <div className="text-sm text-medical-gray">Accuracy Rate</div>
                  </div>
                  <div className="bg-medical-teal/10 rounded-xl p-6 text-center">
                    <div className="text-3xl font-bold text-medical-teal mb-2">24/7</div>
                    <div className="text-sm text-medical-gray">Available</div>
                  </div>
                  <div className="bg-medical-blue/10 rounded-xl p-6 text-center">
                    <div className="text-3xl font-bold text-medical-blue mb-2">AI</div>
                    <div className="text-sm text-medical-gray">Powered</div>
                  </div>
                  <div className="bg-medical-teal/10 rounded-xl p-6 text-center">
                    <div className="text-3xl font-bold text-medical-teal mb-2">ViT</div>
                    <div className="text-sm text-medical-gray">Technology</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Statement Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Problem Statement
            </h2>
            <p className="text-lg text-medical-gray max-w-2xl">
              Challenges in traditional burn assessment methods that our system addresses
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-3 text-lg">
                Manual Assessment Limitations
              </h3>
              <p className="text-medical-gray leading-relaxed text-sm">
                Traditional burn assessment methods are slow, subjective, and can vary significantly between
                different healthcare providers. This inconsistency can lead to delayed treatment or missed
                complications.
              </p>
            </div>

            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-3 text-lg">
                Lack of Remote Monitoring
              </h3>
              <p className="text-medical-gray leading-relaxed text-sm">
                Patients often need to visit healthcare facilities frequently for progress monitoring, which
                can be inconvenient, costly, and may delay early intervention when complications arise.
              </p>
            </div>

            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-3 text-lg">
                Inconsistent Documentation
              </h3>
              <p className="text-medical-gray leading-relaxed text-sm">
                Tracking healing progression over time requires consistent documentation and comparison, which
                can be challenging to maintain accurately in busy clinical settings.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="bg-soft-gray py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Our Solution
            </h2>
            <p className="text-lg text-medical-gray max-w-2xl">
              How AI technology addresses these challenges
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100">
              <div className="w-16 h-16 bg-medical-blue bg-opacity-10 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-medical-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                AI-Based Image Analysis
              </h3>
              <p className="text-medical-gray leading-relaxed">
                Our system uses state-of-the-art computer vision and deep learning techniques to analyze burn
                images with high accuracy. The AI can detect subtle changes in burn characteristics that might
                be difficult to identify through manual inspection alone.
              </p>
            </div>

            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100">
              <div className="w-16 h-16 bg-medical-teal bg-opacity-10 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-medical-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Vision Transformer Technology
              </h3>
              <p className="text-medical-gray leading-relaxed">
                At the core of our system is Vision Transformer (ViT) architecture, a cutting-edge AI model
                that processes images by understanding relationships between different parts of the image. This
                technology allows for more accurate and nuanced analysis of burn characteristics, healing stages,
                and scar progression patterns.
              </p>
            </div>

            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100">
              <div className="w-16 h-16 bg-medical-blue bg-opacity-10 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-medical-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Comprehensive Monitoring
              </h3>
              <p className="text-medical-gray leading-relaxed">
                The system provides continuous monitoring capabilities, allowing healthcare providers to track
                healing progress over time, compare images from different time points, and receive alerts about
                potential complications or changes that require attention.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Technology Stack Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Technology Stack
            </h2>
            <p className="text-lg text-medical-gray max-w-2xl">
              Advanced technologies powering our AI system
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-medical-blue/10 to-medical-blue/5 rounded-xl p-8 border border-medical-blue/20">
              <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center mb-6 shadow-sm">
                <svg className="w-8 h-8 text-medical-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                AI / Machine Learning
              </h3>
              <p className="text-medical-gray text-sm leading-relaxed">
                Deep learning models trained on extensive burn image datasets for accurate classification and analysis.
              </p>
            </div>

            <div className="bg-gradient-to-br from-medical-teal/10 to-medical-teal/5 rounded-xl p-8 border border-medical-teal/20">
              <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center mb-6 shadow-sm">
                <svg className="w-8 h-8 text-medical-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Vision Transformers
              </h3>
              <p className="text-medical-gray text-sm leading-relaxed">
                Advanced transformer architecture specifically adapted for medical image analysis and pattern recognition.
              </p>
            </div>

            <div className="bg-gradient-to-br from-medical-blue/10 to-medical-blue/5 rounded-xl p-8 border border-medical-blue/20">
              <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center mb-6 shadow-sm">
                <svg className="w-8 h-8 text-medical-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Web-Based System
              </h3>
              <p className="text-medical-gray text-sm leading-relaxed">
                Accessible, responsive web application built with modern technologies for seamless user experience.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Ethical & Medical Disclaimer Section */}
      <section className="bg-soft-gray py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-amber-50 border-l-4 border-amber-400 rounded-lg p-8 shadow-sm">
            <div className="flex items-start">
              <svg className="w-8 h-8 text-amber-500 mr-4 mt-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Ethical & Medical Disclaimer
                </h2>
                <div className="text-medical-gray leading-relaxed space-y-4">
                  <p>
                    <strong>This system is not a medical diagnosis tool.</strong> It is designed to assist
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
                  <p className="text-sm pt-4 border-t border-amber-200">
                    <strong>Emergency Situations:</strong> In case of severe burns, signs of infection, or any
                    medical emergency, seek immediate professional medical attention. Do not rely solely on this
                    system for emergency medical decisions.
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

export default About;
