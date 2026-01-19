import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AppHeader() {
  return (
    <header
      className="
        sticky top-0 z-50
        bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80
        border-b border-[#E6EAF0]
      "
      role="banner"
      aria-label="Application header"
    >
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 h-14 md:h-16 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2" aria-label="Go to dashboard">
          <img
            src="/brand/clearstack-logo-horiz.svg"
            alt="ClearStack logo"
            className="h-7 md:h-8 w-auto align-middle"
          />
          <span className="text-[18px] md:text-[20px] font-semibold tracking-tight" style={{ color: '#046E75' }}>
            ClearStack
          </span>
        </a>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#E8F6F4] ring-1 ring-[#E6EAF0] hover:shadow-sm"
              aria-label="Account menu"
            >
              <span className="text-sm font-medium" style={{ color: '#046E75' }}>CM</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Christian Marlman</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild><a href="/settings">Settings</a></DropdownMenuItem>
            <DropdownMenuItem asChild><a href="/profile">Profile</a></DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600">Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
