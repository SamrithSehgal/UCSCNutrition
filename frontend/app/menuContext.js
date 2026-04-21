import { createContext, useContext } from "react";

export const MenuCtx = createContext({
  menu: null,
  loading: false,
  error: null,
  fetchMenu: async () => {},
});

export const useMenu = () => useContext(MenuCtx);
