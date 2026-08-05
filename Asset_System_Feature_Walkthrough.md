# Feature Walkthrough
## Internal Asset Management System

**Companion to:** Asset Management System FSD v1.0
**Purpose:** Explain what each feature does in plain language — what the user sees, what they click, and what the system records.

Read this first for understanding. Read the FSD for the technical spec.

---

## How to read this

Every feature below follows the same shape:

- **What it does** — one sentence
- **Who uses it** — admin, or anyone
- **The screen** — what's actually on the page
- **What happens** — step by step
- **What gets saved** — the record left behind

Nothing here is complicated on its own. The value comes from all of it sitting in one place.

---

## Feature 1 — Asset register

**What it does:** Holds one record for every item the company owns.

**Who uses it:** Admin

**The screen:** A table. One row per asset. Columns: tag, category, make and model, status, who has it, where it is. A search box at the top, filter dropdowns beside it.

**What happens:**
1. Admin clicks "Add asset"
2. Fills a short form — category, make, model, serial number, condition, location
3. Saves
4. The system creates the tag automatically. Nobody types the tag.

**What gets saved:** One asset row with a permanent tag and a permanent QR link.

**Kept simple:** No approval step. No draft state. An asset either exists or it doesn't.

---

## Feature 2 — Bulk import

**What it does:** Lets you load hundreds of assets from a spreadsheet instead of typing them one at a time.

**Who uses it:** Admin

**The screen:** Upload box → a preview table → a "confirm import" button.

**What happens:**
1. Admin uploads a CSV
2. System matches spreadsheet columns to asset fields
3. Preview shows: *180 will be added, 12 have errors, 3 are duplicates*
4. Admin fixes the sheet or proceeds
5. Good rows import, bad rows are listed with the reason

**What gets saved:** The assets, plus a log of what was imported and when.

**Kept simple:** Import never partially breaks. It either runs or it rolls back.

---

## Feature 3 — Tag and QR generation

**What it does:** Gives every asset a unique code and a scannable link.

**Who uses it:** Nobody clicks this — it happens on its own.

**How the tag reads:**

```
KDX - LT - 26 - 0042
 │     │    │     └── 42nd laptop registered this year
 │     │    └──────── year 2026
 │     └───────────── laptop
 └─────────────────── Kodexo
```

**The QR contains** a short web link, not the tag. That's why any phone camera opens it with no app.

**Kept simple:** Tags are never edited, never reused, never reassigned. Once a laptop is `LT-26-0042`, it is that forever, including after disposal.

---

## Feature 4 — Label printing

**What it does:** Produces a sheet of stickers you can run through the office printer.

**Who uses it:** Admin

**The screen:** Asset list with checkboxes → "Print labels" button → a PDF opens.

**What happens:**
1. Admin ticks 40 assets
2. Clicks print labels
3. A PDF appears, laid out as an A4 grid of stickers
4. Print on sticker sheets, cut, stick

**What's on each sticker:** QR code, the tag underneath, and one line saying the item belongs to the company. Nothing else.

**Kept simple:** No serial numbers, no names, no barcodes on the label. If a sticker falls off in a taxi, it tells the finder how to return it and nothing more.

---

## Feature 5 — Scanning

**What it does:** Turns any phone into a lookup tool.

**Who uses it:** Anyone

**What happens when a staff member scans:**
- Their normal camera app opens a web page
- The page shows: tag, category, make and model, current status, and a "property of" line
- That's it. No login, no app install, nothing sensitive

**What happens when an admin scans while signed in:**
- The same link opens the full record
- Quick action buttons appear: assign, return, log repair, change location

**Kept simple:** One QR, two outcomes, decided by whether you're logged in.

---

## Feature 6 — Assign an asset

**What it does:** Records that a specific person now holds a specific item.

**Who uses it:** Admin

**The screen:** Pick asset → pick employee → condition dropdown → signature box → confirm.

**What happens:**
1. Admin selects the asset (or scans it)
2. Picks the employee from a list
3. Notes the condition it's going out in
4. Employee signs on the admin's screen with a finger
5. Confirm

**What gets saved:** A custody record with date, both names, condition, and the signature image. The asset status flips to "assigned".

**Kept simple:** An asset can only be with one person at a time. The system physically prevents assigning something that's already out.

---

## Feature 7 — Return an asset

**What it does:** Closes a custody record when the item comes back.

**Who uses it:** Admin

**The screen:** Same as assign, reversed. Pick the asset, note condition on return, confirm.

**What happens:**
1. Admin scans or selects the asset
2. System already knows who has it
3. Admin records condition coming back and any damage notes
4. Confirm

**What gets saved:** The return date and receiving person are added to the existing custody record. The record is never deleted — it becomes history.

**Kept simple:** Returning sets the asset back to "in stock" or "in repair". Two options, no more.

---

## Feature 8 — Offboarding clearance

**What it does:** Shows everything a leaving employee is still holding.

**Who uses it:** Admin

**The screen:** Employee name at the top, a checklist of every item they hold underneath, and a status banner: *3 of 5 items returned*.

**What happens:**
1. HR marks someone as leaving in the employee sheet
2. The system builds their clearance list automatically
3. Admin ticks items off as they come back
4. Anything not returned is marked lost, with a note
5. When the list is clear, a PDF clearance certificate can be generated

**What gets saved:** Each return, plus the final certificate.

**Kept simple:** No workflow, no approvals, no signatures from three departments. It's a checklist that has to reach zero.

**This is the feature that pays for the system.** Everything else is bookkeeping.

---

## Feature 9 — Employee list

**What it does:** Holds the names you assign assets to.

**Who uses it:** Admin, or an automatic nightly sync

**What happens:** A spreadsheet of employees is imported. Matching is by employee code.

- Already in the system → details updated
- New code → added
- Missing from the sheet → flagged, never deleted

**What is deliberately absent:** No salary. No CNIC. No date of birth. No bank details. This system does not need them and must not hold them.

**Kept simple:** This is an address book, not an HR system. The HR sheet stays the master.

---

## Feature 10 — Purchase records

**What it does:** Stores what you paid, so value can be calculated later.

**Who uses it:** Admin

**The screen:** Vendor, invoice number, date, currency, amount, exchange rate, warranty end date, and a file upload for the invoice scan.

**What happens:** One invoice is entered once. Multiple assets are then linked to it, each with its own unit cost.

**Kept simple:** No purchase orders, no approval chains, no vendor management. Just a record of what was bought and for how much.

---

## Feature 11 — Depreciation

**What it does:** Answers "what is this worth today" without anyone doing sums.

**Who uses it:** Admin, and the accountant via export

**Two numbers are kept, for two different purposes:**

| | Book value | Tax value |
|---|---|---|
| Question it answers | What's it worth to us? | What do we claim? |
| Method | Straight line — same amount every month | Reducing balance — a percentage of what's left |
| Who reads it | You, for insurance and resale | The accountant, for the annual return |

**What happens:** On the 1st of every month a background job runs and writes down each asset's value for the previous month. Nobody triggers it.

**What gets saved:** A monthly value row per asset. Once written, a month is closed and never edited.

**Kept simple:** Rates are typed into a settings screen by whoever owns finance. They are not written into the code.

**Also skipped on purpose:** Cheap items — cables, mice, chargers — are tracked for custody but never depreciated. Otherwise the reports fill up with amortising USB cables.

---

## Feature 12 — Maintenance log

**What it does:** Records repairs against an asset.

**Who uses it:** Admin

**The screen:** On the asset page, an "add repair" button. Date, what was done, vendor, cost, days out of action.

**Why it matters:** Once a laptop shows three repairs, the asset page flags it. That's your replace-versus-repair signal, based on record rather than memory.

**Kept simple:** A list of events. No ticketing, no assignment, no status workflow.

---

## Feature 13 — Audit sweep

**What it does:** Confirms that what the system says you own is actually in the building.

**Who uses it:** Admin, walking around with a phone

**The screen:** A big scan window, a running count — *scanned 84 of 210* — and nothing else in the way.

**What happens:**
1. Start a sweep, optionally limited to one floor or room
2. Walk the office scanning every sticker
3. Each scan ticks off automatically, no tapping
4. Close the sweep
5. A report appears: found, missing, and found-in-the-wrong-place

**What gets saved:** The sweep, every scan in it, and the reconciliation report.

**Kept simple:** One screen, one counter, one report at the end. Quarterly this takes about half an hour.

---

## Feature 14 — Dashboard and reports

**What it does:** Answers the handful of questions people actually ask.

**Who uses it:** Admin

**The questions it answers on one screen:**

| Question | Where it shows |
|---|---|
| What do we own, and what's it worth? | Totals by category |
| What's sitting unused? | In-stock list |
| Who has what? | Custody by department |
| What's about to lose warranty? | Expiring in 60 days |
| What's been in repair too long? | Overdue repairs |
| What hasn't been seen in months? | No recent scan |

Every list exports to CSV.

**Kept simple:** No custom report builder. Six fixed questions, because those are the six that get asked.

---

## Feature 15 — Alerts

**What it does:** Tells you about things you'd otherwise forget.

**Who uses it:** Nobody — it arrives in Slack.

**What triggers a message:**
- An assignment nobody signed for after 3 days
- Someone marked as leaving who still holds items
- A warranty expiring within 60 days
- An asset stuck in repair too long
- An audit sweep closing with items missing

**How it's built:** The app doesn't send messages. It fires a signal to the existing automation setup, which posts to Slack. That keeps notification logic out of the app entirely.

**Kept simple:** No email, no in-app notification centre, no preferences screen. Messages go to one Slack channel.

---

## What is deliberately not being built

Naming these matters as much as naming the features, because each one is a request that will eventually come up.

| Not building | Why |
|---|---|
| Approval workflows for purchases | This is a register, not a procurement system |
| Multiple permission levels | One admin role, one public page. Simpler and safer |
| A mobile app | The phone camera and the web page already do the job |
| GPS or IoT tracking | Wrong scale, wrong cost |
| Custom report builder | Six fixed reports cover the real questions |
| Employee logins | Staff scan; they don't sign in |
| In-app messaging or comments | Slack already exists |

---

## Build order

| Stage | Features | Why this order |
|---|---|---|
| **1** | 1, 2, 3, 4, 5 | You can't do anything until assets exist and carry labels |
| **2** | 6, 7, 8, 9 | Custody is the actual business case |
| **3** | 10, 11 | Value reporting, once custody works |
| **4** | 12, 13, 14, 15 | Operational polish |

Stages 1 and 2 are the product. Stages 3 and 4 are improvements to a working system, and should not begin until stages 1 and 2 are in daily use.

---

## The two things that decide whether this succeeds

Neither is a software problem.

**Getting the data in.** Cataloguing a few hundred assets takes someone eight to twelve hours of walking around with a laptop. If that time isn't scheduled, the system launches half-empty and nobody trusts it. Starting from purchase invoices rather than from the equipment is roughly three times faster — the walk then becomes a check rather than a discovery.

**Keeping the data current.** One named person has to update this at every hire, every exit, and every purchase. Without that, it's accurate for six weeks and fiction by month three. The software cannot solve this.

---

*End of document.*
