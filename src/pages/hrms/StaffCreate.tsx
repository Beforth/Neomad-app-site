import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';

export default function StaffCreate() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', email: '', phone: '', department: 'Delivery', designation: '', role: 'Staff', address: '', emergencyContact: '',
  });

  const handleChange = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate('/hrms/staff');
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Add Staff</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Add a new team member</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-white border border-zinc-100 rounded-2xl p-6 shadow-sm space-y-5">
          <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">Personal Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-500 mb-1.5">Full Name *</label>
              <input type="text" value={form.name} onChange={(e) => handleChange('name', e.target.value)} required
                className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all placeholder:text-zinc-300"
                placeholder="Enter full name" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 mb-1.5">Email *</label>
              <input type="email" value={form.email} onChange={(e) => handleChange('email', e.target.value)} required
                className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all placeholder:text-zinc-300"
                placeholder="email@neomed.com" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 mb-1.5">Phone *</label>
              <input type="tel" value={form.phone} onChange={(e) => handleChange('phone', e.target.value)} required
                className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all placeholder:text-zinc-300"
                placeholder="+91 98765 00000" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 mb-1.5">Address</label>
              <input type="text" value={form.address} onChange={(e) => handleChange('address', e.target.value)}
                className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all placeholder:text-zinc-300"
                placeholder="City, State" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-500 mb-1.5">Emergency Contact</label>
            <input type="tel" value={form.emergencyContact} onChange={(e) => handleChange('emergencyContact', e.target.value)}
              className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all placeholder:text-zinc-300"
              placeholder="+91 98765 00000" />
          </div>
        </div>

        <div className="bg-white border border-zinc-100 rounded-2xl p-6 shadow-sm space-y-5">
          <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">Work Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-500 mb-1.5">Department *</label>
              <select value={form.department} onChange={(e) => handleChange('department', e.target.value)} required
                className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all">
                <option value="Delivery">Delivery</option>
                <option value="Operations">Operations</option>
                <option value="Warehouse">Warehouse</option>
                <option value="Office Admin">Office Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 mb-1.5">Designation *</label>
              <input type="text" value={form.designation} onChange={(e) => handleChange('designation', e.target.value)} required
                className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all placeholder:text-zinc-300"
                placeholder="e.g. Delivery Executive" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 mb-1.5">Role *</label>
              <select value={form.role} onChange={(e) => handleChange('role', e.target.value)} required
                className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all">
                <option value="Staff">Staff</option>
                <option value="Lead">Lead</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button type="submit"
            className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-sm px-5 py-3 rounded-xl transition-colors">
            <Save size={16} />Create Staff
          </button>
          <button type="button" onClick={() => navigate(-1)}
            className="px-5 py-3 text-sm font-medium text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl transition-colors">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
