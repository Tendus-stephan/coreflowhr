import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Menu, X } from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
}

const TermsOfService: React.FC = () => {
  const [activeId, setActiveId] = useState('agreement');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const isScrollingRef = useRef(false);

  const sections: NavItem[] = [
    { id: 'agreement', label: 'Agreement to Our Legal Terms' },
    { id: 'services', label: 'Our Services' },
    { id: 'ip', label: 'Intellectual Property Rights' },
    { id: 'userreps', label: 'User Representations' },
    { id: 'userreg', label: 'User Registration' },
    { id: 'purchases', label: 'Purchases and Payment' },
    { id: 'subscriptions', label: 'Subscriptions' },
    { id: 'prohibited', label: 'Prohibited Activities' },
    { id: 'ugc', label: 'User Generated Contributions' },
    { id: 'license', label: 'Contribution Licence' },
    { id: 'sitemanage', label: 'Services Management' },
    { id: 'ppno', label: 'Privacy Policy' },
    { id: 'terms', label: 'Term and Termination' },
    { id: 'modifications', label: 'Modifications and Interruptions' },
    { id: 'law', label: 'Governing Law' },
    { id: 'disputes', label: 'Dispute Resolution' },
    { id: 'corrections', label: 'Corrections' },
    { id: 'disclaimer', label: 'Disclaimer' },
    { id: 'liability', label: 'Limitations of Liability' },
    { id: 'indemnification', label: 'Indemnification' },
    { id: 'userdata', label: 'User Data' },
    { id: 'electronic', label: 'Electronic Communications' },
    { id: 'misc', label: 'Miscellaneous' },
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
  }, []);

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
                    <span className="text-xs font-bold">{idx === 0 ? 'A' : idx}</span>
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

            <h1 className="text-4xl font-bold text-gray-900 mb-4">Terms of Service</h1>
            <p className="text-sm text-gray-500 mb-12">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

            <div className="space-y-8">
              <section id="agreement">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">AGREEMENT TO OUR LEGAL TERMS</h2>
                <div className="text-gray-700 leading-relaxed space-y-4">
                  <p>
                    We are <strong>CoreflowHR</strong>, an ai recruitment site that helps with the seamless automation of candidates sourcing and hiring. 
                    We operate the website <a href="http://www.coreflowhr.com" target="_blank" rel="noopener noreferrer" className="text-black hover:underline">http://www.coreflowhr.com</a> (the 'Site'), as well as any other 
                    related products and services that refer or link to these legal terms (the 'Legal Terms') (collectively, the 'Services').
                  </p>
                  <p>
                    You can contact us by email at <a href="mailto:Coreflowhr@gmail.com" className="text-black hover:underline">Coreflowhr@gmail.com</a>, or by mail to our registered office.
                  </p>
                  <p>
                    These Legal Terms constitute a legally binding agreement made between you, whether personally or on behalf of an entity ('you'), 
                    and CoreflowHR, concerning your access to and use of the Services. You agree that by accessing the Services, you have read, understood, 
                    and agreed to be bound by all of these Legal Terms.
                  </p>
                  <div className="bg-red-50 border-l-4 border-red-500 p-4 mt-4">
                    <p className="text-red-700 font-medium mb-0 uppercase text-sm">
                      If you do not agree with all of these legal terms, then you are expressly prohibited from using the services and you must discontinue use immediately.
                    </p>
                  </div>
                  <p className="mt-4">
                    The Services are intended for users who are at least 13 years of age. All users who are minors in the jurisdiction in which they 
                    reside (generally under the age of 18) must have the permission of, and be directly supervised by, their parent or guardian to 
                    use the Services. If you are a minor, you must have your parent or guardian read and agree to these Legal Terms prior to you using the Services.
                  </p>
                </div>
              </section>

              <section id="services">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">1. OUR SERVICES</h2>
                <p className="text-gray-700 leading-relaxed">
                  The information provided when using the Services is not intended for distribution to or use by any person or entity in any 
                  jurisdiction or country where such distribution or use would be contrary to law or regulation or which would subject us to any 
                  registration requirement within such jurisdiction or country. Accordingly, those persons who choose to access the Services from 
                  other locations do so on their own initiative and are solely responsible for compliance with local laws, if and to the extent local 
                  laws are applicable.
                </p>
              </section>

              <section id="ip">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">2. INTELLECTUAL PROPERTY RIGHTS</h2>
                <div className="text-gray-700 leading-relaxed space-y-4">
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Our intellectual property</h3>
                    <p>
                      We are the owner or the licensee of all intellectual property rights in our Services, including all source code, databases, 
                      functionality, software, website designs, audio, video, text, photographs, and graphics in the Services (collectively, the 'Content'), 
                      as well as the trademarks, service marks, and logos contained therein (the 'Marks').
                    </p>
                    <p>
                      Our Content and Marks are protected by copyright and trademark laws (and various other intellectual property rights and unfair competition laws) 
                      and treaties around the world. The Content and Marks are provided in or through the Services 'AS IS' for your personal, non-commercial use only.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Your use of our Services</h3>
                    <p className="mb-2">Subject to your compliance with these Legal Terms, we grant you a non-exclusive, non-transferable, revocable licence to:</p>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>Access the Services; and</li>
                      <li>Download or print a copy of any portion of the Content to which you have properly gained access, solely for your personal, non-commercial use.</li>
                    </ul>
                    <p className="mt-4">
                      Except as set out in this section, no part of the Services and no Content or Marks may be copied, reproduced, aggregated, republished, 
                      uploaded, posted, publicly displayed, encoded, translated, transmitted, distributed, sold, licensed, or otherwise exploited for any 
                      commercial purpose whatsoever, without our express prior written permission.
                    </p>
                  </div>
                </div>
              </section>

              <section id="userreps">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">3. USER REPRESENTATIONS</h2>
                <p className="text-gray-700 leading-relaxed mb-3">By using the Services, you represent and warrant that:</p>
                <ol className="list-decimal pl-6 space-y-2 text-gray-700">
                  <li>All registration information you submit will be true, accurate, current, and complete;</li>
                  <li>You will maintain the accuracy of such information and promptly update such registration information as necessary;</li>
                  <li>You have the legal capacity and you agree to comply with these Legal Terms;</li>
                  <li>You are not under the age of 13;</li>
                  <li>You are not a minor in the jurisdiction in which you reside, or if a minor, you have received parental permission to use the Services;</li>
                  <li>You will not access the Services through automated or non-human means, whether through a bot, script or otherwise;</li>
                  <li>You will not use the Services for any illegal or unauthorised purpose; and</li>
                  <li>Your use of the Services will not violate any applicable law or regulation.</li>
                </ol>
              </section>

              <section id="userreg">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">4. USER REGISTRATION</h2>
                <p className="text-gray-700 leading-relaxed">
                  You may be required to register to use the Services. You agree to keep your password confidential and will be responsible for all use of 
                  your account and password. We reserve the right to remove, reclaim, or change a username you select if we determine, in our sole 
                  discretion, that such username is inappropriate, obscene, or otherwise objectionable.
                </p>
              </section>

              <section id="purchases">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">5. PURCHASES AND PAYMENT</h2>
                <div className="text-gray-700 leading-relaxed space-y-4">
                  <p>We accept the following forms of payment:</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">
                    {/* Visa */}
                    <div className="flex items-center justify-center p-4 bg-[#1A1F71] rounded-lg shadow-sm">
                      <span className="text-white font-bold text-lg tracking-wider">VISA</span>
                    </div>
                    {/* Mastercard */}
                    <div className="flex items-center justify-center p-4 bg-gradient-to-r from-[#EB001B] to-[#F79E1B] rounded-lg shadow-sm">
                      <div className="flex items-center gap-1">
                        <div className="w-8 h-8 rounded-full bg-[#EB001B]"></div>
                        <div className="w-8 h-8 rounded-full bg-[#F79E1B] -ml-4"></div>
                      </div>
                    </div>
                    {/* American Express */}
                    <div className="flex items-center justify-center p-4 bg-[#006FCF] rounded-lg shadow-sm">
                      <span className="text-white font-bold text-sm">AMEX</span>
                    </div>
                    {/* Discover */}
                    <div className="flex items-center justify-center p-4 bg-[#FF6000] rounded-lg shadow-sm">
                      <span className="text-white font-bold text-xs">DISCOVER</span>
                    </div>
                    {/* PayPal */}
                    <div className="flex items-center justify-center p-4 bg-[#003087] rounded-lg shadow-sm">
                      <span className="text-white font-bold text-sm">PayPal</span>
                    </div>
                  </div>
                  <p className="mt-4">
                    You agree to provide current, complete, and accurate purchase and account information for all purchases made via the Services. 
                    Sales tax will be added to the price of purchases as deemed required by us. All payments shall be in <strong>US dollars</strong>.
                  </p>
                </div>
              </section>

              <section id="subscriptions">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">6. SUBSCRIPTIONS</h2>
                <div className="text-gray-700 leading-relaxed space-y-4">
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Billing and Renewal</h3>
                    <p>
                      Your subscription will continue and automatically renew unless cancelled. You consent to our charging your payment method on a recurring 
                      basis without requiring your prior approval for each recurring charge. The length of your billing cycle will depend on the type of 
                      subscription plan you choose.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Cancellation</h3>
                    <p>
                      All purchases are non-refundable. You can cancel your subscription at any time by logging into your account. Your cancellation will 
                      take effect at the end of the current paid term.
                    </p>
                  </div>
                </div>
              </section>

              <section id="prohibited">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">7. PROHIBITED ACTIVITIES</h2>
                <div className="text-gray-700 leading-relaxed space-y-3">
                  <p>
                    You may not access or use the Services for any purpose other than that for which we make the Services available. As a user of the 
                    Services, you agree not to:
                  </p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Systematically retrieve data or other content from the Services to create a collection or database.</li>
                    <li>Trick, defraud, or mislead us and other users, especially to learn user passwords.</li>
                    <li>Circumvent, disable, or otherwise interfere with security-related features.</li>
                    <li>Disparage, tarnish, or otherwise harm us and/or the Services.</li>
                    <li>Use any information obtained from the Services to harass or harm another person.</li>
                    <li>Use the Services in a manner inconsistent with any applicable laws.</li>
                  </ul>
                </div>
              </section>

              <section id="ugc">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">8. USER GENERATED CONTRIBUTIONS</h2>
                <p className="text-gray-700 leading-relaxed">
                  The Services does not offer users to submit or post content. We may provide you with the opportunity to create or submit materials 
                  ('Contributions'). When you create any Contributions, you represent that they do not infringe the proprietary rights of any third party.
                </p>
              </section>

              <section id="license">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">9. CONTRIBUTION LICENCE</h2>
                <p className="text-gray-700 leading-relaxed">
                  You and Services agree that we may access, store, process, and use any information and personal data that you provide and your choices. 
                  By submitting suggestions, you agree that we can use and share such feedback for any purpose without compensation.
                </p>
              </section>

              <section id="sitemanage">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">10. SERVICES MANAGEMENT</h2>
                <p className="text-gray-700 leading-relaxed">
                  We reserve the right, but not the obligation, to monitor the Services for violations of these Legal Terms and take appropriate 
                  legal action against anyone who violates the law or these Legal Terms.
                </p>
              </section>

              <section id="ppno">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">11. PRIVACY POLICY</h2>
                <p className="text-gray-700 leading-relaxed">
                  We care about data privacy and security. By using the Services, you agree to be bound by our Privacy Policy. Please be advised 
                  the Services are hosted in the <strong>United States</strong>. If you access the Services from any other region, you consent 
                  to have your data transferred to and processed in the United States.
                </p>
              </section>

              <section id="terms">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">12. TERM AND TERMINATION</h2>
                <p className="text-gray-700 leading-relaxed">
                  These Legal Terms shall remain in full force and effect while you use the Services. WE RESERVE THE RIGHT TO DENY ACCESS TO AND 
                  USE OF THE SERVICES TO ANY PERSON FOR ANY REASON OR FOR NO REASON, WITHOUT WARNING, IN OUR SOLE DISCRETION.
                </p>
              </section>

              <section id="modifications">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">13. MODIFICATIONS AND INTERRUPTIONS</h2>
                <p className="text-gray-700 leading-relaxed">
                  We reserve the right to change, modify, or remove the contents of the Services at any time without notice. We cannot guarantee 
                  the Services will be available at all times.
                </p>
              </section>

              <section id="law">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">14. GOVERNING LAW</h2>
                <p className="text-gray-700 leading-relaxed">
                  These Legal Terms and your use of the Services are governed by and construed in accordance with the laws of 
                  <strong> the State of New Jersey</strong> applicable to agreements made and to be entirely performed within 
                  the State of New Jersey, without regard to its conflict of law principles.
                </p>
              </section>

              <section id="disputes">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">15. DISPUTE RESOLUTION</h2>
                <div className="text-gray-700 leading-relaxed space-y-4">
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Informal Negotiations</h3>
                    <p>
                      Parties agree to first attempt to negotiate any Dispute informally for at least thirty (30) days before initiating arbitration.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Binding Arbitration</h3>
                    <p>
                      If informal negotiations fail, Disputes will be finally and exclusively resolved by binding arbitration under the rules of the 
                      American Arbitration Association (AAA). The arbitration will take place in New Jersey, United States.
                    </p>
                  </div>
                </div>
              </section>

              <section id="corrections">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">16. CORRECTIONS</h2>
                <p className="text-gray-700 leading-relaxed">
                  There may be information on the Services that contains typographical errors, inaccuracies, or omissions. We reserve the right 
                  to correct any errors and to update information at any time without prior notice.
                </p>
              </section>

              <section id="disclaimer">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">17. DISCLAIMER</h2>
                <div className="bg-gray-50 border p-6 font-mono text-xs uppercase leading-loose text-gray-700">
                  THE SERVICES ARE PROVIDED ON AN AS-IS AND AS-AVAILABLE BASIS. YOU AGREE THAT YOUR USE OF THE SERVICES WILL BE AT YOUR SOLE RISK. 
                  TO THE FULLEST EXTENT PERMITTED BY LAW, WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY AND FITNESS 
                  FOR A PARTICULAR PURPOSE.
                </div>
              </section>

              <section id="liability">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">18. LIMITATIONS OF LIABILITY</h2>
                <p className="text-gray-700 leading-relaxed">
                  IN NO EVENT WILL WE BE LIABLE FOR ANY DIRECT, INDIRECT, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE SERVICES. 
                  OUR LIABILITY TO YOU WILL AT ALL TIMES BE LIMITED TO THE LESSER OF THE AMOUNT PAID BY YOU DURING THE SIX (6) MONTH PERIOD PRIOR 
                  TO THE CAUSE OF ACTION OR <strong>$30.00 USD</strong>.
                </p>
              </section>

              <section id="indemnification">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">19. INDEMNIFICATION</h2>
                <p className="text-gray-700 leading-relaxed">
                  You agree to defend and indemnify us from any loss, damage, or claim made by any third party due to or arising out of your use 
                  of the Services or breach of these Legal Terms.
                </p>
              </section>

              <section id="userdata">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">20. USER DATA</h2>
                <p className="text-gray-700 leading-relaxed">
                  We will maintain certain data that you transmit to the Services. You are solely responsible for all data that you transmit 
                  or that relates to any activity you have undertaken using the Services.
                </p>
              </section>

              <section id="electronic">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">21. ELECTRONIC COMMUNICATIONS, TRANSACTIONS, AND SIGNATURES</h2>
                <p className="text-gray-700 leading-relaxed">
                  Visiting the Services, sending us emails, and completing online forms constitute electronic communications. YOU HEREBY AGREE 
                  TO THE USE OF ELECTRONIC SIGNATURES, CONTRACTS, ORDERS, AND OTHER RECORDS.
                </p>
              </section>

              <section id="misc">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">22. MISCELLANEOUS</h2>
                <p className="text-gray-700 leading-relaxed">
                  These Legal Terms constitute the entire agreement between you and us. Our failure to exercise any right shall not operate as a waiver. 
                  If any provision is found unlawful or void, that part is deemed severable and does not affect the validity of remaining provisions.
                </p>
              </section>

              <section id="contact">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">23. CONTACT US</h2>
                <div className="text-gray-700 leading-relaxed space-y-4">
                  <p>In order to resolve a complaint regarding the Services, please contact us at:</p>
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

export default TermsOfService;
