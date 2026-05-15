# Quizify AI - Full Stack Web App

## Overview
Quizify AI is a full-stack web application that generates quizzes using AI. Users can sign up, log in, generate quizzes on any topic, take quizzes, and view their past results.

The app uses Node.js, Express, SQLite, and the Groq AI API.

## Features
- User Sign Up / Sign In system
- Password hashing with bcrypt
- Session-based authentication
- AI-generated quizzes (Groq API - LLaMA model)
- Multiple-choice quiz system
- Score tracking and results storage
- Quiz history for each user
- Responsive modern UI




- Frontend: HTML, CSS, JavaScript (EJS-style structure but static pages)
- Backend: Node.js, Express.js
- Database: SQLite (better-sqlite3)
- Authentication: express-session
- AI API: Groq (LLaMA 3 model)


## Database Schema

### Users Table
- id (INTEGER, PRIMARY KEY)
- username (TEXT)
- email (TEXT)
- password (TEXT hashed)
- created_at (DATETIME)

### Quiz Results Table
- id (INTEGER, PRIMARY KEY)
- user_id (INTEGER)
- topic (TEXT)
- score (INTEGER)
- total (INTEGER)
- taken_at (DATETIME)

## Deployment  
This app is deployed on Render:  https://quizify-ai-u7ug.onrender.com
