export interface CustomerProfilePersonalDto {
  displayName: string;
  phone: string;
  email: string;
}

export interface CustomerProfileDto {
  personal: CustomerProfilePersonalDto;
}

export interface CustomerProfileUpdateRequest {
  personal: {
    displayName: string;
    phone: string;
  };
}
