# Hosting Guide - Backend Architecture

## ✅ **YES - They MUST be on the Same Backend**

Both `main.py` and `auth.py` **must be hosted on the same backend** because:

1. **Python Module Import**: `main.py` imports from `auth.py` using `from auth import ...`
2. **Same Directory**: They need to be in the same Python package/directory
3. **Shared Environment**: They share the same Python environment, dependencies, and environment variables
4. **Single Application**: They work together as one FastAPI application

## Current Structure

```
Jbackend/
├── main.py          # FastAPI application (main entry point)
├── auth.py          # Authentication utilities (imported by main.py)
├── requirements.txt # Dependencies
├── app.db           # SQLite database
├── uploads/         # Published journal PDFs
└── submissions/     # Submitted files for review
```

## How It Works

When you run:
```bash
uvicorn main:app --reload
```

1. Python loads `main.py` as the FastAPI application
2. `main.py` imports functions from `auth.py` at startup
3. Both files share the same:
   - Environment variables (`.env` file)
   - SECRET_KEY
   - Database connection
   - Python environment

## Fixed Issues

I've fixed a JWT library conflict:
- **Before**: `main.py` used `PyJWT`, `auth.py` used `python-jose`
- **After**: Both now use `python-jose` for consistency

## Hosting Options

### Option 1: Single Server (Recommended)
Host everything on one server/domain:
```
https://yourdomain.com/api/
├── /login          (main.py)
├── /admin/login    (main.py)
├── /register       (main.py)
└── ... (all endpoints from main.py)
```

**Benefits:**
- Simple deployment
- Single SSL certificate
- Easier CORS configuration
- Lower hosting costs

### Option 2: Microservices (NOT Recommended for This Project)
You could theoretically split them, but it would require:
- Refactoring `auth.py` into a separate service
- Setting up service-to-service authentication
- Managing multiple deployments
- More complex error handling

**This is overkill for your use case.**

## Deployment Steps

### 1. Prepare Files
Ensure both files are in the same directory:
```bash
Jbackend/
├── main.py
├── auth.py
├── requirements.txt
└── .env  # Environment variables
```

### 2. Environment Variables
Create a `.env` file in `Jbackend/`:
```env
SECRET_KEY=your-secret-key-here
ADMIN_USERNAME=admin
ACCESS_TOKEN_EXPIRE_MINUTES=1440
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
REVIEW_EMAIL=research@funai.edu.ng
```

### 3. Install Dependencies
```bash
cd Jbackend
pip install -r requirements.txt
```

### 4. Run the Server
```bash
# Development
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Production (with gunicorn)
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

## Frontend Configuration

Your frontend `script.js` should point to your backend URL:

```javascript
const API_BASE_URL = 'https://yourdomain.com/api';  // or http://localhost:8000 for dev
```

## Common Hosting Platforms

### Railway / Render / Fly.io
1. Connect your Git repository
2. Set environment variables in dashboard
3. Set start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Deploy!

### VPS (DigitalOcean, AWS EC2, etc.)
1. SSH into server
2. Clone repository
3. Install Python and dependencies
4. Set up systemd service or use PM2
5. Configure Nginx as reverse proxy

### Docker (Recommended for Production)
Create `Dockerfile`:
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY Jbackend/requirements.txt .
RUN pip install -r requirements.txt
COPY Jbackend/ .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## Important Notes

1. **SECRET_KEY**: Both files must use the same SECRET_KEY from environment
2. **Database**: SQLite file (`app.db`) will be created in `Jbackend/` directory
3. **File Storage**: `uploads/` and `submissions/` directories must be writable
4. **CORS**: Update CORS settings in `main.py` for production:
   ```python
   allow_origins=["https://yourdomain.com"]  # Instead of ["*"]
   ```

## Testing Before Deployment

1. Test locally:
   ```bash
   cd Jbackend
   uvicorn main:app --reload
   ```

2. Verify imports work:
   ```python
   python -c "from auth import authenticate_admin; print('OK')"
   ```

3. Test admin login endpoint:
   ```bash
   curl -X POST http://localhost:8000/admin/login \
     -d "username=admin&password=adminpass"
   ```

## Summary

✅ **Host `main.py` and `auth.py` together on the same backend**  
✅ **They work as one application**  
✅ **Single deployment, single URL**  
❌ **Do NOT split them into separate backends**

The current setup is correct and ready for deployment!

