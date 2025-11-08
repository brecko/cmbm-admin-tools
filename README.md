# CMBM Admin Tools

**Command-line administrative tools for the Cocktail Mixer Bartender Manager system.**

## Overview

This repository contains operational tools for managing CMBM infrastructure, users, and data. These tools are designed to be run via Docker containers in a secure, isolated environment.

## Tools

### 1. **Site Admin Management** (`manage-site-admin.js`)

Manage system administrator accounts with full access to the CMBM platform.

**Features:**
- Create new site admin users
- Update admin passwords
- Reset admin credentials
- Delete admin accounts

**Usage:**

```bash
# Create admin user
docker exec -it cmbm-admin-tools node scripts/manage-site-admin.js create \
  --username admin \
  --email admin@example.com \
  --password "SecurePassword123!"

# Update password
docker exec -it cmbm-admin-tools node scripts/manage-site-admin.js update-password \
  --username admin \
  --password "NewPassword456!"

# Delete admin
docker exec -it cmbm-admin-tools node scripts/manage-site-admin.js delete \
  --username admin
```

**Security:**
- Passwords hashed with bcrypt (12 rounds)
- Requires Docker exec access (no HTTP endpoint)
- Production: Requires sudo/root access
- Audit logging of all admin operations

### 2. **Admin Verification** (`verify-admin.js`)

Verify admin users exist and check their permissions.

**Usage:**

```bash
# List all admin users
docker exec -it cmbm-admin-tools node scripts/verify-admin.js

# Check specific admin
docker exec -it cmbm-admin-tools node scripts/verify-admin.js --username admin
```

**Output:**
```
✅ Admin Users Found: 2

Admin: admin
├── Email: admin@example.com
├── Roles: ['admin', 'system']
├── Created: 2025-01-15T10:30:00Z
└── Status: Active

Admin: ops
├── Email: ops@example.com
├── Roles: ['admin']
├── Created: 2025-03-20T14:45:00Z
└── Status: Active
```

### 3. **Recipe Analysis** (`analyze-recipes.js`)

Analyze recipe database for completeness, duplicates, and quality issues.

**Usage:**

```bash
# Analyze all recipes
docker exec -it cmbm-admin-tools node scripts/analyze-recipes.js

# Analyze specific category
docker exec -it cmbm-admin-tools node scripts/analyze-recipes.js --category cocktails

# Check for duplicates
docker exec -it cmbm-admin-tools node scripts/analyze-recipes.js --duplicates
```

**Checks:**
- Missing ingredients
- Duplicate recipe names
- Invalid measurements
- Incomplete instructions
- Orphaned recipe references
- Image availability

### 4. **MongoDB Connection Test** (`mongo-connect-test.js`)

Diagnostic tool for MongoDB connectivity issues.

**Usage:**

```bash
# Test MongoDB connection
docker exec -it cmbm-admin-tools node scripts/mongo-connect-test.js

# Test with custom URI
docker exec -it cmbm-admin-tools node scripts/mongo-connect-test.js \
  --uri "mongodb://mongo:27017/mixerdb"
```

**Output:**
```
🔍 Testing MongoDB Connection...
✅ Connected successfully
📊 Database: mixerdb
📦 Collections: 12
👥 Users count: 45
🏠 Families count: 15
🍹 Recipes count: 1,234
```

### 5. **Recipe Pack Import** (`import-recipe-pack.js`)

Import new recipe packs from partner providers.

**Usage:**

```bash
# Import recipe pack from JSON
docker exec -it cmbm-admin-tools node scripts/import-recipe-pack.js \
  --file /data/tiki-drinks.json \
  --provider "Smuggler's Cove" \
  --pricing one-time \
  --amount 1499

# Import with recurring pricing
docker exec -it cmbm-admin-tools node scripts/import-recipe-pack.js \
  --file /data/molecular-mixology.json \
  --provider "Liquid Intelligence" \
  --pricing recurring \
  --amount 499 \
  --interval month
```

**Input Format:**
```json
{
  "packName": "Tiki Drinks Ultimate",
  "description": "Classic and modern tiki cocktails",
  "recipes": [
    {
      "name": "Mai Tai",
      "category": "tiki",
      "ingredients": [...],
      "instructions": [...],
      "image": "https://..."
    }
  ]
}
```

### 6. **User Migration** (`migrate-users.js`)

Migrate users between families or merge duplicate accounts.

**Usage:**

```bash
# Migrate user to different family
docker exec -it cmbm-admin-tools node scripts/migrate-users.js \
  --user-id 507f1f77bcf86cd799439011 \
  --to-family 507f1f77bcf86cd799439022

# Merge duplicate users
docker exec -it cmbm-admin-tools node scripts/migrate-users.js \
  --merge \
  --keep 507f1f77bcf86cd799439011 \
  --remove 507f1f77bcf86cd799439033
```

## Development

### Prerequisites

- Node.js 18+
- MongoDB access (via Docker network)
- Environment variables configured

### Local Development

```bash
# Install dependencies
npm install

# Run a script locally (development only)
node scripts/verify-admin.js

# Run with custom MongoDB URI
MONGO_URI=mongodb://localhost:27017/mixerdb node scripts/verify-admin.js
```

### Environment Variables

```bash
# MongoDB Connection
MONGO_URI=mongodb://mongo:27017/mixerdb

# Main App API (for some operations)
MAIN_APP_URL=http://cmbm-main:3000

# Logging Level
LOG_LEVEL=info  # debug, info, warn, error
```

## Docker Deployment

### Building Image

```bash
# Build admin tools image
docker build -t cmbm-admin-tools:latest .

# Build with version tag
docker build -t cmbm-admin-tools:1.0.0 .
```

### Running in Docker Compose

```yaml
services:
  cmbm-admin-tools:
    build: ../cmbm-admin-tools
    image: cmbm-admin-tools:latest
    environment:
      MONGO_URI: mongodb://mongo:27017/mixerdb
    networks:
      - cmbm_internal
    # No ports exposed - docker exec only
    command: tail -f /dev/null  # Keep container running
```

### Security Best Practices

**Production Deployment:**
1. **No HTTP endpoint** - Tools only accessible via `docker exec`
2. **Internal network only** - No external network access
3. **Audit logging** - All operations logged to MongoDB
4. **Root operations** - Require sudo/root privileges for sensitive ops
5. **Environment isolation** - Separate dev/staging/prod MongoDB URIs

**Access Control:**
```bash
# Only users with Docker exec access can run tools
# This typically means:
# - Root user on server
# - Users in 'docker' group
# - Users with sudo privileges

# Example: Restricted access
sudo docker exec -it cmbm-admin-tools node scripts/manage-site-admin.js create ...
```

## Kubernetes/K3s Deployment

**Admin Tools Job Pattern:**

```yaml
# k8s/admin-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: cmbm-admin-create-user
spec:
  template:
    spec:
      containers:
      - name: admin-tools
        image: cmbm-admin-tools:latest
        command: ["node", "scripts/manage-site-admin.js"]
        args: ["create", "--username", "admin", "--email", "admin@example.com", "--password", "$(ADMIN_PASSWORD)"]
        env:
        - name: MONGO_URI
          valueFrom:
            secretKeyRef:
              name: mongodb-credentials
              key: uri
        - name: ADMIN_PASSWORD
          valueFrom:
            secretKeyRef:
              name: admin-credentials
              key: password
      restartPolicy: Never
```

**Running Jobs:**

```bash
# Create admin user via K8s Job
kubectl create job cmbm-admin-create --from=cronjob/cmbm-admin-tools -- create --username admin

# One-off admin operation
kubectl run cmbm-admin-verify --image=cmbm-admin-tools:latest --restart=Never -- verify-admin.js
```

## Testing

### Unit Tests

```bash
npm test
```

### Integration Tests

```bash
# Start MongoDB
docker compose up -d mongo

# Run integration tests
npm run test:integration
```

### Dry Run Mode

Most scripts support `--dry-run` flag:

```bash
# Preview without making changes
docker exec -it cmbm-admin-tools node scripts/manage-site-admin.js create \
  --username admin \
  --email admin@example.com \
  --password "SecurePass123!" \
  --dry-run
```

## Monitoring & Audit Logs

All admin operations are logged to MongoDB:

```javascript
// Audit log structure
{
  _id: ObjectId,
  timestamp: Date,
  operation: 'create_admin' | 'update_password' | 'delete_admin' | ...,
  actor: 'root@server' | 'kubernetes-job',
  target: { username: 'admin', email: 'admin@example.com' },
  success: true,
  metadata: { ... }
}
```

**Querying Audit Logs:**

```bash
# View recent admin operations
docker exec -it mongo mongosh mixerdb --eval \
  "db.adminAuditLogs.find().sort({timestamp: -1}).limit(10)"
```

## Troubleshooting

### MongoDB Connection Issues

```bash
# Test MongoDB connectivity
docker exec -it cmbm-admin-tools node scripts/mongo-connect-test.js

# Check MongoDB container
docker ps | grep mongo
docker logs mongo

# Verify network
docker network inspect cmbm_internal
```

### Permission Denied

```bash
# Error: "Cannot connect to MongoDB"
# Solution: Ensure admin-tools container is on correct network

# Error: "Permission denied"
# Solution: Use sudo or add user to docker group
sudo usermod -aG docker $USER
```

### Script Not Found

```bash
# Error: "Cannot find module './scripts/xxx.js'"
# Solution: Verify file exists in container
docker exec -it cmbm-admin-tools ls -la scripts/
```

## Contributing

See main CMBM documentation:
- [Development Workflow](https://github.com/brecko/cmbm-docs/blob/main/DEVELOPMENT_WORKFLOW.md)
- [Issue Tracking](https://github.com/brecko/cmbm-docs/issues)

## License

MIT License - See [LICENSE](LICENSE) file for details.

## Related Repositories

- **[cmbm-main](https://github.com/brecko/cmbm-main)**: Core NestJS API
- **[cmbm-mongodb](https://github.com/brecko/cmbm-mongodb)**: MongoDB infrastructure
- **[cmbm-deployment](https://github.com/brecko/cmbm-deployment)**: Docker orchestration
- **[cmbm-docs](https://github.com/brecko/cmbm-docs)**: Architecture documentation

---

**Status**: Production-ready, actively maintained  
**Version**: 1.0.0  
**Last Updated**: November 2025
