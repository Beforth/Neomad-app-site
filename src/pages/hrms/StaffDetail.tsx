import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getUsers, mapBackendRoleToFrontend } from '../../lib/api';

const ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-rose-50 text-rose-700',
  admin: 'bg-purple-50 text-purple-700',
  manager: 'bg-blue-50 text-blue-700',
  delivery: 'bg-zinc-50 text-zinc-600',
  delivery_boy: 'bg-zinc-50 text-zinc-600',
  staff: 'bg-emerald-50 text-emerald-700',
};

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  inactive: 'bg-zinc-50 text-zinc-500 border-zinc-100',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  inactive: 'Inactive',
};

export default function StaffDetail() {
  const { staffId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [staff, setStaff] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStaff();
  }, [token, staffId]);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      if (token) {
        const data = await getUsers(token);
        const found = data.find((u: any) => u.id === Number(staffId));
        if (found) {
          setStaff({
            id: found.id,
            name: found.full_name || found.email.split('@')[0],
            email: found.email,
            phone: found.phone ?? '',
            role: mapBackendRoleToFrontend(found.role_codes),
            role_code: found.role_codes?.[0] ?? 'user',
            status: found.is_active ? 'active' : 'inactive',
          });
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 font-medium transition-colors">
          <ArrowLeft size={16} />Back
        </button>
        <div className="bg-white border border-zinc-100 rounded-2xl p-10 text-center shadow-sm">
          <p className="text-sm text-zinc-400 animate-pulse">Loading staff details...</p>
        </div>
      </div>
    );
  }

  if (!staff) {
    return (
      <div className="space-y-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 font-medium transition-colors">
          <ArrowLeft size={16} />Back
        </button>
        <div className="bg-white border border-zinc-100 rounded-2xl p-10 text-center shadow-sm">
          <p className="text-sm text-zinc-400">Staff member not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 font-medium transition-colors">
          <ArrowLeft size={16} />Back
        </button>
      </div>

      {/* Profile Card */}
      <div className="bg-white border border-zinc-100 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-zinc-900 text-white flex items-center justify-center text-xl font-bold shrink-0">
            {staff.name.split(' ').map((n: string) => n[0]).join('')}
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-zinc-900">{staff.name}</h1>
            <div className="flex items-center gap-2 mt-2">
              <span className={`inline-block px-2.5 py-1 rounded-lg text-[11px] font-bold border ${STATUS_STYLES[staff.status]}`}>
                {STATUS_LABELS[staff.status]}
              </span>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold capitalize ${ROLE_COLORS[staff.role] || 'bg-zinc-50 text-zinc-600'}`}>
                <Shield size={10} />{staff.role.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Info */}
      <div className="bg-white border border-zinc-100 rounded-2xl p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">Contact Information</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500 shrink-0">
              <Mail size={16} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Email</p>
              <p className="text-sm font-medium text-zinc-900">{staff.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-500 shrink-0">
              <Phone size={16} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Phone</p>
              <p className="text-sm font-medium text-zinc-900">{staff.phone || <span className="text-zinc-300">Not provided</span>}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
