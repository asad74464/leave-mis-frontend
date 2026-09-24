# Spring Boot + React Exam Reference Guide
### Full-stack implementation approach, step by step

---

## Part 1: The Method (memorize this order)

When you get a scenario in an exam, always follow the same sequence. Don't skip steps even if you're in a hurry — skipping steps is what causes panic halfway through.

1. Read the scenario → identify **entities**, **relationships**, and **actions**
2. Design the database (ER diagram, even just on paper)
3. Entities (`@Entity` classes with JPA annotations)
4. Repositories (`JpaRepository` interfaces)
5. DTOs (Request DTO + Response DTO — never expose entities directly)
6. Service layer (business logic, validation, mapping)
7. Controller (thin — routes to service only)
8. Test backend with Postman/curl
9. Frontend: API layer → List view → Form view → wire together → styling last

---

## Part 2: Worked Example — Library Management System

Scenario: *"Build a system where a Library has many Books. Each Book can be borrowed by a Member. A Member can borrow many Books, but each Book can only be borrowed by one Member at a time. Implement CRUD for Books and Members, plus a borrow/return action."*

### Step 1 — Extract entities and relationships

- **Entities:** `Book`, `Member`
- **Relationship:** One Member → Many Books (borrowed at a time). This is **One-to-Many** (Member → Book), or viewed from Book's side, **Many-to-One** (Book → Member).
- **Actions:** create/read/update/delete for both, plus `borrowBook`, `returnBook`.

### Step 2 — Database design

**books table**
| Column | Type |
|---|---|
| id | BIGINT (PK) |
| title | VARCHAR |
| author | VARCHAR |
| isbn | VARCHAR |
| available | BOOLEAN |
| member_id | BIGINT (FK, nullable) |

**members table**
| Column | Type |
|---|---|
| id | BIGINT (PK) |
| name | VARCHAR |
| email | VARCHAR |

FK goes on `books` (the "many" side).

### Step 3 — Entities

```java
@Entity
@Table(name = "members")
@Data
@NoArgsConstructor
public class Member {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String email;

    @OneToMany(mappedBy = "borrowedBy", cascade = CascadeType.ALL)
    private List<Book> books = new ArrayList<>();
}
```

```java
@Entity
@Table(name = "books")
@Data
@NoArgsConstructor
public class Book {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;
    private String author;
    private String isbn;
    private boolean available = true;

    @ManyToOne
    @JoinColumn(name = "member_id")
    private Member borrowedBy;
}
```

### Step 4 — Repositories

```java
public interface BookRepository extends JpaRepository<Book, Long> {
    List<Book> findByAvailableTrue();
    List<Book> findByBorrowedById(Long memberId);
}

public interface MemberRepository extends JpaRepository<Member, Long> {
    Optional<Member> findByEmail(String email);
}
```

### Step 5 — DTOs

```java
// Book Request
@Data
public class BookRequestDTO {
    private String title;
    private String author;
    private String isbn;
}

// Book Response
@Data
public class BookResponseDTO {
    private Long id;
    private String title;
    private String author;
    private String isbn;
    private boolean available;
    private String borrowedByName; // null if not borrowed
}

// Member Request
@Data
public class MemberRequestDTO {
    private String name;
    private String email;
}

// Member Response
@Data
public class MemberResponseDTO {
    private Long id;
    private String name;
    private String email;
    private int borrowedBookCount;
}
```

### Step 6 — Service layer

```java
@Service
public class BookService {

    private final BookRepository bookRepository;
    private final MemberRepository memberRepository;

    public BookService(BookRepository bookRepository, MemberRepository memberRepository) {
        this.bookRepository = bookRepository;
        this.memberRepository = memberRepository;
    }

    public BookResponseDTO create(BookRequestDTO dto) {
        Book book = new Book();
        book.setTitle(dto.getTitle());
        book.setAuthor(dto.getAuthor());
        book.setIsbn(dto.getIsbn());
        return toResponseDTO(bookRepository.save(book));
    }

    public List<BookResponseDTO> getAll() {
        return bookRepository.findAll().stream()
                .map(this::toResponseDTO)
                .toList();
    }

    public BookResponseDTO getById(Long id) {
        Book book = bookRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Book not found"));
        return toResponseDTO(book);
    }

    public BookResponseDTO update(Long id, BookRequestDTO dto) {
        Book book = bookRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Book not found"));
        book.setTitle(dto.getTitle());
        book.setAuthor(dto.getAuthor());
        book.setIsbn(dto.getIsbn());
        return toResponseDTO(bookRepository.save(book));
    }

    public void delete(Long id) {
        if (!bookRepository.existsById(id)) {
            throw new RuntimeException("Book not found");
        }
        bookRepository.deleteById(id);
    }

    public BookResponseDTO borrowBook(Long bookId, Long memberId) {
        Book book = bookRepository.findById(bookId)
                .orElseThrow(() -> new RuntimeException("Book not found"));
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new RuntimeException("Member not found"));

        if (!book.isAvailable()) {
            throw new RuntimeException("Book already borrowed");
        }

        book.setBorrowedBy(member);
        book.setAvailable(false);
        return toResponseDTO(bookRepository.save(book));
    }

    public BookResponseDTO returnBook(Long bookId) {
        Book book = bookRepository.findById(bookId)
                .orElseThrow(() -> new RuntimeException("Book not found"));
        book.setBorrowedBy(null);
        book.setAvailable(true);
        return toResponseDTO(bookRepository.save(book));
    }

    private BookResponseDTO toResponseDTO(Book book) {
        BookResponseDTO dto = new BookResponseDTO();
        dto.setId(book.getId());
        dto.setTitle(book.getTitle());
        dto.setAuthor(book.getAuthor());
        dto.setIsbn(book.getIsbn());
        dto.setAvailable(book.isAvailable());
        dto.setBorrowedByName(book.getBorrowedBy() != null ? book.getBorrowedBy().getName() : null);
        return dto;
    }
}
```

**Notice the pattern:** every business rule (like "can't borrow an already-borrowed book") lives here, not in the controller.

**Member service** (same CRUD pattern, applied to the other entity):

```java
@Service
public class MemberService {

    private final MemberRepository memberRepository;

    public MemberService(MemberRepository memberRepository) {
        this.memberRepository = memberRepository;
    }

    public MemberResponseDTO create(MemberRequestDTO dto) {
        Member member = new Member();
        member.setName(dto.getName());
        member.setEmail(dto.getEmail());
        return toResponseDTO(memberRepository.save(member));
    }

    public List<MemberResponseDTO> getAll() {
        return memberRepository.findAll().stream()
                .map(this::toResponseDTO)
                .toList();
    }

    public MemberResponseDTO getById(Long id) {
        Member member = memberRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Member not found"));
        return toResponseDTO(member);
    }

    public MemberResponseDTO update(Long id, MemberRequestDTO dto) {
        Member member = memberRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Member not found"));
        member.setName(dto.getName());
        member.setEmail(dto.getEmail());
        return toResponseDTO(memberRepository.save(member));
    }

    public void delete(Long id) {
        Member member = memberRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Member not found"));
        if (!member.getBooks().isEmpty()) {
            throw new RuntimeException("Cannot delete member with borrowed books");
        }
        memberRepository.deleteById(id);
    }

    private MemberResponseDTO toResponseDTO(Member member) {
        MemberResponseDTO dto = new MemberResponseDTO();
        dto.setId(member.getId());
        dto.setName(member.getName());
        dto.setEmail(member.getEmail());
        dto.setBorrowedBookCount(member.getBooks().size());
        return dto;
    }
}
```

**Exam tip on delete:** always think about what a delete could break. Here, deleting a Member who still has borrowed books would orphan those Book rows — so the service blocks it. This kind of guard is exactly what examiners look for.

### Step 7 — Controller

```java
@RestController
@RequestMapping("/api/books")
public class BookController {

    private final BookService bookService;

    public BookController(BookService bookService) {
        this.bookService = bookService;
    }

    @PostMapping
    public ResponseEntity<BookResponseDTO> create(@RequestBody BookRequestDTO dto) {
        return ResponseEntity.ok(bookService.create(dto));
    }

    @GetMapping
    public ResponseEntity<List<BookResponseDTO>> getAll() {
        return ResponseEntity.ok(bookService.getAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<BookResponseDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(bookService.getById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<BookResponseDTO> update(@PathVariable Long id, @RequestBody BookRequestDTO dto) {
        return ResponseEntity.ok(bookService.update(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        bookService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{bookId}/borrow/{memberId}")
    public ResponseEntity<BookResponseDTO> borrow(@PathVariable Long bookId, @PathVariable Long memberId) {
        return ResponseEntity.ok(bookService.borrowBook(bookId, memberId));
    }

    @PostMapping("/{bookId}/return")
    public ResponseEntity<BookResponseDTO> returnBook(@PathVariable Long bookId) {
        return ResponseEntity.ok(bookService.returnBook(bookId));
    }
}
```

**Member controller** (standard CRUD, no extra actions needed):

```java
@RestController
@RequestMapping("/api/members")
public class MemberController {

    private final MemberService memberService;

    public MemberController(MemberService memberService) {
        this.memberService = memberService;
    }

    @PostMapping
    public ResponseEntity<MemberResponseDTO> create(@RequestBody MemberRequestDTO dto) {
        return ResponseEntity.ok(memberService.create(dto));
    }

    @GetMapping
    public ResponseEntity<List<MemberResponseDTO>> getAll() {
        return ResponseEntity.ok(memberService.getAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<MemberResponseDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(memberService.getById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<MemberResponseDTO> update(@PathVariable Long id, @RequestBody MemberRequestDTO dto) {
        return ResponseEntity.ok(memberService.update(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        memberService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
```

### Step 8 — Test it

```bash
# Create
curl -X POST http://localhost:8080/api/books \
  -H "Content-Type: application/json" \
  -d '{"title":"Clean Code","author":"Robert Martin","isbn":"123"}'

# Read all
curl http://localhost:8080/api/books

# Read one
curl http://localhost:8080/api/books/1

# Update
curl -X PUT http://localhost:8080/api/books/1 \
  -H "Content-Type: application/json" \
  -d '{"title":"Clean Code (2nd Edition)","author":"Robert Martin","isbn":"123"}'

# Delete
curl -X DELETE http://localhost:8080/api/books/1

# Borrow / return
curl -X POST http://localhost:8080/api/books/1/borrow/1
curl -X POST http://localhost:8080/api/books/1/return
```

Confirm the backend works fully before writing any frontend code. This is the single biggest time-saver in an exam — debugging React against a broken API wastes far more time than debugging the API alone.

---

## Part 3: Frontend — React + Vite (JavaScript)

### 1. Scaffold

```bash
npm create vite@latest library-frontend -- --template react
cd library-frontend
npm install axios
npm run dev
```

### 2. API layer (`src/services/bookService.js`)

```javascript
import axios from 'axios';

const API_URL = 'http://localhost:8080/api/books';

export const getBooks = () => axios.get(API_URL);
export const getBook = (id) => axios.get(`${API_URL}/${id}`);
export const createBook = (data) => axios.post(API_URL, data);
export const updateBook = (id, data) => axios.put(`${API_URL}/${id}`, data);
export const deleteBook = (id) => axios.delete(`${API_URL}/${id}`);
export const borrowBook = (bookId, memberId) =>
  axios.post(`${API_URL}/${bookId}/borrow/${memberId}`);
export const returnBook = (bookId) =>
  axios.post(`${API_URL}/${bookId}/return`);
```

### 3. List component (`src/components/BookList.jsx`)

```jsx
import { useEffect, useState } from 'react';
import { getBooks, deleteBook, returnBook } from '../services/bookService';

function BookList({ onEdit, refreshTrigger }) {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadBooks = () => {
    setLoading(true);
    getBooks()
      .then((res) => setBooks(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadBooks();
  }, [refreshTrigger]);

  const handleReturn = async (id) => {
    await returnBook(id);
    loadBooks();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this book?')) return;
    await deleteBook(id);
    loadBooks();
  };

  if (loading) return <p>Loading...</p>;

  return (
    <table>
      <thead>
        <tr><th>Title</th><th>Author</th><th>Status</th><th>Actions</th></tr>
      </thead>
      <tbody>
        {books.map((book) => (
          <tr key={book.id}>
            <td>{book.title}</td>
            <td>{book.author}</td>
            <td>{book.available ? 'Available' : `Borrowed by ${book.borrowedByName}`}</td>
            <td>
              <button onClick={() => onEdit(book)}>Edit</button>
              <button onClick={() => handleDelete(book.id)}>Delete</button>
              {!book.available && <button onClick={() => handleReturn(book.id)}>Return</button>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default BookList;
```

**Note the two new props:** `onEdit` lets the parent know which book was clicked so it can load it into the form, and `refreshTrigger` re-runs the fetch whenever it changes (used after create/update/delete). This replaces the earlier `key={refreshKey}` remount trick with a cleaner `useEffect` dependency — either approach is fine in an exam, but this version supports editing more naturally.

### 4. Form component (`src/components/BookForm.jsx`)

```jsx
import { useEffect, useState } from 'react';
import { createBook, updateBook } from '../services/bookService';

const emptyForm = { title: '', author: '', isbn: '' };

function BookForm({ editingBook, onSaved, onCancel }) {
  const [form, setForm] = useState(emptyForm);

  // When a book is passed in for editing, load its fields into the form
  useEffect(() => {
    if (editingBook) {
      setForm({ title: editingBook.title, author: editingBook.author, isbn: editingBook.isbn });
    } else {
      setForm(emptyForm);
    }
  }, [editingBook]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingBook) {
      await updateBook(editingBook.id, form);
    } else {
      await createBook(form);
    }
    setForm(emptyForm);
    onSaved();
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="title" placeholder="Title" value={form.title} onChange={handleChange} required />
      <input name="author" placeholder="Author" value={form.author} onChange={handleChange} required />
      <input name="isbn" placeholder="ISBN" value={form.isbn} onChange={handleChange} required />
      <button type="submit">{editingBook ? 'Update Book' : 'Add Book'}</button>
      {editingBook && <button type="button" onClick={onCancel}>Cancel</button>}
    </form>
  );
}

export default BookForm;
```

**The Create vs. Update pattern:** one form handles both. If `editingBook` is passed in, the form pre-fills and calls `updateBook`; otherwise it stays empty and calls `createBook`. This is the standard way to avoid writing two nearly-identical forms under time pressure.

### 5. Wire together (`src/App.jsx`)

```jsx
import { useState } from 'react';
import BookList from './components/BookList';
import BookForm from './components/BookForm';

function App() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [editingBook, setEditingBook] = useState(null);

  const handleSaved = () => {
    setEditingBook(null);
    setRefreshTrigger((t) => t + 1); // triggers BookList's useEffect to refetch
  };

  return (
    <div>
      <h1>Library</h1>
      <BookForm
        editingBook={editingBook}
        onSaved={handleSaved}
        onCancel={() => setEditingBook(null)}
      />
      <BookList
        onEdit={(book) => setEditingBook(book)}
        refreshTrigger={refreshTrigger}
      />
    </div>
  );
}

export default App;
```

`editingBook` is lifted up to `App` because both the form (to populate itself) and the list (to know which row was clicked) need access to it — a classic "lift state up" pattern.

### 6. Styling — last, only if time allows

Get the CRUD flow fully working end-to-end first. Add CSS or a UI library only after everything functions.

---

## Part 4: Admin Approval Workflow (very common exam pattern)

A huge share of exam scenarios boil down to: *"a user requests something, and an admin must approve or reject it before it takes effect."* Leave requests, expense claims, purchase orders, account registrations — they're all the same shape. Here it's applied to the Library: instead of a Member borrowing a book directly, they submit a **borrow request**, and an **admin** approves or rejects it.

### The general recipe (memorize this — it's reusable for any "admin approves X" scenario)

1. Add a new entity representing the *process/request* (not the thing being requested — a separate row that tracks its lifecycle)
2. Give it a **status field** using an enum: `PENDING`, `APPROVED`, `REJECTED`
3. One endpoint to **create** the request (the regular user's action)
4. Two endpoints to **decide** it: `/approve` and `/reject` (the admin's actions)
5. The approve/reject logic is where the real side effects happen (e.g., only on approval does the book actually become unavailable)
6. Never let a decision be made twice — check the status is still `PENDING` before allowing approve/reject

### Step 1 — New entity: `BorrowRequest`

```java
public enum RequestStatus {
    PENDING, APPROVED, REJECTED
}
```

```java
@Entity
@Table(name = "borrow_requests")
@Data
@NoArgsConstructor
public class BorrowRequest {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "book_id")
    private Book book;

    @ManyToOne
    @JoinColumn(name = "member_id")
    private Member member;

    @Enumerated(EnumType.STRING)
    private RequestStatus status = RequestStatus.PENDING;

    private LocalDateTime requestedAt = LocalDateTime.now();
    private LocalDateTime decidedAt;
    private String adminComment; // optional reason for rejection
}
```

**Exam tip:** `@Enumerated(EnumType.STRING)` stores `"PENDING"` etc. as readable text in the DB column, instead of `0/1/2`. Always use `STRING`, never the default `ORDINAL` — ordinal breaks silently if you ever reorder the enum values.

### Step 2 — Database design addition

**borrow_requests table**
| Column | Type |
|---|---|
| id | BIGINT (PK) |
| book_id | BIGINT (FK) |
| member_id | BIGINT (FK) |
| status | VARCHAR (PENDING / APPROVED / REJECTED) |
| requested_at | TIMESTAMP |
| decided_at | TIMESTAMP (nullable) |
| admin_comment | VARCHAR (nullable) |

### Step 3 — Repository

```java
public interface BorrowRequestRepository extends JpaRepository<BorrowRequest, Long> {
    List<BorrowRequest> findByStatus(RequestStatus status);
    List<BorrowRequest> findByMemberId(Long memberId);
}
```

### Step 4 — DTOs

```java
// What a Member sends to create a request
@Data
public class BorrowRequestCreateDTO {
    private Long bookId;
    private Long memberId;
}

// What an admin sends to reject (a reason is optional but useful)
@Data
public class RequestDecisionDTO {
    private String adminComment;
}

// What the API returns
@Data
public class BorrowRequestResponseDTO {
    private Long id;
    private String bookTitle;
    private String memberName;
    private RequestStatus status;
    private LocalDateTime requestedAt;
    private LocalDateTime decidedAt;
    private String adminComment;
}
```

### Step 5 — Service layer (this is where the workflow logic lives)

```java
@Service
public class BorrowRequestService {

    private final BorrowRequestRepository requestRepository;
    private final BookRepository bookRepository;
    private final MemberRepository memberRepository;

    public BorrowRequestService(BorrowRequestRepository requestRepository,
                                 BookRepository bookRepository,
                                 MemberRepository memberRepository) {
        this.requestRepository = requestRepository;
        this.bookRepository = bookRepository;
        this.memberRepository = memberRepository;
    }

    // Member action: submit a request
    public BorrowRequestResponseDTO create(BorrowRequestCreateDTO dto) {
        Book book = bookRepository.findById(dto.getBookId())
                .orElseThrow(() -> new RuntimeException("Book not found"));
        Member member = memberRepository.findById(dto.getMemberId())
                .orElseThrow(() -> new RuntimeException("Member not found"));

        if (!book.isAvailable()) {
            throw new RuntimeException("Book is not available to request");
        }

        BorrowRequest request = new BorrowRequest();
        request.setBook(book);
        request.setMember(member);
        request.setStatus(RequestStatus.PENDING);
        return toResponseDTO(requestRepository.save(request));
    }

    // Admin action: view all pending requests
    public List<BorrowRequestResponseDTO> getPending() {
        return requestRepository.findByStatus(RequestStatus.PENDING).stream()
                .map(this::toResponseDTO)
                .toList();
    }

    // Admin action: approve
    public BorrowRequestResponseDTO approve(Long requestId) {
        BorrowRequest request = getPendingRequestOrThrow(requestId);

        Book book = request.getBook();
        book.setAvailable(false);
        book.setBorrowedBy(request.getMember());
        bookRepository.save(book);

        request.setStatus(RequestStatus.APPROVED);
        request.setDecidedAt(LocalDateTime.now());
        return toResponseDTO(requestRepository.save(request));
    }

    // Admin action: reject
    public BorrowRequestResponseDTO reject(Long requestId, RequestDecisionDTO dto) {
        BorrowRequest request = getPendingRequestOrThrow(requestId);

        request.setStatus(RequestStatus.REJECTED);
        request.setDecidedAt(LocalDateTime.now());
        request.setAdminComment(dto.getAdminComment());
        return toResponseDTO(requestRepository.save(request));
    }

    // Shared guard: a request can only be decided once
    private BorrowRequest getPendingRequestOrThrow(Long requestId) {
        BorrowRequest request = requestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Request not found"));
        if (request.getStatus() != RequestStatus.PENDING) {
            throw new RuntimeException("Request has already been decided");
        }
        return request;
    }

    private BorrowRequestResponseDTO toResponseDTO(BorrowRequest request) {
        BorrowRequestResponseDTO dto = new BorrowRequestResponseDTO();
        dto.setId(request.getId());
        dto.setBookTitle(request.getBook().getTitle());
        dto.setMemberName(request.getMember().getName());
        dto.setStatus(request.getStatus());
        dto.setRequestedAt(request.getRequestedAt());
        dto.setDecidedAt(request.getDecidedAt());
        dto.setAdminComment(request.getAdminComment());
        return dto;
    }
}
```

**The key idea examiners are testing here:** the *book only becomes unavailable on approval*, not on request. And `getPendingRequestOrThrow` stops the same request from being approved-then-rejected or approved twice — this "can only be decided once" guard is the single most common thing missed under time pressure.

### Step 6 — Controller

```java
@RestController
@RequestMapping("/api/borrow-requests")
public class BorrowRequestController {

    private final BorrowRequestService requestService;

    public BorrowRequestController(BorrowRequestService requestService) {
        this.requestService = requestService;
    }

    // Member submits a request
    @PostMapping
    public ResponseEntity<BorrowRequestResponseDTO> create(@RequestBody BorrowRequestCreateDTO dto) {
        return ResponseEntity.ok(requestService.create(dto));
    }

    // Admin views pending requests
    @GetMapping("/pending")
    public ResponseEntity<List<BorrowRequestResponseDTO>> getPending() {
        return ResponseEntity.ok(requestService.getPending());
    }

    // Admin approves
    @PutMapping("/{id}/approve")
    public ResponseEntity<BorrowRequestResponseDTO> approve(@PathVariable Long id) {
        return ResponseEntity.ok(requestService.approve(id));
    }

    // Admin rejects
    @PutMapping("/{id}/reject")
    public ResponseEntity<BorrowRequestResponseDTO> reject(@PathVariable Long id,
                                                             @RequestBody(required = false) RequestDecisionDTO dto) {
        RequestDecisionDTO body = dto != null ? dto : new RequestDecisionDTO();
        return ResponseEntity.ok(requestService.reject(id, body));
    }
}
```

### Step 7 — Test it

```bash
# Member submits a request
curl -X POST http://localhost:8080/api/borrow-requests \
  -H "Content-Type: application/json" \
  -d '{"bookId":1,"memberId":1}'

# Admin views pending requests
curl http://localhost:8080/api/borrow-requests/pending

# Admin approves
curl -X PUT http://localhost:8080/api/borrow-requests/1/approve

# Admin rejects (with a reason)
curl -X PUT http://localhost:8080/api/borrow-requests/2/reject \
  -H "Content-Type: application/json" \
  -d '{"adminComment":"Book reserved for another member"}'
```

### Step 8 — Frontend: Admin approval screen

**API layer** (`src/services/borrowRequestService.js`):

```javascript
import axios from 'axios';

const API_URL = 'http://localhost:8080/api/borrow-requests';

export const createRequest = (data) => axios.post(API_URL, data);
export const getPendingRequests = () => axios.get(`${API_URL}/pending`);
export const approveRequest = (id) => axios.put(`${API_URL}/${id}/approve`);
export const rejectRequest = (id, comment) =>
  axios.put(`${API_URL}/${id}/reject`, { adminComment: comment });
```

**Admin panel component** (`src/components/AdminRequestPanel.jsx`):

```jsx
import { useEffect, useState } from 'react';
import { getPendingRequests, approveRequest, rejectRequest } from '../services/borrowRequestService';

function AdminRequestPanel() {
  const [requests, setRequests] = useState([]);

  const loadRequests = () => {
    getPendingRequests().then((res) => setRequests(res.data));
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleApprove = async (id) => {
    await approveRequest(id);
    loadRequests();
  };

  const handleReject = async (id) => {
    const comment = window.prompt('Reason for rejection (optional):') || '';
    await rejectRequest(id, comment);
    loadRequests();
  };

  if (requests.length === 0) return <p>No pending requests.</p>;

  return (
    <table>
      <thead>
        <tr><th>Book</th><th>Member</th><th>Requested At</th><th>Actions</th></tr>
      </thead>
      <tbody>
        {requests.map((req) => (
          <tr key={req.id}>
            <td>{req.bookTitle}</td>
            <td>{req.memberName}</td>
            <td>{new Date(req.requestedAt).toLocaleString()}</td>
            <td>
              <button onClick={() => handleApprove(req.id)}>Approve</button>
              <button onClick={() => handleReject(req.id)}>Reject</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default AdminRequestPanel;
```

Drop `<AdminRequestPanel />` into `App.jsx` alongside the existing components (e.g., behind a simple "Admin View" tab/toggle if the scenario asks for role separation).

### Applying this pattern to other exam scenarios

Same five pieces, different names:
- **Leave request:** `LeaveRequest` entity, `Employee` submits, `Manager`/`Admin` approves/rejects → on approval, deduct leave balance
- **Expense claim:** `ExpenseClaim` entity, `Employee` submits, `Finance Admin` approves/rejects → on approval, mark as reimbursable
- **New account/registration:** `RegistrationRequest` entity, applicant submits, `Admin` approves/rejects → on approval, create the actual `User` account

The entity name and the side effect change; the shape (status enum, create/approve/reject, guard against double-decision) stays identical.

---

## Quick Checklist to Run Through in Any Exam

- [ ] Entities identified from the scenario text
- [ ] Relationships mapped (One-to-Many / Many-to-One / Many-to-Many / One-to-One)
- [ ] FK placed on the "many" side
- [ ] Entities annotated correctly (`@Entity`, `@Id`, `@ManyToOne`, `@OneToMany`, etc.)
- [ ] Repositories extend `JpaRepository`
- [ ] Separate Request/Response DTOs — no entity exposed in the API
- [ ] All business rules in the service layer, not the controller
- [ ] Controller only calls service methods
- [ ] Backend tested with curl/Postman before frontend work starts
- [ ] Full CRUD implemented for every entity the scenario names (Create, Read-all, Read-one, Update, Delete)
- [ ] Delete guarded against breaking relationships (e.g., can't delete a Member who still has borrowed books)
- [ ] Frontend: API layer → List → Form (handles both create and edit) → wire up → style last
- [ ] For any approval workflow: status enum stored as `STRING`, separate create/approve/reject endpoints, side effects only applied on approval, and a guard preventing a request from being decided twice
