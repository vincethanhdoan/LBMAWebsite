import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { NavbarV2 } from './components/NavbarV2';
import { FooterV2 } from './components/FooterV2';
import { LoginModal } from '../../components/LoginModal';
import { HomePageV2 } from './pages/HomePageV2';
import { AboutPageV2 } from './pages/AboutPageV2';
import { FacilitiesPageV2 } from './pages/FacilitiesPageV2';
import { ProgramsPageV2 } from './pages/ProgramsPageV2';
import { InstructorsPageV2 } from './pages/InstructorsPageV2';
import { ReviewsPageV2 } from './pages/ReviewsPageV2';
import { FAQPageV2 } from './pages/FAQPageV2';
import { ContactPageV2 } from './pages/ContactPageV2';

export function PublicWebsiteV2() {
  const [showLogin, setShowLogin] = useState(false);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <NavbarV2 onLogin={() => setShowLogin(true)} />

      <main className="flex-1">
        <Routes>
          <Route path="/" element={<HomePageV2 />} />
          <Route path="about" element={<AboutPageV2 />} />
          <Route path="facilities" element={<FacilitiesPageV2 />} />
          <Route path="programs" element={<ProgramsPageV2 />} />
          <Route path="instructors" element={<InstructorsPageV2 />} />
          <Route path="reviews" element={<ReviewsPageV2 />} />
          <Route path="faq" element={<FAQPageV2 />} />
          <Route path="contact" element={<ContactPageV2 />} />
          <Route
            path="*"
            element={<Navigate to="/experimental/public" replace />}
          />
        </Routes>
      </main>

      <FooterV2 onLogin={() => setShowLogin(true)} />

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </div>
  );
}
