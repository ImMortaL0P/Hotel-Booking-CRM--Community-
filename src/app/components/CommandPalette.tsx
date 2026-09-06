import { useEffect, useState } from "react";
import { Command } from "cmdk";
import { useNavigate } from "react-router";
import { Search, LayoutDashboard, BookOpenText, Users, BedDouble, CalendarDays, Key, Settings, CreditCard, LogOut } from "lucide-react";
import { useData } from "../data/DataContext";

export function CommandPalette({ open, setOpen }: { open: boolean, setOpen: (o: boolean) => void }) {
  const navigate = useNavigate();
  const { bookings, guests, logout } = useData();

  // Toggle the menu when ⌘K is pressed
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(true);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [setOpen]);

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />
      <div className="relative z-50 w-full max-w-[600px] overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-sm">
        <Command className="w-full flex flex-col bg-background" label="Global Command Menu">
          <div className="flex items-center border-b border-border px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Command.Input
              autoFocus
              placeholder="Search bookings, guests, or jump to page..."
              className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 border-0 focus:ring-0"
            />
          </div>

          <Command.List className="max-h-[300px] overflow-y-auto overflow-x-hidden p-2">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              No results found.
            </Command.Empty>

            <Command.Group heading="Navigation" className="text-xs font-semibold text-muted-foreground px-2 py-1.5 overflow-hidden">
              <Command.Item
                onSelect={() => runCommand(() => navigate("/dashboard"))}
                className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none hover:bg-muted aria-selected:bg-muted aria-selected:text-foreground text-foreground mb-1"
              >
                <LayoutDashboard className="mr-2 h-4 w-4" />
                <span>Dashboard</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => navigate("/bookings"))}
                className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none hover:bg-muted aria-selected:bg-muted aria-selected:text-foreground text-foreground mb-1"
              >
                <BookOpenText className="mr-2 h-4 w-4" />
                <span>Bookings</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => navigate("/calendar"))}
                className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none hover:bg-muted aria-selected:bg-muted aria-selected:text-foreground text-foreground mb-1"
              >
                <CalendarDays className="mr-2 h-4 w-4" />
                <span>Calendar</span>
              </Command.Item>
            </Command.Group>

            <Command.Group heading="Recent Guests" className="text-xs font-semibold text-muted-foreground px-2 py-1.5 mt-2">
              {guests.slice(0, 3).map(guest => (
                <Command.Item
                  key={guest.id}
                  onSelect={() => runCommand(() => navigate("/guests"))}
                  className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none hover:bg-muted aria-selected:bg-muted aria-selected:text-foreground text-foreground mb-1"
                >
                  <Users className="mr-2 h-4 w-4" />
                  <span>{guest.name} ({guest.phone})</span>
                </Command.Item>
              ))}
            </Command.Group>

            <Command.Group heading="Quick Actions" className="text-xs font-semibold text-muted-foreground px-2 py-1.5 mt-2">
              <Command.Item
                onSelect={() => runCommand(() => logout())}
                className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none hover:bg-destructive/10 aria-selected:bg-destructive/10 aria-selected:text-destructive text-destructive mb-1"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign Out</span>
              </Command.Item>
            </Command.Group>

          </Command.List>
        </Command>
      </div>
    </div>
  );
}