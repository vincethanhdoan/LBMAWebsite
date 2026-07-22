import { useNavigate } from 'react-router-dom';
import { LoginModal } from '../LoginModal';
import { V3 } from './design';
import './public-website.css';

export function PortalLoginPage() {
  const navigate = useNavigate();

  return (
    <div
      className="v3-root"
      style={{ minHeight: '100svh', backgroundColor: V3.bg }}
    >
      <LoginModal onClose={() => navigate('/', { replace: true })} />
    </div>
  );
}
