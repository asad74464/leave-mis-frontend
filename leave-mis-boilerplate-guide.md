# Leave-MIS as a Reusable Boilerplate — Source of Truth

This guide turns your `leave-mis-backend` (Spring Boot) and `leave-mis-frontend`
(React/Vite/Tailwind/shadcn) projects into a reusable template for **any** new
CRUD-style system: different entities, different roles, different relationships.

It covers:

1. What's already in the codebase, and how the pieces fit together
2. How to copy/rename the projects for a new scenario
3. How to model a new domain (entities, roles, relationships)
4. Full copy-paste templates for every relationship type (1:1, 1:N, N:1, N:M) —
   only N:1 exists today, so the others are written out in full
5. Adding the CRUD operations that are **missing today** (Update, Delete) —
   with full code, since only Create/Read exist right now
6. Frontend templates for a new resource (API calls, table, dialogs, page)
7. One worked example end-to-end (a "Library" scenario) tying it all together
8. A "what do I copy for X" cheat-sheet

Keep this file next to the two projects — it's meant to be the reference you
open every time you start a new scenario.

---

## 1. What you actually have today

### Backend (`leave-mis-backend`) — Spring Boot 4 + PostgreSQL + JPA/Hibernate

```
entity/       User, Role(enum), LeaveType, LeaveRequest, LeaveStatus(enum), LeaveBalance
repository/   one Spring Data JPA interface per entity
service/      business logic, @Transactional where multiple writes must succeed together
controller/   @RestController, thin — delegates to service
dto/request/  what the client sends in (records + Bean Validation)
dto/response/ what the client gets back (records, built from entities via .from())
security/     JWT issue/verify, Spring Security wiring, CustomUserDetailsService
exception/    AppException (expected errors) + GlobalExceptionHandler (central mapping to HTTP)
config/       SecurityConfig, CorsConfig, DataSeeder (seeds demo data on boot)
```

Layering is strict and one-directional:

```
Controller  →  Service  →  Repository  →  Database
   (HTTP)       (rules)      (queries)
```

Controllers never touch repositories directly, and services never touch
`HttpServletRequest`/`ResponseEntity`. Keep that rule when you extend this.

**Existing relationships** (all `@ManyToOne`, i.e. "child points at parent"):

| Entity        | Relationship                                   |
|---------------|-------------------------------------------------|
| `LeaveRequest` | → `User` (requester), → `User` (reviewer, nullable), → `LeaveType` |
| `LeaveBalance` | → `User`, → `LeaveType` (unique pair per row)  |

There is currently **no** `@OneToOne` and **no** `@ManyToMany` anywhere in the
project — section 4 gives you full templates for both, in this codebase's
exact style.

**Existing CRUD coverage** (this is the real gap you asked about):

| Entity       | Create | Read (list) | Read (one) | Update | Delete |
|--------------|:---:|:---:|:---:|:---:|:---:|
| `User`       | ✅ (register) | ❌ | ❌ | ❌ | ❌ |
| `LeaveType`  | ✅ | ✅ | ❌ | ❌ | ❌ |
| `LeaveRequest` | ✅ | ✅ | ✅ | ⚠️ status-only (approve/reject) | ❌ |
| `LeaveBalance` | (auto-created) | ✅ | ❌ | ❌ | ❌ |

**Nothing in this project currently does a full Update or Delete.** Section 5
below writes those out completely, in the same idioms the rest of the code
already uses, so you have a real template to copy for every future entity.

### Frontend (`leave-mis-frontend`) — React 18 + Vite + Tailwind v4 + shadcn/ui

```
lib/api.js            single fetch wrapper — every page calls api.get/post/patch
context/AuthContext.jsx  JWT + user in localStorage, exposes useAuth()
components/ui/         shadcn primitives (button, dialog, table, input, select...)
components/            feature components (tables, dialogs) built from ui/ primitives
pages/                 one page per route, owns its own data-loading + state
components/layout/     AppShell / Sidebar / Topbar (shell every authenticated page sits in)
App.jsx                route table, wraps admin-only routes in <ProtectedRoute adminOnly>
```

Pattern per page: `useState` for data + loading, a `load()` callback that
calls one or more `api.get(...)`, `useEffect(load, [])` to fire it once,
handlers that call `api.post/patch` then re-`load()`. No global state
library — deliberately simple, and worth keeping unless a new scenario
genuinely needs more (see note in section 6).

**`api.js` has no `api.delete` yet** — added in section 6, symmetric with
the backend Delete endpoints you'll add in section 5.

---

## 2. Cloning this for a brand-new scenario

1. **Backend**: copy the folder, rename the Maven artifact and base package.
   ```bash
   cp -r leave-mis-backend new-project-backend
   cd new-project-backend
   # rename package com.leavemis -> com.newproject everywhere
   grep -rl 'com\.leavemis' src pom.xml | xargs sed -i 's/com\.leavemis/com.newproject/g'
   mv src/main/java/com/leavemis src/main/java/com/newproject
   # then edit pom.xml <artifactId>, <name>, and application.properties
   # (db name, jwt secret) by hand
   ```
2. **Frontend**: copy the folder, update `package.json` name, `index.html`
   `<title>`, and `VITE_API_URL` in `.env` if the backend port/host changes.
   ```bash
   cp -r leave-mis-frontend new-project-frontend
   ```
3. **Delete the domain-specific pieces** you won't reuse: the `LeaveType`,
   `LeaveRequest`, `LeaveBalance` entities/repos/services/controllers/DTOs on
   the backend, and their pages/components on the frontend. **Keep**: `User`,
   `Role`, everything under `security/`, `exception/`, `config/`,
   `AuthContext.jsx`, `lib/api.js`, `components/ui/`, `components/layout/`,
   `ProtectedRoute.jsx`. Those are the actual reusable core — auth, RBAC,
   error handling, the API wrapper, and the shell — and they don't know
   anything about leave requests.
4. Rebuild your domain using sections 3–6 below.

---

## 3. Modeling a new domain

Before writing code, answer these for every new entity, the same way this
project already answers them for `LeaveRequest`:

- **What are its fields**, and which are required (`nullable = false` /
  `@NotBlank` etc.)?
- **Who owns it** — does it belong to a `User` (like `LeaveRequest.user`), or
  is it independent (like `LeaveType`)?
- **What's its relationship to other entities** — one-to-many, many-to-one,
  one-to-one, or many-to-many? (Section 4 has the exact JPA shape for each.)
- **Who can Create / Read / Update / Delete it** — everyone logged in, owner
  only, admin only? This becomes your `@PreAuthorize` / service-level
  ownership check (see `LeaveRequestService.getById()` for the "check
  ownership inside the service, not the route" pattern).
- **Does creating/updating it need to touch another table atomically?** (Like
  a new `LeaveType` needing a `LeaveBalance` row per existing user.) If so,
  it needs `@Transactional` and the "load, validate, write both" pattern from
  `LeaveRequestService.approve()`.

---

## 4. Relationship cookbook

All four JPA relationship types, written in this project's exact style
(Lombok `@Builder`, `FetchType.LAZY`, explicit `@JoinColumn`). Copy whichever
one matches your new entity's relationship to an existing one.

### 4.1 Many-to-One (already in the project — reference pattern)

This is what `LeaveRequest → LeaveType` already looks like. Use this whenever
"many rows of Child point at one row of Parent":

```java
@Entity
@Table(name = "tasks")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Task {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;   // many Tasks -> one Project

    @Column(nullable = false)
    private String title;
}
```

Always set `fetch = FetchType.LAZY` explicitly — the JPA default for
`@ManyToOne` is `EAGER`, which silently N+1s (see the comment on
`LeaveBalance.user` in the code).

### 4.2 One-to-Many (the inverse side — new to this project)

If you also want to load "all Tasks for a Project" *from the Project side*
(e.g. `project.getTasks()`), add the mirror side. `mappedBy` points at the
field name on the `@ManyToOne` side — no new column, no new table, it's the
same foreign key read the other direction:

```java
@Entity
@Table(name = "projects")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Project {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @OneToMany(mappedBy = "project", fetch = FetchType.LAZY)
    @Builder.Default
    private List<Task> tasks = new ArrayList<>();
}
```

**Prefer NOT adding this unless you actually need `project.getTasks()`.**
This codebase's existing pattern (see `LeaveRequestRepository.findAllForUser`)
is to query the "many" side directly with a repository method instead of
navigating from the "one" side — it's more explicit about what's being
fetched and avoids accidentally lazy-loading a huge collection. Add the
`@OneToMany` side only when the domain genuinely needs "show me the parent
with its children in one shot" (e.g. a Project detail page with its tasks
inline).

### 4.3 One-to-One (new to this project)

Use when exactly one row of A matches exactly one row of B — e.g. extending
`User` with an optional `EmployeeProfile` without bloating the `User` table
itself:

```java
@Entity
@Table(name = "employee_profiles")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class EmployeeProfile {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // The owning side holds the foreign key. unique = true on the
    // @JoinColumn is what actually enforces "one profile per user" at
    // the database level — the same idea as LeaveBalance's
    // @UniqueConstraint, just for a single column instead of a pair.
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    private String jobTitle;
    private String department;
    private LocalDate hireDate;
}
```

```java
// Optional inverse side on User, if you want user.getProfile():
@OneToOne(mappedBy = "user", fetch = FetchType.LAZY)
private EmployeeProfile profile;
```

Repository lookup you'll want alongside it:

```java
public interface EmployeeProfileRepository extends JpaRepository<EmployeeProfile, Long> {
    Optional<EmployeeProfile> findByUserId(Long userId);
}
```

### 4.4 Many-to-Many (new to this project)

Use when many rows of A can relate to many rows of B — e.g. `LeaveRequest`
tagged with multiple `Label`s, or (worked example below) `Book`s with
multiple `Author`s. **Always model the join table explicitly as its own
`@Entity`** rather than using JPA's raw `@ManyToMany` + `@JoinTable`, even
though the latter is shorter — this project's style favors explicit,
inspectable state (see how `LeaveBalance` is its own entity rather than a
hidden join). An explicit join entity also gives you somewhere to put extra
columns later (e.g. `assignedAt`, `royaltyShare`) without a rewrite.

```java
// The join entity itself
@Entity
@Table(
    name = "book_authors",
    uniqueConstraints = @UniqueConstraint(columnNames = {"book_id", "author_id"})
)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BookAuthor {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "book_id", nullable = false)
    private Book book;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id", nullable = false)
    private Author author;
}
```

```java
public interface BookAuthorRepository extends JpaRepository<BookAuthor, Long> {
    List<BookAuthor> findAllByBookId(Long bookId);
    List<BookAuthor> findAllByAuthorId(Long authorId);
    void deleteByBookIdAndAuthorId(Long bookId, Long authorId);
}
```

Service methods to attach/detach (mirrors the "create balance rows"
transactional pattern already in `AuthService.register`):

```java
@Transactional
public void addAuthorToBook(Long bookId, Long authorId) {
    Book book = bookRepository.findById(bookId)
        .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Book not found"));
    Author author = authorRepository.findById(authorId)
        .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Author not found"));

    bookAuthorRepository.save(BookAuthor.builder().book(book).author(author).build());
}

@Transactional
public void removeAuthorFromBook(Long bookId, Long authorId) {
    bookAuthorRepository.deleteByBookIdAndAuthorId(bookId, authorId);
}
```

If you only need to *read* "all authors of this book" as a list rather than
manage the join rows one at a time, add a `JOIN FETCH` query the same way
`LeaveBalanceRepository.findAllForUser` does:

```java
@Query("SELECT ba.author FROM BookAuthor ba WHERE ba.book.id = :bookId")
List<Author> findAuthorsForBook(@Param("bookId") Long bookId);
```

---

## 5. Adding full CRUD (the missing Update/Delete)

Using `LeaveType` as the concrete example (it currently only has
Create + Read-all). This is the template to copy for every entity that needs
full CRUD in your new scenario.

### 5.1 Request DTO for updates

Same shape as the create DTO — reuse it if the fields are identical, or make
a dedicated one if update should accept a different/smaller field set:

```java
// dto/request/UpdateLeaveTypeRequest.java
package com.leavemis.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record UpdateLeaveTypeRequest(
    @NotBlank(message = "name is required")
    @Size(min = 2, message = "name must be at least 2 characters")
    String name,

    String description,

    @NotNull(message = "annualLimit is required")
    @Positive(message = "annualLimit must be a positive number")
    Integer annualLimit
) {
}
```

### 5.2 Service: update + delete

```java
// add to LeaveTypeService.java

@Transactional
public LeaveTypeResponse update(Long id, UpdateLeaveTypeRequest request) {
    LeaveType leaveType = leaveTypeRepository.findById(id)
        .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Leave type not found"));

    // Same "renaming to something already taken" guard as create(),
    // but excluding this row's own current name.
    leaveTypeRepository.findByName(request.name()).ifPresent(existing -> {
        if (!existing.getId().equals(id)) {
            throw new AppException(HttpStatus.CONFLICT, "A leave type with this name already exists");
        }
    });

    leaveType.setName(request.name());
    leaveType.setDescription(request.description());
    leaveType.setAnnualLimit(request.annualLimit());
    // Managed entity inside a @Transactional method — Hibernate's dirty
    // checking flushes these field changes automatically, but calling
    // save() explicitly keeps intent obvious (same note as
    // LeaveRequestService.approve()).
    leaveTypeRepository.save(leaveType);

    // NOTE: this does NOT touch existing LeaveBalance rows even if
    // annualLimit changed — that's a deliberate business decision to
    // make, not an oversight. If a changed annualLimit SHOULD reset
    // everyone's balance, do that here inside this same @Transactional
    // method, the same way create() seeds balances for every user.

    return LeaveTypeResponse.from(leaveType);
}

@Transactional
public void delete(Long id) {
    LeaveType leaveType = leaveTypeRepository.findById(id)
        .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Leave type not found"));

    // Guard against orphaning history: don't allow deleting a leave
    // type that's actually in use. This is the same "re-validate a
    // business rule before writing" idea as
    // LeaveRequestService.approve() re-checking the balance.
    if (leaveRequestRepository.existsByLeaveTypeId(id)) {
        throw new AppException(
            HttpStatus.CONFLICT,
            "Cannot delete a leave type that has existing leave requests"
        );
    }

    leaveBalanceRepository.deleteAllByLeaveTypeId(id); // clean up dependent rows first
    leaveTypeRepository.delete(leaveType);
}
```

Two repository methods this needs (add to the relevant repositories):

```java
// LeaveRequestRepository.java
boolean existsByLeaveTypeId(Long leaveTypeId);

// LeaveBalanceRepository.java
void deleteAllByLeaveTypeId(Long leaveTypeId);
```

### 5.3 Controller: PUT + DELETE

```java
// add to LeaveTypeController.java

@PutMapping("/{id}")
@PreAuthorize("hasRole('ADMIN')")
public ResponseEntity<ApiResponse<LeaveTypeResponse>> update(
    @PathVariable Long id,
    @Valid @RequestBody UpdateLeaveTypeRequest request
) {
    return ResponseEntity.ok(ApiResponse.ok(leaveTypeService.update(id, request)));
}

@DeleteMapping("/{id}")
@PreAuthorize("hasRole('ADMIN')")
public ResponseEntity<Void> delete(@PathVariable Long id) {
    leaveTypeService.delete(id);
    return ResponseEntity.noContent().build(); // 204, matches REST convention for DELETE
}
```

Add the matching imports (`PutMapping`, `DeleteMapping`, `PathVariable`) —
`LeaveRequestController` already imports `PathVariable`/`PatchMapping`, so
copy its import block as a starting point.

### 5.4 Generalizing this to any entity

For a brand-new entity (say `Project` from section 4.2), the shape is
identical — this is the full checklist:

1. `dto/request/CreateXRequest.java`, `UpdateXRequest.java` (records +
   `@Valid` annotations)
2. `dto/response/XResponse.java` (record + static `.from(entity)`)
3. `repository/XRepository.java` (`extends JpaRepository<X, Long>` + any
   `findBy...`/`existsBy...` you need)
4. `service/XService.java` with `getAll()`, `getById()`, `create()`,
   `update()`, `delete()` — `@Transactional` on every method that writes,
   and on any read that must be consistent across two related tables
5. `controller/XController.java` — `GET`, `GET /{id}`, `POST`, `PUT /{id}`,
   `DELETE /{id}`, each with `@PreAuthorize` if it's not open to every
   logged-in user
6. If ownership matters (like `LeaveRequest`), load the record in the
   service and compare `.getUser().getId()` to the caller — **don't** try to
   express ownership in `@PreAuthorize`, it can't see the loaded row (see
   the CONCEPT comment on `LeaveRequestService.getById()`)

---

## 6. Frontend: adding a new resource end-to-end

Walking through adding a `Projects` resource (list, create, edit, delete),
matching the existing `LeaveTypesPage`/`NewLeaveTypeDialog` pattern.

### 6.1 Extend the API client with DELETE

`lib/api.js` only exposes `get`/`post`/`patch` today. Add `put` and `del`:

```js
export const api = {
  get: (path) => request(path),
  post: (path, body, opts = {}) => request(path, { method: "POST", body, ...opts }),
  patch: (path, body) => request(path, { method: "PATCH", body }),
  put: (path, body) => request(path, { method: "PUT", body }),
  del: (path) => request(path, { method: "DELETE" }),
};
```

(`request()` already handles the 204-No-Content case fine — `res.json()`
on an empty body resolves via the existing `.catch(() => ({}))` fallback, and
`del` callers just ignore the returned `undefined`.)

### 6.2 Page component

Mirrors `LeaveTypesPage.jsx` / `RequestsPage.jsx`'s `load()` + handler
pattern:

```jsx
// pages/ProjectsPage.jsx
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { ProjectsTable } from "@/components/ProjectsTable";
import { ProjectDialog } from "@/components/ProjectDialog";
import { api } from "@/lib/api";

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogState, setDialogState] = useState({ open: false, project: null });

  const load = useCallback(async () => {
    try {
      setProjects(await api.get("/projects"));
    } catch (err) {
      toast.error(err.message || "Could not load projects");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(project) {
    try {
      await api.del(`/projects/${project.id}`);
      toast.success(`Deleted ${project.name}`);
      load();
    } catch (err) {
      toast.error(err.message || "Could not delete the project");
    }
  }

  return (
    <AppShell title="Projects" description="Manage projects.">
      <div className="flex items-center justify-between">
        <div />
        <Button variant="accent" onClick={() => setDialogState({ open: true, project: null })}>
          <Plus className="h-4 w-4" /> New project
        </Button>
      </div>

      <div className="mt-5">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <ProjectsTable
            projects={projects}
            onEdit={(project) => setDialogState({ open: true, project })}
            onDelete={handleDelete}
          />
        )}
      </div>

      <ProjectDialog
        project={dialogState.project}
        open={dialogState.open}
        onOpenChange={(open) => setDialogState({ open, project: open ? dialogState.project : null })}
        onSaved={load}
      />
    </AppShell>
  );
}
```

### 6.3 Create/Edit dialog (one component handles both)

Follows `NewLeaveTypeDialog.jsx`'s shadcn `Dialog` + controlled-inputs shape,
extended to branch POST vs PUT based on whether `project` was passed in:

```jsx
// components/ProjectDialog.jsx
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";

export function ProjectDialog({ project, open, onOpenChange, onSaved }) {
  const isEditing = !!project;
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setName(project?.name ?? "");
  }, [project, open]);

  async function handleSubmit(e) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (isEditing) {
        await api.put(`/projects/${project.id}`, { name });
        toast.success("Project updated");
      } else {
        await api.post("/projects", { name });
        toast.success("Project created");
      }
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast.error(err.message || "Could not save the project");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit project" : "New project"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isEditing ? "Save changes" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

### 6.4 Table with edit/delete actions

Follows `RequestsTable.jsx`'s shape (shadcn `Table` + a per-row actions
column):

```jsx
// components/ProjectsTable.jsx
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";

export function ProjectsTable({ projects, onEdit, onDelete }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead className="w-24" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {projects.map((p) => (
          <TableRow key={p.id}>
            <TableCell>{p.name}</TableCell>
            <TableCell className="flex gap-2">
              <Button size="icon" variant="ghost" onClick={() => onEdit(p)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => onDelete(p)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

### 6.5 Wire the route

```jsx
// App.jsx — add the import and a <Route>, same as /leave-types
<Route
  path="/projects"
  element={
    <ProtectedRoute>
      <ProjectsPage />
    </ProtectedRoute>
  }
/>
```

Add `adminOnly` if only admins should reach it (see the `/balances` route for
that pattern), and add a link in `components/layout/Sidebar.jsx` next to the
existing nav entries.

> **Note on state management**: this template deliberately has no Redux/
> Zustand/React Query — every page fetches its own data with `useState` +
> `useEffect`. That's fine for a scenario this size. If your new scenario has
> many pages that need to *share* live server state (e.g. a live dashboard
> that several pages read from), consider introducing TanStack Query at that
> point rather than fighting the existing pattern — but don't add it
> pre-emptively; it's not part of this template on purpose.

---

## 7. Worked example: adding a "Library" module end-to-end

Say your new scenario needs: `Author` (many-to-many with `Book` via section
4.4's `BookAuthor`), `Book` (many-to-one to a `Category`), and a one-to-one
`BookDetails` (ISBN, page count) kept separate from `Book` itself. Here's the
exact set of files you'd create, using everything above:

**Backend** (12 new files, all following the section 4/5 templates):
```
entity/Category.java          — plain entity, like LeaveType
entity/Author.java             — plain entity
entity/Book.java                — @ManyToOne -> Category (section 4.1)
entity/BookDetails.java        — @OneToOne -> Book (section 4.3)
entity/BookAuthor.java         — join entity (section 4.4)
repository/CategoryRepository.java
repository/AuthorRepository.java
repository/BookRepository.java
repository/BookDetailsRepository.java
repository/BookAuthorRepository.java
dto/request/CreateBookRequest.java, UpdateBookRequest.java (+ same for Category/Author)
dto/response/BookResponse.java (+ Category/Author)
service/BookService.java        — full CRUD per section 5, plus
                                    addAuthorToBook()/removeAuthorFromBook() per 4.4
controller/BookController.java  — GET/GET-one/POST/PUT/DELETE per section 5.3,
                                    plus POST/DELETE /{id}/authors/{authorId}
```

**Frontend** (per section 6, once per resource):
```
pages/BooksPage.jsx, CategoriesPage.jsx, AuthorsPage.jsx
components/BooksTable.jsx, BookDialog.jsx (+ Category/Author equivalents)
```

Wire routes in `App.jsx`, add sidebar links, done. Nothing about auth,
error handling, the API wrapper, or the app shell needs to change — that's
the entire point of keeping those pieces generic in section 2.

---

## 8. Cheat-sheet: "I need to add X, what do I copy?"

| You need to...                          | Copy this as your starting point |
|------------------------------------------|-----------------------------------|
| A plain, independent entity (no relations) | `LeaveType.java` + its repo/service/controller/DTOs |
| A child that belongs to one parent (N:1)  | `LeaveRequest`'s `@ManyToOne` fields (section 4.1) |
| "Show me all children from the parent" (1:N) | Section 4.2 (`@OneToMany(mappedBy=...)`) |
| A 1:1 extension of an existing entity     | Section 4.3 (`EmployeeProfile` example) |
| A tagging/linking relationship (N:M)      | Section 4.4 (explicit join entity, like `LeaveBalance`'s unique-pair style) |
| Full Update endpoint for an entity        | Section 5.2/5.3 `update()` |
| Full Delete endpoint for an entity        | Section 5.2/5.3 `delete()` — remember to guard against orphaning dependents |
| A new role beyond ADMIN/EMPLOYEE          | Add to `Role.java` enum; reuse `@PreAuthorize("hasRole('X')")` and `SecurityConfig`'s `.authorizeHttpRequests` as-is |
| "Only the owner or an admin can see this" | `LeaveRequestService.getById()`'s ownership check, not `@PreAuthorize` |
| A create that must seed rows in another table | `AuthService.register()` / `LeaveTypeService.create()`'s `@Transactional` pattern |
| An approve/reject-style status transition | `LeaveRequestService.approve()`/`reject()` — re-load, re-validate, write together |
| A new frontend list+CRUD page             | Section 6, using `LeaveTypesPage`/`RequestsPage` as the live reference in the repo |
| A new validated request DTO               | Any file in `dto/request/` — Bean Validation annotations + `@AssertTrue` for cross-field rules |
| A consistent error for a business rule    | `throw new AppException(HttpStatus.X, "message")` — never build `ResponseEntity` by hand in a service |

Everything under `security/`, `exception/`, `config/CorsConfig.java`,
`lib/api.js`, `context/AuthContext.jsx`, `components/ui/`, and
`components/layout/` is infrastructure, not domain logic — you should
essentially never need to change these for a new scenario, only extend the
domain layers around them.
