"use client";

import { useEffect, useState } from "react";
import api from "../fetcher";

type User = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  is_staff: boolean;
  account_type: "standard" | "editor" | "admin";
  created_at: string;
};


export default function useCurrent() {
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    api.get<User>("/users/current/")
      .then((res) => setUser(res.data))
      .catch(() => {setUser(null)}); // se falhar, considera não logado
  }, []);

  return user;
}
