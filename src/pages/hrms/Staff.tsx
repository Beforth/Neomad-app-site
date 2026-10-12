import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  UserPlus, Shield, Trash2, Edit2, CheckCircle2,
  XCircle, Search, Key, X, Save, Eye, EyeOff, ChevronLeft, ChevronRight,
  Users, UserCheck, UserX, Plus, ArrowUpDown, ChevronUp,
  ChevronDown, Inbox, Fingerprint, RotateCcw, Download, Loader2, MoreHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getUsers, getRoles, createUser, updateUser, resetUserPassword, deleteBiometricPin, createBiometricPin, updateBiometricPin, listUserBiometricPins, mapBackendRoleToFrontend, normalizeFetchError, type BiometricPin } from '../../lib/api';
import SearchableSelect from '../../components/SearchableSelect';
import { exportEmployeesXlsx } from '../../lib/hrmsExports';

import Modal from '../../components/Modal';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input, fieldClass } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/app-shell';
import { EmptyState } from '@/components/ui/empty-state';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import KpiStrip from '@/components/KpiStrip';
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

function toTableUser(u: { id: number; email: string; full_name: string | null; phone?: string | null; department?: string | null; is_active: boolean; role_codes: string[] }) {
  const username = u.full_name || u.email.split('@')[0];
  const role = mapBackendRoleToFrontend(u.role_codes);
  const role_code = u.role_codes?.[0] ?? 'user';
  return {
    id: u.id,
    username,
    email: u.email,
    phone: u.phone ?? undefined,
    department: u.department ?? undefined,
    role,
    role_code,
    status: (u.is_active ? 'active' : 'inactive') as 'active' | 'inactive',
  };
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground/85 mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputClassName = fieldClass;

const ROLE_FILTER_OPTIONS = [
  { value: 'all', label: 'All Roles' },
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'delivery_boy', label: 'Delivery Boy' },
  { value: 'staff', label: 'Staff' },
];

const PAGE_SIZE = 10;

export default function Staff() {
  const { user: currentUser, token } = useAuth();
  const navigate = useNavigate();
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  type SortKey = 'name' | 'role' | 'status';
  const [sortBy, setSortBy] = useState<SortKey>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);

  function toggleSort(key: SortKey) {
    if (sortBy === key) setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
    else { setSortBy(key); setSortOrder('asc'); }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortBy !== col) return <ArrowUpDown size={12} className="text-muted-foreground/50" />;
    return sortOrder === 'asc' ? <ChevronUp size={12} className="text-foreground" /> : <ChevronDown size={12} className="text-foreground" />;
  }

  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [resetUser, setResetUser] = useState<any | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<any | null>(null);

  const [bioPins, setBioPins] = useState<BiometricPin[]>([]);
  const [bioLoading, setBioLoading] = useState(false);
  const [bioError, setBioError] = useState<string | null>(null);
  const [bioReloadKey, setBioReloadKey] = useState(0);
  const [bioNew, setBioNew] = useState({ deviceSn: '', pin: '' });
  const [bioSaving, setBioSaving] = useState(false);
  const [bioUpdateId, setBioUpdateId] = useState<number | null>(null);
  const [bioUpdateField, setBioUpdateField] = useState<{ pin: string; deviceName: string | null; isActive: boolean } | null>(null);
  const [bioBusyId, setBioBusyId] = useState<number | null>(null);

  useEffect(() => {
    if (!editingUser?.id) return;
    let cancelled = false;
    setBioLoading(true);
    setBioError(null);
    listUserBiometricPins(token as string, editingUser.id)
      .then((pins) => { if (!cancelled) setBioPins(pins); })
      .catch((e) => { if (!cancelled) setBioError(normalizeFetchError(e, 'Failed to load biometric pins')); })
      .finally(() => { if (!cancelled) setBioLoading(false); });
    return () => { cancelled = true; };
  }, [editingUser?.id, token, bioReloadKey]);

  const handleAddBioPin = async () => {
    if (!token || !editingUser?.id) return;
    if (!bioNew.deviceSn.trim()) { showToast('Enter the device serial number'); return; }
    if (!bioNew.pin.trim()) { showToast('Enter the biometric ID'); return; }
    setBioSaving(true);
    try {
      await createBiometricPin(token, {
        user_id: editingUser.id,
        device_sn: bioNew.deviceSn.trim(),
        pin_on_device: bioNew.pin.trim(),
      });
      setBioNew({ deviceSn: '', pin: '' });
      const pins = await listUserBiometricPins(token, editingUser.id);
      setBioPins(pins);
      showToast('Biometric ID added');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to add biometric ID');
    } finally {
      setBioSaving(false);
    }
  };

  const handleDeleteBioPin = async (p: BiometricPin) => {
    if (!token) return;
    setBioBusyId(p.id);
    try {
      await deleteBiometricPin(token, p.device_sn, p.id);
      setBioPins((prev) => prev.filter((x) => x.id !== p.id));
      showToast('Biometric mapping removed');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to remove biometric mapping');
    } finally {
      setBioBusyId(null);
    }
  };

  const handleToggleBioPin = async (p: BiometricPin) => {
    if (!token) return;
    setBioBusyId(p.id);
    try {
      await updateBiometricPin(token, p.device_sn, p.id, { is_active: !p.is_active });
      const pins = await listUserBiometricPins(token, editingUser.id);
      setBioPins(pins);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to update mapping');
    } finally {
      setBioBusyId(null);
    }
  };

  const handleSaveBioPin = async (p: BiometricPin) => {
    if (!token || !bioUpdateId || !bioUpdateField) return;
    setBioBusyId(p.id);
    try {
      await updateBiometricPin(token, p.device_sn, p.id, {
        pin_on_device: bioUpdateField.pin.trim(),
        device_name: bioUpdateField.deviceName?.trim() || null,
      });
      setBioUpdateId(null);
      setBioUpdateField(null);
      const pins = await listUserBiometricPins(token, editingUser.id);
      setBioPins(pins);
      showToast('Biometric ID updated');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to update biometric ID');
    } finally {
      setBioBusyId(null);
    }
  };

  const [newPw, setNewPw] = useState('');
  const [adminPw, setAdminPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showAdminPw, setShowAdminPw] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const [roles, setRoles] = useState<{ id: number; name: string; code: string }[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [rolesError, setRolesError] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchStaff();
    fetchRoles();
  }, [token]);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(1); }, [roleFilter, searchDebounced]);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      if (token) {
        const data = await getUsers(token);
        setStaff(data.map(toTableUser));
      } else {
        setStaff([]);
      }
    } catch {
      setStaff([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    if (!token) return;
    setRolesLoading(true);
    setRolesError(null);
    try {
      const data = await getRoles(token);
      setRoles(data);
    } catch (e) {
      setRoles([]);
      setRolesError(normalizeFetchError(e, 'Failed to load roles'));
    } finally {
      setRolesLoading(false);
    }
  };

  // Exports the full employee master for the current filters, not just this
  // page — the browser never holds every column the workbook carries.
  const handleExport = async () => {
    if (!token || exporting) return;
    setExporting(true);
    try {
      const { filename } = await exportEmployeesXlsx(token, {
        search: searchDebounced || undefined,
        role_code: roleFilter !== 'all' ? roleFilter : undefined,
      });
      showToast(`Downloaded ${filename}`);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Export failed.');
    } finally {
      setExporting(false);
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };



  const handleToggleStatus = async (u: any) => {
    if (!token) return;
    try {
      await updateUser(token, u.id, { is_active: u.status !== 'active' });
      fetchStaff();
      showToast(u.status === 'active' ? 'Staff deactivated' : 'Staff activated');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to update status');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !resetUser?.id) return;
    if (newPw.length < 6) {
      showToast('Password must be at least 6 characters');
      return;
    }
    if (!adminPw) {
      showToast('Enter admin password to continue');
      return;
    }
    setResetLoading(true);
    try {
      await resetUserPassword(token, resetUser.id, adminPw, newPw);
      setResetUser(null);
      setNewPw('');
      setAdminPw('');
      setShowPw(false);
      setShowAdminPw(false);
      showToast('Password reset successfully');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to reset password');
    } finally {
      setResetLoading(false);
    }
  };

  const handleDeleteUser = async (u: any) => {
    if (!token) return;
    try {
      await updateUser(token, u.id, { is_active: false });
      fetchStaff();
      showToast('Staff member deactivated');
      setDeleteConfirm(null);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to delete staff');
    }
  };

  const filtered = useMemo(() => {
    const q = searchDebounced.toLowerCase().trim();
    return staff.filter((s) => {
      const matchSearch = !q || s.username.toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
      const matchRole = roleFilter === 'all' || s.role === roleFilter;
      return matchSearch && matchRole;
    });
  }, [staff, searchDebounced, roleFilter]);

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortBy === 'name') cmp = a.username.localeCompare(b.username);
    else if (sortBy === 'role') cmp = a.role.localeCompare(b.role);
    else if (sortBy === 'status') cmp = a.status.localeCompare(b.status);
    return sortOrder === 'asc' ? cmp : -cmp;
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const startRow = (page - 1) * PAGE_SIZE + 1;
  const endRow = Math.min(page * PAGE_SIZE, sorted.length);
  const paged = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const total = staff.length;
  const active = staff.filter((s) => s.status === 'active').length;
  const inactive = staff.filter((s) => s.status === 'inactive').length;

  const canManage = currentUser?.role === 'admin' || currentUser?.role === 'manager';
  const hasFilters = search || roleFilter !== 'all';

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="fixed top-5 right-5 z-[9999] bg-foreground text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-medium">
            <CheckCircle2 size={16} className="text-primary" /> {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <PageHeader title="Staff" description="Manage your team members" actions={<>
{canManage && (
          <div className="self-start sm:self-auto flex items-center gap-2">
            <Button variant="outline" size="sm"
              onClick={handleExport}
              disabled={exporting}
              
            >
              {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              {exporting ? 'Exporting…' : 'Export Excel'}
            </Button>
            <Button variant="dark" size="sm"
              onClick={() => navigate('/hrms/staff/new')}
              
            >
              <Plus size={16} />Add Staff
            </Button>
          </div>
        )}
</>} />

      <KpiStrip items={[
  { label: 'Total Staff', value: total },
  { label: 'Active', value: active },
  { label: 'Inactive', value: inactive },
]} />

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70" size={14} />
          <Input data-search="" className="w-full pl-9 pr-4"
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            
          />
        </div>
        <div className="w-[160px]">
          <SearchableSelect
            value={roleFilter}
            onChange={(v) => setRoleFilter(v)}
            options={ROLE_FILTER_OPTIONS}
            placeholder="Role"
            className="w-full"
          />
        </div>
        {hasFilters && (
          <button
            onClick={() => { setSearch(''); setRoleFilter('all'); }}
            className="text-xs text-muted-foreground/70 hover:text-foreground/85 flex items-center gap-1 transition-colors"
          >
            <XCircle size={12} />Clear
          </button>
        )}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card rounded-xl border border-border shadow-[0_1px_2px_rgb(0_0_0/0.03)] overflow-hidden"
      >

        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {[
                  { key: 'name' as SortKey, label: 'Name' },
                  { key: null, label: 'Phone' },
                  { key: 'role' as SortKey, label: 'Role' },
                  { key: 'status' as SortKey, label: 'Status' },
                  ...(canManage ? [{ key: null, label: 'Actions' }] : []),
                ].map((col) => (
                  <TableHead
                    key={col.label}
                    onClick={col.key ? () => toggleSort(col.key) : undefined}
                    className={`uppercase whitespace-nowrap text-left ${col.key ? 'cursor-pointer hover:text-foreground/70 select-none' : ''}`}
                  >
                    <span className="flex items-center gap-1">
                      {col.label}
                      {col.key && <SortIcon col={col.key} />}
                    </span>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">Loading staff...</TableCell></TableRow>
              ) : paged.map((s, i) => {
                const isSelf = s.id === currentUser?.id;
                return (
                    <motion.tr
                      key={s.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="border-b transition-colors hover:bg-muted/70"
                    >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-foreground/70 font-semibold text-xs border border-border shadow-sm">
                          {s.username[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-foreground">{s.username}</p>
                          <p className="text-xs text-muted-foreground">{s.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-foreground/70">{s.phone || <span className="text-muted-foreground/50">—</span>}</TableCell>
                    <TableCell>
                      <Badge className={`capitalize ${ROLE_COLORS[s.role] || 'bg-muted text-foreground/70'}`}>
                        <Shield size={10} />{s.role.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <button onClick={() => handleToggleStatus(s)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold capitalize transition-all border ${s.status === 'active' ? 'bg-accent text-accent-foreground border-primary/20 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20' : 'bg-destructive/10 text-destructive border-destructive/20 hover:bg-accent hover:text-accent-foreground hover:border-primary/20'}`}
                        title="Click to toggle">
                        {s.status === 'active' ? <><CheckCircle2 size={10} />Active</> : <><XCircle size={10} />Inactive</>}
                      </button>
                    </TableCell>
                    {canManage && (
                      <TableCell className="w-10 pl-0" onClick={(e) => e.stopPropagation()}>
<DropdownMenu>
<DropdownMenuTrigger asChild>
<Button variant="ghost" size="icon-sm" data-row-menu="" aria-label="Row actions"><MoreHorizontal /></Button>
</DropdownMenuTrigger>
<DropdownMenuContent align="end" className="w-52">
<DropdownMenuItem onSelect={() => navigate(`/hrms/staff/${s.id}/edit`)}><Edit2 /> Edit Staff</DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => setEditingUser({ ...s })}><Fingerprint /> Biometric ID(s)</DropdownMenuItem>
                          {!isSelf && (
                            <DropdownMenuItem onSelect={() => { setResetUser(s); setNewPw(''); setAdminPw(''); setShowPw(false); setShowAdminPw(false); }}><Key /> Reset Password</DropdownMenuItem>
                          )}
                          {!isSelf && (
                            <DropdownMenuItem destructive onSelect={() => setDeleteConfirm(s)}><Trash2 /> Delete Staff</DropdownMenuItem>
                          )}
</DropdownMenuContent>
</DropdownMenu>
</TableCell>
                    )}
                  </motion.tr>
                );
              })}
              {sorted.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={5}>
                    <EmptyState icon={<Inbox />} title="No staff members found" description="Try adjusting your search or filters" className="border-0" />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="md:hidden divide-y divide-border">
          {paged.map((s, i) => (
            <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="p-4 space-y-2"
              >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-foreground/70 font-semibold">
                    {s.username[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{s.username}</p>
                    <p className="text-xs text-muted-foreground">{s.email}</p>
                  </div>
                </div>
                {canManage && (
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon-sm" onClick={() => navigate(`/hrms/staff/${s.id}/edit`)} ><Edit2 size={16} /></Button>
                    <Button variant="ghost" size="icon-sm" className="hover:text-primary" onClick={() => setEditingUser({ ...s })}  title="Biometric ID(s)"><Fingerprint size={16} /></Button>
                    <Button variant="ghost" size="icon-sm" className="hover:text-info" onClick={() => { setResetUser(s); setNewPw(''); setAdminPw(''); setShowPw(false); setShowAdminPw(false); }} ><Key size={16} /></Button>
                    <Button variant="ghost" size="icon-sm" className="hover:text-destructive" onClick={() => setDeleteConfirm(s)} ><Trash2 size={16} /></Button>
                  </div>
                )}
              </div>
              <div className="flex gap-2 flex-wrap">
                <Badge className={`capitalize ${ROLE_COLORS[s.role] || 'bg-muted text-foreground/70'}`}>
                  <Shield size={10} />{s.role.replace('_', ' ')}
                </Badge>
                <button onClick={() => handleToggleStatus(s)}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${s.status === 'active' ? 'bg-primary/15 text-accent-foreground' : 'bg-destructive/15 text-destructive'}`}>
                  {s.status === 'active' ? <><CheckCircle2 size={10} />Active</> : <><XCircle size={10} />Inactive</>}
                </button>
              </div>
            </motion.div>
          ))}
          {sorted.length === 0 && !loading && (
            <EmptyState icon={<Inbox />} title="No staff members found" description="Try adjusting your search or filters" className="border-0" />
          )}
        </div>

        {sorted.length > 0 && (
          <div className="flex items-center justify-between flex-wrap gap-2 px-4 py-3 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Showing <span className="font-semibold text-foreground">{startRow}</span>–
              <span className="font-semibold text-foreground">{endRow}</span> of{' '}
              <span className="font-semibold text-foreground">{sorted.length}</span> staff
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon-sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                
              >
                <ChevronLeft size={16} className="text-foreground/70" />
              </Button>
              <Button variant="outline" size="icon-sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                
              >
                <ChevronRight size={16} className="text-foreground/70" />
              </Button>
            </div>
          </div>
        )}
      </motion.div>

      {/* BIOMETRIC ID MODAL — profile editing lives on /hrms/staff/:id/edit */}
      {editingUser && (
        <Modal title={`Biometric ID(s) — ${editingUser.username ?? ''}`} onClose={() => setEditingUser(null)} wide closeOnBackdropClick={false}>
          <div className="p-5 space-y-4">

            <div className="border-t border-border pt-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-semibold text-foreground/85 uppercase tracking-wide flex items-center gap-1.5">
                  <Fingerprint size={14} className="text-primary" /> Biometric ID(s)
                </h4>
              </div>

              {bioLoading && <p className="text-xs text-muted-foreground/70">Loading biometric mappings...</p>}
              {bioError && (
                <p className="text-xs text-destructive flex items-center gap-2">
                  {bioError}
                  <button type="button" onClick={() => setBioReloadKey((k) => k + 1)} className="text-primary font-medium hover:underline">Retry</button>
                </p>
              )}

              {!bioLoading && !bioError && bioPins.length === 0 && (
                <p className="text-xs text-muted-foreground/70 mb-3">No biometric ID assigned yet. Add the device serial number (printed on the machine) and the staff member's PIN/ID on that device.</p>
              )}

              <div className="space-y-2">
                {bioPins.map((p) => (
                  <div key={p.id} className="flex items-center gap-2 p-2.5 bg-muted border border-border rounded-xl">
                    {bioUpdateId === p.id ? (
                      <>
                        <Input className="w-auto" type="text" value={bioUpdateField?.pin ?? ''}
                          onChange={(e) => setBioUpdateField((prev) => prev ? { ...prev, pin: e.target.value } : prev)}
                          placeholder="Biometric ID" 
                          style={{ width: '110px' }}
                        />
                        <Input className="w-auto" type="text" value={bioUpdateField?.deviceName ?? ''}
                          onChange={(e) => setBioUpdateField((prev) => prev ? { ...prev, deviceName: e.target.value } : prev)}
                          placeholder="Device name (optional)" 
                          style={{ flex: 1, minWidth: 0 }}
                        />
                        <Button variant="ghost" size="icon-sm" className="text-primary hover:bg-accent" type="button" onClick={() => handleSaveBioPin(p)} disabled={bioBusyId === p.id}
                           title="Save">
                          <Save size={14} />
                        </Button>
                        <Button variant="ghost" size="icon-sm" type="button" onClick={() => { setBioUpdateId(null); setBioUpdateField(null); }}
                           title="Cancel">
                          <X size={14} />
                        </Button>
                      </>
                    ) : (
                      <>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground">
                            {p.device_name || p.device_sn}
                            <span className="text-muted-foreground/70 font-medium"> · {p.device_sn}</span>
                          </p>
                          <p className="text-[11px] text-muted-foreground">ID: <span className="font-semibold text-foreground/85">{p.pin_on_device}</span></p>
                        </div>
                        <Badge className={`${p.is_active ? 'bg-accent text-accent-foreground' : 'bg-secondary text-muted-foreground'}`}>
                          {p.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        <Button variant="ghost" size="icon-sm" className="hover:text-warning hover:bg-warning/10" type="button" onClick={() => handleToggleBioPin(p)} disabled={bioBusyId === p.id}
                           title={p.is_active ? 'Deactivate' : 'Activate'}>
                          <RotateCcw size={13} />
                        </Button>
                        <Button variant="ghost" size="icon-sm" type="button" onClick={() => { setBioUpdateId(p.id); setBioUpdateField({ pin: p.pin_on_device, deviceName: p.device_name, isActive: p.is_active }); }}
                           title="Edit">
                          <Edit2 size={13} />
                        </Button>
                        <Button variant="ghost" size="icon-sm" className="hover:text-destructive hover:bg-destructive/10" type="button" onClick={() => handleDeleteBioPin(p)} disabled={bioBusyId === p.id}
                           title="Remove">
                          <Trash2 size={13} />
                        </Button>
                      </>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-3 flex gap-2">
                <Input type="text" value={bioNew.deviceSn}
                  onChange={(e) => setBioNew((prev) => ({ ...prev, deviceSn: e.target.value }))}
                  placeholder="Device serial (e.g. SN12345)"  style={{ flex: 1, minWidth: 0 }} />
                <Input type="text" value={bioNew.pin}
                  onChange={(e) => setBioNew((prev) => ({ ...prev, pin: e.target.value }))}
                  placeholder="Biometric ID"  style={{ flex: 1, minWidth: 0 }} />
                <Button size="sm" className="whitespace-nowrap" type="button" onClick={handleAddBioPin} disabled={bioSaving || bioLoading}
                  >
                  <Plus size={14} /> {bioSaving ? 'Adding...' : 'Add'}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground/70 mt-2">Matches punches sent by the device to this staff member. The device serial is on the machine's label.</p>
            </div>
          </div>
        </Modal>
      )}

      {/* RESET PASSWORD MODAL */}
      {resetUser && (
        <Modal title={`Reset Password — ${resetUser.username}`} onClose={() => setResetUser(null)}>
          <form onSubmit={handleResetPassword} className="p-5 space-y-4">
            <p className="text-sm text-muted-foreground">Enter a new password for <strong>{resetUser.username}</strong>.</p>
            <div className="relative">
              <Input type={showAdminPw ? 'text' : 'password'} placeholder="Your admin password"
                value={adminPw} onChange={(e) => setAdminPw(e.target.value)} required  />
              <button type="button" onClick={() => setShowAdminPw(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/70">
                {showAdminPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <div className="relative">
              <Input type={showPw ? 'text' : 'password'} placeholder="New password (min 6 chars)"
                value={newPw} onChange={(e) => setNewPw(e.target.value)} minLength={6} required  />
              <button type="button" onClick={() => setShowPw(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/70">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <Button size="lg" className="w-full bg-info text-white hover:bg-info hover:text-white bg-info text-white hover:bg-info" type="submit" disabled={resetLoading} >
              <Key size={16} /> {resetLoading ? 'Resetting...' : 'Reset Password'}
            </Button>
          </form>
        </Modal>
      )}

      {/* DELETE CONFIRM MODAL */}
      {deleteConfirm && (
        <Modal title="Remove Staff" onClose={() => setDeleteConfirm(null)}>
          <div className="p-5 space-y-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to deactivate <strong>{deleteConfirm.username}</strong>? This will remove their access.
            </p>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setDeleteConfirm(null)}
                >
                Cancel
              </Button>
              <Button variant="destructive" className="flex-1" onClick={() => handleDeleteUser(deleteConfirm)}
                >
                <Trash2 size={14} /> Deactivate
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
