# Smart India Hackathon (SIH) 2026 Problem Statement Live Ranker

A real-time ranking and exploration platform for **Smart India Hackathon 2026** Software Problem Statements, sorting by **"Submitted Idea(s) Count" ascending** so the lowest competition problem statements appear on top (Rank #1).

---

## 🚀 Live Vercel Deployment

This repository is pre-configured for one-click deployment on **Vercel** with serverless Node.js functions and automated hourly sync crons.

### Method 1: Deploy via Vercel CLI (Fastest)

Run the following command in your terminal:
```bash
npx vercel
```
1. Follow the prompts (e.g. Link to existing project: `N`, Project name: `sih-2026-ranker`, Directory: `./`).
2. To deploy directly to production:
```bash
npx vercel --prod
```

---

### Method 2: Deploy via GitHub (Recommended for Continuous Updates)

1. Initialize Git and commit files:
   ```bash
   git init
   git add .
   git commit -m "Initial commit for SIH 2026 Live PS Ranker"
   ```
2. Push to your GitHub repository:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/sih-2026-ranker.git
   git branch -M main
   git push -u origin main
   ```
3. Go to [vercel.com](https://vercel.com/new), select your GitHub repository, and click **Deploy**. Vercel will automatically build and host the application with custom domain support and SSL!

---

## 🛠 Local Development

```bash
# Install dependencies
npm install

# Start development server
npm start
```
Visit `http://localhost:3000` in your browser.

---

## ⚡ Features

- **Software Track Filter**: Filters 182 Software statements out of 240.
- **Lowest Competition Ranking**: Lowest idea submission counts on top (Rank #1).
- **Live Sync & Change Tracking**: Tracks delta changes in idea counts and rank changes.
- **Search & Advanced Filtering**: Filter by Themes, Ministries, Competition levels, or quick chips.
- **Dual Views**: Instant toggle between Table View and Grid Card View.
- **Starred Shortlist**: Team bookmarking persisted in browser localStorage.
- **CSV Export**: Export ranked problem statements to CSV.
