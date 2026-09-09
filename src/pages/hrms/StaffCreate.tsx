import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function StaffCreate() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate('/users', { replace: true });
  }, [navigate]);
  return null;
}
