import React, { createContext, useContext, ReactNode } from "react";
import type { AuthUser } from "@/lib/authorize";
import type { TenantId, UserId } from "@/types/ids";

interface AuthContextValue {
  user: AuthUser;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Fake user for development
const FAKE_USER: AuthUser = {
  userId: "user_123" as UserId,
  tenantId: "tenant_456" as TenantId,
  role: "admin"
};

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  return (
    <AuthContext.Provider value={{ user: FAKE_USER }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
