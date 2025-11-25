# ☁️ NebulOuS: Multi-Cloud & Edge Cluster Manager

[![HackEPS 2025 (Eurecat) Winner](https://img.shields.io/badge/🏆_HackEPS_Eurecat_2025-2nd_Prize-gold)](https://hackeps.com/)
[![Stack](https://img.shields.io/badge/Stack-T3-blue)](https://create.t3.gg/)
[![License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

> **2nd Prize Winner at HackEPS 2025 (Eurecat Challenge)** > A platform to seamlessly deploy and manage hybrid computing clusters across **AWS**, **Google Cloud Platform**, and **Edge devices**.

---

## 📸 Screenshots

| Dashboard View | Cluster Details |
|:---:|:---:|
| <img src="./screenshots/main-dashboard.png" width="400" alt="Dashboard"> | <img src="./screenshots/cluster-dashboard.png" width="400" alt="Cluster Details"> |

| Cloud Credentials | Cluster Creation |
|:---:|:---:|
| <img src="./screenshots/credentials.png" width="400" alt="Credentials"> | <img src="./screenshots/cluster-creation.png" width="400" alt="Cluster creation"> |

---

## 📖 The Story: The 12-Hour Pivot

We entered HackEPS 2025 with a plan: build a high-performance backend using **Go**, **Connect-Go**, and **Protocol Buffers** for end-to-end type safety.

However, at the **12-hour mark** (halfway through the hackathon), we hit a wall. The complexity of implementing strict Protobuf definitions while racing against the clock meant we had a great architecture diagram, but zero working features.

**We made a critical decision:** We scrapped the entire codebase and started from scratch using the **T3 Stack** (Next.js + tRPC). This allowed us to iterate at lightning speed, leveraging full-stack type safety without the boilerplate, and ultimately deliver a winning product in the remaining 12 hours.

---

## 🚀 Features

* **Multi-Cloud Provisioning:** Create Virtual Machines on **AWS (EC2)** and **Google Cloud (Compute Engine)** from a single interface.
* **Orchestration Agnostic:** Designed to bootstrap nodes for **Docker Swarm**, or **K3s** (Kubernetes).
* **Real-time Status:** Tracks the provisioning lifecycle (Provisioning -> SSH Check -> Active).
* **Credential Management:** Securely store and manage API keys for multiple cloud providers.
* **SSH Polling Mechanism:** Automatically verifies node health and connectivity upon creation.

---

## 🛠️ Tech Stack

This project was built using the **T3 Stack** philosophy:

* **Framework:** [Next.js](https://nextjs.org/) (App Router)
* **Language:** TypeScript
* **API/Communication:** [tRPC](https://trpc.io/) (End-to-end type safety)
* **Database:** PostgreSQL (via [Prisma ORM](https://www.prisma.io/))
* **Styling:** [Tailwind CSS](https://tailwindcss.com/) + [ShadcnUI](https://ui.shadcn.com/)
* **Cloud SDKs:**
    * `@aws-sdk/client-ec2`
    * `@google-cloud/compute`
* **Infrastructure:** Hosted on a [Clouding.io](https://clouding.io/) VPS.

---

## 🏗️ Architecture & Workflow

Since we didn't have time to implement a complex asynchronous queue system (Redis/BullMQ) during the hackathon, we devised a robust polling architecture:

```mermaid
sequenceDiagram
    participant User
    participant NextJS_Backend
    participant Database
    participant AWS_GCP
    
    User->>NextJS_Backend: Create Cluster (Request)
    NextJS_Backend->>Database: Create "Pending" Entry
    NextJS_Backend->>AWS_GCP: API Call to Provision VM
    AWS_GCP-->>NextJS_Backend: VM Created (IP Assigned)
    NextJS_Backend->>Database: Update IP & Status "Booting"
    
    loop SSH Polling
        NextJS_Backend->>AWS_GCP: Attempt SSH Connection
        AWS_GCP-->>NextJS_Backend: Connection Success?
    end
    
    NextJS_Backend->>Database: Update Status "Active"
    NextJS_Backend-->>User: Cluster Ready
````

-----

## 🔮 Future Improvements

Given the 24-hour time constraint, there were features we designed but couldn't fully implement:

1.  **AI Orchestration (The "NebulOuS" Challenge):**

      * *Goal:* Integrate an LLM to interpret natural language requests (e.g., "I need a low-latency cluster in Europe for under €5/day") and automatically select the best provider/region.
      * *Status:* Logic designed, but not connected to the live pricing API.

2.  **Asynchronous Job Queue:**

      * *Improvement:* Replace the long-running HTTP requests with **Redis + BullMQ**. This would allow the backend to handle provisioning in the background without blocking the UI.

3.  **WebSockets:**

      * *Improvement:* Use WebSockets to push state updates to the frontend instead of client-side refreshing.

-----

## 💻 Getting Started

### Prerequisites

  * Node.js 18+
  * PostgreSQL Database

### Installation

1.  **Clone the repo**

    ```bash
    git clone https://github.com/jtayped/hackeps2025-eurecat.git
    cd hackeps2025-eurecat
    ```

2.  **Install dependencies**

    ```bash
    npm install
    ```

3.  **Environment Setup**
    Create a `.env` file based on `.env.example`:

    > You have to create a [Resend](https://resend.com/) account and get an API key.

    ```env
    cp .env.local .env
    ```

4.  **Run the database migration**

    ```bash
    npm run db:migrate
    ```

5.  **Start the development server**

    ```bash
    npm run dev
    ```

-----

## 🐳 Docker Deployment

If you prefer not to install Node.js or PostgreSQL locally, you can deploy the entire stack using Docker Compose.

1.  **Configure Environment**
    Ensure your `.env` file includes the specific Postgres variables required by the container.
    
    > **⚠️ Important:** When running in Docker, change `localhost` in your `DATABASE_URL` to `db` (the service name in docker-compose).

    ```env
    # .env
    POSTGRES_USER=nebulous_user
    POSTGRES_PASSWORD=securepassword
    POSTGRES_DB=nebulous_db
    
    # Note the host is 'db', not 'localhost'
    DATABASE_URL="postgresql://nebulous_user:securepassword@db:5432/nebulous_db"
    
    NEXTAUTH_SECRET="supersecret"
    ```

2.  **Start the Services**
    Build the image and start the containers in detached mode:
    ```bash
    docker-compose up -d --build
    ```

3.  **Initialize the Database**
    Run the Prisma migrations inside the running container:
    ```bash
    docker exec -it nextjs_app npm run db:migrate
    ```

4.  **Access the App**
    Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 👥 Authors

  * **Joel Taylor** - [LinkedIn](https://www.linkedin.com/in/jtayped/)
  * **Maria Aliet** - [LinkedIn](https://www.linkedin.com/in/maria-aliet-060bb72aa/)

-----
