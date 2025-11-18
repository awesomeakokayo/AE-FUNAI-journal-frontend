# Journal Platform - Setup Guide

## Backend Setup

### 1. Install Dependencies

Navigate to the `Jbackend` directory and install required packages:

```bash
cd Jbackend
pip install fastapi uvicorn[standard] sqlalchemy pydantic python-multipart passlib[bcrypt] PyJWT python-dotenv
```

### 2. Run the Backend Server

The backend file is `main.py`. Run it with:

```bash
# From the Jbackend directory
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Or if you prefer to run it from the project root:

```bash
uvicorn Jbackend.main:app --reload --host 0.0.0.0 --port 8000
```

The server will start at `http://localhost:8000`

### 3. Backend Endpoints

- `POST /register` - User registration
- `POST /login` - User login (returns JWT token)
- `GET /users/me` - Get current user (requires auth)
- `POST /journals/upload` - Upload a journal (requires auth)
- `GET /journals` - List all journals (with optional `?q=query` for search)
- `GET /journals/{id}` - Get journal details
- `GET /journals/{id}/download` - Download PDF
- `GET /journals/me` - Get user's own journals (requires auth)
- `DELETE /journals/{id}` - Delete journal (requires auth)

### 4. Database

The backend uses SQLite and will automatically create `app.db` in the `Jbackend` directory on first run.

Uploaded PDFs are stored in `Jbackend/uploads/` directory (created automatically).

## Frontend Setup

### 1. Configure API URL

Open `script.js` and update the `API_BASE_URL` constant if your backend is running on a different URL:

```javascript
const API_BASE_URL = 'http://localhost:8000'; // Change if needed
```

### 2. Serve the Frontend

You can serve the frontend using any static file server:

**Option 1: Python HTTP Server**
```bash
# From the Journal directory
python -m http.server 8080
```

**Option 2: Node.js http-server**
```bash
npx http-server -p 8080
```

**Option 3: VS Code Live Server**
- Install the "Live Server" extension
- Right-click on `index.html` and select "Open with Live Server"

### 3. Access the Application

Open your browser and navigate to:
- Frontend: `http://localhost:8080` (or your chosen port)
- Backend API Docs: `http://localhost:8000/docs` (FastAPI auto-generated docs)

## CORS Configuration

The backend is configured to allow CORS from any origin (`allow_origins=["*"]`). For production, update this in `Jbackend/main.py`:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080"],  # Your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Testing the Connection

1. Start the backend server
2. Start the frontend server
3. Open the frontend in your browser
4. Try registering a new account
5. Login with your credentials
6. Upload a test journal PDF
7. Browse journals and test the search functionality

## Troubleshooting

### Backend won't start
- Make sure all dependencies are installed
- Check that port 8000 is not already in use
- Verify Python version (3.7+ required)

### Frontend can't connect to backend
- Verify backend is running on `http://localhost:8000`
- Check browser console for CORS errors
- Update `API_BASE_URL` in `script.js` if backend is on different URL/port
- Check browser network tab for failed requests

### Authentication issues
- Clear browser localStorage: `localStorage.clear()` in browser console
- Check that JWT token is being stored after login
- Verify token is included in API requests (check Network tab)

### File upload fails
- Ensure PDF file is less than 15MB
- Check that file is actually a PDF (content-type: application/pdf)
- Verify backend `uploads/` directory exists and is writable

