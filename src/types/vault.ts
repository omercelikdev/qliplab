export type VaultItemType = 'address' | 'card' | 'bank' | 'personal' | 'company' | 'code';

export interface VaultItem {
  id: string;
  type: VaultItemType;
  title: string;
  data: any;
  icon?: string;
  isFavorite: boolean;
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
  city: string;
  postalCode: string;
  country: string;
}

export interface CodeData {
  code: string;
  notes?: string;
}
