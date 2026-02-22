import express, { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { PrismaClient, User as PrismaUser } from "@prisma/client";

// ---------------------------------------------------------------------------
// Constants & Configuration
// ---------------------------------------------------------------------------

const SALT_ROUNDS = 12;
const TOKEN_EXPIRY = "7d";
const REFRESH_TOKEN_EXPIRY = "30d";
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

enum AuthRole {
  Guest = "guest",
  Member = "member",
  Admin = "admin",
  SuperAdmin = "super_admin",
}

enum AccountStatus {
  Active = "active",
  Suspended = "suspended",
  PendingVerification = "pending_verification",
  Deactivated = "deactivated",
}

// ---------------------------------------------------------------------------
// Types & Interfaces
// ---------------------------------------------------------------------------

interface TokenPayload {
  userId: string;
  email: string;
  role: AuthRole;
  iat?: number;
  exp?: number;
}

interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: SanitizedUser;
}

interface SanitizedUser {
  id: string;
  email: string;
  displayName: string;
  role: AuthRole;
  status: AccountStatus;
  lastLoginAt: Date | null;
}

type PasswordStrength = "weak" | "fair" | "strong" | "very_strong";

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  displayName: z.string().min(2).max(64),
  inviteCode: z.string().optional(),
});

type RegisterInput = z.infer<typeof RegisterSchema>;

// ---------------------------------------------------------------------------
// Standalone utility functions
// ---------------------------------------------------------------------------

/** Strips sensitive fields (passwordHash, mfaSecret) before returning user. */
function sanitizeUser(user: PrismaUser): SanitizedUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role as AuthRole,
    status: user.status as AccountStatus,
    lastLoginAt: user.lastLoginAt,
  };
}

/**
 * Evaluates password entropy using character-class heuristic.
 * Returns a tier label rather than a numeric score so callers
 * don't need to know the threshold values.
 */
function evaluatePasswordStrength(password: string): PasswordStrength {
  let score = 0;
  if (password.length >= 12) score++;
  if (password.length >= 20) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return "weak";
  if (score === 2) return "fair";
  if (score === 3) return "strong";
  return "very_strong";
}

/**
 * Builds both access and refresh JWTs for a given user.
 * Internally calls `_signToken` (a nested helper) twice with
 * different expiry values.
 */
function generateTokenPair(
  user: SanitizedUser,
  secret: string,
): { accessToken: string; refreshToken: string } {
  function _signToken(payload: TokenPayload, expiresIn: string): string {
    return jwt.sign(payload, secret, { expiresIn });
  }

  const payload: TokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };

  return {
    accessToken: _signToken(payload, TOKEN_EXPIRY),
    refreshToken: _signToken(payload, REFRESH_TOKEN_EXPIRY),
  };
}

// ---------------------------------------------------------------------------
// AuthService class
// ---------------------------------------------------------------------------

class AuthService {
  private db: PrismaClient;
  private jwtSecret: string;

  constructor(db: PrismaClient, jwtSecret: string) {
    this.db = db;
    this.jwtSecret = jwtSecret;
  }

  /**
   * Registers a new user. Validates input with Zod, hashes password,
   * checks for duplicate email, persists to DB, and returns tokens.
   */
  async register(input: unknown): Promise<AuthResult> {
    const parsed = RegisterSchema.parse(input);

    const strength = evaluatePasswordStrength(parsed.password);
    if (strength === "weak") {
      throw new Error("Password is too weak. Include uppercase, numbers, or symbols.");
    }

    const existing = await this.db.user.findUnique({
      where: { email: parsed.email },
    });
    if (existing) {
      throw new Error("An account with this email already exists.");
    }

    const passwordHash = await bcrypt.hash(parsed.password, SALT_ROUNDS);
    const user = await this.db.user.create({
      data: {
        email: parsed.email,
        passwordHash,
        displayName: parsed.displayName,
        role: AuthRole.Member,
        status: AccountStatus.PendingVerification,
      },
    });

    const sanitized = sanitizeUser(user);
    const tokens = generateTokenPair(sanitized, this.jwtSecret);
    return { ...tokens, user: sanitized };
  }

  /**
   * Authenticates by email + password. Enforces rate-limiting via
   * a failed-attempt counter and lockout window stored on the user row.
   */
  async login(email: string, password: string): Promise<AuthResult> {
    const user = await this.db.user.findUnique({ where: { email } });
    if (!user) throw new Error("Invalid credentials.");

    if (user.status === AccountStatus.Suspended) {
      throw new Error("Account suspended. Contact support.");
    }

    if (
      user.failedLoginAttempts >= MAX_LOGIN_ATTEMPTS &&
      user.lastFailedLoginAt &&
      Date.now() - user.lastFailedLoginAt.getTime() < LOCKOUT_DURATION_MS
    ) {
      throw new Error("Account temporarily locked. Try again later.");
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      await this.db.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: { increment: 1 },
          lastFailedLoginAt: new Date(),
        },
      });
      throw new Error("Invalid credentials.");
    }

    await this.db.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lastLoginAt: new Date(),
      },
    });

    const sanitized = sanitizeUser(user);
    const tokens = generateTokenPair(sanitized, this.jwtSecret);
    return { ...tokens, user: sanitized };
  }

  /** Verifies a JWT and returns its decoded payload, or throws. */
  verifyToken(token: string): TokenPayload {
    return jwt.verify(token, this.jwtSecret) as TokenPayload;
  }

  /**
   * Express middleware factory. Attaches decoded token to `req.user`.
   * Optionally restricts to a set of allowed roles.
   */
  requireAuth(allowedRoles?: AuthRole[]) {
    return (req: Request, _res: Response, next: NextFunction): void => {
      const header = req.headers.authorization;
      if (!header?.startsWith("Bearer ")) {
        throw new Error("Missing or malformed Authorization header.");
      }

      const decoded = this.verifyToken(header.slice(7));

      if (allowedRoles && !allowedRoles.includes(decoded.role)) {
        throw new Error("Insufficient permissions.");
      }

      (req as any).user = decoded;
      next();
    };
  }
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export {
  AuthRole,
  AccountStatus,
  sanitizeUser,
  evaluatePasswordStrength,
  generateTokenPair,
  RegisterSchema,
};

export type {
  TokenPayload,
  AuthResult,
  SanitizedUser,
  PasswordStrength,
  RegisterInput,
};

export default AuthService;
