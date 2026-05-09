/** Matches `UserDto` from the API; extra fields optional for forward compatibility. */
export interface User {
  id: string;
  email: string;
  displayName?: string | null;
  phoneNumber?: string | null;
  role: string;
  createdAt?: string;
  updatedAt?: string;
}
