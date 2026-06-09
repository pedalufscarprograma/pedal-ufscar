export interface UpdateOperatingHourItemDto {
  dayOfWeek: number;
  isOpen: boolean;
  openTime?: string | null;
  closeTime?: string | null;
}

export interface UpdateOperatingHoursDto {
  hours: UpdateOperatingHourItemDto[];
}