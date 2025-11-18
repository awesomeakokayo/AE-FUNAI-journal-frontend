# Journal Platform System Overview

## System Architecture

This platform implements a **review-based journal submission system** with the following workflow:

### User Flow

1. **Registration**: Users create accounts (regular users, not admins by default)
2. **Submission**: Users submit journals in DOC, DOCX, or PDF format
3. **Email Review**: Submissions are automatically sent via email to the review team
4. **Admin Review**: Admins review submissions and can approve/reject them
5. **Publication**: Admins upload approved journals (as PDF) to the public site
6. **Public Access**: Published journals are viewable and downloadable by everyone

### Admin Flow

1. **Admin Login**: Admins authenticate with admin accounts
2. **View Submissions**: Admins see all pending/approved/rejected submissions
3. **Download & Review**: Admins can download submission files
4. **Approve & Upload**: Admins upload approved journals as PDFs to the public site
5. **Manage Journals**: Admins can delete published journals

## Backend API Endpoints

### Authentication
- `POST /register` - Create user account (regular user)
- `POST /login` - Login (returns JWT token)
- `GET /users/me` - Get current user info

### Submissions (Regular Users)
- `POST /submissions/submit` - Submit journal for review (requires auth)
- `GET /submissions/my` - Get user's own submissions (requires auth)

### Admin - Submissions Management
- `GET /admin/submissions` - List all submissions (admin only)
- `GET /admin/submissions/{id}/download` - Download submission file (admin only)

### Admin - Journal Upload
- `POST /admin/journals/upload` - Upload journal to public site (admin only)
- `DELETE /admin/journals/{id}` - Delete published journal (admin only)

### Public Journals
- `GET /journals` - List all published journals (public)
- `GET /journals/{id}` - Get journal details (public)
- `GET /journals/{id}/download` - Download journal PDF (public)

## Database Models

### User
- Regular users: `is_admin = 0`
- Admin users: `is_admin = 1`

### Submission
- Status: `pending`, `approved`, `rejected`
- Stores submitted files in `submissions/` directory
- Linked to submitting user

### Journal
- Published journals only
- Stores PDF files in `uploads/` directory
- Can be linked to original submission via `submission_id`

## Email Configuration

Set these environment variables for email functionality:

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
REVIEW_EMAIL=research@funai.edu.ng
```

**Note**: In development (when SMTP credentials are not set), emails are logged to console instead of being sent.

## File Structure

```
Journal/
├── Jbackend/
│   ├── main.py              # FastAPI backend
│   ├── requirements.txt     # Python dependencies
│   ├── uploads/             # Published journal PDFs
│   └── submissions/        # Submitted files (DOC/DOCX/PDF)
├── admin/
│   ├── dashboard.html       # Admin submissions dashboard
│   └── upload.html          # Admin journal upload form
├── submit.html              # User submission form
├── browse.html              # Public journal browsing
├── login.html               # Login page
├── register.html            # Registration page
└── script.js                # Frontend JavaScript
```

## Creating Admin Users

To create an admin user, you need to manually update the database:

```python
# In Python shell or script
from Jbackend.main import User, SessionLocal, get_password_hash

db = SessionLocal()
admin = User(
    full_name="Admin Name",
    email="admin@funai.edu.ng",
    hashed_password=get_password_hash("admin_password"),
    is_admin=1
)
db.add(admin)
db.commit()
```

Or use SQLite directly:
```sql
UPDATE users SET is_admin = 1 WHERE email = 'admin@funai.edu.ng';
```

## Security Notes

1. **Admin Access**: Only users with `is_admin = 1` can access admin endpoints
2. **JWT Tokens**: All authenticated requests require valid JWT tokens
3. **File Validation**: File types and sizes are validated on both frontend and backend
4. **CORS**: Currently allows all origins - restrict for production

## Testing the System

1. **Create Regular User**: Register via `/register.html`
2. **Login**: Login with user credentials
3. **Submit Journal**: Submit a DOC/DOCX/PDF via `/submit.html`
4. **Check Email**: Verify email was sent (or check console logs)
5. **Admin Login**: Login with admin account
6. **Review Submissions**: View submissions at `/admin/dashboard.html`
7. **Approve & Upload**: Download, review, then upload as PDF via `/admin/upload.html`
8. **Public Access**: View published journal at `/browse.html`

## Production Deployment Checklist

- [ ] Set secure `SECRET_KEY` environment variable
- [ ] Configure SMTP email settings
- [ ] Restrict CORS to your frontend domain
- [ ] Set up proper database backups
- [ ] Configure file storage (consider cloud storage for uploads)
- [ ] Set up SSL/HTTPS
- [ ] Configure proper logging
- [ ] Set up monitoring and error tracking
- [ ] Review and test admin access controls
- [ ] Set up automated backups

