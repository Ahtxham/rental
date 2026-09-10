import bcrypt from "bcrypt";

// Cost ≥ 12 per security requirements
const SALT_ROUNDS = 12;

export const hashPassword = (plain: string): Promise<string> => bcrypt.hash(plain, SALT_ROUNDS);

export const comparePassword = (plain: string, hash: string): Promise<boolean> =>
  bcrypt.compare(plain, hash);

export const generateOtp = (): string => `${Math.floor(100000 + Math.random() * 900000)}`;
