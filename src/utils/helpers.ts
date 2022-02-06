import jwt_decode from "jwt-decode";
import { JWTClaims, JWTHasuraClaims } from "./types";

export const isBrowser = () => typeof window !== "undefined";

export class inMemoryLocalStorage {
  private memory: {
    [key: string]: string | null;
  };

  constructor() {
    this.memory = {};
  }

  setItem(key: string, value: any): void {
    this.memory[key] = value;
  }
  getItem(key: string): string | null {
    return this.memory[key];
  }
  removeItem(key: string): void {
    delete this.memory[key];
  }
}

export const getUserRolesFromClaims = (jwt: string): { defaultRole: string, roles: string[] } => {
  const jwtTokenDecoded: JWTClaims = jwt_decode(jwt);
  const claims: JWTHasuraClaims =
    jwtTokenDecoded["https://hasura.io/jwt/claims"];
  return {
    defaultRole: claims["x-hasura-default-role"],
    roles: claims["x-hasura-allowed-roles"],
  };
}; 
