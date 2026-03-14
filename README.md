# Assignment Builder – Smart Question Paper & Assignment Generator

**Assignment Builder** is a web app for teachers and schools to design, generate, and manage **question papers and assignments in minutes instead of hours**.

It combines:

- A reusable **question bank**
- **AI-assisted question generation**
- A clean **builder experience** for both printed exam papers and informal homework assignments.

---

# What This Product Does

## Centralized Question Bank

Store all questions (**MCQ + FRQ**) in one place.

**Features**

- Tag questions with **subject, topic, difficulty, and marks**
- Edit, delete, and reuse questions across multiple papers and assignments
- Maintain a growing repository of vetted questions

---

## Question Papers for Exams

Create formal exam papers with:

- School name and address
- Exam type (Mid Term, Annual, Unit Test, etc.)
- Grade, subject, academic year
- Duration and maximum marks

**Features**

- Drag & drop to reorder questions
- Export to **PDF / DOC**
- Clean exam-style layout including:
  - Proper header (school + exam details)
  - Questions with marks
  - Optional MCQ answer hints/ticks

---

## Homework / Practice Assignments

Create simple assignments without formal headers.

**Features**

- Select questions from the **same global question bank**
- Instantly see **question count and total marks**
- Export to **PDF / DOC** for printing or sharing

---

## Smart Filtering & Discovery

The home screen displays all saved:

- Question papers  
- Assignments  

Each item shows:

- Subject
- Grade
- Exam type
- Question count
- Total marks

**Filters**

- Subject
- Grade
- Exam Type
- Total Marks
- Number of Questions

---

## AI Question Generator

Generate new questions instantly with AI.

Choose:

- Grade
- Subject
- Topic
- Difficulty
- Question type (**MCQ / FRQ**)
- Number of questions

AI-generated questions are:

- Saved directly into the **question bank**
- Immediately available to add to any assignment or paper
- Persisted in the **database**

---

## Live Stats & Data Integrity

For every paper and assignment the system maintains:

- `question_count`
- `total_marks`

These update automatically when:

- Questions are added or removed
- Question marks change
- Questions are deleted from the bank

This ensures the UI always stays **in sync with the database**.

---

# How It Works

## Frontend

Built with **React + Vite**

Features:

- Home page listing all **papers and assignments**
- Filtering by subject, marks, grade, and question count
- Drag-and-drop builder interface

**Builder Layout**

Left Panel

- Current paper / assignment
- Drag-and-drop question ordering

Right Panel

- Question bank
- AI Question Generator

---

## Backend

Built with **Vercel Serverless Functions + Neon PostgreSQL**

# Who This Is For

## Teachers

Create:

- Unit tests
- Mid-term exams
- Annual papers
- Homework assignments
- Practice worksheets

---

## Schools & Coaching Centers

Benefits:

- Shared repository of questions
- Consistent paper formatting
- Faster exam preparation
---

## EdTech Teams

Use it to:

- Generate large volumes of questions with AI
- Curate them into polished papers
- Manage content repositories

---

# Key Benefits

## Massive Time Savings

Reuse questions instead of rewriting them.

Generate entire question sets with AI and refine quickly.
