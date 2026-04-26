export interface LoginRequestDto {
  email: string;
  password: string;
  role: UserRole;
}

export interface LoginResponseDto {
  token: string;
}

export enum UserRole {
  ADMIN = 'ADMIN',
  CUSTOMER = 'CUSTOMER',
  COURIER = 'COURIER',
}
