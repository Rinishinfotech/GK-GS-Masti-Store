# Auth Testing Playbook

Step 1: MongoDB Verification
```
mongosh
use test_database
db.users.find({role: "admin"}).pretty()
db.users.findOne({role: "admin"}, {password_hash: 1})
```
Verify: bcrypt hash starts with `$2b$`, unique index on users.email, index on login_attempts.identifier.

Step 2: API Testing
```
curl -X POST http://localhost:8001/api/auth/login -H "Content-Type: application/json" -d '{"email":"palakneuroclinic@gmail.com","password":"Admin@123"}'
```
Login returns `{user, token}`. Use the token:
```
curl http://localhost:8001/api/auth/me -H "Authorization: Bearer <token>"
```
Register: POST /api/auth/register {name, email, mobile (10 digits), password (min 6), address}
Profile update: PUT /api/auth/profile {name?, mobile?, address?, password?}
Admin guard: admin-only routes under /api/admin/* return 403 for non-admin users.
Brute force: 5 failed logins for same ip+email locks for 15 minutes (429).
