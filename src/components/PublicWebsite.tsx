import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { LoginModal } from './LoginModal';
import { LanguageProvider } from './public/lang';
import { Navbar } from './public/Navbar';
import { Footer } from './public/Footer';
import { HomePage } from './public/HomePage';
import { AboutPage } from './public/AboutPage';
import { FacilitiesPage } from './public/FacilitiesPage';
import { ProgramsPage } from './public/ProgramsPage';
import { InstructorsPage } from './public/InstructorsPage';
import { ReviewsPage } from './public/ReviewsPage';
import { FAQPage } from './public/FAQPage';
import { ContactPage } from './public/ContactPage';
import './public/public-website.css';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
}

export function PublicWebsite() {
  const [showLogin, setShowLogin] = useState(false);

  return (
    <LanguageProvider>
    <div className="v3-root min-h-screen flex flex-col">
      <ScrollToTop />
      <Navbar onLogin={() => setShowLogin(true)} />

      <main className="flex-1">
        <Routes>
          <Route path="/"           element={<HomePage />} />
          <Route path="about"       element={<AboutPage />} />
          <Route path="facilities"  element={<FacilitiesPage />} />
          <Route path="programs"    element={<ProgramsPage />} />
          <Route path="instructors" element={<InstructorsPage />} />
          <Route path="reviews"     element={<ReviewsPage />} />
          <Route path="faq"         element={<FAQPage />} />
          <Route path="contact"     element={<ContactPage />} />
<Route path="*"           element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <Footer />

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </div>
    </LanguageProvider>
  );
}
