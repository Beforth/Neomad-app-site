import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, Mail, Phone, Calendar, Building2, FileText, Download } from 'lucide-react';

const MOCK_STAFF: Record<number, { id: number; name: string; email: string; phone: string; department: string; role: string; designation: string; status: string; joined: string; address: string; emergencyContact: string; documents: { name: string; date: string }[] }> = {
  1: { id: 1, name: 'Ravi Kumar', email: 'ravi@neomed.com', phone: '+91 98765 43210', department: 'Delivery', role: 'Staff', designation: 'Delivery Executive', status: 'active', joined: 'Jan 15, 2024', address: 'Nashik, Maharashtra', emergencyContact: '+91 98765 11111', documents: [{ name: 'Aadhaar Card', date: 'Jan 2024' }, { name: 'PAN Card', date: 'Jan 2024' }] },
  2: { id: 2, name: 'Priya Sharma', email: 'priya@neomed.com', phone: '+91 98765 43211', department: 'Operations', role: 'Lead', designation: 'Operations Lead', status: 'active', joined: 'Mar 8, 2023', address: 'Pune, Maharashtra', emergencyContact: '+91 98765 22222', documents: [{ name: 'Aadhaar Card', date: 'Mar 2023' }, { name: 'Degree Certificate', date: 'Mar 2023' }] },
  3: { id: 3, name: 'Amit Tandon', email: 'amit@neomed.com', phone: '+91 98765 43212', department: 'Warehouse', role: 'Staff', designation: 'Warehouse Associate', status: 'on_leave', joined: 'Jun 20, 2024', address: 'Mumbai, Maharashtra', emergencyContact: '+91 98765 33333', documents: [{ name: 'Aadhaar Card', date: 'Jun 2024' }] },
  4: { id: 4, name: 'Sneha Patil', email: 'sneha@neomed.com', phone: '+91 98765 43213', department: 'Office Admin', role: 'Staff', designation: 'Office Assistant', status: 'active', joined: 'Sep 1, 2023', address: 'Thane, Maharashtra', emergencyContact: '+91 98765 44444', documents: [{ name: 'Aadhaar Card', date: 'Sep 2023' }, { name: 'PAN Card', date: 'Sep 2023' }, { name: 'Education Certificates', date: 'Sep 2023' }] },
  5: { id: 5, name: 'Vikram Joshi', email: 'vikram@neomed.com', phone: '+91 98765 43214', department: 'Delivery', role: 'Staff', designation: 'Delivery Executive', status: 'active', joined: 'Feb 10, 2024', address: 'Nashik, Maharashtra', emergencyContact: '+91 98765 55555', documents: [{ name: 'Aadhaar Card', date: 'Feb 2024' }, { name: 'Driving License', date: 'Feb 2024' }] },
  6: { id: 6, name: 'Meena Devi', email: 'meena@neomed.com', phone: '+91 98765 43215', department: 'Warehouse', role: 'Staff', designation: 'Warehouse Associate', status: 'inactive', joined: 'Apr 5, 2023', address: 'Pune, Maharashtra', emergencyContact: '+91 98765 66666', documents: [{ name: 'Aadhaar Card', date: 'Apr 2023' }] },
  7: { id: 7, name: 'Arjun Nair', email: 'arjun@neomed.com', phone: '+91 98765 43216', department: 'Operations', role: 'Staff', designation: 'Operations Executive', status: 'active', joined: 'Nov 12, 2023', address: 'Mumbai, Maharashtra', emergencyContact: '+91 98765 77777', documents: [{ name: 'Aadhaar Card', date: 'Nov 2023' }, { name: 'PAN Card', date: 'Nov 2023' }] },
  8: { id: 8, name: 'Kavita Reddy', email: 'kavita@neomed.com', phone: '+91 98765 43217', department: 'Delivery', role: 'Staff', designation: 'Delivery Executive', status: 'active', joined: 'Jul 22, 2024', address: 'Nashik, Maharashtra', emergencyContact: '+91 98765 88888', documents: [{ name: 'Aadhaar Card', date: 'Jul 2024' }, { name: 'PAN Card', date: 'Jul 2024' }] },
};

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  inactive: 'bg-zinc-50 text-zinc-500 border-zinc-100',
  on_leave: 'bg-amber-50 text-amber-700 border-amber-100',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  inactive: 'Inactive',
  on_leave: 'On Leave',
};

export default function StaffDetail() {
  const { staffId } = useParams();
  const navigate = useNavigate();
  const staff = MOCK_STAFF[Number(staffId)];

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
      {/* Header */}
      <div className="flex items-start justify-between">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 font-medium transition-colors">
          <ArrowLeft size={16} />Back
        </button>
        <Link to={`/hrms/staff/${staff.id}/edit`}
          className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors">
          <Edit2 size={14} />Edit
        </Link>
      </div>

      {/* Profile Card */}
      <div className="bg-white border border-zinc-100 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-zinc-900 text-white flex items-center justify-center text-xl font-bold shrink-0">
            {staff.name.split(' ').map((n) => n[0]).join('')}
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-zinc-900">{staff.name}</h1>
            <p className="text-sm text-zinc-500 mt-0.5">{staff.designation}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className={`inline-block px-2.5 py-1 rounded-lg text-[11px] font-bold border ${STATUS_STYLES[staff.status]}`}>
                {STATUS_LABELS[staff.status]}
              </span>
              <span className="text-xs text-zinc-400">•</span>
              <span className="text-xs font-medium text-zinc-500">{staff.department} Department</span>
            </div>
          </div>
        </div>
      </div>

      {/* Personal Info */}
      <div className="bg-white border border-zinc-100 rounded-2xl p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">Personal Information</h2>
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
              <p className="text-sm font-medium text-zinc-900">{staff.phone}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center text-purple-500 shrink-0">
              <Building2 size={16} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Department</p>
              <p className="text-sm font-medium text-zinc-900">{staff.department}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center text-amber-500 shrink-0">
              <Calendar size={16} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Joined</p>
              <p className="text-sm font-medium text-zinc-900">{staff.joined}</p>
            </div>
          </div>
        </div>
        <div className="pt-3 border-t border-zinc-50">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Address</p>
          <p className="text-sm text-zinc-600">{staff.address}</p>
        </div>
        <div className="pt-3 border-t border-zinc-50">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Emergency Contact</p>
          <p className="text-sm text-zinc-600">{staff.emergencyContact}</p>
        </div>
      </div>

      {/* Documents */}
      <div className="bg-white border border-zinc-100 rounded-2xl p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">Documents</h2>
        <div className="space-y-2">
          {staff.documents.map((doc) => (
            <div key={doc.name} className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-400">
                  <FileText size={16} />
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-900">{doc.name}</p>
                  <p className="text-[11px] text-zinc-400">Uploaded {doc.date}</p>
                </div>
              </div>
              <button className="p-2 text-zinc-400 hover:text-zinc-600 rounded-lg hover:bg-white transition-colors">
                <Download size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
