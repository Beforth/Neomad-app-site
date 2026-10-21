import { REPORTS, REPORT_GROUPS } from './reports/definitions';
import ReportsHub from './reports/ReportsHub';

/** Delivery reports. The layout is shared with the HRMS reports page. */
export default function Reports() {
  return (
    <ReportsHub
      reports={REPORTS}
      groups={REPORT_GROUPS}
      description="Pick a report on the left. Most have a date range, and every table can be exported to CSV."
      legacy={{ travel: 'path', availability: 'workload' }}
    />
  );
}
