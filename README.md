# Beneficiary Lifecycle Management System

## 1. Overview

This project is a **Google Apps Script-based system** designed to manage the full lifecycle of beneficiaries within an organization.

It automates:

* beneficiary intake through Google Forms
* eligibility filtering based on business rules
* beneficiary database management
* blacklist management (annual and definitive)
* participant selection for activities
* dashboard and KPI updates
* historical tracking of selections

The system is fully built on **Google Sheets + Google Apps Script**, making it lightweight, easy to deploy, and suitable for organizations that need operational automation without setting up a dedicated backend.

---

## 2. Core Objectives

* Centralize beneficiary data across multiple workflows
* Automate decision logic such as admission, rejection, and blacklist rules
* Ensure data consistency with duplicate prevention and phone normalization
* Provide traceability through history and blacklist evolution
* Enable fair participant selection with operational constraints
* Maintain a reusable and testable environment

---

## 3. Architecture

The system relies on multiple Google Sheets, each dedicated to a specific operational role.

| Component      | Purpose                                              |
| -------------- | ---------------------------------------------------- |
| Form Responses | Stores raw intake data submitted by users            |
| Beneficiary DB | Stores accepted beneficiaries for the academic year  |
| Blacklist      | Stores yearly sanctions and definitive bans          |
| Dashboard      | Stores KPIs and aggregated metrics                   |
| History        | Stores past selections for fairness and traceability |

All business logic is implemented in **Apps Script modules**.

---

## 4. Project Structure

```text
scripts/
├── config.js
├── init.js
├── tests_seed.js
├── form_intake.js
├── beneficiary_db_blacklist.js
├── blacklist_management.js
├── dashboard_refresh.js
└── selection.js
```

---

## 5. File Responsibilities

### `config.js`

Central configuration file.

It contains the IDs of all required Google Sheets used by the project.

```js
const CONFIG = {
  BLACKLIST_ID: '',
  BENEF_DB_ID: '',
  DASHBOARD_ID: '',
  FORM_RESPONSES_ID: '',
  HISTORY_ID: ''
};
```

**Purpose:**

* centralize environment configuration
* avoid hardcoding IDs in each script
* make the project easier to deploy and maintain

---

### `init.js`

Initializes the full environment.

It creates:

* all required spreadsheets
* all required sheets
* all headers expected by the system

It also logs the generated spreadsheet IDs so they can be copied into `config.js`.

**Purpose:**

* create a clean working environment
* standardize sheet names and headers
* reduce setup errors

---

### `tests_seed.js`

Populates the system with fake data for testing.

It seeds:

* form responses
* beneficiary database
* annual blacklist
* definitive blacklist
* selection history
* dashboard reset values

**Purpose:**

* validate the system without real data
* test business rules safely
* provide a reproducible demo environment

---

### `form_intake.js`

Handles beneficiary intake and manual validation workflows.

Main responsibilities:

* reject duplicate responses
* reject already-registered beneficiaries
* reject definitive blacklist cases
* apply eligibility rules based on age and student status
* add valid entries to the beneficiary database
* update dashboard metrics
* duplicate annual sheets when needed
* synchronize blacklist data

**Purpose:**

* serve as the main operational entry point
* enforce core validation logic
* keep all main datasets synchronized

---

### `beneficiary_db_blacklist.js`

Manages the interaction between the beneficiary database and the annual blacklist.

Main responsibilities:

* detect blacklist status changes inside the beneficiary database
* create blacklist entries if needed
* update sanctions from `x` to `xx`
* remove beneficiaries from the database when escalation rules apply

**Purpose:**

* connect active beneficiary management with disciplinary logic
* automate transitions between active and blacklisted states

---

### `blacklist_management.js`

Handles definitive blacklist actions.

Main responsibilities:

* detect when a definitive ban is triggered
* create the definitive blacklist sheet if it does not exist
* copy the selected row to the definitive blacklist
* keep a trace of reason and date

**Purpose:**

* manage permanent exclusion cases
* separate yearly blacklist logic from definitive sanctions

---

### `dashboard_refresh.js`

Computes and updates KPI values in the dashboard sheet.

Main responsibilities:

* count responses
* count admissions
* compute study-level distribution
* compute age statistics
* compute blacklist counters
* build charts for operational monitoring

**Purpose:**

* provide visibility on the current state of the process
* support reporting and operational follow-up

---

### `selection.js`

Handles participant selection for activities.

Main responsibilities:

* exclude annual blacklist and definitive blacklist
* deduplicate candidates by keeping the most recent response
* exclude recently selected beneficiaries
* randomly select participants
* write results into a selection sheet
* append selected beneficiaries to history

**Purpose:**

* ensure fair and controlled selection
* preserve operational traceability
* prevent repeated selection bias

---

## 6. Installation Guide (Apps Script)

### Step 1 — Create the Apps Script project

1. Go to [https://script.google.com](https://script.google.com)
2. Click **New Project**
3. Rename the project, for example: `Beneficiary System`

---

### Step 2 — Add project files

Create the following files in the Apps Script editor:

* `config.js`
* `init.js`
* `tests_seed.js`
* `form_intake.js`
* `beneficiary_db_blacklist.js`
* `blacklist_management.js`
* `dashboard_refresh.js`
* `selection.js`

Copy and paste the corresponding code into each file.

---

### Step 3 — Initialize the environment

Run the following function:

```js
initializeFullTestEnvironment()
```

Then open:

```text
View -> Logs
```

Copy all generated spreadsheet IDs.

---

### Step 4 — Configure `config.js`

Paste the generated IDs into `config.js`:

```js
const CONFIG = {
  BLACKLIST_ID: '...',
  BENEF_DB_ID: '...',
  DASHBOARD_ID: '...',
  FORM_RESPONSES_ID: '...',
  HISTORY_ID: '...'
};
```

---

### Step 5 — Populate fake test data

Run:

```js
seedTestEnvironment()
```

This will create a complete test environment with fake operational data.

---

### Step 6 — Install triggers

Run:

```js
installTriggers()
```

Depending on your scripts, this installs the triggers required by the system, such as:

* `onFormSubmit`
* `onEdit`
* scheduled jobs

If you also use blacklist-specific triggers, run the corresponding install function as well, for example:

```js
installBanTriggers()
```

---

### Step 7 — Grant authorizations

Apps Script will ask for permissions such as:

* access to Google Sheets
* permission to execute and manage scripts

Accept all required permissions.

---

### Step 8 — Validate the environment

After setup, verify that:

* all spreadsheets were created successfully
* sheet names match exactly what the scripts expect
* `CONFIG` contains the correct IDs
* test data was inserted correctly
* triggers are visible in the Apps Script trigger panel

---

## 7. Business Rules

### Sheets Data Model

| Sheet Name | Role | Key Columns |
|---|---|---|
| Réponses au formulaire 1 | Raw intake data | Phone, DOB, Student, Study level |
| BDDbenef_YYYY_YYYY | Accepted beneficiaries | Phone, Nom, Prenom, DOB, Etudiant |
| Blacklist_YYYY_YYYY | Annual sanctions | Phone, Nombre Croix, Ban définitif |
| Blacklist_définitive | Permanent exclusion list | Phone, Raison, Date_Ban |
| Dashboard_YYYY_YYYY | KPIs and reporting | Counts, age average, blacklist counts |
| Feuille 1 | Selection history | Date_Selection, Nom, Prenom, Phone, Activité |
| Sélection | Current selected participants | Timestamp, Prenom, Nom, Phone |

### 7.1 Eligibility Rules (made for one voluntary association)

| Condition                                           | Result   |
| --------------------------------------------------- | -------- |
| Student and age `>= 30`                             | Rejected |
| Non-student and age `>= 26`                         | Rejected |
| Duplicate form response                             | Rejected |
| Already present in beneficiary database             | Rejected |
| Present in definitive blacklist                     | Rejected |
| Present in annual blacklist (depending on workflow) | Rejected |

---

### 7.2 Blacklist Logic

| Value      | Meaning                                                |
| ---------- | ------------------------------------------------------ |
| `x`        | First warning                                          |
| `xx`       | Escalated case leading to removal from the active flow |
| Definitive | Permanent ban                                          |

---

### 7.3 Selection Logic

The selection process follows these rules:

1. Exclude all definitive blacklist entries
2. Exclude annual blacklist entries with blocking status
3. Deduplicate candidates by phone number
4. Keep the most recent response for each duplicate
5. Exclude recently selected beneficiaries
6. Randomly select the final participants
7. Log the final selection in history

---

### 7.4 Data Normalization

Phone numbers are normalized into French local format:

```text
0XXXXXXXXX
```

Supported input examples:

* `+33XXXXXXXXX`
* `0033XXXXXXXXX`
* `33XXXXXXXXX`
* `XXXXXXXXX`

---

### 7.5 System Guarantees

The system is designed to provide:

* no duplicate beneficiaries in the annual database
* consistent blacklist enforcement
* traceable participant selection history
* automated KPI updates
* reproducible test setup

---

## 8. Testing

Use the following function:

```js
seedTestEnvironment()
```

Recommended test flows:

* form submission
* duplicate submission rejection
* manual WhatsApp validation
* annual blacklist update
* definitive blacklist transfer
* participant selection
* dashboard refresh
* blacklist synchronization

---

## 9. Known Limitations

* The system depends on **strict Google Sheets naming conventions**
* There is no dedicated UI; this is a backend automation project
* Concurrency is limited by Google Sheets and Apps Script behavior
* Initial configuration is manual
* Some workflows rely on exact column indexes and headers

---

## 10. Future Improvements

* migrate storage to PostgreSQL, Firebase, or another database
* build a dedicated web interface
* add role-based access control
* add structured logging and audit trails
* add validation helpers and automated environment checks
* replace hardcoded sheet assumptions with a stronger configuration layer
* generalize selection configuration for multiple activity types

---

## 11. License

This project is proprietary.

Usage, reproduction, distribution, or adaptation is prohibited without explicit authorization from the author.

For usage requests, please contact the repository owner.
