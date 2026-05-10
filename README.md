# Traveloop: Context-Aware Itinerary and Budget Intelligence

Traveloop is a full-stack travel management platform designed to bridge the gap between creative itinerary planning and disciplined financial tracking. Built during a high-stakes hackathon environment, it provides a seamless experience for users to build, manage, and audit their travel plans within a unified, high-performance interface.

## Problem Statement

Most travel tools are fragmented; users often plan itineraries in one app while tracking expenses in a spreadsheet. This leads to data silos and a lack of real-time visibility into how schedule changes impact the total trip cost. Traveloop solves this by creating a single source of truth where every itinerary stop is a data point in a broader financial model.

## Core Functionalities

### Unified Dashboard

A centralized hub where users can manage multiple travel projects. Each trip is represented with high-fidelity visual cards and quick-action navigation to specialized planning modules.

### Itinerary Builder

A custom-built interface for day-by-day scheduling. It supports dynamic activity entry, location tagging, and real-time state persistence to ensure no data is lost during the planning process.

### Budget Breakdown and Analytics

A dedicated financial module that aggregates cost data from the itinerary. Using a responsive data visualization engine, it categorizes spending (Food, Transport, Lodging, etc.) and provides a real-time "Remaining vs. Spent" analysis against the user-defined trip limit.

### Profile and Authentication

A secure user management system using JWT-based authentication. Users can manage their personal profiles, including image uploads and account settings, ensuring their travel data remains private and personalized.

## Technical Architecture

### Frontend

* **React and Vite** : Utilized for an optimized development workflow and fast Hot Module Replacement.
* **Tailwind CSS v4** : Implemented for a custom "Traveloop Dark" design system, utilizing a utility-first approach for responsive and performant styling.
* **Recharts** : Integrated for the budget visualization layer to provide clear, interactive data insights.
* **Lucide React** : Used for consistent, scalable iconography across the interface.

### Backend

* **FastAPI (Python)** : Selected for its high performance, asynchronous capabilities, and automatic documentation generation.
* **SQLAlchemy ORM** : Used for robust database abstraction and relationship management.
* **SQLite** : Employed as a lightweight, reliable relational database for portable data storage.
* **Pydantic** : Utilized for strict data validation and type safety between the frontend and backend.

## Installation and Setup

### Prerequisites

* Node.js (v18 or higher)
* Python 3.10 or higher

### Backend Setup

1. Navigate to the backend directory: `cd backend`
2. Create a virtual environment: `python -m venv venv`
3. Activate the environment:
   * Windows: `venv\Scripts\activate`
   * macOS/Linux: `source venv/bin/activate`
4. Install dependencies: `pip install -r requirements.txt`
5. Start the server: `uvicorn main:app --reload`

### Frontend Setup

1. Navigate to the frontend directory: `cd frontend`
2. Install dependencies: `npm install`
3. Start the development server: `npm run dev`
