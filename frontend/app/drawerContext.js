import { createContext, useContext } from "react";

export const DrawerCtx = createContext({
  open: false,
  openDrawer: () => {},
  closeDrawer: () => {},
});

export const useDrawer = () => useContext(DrawerCtx);
