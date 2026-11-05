Here are the commands to sync number data from EXPA for **AIESEC in Nepal (MC 112)**:

---

### 1. Direct Sync Command (Recommended for Regular Updates)
This script connects directly to the EXPA GraphQL API using your access token and updates Firestore **without wiping your existing database**.

The New Command:

**Whenever you want to fill only the missing gap, run:**

npm run sync:missing

* **Sync recent numbers (Default: Last 60 days):**
  ```powershell
  npm run sync:expa
  ```
  *(or `node scripts/sync-expa.mjs`)*

* **Sync custom number of days (e.g., last 30 days or last 90 days):**
  ```powershell
  node scripts/sync-expa.mjs --days 30
  ```

* **Sync a specific date range:**
  ```powershell
  node scripts/sync-expa.mjs --from 2026-01-01 --to 2026-11-06
  ```

* **Sync a specific stage only (e.g., only approved or only signups):**
  ```powershell
  node scripts/sync-expa.mjs --status approved
  ```
  *(Options: `signups`, `applied`, `accepted`, `approved`, `realized`, `finished`, `completed`)*

---

### 2. Full Historical Backfill (2022 to Present)
If you ever want to completely wipe Firestore and re-download all historical data for Nepal from February 2022 to today in 6-month batches:
```powershell
npm run sync:all
```
*(or `node scripts/clean-and-pull.mjs`)*

---

### 3. Sync Nepal Local Committees & MC Structure
To update or refresh the Nepal Local Committees (Kathmandu, KU, Patan, Pokhara, Lumbini, National Office) into Firestore:
```powershell
npm run sync:network
```
*(or `node scripts/sync-network.mjs`)*

---

### 4. Continuous Background Sync Worker
To keep a terminal running in the background that checks and syncs new Nepal numbers every 2 minutes automatically:
```powershell
npm run worker
```
*(or `node scripts/auto-sync.mjs`)*

---

### 5. Web / Browser / cURL Sync
When your web app is running locally or deployed on Vercel:

* In your browser:
  ```
  http://localhost:3000/api/maintenance/sync?mcId=112&from=2026-01-01&to=2026-11-06
  ```
* Via cURL / terminal:
  ```powershell
  curl -X GET "http://localhost:3000/api/maintenance/sync?mcId=112"
  ```

---

> [!NOTE]
> **Firebase Daily Write Quota Note:**
> * On the free Firebase Spark plan, Google allows **20,000 document writes per day**.
> * Regular syncs (`npm run sync:expa --days 30`) only write ~30–100 records and use `< 1%` of your free daily limit.
> * If you run a complete database reset (`npm run sync:all`), it touches ~10,000–15,000 records. If you hit the `RESOURCE_EXHAUSTED` limit, it resets automatically every day at midnight Pacific Time (or you can switch to the Blaze plan where writes beyond 20k cost less than \$0.05).