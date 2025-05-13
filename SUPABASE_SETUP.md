# Supabase Setup Guide

This guide will help you set up Supabase to work with the Family Chores app.

## Step 1: Create a Supabase account and project

1. Go to [https://supabase.com/](https://supabase.com/) and sign up for an account if you don't have one
2. Click "New Project" to create a new project
3. Fill in the project details:
   - Name: Family Chores (or any name you prefer)
   - Database Password: Create a secure password
   - Region: Choose a region closest to you
4. Click "Create new project" and wait for it to be created (may take a few minutes)

## Step 2: Create the database schema

1. In your Supabase project dashboard, navigate to the SQL Editor
2. Click on "New Query"
3. Copy and paste the entire contents of the `supabase-schema.sql` file from this repository
4. Click "Run" to execute the SQL and set up your database

## Step 3: Get your API credentials

1. In your Supabase project dashboard, go to Project Settings → API
2. You'll need two values:
   - **Project URL**: This is your Supabase URL
   - **anon public**: This is your anonymous key

## Step 4: Configure your app

1. Create a file named `.env.local` in the root directory of this project
2. Add the following content:

```
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_KEY=your_anon_key
```

3. Replace `your_project_url` with your actual Supabase URL
4. Replace `your_anon_key` with your actual anonymous key

## Step 5: Run your app

1. Start the development server:

```bash
npm run dev
```

2. Open your browser and navigate to the URL shown in the terminal (typically http://localhost:5173/)

## Troubleshooting

If you see error messages:

1. Verify that you've created the database schema correctly
2. Check that your .env.local file has the correct values
3. Make sure you've installed all dependencies with `npm install`
4. Check the browser console for specific error messages

If you see "PostgreSQL Error: column does not exist":

- This error often means the table structure doesn't match what the app expects
- Make sure you've run the exact SQL from `supabase-schema.sql`

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
