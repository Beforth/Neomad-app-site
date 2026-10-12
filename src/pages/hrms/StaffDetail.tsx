import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getUsers, mapBackendRoleToFrontend } from '../../lib/api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-destructive/10 text-destructive',
  admin: 'bg-purple-50 text-purple-700',
  manager: 'bg-info/10 text-info',
  delivery: 'bg-muted text-foreground/70',
  delivery_boy: 'bg-muted text-foreground/70',
  staff: 'bg-accent text-accent-foreground',
};

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-accent text-accent-foreground border-primary/20',
  inactive: 'bg-muted text-muted-foreground border-border',
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
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground font-medium transition-colors">
          <ArrowLeft size={16} />Back
        </button>
        <Card className="p-10 text-center" >
          <p className="text-sm text-muted-foreground/70 animate-pulse">Loading staff details...</p>
        </Card>
      </div>
    );
  }

  if (!staff) {
    return (
      <div className="space-y-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground font-medium transition-colors">
          <ArrowLeft size={16} />Back
        </button>
        <Card className="p-10 text-center" >
          <p className="text-sm text-muted-foreground/70">Staff member not found.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground font-medium transition-colors">
          <ArrowLeft size={16} />Back
        </button>
      </div>

      {/* Profile Card */}
      <Card className="p-6" >
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-foreground text-white flex items-center justify-center text-xl font-semibold shrink-0">
            {staff.name.split(' ').map((n: string) => n[0]).join('')}
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">{staff.name}</h1>
            <div className="flex items-center gap-2 mt-2">
              <span className={`inline-block px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${STATUS_STYLES[staff.status]}`}>
                {STATUS_LABELS[staff.status]}
              </span>
              <Badge className={`capitalize ${ROLE_COLORS[staff.role] || 'bg-muted text-foreground/70'}`}>
                <Shield size={10} />{staff.role.replace('_', ' ')}
              </Badge>
            </div>
          </div>
        </div>
      </Card>

      {/* Contact Info */}
      <Card className="p-6 space-y-4" >
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Contact Information</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-info/10 flex items-center justify-center text-info shrink-0">
              <Mail size={16} />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground/70">Email</p>
              <p className="text-sm font-medium text-foreground">{staff.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center text-primary shrink-0">
              <Phone size={16} />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground/70">Phone</p>
              <p className="text-sm font-medium text-foreground">{staff.phone || <span className="text-muted-foreground/50">Not provided</span>}</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
