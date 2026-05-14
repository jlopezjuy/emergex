export interface Account {
  id: number;
  login: string;
  email: string;
  firstName?: string;
  lastName?: string;
  authorities: string[];
  langKey?: string;
  imageUrl?: string;
}
