export type VaultItemType = 'address' | 'card' | 'bank' | 'personal' | 'company' | 'code';

export type VaultItemData = CardData | BankData | AddressData | PersonalData | CompanyData | CodeData;

export interface VaultItem {
  id: string;
  type: VaultItemType;
  title: string;
  data: VaultItemData;
  trigger?: string;
  icon?: string;
  isPinned: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CardData {
  cardholderName: string;
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
}

export interface BankData {
  bankName: string;
  accountHolder: string;
  iban: string;
  swift?: string;
}

export interface AddressData {
  street: string;
  addressLine2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
}

export interface PersonalData {
  firstName: string;
  lastName: string;
  email?: string;
  phoneCountry?: string;
  phone?: string;
  dateOfBirth?: string;
}

export interface CompanyData {
  companyName: string;
  taxId?: string;
  registrationNumber?: string;
  website?: string;
}

export interface CodeData {
  code: string;
  notes?: string;
}
