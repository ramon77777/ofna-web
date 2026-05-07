export interface LoginUser {
  id: string;
  role: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
}

export interface LoginResponse {
  accessToken: string;
  user: LoginUser;
}

export interface PartnerDocument {
  id: string;
  documentType: string;
  fileUrl: string;
  documentStatus: string;
  adminComment: string | null;
  submittedAt: string;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PartnerUser {
  id: string;
  role: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  profilePhotoUrl: string | null;
  accountStatus: string;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PartnerWallet {
  id: string;
  balance: string;
  walletStatus: string;
  createdAt: string;
  updatedAt: string;
}

export interface PartnerProfile {
  id: string;
  activityType: string;
  businessName: string | null;
  description: string | null;
  interventionZone: string | null;
  address: string | null;
  latitude: string | null;
  longitude: string | null;
  validationStatus: string;
  averageRating: string;
  reviewsCount: number;
  isAvailable: boolean;
  isVisible: boolean;
  validatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  user: PartnerUser;
  wallet?: PartnerWallet;
  documents?: PartnerDocument[];
}

export interface WalletMission {
  id: string;
  missionType: string;
  panneType: string | null;
  vehicleType: string | null;
  departureAddress: string;
  departureLatitude: string;
  departureLongitude: string;
  destinationAddress: string | null;
  destinationLatitude: string | null;
  destinationLongitude: string | null;
  selectionMode: string;
  proposedAmount: string | null;
  validatedAmount: string | null;
  paymentMode: string | null;
  missionStatus: string;
  acceptedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  commissionProcessed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WalletTransaction {
  id: string;
  transactionType: string;
  sourceType: string;
  amount: string;
  balanceBefore: string;
  balanceAfter: string;
  label: string;
  reference: string | null;
  note: string | null;
  createdAt: string;
  mission?: WalletMission | null;
}

export interface CommissionOrder {
  id: string;
  orderStatus?: string;
}

export interface Commission {
  id: string;
  operationType: string;
  operationAmount: string;
  commissionRate: string;
  commissionAmount: string;
  debitedAt: string | null;
  note: string | null;
  createdAt: string;
  partnerProfile?: PartnerProfile;
  mission?: WalletMission | null;
  order?: CommissionOrder | null;
}

export interface PartnerDashboardStats {
  missionsCommissionedCount: number;
  totalCommissionPaid: string;
  currentBalance: string;
}

export interface PartnerDashboardResponse {
  partnerProfile: PartnerProfile;
  wallet: PartnerWallet;
  recentTransactions: WalletTransaction[];
  recentCommissions: Commission[];
  stats: PartnerDashboardStats;
}

export interface AdminMission {
  id: string;
  missionType: string;
  panneType: string | null;
  vehicleType: string | null;
  departureAddress: string;
  departureLatitude?: string;
  departureLongitude?: string;
  destinationAddress: string | null;
  destinationLatitude: string | null;
  destinationLongitude: string | null;
  selectionMode?: string;

  proposedAmount: string | null;
  validatedAmount: string | null;
  paymentMode: string | null;

  missionStatus: string;
  commissionProcessed: boolean;

  acceptedAt: string | null;
  createdAt: string;
  updatedAt?: string;
  completedAt: string | null;
  cancelledAt: string | null;

  client: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    email?: string;
  };

  partnerProfile: {
    id: string;
    businessName: string | null;
    user: {
      firstName: string;
      lastName: string;
      phone: string;
    };
    wallet?: {
      balance: string;
      walletStatus: string;
    };
  } | null;
}

export interface AdminPartner {
  id: string;
  activityType: string;
  businessName: string | null;
  description: string | null;
  interventionZone: string | null;
  address: string | null;
  latitude?: string | null;
  longitude?: string | null;
  validationStatus: string;
  averageRating: string;
  reviewsCount: number;
  isAvailable: boolean;
  isVisible: boolean;
  validatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    email: string | null;
  };
  wallet?: {
    id: string;
    balance: string;
    walletStatus: string;
  };
  documents?: PartnerDocument[];
}

export interface AdminOperationalAlert {
  level: 'warning' | 'info' | 'success';
  title: string;
  message: string;
}

export interface AdminDashboardStats {
  totalPartners: number;
  pendingPartners: number;
  validatedPartners: number;
  totalMissions: number;
  completedMissions: number;
  totalCommissionAmount: string;
  pendingRecharges: number;
  documentsToRedo: number;
  commissionsToProcess: number;
}

export interface AdminDashboardResponse {
  stats: AdminDashboardStats;
  recentMissions: AdminMission[];
  recentPartners: AdminPartner[];
  operationalAlerts: AdminOperationalAlert[];
}

export interface AdminCommission {
  id: string;
  operationType: string;
  operationAmount: string;
  commissionRate: string;
  commissionAmount: string;
  debitedAt: string | null;
  note: string | null;
  createdAt: string;
  partnerProfile: AdminPartner;
  mission: AdminMission | null;
  order: unknown | null;
}

export interface AdminPartnerDetails {
  partner: AdminPartner;
  transactions: WalletTransaction[];
  commissions: Commission[];
}