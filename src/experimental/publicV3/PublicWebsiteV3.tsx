import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { LoginModal } from '../../components/LoginModal';
import { NavbarV3 } from './components/NavbarV3';
import { FooterV3 } from './components/FooterV3';
import { HomePageV3 } from './pages/HomePageV3';
import { AboutPageV3 } from './pages/AboutPageV3';
import { FacilitiesPageV3 } from './pages/FacilitiesPageV3';
import { ProgramsPageV3 } from './pages/ProgramsPageV3';
import { InstructorsPageV3 } from './pages/InstructorsPageV3';
import { ReviewsPageV3 } from './pages/ReviewsPageV3';
import { FAQPageV3 } from './pages/FAQPageV3';
import { ContactPageV3 } from './pages/ContactPageV3';
import './v3.css';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
}

export function PublicWebsiteV3() {
  const [showLogin, setShowLogin] = useState(false);

  return (
    <div className="v3-root min-h-screen flex flex-col">
      <ScrollToTop />
      <NavbarV3 onLogin={() => setShowLogin(true)} />

      <main className="flex-1">
        <Routes>
          <Route path="/" element={<HomePageV3 />} />
          <Route path="about" element={<AboutPageV3 />} />
          <Route path="facilities" element={<FacilitiesPageV3 />} />
          <Route path="programs" element={<ProgramsPageV3 />} />
          <Route path="instructors" element={<InstructorsPageV3 />} />
          <Route path="reviews" element={<ReviewsPageV3 />} />
          <Route path="faq" element={<FAQPageV3 />} />
          <Route path="contact" element={<ContactPageV3 />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <FooterV3 onLogin={() => setShowLogin(true)} />

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </div>
  );
}
