import { UserRole } from '../database/enums';

export interface AuthenticatedUser {
  id: string;
  email: string;
  username: string | null;
  firstName: string;
  lastName: string;
  role: UserRole;
}
