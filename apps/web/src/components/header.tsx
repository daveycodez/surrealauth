import { Avatar, Dropdown, Label, Separator, Skeleton } from "@heroui/react"
import { buttonVariants } from "@heroui/styles"
import { Link, useNavigate } from "@tanstack/react-router"

import { useUser } from "../hooks/use-user"
import { logout } from "../lib/surreal"
import type { User } from "../types/schema.generated"

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-separator bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center gap-6 px-4">
        <Link to="/" className="text-base font-semibold tracking-tight">
          SurrealDB
        </Link>

        <nav className="flex items-center gap-1">
          <Link
            to="/todos"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
            activeProps={{ "aria-current": "page", className: "text-accent" }}
          >
            Todos
          </Link>
        </nav>

        <div className="ml-auto flex items-center">
          <AccountArea />
        </div>
      </div>
    </header>
  )
}

function AccountArea() {
  const { data: user, isLoading } = useUser()

  if (isLoading) {
    return <Skeleton className="size-8 rounded-full" />
  }

  if (!user) {
    return (
      <Link to="/sign-in" className={buttonVariants({ variant: "primary", size: "sm" })}>
        Sign in
      </Link>
    )
  }

  return <AccountMenu user={user} />
}

function initials(user: User) {
  if (!user.name) return user.email[0]?.toUpperCase() ?? "?"

  return (
    user.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?"
  )
}

function AccountMenu({ user }: { user: User }) {
  const navigate = useNavigate()

  async function onAction(key: React.Key) {
    if (key === "todos") {
      await navigate({ to: "/todos" })
    } else if (key === "sign-out") {
      await logout()
      await navigate({ to: "/" })
    }
  }

  return (
    <Dropdown>
      <Dropdown.Trigger aria-label="Account menu" className="rounded-full">
        <Avatar size="sm">
          <Avatar.Fallback>{initials(user)}</Avatar.Fallback>
        </Avatar>
      </Dropdown.Trigger>
      <Dropdown.Popover placement="bottom end">
        <div className="flex items-center gap-2 px-3 pt-3 pb-2">
          <Avatar size="sm">
            <Avatar.Fallback>{initials(user)}</Avatar.Fallback>
          </Avatar>
          <div className="flex min-w-0 flex-col">
            <p className="truncate text-sm leading-5 font-medium">{user.name ?? user.email}</p>
            <p className="truncate text-xs leading-none text-muted">{user.email}</p>
          </div>
        </div>
        <Separator />
        <Dropdown.Menu onAction={onAction}>
          <Dropdown.Item id="todos" textValue="Todos">
            <Label>Todos</Label>
          </Dropdown.Item>
          <Dropdown.Item id="sign-out" textValue="Sign out" variant="danger">
            <Label>Sign out</Label>
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  )
}
