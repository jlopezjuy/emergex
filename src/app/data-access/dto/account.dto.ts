export interface LoginRequest {
  username: string;
  password: string;
  rememberMe: boolean;
}

export interface JwtToken {
  id_token: string;
  refresh_token?: string;
}

export interface AccountDTO {
  id: number;
  login: string;
  email: string;
  firstName?: string;
  lastName?: string;
  authorities: string[];
  langKey?: string;
}
