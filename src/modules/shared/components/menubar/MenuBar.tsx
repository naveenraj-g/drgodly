"use client";

import { usePathname } from "@/i18n/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { NavGroup } from "./NavGroup";
import { AppTitle } from "./AppTitle";
import { SidebarNavUser } from "../SidebarNavUser";
import { type NavGroup as NavGroupProps } from "./types";
import { homeSidebarData, settingsSidebarData } from "./menu-datas";

type TUser = {
  name: string;
  email: string;
  image?: string | null;
  username?: string | null;
};

export function MenuBar(user: TUser) {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const currentSlug = segments[1] ?? "";
  const isSettings = currentSlug === "settings";

  const navGroups: NavGroupProps[] = (
    isSettings ? settingsSidebarData : homeSidebarData
  ).navGroups as NavGroupProps[];

  return (
    <Sidebar collapsible="icon" side="left">
      <SidebarHeader>
        <AppTitle />
      </SidebarHeader>
      <SidebarContent>
        {navGroups.map((props) => (
          <NavGroup key={props.title} {...props} />
        ))}
      </SidebarContent>
      <SidebarFooter>
        <SidebarNavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
