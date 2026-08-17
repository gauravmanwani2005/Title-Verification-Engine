import { useRole } from '@/context/RoleContext';
import { OfficerDashboard } from './OfficerDashboard';
import { ApplicantDashboard } from './ApplicantDashboard';

/**
 * Renders the correct dashboard based on the current role.
 * Both share the same route ("/") — the content switches on role change.
 */
export function RoleDashboard() {
  const { role } = useRole();
  return role === 'officer' ? <OfficerDashboard /> : <ApplicantDashboard />;
}
