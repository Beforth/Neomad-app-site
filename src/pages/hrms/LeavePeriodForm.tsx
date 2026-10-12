import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { Save } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import SearchableSelect from '../../components/SearchableSelect';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input, fieldClass } from '@/components/ui/input';
import {
  getLeavePeriod,
  createLeavePeriod,
  updateLeavePeriod,
  listHolidayLists,
  type HolidayListOut,
} from '../../lib/hrmsLeave';

const inputClass = fieldClass;

export default function LeavePeriodForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { token } = useAuth();
  const isEdit = Boolean(id);

  const [label, setLabel] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [holidayListId, setHolidayListId] = useState('');
  const [holidayLists, setHolidayLists] = useState<HolidayListOut[]>([]);
  const [holidayOptions, setHolidayOptions] = useState<{ value: string; label: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) return;
    listHolidayLists(token)
      .then((lists) => {
        setHolidayLists(lists);
        setHolidayOptions([
          ...lists.map((h) => ({ value: String(h.id), label: h.name })),
          { value: '__create__', label: '+ Create Holiday List' },
        ]);
      })
      .catch(() => {
        setHolidayOptions([{ value: '__create__', label: '+ Create Holiday List' }]);
      });
  }, [token]);

  useEffect(() => {
    if (!isEdit || !token) return;
    getLeavePeriod(token, Number(id))
      .then((item) => {
        setLabel(item.label);
        setStartDate(item.start_date);
        setEndDate(item.end_date);
        setIsActive(item.is_active);
        setHolidayListId(item.holiday_list_id ? String(item.holiday_list_id) : '');
      })
      .catch(() => {
        setNotFound(true);
      });
  }, [id, isEdit, token]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim() || !startDate || !endDate || !token) return;
    setSaving(true);
    setErrorMsg('');

    try {
      if (isEdit) {
        await updateLeavePeriod(token, Number(id), {
          label: label.trim(),
          start_date: startDate,
          end_date: endDate,
          is_active: isActive,
          holiday_list_id: holidayListId ? Number(holidayListId) : null,
        });
      } else {
        await createLeavePeriod(token, {
          label: label.trim(),
          start_date: startDate,
          end_date: endDate,
          is_active: isActive,
          holiday_list_id: holidayListId ? Number(holidayListId) : null,
        });
      }
      navigate('/hrms/leave/period');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save leave period');
    } finally {
      setSaving(false);
    }
  };

  const handleHolidayChange = (val: string) => {
    if (val === '__create__') {
      navigate('/hrms/leave/period/holidays/new');
      return;
    }
    setHolidayListId(val);
  };

  if (notFound) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <h3 className="text-sm font-semibold text-foreground mb-1">Leave period not found</h3>
          <p className="text-xs text-muted-foreground/70 mb-4">The leave period you're trying to edit doesn't exist.</p>
          <Button variant="dark" size="sm" onClick={() => navigate('/hrms/leave/period')}
            >
            Back to Leave Periods
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <Button variant="ghost" size="icon-sm"
          onClick={() => navigate('/hrms/leave/period')}
          
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
        </Button>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{isEdit ? 'Edit Leave Period' : 'New Leave Period'}</h1>
          <p className="text-[13px] text-muted-foreground">{isEdit ? 'Update the leave cycle details' : 'Create a new leave cycle'}</p>
        </div>
      </motion.div>

      {errorMsg && (
        <div className="p-3 bg-destructive/10 text-destructive rounded-xl text-xs font-medium border border-destructive/20">
          {errorMsg}
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <Card>
          <form onSubmit={handleSave}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-5">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-muted-foreground/70 font-medium mb-1.5">Period Label *</label>
                  <Input type="text" required value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="e.g. FY 2027–2028"
                     />
                </div>
                <div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <span className={`relative inline-flex items-center justify-center w-[18px] h-[18px] rounded shrink-0 transition-all ${isActive ? 'bg-foreground' : 'border-2 border-input hover:border-muted-foreground'}`}>
                      <input type="checkbox" checked={isActive}
                        onChange={() => setIsActive((v) => !v)}
                        className="sr-only" />
                      {isActive && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                          className="w-3 h-3 pointer-events-none">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </span>
                    <span className="text-sm text-foreground/85">Set as Active Period</span>
                  </label>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground/70 font-medium mb-1.5">Holidays for Optional Leaves</label>
                  <SearchableSelect
                    value={holidayListId}
                    onChange={handleHolidayChange}
                    options={holidayOptions}
                    placeholder="Select or create"
                  />
                  {holidayListId && (() => {
                    const found = holidayLists.find((h) => String(h.id) === holidayListId);
                    if (!found) return null;
                    return (
                      <div className="mt-2 text-[11px] text-muted-foreground bg-muted rounded-lg px-3 py-2 border border-border">
                        <span className="font-medium text-foreground/85">{found.name}</span>
                        <span className="mx-1.5">·</span>
                        <span>{found.holidays?.length ?? 0} holidays</span>
                        {found.from_date && found.to_date && (
                          <>
                            <span className="mx-1.5">·</span>
                            <span>{found.from_date} → {found.to_date}</span>
                          </>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
              <div className="border-t lg:border-t-0 lg:border-l border-border pt-4 lg:pt-0 lg:pl-6 space-y-4">
                <div>
                  <label className="block text-xs text-muted-foreground/70 font-medium mb-1.5">Start Date *</label>
                  <Input type="date" required value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                     />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground/70 font-medium mb-1.5">End Date *</label>
                  <Input type="date" required value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                     />
                </div>
              </div>
            </div>

            <div className="border-t border-border p-5 flex gap-3">
              <Button variant="secondary" className="flex-1" type="button" onClick={() => navigate('/hrms/leave/period')}
                >
                Cancel
              </Button>
              <Button variant="dark" className="flex-1" type="submit" disabled={saving || !label.trim() || !startDate || !endDate}
                >
                <Save size={16} /> {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Period'}
              </Button>
            </div>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}
