export interface PollingUnit {
  code: string; name: string;
  state_code: string; state_name: string; lga_code: string; lga_name: string; ward_code: string; ward_name: string;
  ward_key: string; lat: number | null; lng: number | null;
}
export interface Ward {
  ward_key: string; state_code: string; state_name: string; lga_code: string; lga_name: string; ward_code: string; ward_name: string; pu_count: number;
}
