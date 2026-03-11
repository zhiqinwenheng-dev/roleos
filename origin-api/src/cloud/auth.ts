import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export interface AuthClaims {
  sub: string;
  email: string;
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function verifyPassword(password: string, passwordHash: string): boolean {
  return bcrypt.compareSync(password, passwordHash);
}

export function signToken(claims: AuthClaims, secret: string): string {
  return jwt.sign(claims, secret, {
    expiresIn: "12h"
  });
}

export function verifyToken(token: string, secret: string): AuthClaims {
  const payload = jwt.verify(token, secret) as jwt.JwtPayload;
  if (!payload.sub || !payload.email) {
    throw new Error("Invalid token payload.");
  }
  return {
    sub: String(payload.sub),
    email: String(payload.email)
  };
}
