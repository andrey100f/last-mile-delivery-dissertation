export interface CourierProfilePersonalDto {
  displayName: string;
  phone: string;
}

export interface CourierProfileAvailabilityDto {
  availableNow: boolean;
  expressCapable: boolean;
}

export interface CourierProfileDto {
  personal: CourierProfilePersonalDto;
  availability: CourierProfileAvailabilityDto;
}

export interface CourierProfileUpdateRequest {
  personal: CourierProfilePersonalDto;
  availability: CourierProfileAvailabilityDto;
}
