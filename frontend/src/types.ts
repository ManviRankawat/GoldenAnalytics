export interface FilterOptions {
  fys: number[];
  agencies: string[];
  categories: string[];
  subCategories: { subCategory: string; category: string }[];
  vendors: string[];
}

export interface FilterState {
  fy: string;
  agency: string;
  category: string;
  subCategory: string;
  vendor: string;
}

export interface DashboardSummary {
  totalAmount: number;
  totalCount: number;
  uniqueVendors: number;
  avgAmount: number;
}

export interface CategoryData   { category: string; total: number; }
export interface MonthData      { fy: number; fMonth: number; total: number; }
export interface VendorData     { vendor: string; total: number; }
export interface AgencyData     { agency: string; total: number; }

export interface PaymentRecord {
  id: number;
  bien: string;
  fy: number;
  f_month: number;
  agy: string;
  agency: string;
  object: string;
  category: string;
  subobj: string;
  sub_category: string;
  vendor: string;
  amount: number;
}

export interface Pagination {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface DimChange {
  label: string;
  fy22: number;
  fy23: number;
  pctChange: number | null;
  absChange: number;
  isNew: boolean;
}

export interface ChangesData {
  categories: DimChange[];
  agencies: DimChange[];
  vendors: DimChange[];
  highlights: {
    topIncrease: DimChange | null;
    largestDrop: DimChange | null;
    newCategory: DimChange | null;
  };
}

export interface MonthBreakdown {
  fMonth: number;
  byCategory: CategoryData[];
  byAgency: AgencyData[];
  byVendor: VendorData[];
  byFY: { fy: number; total: number }[];
}

export interface DashboardData {
  summary: DashboardSummary;
  byCategory: CategoryData[];
  byMonth: MonthData[];
  topVendors: VendorData[];
  byAgency: AgencyData[];
  records: PaymentRecord[];
  pagination: Pagination;
}
