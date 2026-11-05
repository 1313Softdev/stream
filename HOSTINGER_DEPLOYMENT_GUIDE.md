# StreamAdda - Hostinger Shared Hosting Deployment Guide 🚀

This deployment package contains the complete, pre-built production version of **StreamAdda** (Frontend + Backend + MySQL Database dump).

---

## 📦 What is Included in this Zip Package

| File / Folder | Description |
| :--- | :--- |
| `server.js` | Production Node.js backend (pre-bundled with `esbuild`, no TypeScript required at runtime) |
| `dist/` | Production React frontend (pre-compiled HTML, CSS, JavaScript, and assets) |
| `database.sql` | Complete MySQL database export (8 tables + default Admin user + subscription plans + settings) |
| `package.json` | Lightweight production dependencies (`express`, `mysql2`, `multer`, `dotenv`, `@ffmpeg-installer`) |
| `.env.example` | Template for environment variables (MySQL credentials, JWT secret, port) |
| `.htaccess` | LiteSpeed / Apache reverse proxy & security headers configuration |
| `public/` | Contains demo video clips and `uploads/` directory for user-uploaded videos |
| `HOSTINGER_DEPLOYMENT_GUIDE.md` | This step-by-step setup documentation |

---

## 🔑 Default Administrator Credentials

Once imported, you can log in immediately with the pre-seeded admin account:

- **Login URL**: `https://yourdomain.com` (Click "Sign In" at top right)
- **Admin Email**: `britishpunjabitv13@gmail.com`
- **Admin Password**: `admin123`
*(You can change the password or email anytime inside the Admin Dashboard -> Users)*

---

## 🛠️ Step-by-Step Hostinger Deployment Instructions

### Step 1: Create MySQL Database in Hostinger hPanel

1. Log in to your **Hostinger hPanel** (`hpanel.hostinger.com`).
2. Go to **Databases** ➔ **Management** (or search "MySQL Databases").
3. In **Create a New MySQL Database and Database User**:
   - **Database Name**: e.g., `streamadda` *(Hostinger will prefix it: `u123456789_streamadda`)*
   - **Username**: e.g., `admin` *(Hostinger will prefix it: `u123456789_admin`)*
   - **Password**: Enter a strong password (save it for Step 5).
4. Click **Create**.
5. Note down the full Database Name, Username, and Password.

---

### Step 2: Import `database.sql` via phpMyAdmin

1. In the same **Databases** list in hPanel, locate your newly created database.
2. Click **Enter phpMyAdmin** next to it.
3. In phpMyAdmin, click on your database name in the left sidebar.
4. Click the **Import** tab at the top menu.
5. Click **Choose File** (Browse) and select `database.sql` from this package.
6. Scroll down and click **Import** (or **Go**).
7. You should see a green success message: *"Import has been successfully finished, 8 tables created"*.

---

### Step 3: Setup Node.js Application in Hostinger

1. In hPanel, go to **Advanced** ➔ **Node.js** (or search "Node.js" in the top bar).
2. Click **Create Application**:
   - **Node.js version**: Choose **Node 20.x** or **Node 22.x** (LTS recommended).
   - **Application mode**: `Production`.
   - **Application root**: `public_html` (or your subfolder/subdomain).
   - **Application startup file**: `server.js`.
3. Click **Create** or **Save**.

---

### Step 4: Upload and Extract Application Files

1. In hPanel, go to **Files** ➔ **File Manager** (Files -> File Manager for your domain).
2. Navigate to your application root (e.g. `public_html`).
3. Click the **Upload** icon at the top right and select `streamadda_hostinger_deploy.zip`.
4. Once uploaded, right-click `streamadda_hostinger_deploy.zip` and choose **Extract**.
5. Extract directly into `public_html`.
6. Make sure the files (`server.js`, `dist`, `package.json`, `.htaccess`, `public`) are in the root directory.

---

### Step 5: Verify the Pre-Configured `.env` File

A pre-configured `.env` file is already included inside this package with your exact credentials:

```env
PORT=3000
NODE_ENV=production

# Hostinger MySQL Database Settings
DB_HOST=localhost
DB_PORT=3306
DB_NAME=u796814945_stream
DB_USER=u796814945_stream
DB_PASSWORD=Kuku@5769

# JWT Token Secret
JWT_SECRET=streamadda_jwt_secret_u796814945_stream_auth_key_2026
```

If you ever need to change your password or database name, you can edit `.env` directly in Hostinger File Manager.

---

### Step 6: Install NPM Dependencies & Start Server

1. Go back to hPanel ➔ **Node.js**.
2. Click **"NPM Install"** (or "Run NPM Install").
   - Because our `package.json` contains only essential production libraries, the installation will finish in a few seconds without exhausting server memory.
3. Click **"Restart Application"** or toggle **"Active"**.
4. Open your domain (e.g., `https://yourdomain.com`).
5. Your StreamAdda cloud streaming platform is now live! 🎉

---

## ⚡ Directory Permissions (Video Uploads)

Ensure the `public/uploads` directory has proper write permissions so user video uploads succeed:
- In File Manager, right-click `public/uploads` ➔ **Permissions**.
- Set permissions to **`755`** or **`775`**.

---

## 🎯 Verification Checklist

- [ ] Database imported in phpMyAdmin (contains `users`, `slots`, `videos`, `subscription_plans`, etc.)
- [ ] `.env` file created with valid `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- [ ] `NPM Install` executed successfully in Hostinger Node.js manager
- [ ] Application started with `server.js`
- [ ] Log in with `britishpunjabitv13@gmail.com` / `admin123` works
- [ ] Admin dashboard accessible at `https://yourdomain.com`

---

## 💡 Troubleshooting

| Issue | Solution |
| :--- | :--- |
| **"Cannot connect to MySQL"** | Double check `DB_NAME` and `DB_USER` in `.env`. On Hostinger, they always include the username prefix (e.g. `u123456789_streamadda`). `DB_HOST` is almost always `localhost`. |
| **Blank White Screen** | Ensure `dist/` directory is present in the application root and `NODE_ENV=production` is set in `.env`. |
| **Video upload fails with 500 error** | Check permissions of `public/uploads` folder (must be writable: 755 or 775). |
| **FFmpeg streaming error** | The built-in `@ffmpeg-installer/ffmpeg` handles standard Linux x86_64 architectures. If Hostinger has restricted binary execution in shared plans, you can specify an external system binary path in `.env`: `FFMPEG_PATH=/usr/bin/ffmpeg` or upgrade to Cloud/VPS. |

