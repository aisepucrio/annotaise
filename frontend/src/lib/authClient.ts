"use client";

import Cookies from "js-cookie";
import { api } from "@/modules/api";

/**
 * Stores a token in cookies.
 */
const storeToken = (token: string, type: "access" | "refresh") => {
  Cookies.set(type + "Token", token);
};

/**
 * Retrieves a token from cookies.
 */
const getToken = (type: "access" | "refresh") => {
  return Cookies.get(type + "Token");
};

const removeTokens = () => {
  Cookies.remove("accessToken");
  Cookies.remove("refreshToken");
};

const login = (email: string, password: string) => {
  return api.post("/api/auth/token/", { email, password });
};

const logout = () => {
  const refreshToken = getToken("refresh");
  return api.post("/api/auth/logout/", { refresh: refreshToken });
};

const handleJWTRefresh = () => {
  const refreshToken = getToken("refresh");
  return api.post("/api/auth/token/refresh/", { refresh: refreshToken });
};

export const AuthActions = () => {
  return {
    login,
    handleJWTRefresh,
    storeToken,
    getToken,
    logout,
    removeTokens,
  };
};
