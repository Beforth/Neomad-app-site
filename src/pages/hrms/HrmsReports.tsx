import ReportsHub from '../reports/ReportsHub';
import { HRMS_REPORTS, HRMS_REPORT_GROUPS } from './hrmsReportDefs';

/** HRMS reports. Same layout as the delivery Reports page. */
export default function HrmsReports() {
  return (
    <ReportsHub
      reports={HRMS_REPORTS}
      groups={HRMS_REPORT_GROUPS}
      description="Pick a report on the left. Every table can be exported to CSV, and most to Excel."
    />
  );
}
