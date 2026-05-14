import { Navigate } from 'react-router-dom';

/** Legacy URL: opens the create-task modal on the tasks list. */
export default function TaskCreatePage() {
  return <Navigate to="/tasks" replace state={{ openTaskCreate: true }} />;
}
