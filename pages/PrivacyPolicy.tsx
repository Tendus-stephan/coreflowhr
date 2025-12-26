import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Menu, X } from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
}

const PrivacyPolicy: React.FC = () => {
  const [activeId, setActiveId] = useState('introduction');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const isScrollingRef = useRef(false);

  const sections: NavItem[] = [
    { id: 'introduction', label: 'Introduction' },
    { id: 'information-collect', label: 'Information We Collect' },
    { id: 'how-we-use', label: 'How We Use Your Information' },
    { id: 'data-sharing', label: 'Data Sharing and Disclosure' },
    { id: 'data-security', label: 'Data Security' },
    { id: 'your-rights', label: 'Your Rights' },
    { id: 'cookies', label: 'Cookies and Tracking' },
    { id: 'data-retention', label: 'Data Retention' },
    { id: 'international-transfers', label: 'International Data Transfers' },
    { id: 'children-privacy', label: "Children's Privacy" },
    { id: 'changes', label: 'Changes to This Privacy Policy' },
    { id: 'contact', label: 'Contact Us' },
  ];

  useEffect(() => {
    let ticking = false;
    
    const handleScroll = () => {
      // Skip if we're programmatically scrolling
      if (isScrollingRef.current) return;
      
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollPosition = window.scrollY + 200;
          
          for (let i = sections.length - 1; i >= 0; i--) {
            const section = document.getElementById(sections[i].id);
            if (section && section.offsetTop <= scrollPosition) {
              setActiveId(sections[i].id);
              break;
            }
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial check
    return () => window.removeEventListener('scroll', handleScroll);
  }, [sections]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      setActiveId(id); // Set active immediately
      isScrollingRef.current = true; // Disable scroll handler during programmatic scroll
      const offset = 100;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
      setMobileSidebarOpen(false);
      
      // Re-enable scroll handler after scroll animation completes
      setTimeout(() => {
        isScrollingRef.current = false;
        setActiveId(id); // Ensure it's still set correctly
      }, 800);
    }
  };
  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="fixed top-0 w-full h-16 bg-white border-b border-gray-200 z-50 flex items-center px-4 justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-md lg:hidden"
            aria-label="Toggle Menu"
          >
            {mobileSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <Link to="/" className="flex items-center gap-2 text-gray-400 hover:text-gray-900 transition-colors">
            <ArrowLeft size={16} />
            <span className="text-sm font-medium">Back to Home</span>
          </Link>
        </div>
        <div className="flex items-center gap-4">
        </div>
      </nav>

      <div className="flex pt-16">
        {/* Desktop Sidebar */}
        <aside className={`hidden lg:block fixed left-0 top-16 bottom-0 w-64 bg-white border-r border-gray-200 transition-all duration-300 ${sidebarCollapsed ? 'w-20' : 'w-64'}`}>
          <div className="h-full overflow-y-auto py-6 px-4 scrollbar-hide">
            {!sidebarCollapsed && (
              <div className="mb-6 px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Table of Contents
              </div>
            )}
            <nav className="space-y-1">
              {sections.map((section, idx) => (
                <button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-all
                    ${activeId === section.id 
                      ? 'bg-gray-100 text-gray-900 shadow-sm border-l-4 border-gray-900 pl-2' 
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
                >
                  {sidebarCollapsed ? (
                    <span className="text-xs font-bold">{idx + 1}</span>
                  ) : (
                    section.label
                  )}
                </button>
              ))}
            </nav>
            
            {!sidebarCollapsed && (
              <div className="mt-10 p-4 bg-gray-50 rounded-lg border border-gray-100">
                <p className="text-xs text-gray-500 leading-relaxed italic">
                  Tip: You can use Cmd+F (Mac) or Ctrl+F (Windows) to search keywords in addition to the site search.
                </p>
              </div>
            )}
          </div>
        </aside>

        {/* Mobile Sidebar */}
        {mobileSidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setMobileSidebarOpen(false)}>
            <aside 
              className="fixed left-0 top-16 bottom-0 w-64 bg-white border-r border-gray-200 shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="h-full overflow-y-auto py-6 px-4">
                <div className="mb-6 px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Table of Contents
                </div>
                <nav className="space-y-1">
                  {sections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => scrollToSection(section.id)}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-all
                        ${activeId === section.id 
                          ? 'bg-gray-100 text-gray-900 shadow-sm border-l-4 border-gray-900 pl-2' 
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
                    >
                      {section.label}
                    </button>
                  ))}
                </nav>
              </div>
            </aside>
          </div>
        )}

        {/* Main Content */}
        <main className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
          <div className="max-w-4xl mx-auto px-6 py-12">
            <div className="flex justify-center mb-8">
              <img 
                src="/assets/images/coreflow-favicon-logo.png" 
                alt="CoreFlow" 
                className="object-contain"
                style={{ 
                  width: '120px',
                  height: '120px'
                }}
              />
            </div>

            <h1 className="text-4xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
            <p className="text-sm text-gray-500 mb-12">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

            <div className="space-y-8">
              <section id="introduction">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Introduction</h2>
                <p className="text-gray-700 leading-relaxed">
                  CoreflowHR ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy 
                  explains how we collect, use, disclose, and safeguard your information when you use our 
                  recruitment operating system and related services.
                </p>
              </section>

              <section id="information-collect">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Information We Collect</h2>
                <div className="text-gray-700 leading-relaxed space-y-4">
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Account Information</h3>
                    <p>When you create an account, we collect:</p>
                    <ul className="list-disc pl-6 space-y-1 mt-2">
                      <li>Name and email address</li>
                      <li>Job title and company information</li>
                      <li>Phone number (optional)</li>
                      <li>Profile picture (optional)</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Candidate Data</h3>
                    <p>As part of our recruitment services, you may upload or process:</p>
                    <ul className="list-disc pl-6 space-y-1 mt-2">
                      <li>Candidate names, contact information, and resumes</li>
                      <li>Interview notes and feedback</li>
                      <li>Job application data</li>
                      <li>Assessment results and scores</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Usage Data</h3>
                    <p>We automatically collect information about how you use the Service, including:</p>
                    <ul className="list-disc pl-6 space-y-1 mt-2">
                      <li>Log data (IP address, browser type, access times)</li>
                      <li>Device information</li>
                      <li>Cookies and similar tracking technologies</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section id="how-we-use">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">3. How We Use Your Information</h2>
                <p className="text-gray-700 leading-relaxed mb-3">We use the information we collect to:</p>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li>Provide, maintain, and improve the Service</li>
                  <li>Process transactions and send related information</li>
                  <li>Send technical notices, updates, and support messages</li>
                  <li>Respond to your comments and questions</li>
                  <li>Monitor and analyze usage patterns</li>
                  <li>Detect, prevent, and address technical issues</li>
                  <li>Comply with legal obligations</li>
                </ul>
              </section>

              <section id="data-sharing">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Data Sharing and Disclosure</h2>
                <div className="text-gray-700 leading-relaxed space-y-3">
                  <p>We do not sell your personal information. We may share your information in the following circumstances:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Service Providers:</strong> With third-party vendors who perform services on our behalf</li>
                    <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
                    <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
                    <li><strong>With Your Consent:</strong> When you explicitly authorize us to share information</li>
                  </ul>
                </div>
              </section>

              <section id="data-security">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Data Security</h2>
                <p className="text-gray-700 leading-relaxed">
                  We implement appropriate technical and organizational measures to protect your information against 
                  unauthorized access, alteration, disclosure, or destruction. However, no method of transmission 
                  over the Internet is 100% secure, and we cannot guarantee absolute security.
                </p>
              </section>

              <section id="your-rights">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Your Rights</h2>
                <div className="text-gray-700 leading-relaxed space-y-3">
                  <p>Depending on your location, you may have the following rights:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Access:</strong> Request a copy of your personal data</li>
                    <li><strong>Correction:</strong> Request correction of inaccurate data</li>
                    <li><strong>Deletion:</strong> Request deletion of your personal data</li>
                    <li><strong>Portability:</strong> Request transfer of your data to another service</li>
                    <li><strong>Objection:</strong> Object to processing of your personal data</li>
                    <li><strong>Restriction:</strong> Request restriction of processing</li>
                  </ul>
                  <p className="mt-3">
                    To exercise these rights, please contact us at <a href="mailto:coreflowhr@gmail.com" className="text-black hover:underline">coreflowhr@gmail.com</a>.
                  </p>
                </div>
              </section>

              <section id="cookies">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Cookies and Tracking</h2>
                <p className="text-gray-700 leading-relaxed">
                  We use cookies and similar tracking technologies to track activity on our Service and hold certain 
                  information. You can instruct your browser to refuse all cookies or to indicate when a cookie is 
                  being sent. However, if you do not accept cookies, you may not be able to use some portions of our Service.
                </p>
              </section>

              <section id="data-retention">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Data Retention</h2>
                <p className="text-gray-700 leading-relaxed">
                  We retain your personal information for as long as necessary to provide the Service and fulfill 
                  the purposes outlined in this Privacy Policy, unless a longer retention period is required or 
                  permitted by law. When you delete your account, we will delete or anonymize your personal data, 
                  subject to legal retention requirements.
                </p>
              </section>

              <section id="international-transfers">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">9. International Data Transfers</h2>
                <p className="text-gray-700 leading-relaxed">
                  Your information may be transferred to and processed in countries other than your country of 
                  residence. These countries may have data protection laws that differ from those in your country. 
                  We ensure appropriate safeguards are in place to protect your information in accordance with 
                  this Privacy Policy.
                </p>
              </section>

              <section id="children-privacy">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Children's Privacy</h2>
                <p className="text-gray-700 leading-relaxed">
                  Our Service is not intended for individuals under the age of 18. We do not knowingly collect 
                  personal information from children. If you are a parent or guardian and believe your child has 
                  provided us with personal information, please contact us immediately.
                </p>
              </section>

              <section id="changes">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Changes to This Privacy Policy</h2>
                <p className="text-gray-700 leading-relaxed">
                  We may update our Privacy Policy from time to time. We will notify you of any changes by posting 
                  the new Privacy Policy on this page and updating the "Last updated" date. You are advised to 
                  review this Privacy Policy periodically for any changes.
                </p>
              </section>

              <section id="contact">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Contact Us</h2>
                <div className="text-gray-700 leading-relaxed space-y-4">
                  <p>If you have any questions about this Privacy Policy, please contact us at:</p>
                  <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                    <p className="font-bold text-gray-900 mb-4 text-lg">CoreflowHR Legal Department</p>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-gray-600">
                        <span className="font-medium">Email:</span>
                        <a href="mailto:coreflowhr@gmail.com" className="hover:text-gray-900 hover:underline">coreflowhr@gmail.com</a>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default PrivacyPolicy;



