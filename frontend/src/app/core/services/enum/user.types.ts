/** Matches `UserDto` from the API; extra fields optional for forward compatibility. */
export interface User {
  id: string;
  email: string;
  role: string;
  createdAt?: string;
  updatedAt?: string;
}
